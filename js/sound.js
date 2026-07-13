// Procedural sound effects — a tiny Web Audio synth. Mirrors js/haptics.js: a settings-gated
// wrapper that is safe to call from anywhere and silent when unsupported or turned off. There
// are NO audio files — every SFX is synthesized on the fly from the pure table in sound-params.js
// (toy-car arcade: soft discrete blips only, no engine drone / tyre skid, no per-frame loop).
import { settings } from './store.js';
import { SFX, gainForVolume, clampVolume } from './sound-params.js';

const _AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);

let _ctx = null;       // shared AudioContext — created lazily on first play/unlock (never at import)
let _master = null;    // master gain node feeding the destination
let _noiseBuf = null;  // cached white-noise buffer, reused by every noise voice

// True only when Web Audio exists AND sound is enabled in settings (default on).
const _on = () => !!_AC && (settings().soundEnabled ?? true);

const _ensureCtx = () => {
  if (_ctx) return _ctx;
  _ctx = new _AC();
  _master = _ctx.createGain();
  _master.gain.value = 1;
  _master.connect(_ctx.destination);
  return _ctx;
};

// One second of mono white noise, built once and shared (crash thud / cone clonk voices).
const _noise = (ctx) => {
  if (_noiseBuf) return _noiseBuf;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  _noiseBuf = buf;
  return buf;
};

// Schedule one voice-step (an oscillator or a noise burst) with an attack/release envelope.
// `loud` is the resolved master loudness (0..1); the step's own gain scales it.
const _step = (ctx, dest, st, t0, loud) => {
  const peak  = loud * (st.gain ?? 0.2);
  if (peak <= 0) return;
  const start = t0 + (st.t ?? 0);
  const a = st.a ?? 0.005, r = st.r ?? 0.06, dur = Math.max(st.a ?? 0.005, st.dur ?? 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + a);
  g.gain.setValueAtTime(peak, start + dur);
  g.gain.linearRampToValueAtTime(0, start + dur + r);

  let src;
  if (st.type === 'noise') {
    src = ctx.createBufferSource();
    src.buffer = _noise(ctx);
    if (st.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = st.lp;
      src.connect(g); g.connect(f); f.connect(dest);
    } else {
      src.connect(g); g.connect(dest);
    }
  } else {
    src = ctx.createOscillator();
    src.type = st.type ?? 'sine';
    src.frequency.setValueAtTime(st.f ?? 440, start);
    if (st.f2) src.frequency.linearRampToValueAtTime(st.f2, start + dur);
    src.connect(g); g.connect(dest);
  }
  src.start(start);
  src.stop(start + dur + r + 0.02);
};

// Render a params object (an SFX-table entry or an ad-hoc one) through the master bus.
const _render = (sfx, mag) => {
  const ctx = _ensureCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const loud = gainForVolume(settings().volume) * Math.max(0, Math.min(1, mag ?? 1));
  const t0 = ctx.currentTime + 0.001;
  for (const st of sfx.steps) _step(ctx, _master, st, t0, loud);
};

// Play a named SFX. `mag` (0..1) optionally scales loudness (crash uses it so a harder hit is
// a touch louder). Silent when sound is off/unsupported or the id is unknown.
export const play = (id, mag = 1) => {
  if (!_on()) return;
  const sfx = SFX[id];
  if (sfx) _render(sfx, mag);
};

// Play an ad-hoc params object (same shape as an SFX entry) — used by the sound-lab dev tool.
export const playParams = (sfx, mag = 1) => {
  if (!_on() || !sfx || !Array.isArray(sfx.steps)) return;
  _render(sfx, mag);
};

// Named convenience helpers — the wiring calls these (like hapticCone/hapticCrash).
export const sfx = {
  tap:        () => play('tap'),
  flip:       () => play('flip'),
  select:     () => play('select'),
  back:       () => play('back'),
  buy:        () => play('buy'),
  deny:       () => play('deny'),
  toggle:     () => play('toggle'),
  count:      () => play('count'),
  go:         () => play('go'),
  pickup:     () => play('pickup'),
  cap:        () => play('cap'),
  checkpoint: () => play('checkpoint'),
  lap:        () => play('lap'),
  crash:      (mag = 1) => play('crash', clampVolume(mag)),
  cone:       () => play('cone'),
  transition: () => play('transition'),
  nearmiss:   () => play('nearmiss'),
  bank:       () => play('bank'),
  combobreak: () => play('combobreak'),
  finish:     () => play('finish'),
  achieve:    () => play('achieve'),
  record:     () => play('record'),
};

// Suspend/resume the shared context. Suspend on pause / tab-hide / engine teardown so a
// weak device isn't kept awake; resume on the next gesture or when the tab returns.
export const suspend = () => { if (_ctx && _ctx.state === 'running') _ctx.suspend(); };
export const resume  = () => { if (_on() && _ctx && _ctx.state === 'suspended') _ctx.resume(); };

// Unlock the AudioContext on the first user gesture (browsers block audio until then) and keep
// it in step with tab visibility. Registered once at import; a no-op under Node/tests (no window).
if (typeof window !== 'undefined') {
  const unlock = () => { if (_on()) { const ctx = _ensureCtx(); if (ctx.state === 'suspended') ctx.resume(); } };
  for (const ev of ['pointerdown', 'keydown', 'touchend'])
    window.addEventListener(ev, unlock, { once: true, capture: true });
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else resume(); });
}
