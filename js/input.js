// Pure input mapping — no state, no side effects, no browser APIs.
// Combines touch/pointer positions and keyboard state into a steer value.
export const resolveSteer = (pointers, keys, W) => {
  let s = 0;
  for (const x of pointers.values()) s += (x < W / 2 ? -1 : 1);
  let kSteer = 0;
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) kSteer -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) kSteer += 1;
  return kSteer !== 0 ? kSteer : Math.sign(s);
};
