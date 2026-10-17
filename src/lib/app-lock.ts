import { lockData } from "@maat-apps/core/local";
import { createAppLock } from "@maat-apps/core/lock";

import { setLockEnrolment } from "./app-settings";
import { encryptionKey } from "./encryption-key";
import { lockParts } from "./storage";

// NEVER change this once the app has users: it's part of how their data is
// encrypted, so a different value makes every encrypted record unreadable.
export const HKDF_INFO = "gym-charts-data-v1";

// The app lock (@maat-apps/core/lock): a WebAuthn gate that encrypts the
// stored data and token when the authenticator supports PRF, a UI gate
// otherwise.
export const appLock = createAppLock({
  name: "Gym charts",
  keyInfo: HKDF_INFO,
  keyHolder: encryptionKey,
  saveEnrolment: setLockEnrolment,
  // The downloaded copy is rewritten under the new key; the token is only
  // kept encrypted — re-encrypted, or deleted once the lock stops encrypting.
  data: lockData(...lockParts),
});
