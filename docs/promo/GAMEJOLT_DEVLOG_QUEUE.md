# Game Jolt devlog queue — Desktop Drift

Post cadence: **1 per week.** Each entry = a **teaser** (≤250 chars, shows in the
feed) + an **article** (attached long-form, "Read article") in a developer voice.
Attach the listed media (Images/GIFs) and, where relevant, tag the **Game Dev**
and **Indie Games** communities. Cross-post the same material to the YouTube
devlog.

Style rule: short dash only (`–`), never the long em dash. Honesty rule: where a
post touches how the game was built, be straight that it's an AI-assisted solo
project (see Week 6) — the repo is public and the commit history shows it.

Launch post (already published): the owner's "It's out!" teaser.

---

## Week 1 — Reversed tracks
**Teaser:** Every track in Desktop Drift plays two ways. Beat a course, then flip it: reversed mode remaps the whole racing line, so 6 tracks become 12. Same desk, completely different corners. Write-up on how (and why) below 👇
**Article title:** Design note: doubling the content by driving backwards
**Article:** One of the cheapest, highest-value things I did was let every track run in reverse. It sounds trivial, but a racing line isn't symmetric: the corner you drift into at speed becomes the one you set up early, blind rises become blind drops, and the ideal braking points move entirely. It isn't a mirror image either – I flip the checkpoint order and re-derive the centerline, so the physics and scoring treat it as a genuinely new track. Six hand-made tracks became twelve, and honestly some are more fun backwards.
**Attach:** `docs/promo/screenshots/ui-desk-track-select.png`

## Week 2 — Tire-coin economy
**Teaser:** Drift clean, get paid. Desktop Drift has a soft currency you earn by driving well, then spend on looks – paint, neon, trail colours. No pay-to-win: skill is the only currency. How I kept it fair, below 👇
**Article title:** Design note: an economy that can't buy you speed
**Article:** I wanted a reward loop without wrecking the leaderboards, so the currency (tire-coins) only ever buys cosmetics and new cars – never raw performance. You earn by finishing and by drifting well, which means the fun thing to do and the profitable thing to do are the same thing. The trap I avoided: letting money buy grip or speed would make records incomparable and turn a skill game into a grind. Everything you can spend on is expression, not advantage.
**Attach:** `docs/promo/screenshots/ui-desk-garage.png`

## Week 3 — Neon underglow
**Teaser:** New: neon underglow. Six zones under your car, your colours, your animation – it lights up the desk when you slide through a dark corner. A drift car needs to glow 🌈 How it's rendered, below 👇
**Article title:** How the underglow is drawn (no shaders)
**Article:** The neon is pure Canvas 2D – no WebGL, no shader. Each car gets up to six glow zones; I draw them as blurred, additively-blended shapes under the body using shadowBlur and a couple of layered passes, then animate the colour and intensity over time. On a dark track surface the glow reads beautifully; on a light one I dial it back so it doesn't wash out. It's a good example of the whole game's philosophy: get an expensive-looking effect out of cheap, built-in browser primitives.
**Attach:** `docs/promo/assets/devlog-neon.png`

## Week 4 — Mood eyes
**Teaser:** Tiny update, big grin: your car can wear googly eyes now. Joy, sleepy, lol – they ride on the windshield and follow the glass tint. Purely for fun, peak engineering 👀 The (silly) details below 👇
**Article title:** The most over-engineered pointless feature I've shipped
**Article:** The cars can wear eyes now. There's a whole tiny system behind it: each mood is a hand-drawn SVG per car, layered on the windshield, tinted to match the glass, surviving paint changes and drifting. Does it affect gameplay? Zero. Did I spend a suspicious amount of time getting the "joy" eyes to sit right? Absolutely. Sometimes the point of a solo project is that you get to build the dumb, delightful thing just because it makes you smile.
**Attach:** `docs/promo/assets/devlog-mood-eyes.png`

## Week 5 — Achievements
**Teaser:** 60+ achievements hide in Desktop Drift – some obvious, some secret. Perfect donuts, clean sweeps, a 600-PPS crown. How the whole system runs without an event bus, below 👇
**Article title:** How 60+ achievements evaluate with no event system
**Article:** Most games wire achievements to an event bus. I didn't – it's a pull model. One pure function, evaluate(context), called at two moments (race finish, and on purchase), looks at your stats and decides what unlocked. No pub/sub, no listeners scattered through the engine, and it's fully unit-testable because it's just data in, unlocks out. It scales with the track count too, so adding a track automatically adds its per-track goals. Simpler than it sounds, and much easier to reason about.
**Attach:** `docs/promo/screenshots/ui-desk-achievements.png`

## Week 6 — No engine / how it's built  *(honest AI note)*
**Teaser:** Under the hood: Desktop Drift runs on no engine and no framework – just JavaScript on a Canvas, ~1.4 MB total, custom drift physics. Here's how it's built, and how I built it, below 👇
**Article title:** No engine, ~1.4 MB, and an AI pair-programmer
**Article:** Desktop Drift has no game engine under it – no Unity, no Godot, no framework. It's vanilla JavaScript on an HTML5 Canvas, and the whole game is about 1.4 MB, smaller than one photo. The drift model is custom: each frame the velocity splits into forward and lateral parts, grip falls off with a little wobble so the rear steps out, and a combo multiplier rewards clean slides. I'll also be straight about how it was made: I built it solo, but with an AI coding assistant as a pair-programmer – I did the design, the tuning, the art and the direction, and leaned on the AI heavily for the code, fixing the layout by hand where it struggled. It's been a genuinely new way to build, and I'm happy to talk about what worked and what didn't.
**Attach:** `docs/promo/assets/cover-630x500.gif`

## Week 7 — Sound
**Teaser:** Turn it up. That drift slide you hear? A real cardboard box dragged across a desk, sampled and looped – toy-car drift, the analog way. Plus procedural Web Audio for the UI. The sound story below 👇
**Article title:** The drift sound is a cardboard box
**Article:** I tried synthesizing the tyre slide and it always sounded like an angry insect. So I did the dumb physical thing: dragged a cardboard box across a desk, recorded it, and looped the good part. That's the drift you hear – a toy-scale slide for a toy-scale game, and it fits the tabletop theme better than anything procedural did. The UI blips and menu sounds are the opposite: fully procedural Web Audio, generated in code, zero files. Two different approaches, picked per-sound by what actually sounded right.
**Attach:** `docs/promo/assets/gameplay-master.mp4` (has audio)

## Week 8 — What's next / roadmap
**Teaser:** Desktop Drift is out and free, but it's not finished. Coming: performance tuning, a ghost car to race your own best lap, and more tracks. Where it's headed, and how to steer it, below 👇
**Article title:** Where Desktop Drift goes from here
**Article:** The game's live, but the roadmap is long. Next I want per-car tuning (grip/thrust/steer that unlocks as you clear tracks), a ghost car so you can race your own best lap, and more hand-made tracks. Further out there's the online era – leaderboards and cloud saves – but only once the single-player loop is as good as it can be. If you play it and something feels off, or you've got an idea, tell me: this is a solo project and player feedback genuinely steers it. Follow along here or on the devlog (youtube.com/@DesktopDrift).
**Attach:** `docs/promo/screenshots/desk-gameplay-devdesk-nearmiss.png`
