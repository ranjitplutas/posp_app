import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../src/modules/users/cursor.js";

describe("cursor encode/decode", () => {
  it("round-trips a valid cursor", () => {
    const cursor = { createdAt: "2026-07-16T09:55:00.000Z", id: "abc-123" };
    const encoded = encodeCursor(cursor);
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it("returns null for undefined input", () => {
    expect(decodeCursor(undefined)).toBeNull();
  });

  it("returns null for garbage/tampered input instead of throwing", () => {
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url"))).toBeNull();
  });
});
