import { CARS, TABLE as TABLE_CFG, PHYS_HZ, GRIP_WOBBLE, STEER_WOBBLE, NM_BAND, GU_TO_KMH } from './config.js';
import { car, S, keys, pointers, initCar } from './state.js';
import { canvas, W, draw, initItems, initRender, setCarPaint } from './render.js';
import { createPause } from './pause.js';
import { createConfirmExit } from './confirm-exit.js';
import { garage, settings, records, save, collectedCaps, capCollect } from './store.js';
import { createRaceResults } from './race-results.js';
import {
  isDrifting, driftQuality, comboMult, comboGain, slipSign, pointsPerSecond,
  MULT_GAIN_PER_S, MULT_TRANSITION_BONUS, MULT_NEARMISS_BONUS,
} from './scoring.js';
import { stepSweep } from './cola.js';

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

  initRender(T);
  initCar(T);
  if (opts.initItems) initItems(props);

  // ─── Cola caps ────────────────────────────────────────────────────────────────
  const CAP_INNER_R = 40;               // min distance from cap centre to count as "around" it
  const CAP_OUTER_R = 160;              // max distance
  const CAP_DECAY   = Math.PI * 2 / 6; // sweep decay rate (rad/s) when not drifting in donut
  const CAP_BONUS   = 500;
  const CAP_LOOPS   = 2;               // full circles required to collect

  const collectibles = T.collectibles ?? [];
  // Preload images onto the descriptor (same pattern as _cos/_sin on props).
  for (const cap of collectibles) {
    if (cap.imgSrc  && !cap._img)     { const im = new Image(); im.src = cap.imgSrc;  cap._img     = im; }
    if (cap.imgFull && !cap._imgFull) { const im = new Image(); im.src = cap.imgFull; cap._imgFull = im; }
  }
  // S.caps: pure runtime state only — static data stays in collectibles[].
  // Restore previously collected caps from store so they stay permanently collected.
  const _prevCollected = new Set(collectedCaps(T.id ?? ''));
  S.caps = {};
  collectibles.forEach((c, i) => {
    S.caps[i] = { trackId: T.id ?? '', sweep: 0, prevAng: null, collected: _prevCollected.has(c.capId ?? i), pop: 0 };
  });

  // Cap bonuses are excluded from PPS so one-time pickups don't inflate the record.
  let capBonus = 0;

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const flash = (msg, color) => {
    S.flashMsg = msg;
    S.flashColor = color || '#fff';
    S.flashT = 0.9;
  };

  const resetCombo = () => {
    S.comboPoints = 0; S.mult = 1; S.driftTime = 0;
    S.transitions = 0; S.lastSlipSign = 0; S.multBuild = 0; S.nearMisses = 0;
  };

  const bankCombo = () => {
    if (S.comboPoints < 1) { resetCombo(); return; }
    if (!ZEN) S.score += Math.round(S.comboPoints);
    flash('+' + Math.round(S.comboPoints) + ' banked', '#9be37a');
    resetCombo();
  };

  const burnCombo = (reason) => {
    if (S.comboPoints >= 1) flash(reason + '  combo ' + Math.round(S.comboPoints) + ' lost', '#ff6a6a');
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
      const { x, y } = collectibles[i];
      const dx = car.x - x, dy = car.y - y;
      const dist = Math.hypot(dx, dy);
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
        if (!ZEN) { S.score += CAP_BONUS; capBonus += CAP_BONUS; }
        flash('CAP! +' + CAP_BONUS, '#ff9999');
        capCollect(T.id ?? '', collectibles[i].capId ?? i);
      }
    }
  };

  // Nearest centreline point. Previously an O(N) full scan every frame.
  // The car moves continuously along the closed line, so we only search
  // ±NEAR_W around the previous index. For N≈300–416 that's ~49 points
  // instead of all of them — far cheaper, same result (car step per frame
  // ≪ window width even at the clamped dt=0.05).
  const N_CENTER = center.length;
  const NEAR_W = 24;
  let nearIdx = 0;
  const distToTrack = () => {
    let best = Infinity, bi = nearIdx;
    for (let k = -NEAR_W; k <= NEAR_W; k++) {
      const i = (((nearIdx + k) % N_CENTER) + N_CENTER) % N_CENTER;
      const dx = car.x - center[i].x, dy = car.y - center[i].y;
      const d = dx * dx + dy * dy;
      if (d < best) { best = d; bi = i; }
    }
    nearIdx = bi;
    return Math.sqrt(best);
  }

  const nearMissCheck = (CR) => {
    const speed = Math.hypot(car.vx, car.vy);
    if (speed < 140) return false;
    if (TABLE.shape === 'round') {
      const rx = TABLE.w / 2 - CR, ry = TABLE.h / 2 - CR;
      const r = Math.hypot(car.x / rx, car.y / ry);
      const gap = (1 - r) * Math.min(rx, ry);
      if (gap > 0 && gap < NM_BAND) return true;
    } else {
      const gx = (TABLE.w / 2 - CR) - Math.abs(car.x);
      const gy = (TABLE.h / 2 - CR) - Math.abs(car.y);
      if ((gx > 0 && gx < NM_BAND) || (gy > 0 && gy < NM_BAND)) return true;
    }
    for (const c of cones) {
      if (c.knocked) continue;
      const d = Math.hypot(car.x - c.x, car.y - c.y) - (CONE_R + CR);
      if (d > 0 && d < NM_BAND) return true;
    }
    for (const o of props) {
      let qx = o.x, qy = o.y;
      if (o.hl > 0) {
        const lx = car.x - o.x, ly = car.y - o.y;
        let t = lx * o._cos + ly * o._sin;
        if (t > o.hl) t = o.hl; else if (t < -o.hl) t = -o.hl;
        qx = o.x + o._cos * t; qy = o.y + o._sin * t;
      }
      const d = Math.hypot(car.x - qx, car.y - qy) - (o.r + CR);
      if (d > 0 && d < NM_BAND) return true;
    }
    return false;
  }

  const hitConeAt = (c, px, py, r) => {
    if (c.knocked) return;
    const dx = px - c.x, dy = py - c.y;
    const rr = r + CONE_R;
    if (dx * dx + dy * dy >= rr * rr) return;
    c.knocked = true;
    const d = Math.hypot(dx, dy) || 1;
    c.vx = car.vx * 0.6 - (dx / d) * 80;
    c.vy = car.vy * 0.6 - (dy / d) * 80;
    c.spin = (Math.random() - 0.5) * 18;
    car.vx *= 0.96; car.vy *= 0.96;
    if (!ZEN) S.score = Math.max(0, S.score - 100);
    flash('Cone!  -100', '#ffb14d');
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  const updatePointerSteer = () => {
    let s = 0;
    for (const x of pointers.values()) s += (x < W / 2 ? -1 : 1);
    S.steerInput = Math.sign(s);
  };

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
  const onPointerDown   = e => { e.preventDefault(); pointers.set(e.pointerId, e.clientX); updatePointerSteer(); };
  const onPointerMove   = e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, e.clientX); updatePointerSteer(); } };
  const onPointerUp     = e => { pointers.delete(e.pointerId); updatePointerSteer(); };
  const onPointerCancel = e => { pointers.delete(e.pointerId); updatePointerSteer(); };
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

  // Lap counter in HUD: "1/3" instead of "1/-" in fixed-lap mode
  if (TOTAL_LAPS > 0) {
    const el = document.getElementById('lapCounter');
    if (el) el.innerHTML = `<span id="lapNum">1</span>/${TOTAL_LAPS}`;
  }

  // Car and colour chosen on the garage screen (select.html), read from store.
  // Garage paint is session-local — never write back to the shared CARS descriptor.
  const g = garage();
  S.carModel = Math.max(0, Math.min(g.carIndex ?? 0, CARS.length - 1));
  setCarPaint(g.bodyColor ?? null, g.neonColor ?? null);

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
    onChange(p) { if (p) { pointers.clear(); S.steerInput = 0; } },
  });

  // ─── Finish line ──────────────────────────────────────────────────────────────
  // Crossing detected by sign-change of the forward projection onto the track axis (not a circle).
  // prevFinishDot < 0 = car is still behind the line; sign change = crossing.
  const finishCos = Math.cos(startAngle), finishSin = Math.sin(startAngle);
  const c0 = checkpoints[0];
  let prevFinishDot = null; // null = haven't registered the first position on this approach yet

  // ─── Physics ──────────────────────────────────────────────────────────────────

  let last = performance.now();
  let rafId = 0;
  const frame = (now) => {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;

    // Frozen: nothing computed or redrawn — last frame stays on canvas, overlay dims it.
    // `last` is already updated → no dt spike on resume.
    if (pause.isPaused()) { rafId = requestAnimationFrame(frame); return; }

    if (S.startCd > 0) {
      S.startCd -= dt;
      if (S.startCd <= 0) S.goT = 1.0;
      draw(0);
      rafId = requestAnimationFrame(frame);
      return;
    }
    if (S.goT > 0) S.goT -= dt;

    const P = CARS[S.carModel]._drive;

    let kSteer = 0;
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) kSteer -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) kSteer += 1;
    const steerTarget = kSteer !== 0 ? kSteer : S.steerInput;
    S.steerSmooth += (steerTarget - S.steerSmooth) * Math.min(1, dt * P.steerSmooth);

    const fwd  = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
    const side = { x: -Math.sin(car.angle), y: Math.cos(car.angle) };
    let vF = car.vx * fwd.x + car.vy * fwd.y;
    let vS = car.vx * side.x + car.vy * side.y;
    const speed = Math.hypot(car.vx, car.vy);
    const drifting = isDrifting(vS, speed);
    updateCaps(dt, drifting);

    S.physT += dt;
    const wobSlow = Math.sin(S.physT * 0.8 + 1.7) + 0.5 * Math.sin(S.physT * 1.9 + 4.2);
    const wobFast = 0.6 * Math.sin(S.physT * 5.3 + 0.5) + 0.4 * Math.sin(S.physT * 12.1 + 2.1);
    const wob  = 0.7 * wobSlow + 0.3 * wobFast;
    const live = Math.min(1, speed / P.maxSpeed) * (0.4 + 0.6 * Math.min(1, Math.abs(vS) / 80));
    const liveSteer = Math.min(1, speed / P.maxSpeed) * Math.min(1, Math.abs(vS) / 60);
    const fAdj    = dt * PHYS_HZ;
    const gripAdj = fAdj * (1 + GRIP_WOBBLE * wob * live);

    if (vF < P.maxSpeed) vF += P.thrust * dt;
    vF *= Math.pow(P.rollFriction, fAdj);
    vS *= Math.pow(P.grip, gripAdj);
    vF *= Math.max(0, 1 - P.driftDrag * Math.abs(vS) * dt);

    const turnFactor = Math.max(P.lowSpeedTurn, Math.min(speed / 160, 1));
    const authority  = drifting ? P.driftSteerBoost : 1;
    car.angle += S.steerSmooth * P.steer * turnFactor * authority * dt;
    car.angle += STEER_WOBBLE * wobSlow * liveSteer * dt;

    car.vx = fwd.x * vF + side.x * vS;
    car.vy = fwd.y * vF + side.y * vS;

    if (speed > 40) {
      const moveAng = Math.atan2(car.vy, car.vx);
      let diff = moveAng - car.angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += diff * P.selfAlign * Math.min(1, speed / P.maxSpeed) * dt;
    }

    car.x += car.vx * dt;
    car.y += car.vy * dt;

    const M  = CARS[S.carModel];
    const CR = M.wid * 0.55;
    const hx = Math.cos(car.angle), hy = Math.sin(car.angle), nose = M.len * 0.3;
    const bodyPts = [[car.x + hx * nose, car.y + hy * nose], [car.x, car.y], [car.x - hx * nose, car.y - hy * nose]];

    for (const c of cones) {
      for (const p of bodyPts) hitConeAt(c, p[0], p[1], CR);
      if (c.knocked) {
        const dAdj = Math.pow(0.9, fAdj);
        c.x += c.vx * dt; c.y += c.vy * dt;

        // Knocked cone vs prop collision — same capsule formula as car vs prop.
        // A simple center-check (without hl) would be inaccurate for boards/knives/pans.
        for (const o of props) {
          let qx = o.x, qy = o.y;
          if (o.hl > 0) {
            const lx = c.x - o.x, ly = c.y - o.y;
            let t = lx * o._cos + ly * o._sin;
            if (t > o.hl) t = o.hl; else if (t < -o.hl) t = -o.hl;
            qx = o.x + o._cos * t; qy = o.y + o._sin * t;
          }
          const dx = c.x - qx, dy = c.y - qy, minD = o.r + CONE_R;
          const d2 = dx * dx + dy * dy;
          if (d2 < minD * minD) {
            const d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d;
            c.x = qx + nx * minD; c.y = qy + ny * minD; // push cone out
            const vDotN = c.vx * nx + c.vy * ny;
            if (vDotN < 0) { c.vx -= vDotN * nx * 0.8; c.vy -= vDotN * ny * 0.8; c.spin *= -0.4; }
          }
        }

        c.vx *= dAdj; c.vy *= dAdj; c.ang += c.spin * dt; c.spin *= dAdj;
      }
    }

    if (TABLE.shape === 'round') {
      // Iterate capsule points: front → centre → rear. First violation = response.
      const rx = TABLE.w / 2 - CR, ry = TABLE.h / 2 - CR;
      for (const [bpx, bpy] of bodyPts) {
        const bnx = bpx / rx, bny = bpy / ry;
        const br = Math.hypot(bnx, bny);
        if (br > 1) {
          car.x += bnx / br * rx - bpx;
          car.y += bny / br * ry - bpy;
          const ux = bnx / br / rx, uy = bny / br / ry, ul = Math.hypot(ux, uy);
          const px = ux / ul, py = uy / ul;
          const vn = car.vx * px + car.vy * py;
          if (vn > 0) { car.vx -= vn * px * 1.3; car.vy -= vn * py * 1.3; if (vn > 120) burnCombo('WALL!'); }
          break; // one response per frame
        }
      }
    } else {
      // Capsule AABB: extent along X/Y depends on car angle, not just CR.
      // Previously only CR (width) was used, so the bumper would "enter the wall"
      // ~24 gu before the collision triggered.
      const absExtX = Math.abs(hx) * nose + CR;
      const absExtY = Math.abs(hy) * nose + CR;
      const wallW = TABLE.w / 2, wallH = TABLE.h / 2;
      let wallHit = 0;
      if (car.x - absExtX < -wallW) { car.x = -wallW + absExtX; if (car.vx < 0) { wallHit = Math.max(wallHit, -car.vx); car.vx *= -0.3; } car.vy *= 0.85; }
      if (car.x + absExtX >  wallW) { car.x =  wallW - absExtX; if (car.vx > 0) { wallHit = Math.max(wallHit,  car.vx); car.vx *= -0.3; } car.vy *= 0.85; }
      if (car.y - absExtY < -wallH) { car.y = -wallH + absExtY; if (car.vy < 0) { wallHit = Math.max(wallHit, -car.vy); car.vy *= -0.3; } car.vx *= 0.85; }
      if (car.y + absExtY >  wallH) { car.y =  wallH - absExtY; if (car.vy > 0) { wallHit = Math.max(wallHit,  car.vy); car.vy *= -0.3; } car.vx *= 0.85; }
      if (wallHit > 120) burnCombo('WALL!');
    }

    for (const o of props) {
      // Find the closest capsule body point to the prop
      let bestD2 = Infinity, bestBpX = car.x, bestBpY = car.y;
      let bestQx = o.x, bestQy = o.y;
      for (const [bpx, bpy] of bodyPts) {
        let qx = o.x, qy = o.y;
        if (o.hl > 0) {
          const lx = bpx - o.x, ly = bpy - o.y;
          let t = lx * o._cos + ly * o._sin;
          if (t > o.hl) t = o.hl; else if (t < -o.hl) t = -o.hl;
          qx = o.x + o._cos * t; qy = o.y + o._sin * t;
        }
        const dx = bpx - qx, dy = bpy - qy, d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; bestBpX = bpx; bestBpY = bpy; bestQx = qx; bestQy = qy; }
      }
      const rr = o.r + CR;
      if (bestD2 < rr * rr) {
        const d = Math.sqrt(bestD2) || 1;
        const nx = (bestBpX - bestQx) / d, ny = (bestBpY - bestQy) / d;
        car.x += bestQx + nx * rr - bestBpX;
        car.y += bestQy + ny * rr - bestBpY;
        const vn = car.vx * nx + car.vy * ny;
        if (vn < 0) { car.vx -= vn * nx * 1.4; car.vy -= vn * ny * 1.4; if (-vn > 100) burnCombo('CRASH!'); }
      }
    }

    if (S.crashCd > 0) S.crashCd -= dt;
    const slip     = Math.abs(vS);
    const distTrk  = distToTrack();
    const onTrack  = distTrk < TRACK_HALF + 90;

    if (S.comboPoints >= 1 && distTrk > TRACK_HALF + 260) burnCombo('OFF TRACK!');
    if (S.nearMissCd > 0) S.nearMissCd -= dt;

    if (drifting && onTrack && S.crashCd <= 0) {
      S.driftTime += dt;
      const quality = driftQuality(slip, speed);
      S.multBuild += dt * MULT_GAIN_PER_S * quality;
      const sgn = slipSign(vS);
      if (sgn !== 0) {
        if (S.lastSlipSign !== 0 && sgn !== S.lastSlipSign) {
          S.transitions++; S.multBuild += MULT_TRANSITION_BONUS; flash('TRANSITION!', '#7fd4ff');
        }
        S.lastSlipSign = sgn;
      }
      if (S.nearMissCd <= 0 && nearMissCheck(CR)) {
        S.nearMisses++; S.multBuild += MULT_NEARMISS_BONUS; S.nearMissCd = 0.6; flash('NEAR MISS!', '#ffd36a');
      }
      S.mult = comboMult(S.multBuild);
      S.comboPoints += comboGain(slip, speed, dt, S.mult);
      S.driftGrace = 0;
    } else {
      S.driftGrace += dt;
      if (S.driftGrace > 0.5 && S.comboPoints >= 1) {
        if (onTrack) bankCombo(); else burnCombo('OFF TRACK!');
      } else if (S.driftGrace > 0.5) {
        resetCombo();
      }
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
      const fDot = (car.x - c0.x) * finishCos + (car.y - c0.y) * finishSin;

      // Lateral constraint removed: the car could lap around the line at the table edge
      // and not be credited. Direction detection (sign of fDot) + completed intermediate
      // checkpoints is sufficient — they already guarantee a full lap.
      if (prevFinishDot !== null && prevFinishDot < 0 && fDot >= 0) {
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
          // Strip one-time cap bonuses from PPS so they don't inflate the record
          // versus runs where the cap was already collected (or not present).
          const ppsScore   = Math.max(0, totalScore - capBonus);
          const pps        = pointsPerSecond(ppsScore, totalTime);

          let isNewRecord = false;
          if (T.id) {
            const rec  = records();
            const slot = rec[T.id] ?? (rec[T.id] = {});
            const ta   = slot.timeattack ?? (slot.timeattack = {});
            if (ta.bestPPS == null || pps > ta.bestPPS) {
              ta.bestPPS      = pps;
              ta.bestPPSTotal = totalScore;
              ta.bestPPSTime  = totalTime;
              isNewRecord = true;
              save();
            }
          }

          raceFinished = true;
          stop();
          document.getElementById('score').textContent = totalScore;
          raceResults.show({ score: totalScore, bestLap: S.bestLap, lapScores: S.lapScores, isNewRecord, pps, totalTime });
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
        S.nextCp = (S.nextCp + 1) % K;
        if (S.nextCp === 0) prevFinishDot = null; // reset before the next approach to the finish
      }
    }

    if (S.flashT > 0) S.flashT -= dt;
    draw(toDisplaySpeed(speed));
    rafId = requestAnimationFrame(frame);
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
