import { Trophy } from "@phosphor-icons/react";

import { useTranslation } from "../../i18n/use-translation";
import { formatDate, formatList, formatNumber } from "../../lib/format";
import { groupSets, type Progress, type SetGroup } from "../../lib/progress";
import type { Exercise } from "../../lib/schemas";

function GroupLine({ group }: { group: SetGroup }) {
  const { t, locale } = useTranslation();
  const side =
    group.side === "right"
      ? `${t("sideRight")}: `
      : group.side === "left"
        ? `${t("sideLeft")}: `
        : "";
  if (group.seconds.length > 0) {
    return (
      <span>
        {side}
        {formatList(group.seconds, locale)} s
      </span>
    );
  }
  const weight =
    group.weight === undefined || group.weight === 0
      ? t("bodyweight")
      : `${formatNumber(group.weight, locale)} kg`;
  return (
    <span>
      {side}
      {weight} × {formatList(group.reps, locale)}
    </span>
  );
}

/** Every session, newest first, its sets and whether it set a record. */
export function SessionList({
  exercise,
  progress,
}: {
  exercise: Exercise;
  progress: Progress;
}) {
  const { t, locale } = useTranslation();
  const sessions = exercise.sessions
    .map((session, index) => ({ session, point: progress.points[index] }))
    .reverse();

  return (
    <ol className="m-0 grid list-none gap-2 p-0" aria-label={t("sessions")}>
      {sessions.map(({ session, point }) => {
        const record = point && Object.keys(point.records).length > 0;
        return (
          <li
            key={point?.session}
            className="bg-card border-border grid gap-1 rounded-lg border px-4 py-3"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold">
                {t("sessionNumber", { number: point?.session ?? "" })}
                {session.date && (
                  <span className="text-muted-foreground font-normal">
                    {" · "}
                    {formatDate(session.date, locale)}
                  </span>
                )}
              </span>
              {record && (
                <span className="flex items-center gap-1 text-sm font-medium">
                  <Trophy weight="fill" className="size-4" />
                  {t("record")}
                </span>
              )}
            </span>
            <span className="text-muted-foreground grid text-sm">
              {groupSets(session.sets).map((group, index) => (
                <GroupLine key={index} group={group} />
              ))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
