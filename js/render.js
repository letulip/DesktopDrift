import { CARS, TABLE } from './config.js';
import { car, S } from './state.js';

// --- Canvas ---
export const canvas = document.getElementById('c');
export const ctx    = canvas.getContext('2d');
const miniEl = document.getElementById('mini');
const mctx   = miniEl.getContext('2d');

export let W, H, DPR;
export const resize = () => {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize); resize();

// --- Данные трека (устанавливаются через initRender) ---
let center, outer, inner, cones, props, checkpoints, CP_R, TRACK_HALF, CONE_R, startAngle;
let MINI = null;

// Вызывается из game-engine.js перед стартом игры
export const initRender = (T) => {
  center     = T.center;
  outer      = T.outer;
  inner      = T.inner;
  cones      = T.cones;
  props      = T.props;
  checkpoints = T.checkpoints;
  CP_R       = T.CP_R;
  TRACK_HALF = T.TRACK_HALF;
  CONE_R     = T.CONE_R;
  startAngle = T.startAngle;

  // Мини-карта: трансформация мир → окошко
  const _pad = 12;
  let _ex = 0, _ey = 0;
  for (const o of outer) { _ex = Math.max(_ex, Math.abs(o.x)); _ey = Math.max(_ey, Math.abs(o.y)); }
  const _ms = Math.min((miniEl.width - _pad * 2) / (2 * _ex), (miniEl.height - _pad * 2) / (2 * _ey));
  MINI = {
    s:  _ms,
    X: x => miniEl.width  / 2 + x * _ms,
    Y: y => miniEl.height / 2 + y * _ms,
  };
}

