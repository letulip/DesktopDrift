// "Steel Kitchen" track — generated from tracks/steel-kitchen.svg.
import { makeTrack, TRACK_HALF, CONE_R, K, CP_R } from './track-factory.js';

export { TRACK_HALF, CONE_R, K, CP_R };

export const {
  center, outer, inner, cones, TABLE,
  props, collectibles, checkpoints,
  startPos, startAngle, id, laps, theme,
} = await makeTrack({
  svgPath: './tracks/steel-kitchen.svg',
  id:      'steel-kitchen',
  laps:    3,
  theme:   {
    background:    '#c6cace',
    table:         '#6b7178',
    tableEdge:     '#444a50',
    track:         '#c6bca1',
    skid:          'rgba(30,34,40,0.5)',
    checkpoint:    'rgba(60,120,160,0.6)',
    cone:          '#ff7a1a',
  },
});
