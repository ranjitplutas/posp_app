/**
 * MSAL's loginPopup() briefly navigates the popup window itself to this exact
 * URI mid-flow (configured as microsoft.redirectUri) before it detects the
 * response and auto-closes the popup. This page's only job is to exist and
 * not 404 — MSAL's own script (loaded via the app shell in the popup's
 * window) does the actual work of closing the window; there's nothing to
 * render here.
 */
export default function AuthCallbackPage() {
  return null;
}
