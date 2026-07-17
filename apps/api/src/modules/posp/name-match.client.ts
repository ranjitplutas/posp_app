import { AppError, ERROR_CODES } from "@posp-admin/contracts";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";

export type NameMatchOutcome = { score: number; result: boolean };

type PerfiosResponse = { requestId?: string; result?: { score?: unknown; result?: unknown }; statusCode?: number };

/** Calls Perfios' KYC name-match API. Never persists the request/response — only the caller's is_namematch_done flag survives. */
export async function callPerfiosNameMatch(name1: string, name2: string): Promise<NameMatchOutcome> {
  if (!env.PERFIOS_API_KEY) {
    throw new AppError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, "Name-match service is not configured (PERFIOS_API_KEY is missing).");
  }

  let res: Response;
  try {
    res = await fetch(`${env.PERFIOS_API_BASE_URL}/api/kyc/v3/name`, {
      method: "POST",
      headers: { "x-auth-key": env.PERFIOS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        name1,
        name2,
        type: "individual",
        preset: "s",
        allowPartialMatch: true,
        suppressReorderPenalty: true,
      }),
    });
  } catch (err) {
    logger.error({ err }, "Perfios name-match request failed (network)");
    throw new AppError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, "Could not reach the name-match service.");
  }

  if (!res.ok) {
    logger.error({ status: res.status }, "Perfios name-match request returned an error status");
    throw new AppError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, "The name-match service returned an error.");
  }

  const body = (await res.json().catch(() => null)) as PerfiosResponse | null;
  const score = body?.result?.score;
  const result = body?.result?.result;
  if (typeof score !== "number" || typeof result !== "boolean") {
    logger.error({ body }, "Perfios name-match returned an unexpected response shape");
    throw new AppError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, "Unexpected response from the name-match service.");
  }

  return { score, result };
}
