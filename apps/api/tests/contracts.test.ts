import { describe, expect, it } from "vitest";
import { isAppRole, isUserStatus, APP_ROLES, USER_STATUSES, ERROR_STATUS, AppError } from "@posp-admin/contracts";

describe("isAppRole", () => {
  it("accepts every real role", () => {
    for (const role of Object.values(APP_ROLES)) {
      expect(isAppRole(role)).toBe(true);
    }
  });

  it("rejects arbitrary strings, case variants, and non-strings", () => {
    expect(isAppRole("admin")).toBe(false); // wrong case — roles are case-sensitive
    expect(isAppRole("SUPERADMIN")).toBe(false);
    expect(isAppRole(null)).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(isAppRole(42)).toBe(false);
  });
});

describe("isUserStatus", () => {
  it("accepts every real status", () => {
    for (const status of Object.values(USER_STATUSES)) {
      expect(isUserStatus(status)).toBe(true);
    }
  });

  it("rejects unknown statuses", () => {
    expect(isUserStatus("BANNED")).toBe(false);
    expect(isUserStatus("")).toBe(false);
  });
});

describe("ERROR_STATUS", () => {
  it("maps every declared error code to an HTTP status", () => {
    for (const status of Object.values(ERROR_STATUS)) {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });
});

describe("AppError", () => {
  it("carries the code and optional field errors through to the instance", () => {
    const err = new AppError("INVALID_ROLE", "bad role", { role: "must be valid" });
    expect(err.code).toBe("INVALID_ROLE");
    expect(err.message).toBe("bad role");
    expect(err.fields).toEqual({ role: "must be valid" });
    expect(err).toBeInstanceOf(Error);
  });
});
