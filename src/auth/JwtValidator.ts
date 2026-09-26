// Supabase JWT validation
// Extracts and validates Bearer token from requests

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

export function extractAndValidateToken(
  authHeader: string | null
): ValidationResult {
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

  // Basic JWT validation (checking structure)
  // In production with Supabase, you would verify the signature
  const jwtParts = token.split(".");
  if (jwtParts.length !== 3) {
    return {
      valid: false,
      error: "Invalid JWT format",
    };
  }

  try {
    const payload = JSON.parse(atob(jwtParts[1])) as JwtPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return {
        valid: false,
        error: "Token has expired",
      };
    }

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
    return {
      valid: false,
      error: "Invalid token payload",
    };
  }
}
