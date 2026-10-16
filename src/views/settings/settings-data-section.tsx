import { useId, useState, type FormEvent } from "react";

import { Button } from "@maat-apps/ui/button";
import { ConfirmDrawer } from "@maat-apps/ui/confirm-drawer";
import { Input } from "@maat-apps/ui/input";
import {
  SettingsRow,
  SettingsSection,
} from "@maat-apps/ui/settings-primitives";
import { useGymData } from "../../hooks/use-gym-data";
import { useTranslation } from "../../i18n/use-translation";
import { formatDateTime } from "../../lib/format";
import { DEFAULT_DATA_PATH, isValidRepo } from "../../lib/github";
import { connect, disconnect, sync } from "../../lib/storage";

import { SyncError } from "./sync-error";

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
  placeholder?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="text-destructive m-0 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

/** The repo, file and read-only token to download from. */
function ConnectForm() {
  const { t } = useTranslation();
  const [repo, setRepo] = useState("");
  const [path, setPath] = useState(DEFAULT_DATA_PATH);
  const [token, setToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const repoError = submitted && !isValidRepo(repo.trim());
  const tokenError = submitted && token.trim() === "";

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!isValidRepo(repo.trim()) || token.trim() === "") return;
    void connect({
      repo: repo.trim(),
      path: path.trim() || DEFAULT_DATA_PATH,
      token: token.trim(),
    });
  }

  return (
    <form
      noValidate
      className="bg-card border-border grid gap-3 rounded-lg border p-4"
      onSubmit={submit}
    >
      <p className="text-muted-foreground m-0 text-sm">{t("connectHelp")}</p>
      <TextField
        label={t("repo")}
        value={repo}
        placeholder="owner/repo"
        error={repoError ? t("errorRepo") : undefined}
        onChange={setRepo}
      />
      <TextField label={t("dataPath")} value={path} onChange={setPath} />
      <TextField
        label={t("token")}
        type="password"
        value={token}
        error={tokenError ? t("errorToken") : undefined}
        onChange={setToken}
      />
      <p className="text-muted-foreground m-0 text-xs">{t("tokenHelp")}</p>
      <Button type="submit">{t("connectAction")}</Button>
    </form>
  );
}

export function DataSection() {
  const { t, locale } = useTranslation();
  const { source, syncedAt, syncing, error } = useGymData();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  return (
    <SettingsSection title={t("sectionData")}>
      {source ? (
        <>
          <SettingsRow
            title={source.repo}
            description={
              syncedAt
                ? t("lastUpdated", { time: formatDateTime(syncedAt, locale) })
                : source.path
            }
            action={
              <Button
                variant="outline"
                className="min-h-10.5 px-4"
                disabled={syncing}
                onClick={() => void sync()}
              >
                {syncing ? t("downloading") : t("refresh")}
              </Button>
            }
          />
          {error && <SyncError error={error} />}
          <SettingsRow
            title={t("disconnect")}
            description={t("disconnectDescription")}
            action={
              <Button
                variant="outline"
                className="min-h-10.5 px-4"
                onClick={() => setConfirmDisconnect(true)}
              >
                {t("disconnectAction")}
              </Button>
            }
          />
          <ConfirmDrawer
            open={confirmDisconnect}
            onOpenChange={setConfirmDisconnect}
            title={t("disconnectConfirmTitle")}
            description={t("disconnectDescription")}
            cancelLabel={t("cancel")}
            confirmLabel={t("disconnectAction")}
            onConfirm={() => {
              setConfirmDisconnect(false);
              void disconnect();
            }}
          />
        </>
      ) : (
        <ConnectForm />
      )}
    </SettingsSection>
  );
}
