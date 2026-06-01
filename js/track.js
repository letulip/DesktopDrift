import { TABLE } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Трасса на основе tracks/config1.svg
// Вершины из SVG path (M/L/H/V/Z), viewBox 0 0 245 121
// ─────────────────────────────────────────────────────────────────────────────
const SVG_POLY = [
  [82.52, 12],    [27.52, 13.5],  [8.02,  33],    [0.52,  69],
  [12.52, 100.5], [30.52, 115],   [82.52, 115],   [93.52, 104],
  [130.52, 33],   [145.02, 23],   [202.02, 23],   [217.52, 38.5],
  [217.52, 62.5], [208.52, 87.5], [184.52, 93],   [150.52, 69],
  [130.52, 81.5], [125.02, 100.5],[140.02, 120],  [184.52, 120],
  [217.52, 109.5],[237.52, 87.5], [243.52, 51],   [231.52, 16.5],
  [202.02, 0.5],  [102.52, 0.5],
];

const SVG_CX = 245 / 2, SVG_CY = 121 / 2;
const SCALE  = 13; // игровых единиц на SVG-единицу

function toGame([x, y]) {
  return { x: (x - SVG_CX) * SCALE, y: -(y - SVG_CY) * SCALE };
}

// Алгоритм Chaikin — угловое отсечение (1 проход)
function chaikin(pts) {
  const n = pts.length, r = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    r.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 });
    r.push({ x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
  }
  return r;
}

// 4 прохода: 26 → 52 → 104 → 208 → 416 точек
let smoothPoly = SVG_POLY.map(toGame);
for (let i = 0; i < 4; i++) smoothPoly = chaikin(smoothPoly);

// ─────────────────────────────────────────────────────────────────────────────
// Центральная линия, внешний и внутренний края
// ─────────────────────────────────────────────────────────────────────────────
export const TRACK_HALF = 100;
export const center = [], outer = [], inner = [];
const N = smoothPoly.length;

for (let i = 0; i < N; i++) {
  const c    = smoothPoly[i];
  const prev = smoothPoly[(i - 1 + N) % N];
  const next = smoothPoly[(i + 1) % N];
  const tx   = next.x - prev.x, ty = next.y - prev.y;
  const len  = Math.hypot(tx, ty) || 1;
  const nx   = -ty / len, ny = tx / len; // перпендикуляр (в сторону левого нормаля)
  center.push(c);
  outer.push({ x: c.x + nx * TRACK_HALF, y: c.y + ny * TRACK_HALF });
  inner.push({ x: c.x - nx * TRACK_HALF, y: c.y - ny * TRACK_HALF });
}

