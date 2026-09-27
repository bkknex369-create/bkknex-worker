// Supabase JWT validation
// Extracts and cryptographically verifies a Bearer token from requests.

import { jwtVerify } from "jose";

export interface JwtPayload {
  sub: string;
  email?: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
}

export interface ValidationResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verifies the token's HS256 signature against the Supabase project JWT
 * secret before trusting any claim. Structural-only checks (no signature
 * verification) let a caller forge an arbitrary `sub` and impersonate any
 * user, so `jwtSecret` is required, not optional.
 */
export async function extractAndValidateToken(
  authHeader: string | null,
  jwtSecret: string | undefined
): Promise<ValidationResult> {
  if (!authHeader) {
    return {
      valid: false,
      error: "Missing Authorization header",
    };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return {
      valid: false,
      error: "Invalid Authorization header format. Expected: Bearer <token>",
    };
  }

  const token = parts[1];
  if (!token) {
    return {
      valid: false,
      error: "Empty token",
    };
  }

  const jwtParts = token.split(".");
  if (jwtParts.length !== 3) {
    return {
      valid: false,
      error: "Invalid JWT format",
    };
  }

  if (!jwtSecret) {
    return {
      valid: false,
      error: "Server misconfigured: SUPABASE_JWT_SECRET not set",
    };
  }

  try {
    const key = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify<JwtPayload>(token, key);

    if (!payload.sub) {
      return {
        valid: false,
        error: "Token missing user ID (sub claim)",
      };
    }

    return {
      valid: true,
      userId: payload.sub,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.toLowerCase().includes("exp")) {
      return {
        valid: false,
        error: "Token has expired",
      };
    }
    return {
      valid: false,
      error: "Invalid token signature or payload",
    };
  }
}
