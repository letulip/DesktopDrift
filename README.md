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

**Vehicles:** Eight top-down cars — two free starters (Bismark, Panda) plus six unlockable in the in-game tire shop, each with its own handling profile (thrust, grip, steer) shown as spd/hdl/acc stat bars, plus customizable body colour, neon underglow and paint finish. Choose and buy cars in the coverflow garage carousel.

**Dynamic Tracks:** Procedurally smoothed track generation (Chaikin algorithm) with dynamic obstacle placement (plates, bowls, knives).

**UI/HUD:** Real-time minimap, lap timers, best lap tracking, score, and on-screen dynamic combo feedback.

**Responsive Controls:** Split-screen touch steering for mobile devices and keyboard support for desktop.

**Game Modes:** Time Attack (PPS records + star ratings, first-clear bonus), Sandbox free-roam, and Zen drift.

**Collectibles & Tire Economy:** Cola caps (collected by drifting a donut around them) and tire coins — a soft currency. A wallet with a tap-to-open transaction history.

**Garage & Shop:** Per-car customization — body colour, neon underglow, paint finishes (matte / metallic / pearl / chrome) and drift-trail colours, bought with tires. Purchases are account-wide; the equipped look is saved per car.

**Achievements:** Dozens of achievements (visible + hidden) with tire rewards — progression, skill, combo, endurance / dedication / wealth ladders, and DDK "6-star crown" mastery. A dedicated achievements page with live progress bars.

**Reversed Tracks:** Every track has a mirrored reverse variant, unlocked by earning 3 stars on the forward version — doubling the content.

**Profile Sync:** Export your full progress as a code or file in Settings and import it on another device. Optional haptic feedback on mobile.

## 🚧 Roadmap

- ✅ Collectibles & tire-coin economy (cola caps, tires, in-garage shop)
- ✅ Car customization (body colour, neon FX, paint finish, drift trail)
- ✅ Game modes (Time Attack, Sandbox, Zen)
- ✅ Reversed track variants (6 tracks × 2 directions)
- ✅ Achievements (with tire rewards)
- ✅ New cars in the tire shop (8 cars, 6 buyable)
- ✅ Profile sync (export / import your save)
- 🔜 Per-car records
- 🔜 Tuning parts, car classes & options

## Source Code & License

This project is **source-available** under the [PolyForm Shield License 1.0.0](LICENSE).

**The [LICENSE](LICENSE) file is the authoritative text; if this summary and LICENSE disagree, LICENSE wins.**

In plain words:

- **✅ Allowed:**
  - Reading, forking, and studying the code for learning.
  - Running the app locally for personal use.
  - Creating private modifications for your own gameplay.
  - Passing copies along, provided the license terms and the Required Notice travel with them.
  - Submitting bug reports or feature suggestions via Issues.

- **❌ Not allowed:**
  - Providing any product that competes with this game – a public deployment of it (or a derivative), a portal build, a commercial reskin, a competing tennis management game built from this code. Free of charge still counts as competing.
  - Stripping the license terms or the Required Notice from copies you pass along.

**Why this model?**
We believe in transparency (you can check the math, the economy, and the match engine) – but `Ties Break: Ace Parent` is a commercial creative work. PolyForm Shield keeps the learning open and the competing closed. If you'd like to use the code beyond what the license grants (e.g., for a port, adaptation, or institutional use), please reach out via GitHub Issues.

**Privacy:** everything stays on your device – no accounts, no analytics, no third-party requests. Details in [PRIVACY.md](PRIVACY.md).

**Contributions:**
We welcome community feedback and suggestions. However, we do not accept unsolicited pull requests that add new features – we want to keep the creative vision coherent. If you'd like to contribute, please open an Issue first to discuss. See [CONTRIBUTING.md](CONTRIBUTING.md).

© 2026 Igor Vladimirskiy. All rights reserved where not licensed.
