const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');
let W, H, DPR;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize); resize();

// --- Параметры машинки ("ручки" для настройки) ---
const CFG = {
  thrust: 550,          // ускорение вперёд (px/с^2)
  maxSpeed: 400,        // макс. скорость (px/с)
  steer: 2.5,           // острота руля (рад/с) — меньше = плавнее/тяжелее
  steerSmooth: 6,       // инерция руля: меньше = «тяжелее», руль набирается медленнее
  lowSpeedTurn: 0.25,   // минимальная поворотливость на низкой скорости (меньше = больше «веса»)
  selfAlign: 1.0,       // самовыравнивание: машина стремится встать по движению — упругий, контролируемый занос (больше = быстрее выходит из заноса)
  grip: 0.97,           // боковое сцепление: ближе к 1 = больше скольжения (норм. к PHYS_HZ — см. frame)
  rollFriction: 0.995,  // продольное трение качения за кадр
  driftDrag: 0.004,     // потеря скорости в заносе
  driftSteerBoost: 1.2  // острее руль в заносе (помогает перекладке)
};
// Модели машинок (вид сверху). Векторные (примитивы) или по SVG-контуру (path).
const CARS = [
  { name: 'Bismark', len: 82, body: '#474d56', stroke: '#222222', vw: 426, vh: 157, flip: true,
    drive: { thrust: 580, maxSpeed: 470, steer: 2.2, steerSmooth: 4.5, lowSpeedTurn: 0.20, selfAlign: 0.82, grip: 0.986, driftSteerBoost: 1.2 },
    details: [
      { c: '#222222', d: 'M354.5 16.0001L369.5 31.0001L368 124.5L354.5 141L309.5 128L314 121.5V35.0001L309.5 28.0001L354.5 16.0001ZM284 10.0001L309.5 11.0001L284 20.5001V10.0001ZM235.5 10.0001H281V22.0001H235.5L235.5 10.0001ZM232.5 134.5H280.5V147.5H232.5L232.5 134.5ZM16.5 49.0001V107H8L6 105.5L3.5 77.5001L6 50.5001L8 49.0001H16.5ZM284.5 148L309 147.5L284.5 137.5V148ZM131 14.0001L181 27.5001L172.5 56.0001V102L181 128.5L131 143L122.5 132.5L114.5 109.5L112 80.0001L114.5 49.5001L122.5 27.5001L131 14.0001ZM221 10.0001L228 22.5001H188.5L155 12.0001V10.0001H221ZM218.5 147.5L227.5 134.5H188L154.5 145.42V147.5H218.5Z' },
      { c: '#fffbcf', d: 'M16.5 110.5L22.5 139L25 144.5H21L16 139L10.5 110.5H16.5ZM16.7069 44.5001L22.5 16.0001L25 11.0001H21L16 16.5001L10 44.5001H16.7069Z' },
      { c: '#dd0000', d: 'M418.5 124.5H422.5L421.5 141L417 146.5L413.5 144.5L417.5 140V134L418.5 124.5ZM420.5 33.0001H423L422.5 19.0001L419.5 14.5001L416 16.0001L418.5 19.0001L420 25.5001L420.5 33.0001Z' }
    ],
    path: 'M422.82 124L425 77.5001L423.496 33.5001L423 19.0001L419.5 14.0001L402 9.50012L351 4.00012L312.5 2.50012L225 0.500122L129.5 2.50012L100.5 0.500122H72.5L46.5 2.50012H39.5L13 9.00012L9.5 12.0001L4.5 27.5001L0.5 52.5001V104.5L4.5 131L7 143L13 149L39.5 153H46.5L72.5 156.5L100.5 155H129.5L225 156.5H312.5H351L402 151.5L417 147L422 141.5L422.82 124ZM419.867 33.5001L419.5 25.5001L417.926 19.0001L415.5 16.0001L419.5 14.0001M417 147L413 144.5L417 140V134M121 21.0001L17 45.0001H9.5L15.5 16.0001L21 10.5001H25.5L23 16.0001L17 45.0001M23 16.0001L126.5 13.5001M118.5 135L17 110H10L15.5 139L21 145H25.5L23 139L17 110M23 139L126.5 143M357.5 17.5001L419.5 25.5001M417 134L357.5 141.5M417 134L417.926 124M417.926 124L422 80.0001L419.867 33.5001M417.926 124H422.82M419.867 33.5001H423.496M131 13.5001L181.5 27.5001L173 55.5001V102L181.5 128.5L131 143L122 132L114 109L111.5 80.0001L114 49.5001L122 27.5001L131 13.5001ZM8 48.5001H17V77.5001V107.5H8L5.5 105.5L3 77.5001L5.5 50.5001L8 48.5001ZM154.5 9.50012H221L228.5 22.5001H188.5L154.5 12.0001V9.50012ZM235 9.50012H281V22.5001H235V9.50012ZM284 9.50012L310.5 11.0001L284 21.0001V9.50012ZM218.5 148H154.5V145L188.5 134H228.5L218.5 148ZM232.5 148V134H281V148H232.5ZM284 148V137L310.5 148H284ZM309 128L313.5 121.5V35.0001L309 28.0001L354.5 16.0001L369.5 30.5001L368 124L354.5 141.5L309 128Z' },
  { name: 'Panda', len: 75, body: '#eef0f2', stroke: '#111111', vw: 402, vh: 157, flip: true,
    drive: { thrust: 620, maxSpeed: 410, steer: 3.0, steerSmooth: 8, lowSpeedTurn: 0.30, selfAlign: 0.82, grip: 0.987, driftSteerBoost: 1.3 },
    details: [
      { c: '#222222', d: 'M250.98 131.944H288.72L324 148L257.5 148.5L250.98 131.944ZM249.5 24.537H289.46L323.5 8.98148L255.42 7.5L249.5 24.537ZM248.5 7.5L241.841 24.5104H193.012L160 12V7.5H248.5ZM247.5 149.5L240.5 130.5L201.5 131L156.5 145.5V149.5H247.5ZM132.181 10.5L186.5 28L180.5 61.5V97L186.5 128.302L132.5 145L124 122L117.5 76.7637L124 28L132.181 10.5ZM334 16.5L345.5 46.2246V113.249L334 141.5L296 125L300.5 77L296 30L334 16.5ZM8.5 43.5H12.5V110.5H8.5Z' },
      { c: '#dd0000', d: 'M390.75 101.5H397.5L395.25 140.823L392.25 147.5H382.5L387.75 140.823L390.75 113.371V101.5ZM390.75 53.5H397.5L395.25 15.8871L392.25 9.5H382.5L387.75 15.8871L390.75 42.1452V53.5Z' },
      { c: '#fffbcf', d: 'M15.75 13.5H25.5L22.5 43.5H7.5V25.939L11.25 17.1585L15.75 13.5ZM15.75 140.5H25.5L22.5 110.5H7.5V128.061L11.25 136.841L15.75 140.5Z' }
    ],
    lines: [
      'M350.935 43.7963H390.109M390.109 54.1667V43.7963L387.891 15.6481L381.978 8.98148H392.326L395.283 14.9074L397.5 54.1667H390.109ZM390.109 113.426H350.935M390.109 101.574V113.426L387.891 140.093L381.978 147.5H392.326L395.283 140.833L397.5 101.574H390.109ZM390.109 101.574V54.1667M159.5 7.5H248.935L241.543 24.537H192.022L159.5 11.9444V7.5ZM255.587 7.5L248.935 24.537H289.587L325.065 8.98148L255.587 7.5ZM295.5 29.7222L333.935 16.3889L345.022 45.2778V113.426L333.935 141.574L295.5 125.278L299.935 77.1296L295.5 29.7222Z',
      'M257.118 148.5L250.5 131.5H288.735L325.5 148.5H257.118Z'
    ],
    path: 'M26.3471 13.0687H16.0083L11.5773 16.7654L7.8849 25.6374V43.3815M26.3471 13.0687L23.3932 43.3815M26.3471 13.0687L127.52 10.8507M23.3932 43.3815H13.0543M23.3932 43.3815H109.058M7.8849 43.3815V110.661M7.8849 43.3815H13.0543M26.3471 140.235H16.0083L11.5773 137.277L7.8849 129.145V110.661M26.3471 140.235L23.3932 110.661M26.3471 140.235L127.52 145.41M7.8849 110.661H13.0543M23.3932 110.661H13.0543M23.3932 110.661H109.058M13.0543 110.661V43.3815M4.93094 145.41L0.5 131.363V20.4621L4.93094 7.89336L52.1943 0.5H332.082L386.73 3.45735L397.808 7.89336L401.5 20.4621V135.059L397.808 148.367L386.73 152.803L332.082 156.5H52.1943L4.93094 145.41ZM131.951 10.8507L123.828 27.8555L117.181 76.6517L123.828 121.751L131.951 145.41L186.599 128.405L180.692 96.6137V61.8649L186.599 27.8555L131.951 10.8507ZM156.321 149.846V145.41L201.369 130.623H240.509L247.894 149.846H156.321Z' },

];
for (const m of CARS) {
  if (m.path) {
    m._p2d = new Path2D(m.path);
    if (m.details) for (const d of m.details) d._p2d = new Path2D(d.d);
    if (m.lines) m._lines = m.lines.map(d => new Path2D(d));
    m.wid = m.len * m.vh / m.vw;
  }
  m._drive = Object.assign({}, CFG, m.drive || {});   // настройки управления: база CFG + правки конкретной машинки
}
let carModel = 0;

