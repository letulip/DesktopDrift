// "Dev Desk" track (Office Overdrive) — generated from tracks/dev-desk.svg.
// Light desk in a dark room → dark startLine so the finish flag reads on the pale surface.
import { makeTrack, TRACK_HALF, CONE_R, K, CP_R } from './track-factory.js';

export { TRACK_HALF, CONE_R, K, CP_R };

export const {
  center, outer, inner, cones, TABLE,
  props, collectibles, checkpoints,
  startPos, startAngle, id, laps, theme,
} = await makeTrack({
  svgPath: './tracks/dev-desk.svg',
  id:      'dev-desk',
  laps:    3,
  tires:   12,   // seeded along the centerline (see js/tire-seed.js); must match registry `tires`
  theme:   {
    background: '#1b2230',
    table:      '#d9dde2',
    tableEdge:  '#aab2bd',
    track:      '#c7bda4',
    skid:       'rgba(40,46,58,0.5)',
    checkpoint: 'rgba(0,207,255,0.55)',
    cone:       '#ff7a1a',
    startLine:  '#3a4150',   // dark flag on a light table
  },
});
