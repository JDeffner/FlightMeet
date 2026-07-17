// Wind helpers. Wind matters a lot to paraglider pilots, so we surface both the
// source direction (the compass letter they quote, e.g. "NW wind") and a flow
// arrow that points the way the air is actually moving.

const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
]

/**
 * 16-point compass letter for a bearing in degrees. This is the direction the
 * wind blows *from* (meteorological convention), which is how pilots name it.
 */
export function compassPoint(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 22.5) % 16
  return COMPASS_16[index]
}

/**
 * Rotation (in degrees) for an up-pointing arrow so it flows the way the wind
 * blows *toward*. Wind from the north (0deg) travels south, so the up arrow is
 * turned 180deg to point down.
 */
export function windFlowRotation(degrees: number): number {
  return degrees + 180
}
