import { CARS, TABLE as TABLE_CFG, PHYS_HZ, GRIP_WOBBLE, STEER_WOBBLE, NM_BAND, GU_TO_KMH } from './config.js';
import { car, S, keys, pointers, initCar } from './state.js';
import { canvas, W, draw, initItems, initRender, setCarPaint } from './render.js';
import { createPause } from './pause.js';
import { createConfirmExit } from './confirm-exit.js';
import { garage, settings, records, save, collectedCaps, capCollect, tiresFor, addTires, tireCollect, setTires, recordTxn, carLook, markCleared,
         stats, wallet, owned, achUnlocked, achUnlock, achSetProgress } from './store.js';
import { finishPayout, starsForPps, isDDK, FIRST_CLEAR_BONUS } from './economy.js';
import { evaluate, buildContent, flattenRecords } from './achievements.js';
import { TRACKS } from './track-registry.js';
import { CATALOG } from './shop-catalog.js';
import { createRaceResults } from './race-results.js';
import {
  driftQuality, comboMult, comboGain, slipSign, pointsPerSecond,
  MULT_GAIN_PER_S, MULT_TRANSITION_BONUS, MULT_NEARMISS_BONUS, MULT_MAX,
} from './scoring.js';
import { stepSweep } from './cola.js';
import { hapticCone, hapticCrash } from './haptics.js';
import { stepCar } from './physics.js';
import { nearestCenter, circularAdvance, instanceId, reconcileTires } from './track-util.js';
import { nearMiss, finishDot, crossedFinish, resolveWall, resolveProps, stepKnockedCone } from './collision.js';
import { resolveSteer } from './input.js';

// Physics constants bundle passed to the pure stepCar() each frame (built once).
const PHYS_K = { PHYS_HZ, GRIP_WOBBLE, STEER_WOBBLE };

// Active-game registry — ensures a second startGame call tears down the previous one
// (listeners + loop) instead of creating duplicates. Anchored on globalThis, NOT
// module-scope: if game-engine.js loads as two instances (SW glitch in PWA, navigation
// race) both copies share the same flag → the new start always kills the previous one
// and never leaves orphaned rAF/pointer listeners.
const getActive = () => globalThis.__ddActiveGame ?? null;
const setActive = (v) => { globalThis.__ddActiveGame = v; };

