// Pure sound-effect parameters — no DOM, no AudioContext, fully unit-testable (mirrors the
// pure/canvas split of neon.js / neon-draw.js). js/sound.js renders these with Web Audio.
//
// Design: soft, semi-atmospheric arcade SFX — "a seasoning, not a soundtrack". Every voice is a
// pure SINE with an exponential bell envelope (the same recipe that sounds harmonious in the
// sibling verb-quest project), and js/sound.js adds a gentle master lowpass + a light procedural
// reverb tail. No harsh square/saw/noise waveforms, no 8-bit blips. Toy-car arcade: no engine
// drone, no tyre skid — just gentle chimes fired at discrete events.
//
// SFX entry: { notes: [[freqHz, startOffsetSec], ...], dur, gain, a }
//   dur  per-note decay length (s)     gain  peak gain 0..1 (kept soft)     a  attack/fade-in (s)

const s = (notes, dur, gain, a = 0.02) => ({ notes, dur, gain, a });

export const SFX = {
  // ── UI / menu (Stage 1) — quiet, short, warm ─────────────────────────────
  tap:    s([[523, 0]], 0.11, 0.07),                          // menu nav / start / back tap — soft
  flip:   s([[523, 0], [640, 0.04]], 0.11, 0.07),             // carousel flip — soft page-turn
  select: s([[659, 0], [988, 0.08]], 0.18, 0.09),             // pick a car — up a fifth
  pick:   s([[660, 0]], 0.08, 0.05),                          // shop swatch pick — soft, unobtrusive tick
  back:   s([[587, 0], [440, 0.08]], 0.18, 0.08),             // back — gentle down
  buy:    s([[523, 0], [659, 0.09], [784, 0.18]], 0.28, 0.10), // purchase — soft major arpeggio
  deny:   s([[330, 0], [247, 0.12]], 0.26, 0.10),             // can't afford — mellow down (no buzz)
  toggle: s([[784, 0]], 0.10, 0.07),                          // settings toggle — tiny chime

  // ── Gameplay (Stage 2) ───────────────────────────────────────────────────
  count:  s([[440, 0]], 0.18, 0.10),                          // countdown 3-2-1 pip
  go:     s([[660, 0], [988, 0.07]], 0.28, 0.13),             // GO! — brighter up
  pickup: s([[330, 0]], 0.13, 0.10),                          // tire pickup — a soft bonk (cone-hit character)
  cap:    s([[659, 0], [988, 0.08], [1319, 0.16]], 0.34, 0.10), // cola-cap collect — sparkle up
  checkpoint: s([[988, 0]], 0.10, 0.06),                      // checkpoint — tiny tick
  crash:  s([[150, 0], [104, 0.05]], 0.30, 0.16, 0.006),      // wall/prop — low sine "womp" (toy bump, mag-scaled)
  cone:   s([[200, 0], [140, 0.04]], 0.18, 0.10, 0.006),      // cone knock — a light, soft thud (softened crash)
  finish: s([[523, 0], [784, 0.10], [1047, 0.20], [1319, 0.20]], 0.6, 0.11, 0.012), // finish fanfare — "ta-da-DAAH"
  achieve: s([[659, 0], [880, 0.10], [1175, 0.20]], 0.34, 0.12),             // achievement chime
  record: s([[523, 0], [784, 0.10], [1047, 0.20], [1319, 0.20], [1568, 0.34]], 0.65, 0.12, 0.012), // new record — bigger fanfare
};

// ── Volume ───────────────────────────────────────────────────────────────────
// The settings volume (0..1) maps to a perceptual gain via a squared curve so the low end is
// quiet enough. The UI exposes three discrete levels (a button-row, no slider).
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

// Total wall-clock length of an SFX (s) — when its last voice fully decays. Empty/invalid → 0.
export const totalDuration = (sfx) => {
  if (!sfx || !Array.isArray(sfx.notes) || sfx.notes.length === 0) return 0;
  const dur = sfx.dur ?? 0.2;
  return Math.max(...sfx.notes.map(([, t]) => (t ?? 0) + dur));
};
