# Desktop Drift 🚗💨 (Work in Progress)

Desktop Drift – is a top-down arcade drift racing game set on a kitchen (and not only) table. Built entirely with Vanilla JavaScript and HTML5 Canvas, it features a custom 2D physics engine focused on satisfying drifting mechanics and combo systems.

The game is fully PWA-ready (Progressive Web App), allowing users to install it directly to their devices and play offline.

Try the gameplay here https://letulip.github.io/DesktopDrift/

Follow my Devlog on YouTube https://www.youtube.com/@DesktopDrift

## 🛠 Tech Stack

**Core:** Vanilla JavaScript (ES6 Modules)

**Rendering:** HTML5 Canvas API (Procedural rendering + SVG support)

**Platform:** Web / PWA (Service Worker, Web App Manifest)

**No Dependencies:** Zero external frameworks or libraries.

## ✨ Current Features (WIP)

**Custom 2D Physics:** Frame-independent physics engine tuned for smooth drifting, grip wobble, and oversteer.

**Combo System:** Chain drifts, near-misses (dodging cones and kitchen props), and quick transitions to build multipliers and high scores.

**Vehicles:** Multiple playable cars (based on real-world examples) with unique handling parameters (thrust, grip, steer smoothness) and customizable body colors.

**Dynamic Tracks:** Procedurally smoothed track generation (Chaikin algorithm) with dynamic obstacle placement (plates, bowls, knives).

**UI/HUD:** Real-time minimap, lap timers, best lap tracking, score, and on-screen dynamic combo feedback.

**Responsive Controls:** Split-screen touch steering for mobile devices and keyboard support for desktop.

**Game Modes:** Time Attack (PPS records + star ratings, first-clear bonus), Sandbox free-roam, and Zen drift.

**Collectibles & Tire Economy:** Cola caps (collected by drifting a donut around them) and tire coins — a soft currency. A wallet with a tap-to-open transaction history.

**Garage & Shop:** Per-car customization — body colour, neon underglow, paint finishes (matte / metallic / pearl / chrome) and drift-trail colours, bought with tires. Purchases are account-wide; the equipped look is saved per car.

## 🚧 Roadmap

- ✅ Collectibles & tire-coin economy (cola caps, tires, in-garage shop)
- ✅ Car customization (body colour, neon, paint finish, drift trail)
- ✅ Game modes (Time Attack, Sandbox, Zen)
- 🔜 Reversed track variants + more tracks
- 🔜 Achievements (with tire rewards)
- 🔜 More cars + per-car records
- 🔜 Tuning parts, car classes & options
