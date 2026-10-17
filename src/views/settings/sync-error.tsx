import type { GitHubErrorKind } from "@maat-apps/core/github";
import { useTranslation } from "../../i18n/use-translation";

/** Why the last download failed, in words the user can act on. */
export function SyncError({ error }: { error: GitHubErrorKind }) {
  const { t } = useTranslation();
  const message: Record<GitHubErrorKind, string> = {
    unauthorized: t("errorUnauthorized"),
    notFound: t("errorNotFound"),
    rateLimited: t("errorRateLimited"),
    server: t("errorServer"),
    // Only a write conflicts; a mirror never writes.
    conflict: t("errorServer"),
    network: t("errorNetwork"),
    invalid: t("errorInvalid"),
  };
  return (
    <p role="alert" className="text-destructive m-0 px-1 text-sm">
      {message[error]}
    </p>
  );
}