// Starts the game loop with the given track.
// T   — namespace import of a track module (track.js or track-oval.js)
// opts.initItems — true if the track has SVG props to pre-load
// Returns { stop } — removes all listeners and cancels requestAnimationFrame.
export const startGame = (T, opts = {}) => {
  // Do not start a second game on top of a live one; warn = signal if this happens
  // unexpectedly (e.g. stuck PWA instance — the classic "double rAF" class of bug).
  const prev = getActive();
  if (prev) {
    console.warn('[game-engine] startGame: a previous game is still active — stopping it (possible engine duplication)');
    prev.stop();
  }
  const { center, cones, props, checkpoints, K, CP_R, TRACK_HALF, CONE_R, startAngle } = T;
  // Effective table bounds for this session — track's own TABLE, or the config default.
  // Local const shadows the module-level import so the shared singleton is never mutated.
  const TABLE = T.TABLE ?? TABLE_CFG;
  const TOTAL_LAPS = T.laps ?? opts.laps ?? 0; // 0 = infinite (sandbox)
  const ZEN = !!opts.zen;
  S.zen = ZEN;
  const REVERSED = !!opts.reversed;
  S.reversed = REVERSED;
  // Per-instance persistence key (forward = id, reversed = id:rev). Records, tire/cap
  // pickups, cleared-flag and first-clear are all keyed by this so directions are independent.
  const INSTANCE = instanceId(T.id ?? '', REVERSED);

  initRender(T);
  initCar(T);
  if (opts.initItems) initItems(props);

  // ─── Cola caps ────────────────────────────────────────────────────────────────
  const CAP_INNER_R = 40;               // min distance from cap centre to count as "around" it
  const CAP_OUTER_R = 160;              // max distance
  const CAP_DECAY   = Math.PI * 2 / 6; // sweep decay rate (rad/s) when not drifting in donut
  const CAP_TIRE_VALUE = 15;           // tires awarded for banking a cola-cap donut (was dead score)
  const CAP_LOOPS   = 2;               // full circles required to collect
  const TIRE_CR     = 35;              // car half-length proxy for proximity pickup radius

  const collectibles = T.collectibles ?? [];
  // Preload images onto the descriptor (same pattern as _cos/_sin on props).
  for (const cap of collectibles) {
    if (cap.imgSrc  && !cap._img)     { const im = new Image(); im.src = cap.imgSrc;  cap._img     = im; }
    if (cap.imgFull && !cap._imgFull) { const im = new Image(); im.src = cap.imgFull; cap._imgFull = im; }
  }
  // S.caps: pure runtime state only — static data stays in collectibles[].
  // Restore previously collected caps from store so they stay permanently collected.
  const _prevCollected = new Set([
    ...collectedCaps(INSTANCE),
    ...tiresFor(INSTANCE),
  ]);
  S.caps = {};
  collectibles.forEach((c, i) => {
    // Multi-format lookup so no save format silently loses collected state. Accept any of:
    //   • c.capId          — current keys (seed-index `t<k>` for tires, coordinate for caps)
    //   • `${c.x},${c.y}`  — the OLD coordinate key for tires (pre seed-index); on a stable
    //                        track the current seed lands on the same coords, so a legacy
    //                        save stays collected with no reset / migration
    //   • i                — the oldest numeric-index format
    const wasCollected = _prevCollected.has(c.capId ?? i)
      || _prevCollected.has(`${c.x},${c.y}`)
      || _prevCollected.has(i);
    S.caps[i] = { trackId: INSTANCE, sweep: 0, prevAng: null, collected: wasCollected, pop: 0 };
  });
  // Self-heal the stored tire list: prune it to the tiles that exist now (drops orphaned /
  // duplicate ids from geometry or key-scheme churn, re-keys to the stable capId). Guarantees
  // the collected count can never exceed the tile total — no more "16/12" badges.
  setTires(INSTANCE, reconcileTires(tiresFor(INSTANCE), collectibles.filter(c => c.kind === 'tire')));


  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const flash = (msg, color) => {
    S.flashMsg = msg;
    S.flashColor = color || '#fff';
    S.flashT = 0.9;
  };

  // Seconds the car may be non-drifting before the MULTIPLIER resets. Deliberately longer than
  // the 0.5s points-bank window: a fast transition flick can straighten the car for up to ~1s,
  // and that brief interruption must NOT nuke a hard-earned multiplier (it froze, not lost).
  const MULT_RESET_GRACE = 1.2;

  const resetCombo = () => {
    S.comboPoints = 0; S.mult = 1; S.driftTime = 0;
    S.transitions = 0; S.lastSlipSign = 0; S.multBuild = 0; S.nearMisses = 0;
    driftZoneRef = nearIdx; driftZoneTimer = 0; driftZoned = false;
  };

  // Bank the accumulated combo POINTS into the score but KEEP the multiplier (multBuild/mult):
  // banking is the score payout; the multiplier is the separate "flow" reward that only resets
  // on a sustained stop (resetMult) or a crash (burnCombo → resetCombo). Preserving it here is
  // what lets a quick flick that briefly ends the drift continue the multiplier on recovery.
  const bankPoints = () => {
    if (S.comboPoints >= 1) {
      if (!ZEN) S.score += Math.round(S.comboPoints);
      flash('+' + Math.round(S.comboPoints) + ' banked', '#9be37a');
    }
    S.comboPoints = 0; S.driftTime = 0;
  };

  // Reset ONLY the multiplier side (points are already banked). Fires after MULT_RESET_GRACE of
  // continuous non-drift — a genuine stop, not a flick.
  const resetMult = () => {
    S.mult = 1; S.multBuild = 0; S.transitions = 0; S.lastSlipSign = 0; S.nearMisses = 0;
    driftZoneRef = nearIdx; driftZoneTimer = 0; driftZoned = false;
  };

  const bankCombo = () => {
    if (S.comboPoints < 1) { resetCombo(); return; }
    if (!ZEN) S.score += Math.round(S.comboPoints);
    flash('+' + Math.round(S.comboPoints) + ' banked', '#9be37a');
    resetCombo();
  };

  const burnCombo = (reason) => {
    if (S.comboPoints >= 1) flash(reason + '  combo ' + Math.round(S.comboPoints) + ' lost', '#ff6a6a');
    comboUnbroken = false;   // any crash / off-track ends the "one unbroken drift" run
    resetCombo();
    S.crashCd = 0.5; S.driftGrace = 1;
  }

  const updateCaps = (dt, drifting) => {
    for (let i = 0; i < collectibles.length; i++) {
      const cap = S.caps[i];
      if (cap.collected) {
        if (cap.pop > 0) cap.pop = Math.max(0, cap.pop - dt);
        continue;
      }
      const c  = collectibles[i];
      const dx = car.x - c.x, dy = car.y - c.y;
      const dist = Math.hypot(dx, dy);

      if (c.kind === 'tire') {
        if (ZEN) continue;                 // no tire economy in Zen mode
        if (dist < c.r + TIRE_CR) {
          cap.collected = true;
          cap.pop = 0.4;
          tireCollect(INSTANCE, c.capId ?? i);
          addTires(c.value);                 // credit live (HUD); ledger logs the per-race sum
          tiresEarned += c.value;
          runTirePickups++;
          flash('+' + c.value + ' tire' + (c.value !== 1 ? 's' : ''), '#ffe48a');
        }
        continue;
      }

      // kind === 'cola': drift-donut collection
      const inDonut = dist > CAP_INNER_R && dist < CAP_OUTER_R;
      const ang = Math.atan2(dy, dx);
      const engaged = inDonut && drifting;
      // prevAng is null when the car was last outside the donut;
      // use ang as both args so the first frame in the donut contributes 0 delta.
      cap.sweep = stepSweep(cap.sweep, cap.prevAng ?? ang, ang, engaged, dt, CAP_DECAY);
      cap.prevAng = engaged ? ang : null;
      if (Math.abs(cap.sweep) >= Math.PI * 2 * CAP_LOOPS) {
        cap.collected = true;
        cap.pop       = 0.6;
        cap.sweep     = 0;
        if (!ZEN) {
          addTires(CAP_TIRE_VALUE, 'Cola cap — ' + CAP_TIRE_VALUE + ' tires'); // its own ledger line
          runCaps++;
        }
        flash('CAP! +' + CAP_TIRE_VALUE + ' tires', '#ff9999');
        capCollect(INSTANCE, c.capId ?? i);
      }
    }
  };

  const N_CTR      = center.length; // centerline point count for circular-index arithmetic
  const ZONE_ADV   = 8;             // forward indices required to reset the no-progress timer
  const ZONE_STALL = 3.0;           // seconds without progress before multiplier growth freezes

  let nearIdx        = 0;
  let driftZoneRef   = 0;     // nearIdx at the last zone reset
  let driftZoneTimer = 0;     // seconds the car has been in the same zone while drifting
  let driftZoned     = false; // true once stall fired; ref frozen at stall-start until car exits

  const hitConeAt = (c, px, py, r) => {
    if (c.knocked) return;
    const dx = px - c.x, dy = py - c.y;
    const rr = r + CONE_R;
    if (dx * dx + dy * dy >= rr * rr) return;
    c.knocked = true;
    hapticCone();
    const d = Math.hypot(dx, dy) || 1;
    c.vx = car.vx * 0.6 - (dx / d) * 80;
    c.vy = car.vy * 0.6 - (dy / d) * 80;
    c.spin = (Math.random() - 0.5) * 18;
    car.vx *= 0.96; car.vy *= 0.96;
    if (!ZEN) S.score = Math.max(0, S.score - 100);
    flash('Cone!  -100', '#ffb14d');
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  // All listeners go through on(): it accumulates them in listeners[] so stop()
  // can remove them all at once. Without this they would pile up on restart.
  const listeners = [];
  const on = (target, type, handler, opts) => {
    target.addEventListener(type, handler, opts);
    listeners.push([target, type, handler, opts]);
  };

  const onKeyDown = e => { keys[e.key] = true; };
  const onKeyUp   = e => { keys[e.key] = false; };
  on(window, 'keydown', onKeyDown);
  on(window, 'keyup',   onKeyUp);
  // passive: false + preventDefault() — prevents iOS from starting text selection
  // on long press during gameplay
  const onPointerDown   = e => { e.preventDefault(); pointers.set(e.pointerId, e.clientX); };
  const onPointerMove   = e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, e.clientX); } };
  const onPointerUp     = e => { pointers.delete(e.pointerId); };
  const onPointerCancel = e => { pointers.delete(e.pointerId); };
  on(canvas, 'pointerdown',   onPointerDown,   { passive: false });
  on(canvas, 'pointermove',   onPointerMove,   { passive: false });
  on(canvas, 'pointerup',     onPointerUp);
  on(canvas, 'pointercancel', onPointerCancel);
  // Block context menu and text selection on the whole document
  const onContextMenu = e => e.preventDefault();
  const onSelectStart = e => e.preventDefault();
  on(document, 'contextmenu', onContextMenu);
  on(document, 'selectstart', onSelectStart);

  // ─── UI ───────────────────────────────────────────────────────────────────────

  const raceResults  = createRaceResults();
  let raceFinished   = false; // flag: stop() must not destroy raceResults after a finish
  let tiresEarned    = 0;     // tire-PICKUP coins this run — logged as one ledger entry at finish
  // Per-run achievement accumulators (reset here, read once at finish). Separate from the
  // per-combo S.* fields (e.g. S.nearMisses is zeroed on every combo reset).
  let runTirePickups = 0;     // count of tire pickups (for clean-sweep vs the track total)
  let runNearMisses  = 0;     // near misses this race (S.nearMisses resets per combo)
  let runCrashes     = 0;     // wall/prop impacts this race (for untouchable)
  let runTimeAt8     = 0;     // seconds held at the max multiplier (for flow-1/2)
  let runDriftSecs   = 0;     // seconds drifted this race (added to lifetime stats.driftSecs)
  let runCaps        = 0;     // cola caps banked this race
  let comboUnbroken  = true;  // set false the first time an active combo is lost mid-race

  // Assemble the pure achievement ctx from this run + persistent state, evaluate, and persist
  // the result (ladder progress + one-time unlock + tire reward). Returns the newly-unlocked
  // defs ({ id, name, icon, reward }) for the results toast. Time Attack only (see call site).
  const awardAchievements = (pps) => {
    const st = stats();
    const ctx = {
      run: {
        finished: true, instanceId: INSTANCE, trackId: T.id, reversed: REVERSED,
        pps, stars: starsForPps(pps), ddk: isDDK(pps),
        nearMisses: runNearMisses, crashes: runCrashes,
        conesHit: cones.filter(c => c.knocked).length, conesTotal: cones.length,
        timeAt8: runTimeAt8, comboUnbroken, tiresThisRun: runTirePickups,
        // clean-sweep is per-track one-shot BY DESIGN: tire pickups persist permanently, so a
        // partially-harvested track can never satisfy tiresThisRun === total again — the player
        // earns it on a fresh track. Not a bug; the trap is intentional.
        tireTotalOnTrack: collectibles.filter(c => c.kind === 'tire').length,
        capsThisRun: runCaps, hour: new Date().getHours(),
      },
      wallet: wallet(), owned: owned(), cleared: st.cleared ?? [],
      records: flattenRecords(records()), caps: st.caps ?? {},
      lifetime: { runs: st.runs ?? 0, driftSecs: st.driftSecs ?? 0 },
      content: buildContent(TRACKS, CATALOG),
    };
    const res = evaluate(ctx, achUnlocked());
    for (const p of res.progress) achSetProgress(p.id, p.value);
    const out = [];
    for (const u of res.unlocked) {
      if (achUnlock(u.id)) {                 // idempotent — the reward is paid once
        if (u.reward) addTires(u.reward, 'Achievement: ' + u.name);
        out.push(u);
      }
    }
    return out;
  };

  // Menu button — ask for confirmation first so a stray tap doesn't eject the player.
  // Game is paused for the duration of the dialog.
  const confirmExit = createConfirmExit();
  const onMenuClick = e => {
    e.preventDefault();
    const wasAlreadyPaused = pause.isPaused();
    pause.pause();
    confirmExit.show({
      onExit:    () => { location.href = 'index.html'; },
      onRestart: () => { location.reload(); },
      onCancel:  () => { if (!wasAlreadyPaused) pause.resume(); },
    });
  };
  on(document.getElementById('menuBtn'), 'click', onMenuClick);

  // Lap counter in HUD: "1/3" instead of "1/-" in fixed-lap mode.
  // Set ONLY the total span — never replace #lapNum, whose ref render.js caches once
  // (innerHTML-replacing it detached that ref and froze the visible counter).
  if (TOTAL_LAPS > 0) {
    const el = document.getElementById('lapTotal');
    if (el) el.textContent = TOTAL_LAPS;
  }

  // Car and colour chosen on the garage screen (select.html), read from store.
  // Garage paint is session-local — never write back to the shared CARS descriptor.
  const g = garage();
  S.carModel = Math.max(0, Math.min(g.carIndex ?? 0, CARS.length - 1));
  const look = carLook(S.carModel);   // per-car equipped look
  setCarPaint(look.bodyColor ?? null, look.neonColor ?? null, look.finish ?? null, look.trailColor ?? null);

  // Speed units: read once at startup — does not change mid-game.
  // Conversion: game units/s → km/h (GU_TO_KMH) or mph (× 0.621371).
  const isMph = settings().units === 'mph';
  const toDisplaySpeed = (s) => s * GU_TO_KMH * (isMph ? 0.621371 : 1);
  const spdUnitEl = document.getElementById('spdUnit');
  if (spdUnitEl) spdUnitEl.textContent = isMph ? 'mph' : 'km/h';

  // ─── Pause (isolated component) ───────────────────────────────────────────────
  // The engine only reads pause.isPaused(); on pause we release steering so the car
  // doesn't lurch on resume.
  const pause = createPause({
    onChange(p) { if (p) { pointers.clear(); } },
  });

  // ─── Finish line ──────────────────────────────────────────────────────────────
  // Crossing detected by sign-change of the forward projection onto the track axis (not a circle).
  // prevFinishDot < 0 = car is still behind the line; sign change = crossing.
  const finishCos = Math.cos(startAngle), finishSin = Math.sin(startAngle);
  const c0 = checkpoints[0];
  let prevFinishDot = null; // null = haven't registered the first position on this approach yet

  // ─── Physics ──────────────────────────────────────────────────────────────────

  // Render at the display's native refresh rate (uncapped rAF). Physics is frame-rate
  // independent (decay terms use Math.pow(k, dt * PHYS_HZ); dt clamped at 0.05 s), so a
  // 60 / 90 / 120 Hz panel all simulate identically — running every frame is just smoother.
  // NB: a previous 60 fps throttle was removed: skipping rAF ticks against a fixed 16.67 ms
  // threshold downgrades 90 Hz panels to a juddery 45 fps (no clean 60 exists on 90 Hz) and
  // micro-stutters on 60 Hz from refresh jitter. Don't reintroduce a fixed-ms frame cap;
  // if battery on 120 Hz ever matters, only halve when native rate is a clean multiple of 60.
  let last = performance.now();
  let rafId = 0;
  const frame = (now) => {
    rafId = requestAnimationFrame(frame);

    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;

    // Frozen: nothing computed or redrawn — last frame stays on canvas, overlay dims it.
    if (pause.isPaused()) return;

    if (S.startCd > 0) {
      S.startCd -= dt;
      if (S.startCd <= 0) S.goT = 1.0;
      draw(0);
      return;
    }
    if (S.goT > 0) S.goT -= dt;

    const M = CARS[S.carModel];
    const P = M._drive;

    const steerTarget = resolveSteer(pointers, keys, W);

    // Car kinematics (steering, grip, wobble, self-align, integration) — pure step in
    // js/physics.js. Mutates car + S.steerSmooth/physT; returns the snapshot the scoring
    // and skid code below reads. (updateCaps now samples post-integration position — a
    // sub-pixel, feel-irrelevant shift from when it ran mid-step.)
    const { drifting, speed, vS, fwd, side } = stepCar(car, S, steerTarget, P, PHYS_K, dt);
    updateCaps(dt, drifting);

    // Frame-normalised decay factor for knocked-cone motion below.
    const fAdj = dt * PHYS_HZ;

    const CR = M.wid * 0.55;
    const hx = Math.cos(car.angle), hy = Math.sin(car.angle), nose = M.len * 0.3;
    const bodyPts = [[car.x + hx * nose, car.y + hy * nose], [car.x, car.y], [car.x - hx * nose, car.y - hy * nose]];

    for (const c of cones) {
      for (const p of bodyPts) hitConeAt(c, p[0], p[1], CR);
      if (c.knocked) stepKnockedCone(c, props, CONE_R, dt, fAdj);
    }

    // Wall + prop collision response — pure mutators in js/collision.js. They mutate
    // car kinematics and return the impact magnitude; side effects (haptics, combo burn)
    // stay here. bodyPts is the pre-collision capsule snapshot (not recomputed mid-step).
    if (resolveWall(car, TABLE, CR, hx, hy, nose, bodyPts) > 120) { hapticCrash(); burnCombo('WALL!'); runCrashes++; }
    if (resolveProps(car, props, CR, bodyPts) > 100) { hapticCrash(); burnCombo('CRASH!'); runCrashes++; }

    if (S.crashCd > 0) S.crashCd -= dt;
    const slip     = Math.abs(vS);
    const { dist: distTrk, idx: _nearIdx } = nearestCenter(car.x, car.y, center, nearIdx);
    nearIdx = _nearIdx;
    const onTrack  = distTrk < TRACK_HALF + 90;

    if (S.comboPoints >= 1 && distTrk > TRACK_HALF + 260) burnCombo('OFF TRACK!');
    if (S.nearMissCd > 0) S.nearMissCd -= dt;

    if (drifting && onTrack && S.crashCd <= 0) {
      S.driftTime += dt;
      runDriftSecs += dt;
      const quality = driftQuality(slip, speed);
      if (circularAdvance(nearIdx, driftZoneRef, N_CTR) >= ZONE_ADV) {
        driftZoneRef = nearIdx; driftZoneTimer = 0; driftZoned = false;
      } else {
        driftZoneTimer += dt;
        if (driftZoneTimer >= ZONE_STALL && !driftZoned) {
          driftZoned = true;
          driftZoneRef = nearIdx; // anchor to current position so recovery needs only 8 forward indices
        }
      }
      if (!driftZoned) {
        S.multBuild += dt * MULT_GAIN_PER_S * quality;
        const sgn = slipSign(vS);
        if (sgn !== 0) {
          if (S.lastSlipSign !== 0 && sgn !== S.lastSlipSign) {
            S.transitions++; S.multBuild += MULT_TRANSITION_BONUS; flash('TRANSITION!', '#7fd4ff');
          }
          S.lastSlipSign = sgn;
        }
        if (S.nearMissCd <= 0 && nearMiss(car, cones, props, TABLE, CONE_R, CR, NM_BAND)) {
          S.nearMisses++; runNearMisses++; S.multBuild += MULT_NEARMISS_BONUS; S.nearMissCd = 0.6; flash('NEAR MISS!', '#ffd36a');
        }
        S.mult = comboMult(S.multBuild);
        if (S.mult >= MULT_MAX) runTimeAt8 += dt;   // time held at the ceiling (flow-1/2)
        S.comboPoints += comboGain(slip, speed, dt, S.mult);
      } else {
        flash('NO PROGRESS!', '#ffa040');
      }
      S.driftGrace = 0;
    } else {
      S.driftGrace += dt;
      if (S.driftGrace > 0.5 && S.comboPoints >= 1) {
        comboUnbroken = false;   // an active combo streak ended mid-race
        // Breaking the drift long enough to bank (>0.5s off the slide) costs the multiplier
        // too — you keep the points you earned, but the flow reward resets. A genuinely
        // seamless flick (grace < 0.5s, nothing banks) still builds through, so clean
        // drift-chaining is unaffected; only a real break drops the multiplier.
        if (onTrack) { bankPoints(); resetMult(); } else burnCombo('OFF TRACK!');
      }
      // Safety net: a stop that built a multiplier but no bankable points still clears it
      // after a sustained non-drift stretch (a quick flick never reaches this).
      if (onTrack && S.driftGrace > MULT_RESET_GRACE && S.multBuild > 0) resetMult();
    }

    if (slip > 40 && speed > 60) {
      const rx = car.x - fwd.x * 12, ry = car.y - fwd.y * 12;
      S.skids.push({ x: rx + side.x * 12, y: ry + side.y * 12, a: Math.min(slip / 200, .6) });
      S.skids.push({ x: rx - side.x * 12, y: ry - side.y * 12, a: Math.min(slip / 200, .6) });
      if (S.skids.length > 1500) S.skids.splice(0, 2);
    }

    if (!ZEN && S.lapStarted) S.lapTime += dt;

    if (!ZEN && S.nextCp === 0) {
      // ── Finish line: crossing by sign of projection ────────────────────────────
      // Circle removed — detection is exact: time is recorded at the moment of crossing,
      // not on entry into a CP_R radius zone.
      const fDot = finishDot(car, c0, finishCos, finishSin);

      // Lateral constraint removed: the car could lap around the line at the table edge
      // and not be credited. Direction detection (sign of fDot) + completed intermediate
      // checkpoints is sufficient — they already guarantee a full lap.
      if (prevFinishDot !== null && crossedFinish(prevFinishDot, fDot)) {
        S.lastLap = S.lapTime;
        if (S.bestLap === null || S.lapTime < S.bestLap) S.bestLap = S.lapTime;
        S.lapNum++;

        if (TOTAL_LAPS > 0 && S.lapNum >= TOTAL_LAPS) {
          // Final lap: bank combo first, then record the lap score.
          // Order is critical — reversing it would drop the last combo from both pts and the total.
          bankCombo();
          S.lapScores.push({ n: S.lapNum, pts: Math.round(S.score - S.lapScoreStart), t: S.lapTime });
          S.lapTime = 0; S.nextCp = 1;

          const totalScore = Math.round(S.score);
          const totalTime  = S.lapScores.reduce((s, l) => s + l.t, 0);
          // Cola caps now pay tires (not score), so score maps straight to PPS — nothing to strip.
          const pps        = pointsPerSecond(totalScore, totalTime);
          // Tire economy (Time Attack only — Zen earns nothing). Ledger order:
          // pickups sum → first-clear bonus → finish payout.
          const baseName  = TRACKS.find(t => t.id === T.id)?.name ?? 'Race';
          const trackName = baseName + (REVERSED ? ' (reversed)' : '');
          let firstClearBonus = 0, finishBonus = 0;
          if (!ZEN) {
            if (tiresEarned > 0)
              recordTxn(tiresEarned, `${trackName} — ${tiresEarned} tire${tiresEarned !== 1 ? 's' : ''}`);
            if (T.id && markCleared(INSTANCE)) {    // first finish of this instance → bonus
              firstClearBonus = FIRST_CLEAR_BONUS;
              addTires(firstClearBonus, `${trackName} — first clear`);
            }
            finishBonus = finishPayout(pps);
            addTires(finishBonus, `${trackName} — finish bonus`);
          }

          let isNewRecord = false;
          if (T.id) {
            const rec  = records();
            const slot = rec[INSTANCE] ?? (rec[INSTANCE] = {});
            const ta   = slot.timeattack ?? (slot.timeattack = {});
            if (ta.bestPPS == null || pps > ta.bestPPS) {
              ta.bestPPS      = pps;
              ta.bestPPSTotal = totalScore;
              ta.bestPPSTime  = totalTime;
              isNewRecord = true;
              save();
            }
          }

          // ── Achievements (Time Attack only) ─────────────────────────────────────
          // Evaluate AFTER records + markCleared + wallet payouts above, so DDK/progression/
          // hoard checks see this run's results. evaluate() is pure; we persist here.
          let unlockedNow = [];
          if (!ZEN) {
            const st = stats();
            st.runs = (st.runs ?? 0) + 1;
            st.driftSecs = (st.driftSecs ?? 0) + runDriftSecs;
            save();
            unlockedNow = awardAchievements(pps);
          }

          raceFinished = true;
          stop();
          document.getElementById('score').textContent = totalScore;
          raceResults.show({ score: totalScore, bestLap: S.bestLap, lapScores: S.lapScores, isNewRecord, pps, totalTime,
            ddk: isDDK(pps), unlocked: unlockedNow,
            tires: { pickup: tiresEarned, firstClear: firstClearBonus, finish: finishBonus } });
          return;
        }

        S.lapScores.push({ n: S.lapNum, pts: Math.round(S.score - S.lapScoreStart), t: S.lapTime });
        if (TOTAL_LAPS === 0 && S.lapScores.length > 3) S.lapScores.shift();
        S.lapScoreStart = S.score;
        flash('LAP ' + S.lapTime.toFixed(2) + ' s', '#9dff8f');
        S.lapTime = 0; S.nextCp = 1;
        // prevFinishDot stays null until the next approach (reset below)
      } else {
        prevFinishDot = fDot;
      }
    } else {
      // ── Intermediate checkpoints: circle CP_R ─────────────────────────────────
      const cp = checkpoints[S.nextCp];
      if (Math.hypot(car.x - cp.x, car.y - cp.y) < CP_R) {
        // Cycle on the actual checkpoint count, not K — long tracks get extra checkpoints
        // inserted on oversized gaps (sampleCheckpointsByCorner post-process 3).
        S.nextCp = (S.nextCp + 1) % checkpoints.length;
        if (S.nextCp === 0) prevFinishDot = null; // reset before the next approach to the finish
      }
    }

    if (S.flashT > 0) S.flashT -= dt;
    draw(toDisplaySpeed(speed));
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────
  // stop() makes the engine reentrant: removes all listeners, cancels the loop,
  // and destroys its UI components. Foundation for restart / results-screen / ghost.
  const stop = () => {
    cancelAnimationFrame(rafId);
    for (const [t, type, h, o] of listeners) t.removeEventListener(type, h, o);
    listeners.length = 0;
    pause.destroy();
    confirmExit.destroy();
    // raceResults stays alive after a race finish; only removed on restart
    if (!raceFinished) raceResults.destroy();
    if (getActive() === api) setActive(null);
  };
  const api = { stop };
  setActive(api);

  rafId = requestAnimationFrame(frame);
  return api;
}
