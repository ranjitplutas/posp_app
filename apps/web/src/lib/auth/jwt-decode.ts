/** Reads the `exp` claim off a JWT without verifying its signature — fine for a client-side UX check; the server independently verifies every request regardless. */
export function getJwtExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const exp = getJwtExpiry(token);
  if (exp === null) return true;
  return Date.now() >= exp * 1000;
}
