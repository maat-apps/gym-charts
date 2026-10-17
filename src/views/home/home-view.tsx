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
import { planTabs } from "../../lib/plans";
import { sync, syncOnStart } from "../../lib/storage";
import { SettingsDrawer } from "../settings/settings-drawer";
import { SyncError } from "../settings/sync-error";

import { ExerciseRow } from "./exercise-row";
import { PlanTabs } from "./plan-tabs";

/**
 * "/": one plan's exercises at a time — refresh and settings in the header,
 * the plans (and "Other", for exercises in none) as tabs along the bottom
 * (the owner's layout for this app).
 */
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

  const plans = data ? planTabs(data, t("otherPlan")) : [];
  const plan = plans.find((item) => item.id === selectedPlan) ?? plans[0];
  const exercises = (plan?.exercises ?? []).flatMap((id) => {
    const exercise = data?.exercises.find((item) => item.id === id);
    return exercise ? [exercise] : [];
  });

  function open(id: string) {
    startTransition(() => navigate(`/exercise/${encodeURIComponent(id)}`));
  }

  return (
    <div
      className={`mx-auto flex min-h-dvh w-[min(100%,480px)] flex-col gap-5 px-5 pt-27 ${plans.length > 0 ? "pb-[calc(88px+env(safe-area-inset-bottom))]" : "pb-8"}`}
    >
      <PageHeader>
        <PageTitle>{t("appName")}</PageTitle>
        <div className="flex items-center">
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
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("settings")}
            onClick={() => setSettingsOpen(true)}
          >
            <Gear className="size-6" />
          </Button>
        </div>
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
      {plans.length > 0 && (
        <PlanTabs
          plans={plans}
          selectedId={plan?.id}
          label={t("plans")}
          onSelect={setSelectedPlan}
        />
      )}
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
