import { CARS, TABLE, PHYS_HZ, GRIP_WOBBLE, STEER_WOBBLE, NM_BAND, GU_TO_KMH } from './config.js';
import { car, S, keys, pointers, initCar } from './state.js';
import { canvas, W, draw, initItems, initRender } from './render.js';
import { createPause } from './pause.js';
import { createConfirmExit } from './confirm-exit.js';
import { garage, settings, records, save } from './store.js';
import { createRaceResults } from './race-results.js';
import {
  isDrifting, driftQuality, comboMult, comboGain, slipSign, pointsPerSecond,
  MULT_GAIN_PER_S, MULT_TRANSITION_BONUS, MULT_NEARMISS_BONUS,
} from './scoring.js';

// Текущая запущенная игра — чтобы при повторном startGame снять прошлую
// (слушатели + цикл) и не плодить дубли. Также это сем для будущего restart/replay.
let _active = null;

// Запускает игровой цикл с переданным треком.
// T   — namespace-импорт трекового модуля (track.js или track-oval.js)
// opts.initItems — true, если у трека есть SVG-пропсы для предзагрузки
// Возвращает { stop } — снимает все слушатели и отменяет requestAnimationFrame.
export const startGame = (T, opts = {}) => {
  if (_active) _active.stop(); // не запускать вторую игру поверх живой
  const { center, cones, props, checkpoints, K, CP_R, TRACK_HALF, CONE_R, startAngle } = T;
  const TOTAL_LAPS = T.laps ?? opts.laps ?? 0; // 0 = бесконечно (sandbox)

  initRender(T);
  initCar(T);
  if (opts.initItems) initItems(props);

  // ─── Вспомогательные функции ───────────────────────────────────────────────

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
    S.score += Math.round(S.comboPoints);
    flash('+' + Math.round(S.comboPoints) + ' banked', '#9be37a');
    resetCombo();
  };

  const burnCombo = (reason) => {
    if (S.comboPoints >= 1) flash(reason + '  combo ' + Math.round(S.comboPoints) + ' lost', '#ff6a6a');
    resetCombo();
    S.crashCd = 0.5; S.driftGrace = 1;
  }

  // Ближайшая точка центральной линии. Раньше — O(N) полный скан КАЖДЫЙ кадр.
  // Машина движется непрерывно по замкнутой линии, поэтому ищем только в окне
  // ±NEAR_W вокруг прошлого индекса и запоминаем найденный. Для N≈300–416 это
  // ~49 точек вместо всех — кратно дешевле, результат тот же (шаг машины за кадр
  // ≪ ширины окна даже при clamp dt=0.05).
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
    S.score = Math.max(0, S.score - 100);
    flash('Cone!  -100', '#ffb14d');
  }

  // ─── Ввод ─────────────────────────────────────────────────────────────────

  const updatePointerSteer = () => {
    let s = 0;
    for (const x of pointers.values()) s += (x < W / 2 ? -1 : 1);
    S.steerInput = Math.sign(s);
  };

  // Все слушатели вешаем через on(): он копит их в listeners[], чтобы stop()
  // снял всё разом. Иначе при повторном запуске слушатели накапливались бы.
  const listeners = [];
  const on = (target, type, handler, opts) => {
    target.addEventListener(type, handler, opts);
    listeners.push([target, type, handler, opts]);
  };

  const onKeyDown = e => { keys[e.key] = true; };
  const onKeyUp   = e => { keys[e.key] = false; };
  on(window, 'keydown', onKeyDown);
  on(window, 'keyup',   onKeyUp);
  // passive: false + preventDefault() — не даёт iOS запустить выделение текста
  // при долгом нажатии во время игры
  const onPointerDown   = e => { e.preventDefault(); pointers.set(e.pointerId, e.clientX); updatePointerSteer(); };
  const onPointerMove   = e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, e.clientX); updatePointerSteer(); } };
  const onPointerUp     = e => { pointers.delete(e.pointerId); updatePointerSteer(); };
  const onPointerCancel = e => { pointers.delete(e.pointerId); updatePointerSteer(); };
  on(canvas, 'pointerdown',   onPointerDown,   { passive: false });
  on(canvas, 'pointermove',   onPointerMove,   { passive: false });
  on(canvas, 'pointerup',     onPointerUp);
  on(canvas, 'pointercancel', onPointerCancel);
  // Блокируем контекстное меню и выделение текста по всему документу
  const onContextMenu = e => e.preventDefault();
  const onSelectStart = e => e.preventDefault();
  on(document, 'contextmenu', onContextMenu);
  on(document, 'selectstart', onSelectStart);

  // ─── UI ───────────────────────────────────────────────────────────────────

  const raceResults  = createRaceResults();
  let raceFinished   = false; // флаг: stop() не разрушает raceResults после финиша

  // Кнопка «Меню» — сначала спрашиваем подтверждение, чтобы не выбросить игрока
  // в меню случайным нажатием. Игра встаёт на паузу на время диалога.
  const confirmExit = createConfirmExit();
  const onMenuClick = e => {
    e.preventDefault();
    const wasAlreadyPaused = pause.isPaused();
    pause.pause();
    confirmExit.show({
      onExit:   () => { location.href = 'index.html'; },
      onCancel: () => { if (!wasAlreadyPaused) pause.resume(); },
    });
  };
  on(document.getElementById('menuBtn'), 'click', onMenuClick);

  // Счётчик кругов в HUD: «1/3» вместо «1/-» при режиме с ограниченными кругами
  if (TOTAL_LAPS > 0) {
    const el = document.getElementById('lapCounter');
    if (el) el.innerHTML = `<span id="lapNum">1</span>/${TOTAL_LAPS}`;
  }

  // Машинка и цвет выбраны на экране гаража (select.html), читаем из store
  const g = garage();
  S.carModel = Math.max(0, Math.min(g.carIndex ?? 0, CARS.length - 1));
  if (g.bodyColor) CARS[S.carModel].body = g.bodyColor;
  CARS[S.carModel].neonColor = g.neonColor || null;

  // Единицы скорости: читаем один раз при старте — в игре не меняются.
  // Пересчёт: game units/s → км/ч (GU_TO_KMH) или мили/ч (× 0.621371).
  const isMph = settings().units === 'mph';
  const toDisplaySpeed = (s) => s * GU_TO_KMH * (isMph ? 0.621371 : 1);
  const spdUnitEl = document.getElementById('spdUnit');
  if (spdUnitEl) spdUnitEl.textContent = isMph ? 'mph' : 'km/h';

  // ─── Пауза (изолированный компонент) ────────────────────────────────────────
  // Движок только читает pause.isPaused(); при постановке на паузу отпускаем руль,
  // чтобы машина не дёрнулась на возобновлении.
  const pause = createPause({
    onChange(p) { if (p) { pointers.clear(); S.steerInput = 0; } },
  });

  // ─── Финишная линия ─────────────────────────────────────────────────────────
  // Детект пересечения по знаку проекции на ось трека (не кружок).
  // prevFinishDot < 0 = машина ещё позади линии; смена знака = пересечение.
  const finishCos = Math.cos(startAngle), finishSin = Math.sin(startAngle);
  const c0 = checkpoints[0];
  let prevFinishDot = null; // null = ещё не отсчитали первую позицию в текущем подъезде

  // ─── Физика ───────────────────────────────────────────────────────────────

  let last = performance.now();
  let rafId = 0;
  const frame = (now) => {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;

    // Заморозка: ничего не считаем и не перерисовываем — последний кадр остаётся
    // на canvas, оверлей его затемняет. last уже обновлён → нет скачка dt.
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

        // Коллизия сбитого конуса с пропами — та же формула капсулы, что для машины.
        // Простой center-check (без hl) был бы неточен для досок/ножей/сковородки.
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
            c.x = qx + nx * minD; c.y = qy + ny * minD; // вытолкнуть конус
            const vDotN = c.vx * nx + c.vy * ny;
            if (vDotN < 0) { c.vx -= vDotN * nx * 0.8; c.vy -= vDotN * ny * 0.8; c.spin *= -0.4; }
          }
        }

        c.vx *= dAdj; c.vy *= dAdj; c.ang += c.spin * dt; c.spin *= dAdj;
      }
    }

    if (TABLE.shape === 'round') {
      // Итерируем точки капсулы: фронт → центр → корма. Первое нарушение = реакция.
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
          break; // одна реакция за кадр
        }
      }
    } else {
      // AABB капсулы: экстент по X/Y зависит от угла машины, а не от CR.
      // Раньше использовался только CR (ширина), поэтому бампер "уходил в стену"
      // на ~24 gu прежде чем срабатывала коллизия.
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
      // Ищем ближайшую точку капсулы машины к объекту (бампер/центр/корма)
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

    if (S.lapStarted) S.lapTime += dt;

    if (S.nextCp === 0) {
      // ── Финишная линия: пересечение по знаку проекции ──────────────────────
      // Кружок убран — детект точный: время фиксируется в момент пересечения,
      // а не въезда в зону радиуса CP_R.
      const fDot = (car.x - c0.x) * finishCos + (car.y - c0.y) * finishSin;

      // Боковое ограничение убрано: машина могла объехать линию по краю стола и не получить
      // зачёт. Направленного детекта (знак fDot) + пройденных промежуточных чекпоинтов
      // достаточно — они уже гарантируют полный круг.
      if (prevFinishDot !== null && prevFinishDot < 0 && fDot >= 0) {
        S.lastLap = S.lapTime;
        if (S.bestLap === null || S.lapTime < S.bestLap) S.bestLap = S.lapTime;
        S.lapNum++;

        if (TOTAL_LAPS > 0 && S.lapNum >= TOTAL_LAPS) {
          // Последний круг: сначала банкуем комбо, потом фиксируем лапскор.
          bankCombo();
          S.lapScores.push({ n: S.lapNum, pts: Math.round(S.score - S.lapScoreStart), t: S.lapTime });
          S.lapTime = 0; S.nextCp = 1;

          const totalScore = Math.round(S.score);
          const totalTime  = S.lapScores.reduce((s, l) => s + l.t, 0);
          const pps        = pointsPerSecond(totalScore, totalTime);

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
          raceResults.show({ score: totalScore, bestLap: S.bestLap, lapScores: S.lapScores, isNewRecord, pps, totalTime });
          return;
        }

        S.lapScores.push({ n: S.lapNum, pts: Math.round(S.score - S.lapScoreStart), t: S.lapTime });
        if (TOTAL_LAPS === 0 && S.lapScores.length > 3) S.lapScores.shift();
        S.lapScoreStart = S.score;
        flash('LAP ' + S.lapTime.toFixed(2) + ' s', '#9dff8f');
        S.lapTime = 0; S.nextCp = 1;
        // prevFinishDot остаётся null до следующего подъезда (выставляется ниже)
      } else {
        prevFinishDot = fDot;
      }
    } else {
      // ── Промежуточные чекпоинты: кружок CP_R ───────────────────────────────
      const cp = checkpoints[S.nextCp];
      if (Math.hypot(car.x - cp.x, car.y - cp.y) < CP_R) {
        S.nextCp = (S.nextCp + 1) % K;
        if (S.nextCp === 0) prevFinishDot = null; // сбросить перед новым подъездом к финишу
      }
    }

    if (S.flashT > 0) S.flashT -= dt;
    draw(toDisplaySpeed(speed));
    rafId = requestAnimationFrame(frame);
  }

  // ─── Жизненный цикл ─────────────────────────────────────────────────────────
  // stop() делает движок реентерабельным: снимает все слушатели, отменяет цикл,
  // разбирает свои UI-компоненты. Основа под restart / results-screen / ghost.
  const stop = () => {
    cancelAnimationFrame(rafId);
    for (const [t, type, h, o] of listeners) t.removeEventListener(type, h, o);
    listeners.length = 0;
    pause.destroy();
    confirmExit.destroy();
    // raceResults остаётся живым после финиша заезда; убирается только при перезапуске
    if (!raceFinished) raceResults.destroy();
    if (_active === api) _active = null;
  };
  const api = { stop };
  _active = api;

  rafId = requestAnimationFrame(frame);
  return api;
}
