// Pure collision / finish-line geometry — no state, no DOM, no side effects.

// Signed projection of the car position onto the start/finish axis.
// Positive = car has passed the line; negative = car is still approaching.
export const finishDot = (car, c0, cos, sin) =>
  (car.x - c0.x) * cos + (car.y - c0.y) * sin;

// True when the car transitions from behind (prevDot < 0) to at/past (dot >= 0)
// the finish line in a single frame — i.e. one crossing has occurred.
// frame() owns the null-guard: prevDot must not be null before this is called.
export const crossedFinish = (prevDot, dot) => prevDot < 0 && dot >= 0;

// Pure near-miss geometry — no state, no DOM, no side effects.
// Returns true when the car is within NM_BAND of any surface (table edge,
// standing cone, or prop capsule) while moving above the speed gate.
export const nearMiss = (car, cones, props, TABLE, CONE_R, CR, NM_BAND) => {
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
};
