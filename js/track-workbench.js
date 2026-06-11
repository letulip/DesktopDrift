// "Workbench" track — generated from tracks/workbench.svg.
// This track uses both <line> and <path> proxy elements for items.
import { makeTrack, TRACK_HALF, CONE_R, K, CP_R } from './track-factory.js';

export { TRACK_HALF, CONE_R, K, CP_R };

export const {
  center, outer, inner, cones, TABLE,
  props, collectibles, checkpoints,
  startPos, startAngle, id, laps, theme,
} = await makeTrack({
  svgPath: './tracks/workbench.svg',
  id:      'workbench',
  laps:    3,
  theme:   {
    background: '#181d1d',
    table:      '#574b39',
    tableEdge:  '#837a68',
    track:      '#9a8c6f',
    skid:       'rgba(14,12,8,0.55)',
    checkpoint: 'rgba(125,212,255,0.5)',
    cone:       '#ff7a1a',
  },
});
