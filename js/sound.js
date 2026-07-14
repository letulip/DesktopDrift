// Procedural sound effects — a tiny Web Audio synth. Mirrors js/haptics.js: a settings-gated
// wrapper that is safe to call from anywhere and silent when unsupported or turned off. There
// are NO audio files — every SFX is synthesized on the fly from the pure table in sound-params.js.
//
// Voice recipe (soft & atmospheric, per the request): pure SINE oscillators with an EXPONENTIAL
// bell envelope (fade-in + smooth decay — no clicks), routed through a gentle master lowpass and
// a light procedural reverb tail. No harsh waveforms, no noise, no per-frame loop.
import { settings } from './store.js';
import { SFX, gainForVolume, unlockAction } from './sound-params.js';

const _AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);

let _ctx = null;   // shared AudioContext — created lazily on first play/unlock (never at import)
let _bus = null;   // master gain: every voice connects here → lowpass → (dry + reverb) → out

// Runtime-only mute (platform ad breaks — see commercialBreak in js/platform.js).
// A session flag, fully independent from the persisted soundEnabled setting.
let _muted = false;

// True only when Web Audio exists, no runtime mute, AND sound is enabled in
// settings (default on).
const _on = () => !!_AC && !_muted && (settings().soundEnabled ?? true);

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

// ── Drift sound: a reactive slide sample + a whisper-quiet continuous static bed ─
// Two INDEPENDENT layers: (1) the recorded cardboard slide (sounds/drift.mp3), on only while the
// car is actually sliding, its volume + pitch reacting to the slide; and (2) a very quiet
// band-passed noise bed that runs STEADILY the whole time the drift/combo counter is active — a
// continuous body under the slide, not reacting per-wiggle. Both only during a drift, never a drone.
// Path resolved from this module's URL so it works from any page (game + tools/).
const DRIFT_URL = new URL('../sounds/drift.mp3', import.meta.url).href;
let _driftBuf = null, _driftLoad = null, _driftLast = -1;
let _driftSrc = null, _driftGain = null;      // slide-sample layer
let _bedSrc = null, _bedGain = null;          // static-bed layer

const _loadDrift = (ctx) => {
  if (_driftBuf || _driftLoad) return;
  _driftLoad = fetch(DRIFT_URL).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a))
    .then(b => { _driftBuf = b; }).catch(() => { _driftLoad = null; });
};

// 2s of looping white noise for the quiet static bed.
const _bedBuffer = (ctx) => {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
};

