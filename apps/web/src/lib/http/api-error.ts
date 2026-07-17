import type { ErrorCode } from "@posp-admin/contracts";

/** Thrown by apiClient for every non-2xx response — carries the backend's stable error code, never a raw HTTP status alone. */
export class ApiError extends Error {
  code: ErrorCode | "NETWORK_ERROR";
  status: number;
  fields?: Record<string, string>;
  requestId?: string;

  constructor(params: { code: ErrorCode | "NETWORK_ERROR"; message: string; status: number; fields?: Record<string, string>; requestId?: string }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.fields = params.fields;
    this.requestId = params.requestId;
  }
}
