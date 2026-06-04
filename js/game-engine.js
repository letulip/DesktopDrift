import { CARS, TABLE, PHYS_HZ, GRIP_WOBBLE, STEER_WOBBLE, NM_BAND } from './config.js';
import { car, S, keys, pointers, initCar } from './state.js';
import { canvas, W, draw, initItems, initRender } from './render.js';
import { createPause } from './pause.js';
import { createConfirmExit } from './confirm-exit.js';
import { garage, settings } from './store.js';

// Запускает игровой цикл с переданным треком.
// T   — namespace-импорт трекового модуля (track.js или track-oval.js)
// opts.initItems — true, если у трека есть SVG-пропсы для предзагрузки
export const startGame = (T, opts = {}) => {
  const { center, cones, props, checkpoints, K, CP_R, TRACK_HALF, CONE_R } = T;

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

  const distToTrack = () => {
    let best = Infinity;
    for (const c of center) { const dx = car.x - c.x, dy = car.y - c.y; const d = dx * dx + dy * dy; if (d < best) best = d; }
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
  addEventListener('keydown', e => { keys[e.key] = true; });
  addEventListener('keyup',   e => { keys[e.key] = false; });
  // passive: false + preventDefault() — не даёт iOS запустить выделение текста
  // при долгом нажатии во время игры
  canvas.addEventListener('pointerdown',   e => { e.preventDefault(); pointers.set(e.pointerId, e.clientX); updatePointerSteer(); }, { passive: false });
  canvas.addEventListener('pointermove',   e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, e.clientX); updatePointerSteer(); } }, { passive: false });
  canvas.addEventListener('pointerup',     e => { pointers.delete(e.pointerId); updatePointerSteer(); });
  canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); updatePointerSteer(); });
  // Блокируем контекстное меню и выделение текста по всему документу
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('selectstart', e => e.preventDefault());

  // ─── UI ───────────────────────────────────────────────────────────────────

  // Кнопка «Меню» — сначала спрашиваем подтверждение, чтобы не выбросить игрока
  // в меню случайным нажатием. Игра встаёт на паузу на время диалога.
  const confirmExit = createConfirmExit();
  document.getElementById('menuBtn').addEventListener('click', e => {
    e.preventDefault();
    const wasAlreadyPaused = pause.isPaused();
    pause.pause();
    confirmExit.show({
      onExit:   () => { location.href = 'index.html'; },
      onCancel: () => { if (!wasAlreadyPaused) pause.resume(); },
    });
  });

  // Машинка и цвет выбраны на экране гаража (select.html), читаем из store
  const g = garage();
  S.carModel = Math.max(0, Math.min(g.carIndex ?? 0, CARS.length - 1));
  if (g.bodyColor) CARS[S.carModel].body = g.bodyColor;
  CARS[S.carModel].neonColor = g.neonColor || null;

  // Единицы скорости: читаем один раз при старте — в игре не меняются
  const isMph = settings().units === 'mph';
  const speedFactor = isMph ? 0.621371 : 1;
  const spdUnitEl = document.getElementById('spdUnit');
  if (spdUnitEl) spdUnitEl.textContent = isMph ? 'mph' : 'km/h';

  // ─── Пауза (изолированный компонент) ────────────────────────────────────────
  // Движок только читает pause.isPaused(); при постановке на паузу отпускаем руль,
  // чтобы машина не дёрнулась на возобновлении.
  const pause = createPause({
    onChange(p) { if (p) { pointers.clear(); S.steerInput = 0; } },
  });

  // ─── Физика ───────────────────────────────────────────────────────────────

  let last = performance.now();
  const frame = (now) => {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;

    // Заморозка: ничего не считаем и не перерисовываем — последний кадр остаётся
    // на canvas, оверлей его затемняет. last уже обновлён → нет скачка dt.
    if (pause.isPaused()) { requestAnimationFrame(frame); return; }

    if (S.startCd > 0) {
      S.startCd -= dt;
      if (S.startCd <= 0) S.goT = 1.0;
      draw(0);
      requestAnimationFrame(frame);
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
    const drifting = Math.abs(vS) > 60 && speed > 90;

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
        c.vx *= dAdj; c.vy *= dAdj; c.ang += c.spin * dt; c.spin *= dAdj;
      }
    }

    if (TABLE.shape === 'round') {
      const rx = TABLE.w / 2 - CR, ry = TABLE.h / 2 - CR;
      const nx = car.x / rx, ny = car.y / ry;
      const r = Math.hypot(nx, ny);
      if (r > 1) {
        car.x = nx / r * rx; car.y = ny / r * ry;
        const ux = nx / r / rx, uy = ny / r / ry, ul = Math.hypot(ux, uy);
        const px = ux / ul, py = uy / ul;
        const vn = car.vx * px + car.vy * py;
        if (vn > 0) { car.vx -= vn * px * 1.3; car.vy -= vn * py * 1.3; if (vn > 120) burnCombo('WALL!'); }
      }
    } else {
      const bx = TABLE.w / 2 - CR, by = TABLE.h / 2 - CR;
      let wallHit = 0;
      if (car.x < -bx) { car.x = -bx; if (car.vx < 0) { wallHit = Math.max(wallHit, -car.vx); car.vx *= -0.3; } car.vy *= 0.85; }
      if (car.x >  bx) { car.x =  bx; if (car.vx > 0) { wallHit = Math.max(wallHit,  car.vx); car.vx *= -0.3; } car.vy *= 0.85; }
      if (car.y < -by) { car.y = -by; if (car.vy < 0) { wallHit = Math.max(wallHit, -car.vy); car.vy *= -0.3; } car.vx *= 0.85; }
      if (car.y >  by) { car.y =  by; if (car.vy > 0) { wallHit = Math.max(wallHit,  car.vy); car.vy *= -0.3; } car.vx *= 0.85; }
      if (wallHit > 120) burnCombo('WALL!');
    }

    for (const o of props) {
      let qx = o.x, qy = o.y;
      if (o.hl > 0) {
        const lx = car.x - o.x, ly = car.y - o.y;
        let t = lx * o._cos + ly * o._sin;
        if (t > o.hl) t = o.hl; else if (t < -o.hl) t = -o.hl;
        qx = o.x + o._cos * t; qy = o.y + o._sin * t;
      }
      const dx = car.x - qx, dy = car.y - qy, rr = o.r + CR;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d;
        car.x = qx + nx * rr; car.y = qy + ny * rr;
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
      const quality = Math.min(1.4, (slip / 160) * (speed / 260));
      S.multBuild += dt * 0.14 * quality;
      const sgn = vS > 50 ? 1 : (vS < -50 ? -1 : 0);
      if (sgn !== 0) {
        if (S.lastSlipSign !== 0 && sgn !== S.lastSlipSign) {
          S.transitions++; S.multBuild += 0.3; flash('TRANSITION!', '#7fd4ff');
        }
        S.lastSlipSign = sgn;
      }
      if (S.nearMissCd <= 0 && nearMissCheck(CR)) {
        S.nearMisses++; S.multBuild += 0.28; S.nearMissCd = 0.6; flash('NEAR MISS!', '#ffd36a');
      }
      S.mult = Math.min(8, 1 + S.multBuild);
      S.comboPoints += slip * speed * dt * 0.0015 * S.mult;
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
    const cp = checkpoints[S.nextCp];
    if (Math.hypot(car.x - cp.x, car.y - cp.y) < CP_R) {
      if (S.nextCp === 0) {
        S.lastLap = S.lapTime;
        if (S.bestLap === null || S.lapTime < S.bestLap) S.bestLap = S.lapTime;
        S.lapNum++;
        S.lapScores.push({ n: S.lapNum, pts: Math.round(S.score - S.lapScoreStart) });
        if (S.lapScores.length > 3) S.lapScores.shift();
        S.lapScoreStart = S.score;
        flash('LAP ' + S.lapTime.toFixed(2) + ' s', '#9dff8f');
        S.lapTime = 0; S.nextCp = 1;
      } else S.nextCp = (S.nextCp + 1) % K;
    }

    if (S.flashT > 0) S.flashT -= dt;
    draw(speed * speedFactor);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
