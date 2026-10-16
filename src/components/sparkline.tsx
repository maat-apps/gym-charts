const WIDTH = 64;
const HEIGHT = 28;
const PADDING = 3;

/**
 * A tiny trend line for a list row: oldest value on the left, better
 * values higher (or lower when `inverted`). Decorative — the row's text
 * carries the numbers.
 */
export function Sparkline({
  values,
  inverted = false,
}: {
  values: number[];
  inverted?: boolean;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const step = (WIDTH - PADDING * 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const share = (value - min) / range;
    const y = inverted ? share : 1 - share;
    return [PADDING + index * step, PADDING + y * (HEIGHT - PADDING * 2)];
  });
  const [lastX, lastY] = points.at(-1)!;

  return (
    <svg
      aria-hidden
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="text-foreground shrink-0"
    >
      <polyline
        points={points.map((point) => point.join(",")).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  );
}
