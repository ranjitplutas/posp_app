import { describe, expect, it } from "vitest";
import { signAppJwt, verifyAppJwt } from "../src/modules/auth/jwt.js";

describe("signAppJwt / verifyAppJwt", () => {
  it("round-trips claims through sign and verify", async () => {
    const { token, expiresIn } = await signAppJwt({
      sub: "user-123",
      email: "test@example.com",
      name: "Test User",
      role: "ADMIN",
      status: "ACTIVE",
    });

    expect(expiresIn).toBeGreaterThan(0);

    const claims = await verifyAppJwt(token);
    expect(claims.sub).toBe("user-123");
    expect(claims.email).toBe("test@example.com");
    expect(claims.role).toBe("ADMIN");
    expect(claims.status).toBe("ACTIVE");
  });

  it("rejects a tampered token", async () => {
    const { token } = await signAppJwt({ sub: "user-1", email: "a@b.com", name: "A", role: null, status: "PENDING_ROLE" });
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifyAppJwt(tampered)).rejects.toThrow();
  });

  it("rejects a garbage token with AUTH_TOKEN_INVALID", async () => {
    await expect(verifyAppJwt("not.a.jwt")).rejects.toMatchObject({ code: "AUTH_TOKEN_INVALID" });
  });
});
