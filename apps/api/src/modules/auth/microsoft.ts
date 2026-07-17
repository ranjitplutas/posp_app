import { createRemoteJWKSet, jwtVerify } from "jose";
import { AppError, ERROR_CODES } from "@posp-admin/contracts";
import { env, allowedTenantIds } from "../../config/env.js";

const jwks = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/discovery/v2.0/keys`),
);

export type MicrosoftClaims = {
  oid: string; // Microsoft object ID
  tid: string; // Microsoft tenant ID
  name?: string;
  email: string;
};

/**
 * Cryptographically verifies a Microsoft-issued ID token against Microsoft's
 * own JWKS (never decodes-and-trusts). Validates signature, issuer,
 * audience, expiry, not-before, and that the token's tenant is on our
 * allowlist — never accepts a token from an unapproved tenant even if the
 * signature is otherwise valid.
 */
export async function verifyMicrosoftIdToken(idToken: string): Promise<MicrosoftClaims> {
  let payload;
  try {
    const result = await jwtVerify(idToken, jwks, {
      issuer: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/v2.0`,
      audience: env.MICROSOFT_CLIENT_ID,
    });
    payload = result.payload;
  } catch {
    throw new AppError(ERROR_CODES.MICROSOFT_TOKEN_INVALID, "The Microsoft sign-in token could not be verified.");
  }

  const oid = payload["oid"];
  const tid = payload["tid"];
  if (typeof oid !== "string" || typeof tid !== "string") {
    throw new AppError(ERROR_CODES.MICROSOFT_TOKEN_INVALID, "The Microsoft sign-in token is missing required claims.");
  }

  if (!allowedTenantIds.includes(tid)) {
    throw new AppError(ERROR_CODES.TENANT_NOT_ALLOWED, "This Microsoft account's organization is not authorized for this application.");
  }

  const name = typeof payload["name"] === "string" ? (payload["name"] as string) : undefined;
  const email =
    typeof payload["preferred_username"] === "string"
      ? (payload["preferred_username"] as string)
      : typeof payload["email"] === "string"
        ? (payload["email"] as string)
        : undefined;

  if (!email) {
    throw new AppError(ERROR_CODES.MICROSOFT_TOKEN_INVALID, "The Microsoft account has no usable email/username claim.");
  }

  return { oid, tid, name, email };
}
