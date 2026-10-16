import { ArrowsClockwise, Gear } from "@phosphor-icons/react";
import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@maat-apps/ui/button";
import { EmptyState } from "@maat-apps/ui/empty-state";
import { PageHeader, PageTitle } from "@maat-apps/ui/page-header";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useGymData, useGymReady } from "../../hooks/use-gym-data";
import { useTranslation } from "../../i18n/use-translation";
import { setSelectedPlan } from "../../lib/app-settings";
import { sync, syncOnStart } from "../../lib/storage";
import { SettingsDrawer } from "../settings/settings-drawer";
import { SyncError } from "../settings/sync-error";

import { ExerciseRow } from "./exercise-row";

/** "/": one plan's exercises at a time, the plan picked in the bottom bar. */
export function HomeView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ready = useGymReady();
  const { source, data, syncing, error } = useGymData();
  const { selectedPlan } = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void syncOnStart();
  }, []);

  const plans = data?.plans ?? [];
  const plan = plans.find((item) => item.id === selectedPlan) ?? plans[0];
  const exercises = (plan?.exercises ?? []).flatMap((id) => {
    const exercise = data?.exercises.find((item) => item.id === id);
    return exercise ? [exercise] : [];
  });

  function open(id: string) {
    startTransition(() => navigate(`/exercise/${encodeURIComponent(id)}`));
  }

  const settingsButton = (
    <Button
      variant="ghost"
      size="icon-lg"
      className="size-14 shrink-0"
      aria-label={t("settings")}
      onClick={() => setSettingsOpen(true)}
    >
      <Gear className="size-6" />
    </Button>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-[min(100%,480px)] flex-col gap-5 px-5 pt-27 pb-[calc(112px+env(safe-area-inset-bottom))]">
      <PageHeader>
        <PageTitle>{t("appName")}</PageTitle>
        {source && (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("refresh")}
            disabled={syncing}
            onClick={() => void sync()}
          >
            <ArrowsClockwise
              className={syncing ? "size-6 animate-spin" : "size-6"}
            />
          </Button>
        )}
      </PageHeader>
      {error && data && <SyncError error={error} />}
      {!ready ? null : !source ? (
        <EmptyState
          title={t("connectTitle")}
          description={t("connectDescription")}
          action={{
            label: t("connectAction"),
            onClick: () => setSettingsOpen(true),
          }}
        />
      ) : !data ? (
        <EmptyState
          title={syncing ? t("downloading") : t("noDataTitle")}
          description={error ? undefined : t("noDataDescription")}
          action={
            syncing
              ? undefined
              : {
                  label: t("refresh"),
                  onClick: () => void sync(),
                  variant: "outline",
                }
          }
        />
      ) : exercises.length === 0 ? (
        <EmptyState title={t("emptyPlan")} />
      ) : (
        <ul aria-label={plan?.name} className="m-0 grid list-none gap-2 p-0">
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseRow
                exercise={exercise}
                onOpen={() => open(exercise.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {!data && error && <SyncError error={error} />}
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur">
        <div className="mx-auto flex w-[min(100%,480px)] items-center gap-1 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div
            role="group"
            aria-label={t("plans")}
            className="-ml-4 flex min-w-0 flex-1 [scrollbar-width:none] gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] pr-6 pl-4"
          >
            {plans.map((item) => (
              <Button
                key={item.id}
                variant={item.id === plan?.id ? "default" : "outline"}
                className="h-14 shrink-0 rounded-2xl px-4 text-base"
                aria-pressed={item.id === plan?.id}
                onClick={() => setSelectedPlan(item.id)}
              >
                {item.name}
              </Button>
            ))}
          </div>
          {settingsButton}
        </div>
      </div>
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
