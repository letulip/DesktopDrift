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

// Car vs table wall (capsule). MUTATES car.{x,y,vx,vy} in place (same convention as
// physics.stepCar). `bodyPts` is the pre-collision capsule snapshot [[x,y]×3]; `hx,hy`
// = car heading cos/sin; `nose` = half-length to the bumper. Returns the impact
// magnitude along the wall normal — the caller fires haptics / burnCombo above the
// crash threshold (120). VERBATIM extraction of the inline wall response — feel-critical,
// do not reorder.
export const resolveWall = (car, TABLE, CR, hx, hy, nose, bodyPts) => {
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
        if (vn > 0) { car.vx -= vn * px * 1.3; car.vy -= vn * py * 1.3; return vn; }
        return 0; // one response per frame
      }
    }
    return 0;
  }
  // Capsule AABB: extent along X/Y depends on car angle, not just CR.
  const absExtX = Math.abs(hx) * nose + CR;
  const absExtY = Math.abs(hy) * nose + CR;
  const wallW = TABLE.w / 2, wallH = TABLE.h / 2;
  let wallHit = 0;
  if (car.x - absExtX < -wallW) { car.x = -wallW + absExtX; if (car.vx < 0) { wallHit = Math.max(wallHit, -car.vx); car.vx *= -0.3; } car.vy *= 0.85; }
  if (car.x + absExtX >  wallW) { car.x =  wallW - absExtX; if (car.vx > 0) { wallHit = Math.max(wallHit,  car.vx); car.vx *= -0.3; } car.vy *= 0.85; }
  if (car.y - absExtY < -wallH) { car.y = -wallH + absExtY; if (car.vy < 0) { wallHit = Math.max(wallHit, -car.vy); car.vy *= -0.3; } car.vx *= 0.85; }
  if (car.y + absExtY >  wallH) { car.y =  wallH - absExtY; if (car.vy > 0) { wallHit = Math.max(wallHit,  car.vy); car.vy *= -0.3; } car.vx *= 0.85; }
  return wallHit;
};

// Car vs props (capsule nearest-point pushback). MUTATES car.{x,y,vx,vy}. `bodyPts` is
// the pre-collision capsule snapshot. Returns the largest inbound impact magnitude (−vn)
// among colliding props — the caller fires haptics / burnCombo above the crash threshold
// (100). VERBATIM extraction of the inline prop response — feel-critical, do not reorder.
export const resolveProps = (car, props, CR, bodyPts) => {
  let crash = 0;
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
      if (vn < 0) { car.vx -= vn * nx * 1.4; car.vy -= vn * ny * 1.4; if (-vn > crash) crash = -vn; }
    }
  }
  return crash;
};
