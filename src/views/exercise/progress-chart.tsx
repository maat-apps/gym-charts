import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@maat-apps/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { useTranslation } from "../../i18n/use-translation";
import { formatNumber } from "../../lib/format";
import type { Progress, SeriesKey } from "../../lib/progress";

// Monochrome on purpose — the shared theme has no accent colour. Sides are
// told apart by shade and dash; records by a larger, ringed dot.
const SERIES_STYLE: Record<SeriesKey, { color: string; dash?: string }> = {
  value: { color: "var(--foreground)" },
  right: { color: "var(--foreground)" },
  left: { color: "var(--muted-foreground)", dash: "5 4" },
};

type DotProps = {
  cx?: number;
  cy?: number;
  index?: number;
};

function recordDot(progress: Progress, key: SeriesKey, color: string) {
  // recharts calls this once per point, with the point's index.
  function Dot({ cx, cy, index }: DotProps) {
    if (cx === undefined || cy === undefined || index === undefined) {
      return <g />;
    }
    const record = progress.points[index]?.records[key] === true;
    return record ? (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={7}
          fill="var(--background)"
          stroke={color}
          strokeWidth={2}
        />
        <circle cx={cx} cy={cy} r={3.5} fill={color} />
      </g>
    ) : (
      <circle cx={cx} cy={cy} r={2.5} fill={color} />
    );
  }
  return Dot;
}

/**
 * One line per series over the sessions, oldest left. `inverted` flips the
 * axis so that "better" is always up (an assisted exercise's assistance).
 */
export function ProgressChart({
  progress,
  label,
  unit,
  inverted,
}: {
  progress: Progress;
  label: string;
  unit: string;
  inverted: boolean;
}) {
  const { t, locale } = useTranslation();
  const seriesLabel: Record<SeriesKey, string> = {
    value: label,
    right: t("sideRight"),
    left: t("sideLeft"),
  };
  const config: ChartConfig = Object.fromEntries(
    progress.keys.map((key) => [
      key,
      { label: seriesLabel[key], color: SERIES_STYLE[key].color },
    ]),
  );
  const data = progress.points.map((point) => ({
    session: point.session,
    ...point.values,
  }));

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-64 w-full"
      role="img"
      aria-label={t("chartLabel", { measure: label })}
    >
      <LineChart
        data={data}
        margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="session"
          type="number"
          domain={["dataMin", "dataMax"]}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          width={44}
          reversed={inverted}
          domain={["auto", "auto"]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatNumber(value, locale)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                t("sessionNumber", {
                  number: String(payload[0]?.payload?.session ?? ""),
                })
              }
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-3">
                  <span className="text-muted-foreground">
                    {seriesLabel[name as SeriesKey]}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatNumber(Number(value), locale)} {unit}
                  </span>
                </span>
              )}
            />
          }
        />
        {progress.keys.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {progress.keys.map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="linear"
            stroke={SERIES_STYLE[key].color}
            strokeWidth={2}
            strokeDasharray={SERIES_STYLE[key].dash}
            dot={recordDot(progress, key, SERIES_STYLE[key].color)}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
