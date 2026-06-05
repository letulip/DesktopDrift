// Чистые геометрические помощники для построения треков — без состояния,
// без побочных эффектов, без браузерных API. Раньше эти циклы были скопированы
// в track.js / track-workdesk.js (и частично track-oval.js) — теперь единый
// источник правды, который можно покрыть юнит-тестами. Поведение идентично.

// Алгоритм Chaikin — угловое отсечение, один проход (вызывается несколько раз).
// n точек → 2n точек. Замкнутый контур (последняя соединяется с первой).
export const chaikin = (pts) => {
  const n = pts.length, r = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    r.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 });
    r.push({ x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
  }
  return r;
};

// Из центральной линии строит { center, outer, inner }: внешний и внутренний
// края смещены на half вдоль перпендикуляра к касательной (по соседним точкам).
// center — те же точки (по ссылке), как и было в track.js.
export const offsetEdges = (centerPts, half) => {
  const center = [], outer = [], inner = [];
  const N = centerPts.length;
  for (let i = 0; i < N; i++) {
    const c    = centerPts[i];
    const prev = centerPts[(i - 1 + N) % N];
    const next = centerPts[(i + 1) % N];
    const tx   = next.x - prev.x, ty = next.y - prev.y;
    const len  = Math.hypot(tx, ty) || 1;
    const nx   = -ty / len, ny = tx / len; // перпендикуляр (левый нормаль)
    center.push(c);
    outer.push({ x: c.x + nx * half, y: c.y + ny * half });
    inner.push({ x: c.x - nx * half, y: c.y - ny * half });
  }
  return { center, outer, inner };
};

// Расставляет конусы вдоль внешнего и внутреннего краёв с шагом step.
export const placeCones = (outer, inner, step = 5) => {
  const cones = [];
  for (let i = 0; i < outer.length; i += step) {
    cones.push({ x: outer[i].x, y: outer[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
    cones.push({ x: inner[i].x, y: inner[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
  }
  return cones;
};

// K чекпоинтов, равномерно по индексам центральной линии.
export const sampleCheckpoints = (center, K) => {
  const N = center.length, cps = [];
  for (let i = 0; i < K; i++) cps.push(center[Math.floor((i / K) * N)]);
  return cps;
};

// Готовит дескриптор предмета к рендеру/физике: hl по умолчанию 0, кэш cos/sin угла.
// Мутирует и возвращает тот же объект (как прежний addProp).
export const prepProp = (o) => {
  o.hl   = o.hl || 0;
  o._cos = Math.cos(o.ang);
  o._sin = Math.sin(o.ang);
  return o;
};
