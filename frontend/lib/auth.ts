export const SESSION_COOKIE_NAME = "fp_session_token";

export function getSessionToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";").map((item) => item.trim());
  const hit = cookies.find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!hit) {
    return null;
  }
  return decodeURIComponent(hit.split("=", 2)[1] ?? "");
}

export function setSessionToken(token: string, expiresAt: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const expires = new Date(expiresAt).toUTCString();
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

export function clearSessionToken(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}