// Per-frame drift update. `on` = the car is drifting; `slip` = 0..1 slide intensity. Starts both
// layers on the first sliding frame, tracks volume + pitch to slip, fades out + stops when the
// slide ends. Silent when sound is off; a no-op until the sample has decoded.
export const drift = (sliding, slip = 0, active = false) => {
  if (!_on()) {
    if (_ctx) { if (_driftGain) _driftGain.gain.setTargetAtTime(0.0001, _ctx.currentTime, 0.05);
                if (_bedGain) _bedGain.gain.setTargetAtTime(0.0001, _ctx.currentTime, 0.05); }
    return;
  }
  const ctx = _ensureCtx();
  if (!_driftBuf) { _loadDrift(ctx); return; }
  const s = Math.max(0, Math.min(1, slip || 0));
  const now = ctx.currentTime;
  const vol = gainForVolume(settings().volume);

  // Layer 1 — the reactive cardboard slide: on only while actually sliding; volume + pitch by slip.
  if (sliding && s > 0.02) {
    if (!_driftSrc) {
      _driftGain = ctx.createGain(); _driftGain.gain.value = 0.0001; _driftGain.connect(ctx.destination);   // dry
      _driftSrc = ctx.createBufferSource(); _driftSrc.buffer = _driftBuf; _driftSrc.loop = true;
      _driftSrc.connect(_driftGain); _driftSrc.start(); _driftLast = -1;
    }
    if (Math.abs(s - _driftLast) >= 0.02) {
      _driftLast = s;
      _driftGain.gain.setTargetAtTime(vol * (0.05 + 0.13 * s), now, 0.06);   // kept in line with the SFX so it doesn't drown them
      _driftSrc.playbackRate.setTargetAtTime(0.9 + 0.4 * s, now, 0.08);   // harder slide → higher
    }
  } else if (_driftSrc) {
    const src = _driftSrc, g = _driftGain; _driftSrc = _driftGain = null; _driftLast = -1;
    g.gain.setTargetAtTime(0.0001, now, 0.06);
    try { src.stop(now + 0.25); } catch (e) { /* already stopped */ }
  }

  // Layer 2 — the whisper-quiet static bed: runs steadily the whole time the drift counter is
  // active (not per-wiggle), a hair under the slide, so the drift has a continuous body.
  if (active) {
    if (!_bedSrc) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 0.5;
      _bedGain = ctx.createGain(); _bedGain.gain.value = 0.0001; bp.connect(_bedGain); _bedGain.connect(ctx.destination);
      _bedSrc = ctx.createBufferSource(); _bedSrc.buffer = _bedBuffer(ctx); _bedSrc.loop = true; _bedSrc.connect(bp); _bedSrc.start();
      _bedGain.gain.setTargetAtTime(vol * 0.004, now, 0.25);   // steady, VERY quiet
    }
  } else if (_bedSrc) {
    const bs = _bedSrc, bg = _bedGain; _bedSrc = _bedGain = null;
    bg.gain.setTargetAtTime(0.0001, now, 0.15);
    try { bs.stop(now + 0.3); } catch (e) { /* already stopped */ }
  }
};

// Hard-stop both drift layers (race teardown / new race).
export const stopDrift = () => {
  if (!_driftSrc && !_bedSrc) return;
  try { if (_driftSrc) { _driftSrc.stop(); _driftSrc.disconnect(); _driftGain.disconnect(); } } catch (e) { /* noop */ }
  try { if (_bedSrc) { _bedSrc.stop(); _bedSrc.disconnect(); _bedGain.disconnect(); } } catch (e) { /* noop */ }
  _driftSrc = _driftGain = _bedSrc = _bedGain = null; _driftLast = -1;
};

// Suspend/resume the shared context. Suspend on pause / tab-hide / engine teardown so a weak
// device isn't kept awake; resume on the next gesture or when the tab returns.
export const suspend = () => { if (_ctx && _ctx.state === 'running') _ctx.suspend(); };
export const resume  = () => { if (_on() && _ctx && _ctx.state === 'suspended') _ctx.resume(); };

// Runtime mute switch for platform adapters (ad breaks): gates every new sound
// via _on() (so nothing can auto-resume the context while muted) and suspends
// the live context so already-playing layers fall silent too. Does NOT touch
// persisted settings in store.js. Safe to call anywhere; never throws.
export const setMuted = (m) => {
  _muted = !!m;
  if (_muted) suspend(); else resume();
};

// Unlock the AudioContext on a user gesture (browsers block audio until one) and keep it in
// step with tab visibility. Registered at import; a no-op under Node/tests (no window).
// NOT once-listeners: a gesture may fail to grant activation — desktop Firefox never grants it
// for arrow keys (they match built-in browser shortcuts, which are excluded), so an arrows-only
// race would consume a once-listener and stay silent. The listeners stay armed, retry resume()
// on every gesture, and detach only once the context is actually running. While runtime-muted
// (ad break) unlockAction returns 'none', so nothing can auto-resume — see setMuted.
if (typeof window !== 'undefined') {
  const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'];
  const unlock = () => {
    const action = unlockAction(_on(), _ctx ? _ctx.state : 'suspended');
    if (action === 'resume') { const ctx = _ensureCtx(); if (ctx.state === 'suspended') ctx.resume(); }
    else if (action === 'disarm') for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlock, true);
  };
  for (const ev of UNLOCK_EVENTS)
    window.addEventListener(ev, unlock, { capture: true });
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else resume(); });
}