// --- Вспомогательные примитивы ---
const polyPath = (pts) => {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
};
const rrect = (x, y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const capPath = (hl, r) => {
  ctx.beginPath();
  ctx.moveTo(-hl, -r);
  ctx.lineTo(hl, -r);
  ctx.arc(hl, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-hl, r);
  ctx.arc(-hl, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

// Машинка вид сверху (нос по +X)
const drawCar = (M) => {
  if (M.path) {
    const s = M.len / M.vw;
    ctx.save();
    ctx.scale(M.flip ? -s : s, s);
    ctx.translate(-M.vw / 2, -M.vh / 2);
    ctx.fillStyle = M.body; ctx.fill(M._p2d);
    if (M.details) for (const d of M.details) { ctx.fillStyle = d.c; ctx.fill(d._p2d); }
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = M.stroke;
    ctx.stroke(M._p2d);
    if (M._lines) for (const lp of M._lines) ctx.stroke(lp);
    ctx.restore();
    return;
  }
  const hl = M.len / 2, hw = M.wid / 2;
  ctx.fillStyle = M.body; rrect(-hl, -hw, M.len, M.wid, hw * 0.7); ctx.fill();
  ctx.strokeStyle = M.accent; ctx.lineWidth = 1.5; rrect(-hl + 2, -hw + 2, M.len - 4, M.wid - 4, hw * 0.6); ctx.stroke();
  ctx.fillStyle = M.glass; rrect(-hl * 0.5, -hw * 0.82, hl * 0.78, hw * 1.64, hw * 0.45); ctx.fill();
  ctx.fillStyle = M.roof; rrect(-hl * 0.34, -hw * 0.66, hl * 0.46, hw * 1.32, hw * 0.4); ctx.fill();
  ctx.fillStyle = M.head;
  rrect(hl * 0.8, -hw * 0.72, hl * 0.09, hw * 0.42, 2); ctx.fill();
  rrect(hl * 0.8,  hw * 0.30, hl * 0.09, hw * 0.42, 2); ctx.fill();
  ctx.fillStyle = M.tail;
  rrect(-hl * 0.9, -hw * 0.72, hl * 0.06, hw * 0.42, 2); ctx.fill();
  rrect(-hl * 0.9,  hw * 0.30, hl * 0.06, hw * 0.42, 2); ctx.fill();
}

// Предзагрузка SVG-изображений для предметов (вызывается из game-engine.js один раз при старте)
export const initItems = (propList) => {
  for (const o of propList) {
    if (!o.imgSrc) continue;
    const img = new Image();
    img.onload  = () => { o.img = img; };
    img.onerror = () => { /* используем процедурный рендер как запасной вариант */ };
    img.src = o.imgSrc;
  }
}

// Кухонный объект на столе
const drawProp = (o) => {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  if (o.hl > 0) {
    ctx.save(); ctx.rotate(o.ang); ctx.translate(6, 8); capPath(o.hl, o.r); ctx.fill(); ctx.restore();
  } else {
    ctx.beginPath(); ctx.ellipse(6, 8, o.r * 1.03, o.r * 0.97, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.rotate(o.ang);

  // SVG-изображение из items/ (если загружено)
  // Портретные SVG (height > width) сохранены вертикально — длинная ось = Y в файле.
  // Капсульный коллайдер ориентирован горизонтально (длинная ось = X после ctx.rotate).
  // Поворот π/2 + swap fw/fh совмещают визуал с физикой для портретных SVG.
  // Ландшафтные SVG (width >= height) рисуются напрямую — длинная ось уже горизонтальна.
  if (o.img) {
    const fw = o.hl > 0 ? (o.hl + o.r) * 2 : o.r * 2;
    const fh = o.r * 2;
    if (o.img.naturalHeight > o.img.naturalWidth) {
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(o.img, -fh / 2, -fw / 2, fh, fw);
    } else {
      ctx.drawImage(o.img, -fw / 2, -fh / 2, fw, fh);
    }
    ctx.restore();
    return;
  }

  if (o.kind === 'plate' || o.kind === 'saucer') {
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, o.r * 0.82, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, o.r * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(-o.r * 0.28, -o.r * 0.28, o.r * 0.16, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === 'bowl') {
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(0, 0, o.r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(-o.r * 0.22, -o.r * 0.22, o.r * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === 'board') {
    ctx.fillStyle = o.c; capPath(o.hl, o.r); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 4; capPath(o.hl, o.r); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-o.hl + 14, i * o.r * 0.32); ctx.lineTo(o.hl - 14, i * o.r * 0.32); ctx.stroke(); }
  } else if (o.kind === 'knife') {
    ctx.fillStyle = o.c;
    ctx.beginPath(); ctx.moveTo(-o.hl * 0.1, -o.r); ctx.lineTo(o.hl, -o.r * 0.2); ctx.lineTo(o.hl, o.r * 0.2); ctx.lineTo(-o.hl * 0.1, o.r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#3a3a3a';
    ctx.save(); ctx.translate(-o.hl * 0.55, 0); capPath(o.hl * 0.45, o.r * 0.95); ctx.fill(); ctx.restore();
  } else if (o.kind === 'spoon') {
    ctx.strokeStyle = o.c; ctx.lineWidth = o.r * 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-o.hl, 0); ctx.lineTo(o.hl * 0.3, 0); ctx.stroke();
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.ellipse(o.hl * 0.55, 0, o.r * 0.9, o.r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(o.hl * 0.55, 0, o.r * 0.6, o.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === 'fork') {
    ctx.strokeStyle = o.c; ctx.lineWidth = o.r * 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-o.hl, 0); ctx.lineTo(o.hl * 0.4, 0); ctx.stroke();
    ctx.lineWidth = o.r * 0.22;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(o.hl * 0.4, i * o.r * 0.6); ctx.lineTo(o.hl, i * o.r * 0.6); ctx.stroke(); }
  }
  ctx.restore();
}

// --- Основной рендер ---
export const draw = (speed) => {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const camOffY = H * 0.10;
  // На узких экранах (мобиль) отодвигаем камеру — показываем больше трассы.
  // Менять только это число: 0.65 = видно в ~1.5× больше, 1.0 = без масштабирования.
  const ZOOM = W < 640 ? 0.65 : 1.0;
  ctx.translate(W / 2, H / 2 + camOffY);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-car.x, -car.y);

  // пол — покрываем весь видимый мировой прямоугольник с небольшим запасом
  ctx.fillStyle = '#0f0b08';
  ctx.fillRect(car.x - W / (2 * ZOOM), car.y - (H / 2 + camOffY) / ZOOM, W / ZOOM, H / ZOOM);

  // стол
  ctx.fillStyle = '#2e241a';
  if (TABLE.shape === 'round') {
    ctx.beginPath(); ctx.ellipse(0, 0, TABLE.w / 2, TABLE.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a4a36'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.ellipse(0, 0, TABLE.w / 2, TABLE.h / 2, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillRect(-TABLE.w / 2, -TABLE.h / 2, TABLE.w, TABLE.h);
    ctx.strokeStyle = '#5a4a36'; ctx.lineWidth = 12;
    ctx.strokeRect(-TABLE.w / 2, -TABLE.h / 2, TABLE.w, TABLE.h);
  }

  // полотно трассы
  ctx.fillStyle = '#43372a';
  ctx.beginPath(); polyPath(outer); polyPath(inner.slice().reverse()); ctx.fill('evenodd');

  // следы
  for (const sk of S.skids) { ctx.fillStyle = `rgba(15,9,6,${sk.a})`; ctx.fillRect(sk.x - 3, sk.y - 3, 6, 6); }

  // старт/финиш
  const c0 = center[0];
  const n0 = { x: -Math.sin(startAngle), y: Math.cos(startAngle) };
  ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 8; ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(c0.x + n0.x * TRACK_HALF, c0.y + n0.y * TRACK_HALF);
  ctx.lineTo(c0.x - n0.x * TRACK_HALF, c0.y - n0.y * TRACK_HALF);
  ctx.stroke(); ctx.setLineDash([]);

  // следующий чекпоинт
  const cp = checkpoints[S.nextCp];
  ctx.strokeStyle = 'rgba(125,212,255,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cp.x, cp.y, CP_R, 0, Math.PI * 2); ctx.stroke();

  // объекты на столе
  for (const o of props) drawProp(o);

  // конусы
  for (const c of cones) {
    if (c.knocked) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
      ctx.fillStyle = 'rgba(255,122,26,.45)';
      ctx.beginPath(); ctx.ellipse(0, 0, CONE_R * 1.7, CONE_R * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath(); ctx.arc(c.x, c.y, CONE_R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(c.x, c.y, CONE_R * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }

  // машинка
  ctx.save();
  ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  const M = CARS[S.carModel];
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-M.len / 2 + 2, -M.wid / 2 + 3, M.len, M.wid, M.wid * 0.7); ctx.fill();

  const wlen = M.len * 0.16, wwid = Math.max(4, M.wid * 0.20);
  const reveal = Math.abs(S.steerSmooth), wheelAng = S.steerSmooth * 0.5;
  const wAlpha = Math.min(1, reveal * 1.6);
  if (wAlpha > 0.02) {
    ctx.fillStyle = `rgba(13,14,16,${wAlpha})`;
    const track = M.wid * 0.42;
    for (const sy of [-1, 1]) {
      ctx.save();
      ctx.translate(M.len * 0.30, sy * track); ctx.rotate(wheelAng);
      rrect(-wlen / 2, -wwid / 2, wlen, wwid, 2); ctx.fill();
      ctx.restore();
    }
  }
  // неоновое свечение — рисуем до корпуса, чтобы оно было под машиной.
  // Три секции: нос→передний мост | между мостами | задний мост→корма
  if (M.neonColor) {
    ctx.save();
    ctx.shadowColor = M.neonColor;
    ctx.shadowBlur  = 22;
    ctx.globalAlpha = 0.65;
    ctx.fillStyle   = M.neonColor;

    const hl      = M.len / 2;
    const carWid  = M.wid ?? (M.vh * M.len / M.vw); // path-based cars don't have M.wid
    const gH      = carWid * 0.55;
    const ghy     = -gH / 2;
    const axle    = M.len * 0.30;   // мост от центра
    const halfWhl = M.len * 0.08;   // полудлина колеса

    ctx.beginPath();
    ctx.rect( axle + halfWhl,   ghy, hl - axle - halfWhl,  gH);  // нос → передний мост
    ctx.rect(-(axle - halfWhl), ghy, 2 * (axle - halfWhl), gH);  // между мостами (основная)
    ctx.rect(-hl,               ghy, hl - axle - halfWhl,  gH);  // задний мост → корма
    ctx.fill();

    ctx.restore();
  }
  drawCar(M);
  ctx.restore();
  ctx.restore();

  // HUD
  document.getElementById('lap').textContent = S.lapTime.toFixed(2);
  document.getElementById('lapNum').textContent = S.lapNum + 1;
  document.getElementById('last').textContent = S.lastLap === null ? '—' : S.lastLap.toFixed(2) + ' s';
  document.getElementById('best').textContent = S.bestLap === null ? '—' : S.bestLap.toFixed(2) + ' s';
  document.getElementById('score').textContent = Math.round(S.score);
  document.getElementById('lapScores').innerHTML =
    S.lapScores.slice().reverse().map(l => 'lap ' + l.n + ': +' + l.pts).join('<br>');
  document.getElementById('spd').textContent = Math.round(speed);

  const comboEl = document.getElementById('combo');
  if (S.comboPoints > 0) { comboEl.style.opacity = 1; comboEl.textContent = '+' + Math.round(S.comboPoints) + '   ×' + S.mult.toFixed(1); }
  else comboEl.style.opacity = 0;

  const flashEl = document.getElementById('flash');
  flashEl.style.opacity = Math.max(0, S.flashT / 0.9);
  flashEl.style.color = S.flashColor;
  flashEl.textContent = S.flashMsg;

  const countEl = document.getElementById('count');
  if (S.startCd > 0) { countEl.style.opacity = 1; countEl.style.color = '#fff'; countEl.textContent = Math.ceil(S.startCd); }
  else if (S.goT > 0) { countEl.style.opacity = Math.min(1, S.goT / 0.4); countEl.style.color = '#9dff8f'; countEl.textContent = 'GO!'; }
  else countEl.style.opacity = 0;

  drawMini();
}

export const drawMini = () => {
  mctx.clearRect(0, 0, miniEl.width, miniEl.height);
  mctx.lineJoin = mctx.lineCap = 'round';
  mctx.strokeStyle = 'rgba(255,255,255,.22)';
  mctx.lineWidth = Math.max(3, TRACK_HALF * 2 * MINI.s);
  mctx.beginPath();
  for (let i = 0; i <= center.length; i++) {
    const c = center[i % center.length];
    const fn = i ? 'lineTo' : 'moveTo';
    mctx[fn](MINI.X(c.x), MINI.Y(c.y));
  }
  mctx.stroke();
  mctx.fillStyle = 'rgba(255,255,255,.45)';
  for (const o of props) { mctx.beginPath(); mctx.arc(MINI.X(o.x), MINI.Y(o.y), Math.max(1.5, o.r * MINI.s), 0, Math.PI * 2); mctx.fill(); }
  const cx = MINI.X(car.x), cy = MINI.Y(car.y);
  mctx.save();
  mctx.translate(cx, cy); mctx.rotate(car.angle);
  mctx.fillStyle = '#ff5a3c';
  mctx.beginPath(); mctx.moveTo(6, 0); mctx.lineTo(-4, -4); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill();
  mctx.restore();
}
