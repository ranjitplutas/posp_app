import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError, ERROR_CODES, ERROR_STATUS } from "@posp-admin/contracts";
import { logger } from "./logger.js";
import { recordError } from "./recent-errors.js";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
};

function isFastifyValidationError(err: FastifyError): boolean {
  return Array.isArray(err.validation) && err.validation.length > 0;
}

export function errorHandler(err: FastifyError | AppError, req: FastifyRequest, reply: FastifyReply): void {
  const requestId = req.id;

  if (err instanceof AppError) {
    const status = ERROR_STATUS[err.code];
    if (status >= 500) {
      logger.error({ err, requestId, code: err.code }, err.message);
      recordError({ statusCode: status, code: err.code, message: err.message, path: req.url, requestId });
    } else {
      logger.warn({ requestId, code: err.code }, err.message);
    }
    const body: ErrorBody = { error: { code: err.code, message: err.message, requestId } };
    if (err.fields) body.error.fields = err.fields;
    reply.status(status).send(body);
    return;
  }

  const fastifyErr = err as FastifyError & { corsRejection?: boolean };

  if (fastifyErr.corsRejection) {
    logger.warn({ requestId }, "Rejected request from disallowed CORS origin");
    reply.status(403).send({
      error: { code: ERROR_CODES.FORBIDDEN, message: "Origin not allowed.", requestId },
    } satisfies ErrorBody);
    return;
  }

  if (isFastifyValidationError(fastifyErr)) {
    const fields: Record<string, string> = {};
    for (const issue of fastifyErr.validation ?? []) {
      const key = issue.instancePath?.replace(/^\//, "") || issue.params?.["missingProperty"] || "value";
      fields[String(key)] = issue.message ?? "Invalid value";
    }
    logger.warn({ requestId, fields }, "Request validation failed");
    reply.status(ERROR_STATUS.VALIDATION_ERROR).send({
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: "Request validation failed.", fields, requestId },
    } satisfies ErrorBody);
    return;
  }

  if (fastifyErr.statusCode === 429) {
    reply.status(429).send({
      error: { code: ERROR_CODES.RATE_LIMIT_EXCEEDED, message: "Too many requests. Please try again shortly.", requestId },
    } satisfies ErrorBody);
    return;
  }

  // Unknown/unexpected error — never leak internals (stack traces, SQL, file paths) to the client.
  logger.error({ err: fastifyErr, requestId }, "Unhandled error");
  recordError({ statusCode: 500, code: ERROR_CODES.INTERNAL_ERROR, message: fastifyErr.message || "Unhandled error", path: req.url, requestId });
  reply.status(500).send({
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An unexpected error occurred.", requestId },
  } satisfies ErrorBody);
}
