// Pure sound-effect parameters — no DOM, no AudioContext, fully unit-testable (mirrors the
// pure/canvas split of neon.js / neon-draw.js). js/sound.js renders these with Web Audio.
//
// Each SFX is a small sequence of `steps`. A step is one voice — an oscillator or a noise
// burst — with an attack/release envelope. All sounds are deliberately SOFT and short: this
// is a toy-car arcade drifter, so no engine drone, no tyre screech — just gentle blips.
//
// Step shape:
//   f     start frequency (Hz)                     type  'sine'|'triangle'|'square'|'sawtooth'|'noise'
//   f2    optional end frequency → linear glide     gain  peak gain 0..1 (relative to master)
//   t     start offset within the sound (s)         a     attack (s)   r  release (s)
//   dur   sustain duration (s)                       lp    lowpass cutoff (Hz), noise steps only

// Discrete blip built from a short note sequence. `notes` is [freq, startOffset] pairs.
const blip = (type, gain, dur, notes, a = 0.005, r = 0.06) =>
  ({ steps: notes.map(([f, t]) => ({ type, f, t, dur, gain, a, r })) });

export const SFX = {
  // ── UI / menu (Stage 1) ──────────────────────────────────────────────────
  tap:    blip('sine',     0.16, 0.05, [[660, 0]]),                       // menu nav / start / back tap
  flip:   { steps: [{ type: 'triangle', f: 520, f2: 660, t: 0, dur: 0.06, gain: 0.14, a: 0.004, r: 0.05 }] }, // carousel swish
  select: blip('sine',     0.16, 0.06, [[587, 0], [784, 0.05]]),          // pick a car / swatch — up two-note
  back:   blip('sine',     0.14, 0.06, [[523, 0], [392, 0.05]]),          // back — down two-note
  buy:    blip('triangle', 0.16, 0.08, [[523, 0], [659, 0.07], [784, 0.14]]), // purchase — gentle arpeggio
  deny:   { steps: [{ type: 'square', f: 160, t: 0, dur: 0.12, gain: 0.12, a: 0.005, r: 0.08, lp: 900 }] },   // can't afford — muted thunk
  toggle: blip('sine',     0.14, 0.03, [[700, 0]]),                       // settings toggle click

  // ── Gameplay (Stage 2) ───────────────────────────────────────────────────
  count:  blip('sine',     0.18, 0.09, [[440, 0]]),                       // countdown 3-2-1 pip
  go:     { steps: [{ type: 'sine', f: 660, f2: 880, t: 0, dur: 0.16, gain: 0.2, a: 0.006, r: 0.1 }] },       // GO! — brighter
  pickup: blip('triangle', 0.14, 0.05, [[880, 0], [1320, 0.04]]),         // tire-coin pickup — soft coin
  cap:    blip('sine',     0.15, 0.07, [[659, 0], [988, 0.06], [1319, 0.12]]), // cola-cap collect — sparkle chime
  checkpoint: blip('sine', 0.10, 0.03, [[990, 0]]),                       // checkpoint tick
  lap:    blip('triangle', 0.15, 0.07, [[784, 0], [1047, 0.06]]),         // lap complete — soft chime
  crash:  { steps: [{ type: 'noise', t: 0, dur: 0.14, gain: 0.3, a: 0.002, r: 0.1, lp: 420 }] },              // wall/prop — muted thud (mag-scaled)
  cone:   { steps: [{ type: 'triangle', f: 300, t: 0, dur: 0.05, gain: 0.18, a: 0.002, r: 0.05 },
                    { type: 'noise', t: 0, dur: 0.04, gain: 0.12, a: 0.002, r: 0.04, lp: 1400 }] },           // cone knock — light clonk
  transition: blip('sine', 0.10, 0.04, [[1200, 0]]),                      // TRANSITION! blip
  nearmiss:   blip('sine', 0.11, 0.04, [[1500, 0]]),                      // NEAR MISS! blip
  bank:   blip('triangle', 0.13, 0.05, [[700, 0], [1050, 0.05]]),         // combo banked — soft coin
  combobreak: { steps: [{ type: 'triangle', f: 440, f2: 220, t: 0, dur: 0.18, gain: 0.16, a: 0.004, r: 0.12 }] }, // combo lost — down slide
  finish: blip('triangle', 0.17, 0.09, [[523, 0], [659, 0.08], [784, 0.16], [1047, 0.24]]), // race finish flourish
  achieve: blip('sine',    0.17, 0.09, [[659, 0], [880, 0.08], [1175, 0.16]]), // achievement unlock chime
  record: blip('triangle', 0.18, 0.09, [[784, 0], [988, 0.08], [1319, 0.16], [1568, 0.24]]), // new record — celebratory
};

// ── Volume ───────────────────────────────────────────────────────────────────
// The settings volume (0..1) maps to a perceptual gain via an exponential-ish curve so the
// low end is quiet enough. The UI exposes three discrete levels (a button-row, no slider).
export const VOLUME_DEFAULT = 0.65;
export const VOLUME_LEVELS  = { low: 0.35, med: 0.65, high: 1.0 };

// Clamp a raw volume to [0,1]; non-finite input falls back to the default (defensive, like
// economy.starsForPps(undefined) === 0). Accepts numeric strings from inputs.
export const clampVolume = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : VOLUME_DEFAULT;
};

// Perceptual master gain for a volume setting: squared so 0→0, 1→1, mid is quieter than linear.
export const gainForVolume = (v) => { const c = clampVolume(v); return c * c; };

// Nearest discrete level key ('low'|'med'|'high') for a stored volume — restores the UI selection.
export const levelForVolume = (v) => {
  const c = clampVolume(v);
  let best = 'med', bestD = Infinity;
  for (const k in VOLUME_LEVELS) {
    const d = Math.abs(VOLUME_LEVELS[k] - c);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
};

// Total wall-clock length of an SFX (s) — when the last voice fully releases. Lets the renderer
// know when nodes can be torn down. Empty/invalid → 0.
export const totalDuration = (sfx) => {
  if (!sfx || !Array.isArray(sfx.steps) || sfx.steps.length === 0) return 0;
  return Math.max(...sfx.steps.map(s =>
    (s.t ?? 0) + Math.max(s.a ?? 0.005, s.dur ?? 0.08) + (s.r ?? 0.06)));
};
