import { CaretRight } from "@phosphor-icons/react";

import { ListRow } from "@maat-apps/ui/list-row";
import { Sparkline } from "../../components/sparkline";
import { useTranslation } from "../../i18n/use-translation";
import { formatPersonalBest } from "../../lib/format";
import {
  buildProgress,
  lowerIsBetter,
  measuresFor,
  personalBest,
} from "../../lib/progress";
import type { Exercise } from "../../lib/schemas";

/** Name, personal best, session count and a trend line. */
export function ExerciseRow({
  exercise,
  onOpen,
}: {
  exercise: Exercise;
  onOpen: () => void;
}) {
  const { t, locale } = useTranslation();
  const measure = measuresFor(exercise)[0];
  const { keys, points } = buildProgress(exercise, measure);
  const trend = points.flatMap((point) => {
    const value = point.values[keys[0]];
    return value === undefined ? [] : [value];
  });
  const best = personalBest(exercise);

  return (
    <ListRow onClick={onOpen}>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold">{exercise.name}</span>
          {exercise.inactive && (
            <span className="text-muted-foreground border-border shrink-0 rounded-full border px-2 py-0.5 text-xs">
              {t("inactive")}
            </span>
          )}
        </span>
        <span className="text-muted-foreground truncate text-sm">
          {best
            ? t("bestAndSessions", {
                best:
                  formatPersonalBest(best, locale) +
                  (best.kind === "reps" ? ` ${t("repsUnit")}` : ""),
                count: exercise.sessions.length,
              })
            : t("noSessions")}
        </span>
      </span>
      <Sparkline values={trend} inverted={lowerIsBetter(exercise, measure)} />
      <CaretRight className="size-5 shrink-0" />
    </ListRow>
  );
}
