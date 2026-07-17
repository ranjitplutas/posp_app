import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { AppError, ERROR_CODES } from "@posp-admin/contracts";
import type { AppRole, UserStatus } from "@posp-admin/contracts";
import { env } from "../../config/env.js";

const secret = new TextEncoder().encode(env.APP_JWT_SECRET);

export type AppJwtClaims = {
  sub: string;
  email: string;
  name: string;
  role: AppRole | null;
  status: UserStatus;
};

export async function signAppJwt(claims: AppJwtClaims): Promise<{ token: string; expiresIn: number }> {
  const expiresIn = env.APP_JWT_EXPIRES_IN_SECONDS;
  const token = await new SignJWT({ email: claims.email, name: claims.name, role: claims.role, status: claims.status })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(env.APP_JWT_ISSUER)
    .setAudience(env.APP_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .setJti(randomUUID())
    .sign(secret);

  return { token, expiresIn };
}

export type VerifiedAppJwt = AppJwtClaims;

export async function verifyAppJwt(token: string): Promise<VerifiedAppJwt> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.APP_JWT_ISSUER,
      audience: env.APP_JWT_AUDIENCE,
    });

    return {
      sub: payload.sub as string,
      email: payload["email"] as string,
      name: payload["name"] as string,
      role: (payload["role"] as AppRole | null) ?? null,
      status: payload["status"] as UserStatus,
    };
  } catch (err) {
    const isExpired = err instanceof Error && err.name === "JWTExpired";
    throw new AppError(
      isExpired ? ERROR_CODES.AUTH_TOKEN_EXPIRED : ERROR_CODES.AUTH_TOKEN_INVALID,
      isExpired ? "Your session has expired." : "Invalid authentication token.",
    );
  }
}
