import { PublicClientApplication, type Configuration } from "@azure/msal-browser";
import { config } from "../../config/env";

const msalConfig: Configuration = {
  auth: {
    clientId: config.microsoft.clientId,
    authority: `https://login.microsoftonline.com/${config.microsoft.tenantId}`,
    redirectUri: config.microsoft.redirectUri,
  },
  cache: {
    // sessionStorage, not localStorage — MSAL's own token cache, distinct from
    // (and not a substitute for) our app JWT which is held in-memory only.
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

let initPromise: Promise<void> | null = null;

/** MSAL v3 requires an explicit async init() before any other call — call once, share the promise. */
export function ensureMsalInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = msalInstance.initialize();
  }
  return initPromise;
}

export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};
