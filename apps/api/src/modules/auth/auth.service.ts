import { isBootstrapAdminEmail } from "../../config/env.js";
import {
  bootstrapAsAdmin,
  findUserById,
  findUserByUsername,
  touchLastLogin,
  upsertMicrosoftUser,
  type DigiPospAppUser,
} from "../../database/users.repository.js";
import { verifyMicrosoftIdToken } from "./microsoft.js";
import { verifyPassword } from "./password.js";
import { signAppJwt } from "./jwt.js";
import { AppError, ERROR_CODES } from "@posp-admin/contracts";

function toPublicUser(user: DigiPospAppUser) {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, status: user.status };
}

export async function exchangeMicrosoftToken(idToken: string) {
  const claims = await verifyMicrosoftIdToken(idToken);

  let user = await upsertMicrosoftUser({
    microsoftObjectId: claims.oid,
    microsoftTenantId: claims.tid,
    email: claims.email,
    fullName: claims.name ?? claims.email,
  });

  // One-time self-bootstrap: a configured email is promoted straight to ADMIN/ACTIVE
  // on whichever login first sees it still PENDING_ROLE — avoids needing shell/CLI
  // access to run the assign-role script for the very first administrator.
  if (user.status === "PENDING_ROLE" && isBootstrapAdminEmail(user.email)) {
    user = await bootstrapAsAdmin(user.id);
  }

  if (user.status === "DISABLED") {
    throw new AppError(ERROR_CODES.USER_DISABLED, "Your account has been disabled. Contact an administrator.");
  }

  const { token, expiresIn } = await signAppJwt({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    status: user.status,
  });

  return { accessToken: token, expiresIn, user: toPublicUser(user) };
}

/** Local/dev-only fallback login — see ENABLE_PASSWORD_LOGIN. Never used for real Microsoft-authenticated users (they have no password_hash). */
export async function passwordLogin(username: string, password: string) {
  const user = await findUserByUsername(username);
  if (!user || !user.passwordHash) {
    throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, "Invalid username or password.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, "Invalid username or password.");
  }

  if (user.status === "DISABLED") {
    throw new AppError(ERROR_CODES.USER_DISABLED, "Your account has been disabled. Contact an administrator.");
  }

  await touchLastLogin(user.id);

  const { token, expiresIn } = await signAppJwt({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    status: user.status,
  });

  return { accessToken: token, expiresIn, user: toPublicUser(user) };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, "User not found.");
  }
  return toPublicUser(user);
}
