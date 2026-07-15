# Credits & third-party assets

Nearly everything in Desktop Drift is original or generated in code. The only
bundled third-party media is one sound effect, recorded below for provenance.

## Audio

### `sounds/drift.mp3` — drift slide
- **What it is:** the car's drift sound — a ~1.7 s fragment of a cardboard-box
  slide/rustle, trimmed, level-adjusted and looped in-game as the slide layer.
- **Source:** Pixabay — https://pixabay.com/sound-effects/household-cardboard-box-slides-and-rustling-31817/
- **Author:** freesound_community (Pixabay uploader; mirrors CC0 Freesound content)
- **License:** Pixabay Content License — https://pixabay.com/service/license-summary/
  (free for commercial + non-commercial use, **no attribution required**; credited
  here voluntarily for our own records).
- **Modifications:** cut to a ~1.7 s fragment, +6 dB gain, downmixed to mono,
  short fade in/out.

## Everything else (no external files)

All other sound effects — menu taps, pickups, crashes, the finish fanfare, the
drift's quiet static bed, etc. — are **synthesized procedurally** in
`js/sound.js` / `js/sound-params.js` (Web Audio oscillators + noise). No samples,
no libraries, nothing to license.
