import { extractAndValidateToken } from "../auth/JwtValidator";

describe("JWT Authentication", () => {
  it("should reject missing Authorization header", () => {
    const result = extractAndValidateToken(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("should reject malformed Authorization header", () => {
    const result = extractAndValidateToken("NotBearer token");
    expect(result.valid).toBe(false);
  });

  it("should reject invalid JWT format", () => {
    const result = extractAndValidateToken("Bearer invalid");
    expect(result.valid).toBe(false);
  });

  it("should reject expired token", () => {
    const expiredPayload = JSON.stringify({
      sub: "user123",
      exp: Math.floor(Date.now() / 1000) - 3600,
      aud: "test",
      iss: "test",
    });
    const token = `header.${btoa(expiredPayload)}.signature`;
    const result = extractAndValidateToken(`Bearer ${token}`);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("should accept valid token", () => {
    const validPayload = JSON.stringify({
      sub: "user123",
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: "test",
      iss: "test",
    });
    const token = `header.${btoa(validPayload)}.signature`;
    const result = extractAndValidateToken(`Bearer ${token}`);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe("user123");
  });
});
