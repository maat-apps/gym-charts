import {
  AppSection,
  LanguageSection,
  SecuritySection,
} from "@maat-apps/ui/settings-sections";
import { useInstallPrompt } from "../../hooks/use-install-prompt";
import { useTranslation } from "../../i18n/use-translation";
import { appLock } from "../../lib/app-lock";
import { appSettings } from "../../lib/app-settings";
import { updateApp } from "../../lib/app-update";
import { DataSection } from "./settings-data-section";

// The language, security and app sections are @maat-apps/ui's, as in every
// app; the data section (the repo connection) is gym-charts' own.
export function SettingsPanel() {
  const { t, locale, setLocale } = useTranslation();
  const install = useInstallPrompt();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
      <DataSection />
      <LanguageSection
        title={t("language")}
        locale={locale}
        languages={{ pl: "Polski", en: "English" }}
        onLocaleChange={setLocale}
      />
      <SecuritySection
        lock={appLock}
        settings={appSettings}
        labels={{
          title: t("sectionSecurity"),
          appLock: t("appLock"),
          appLockDescription: t("appLockDescription"),
          appLockUnsupported: t("appLockUnsupported"),
          appLockFailed: t("appLockFailed"),
          relockAfter: t("relockAfter"),
          relockAfterDescription: t("relockAfterDescription"),
          relockNow: t("relockNow"),
          relock30s: t("relock30s"),
          relockClose: t("relockClose"),
          appLockNotice: t("appLockNotice"),
          appLockEncryptedNotice: t("appLockEncryptedNotice"),
        }}
      />
      <AppSection
        install={install}
        updateApp={updateApp}
        // Nothing to snapshot: the data repository is the backup.
        onStatus={() => undefined}
        labels={{
          title: t("sectionApp"),
          installApp: t("installApp"),
          installAppDescription: t("installAppDescription"),
          installAppInstalled: t("installAppInstalled"),
          installAppUnavailable: t("installAppUnavailable"),
          installAppAction: t("installAppAction"),
          updateApp: t("updateApp"),
          updateAppDescription: t("updateAppDescription"),
          updateAppAction: t("updateAppAction"),
          updateAppBusy: t("updateAppBusy"),
          updateConfirmTitle: t("updateConfirmTitle"),
          updateConfirmDescription: t("updateConfirmDescription"),
          cancel: t("cancel"),
        }}
      />
    </div>
  );
}
