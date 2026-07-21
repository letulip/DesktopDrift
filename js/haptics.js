// Haptic feedback — wraps the Vibration API (Android Chrome only).
// iOS Safari has never implemented navigator.vibrate; the guard keeps this silent there.
// All exported functions are safe to call on any platform.

import { settings } from './store.js';

// True only when the browser actually exposes the Vibration API.
const _api = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// Returns true if haptics are both available and enabled in settings.
const _on = () => _api && (settings().haptics ?? true);

// Short tap — knocked a cone.
export const hapticCone = () => { if (_on()) navigator.vibrate(18); };

// Light tick — passed an intermediate checkpoint (positive progress cue; kept subtle since these
// fire every few seconds).
export const hapticCheckpoint = () => { if (_on()) navigator.vibrate(12); };

// Double thud — hit a wall or a prop obstacle at speed.
export const hapticCrash = () => { if (_on()) navigator.vibrate([35, 15, 25]); };
