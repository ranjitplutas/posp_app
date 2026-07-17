import pino from "pino";
import { env } from "../config/env.js";

/** Never log these paths even if a bug elsewhere tries to dump the whole request. */
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "*.accessToken",
  "*.idToken",
  "*.refreshToken",
  "*.password",
  "*.client_secret",
  "*.jwtSecret",
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
      : undefined,
  base: { service: "posp-admin-api", env: env.NODE_ENV },
});