// --- Ограниченная поверхность (стол со стенками). shape: 'rect' или 'round' ---
const TABLE = { w: 3400, h: 2900, shape: 'rect' };

// --- Геометрия трассы: извилистая петля без длинной прямой, с карманами под посуду ---
const TRACK_HALF = 100;
function centerAt(a) {
  const R = 1100 + 215 * Math.sin(3 * a) + 170 * Math.sin(4 * a);   // 4 внутренних кармана (повороты огибают посуду)
  return { x: R * Math.cos(a) * 1.15, y: R * Math.sin(a) * 0.94 };
}
function tangentAt(a) {
  const e = 0.001;
  const p1 = centerAt(a - e), p2 = centerAt(a + e);
  let tx = p2.x - p1.x, ty = p2.y - p1.y;
  const len = Math.hypot(tx, ty) || 1;
  return { x: tx / len, y: ty / len };
}

const SAMPLES = 300;
const center = [], outer = [], inner = [];
for (let i = 0; i < SAMPLES; i++) {
  const a = (i / SAMPLES) * Math.PI * 2;
  const c = centerAt(a), t = tangentAt(a);
  const nx = -t.y, ny = t.x;
  center.push(c);
  outer.push({ x: c.x + nx * TRACK_HALF, y: c.y + ny * TRACK_HALF });
  inner.push({ x: c.x - nx * TRACK_HALF, y: c.y - ny * TRACK_HALF });
}

