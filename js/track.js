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
// Предметы из items/ — позиции взяты из tracks/config1setup.svg
// Координаты конвертированы скриптом: setup(cx,cy) → game(x,y)
// ─────────────────────────────────────────────────────────────────────────────
export const props = [];
function addProp(o) {
  o.hl = o.hl || 0;
  o._cos = Math.cos(o.ang);
  o._sin = Math.sin(o.ang);
  props.push(o);
}

// x,y  — позиция в игровых координатах (из setup SVG)
// ang  — угол поворота (rad)
// hl   — полудлина капсульного коллайдера (0 = круглый)
// r    — радиус коллайдера
// kind — тип процедурного рендера (запасной, пока SVG не загрузилось)
// imgSrc — путь к SVG-файлу предмета
const PLACED_ITEMS = [
  { x: -1211, y: -255, ang:  0.4, hl: 110, r: 25,  kind: 'knife', imgSrc: 'items/kitchen-knife-svgrepo-com.svg'              },
  { x:  -831, y:    5, ang:  0.0, hl:   0, r: 120, kind: 'bowl',  imgSrc: 'items/mixer-furniture-and-household-svgrepo-com.svg'},
  { x:  -491, y: -430, ang: -0.3, hl:  70, r: 32,  kind: 'board', imgSrc: 'items/stapler-svgrepo-com.svg'                    },
  { x:  -285, y:  141, ang:  0.0, hl:   0, r: 130, kind: 'bowl',  imgSrc: 'items/Cup.svg'                                    },
  { x:  -220, y:  621, ang:  0.5, hl:  55, r: 28,  kind: 'knife', imgSrc: 'items/spatula-svgrepo-com.svg'                    },
  { x:  -200, y: -619, ang:  0.2, hl:  65, r: 40,  kind: 'board', imgSrc: 'items/grater-svgrepo-com.svg'                     },
  { x:    39, y: -853, ang: -0.1, hl:  90, r: 55,  kind: 'board', imgSrc: 'items/notebook-svgrepo-com.svg'                   },
  { x:   420, y: -500, ang:  0.6, hl:  75, r: 42,  kind: 'board', imgSrc: 'items/telephone-svgrepo-com.svg'                  },
  { x:   884, y: -253, ang: -0.2, hl:   0, r: 42,  kind: 'bowl',  imgSrc: 'items/kitchen-board-kitchen-svgrepo-com.svg'      },
];

for (const o of PLACED_ITEMS) addProp({ ...o, c: '#8a9aaa' });

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
