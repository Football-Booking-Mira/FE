const REMEMBERED_EMAIL_KEY = "rememberedEmail";

const LEGACY_KEYS_TO_PURGE = [
  "rememberMe",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authToken",
  "authData",
  "loginData",
  "credentials",
];

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
}

export function setRememberedEmail(email: string): void {
  if (typeof window === "undefined") return;
  if (email && email.trim()) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
  } else {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }
}

export function removeRememberedEmail(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}

/**
  * One-time migration function to migrate legacy rememberMe storage
  * to the secure rememberedEmail key and purge insecure legacy keys.
  */
export function migrateLegacyRememberMe(): void {
  if (typeof window === "undefined") return;

  try {
    const rawLegacy = localStorage.getItem("rememberMe");
    if (rawLegacy) {
      try {
        const parsed = JSON.parse(rawLegacy);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.email === "string" &&
          parsed.email.trim() &&
          Boolean(parsed.rememberMe)
        ) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, parsed.email.trim());
        }
      } catch (e) {
        // Invalid JSON in legacy key; ignore parsing errors
      }
    }
  } catch (e) {
    // Ignore storage access errors
  } finally {
    // Delete all insecure legacy keys
    for (const key of LEGACY_KEYS_TO_PURGE) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore storage access errors
      }
    }
  }
}