// --- Мини-карта: трансформация мир → окошко ---
const MINI = (() => {
  let ex = 0, ey = 0;
  for (const o of outer) { ex = Math.max(ex, Math.abs(o.x)); ey = Math.max(ey, Math.abs(o.y)); }
  const pad = 12;
  const s = Math.min((mini.width - pad * 2) / (2 * ex), (mini.height - pad * 2) / (2 * ey));
  return { s, cx: mini.width / 2, cy: mini.height / 2,
           X: x => mini.width / 2 + x * s, Y: y => mini.height / 2 + y * s };
})();

// Конусы вдоль краёв — лёгкие, сбиваемые
const CONE_R = 9;
const cones = [];
for (let i = 0; i < SAMPLES; i += 5) {
  cones.push({ x: outer[i].x, y: outer[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
  cones.push({ x: inner[i].x, y: inner[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
}

// Кухонные объекты на столе — статичные, в масштабе с машинками. Машинка отскакивает (капсульная коллизия).
function distToTrackPoint(x, y) {
  let best = Infinity;
  for (const c of center) { const dx = x - c.x, dy = y - c.y; const d = dx * dx + dy * dy; if (d < best) best = d; }
  return Math.sqrt(best);
}
const props = [];
function addProp(o) {
  o.hl = o.hl || 0;
  o._cos = Math.cos(o.ang); o._sin = Math.sin(o.ang);
  props.push(o);
}
// 1) Круглая посуда в карманах трассы (внутренние апексы) — повороты огибают её.
const DISHES = [
  { kind: 'plate',  c: '#e6ebf0' },
  { kind: 'bowl',   c: '#3a6ea5' },
  { kind: 'saucer', c: '#ead9bf' },
  { kind: 'plate',  c: '#f0c419' }
];
{
  const rad = center.map(c => Math.hypot(c.x, c.y));
  const apex = [];
  for (let i = 0; i < SAMPLES; i++) {
    const p = rad[(i - 1 + SAMPLES) % SAMPLES], n = rad[(i + 1) % SAMPLES];
    if (rad[i] < p && rad[i] <= n) apex.push(i);
  }
  let di = 0;
  for (const i of apex) {
    const c = center[i], r = rad[i];
    const dirx = c.x / r, diry = c.y / r;
    const innerEdge = r - TRACK_HALF;            // расстояние от центра стола до внутренней кромки трассы
    const objR = Math.max(110, Math.min(240, innerEdge * 0.33));
    const cd = innerEdge - objR - 34;            // центр посуды, с зазором до полотна
    if (cd < objR * 0.4) continue;               // слишком близко к центру — пропускаем
    const d = DISHES[di++ % DISHES.length];
    addProp({ x: dirx * cd, y: diry * cd, ang: Math.atan2(diry, dirx), hl: 0, r: objR, kind: d.kind, c: d.c });
  }
}
// 2) Сервировка по углам стола (вне трассы): доска, нож, ложка, вилка — вытянутые предметы.
const SETTING = [
  { x: 1350,  y: -1000, ang: 0.5,  hl: 150, r: 120, kind: 'board', c: '#b07b46' },
  { x: -1350, y: -1000, ang: -0.5, hl: 150, r: 22,  kind: 'knife', c: '#c8ccd2' },
  { x: -1380, y: 1100,  ang: 0.6,  hl: 110, r: 52,  kind: 'spoon', c: '#c8ccd2' },
  { x: 1430,  y: 1150,  ang: -0.4, hl: 120, r: 30,  kind: 'fork',  c: '#c8ccd2' }
];
for (const o of SETTING) {
  if (Math.abs(o.x) + o.hl + o.r > TABLE.w / 2 - 60) continue;
  if (Math.abs(o.y) + o.hl + o.r > TABLE.h / 2 - 60) continue;
  if (distToTrackPoint(o.x, o.y) > TRACK_HALF + o.r + 40) addProp(o);
}

// Чекпоинты
const K = 8, CP_R = TRACK_HALF + 70;
const checkpoints = [];
for (let i = 0; i < K; i++) checkpoints.push(centerAt((i / K) * Math.PI * 2));

// --- Машинка (старт на линии) ---
const start = centerAt(0), startT = tangentAt(0);
const car = { x: start.x, y: start.y, angle: Math.atan2(startT.y, startT.x), vx: 0, vy: 0 };

// --- Гонка / счёт ---
let nextCp = 1, lapTime = 0, lastLap = null, bestLap = null, lapStarted = true;  // время идёт с самого GO — первый круг засчитывается
let lapNum = 0, lapScoreStart = 0, lapScores = [];   // очки по кругам (храним последние 3)
let startCd = 3.0, goT = 0;   // отсчёт 3-2-1-GO!: startCd>0 — машина заморожена, goT — показ «GO!»
let score = 0;
let comboPoints = 0, mult = 1, driftTime = 0, transitions = 0, driftGrace = 0, lastSlipSign = 0;
let multBuild = 0, nearMisses = 0, nearMissCd = 0;   // «шкала» множителя и near-miss
let flashMsg = '', flashT = 0, flashColor = '#fff';
function flash(msg, color) { flashMsg = msg; flashColor = color || '#fff'; flashT = 0.9; }

let crashCd = 0;   // блокировка набора комбо сразу после аварии
function resetCombo() { comboPoints = 0; mult = 1; driftTime = 0; transitions = 0; lastSlipSign = 0; multBuild = 0; nearMisses = 0; }

// near-miss: проезд впритирку (в полосе BAND за радиусом столкновения) к стене / конусу / посуде
const NM_BAND = 42;
function nearMissCheck(CR) {
  const speed = Math.hypot(car.vx, car.vy);
  if (speed < 140) return false;
  // стены стола
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
  // конусы
  for (const c of cones) {
    if (c.knocked) continue;
    const d = Math.hypot(car.x - c.x, car.y - c.y) - (CONE_R + CR);
    if (d > 0 && d < NM_BAND) return true;
  }
  // посуда / утварь (капсула)
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
// штатный банк: накопленное комбо уходит в общий счёт
function bankCombo() {
  if (comboPoints < 1) { resetCombo(); return; }
  score += Math.round(comboPoints);
  flash('+' + Math.round(comboPoints) + ' banked', '#9be37a');
  resetCombo();
}
// авария/вылет: комбо сгорает, в счёт НЕ идёт
function burnCombo(reason) {
  if (comboPoints >= 1) flash(reason + '  combo ' + Math.round(comboPoints) + ' lost', '#ff6a6a');
  resetCombo();
  crashCd = 0.5; driftGrace = 1;
}

// --- Ввод ---
let steerInput = 0, steerSmooth = 0;
const keys = {};
addEventListener('keydown', e => { keys[e.key] = true; });
addEventListener('keyup',   e => { keys[e.key] = false; });
const pointers = new Map();
function updatePointerSteer() {
  let s = 0;
  for (const x of pointers.values()) s += (x < W / 2 ? -1 : 1);
  steerInput = Math.sign(s);
}
canvas.addEventListener('pointerdown', e => { pointers.set(e.pointerId, e.clientX); updatePointerSteer(); });
canvas.addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, e.clientX); updatePointerSteer(); } });
canvas.addEventListener('pointerup',   e => { pointers.delete(e.pointerId); updatePointerSteer(); });
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); updatePointerSteer(); });

