import type { TimeSeriesPoint } from "@/types";

export interface ChartGeometry {
  width: number;
  height: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;
  innerWidth: number;
  innerHeight: number;
}

export function geometry(
  width: number,
  height: number,
  pad: { top?: number; right?: number; bottom?: number; left?: number } = {},
): ChartGeometry {
  const padTop = pad.top ?? 16;
  const padRight = pad.right ?? 12;
  const padBottom = pad.bottom ?? 28;
  const padLeft = pad.left ?? 36;
  return {
    width,
    height,
    padTop,
    padRight,
    padBottom,
    padLeft,
    innerWidth: width - padLeft - padRight,
    innerHeight: height - padTop - padBottom,
  };
}

/** "Nice" axis maximum so gridlines land on round numbers. */
export function niceMax(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

export function ticksFor(max: number, count = 4): number[] {
  // Rounding can collapse neighbouring ticks on small scales (max=1 would
  // yield 0,0,1,1,1). Ticks double as React keys, so they must be unique —
  // and an axis gains nothing from repeating a value anyway.
  const ticks = Array.from({ length: count + 1 }, (_, i) => Math.round((max / count) * i));
  return [...new Set(ticks)];
}

export interface Scaled {
  x: (index: number) => number;
  y: (value: number) => number;
  max: number;
}

export function scales(points: TimeSeriesPoint[], geo: ChartGeometry, forcedMax?: number): Scaled {
  const rawMax = Math.max(1, ...points.map((p) => p.value));
  const max = forcedMax ?? niceMax(rawMax);
  const step = points.length > 1 ? geo.innerWidth / (points.length - 1) : 0;
  return {
    x: (index) => geo.padLeft + step * index,
    y: (value) => geo.padTop + geo.innerHeight - (value / max) * geo.innerHeight,
    max,
  };
}

/**
 * Catmull-Rom → cubic Bézier. Produces the soft curve the reference uses without
 * the overshoot a naive quadratic smoothing introduces.
 */
export function smoothPath(coords: Array<[number, number]>, tension = 0.35): string {
  if (coords.length === 0) return "";
  if (coords.length < 3) return coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");

  let d = `M${coords[0][0]},${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;

    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2;

    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Index of the data point closest to a pointer x, in SVG user units. */
export function nearestIndex(svgX: number, count: number, geo: ChartGeometry): number {
  if (count <= 1) return 0;
  const ratio = (svgX - geo.padLeft) / geo.innerWidth;
  return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
}

/** Convert a pointer event to SVG user coordinates regardless of CSS scaling. */
export function pointerToSvgX(event: React.PointerEvent<SVGSVGElement>, viewBoxWidth: number): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return ((event.clientX - rect.left) / rect.width) * viewBoxWidth;
}
