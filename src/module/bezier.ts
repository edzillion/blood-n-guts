/**
 * Get point along a quadratic Bézier curve.
 * @function
 * @param {PIXI.Point} p1 - start point.
 * @param {PIXI.Point} pc - control point.
 * @param {PIXI.Point} p2 - end point.
 * @param {number} t - time in the curve (between 0 and 1).
 * @returns {number, number} - x,y position along the curve.
 */
export function getPointAt(p1: PIXI.Point, pc: PIXI.Point, p2: PIXI.Point, t: number): { x: number; y: number } {
  let x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * pc.x + t * t * p2.x;
  let y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * pc.y + t * t * p2.y;

  x = Math.round(x);
  y = Math.round(y);
  return { x, y };
}

/**
 * Get derivative along a quadratic Bézier curve.
 * @function
 * @param {PIXI.Point} p1 - start point.
 * @param {PIXI.Point} pc - control point.
 * @param {PIXI.Point} p2 - end point.
 * @param {number} t - time in the curve (between 0 and 1).
 * @returns {number, number} - x,y derivative along the curve.
 */
export function getDerivativeAt(p1: PIXI.Point, pc: PIXI.Point, p2: PIXI.Point, t: number): { x: number; y: number } {
  const d1 = { x: 2 * (pc.x - p1.x), y: 2 * (pc.y - p1.y) };
  const d2 = { x: 2 * (p2.x - pc.x), y: 2 * (p2.y - pc.y) };

  const x = (1 - t) * d1.x + t * d2.x;
  const y = (1 - t) * d1.y + t * d2.y;

  return { x, y };
}