// ─────────────────────────────────────────────────────────────────────────────
// Конусы вдоль краёв
// ─────────────────────────────────────────────────────────────────────────────
export const CONE_R = 9;
export const cones  = [];
for (let i = 0; i < N; i += 5) {
  cones.push({ x: outer[i].x, y: outer[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
  cones.push({ x: inner[i].x, y: inner[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// Предметы из items/ — расставляем в апексах углов
// ─────────────────────────────────────────────────────────────────────────────

// Расстояние до ближайшей точки центральной линии
function distToCenter(px, py) {
  let best = Infinity;
  for (const c of center) {
    const d = (px - c.x) ** 2 + (py - c.y) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Вещи: файл, радиус коллизии, полудлина капсулы, тип для процедурного фоллбэка
const ITEM_DEFS = [
  { imgSrc: 'items/Cup.svg',                                       hl: 0,   r: 75,  kind: 'bowl'  },
  { imgSrc: 'items/kitchen-board-kitchen-svgrepo-com.svg',          hl: 100, r: 55,  kind: 'board' },
  { imgSrc: 'items/kitchen-knife-svgrepo-com.svg',                  hl: 130, r: 20,  kind: 'knife' },
  { imgSrc: 'items/grater-svgrepo-com.svg',                         hl: 60,  r: 38,  kind: 'board' },
  { imgSrc: 'items/stapler-svgrepo-com.svg',                        hl: 70,  r: 32,  kind: 'board' },
  { imgSrc: 'items/telephone-svgrepo-com.svg',                      hl: 75,  r: 42,  kind: 'board' },
  { imgSrc: 'items/mixer-furniture-and-household-svgrepo-com.svg',  hl: 0,   r: 72,  kind: 'bowl'  },
  { imgSrc: 'items/notebook-svgrepo-com.svg',                       hl: 85,  r: 55,  kind: 'board' },
  { imgSrc: 'items/spatula-svgrepo-com.svg',                        hl: 95,  r: 18,  kind: 'knife' },
];

export const props = [];
function addProp(o) {
  o.hl = o.hl || 0;
  o._cos = Math.cos(o.ang);
  o._sin = Math.sin(o.ang);
  props.push(o);
}

// Ищем острые углы в НЕСГЛАЖЕННОМ полигоне и ставим вещи по бисектрисе угла
const origPoly = SVG_POLY.map(toGame);
let itemIdx = 0;

// Собираем все углы с их остротой и сортируем по убыванию (самые острые — первые)
const corners = [];
for (let i = 0; i < origPoly.length; i++) {
  const v    = origPoly[i];
  const prev = origPoly[(i - 1 + origPoly.length) % origPoly.length];
  const next = origPoly[(i + 1) % origPoly.length];

  const d1x = v.x - prev.x, d1y = v.y - prev.y;
  const d2x = next.x - v.x, d2y = next.y - v.y;
  const l1  = Math.hypot(d1x, d1y) || 1;
  const l2  = Math.hypot(d2x, d2y) || 1;

  const cross = (d1x / l1) * (d2y / l2) - (d1y / l1) * (d2x / l2);
  const dot   = (d1x / l1) * (d2x / l2) + (d1y / l1) * (d2y / l2);
  const angle = Math.atan2(Math.abs(cross), Math.max(0, dot)); // величина угла поворота

  if (angle < 0.35) continue; // пропускаем слабые повороты

  // Бисектриса угла: нормализованная сумма входящего и выходящего направлений
  const bx  = d1x / l1 + d2x / l2, by = d1y / l1 + d2y / l2;
  const bl  = Math.hypot(bx, by) || 1;
  const nbx = bx / bl, nby = by / bl; // единичный вектор бисектрисы

  corners.push({ v, nbx, nby, angle, cross, edgeAng: Math.atan2(d2y / l2, d2x / l2) });
}
corners.sort((a, b) => b.angle - a.angle); // острейшие углы первыми

for (const { v, nbx, nby, cross, edgeAng } of corners) {
  if (itemIdx >= ITEM_DEFS.length) break;

  const def = ITEM_DEFS[itemIdx];
  // Смещение: чуть глубже TRACK_HALF внутрь угла (бисектриса указывает «внутрь» поворота)
  const offset = TRACK_HALF * 1.05 + def.r * 0.8;
  const px = v.x + nbx * offset;
  const py = v.y + nby * offset;

  // Не ставим вещь прямо посередине трассы
  const dtc = distToCenter(px, py);
  if (dtc < TRACK_HALF * 0.55) continue; // слишком близко к осевой

  // Ориентируем вещь вдоль выходящего ребра угла (перпендикулярно бисектрисе)
  const ang = edgeAng + (cross < 0 ? Math.PI / 2 : -Math.PI / 2);

  addProp({
    x: px, y: py, ang,
    hl:      def.hl,
    r:       def.r,
    kind:    def.kind,
    imgSrc:  def.imgSrc,
    c:       '#8a9aaa',
  });
  itemIdx++;
}

// ─────────────────────────────────────────────────────────────────────────────
// Чекпоинты: K точек равномерно по сглаженной центральной линии
// ─────────────────────────────────────────────────────────────────────────────
export const K = 8, CP_R = TRACK_HALF + 70;
export const checkpoints = [];
for (let i = 0; i < K; i++) {
  checkpoints.push(center[Math.floor((i / K) * N)]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Стартовая позиция и направление
// ─────────────────────────────────────────────────────────────────────────────
const _c0 = center[0], _c1 = center[1];
export const startPos   = { x: _c0.x, y: _c0.y };
export const startAngle = Math.atan2(_c1.y - _c0.y, _c1.x - _c0.x);
