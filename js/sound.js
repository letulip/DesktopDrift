// Procedural sound effects — a tiny Web Audio synth. Mirrors js/haptics.js: a settings-gated
// wrapper that is safe to call from anywhere and silent when unsupported or turned off. There
// are NO audio files — every SFX is synthesized on the fly from the pure table in sound-params.js.
//
// Voice recipe (soft & atmospheric, per the request): pure SINE oscillators with an EXPONENTIAL
// bell envelope (fade-in + smooth decay — no clicks), routed through a gentle master lowpass and
// a light procedural reverb tail. No harsh waveforms, no noise, no per-frame loop.
import { settings } from './store.js';
import { SFX, gainForVolume } from './sound-params.js';

const _AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);

let _ctx = null;   // shared AudioContext — created lazily on first play/unlock (never at import)
let _bus = null;   // master gain: every voice connects here → lowpass → (dry + reverb) → out

// True only when Web Audio exists AND sound is enabled in settings (default on).
const _on = () => !!_AC && (settings().soundEnabled ?? true);

// A short procedural reverb impulse: exponentially-decaying stereo noise. Gives the chimes an
// airy tail without any asset file (built once, reused by the convolver).
const _impulse = (ctx, seconds = 1.0, decay = 3.4) => {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
};

const _ensureCtx = () => {
  if (_ctx) return _ctx;
  _ctx = new _AC();
  // Bus → gentle lowpass (rounds off any harsh top) → destination (dry), plus a parallel
  // convolver reverb send mixed in low for a soft, semi-atmospheric tail.
  _bus = _ctx.createGain(); _bus.gain.value = 1;
  const lp = _ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.4;
  const conv = _ctx.createConvolver(); conv.buffer = _impulse(_ctx);
  const wet = _ctx.createGain(); wet.gain.value = 0.16;   // subtle reverb mix
  _bus.connect(lp);
  lp.connect(_ctx.destination);                            // dry path
  lp.connect(conv); conv.connect(wet); wet.connect(_ctx.destination);   // wet tail
  return _ctx;
};

// Render a params object (an SFX-table entry or an ad-hoc one) through the master bus. Each note
// is a sine with an exponential attack + decay bell — the smooth, non-clicky envelope that keeps
// the sounds gentle. `mag` (0..1) scales overall loudness (crash uses it).
const _render = (sfx, mag) => {
  const ctx = _ensureCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const loud = gainForVolume(settings().volume) * Math.max(0, Math.min(1, mag ?? 1));
  if (loud <= 0) return;
  const t0 = ctx.currentTime + 0.001;
  const dur = sfx.dur ?? 0.2, a = sfx.a ?? 0.02;
  const peak = Math.max(0.0002, loud * (sfx.gain ?? 0.1));
  for (const [f, dt] of sfx.notes) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    o.connect(g); g.connect(_bus);
    const t = t0 + (dt ?? 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);        // gentle fade-in (no click)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur); // bell decay
    o.start(t); o.stop(t + a + dur + 0.05);
  }
};

// Per-id minimum gap (ms) for sounds that can fire in rapid bursts during a race — keeps the
// mix from turning into a machine-gun of blips (the over-saturation risk). Others are unthrottled.
const _MIN_GAP = { pickup: 70, cone: 90, crash: 90, checkpoint: 130, pick: 50 };
const _lastAt = {};

// Play a named SFX. `mag` (0..1) optionally scales loudness (crash so a harder hit is a touch
// louder). Silent when sound is off/unsupported, the id is unknown, or it's still within the
// throttle window for a burst-prone sound.
export const play = (id, mag = 1) => {
  if (!_on()) return;
  const gap = _MIN_GAP[id];
  if (gap != null) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now - (_lastAt[id] || 0) < gap) return;
    _lastAt[id] = now;
  }
  const sfx = SFX[id];
  if (sfx) _render(sfx, mag);
};

