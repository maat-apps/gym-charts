import { useTranslation } from "../../i18n/use-translation";
import type { FetchError } from "../../lib/github";

/** Why the last download failed, in words the user can act on. */
export function SyncError({ error }: { error: FetchError }) {
  const { t } = useTranslation();
  const message: Record<FetchError, string> = {
    unauthorized: t("errorUnauthorized"),
    notFound: t("errorNotFound"),
    rateLimited: t("errorRateLimited"),
    server: t("errorServer"),
    network: t("errorNetwork"),
    invalid: t("errorInvalid"),
  };
  return (
    <p role="alert" className="text-destructive m-0 px-1 text-sm">
      {message[error]}
    </p>
  );
}
