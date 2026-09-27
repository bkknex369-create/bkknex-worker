import { SignJWT } from "jose";
import { extractAndValidateToken } from "../auth/JwtValidator";

const TEST_SECRET = "test-supabase-jwt-secret-for-unit-tests-only";
const key = new TextEncoder().encode(TEST_SECRET);

async function signToken(claims: Record<string, unknown>, expSecondsFromNow: number) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSecondsFromNow)
    .sign(key);
}

describe("JWT Authentication", () => {
  it("should reject missing Authorization header", async () => {
    const result = await extractAndValidateToken(null, TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("should reject malformed Authorization header", async () => {
    const result = await extractAndValidateToken("NotBearer token", TEST_SECRET);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid JWT format", async () => {
    const result = await extractAndValidateToken("Bearer invalid", TEST_SECRET);
    expect(result.valid).toBe(false);
  });

  it("should reject a request when the server has no configured secret", async () => {
    const token = await signToken({ sub: "user123", aud: "test", iss: "test" }, 3600);
    const result = await extractAndValidateToken(`Bearer ${token}`, undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("misconfigured");
  });

  it("should reject expired token", async () => {
    const token = await signToken({ sub: "user123", aud: "test", iss: "test" }, -3600);
    const result = await extractAndValidateToken(`Bearer ${token}`, TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("should accept valid token", async () => {
    const token = await signToken({ sub: "user123", aud: "test", iss: "test" }, 3600);
    const result = await extractAndValidateToken(`Bearer ${token}`, TEST_SECRET);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe("user123");
  });

  it("should reject a token signed with the wrong secret (forged/tampered)", async () => {
    const wrongKey = new TextEncoder().encode("a-completely-different-secret");
    const token = await new SignJWT({ sub: "attacker", aud: "test", iss: "test" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(wrongKey);
    const result = await extractAndValidateToken(`Bearer ${token}`, TEST_SECRET);
    expect(result.valid).toBe(false);
  });

  it("should reject a structurally-valid but unsigned token (the old bypass)", async () => {
    const payload = JSON.stringify({
      sub: "user123",
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: "test",
      iss: "test",
    });
    const forged = `header.${Buffer.from(payload).toString("base64url")}.signature`;
    const result = await extractAndValidateToken(`Bearer ${forged}`, TEST_SECRET);
    expect(result.valid).toBe(false);
  });
});