// Play an ad-hoc params object (same shape as an SFX entry) — used by the sound-lab dev tool.
export const playParams = (sfx, mag = 1) => {
  if (!_on() || !sfx || !Array.isArray(sfx.notes)) return;
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
  pick:       () => play('pick'),
  count:      () => play('count'),
  go:         () => play('go'),
  pickup:     () => play('pickup'),
  cap:        () => play('cap'),
  checkpoint: () => play('checkpoint'),
  crash:      (mag = 1) => play('crash', mag),
  cone:       () => play('cone'),
  finish:     () => play('finish'),
  achieve:    () => play('achieve'),
  record:     () => play('record'),
};

// Navigate to `href` after a soft cue, deferring the unload just long enough for the sound to be
// heard — an AudioContext dies with its page, so an un-deferred nav would cut the sound off.
export const soundThenGo = (href, id = 'tap', ms = 100) => { play(id); setTimeout(() => { location.href = href; }, ms); };
export const tapThenGo = (href, ms = 100) => soundThenGo(href, 'tap', ms);

// ── Continuous movement rustle ────────────────────────────────────────────────
// A dry, filtered-noise "rolling on the table" texture whose volume + brightness follow the
// car's speed. Routed straight to the output — NO reverb (the request was a *dry* rustle). This
// is the game's only continuous voice: created lazily, updated per frame by movement(), and torn
// down by stopMovement() when the race ends.
let _moveSrc = null, _moveFilt = null, _moveGain = null, _moveLast = -1;

const _ensureMove = (ctx) => {
  if (_moveSrc) return;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  _moveSrc = ctx.createBufferSource();
  _moveSrc.buffer = buf; _moveSrc.loop = true;
  _moveFilt = ctx.createBiquadFilter(); _moveFilt.type = 'bandpass'; _moveFilt.frequency.value = 1600; _moveFilt.Q.value = 0.7;
  _moveGain = ctx.createGain(); _moveGain.gain.value = 0.0001;
  _moveSrc.connect(_moveFilt); _moveFilt.connect(_moveGain); _moveGain.connect(ctx.destination);   // dry, no reverb
  _moveSrc.start();
};

// Per-frame movement update. `spd` is 0..1 (speed / top speed). Ramps the rustle's volume +
// brightness toward the current speed with a short time-constant (self-smoothing, no zipper
// noise). Cheap: skips redundant AudioParam writes when speed hasn't moved ~1%. Silent when
// sound is off (ducks a running rustle) or nearly stopped.
export const movement = (spd) => {
  if (!_on()) { if (_moveGain && _ctx) _moveGain.gain.setTargetAtTime(0.0001, _ctx.currentTime, 0.05); return; }
  const ctx = _ensureCtx();
  _ensureMove(ctx);
  const s = Math.max(0, Math.min(1, spd || 0));
  if (Math.abs(s - _moveLast) < 0.01) return;
  _moveLast = s;
  const vol = gainForVolume(settings().volume);
  const target = s < 0.03 ? 0.0001 : vol * (0.04 + 0.12 * s);   // soft — a texture beneath the SFX
  _moveGain.gain.setTargetAtTime(target, ctx.currentTime, 0.09);
  _moveFilt.frequency.setTargetAtTime(1400 + 2200 * s, ctx.currentTime, 0.09);   // brighter as it speeds up
};

// Stop + free the rustle voice (race teardown / new race). Safe to call when nothing is running.
export const stopMovement = () => {
  if (!_moveSrc) return;
  try { _moveSrc.stop(); } catch { /* already stopped */ }
  try { _moveSrc.disconnect(); _moveFilt.disconnect(); _moveGain.disconnect(); } catch { /* noop */ }
  _moveSrc = _moveFilt = _moveGain = null; _moveLast = -1;
};

// Suspend/resume the shared context. Suspend on pause / tab-hide / engine teardown so a weak
// device isn't kept awake; resume on the next gesture or when the tab returns.
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
