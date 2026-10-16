import { Trophy } from "@phosphor-icons/react";
import { startTransition, useState } from "react";
import { useParams } from "react-router";

import { AppBar } from "@maat-apps/ui/app-bar";
import { Button } from "@maat-apps/ui/button";
import { EmptyState } from "@maat-apps/ui/empty-state";
import { useSmartBack } from "@maat-apps/ui/smart-back";
import { useExercise, useGymReady } from "../../hooks/use-gym-data";
import { useTranslation } from "../../i18n/use-translation";
import { formatPersonalBest, unitOf } from "../../lib/format";
import {
  buildProgress,
  countRecords,
  lowerIsBetter,
  measuresFor,
  personalBest,
  type Measure,
} from "../../lib/progress";

import { ProgressChart } from "./progress-chart";
import { SessionList } from "./session-list";

/** "/exercise/:id": the progress chart with records marked, and sessions. */
export function ExerciseView() {
  const { t, locale } = useTranslation();
  const { id = "" } = useParams();
  const ready = useGymReady();
  const exercise = useExercise(id);
  const back = useSmartBack("/");
  const [chosen, setChosen] = useState<Measure | null>(null);

  if (!exercise) {
    return ready ? (
      <div className="mx-auto min-h-dvh w-[min(100%,480px)] px-5 pt-27">
        <AppBar backLabel={t("back")} onBack={() => startTransition(back)} />
        <EmptyState title={t("missingExercise")} />
      </div>
    ) : null;
  }

  const measures = measuresFor(exercise);
  const measure = chosen && measures.includes(chosen) ? chosen : measures[0];
  const progress = buildProgress(exercise, measure);
  const inverted = lowerIsBetter(exercise, measure);
  const best = personalBest(exercise);
  const unit = unitOf(measure);
  const unitLabel = unit === "reps" ? t("repsUnit") : unit;
  const measureLabel: Record<Measure, string> = {
    topWeight: exercise.assisted
      ? t("measureAssistance")
      : t("measureTopWeight"),
    repsAtTop: t("measureRepsAtTop"),
    estimatedMax: t("measureEstimatedMax"),
    volume: t("measureVolume"),
    bestReps: t("measureBestReps"),
    totalReps: t("measureTotalReps"),
    longest: t("measureLongest"),
    totalTime: t("measureTotalTime"),
  };

  return (
    <div className="mx-auto grid min-h-dvh w-[min(100%,480px)] content-start gap-5 px-5 pt-27 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <AppBar
        title={exercise.name}
        backLabel={t("back")}
        onBack={() => startTransition(back)}
      />
      {(exercise.description || exercise.inactive) && (
        <p className="text-muted-foreground m-0 text-sm">
          {[
            exercise.inactive ? t("inactiveDescription") : null,
            exercise.description,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {exercise.sessions.length === 0 ? (
        <EmptyState title={t("noSessions")} />
      ) : (
        <>
          <dl className="m-0 grid grid-cols-2 gap-2">
            <div className="bg-card border-border grid gap-0.5 rounded-lg border px-4 py-3">
              <dt className="text-muted-foreground text-sm">
                {t("personalBest")}
              </dt>
              <dd className="m-0 text-xl font-semibold tabular-nums">
                {best
                  ? formatPersonalBest(best, locale) +
                    (best.kind === "reps" ? ` ${t("repsUnit")}` : "")
                  : "–"}
              </dd>
            </div>
            <div className="bg-card border-border grid gap-0.5 rounded-lg border px-4 py-3">
              <dt className="text-muted-foreground flex items-center gap-1 text-sm">
                <Trophy weight="fill" className="size-4" />
                {t("records")}
              </dt>
              <dd className="m-0 text-xl font-semibold tabular-nums">
                {countRecords(progress)}
              </dd>
            </div>
          </dl>
          {measures.length > 1 && (
            <div
              role="group"
              aria-label={t("measure")}
              className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5"
            >
              {measures.map((item) => (
                <Button
                  key={item}
                  variant={item === measure ? "default" : "outline"}
                  className="h-11 shrink-0 rounded-2xl px-4"
                  aria-pressed={item === measure}
                  onClick={() => setChosen(item)}
                >
                  {measureLabel[item]}
                </Button>
              ))}
            </div>
          )}
          <ProgressChart
            progress={progress}
            label={measureLabel[measure]}
            unit={unitLabel}
            inverted={inverted}
          />
          <p className="text-muted-foreground m-0 -mt-2 text-xs">
            {exercise.assisted
              ? t("recordHintAssisted")
              : exercise.metric === "weight"
                ? t("recordHintWeight")
                : t("recordHint")}
          </p>
          <SessionList exercise={exercise} progress={progress} />
        </>
      )}
    </div>
  );
}
