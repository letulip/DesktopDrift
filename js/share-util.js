// Pure helpers + layout config for the share-result score card — no DOM, no canvas, so this
// stays unit-testable (js/share-card.js does the browser-only drawing on top of these).

// The game's canonical URL — what the shared link + the baked-in QR both point to.
export const SHARE_URL = 'https://letulip.github.io/DesktopDrift/';

// Score-card layout. The card is a 1080×1080 template PNG (green table, wordmark, coffee/pencil,
// drift trails, baked QR); these anchors place the DYNAMIC layer on top. The "NEW RECORD" badge and
// the "Can you beat/repeat it?" hook are now rendered here (removed from the template) so they can be
// conditional. Left texts are absolute from the left edge; the car anchors its RIGHT rear corner.
export const CARD = {
  w: 1080, h: 1080,
  car:   { rot: -1.082, bodyW: 140, rearFromRight: 398, rearFromBottom: 220 },  // ~28° off vertical; body scaled to 140px wide
  score: { x: 54, baseY: 470, numSize: 156, ppsSize: 66, gap: 22, color: '#ffffff', ppsColor: '#ffb14d' },
  crown: { size: 80, dy: -34, color: '#ffc840' },                               // above the PPS label; drawn only at 600+ PPS (DDK)
  medal: { dy: -8, size: 96 },                                                   // 🏅 above the PPS label; only on a 1-PPS Participation Trophy
  stars: { x: 54, y: 545, size: 32, gap: 76, color: '#ffc840', dimColor: 'rgba(255,255,255,0.24)' },
  track: { x: 54, labelY: 848, nameY: 903, lapFromBottom: 128, labelSize: 20, nameSize: 46, lapSize: 28,
           maxW: 700, labelColor: '#cdb98f', nameColor: '#ffffff', lapColor: '#e6d9b8' },
  newRecord: { fromRight: 56, cy: 96, size: 23, padX: 26, padY: 16, radius: 30, spacing: 2, color: '#ffc840' },  // top-right pill, only on a new record
  hook: { x: 54, fromBottom: 262, size: 42, color: '#ffb14d' },                  // bottom-left italic; "repeat it?" at 1 PPS else "beat it?"
};

// Number of lit stars for a run: 1 per 100 PPS, capped at 5 (mirrors the results screen).
export const litStars = (pps) => Math.max(0, Math.min(5, Math.floor(Math.round(pps || 0) / 100)));

// The caption that rides along with the shared image (Web Share `text`). No URL here — Web Share
// takes the URL separately, and the desktop "Copy link" path copies SHARE_URL on its own.
export const buildShareText = ({ trackName, pps }) =>
  `${Math.round(pps || 0).toLocaleString()} PPS on ${trackName} in Desktop Drift 🏁 Can you beat it?`;

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'run';

// Download filename for the PNG, e.g. "desktop-drift-breakfast-boulevard-685pps.png".
export const shareFilename = ({ trackName, pps }) => `desktop-drift-${slug(trackName)}-${Math.round(pps || 0)}pps.png`;

// Which action to lead with. The native share sheet only works reliably on touch devices —
// desktop browsers often report canShare(files) yet do nothing — so require BOTH file-share
// capability AND a coarse (touch) pointer; otherwise use the desktop download + copy-link path.
export const pickShareMethod = ({ canShareFiles, coarsePointer }) => (canShareFiles && coarsePointer ? 'share' : 'download');
