import { useState } from "react";

import { Button } from "@maat-apps/ui/button";
import {
  SettingsRow,
  SettingsSection,
} from "@maat-apps/ui/settings-primitives";
import { useInstallPrompt } from "../../hooks/use-install-prompt";
import { useTranslation } from "../../i18n/use-translation";
import { updateApp } from "../../lib/app-update";

export function AppSection() {
  const { t } = useTranslation();
  const install = useInstallPrompt();
  const [updating, setUpdating] = useState(false);

  return (
    <SettingsSection title={t("sectionApp")}>
      <SettingsRow
        title={t("installApp")}
        description={
          install.state === "installed"
            ? t("installAppInstalled")
            : install.state === "available"
              ? t("installAppDescription")
              : t("installAppUnavailable")
        }
        action={
          <Button
            variant="outline"
            className="min-h-10.5 px-4"
            disabled={install.state !== "available"}
            onClick={() => void install.install()}
          >
            {t("installAppAction")}
          </Button>
        }
      />
      <SettingsRow
        title={t("updateApp")}
        description={t("updateAppDescription")}
        action={
          <Button
            variant="outline"
            className="min-h-10.5 px-4"
            disabled={updating}
            onClick={() => {
              setUpdating(true);
              void updateApp();
            }}
          >
            {updating ? t("updateAppBusy") : t("updateAppAction")}
          </Button>
        }
      />
    </SettingsSection>
  );
}