// Переключение модели машинки ("школа")
const carBtn = document.getElementById('carBtn');
const bodyColor = document.getElementById('bodyColor');
function setModel(i) { carModel = (i + CARS.length) % CARS.length; carBtn.textContent = '🚗 ' + CARS[carModel].name; bodyColor.value = CARS[carModel].body; }
carBtn.addEventListener('click', e => { e.preventDefault(); setModel(carModel + 1); });
bodyColor.addEventListener('input', e => { CARS[carModel].body = e.target.value; });
addEventListener('keydown', e => { if (e.key === 'c' || e.key === 'C') setModel(carModel + 1); });
setModel(0);

// --- Назад в меню (отдельная страница) ---
document.getElementById('menuBtn').addEventListener('click', e => { e.preventDefault(); location.href = 'index.html'; });

const skids = [];

// Расстояние до центральной линии трассы (для «очки только у трассы»)
function distToTrack() {
  let best = Infinity;
  for (const c of center) {
    const dx = car.x - c.x, dy = car.y - c.y;
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Наезд на конус в точке (px,py) кузова радиусом r — сбиваем, лёгкая потеря хода + штраф
function hitConeAt(c, px, py, r) {
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
  score = Math.max(0, score - 200);
  flash('cone!  -200', '#ffb14d');
}

// --- Кадронезависимая «живая» физика ---
// Покадровые множители (grip/rollFriction/затухание конусов) раньше применялись РАЗ В
// КАДР, поэтому на 120 Гц гасили скорость вдвое чаще, чем на 60 Гц. Возводим их в степень
// dt*PHYS_HZ → СРЕДНЕЕ ощущение одинаково на любой частоте. Эталон = 120 Гц (то самое
// «цепкое/идеальное»). Меньше PHYS_HZ → более скользко; больше → суше.
const PHYS_HZ = 120;
// «Живость» (расходящиеся круги) раньше возникала случайно — из джиттера кадров: dt скакал,
// а grip применялся фиксировано. Нормализация это убивала → стерильный «идеальный круг».
// Тут воспроизводим дрожание ЧЕСТНО: плавный шум от НАКОПЛЕННОГО ВРЕМЕНИ (а не числа кадров),
// поэтому он одинаков на 60 и 120 Гц. Два слоя: МЕДЛЕННЫЙ увод (радиус «гуляет» от витка к
// витку — главный источник «расходящихся кругов») + быстрая текстура. Модулируем и сцепление,
// и слегка курс. Всё *dt / через Math.pow → среднее и сама «живость» одинаковы на любой частоте.
const GRIP_WOBBLE  = 0.7;   // амплитуда дрожания сцепления (0 = ровный круг)
const STEER_WOBBLE = 0.16;  // амплитуда «увода» курса, рад/с (0 = без виляния траектории)
let physT = 0;              // накопленное время физики, с — аргумент шума «живости»

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;

  // отсчёт перед стартом: машина стоит, ввод игнорируется
  if (startCd > 0) {
    startCd -= dt;
    if (startCd <= 0) goT = 1.0;
    draw(0);
    requestAnimationFrame(frame);
    return;
  }
  if (goT > 0) goT -= dt;

  const P = CARS[carModel]._drive;   // настройки управления текущей машинки

  let kSteer = 0;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) kSteer -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) kSteer += 1;
  const steerTarget = kSteer !== 0 ? kSteer : steerInput;
  steerSmooth += (steerTarget - steerSmooth) * Math.min(1, dt * P.steerSmooth);

  const fwd  = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const side = { x: -Math.sin(car.angle), y: Math.cos(car.angle) };

  let vF = car.vx * fwd.x + car.vy * fwd.y;
  let vS = car.vx * side.x + car.vy * side.y;
  const speed = Math.hypot(car.vx, car.vy);
  const drifting = Math.abs(vS) > 60 && speed > 90;

  physT += dt;
  // медленный увод (период ~3–8 с → радиус «гуляет» от витка к витку) ≈[-1.5..1.5]
  const wobSlow = Math.sin(physT * 0.8 + 1.7) + 0.5 * Math.sin(physT * 1.9 + 4.2);
  // быстрая текстура (мелкое дрожание шасси) ≈[-1..1]
  const wobFast = 0.6 * Math.sin(physT * 5.3 + 0.5) + 0.4 * Math.sin(physT * 12.1 + 2.1);
  const wob = 0.7 * wobSlow + 0.3 * wobFast;
  // живость сцепления есть всегда в движении (база 0.4), сильнее — в скольжении
  const live = Math.min(1, speed / P.maxSpeed) * (0.4 + 0.6 * Math.min(1, Math.abs(vS) / 80));
  // увод курса включается только при заносе (без пола) → прямые остаются ровными
  const liveSteer = Math.min(1, speed / P.maxSpeed) * Math.min(1, Math.abs(vS) / 60);
  const fAdj = dt * PHYS_HZ;                              // нормализация средней физики
  const gripAdj = fAdj * (1 + GRIP_WOBBLE * wob * live);  // + «живое» дрожание сцепления

  if (vF < P.maxSpeed) vF += P.thrust * dt;
  vF *= Math.pow(P.rollFriction, fAdj);   // продольное трение качения — независимо от FPS
  vS *= Math.pow(P.grip, gripAdj);        // боковое сцепление: норм. среднее + живость
  vF *= Math.max(0, 1 - P.driftDrag * Math.abs(vS) * dt);

  const turnFactor = Math.max(P.lowSpeedTurn, Math.min(speed / 160, 1));
  const authority = drifting ? P.driftSteerBoost : 1;
  car.angle += steerSmooth * P.steer * turnFactor * authority * dt;
  car.angle += STEER_WOBBLE * wobSlow * liveSteer * dt;   // лёгкий «увод» курса → круг живёт

  car.vx = fwd.x * vF + side.x * vS;
  car.vy = fwd.y * vF + side.y * vS;

  // самовыравнивание: корпус упруго стремится встать по направлению движения
  if (speed > 40) {
    const moveAng = Math.atan2(car.vy, car.vx);
    let diff = moveAng - car.angle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += diff * P.selfAlign * Math.min(1, speed / P.maxSpeed) * dt;
  }

  car.x += car.vx * dt;
  car.y += car.vy * dt;

  // точки кузова для коллизий (нос / центр / корма) — учитываем вытянутую форму
  const M = CARS[carModel];
  const CR = M.wid * 0.55;
  const hx = Math.cos(car.angle), hy = Math.sin(car.angle), nose = M.len * 0.3;
  const bodyPts = [[car.x + hx * nose, car.y + hy * nose], [car.x, car.y], [car.x - hx * nose, car.y - hy * nose]];

  // конусы: наезд + физика сбитых
  for (const c of cones) {
    for (const p of bodyPts) hitConeAt(c, p[0], p[1], CR);
    if (c.knocked) {
      const dAdj = Math.pow(0.9, fAdj);   // затухание сбитого конуса — независимо от FPS
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vx *= dAdj; c.vy *= dAdj; c.ang += c.spin * dt; c.spin *= dAdj;
    }
  }

  // стенки стола
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

  // объекты на столе: жёсткое препятствие (капсула) — машинка отскакивает
  for (const o of props) {
    let qx = o.x, qy = o.y;
    if (o.hl > 0) {                                   // вытянутый предмет — ближайшая точка на оси
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

  // очки заноса: КОПИМ в combo во время заноса, БАНКУЕМ в score только при штатном завершении
  if (crashCd > 0) crashCd -= dt;
  const slip = Math.abs(vS);
  const distTrk = distToTrack();
  const onTrack = distTrk < TRACK_HALF + 90;

  // вылет: ушли далеко от полотна с накопленным комбо — сгорает сразу
  if (comboPoints >= 1 && distTrk > TRACK_HALF + 260) burnCombo('OFF TRACK!');

  if (nearMissCd > 0) nearMissCd -= dt;

  if (drifting && onTrack && crashCd <= 0) {
    driftTime += dt;

    // 1) БАЗА — очень медленный рост шкалы, тем быстрее, чем круче угол и выше скорость
    const quality = Math.min(1.4, (slip / 160) * (speed / 260));
    multBuild += dt * 0.14 * quality;

    // 2) РЕЗКАЯ ПЕРЕКЛАДКА — небольшой мгновенный скачок шкалы
    const sgn = vS > 50 ? 1 : (vS < -50 ? -1 : 0);
    if (sgn !== 0) {
      if (lastSlipSign !== 0 && sgn !== lastSlipSign) {
        transitions++; multBuild += 0.3; flash('TRANSITION!  +mult', '#7fd4ff');
      }
      lastSlipSign = sgn;
    }

    // 3) NEAR MISS — проезд впритирку к препятствию даёт небольшой скачок
    if (nearMissCd <= 0 && nearMissCheck(CR)) {
      nearMisses++; multBuild += 0.28; nearMissCd = 0.6; flash('NEAR MISS!  +mult', '#ffd36a');
    }

    mult = Math.min(8, 1 + multBuild);
    comboPoints += slip * speed * dt * 0.0015 * mult;   // копим текущий занос (distance = speed*dt)
    driftGrace = 0;
  } else {
    driftGrace += dt;
    // занос завершён: на трассе → банкуем, в вылете → сгорает
    if (driftGrace > 0.5 && comboPoints >= 1) {
      if (onTrack) bankCombo(); else burnCombo('OFF TRACK!');
    } else if (driftGrace > 0.5) {
      resetCombo();
    }
  }

  // следы
  if (slip > 40 && speed > 60) {
    const rx = car.x - fwd.x * 12, ry = car.y - fwd.y * 12;
    skids.push({ x: rx + side.x * 7, y: ry + side.y * 7, a: Math.min(slip / 200, .6) });
    skids.push({ x: rx - side.x * 7, y: ry - side.y * 7, a: Math.min(slip / 200, .6) });
    if (skids.length > 1500) skids.splice(0, 2);
  }

  // круг
  if (lapStarted) lapTime += dt;
  const cp = checkpoints[nextCp];
  if (Math.hypot(car.x - cp.x, car.y - cp.y) < CP_R) {
    if (nextCp === 0) {
      lastLap = lapTime;
      if (bestLap === null || lapTime < bestLap) bestLap = lapTime;
      lapNum++;
      lapScores.push({ n: lapNum, pts: Math.round(score - lapScoreStart) });
      if (lapScores.length > 3) lapScores.shift();   // не больше 3х последних кругов
      lapScoreStart = score;
      flash('LAP ' + lapTime.toFixed(2) + ' s', '#9dff8f');
      lapTime = 0; nextCp = 1;
    } else nextCp = (nextCp + 1) % K;
  }

  if (flashT > 0) flashT -= dt;
  draw(speed);
  requestAnimationFrame(frame);
}

function polyPath(pts) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Капсула вдоль оси X: длина ±hl, радиус r. Для вытянутых предметов.
function capPath(hl, r) {
  ctx.beginPath();
  ctx.moveTo(-hl, -r);
  ctx.lineTo(hl, -r);
  ctx.arc(hl, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-hl, r);
  ctx.arc(-hl, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

// Машинка вид сверху (нос по +X). Рисуется в локальных координатах.
function drawCar(M) {
  // модель по SVG-контуру: заливаем силуэт + обводим линии деталей
  if (M.path) {
    const s = M.len / M.vw;
    ctx.save();
    ctx.scale(M.flip ? -s : s, s);
    ctx.translate(-M.vw / 2, -M.vh / 2);
    ctx.fillStyle = M.body; ctx.fill(M._p2d);   // кузов — кастомный цвет
    if (M.details) for (const d of M.details) { ctx.fillStyle = d.c; ctx.fill(d._p2d); }   // фары/стопы/стёкла — фикс. цвета
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = M.stroke;
    ctx.stroke(M._p2d);
    if (M._lines) for (const lp of M._lines) ctx.stroke(lp);   // детальные линии (окна/панели) — обводка
    ctx.restore();
    return;
  }
  const hl = M.len / 2, hw = M.wid / 2;
  // корпус
  ctx.fillStyle = M.body; rrect(-hl, -hw, M.len, M.wid, hw * 0.7); ctx.fill();
  // акцент по борту
  ctx.strokeStyle = M.accent; ctx.lineWidth = 1.5; rrect(-hl + 2, -hw + 2, M.len - 4, M.wid - 4, hw * 0.6); ctx.stroke();
  // остекление кабины
  ctx.fillStyle = M.glass; rrect(-hl * 0.5, -hw * 0.82, hl * 0.78, hw * 1.64, hw * 0.45); ctx.fill();
  // крыша (оставляет лобовое/заднее/боковые стёкла)
  ctx.fillStyle = M.roof; rrect(-hl * 0.34, -hw * 0.66, hl * 0.46, hw * 1.32, hw * 0.4); ctx.fill();
  // фары
  ctx.fillStyle = M.head;
  rrect(hl * 0.8, -hw * 0.72, hl * 0.09, hw * 0.42, 2); ctx.fill();
  rrect(hl * 0.8,  hw * 0.30, hl * 0.09, hw * 0.42, 2); ctx.fill();
  // стопы
  ctx.fillStyle = M.tail;
  rrect(-hl * 0.9, -hw * 0.72, hl * 0.06, hw * 0.42, 2); ctx.fill();
  rrect(-hl * 0.9,  hw * 0.30, hl * 0.06, hw * 0.42, 2); ctx.fill();
}

// Кухонный объект на столе (тарелка/миска/блюдце/доска/нож/ложка/вилка) — вид сверху
function drawProp(o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  // тень
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  if (o.hl > 0) {
    ctx.save(); ctx.rotate(o.ang); ctx.translate(6, 8); capPath(o.hl, o.r); ctx.fill(); ctx.restore();
  } else {
    ctx.beginPath(); ctx.ellipse(6, 8, o.r * 1.03, o.r * 0.97, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.rotate(o.ang);

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
    // лезвие
    ctx.fillStyle = o.c;
    ctx.beginPath(); ctx.moveTo(-o.hl * 0.1, -o.r); ctx.lineTo(o.hl, -o.r * 0.2); ctx.lineTo(o.hl, o.r * 0.2); ctx.lineTo(-o.hl * 0.1, o.r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
    // рукоять
    ctx.fillStyle = '#3a3a3a';
    ctx.save(); ctx.translate(-o.hl * 0.55, 0); capPath(o.hl * 0.45, o.r * 0.95); ctx.fill(); ctx.restore();
  } else if (o.kind === 'spoon') {
    // черенок
    ctx.strokeStyle = o.c; ctx.lineWidth = o.r * 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-o.hl, 0); ctx.lineTo(o.hl * 0.3, 0); ctx.stroke();
    // чаша
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.ellipse(o.hl * 0.55, 0, o.r * 0.9, o.r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(o.hl * 0.55, 0, o.r * 0.6, o.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === 'fork') {
    // черенок
    ctx.strokeStyle = o.c; ctx.lineWidth = o.r * 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-o.hl, 0); ctx.lineTo(o.hl * 0.4, 0); ctx.stroke();
    // зубцы
    ctx.lineWidth = o.r * 0.22;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(o.hl * 0.4, i * o.r * 0.6); ctx.lineTo(o.hl, i * o.r * 0.6); ctx.stroke(); }
  }
  ctx.restore();
}

function draw(speed) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const camOffY = H * 0.10;                 // машинка чуть ниже центра экрана
  ctx.translate(W / 2 - car.x, H / 2 + camOffY - car.y);

  // пол (за столом)
  ctx.fillStyle = '#0f0b08';
  ctx.fillRect(car.x - W / 2, car.y - H / 2 - camOffY, W, H);

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
  for (const s of skids) { ctx.fillStyle = `rgba(15,9,6,${s.a})`; ctx.fillRect(s.x - 3, s.y - 3, 6, 6); }

  // старт/финиш
  const c0 = center[0], t0 = tangentAt(0), n0 = { x: -t0.y, y: t0.x };
  ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 8; ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(c0.x + n0.x * TRACK_HALF, c0.y + n0.y * TRACK_HALF);
  ctx.lineTo(c0.x - n0.x * TRACK_HALF, c0.y - n0.y * TRACK_HALF);
  ctx.stroke(); ctx.setLineDash([]);

  // следующий чекпоинт
  const cp = checkpoints[nextCp];
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

  // машинка (тень + колёса + модель)
  ctx.save();
  ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  const M = CARS[carModel];
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-M.len / 2 + 2, -M.wid / 2 + 3, M.len, M.wid, M.wid * 0.7); ctx.fill();

  // колёса: задних не видно вообще; только передние, «утопленные» в корпус, проявляются при повороте
  const wlen = M.len * 0.16, wwid = Math.max(4, M.wid * 0.20);
  const reveal = Math.abs(steerSmooth), wheelAng = steerSmooth * 0.5;
  const wAlpha = Math.min(1, reveal * 1.6);
  if (wAlpha > 0.02) {
    ctx.fillStyle = `rgba(13,14,16,${wAlpha})`;
    const track = M.wid * 0.42;   // утоплены: колея внутри силуэта, шины лишь чуть выглядывают на доводке руля
    for (const sy of [-1, 1]) {
      ctx.save();
      ctx.translate(M.len * 0.30, sy * track); ctx.rotate(wheelAng);
      rrect(-wlen / 2, -wwid / 2, wlen, wwid, 2); ctx.fill();
      ctx.restore();
    }
  }

  drawCar(M);
  ctx.restore();

  ctx.restore();

  document.getElementById('lap').textContent = lapTime.toFixed(2);
  document.getElementById('lapNum').textContent = lapNum + 1;   // текущий круг (в процессе)
  document.getElementById('last').textContent = lastLap === null ? '—' : lastLap.toFixed(2) + ' s';
  document.getElementById('best').textContent = bestLap === null ? '—' : bestLap.toFixed(2) + ' s';
  document.getElementById('score').textContent = Math.round(score);
  document.getElementById('lapScores').innerHTML =
    lapScores.slice().reverse().map(l => 'lap ' + l.n + ': +' + l.pts).join('<br>');
  document.getElementById('spd').textContent = Math.round(speed);

  const comboEl = document.getElementById('combo');
  if (comboPoints > 0) { comboEl.style.opacity = 1; comboEl.textContent = '+' + Math.round(comboPoints) + '   ×' + mult.toFixed(1); }
  else comboEl.style.opacity = 0;

  const flashEl = document.getElementById('flash');
  flashEl.style.opacity = Math.max(0, flashT / 0.9);
  flashEl.style.color = flashColor;
  flashEl.textContent = flashMsg;

  const countEl = document.getElementById('count');
  if (startCd > 0) { countEl.style.opacity = 1; countEl.style.color = '#fff'; countEl.textContent = Math.ceil(startCd); }
  else if (goT > 0) { countEl.style.opacity = Math.min(1, goT / 0.4); countEl.style.color = '#9dff8f'; countEl.textContent = 'GO!'; }
  else countEl.style.opacity = 0;

  drawMini();
}

// --- Мини-карта: лента трассы, объекты и точка машинки ---
function drawMini() {
  mctx.clearRect(0, 0, mini.width, mini.height);
  // лента трассы
  mctx.lineJoin = mctx.lineCap = 'round';
  mctx.strokeStyle = 'rgba(255,255,255,.22)';
  mctx.lineWidth = Math.max(3, TRACK_HALF * 2 * MINI.s);
  mctx.beginPath();
  for (let i = 0; i <= center.length; i++) { const c = center[i % center.length]; const fn = i ? 'lineTo' : 'moveTo'; mctx[fn](MINI.X(c.x), MINI.Y(c.y)); }
  mctx.stroke();
  // объекты (посуда/приборы)
  mctx.fillStyle = 'rgba(255,255,255,.45)';
  for (const o of props) { mctx.beginPath(); mctx.arc(MINI.X(o.x), MINI.Y(o.y), Math.max(1.5, o.r * MINI.s), 0, Math.PI * 2); mctx.fill(); }
  // машинка
  const cx = MINI.X(car.x), cy = MINI.Y(car.y);
  mctx.save();
  mctx.translate(cx, cy);
  mctx.rotate(car.angle);
  mctx.fillStyle = '#ff5a3c';
  mctx.beginPath(); mctx.moveTo(6, 0); mctx.lineTo(-4, -4); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill();
  mctx.restore();
}

requestAnimationFrame(frame);
