import { ProviderRegistryImpl } from "./providers";
import { extractAndValidateToken } from "./auth/JwtValidator";
import { validateAndMinimizeContext } from "./context/HealthContextValidator";
import { classifyPreAi } from "./safety/PreAiClassifier";
import { validatePostAi } from "./safety/PostAiValidator";
import { ChatRequest, ChatResponse, InsightResponse, ApiError } from "./types";

interface Env {
  AI_PROVIDER: string;
  VOICE_PROVIDER: string;
  OPENAI_API_KEY: string;
  ZAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  SAFETY_RULESET_VERSION: string;
  /** Supabase project JWT secret (HS256). Required to cryptographically
   * verify the Authorization: Bearer token on every request; set via
   * `wrangler secret put SUPABASE_JWT_SECRET`, never committed. */
  SUPABASE_JWT_SECRET: string;
}

const ALLOWED_ORIGINS = ["http://localhost:3000", "https://health.bkknex.com"];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://health.bkknex.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function errorResponse(error: string, code: string, statusCode = 400, retryable = false): Response {
  const apiError: ApiError = {
    error,
    code,
    retryable,
  };
  return new Response(JSON.stringify(apiError), {
    status: statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function successResponse(data: any, statusCode = 200): Response {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const authResult = await extractAndValidateToken(authHeader, env.SUPABASE_JWT_SECRET);

  if (!authResult.valid) {
    return errorResponse(authResult.error || "Auth failed", "auth_failed", 401);
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", "invalid_request", 400);
  }

  const contextValidation = validateAndMinimizeContext(body.healthContext);
  if (!contextValidation.valid) {
    return errorResponse(
      `Invalid health context: ${contextValidation.errors.join(", ")}`,
      "invalid_context",
      400
    );
  }

  const preAiResult = classifyPreAi(body.message);
  if (preAiResult.shouldBypass) {
    const response: ChatResponse = {
      reply: preAiResult.bypassResponse || "Safety bypass triggered",
      conversationId: body.conversationId || "new",
      safetyFlag: {
        flagged: true,
        reason: preAiResult.intent,
        requiresProfessionalCare: preAiResult.intent === "crisis",
      },
      metadata: {
        preFaiFlags: preAiResult.flags,
        postAiFlags: [],
        safetyRulesetVersion: preAiResult.rulesetVersion,
      },
    };
    return successResponse(response);
  }

  try {
    const registry = new ProviderRegistryImpl(env as any);
    const aiProvider = registry.getAiProvider();

    const aiResult = await aiProvider.generateReply(
      contextValidation.context,
      body.message,
      []
    );

    const postAiResult = validatePostAi(aiResult.reply);
    const finalReply = postAiResult.rewrittenResponse || aiResult.reply;

    const response: ChatResponse = {
      reply: finalReply,
      conversationId: body.conversationId || "new",
      safetyFlag: postAiResult.escalationRequired
        ? {
            flagged: true,
            reason: "Post-AI validation triggered",
            requiresProfessionalCare: true,
          }
        : undefined,
      metadata: {
        preFaiFlags: preAiResult.flags,
        postAiFlags: postAiResult.flags,
        safetyRulesetVersion: postAiResult.rulesetVersion,
      },
    };

    return successResponse(response);
  } catch (e: any) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Provider error:", error.message);
    return errorResponse(
      "AI provider error",
      "provider_error",
      503,
      true
    );
  }
}

async function handleInsight(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const authResult = await extractAndValidateToken(authHeader, env.SUPABASE_JWT_SECRET);

  if (!authResult.valid) {
    return errorResponse(authResult.error || "Auth failed", "auth_failed", 401);
  }

  let body: { healthContext: any };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", "invalid_request", 400);
  }

  const contextValidation = validateAndMinimizeContext(body.healthContext);
  if (!contextValidation.valid) {
    return errorResponse(
      `Invalid health context: ${contextValidation.errors.join(", ")}`,
      "invalid_context",
      400
    );
  }

  try {
    const registry = new ProviderRegistryImpl(env as any);
    const aiProvider = registry.getAiProvider();

    const aiResult = await aiProvider.generateInsight(contextValidation.context);
    const postAiResult = validatePostAi(aiResult.insight);
    const finalInsight = postAiResult.rewrittenResponse || aiResult.insight;

    const response: InsightResponse = {
      insight: finalInsight,
      metadata: {
        preFaiFlags: [],
        postAiFlags: postAiResult.flags,
        safetyRulesetVersion: postAiResult.rulesetVersion,
      },
    };

    return successResponse(response);
  } catch (e: any) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Provider error:", error.message);
    return errorResponse(
      "AI provider error",
      "provider_error",
      503,
      true
    );
  }
}

async function handleVoiceTranscribe(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const authResult = await extractAndValidateToken(authHeader, env.SUPABASE_JWT_SECRET);

  if (!authResult.valid) {
    return errorResponse(authResult.error || "Auth failed", "auth_failed", 401);
  }

  try {
    const registry = new ProviderRegistryImpl(env as any);
    const voiceProvider = registry.getVoiceProvider();
    return errorResponse(
      voiceProvider.name === "null"
        ? "Voice transcription is not implemented in Phase 0"
        : "Voice transcription not available",
      "not_implemented",
      501
    );
  } catch (e: any) {
    return errorResponse(
      "Voice provider not available",
      "not_implemented",
      501
    );
  }
}

async function handleVoiceSynthesize(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const authResult = await extractAndValidateToken(authHeader, env.SUPABASE_JWT_SECRET);

  if (!authResult.valid) {
    return errorResponse(authResult.error || "Auth failed", "auth_failed", 401);
  }

  try {
    const registry = new ProviderRegistryImpl(env as any);
    const voiceProvider = registry.getVoiceProvider();
    return errorResponse(
      voiceProvider.name === "null"
        ? "Voice synthesis is not implemented in Phase 0"
        : "Voice synthesis not available",
      "not_implemented",
      501
    );
  } catch (e: any) {
    return errorResponse(
      "Voice provider not available",
      "not_implemented",
      501
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/ai/chat" && request.method === "POST") {
      return handleChat(request, env);
    }

    if (path === "/api/ai/insight" && request.method === "POST") {
      return handleInsight(request, env);
    }

    if (path === "/api/ai/voice/transcribe" && request.method === "POST") {
      return handleVoiceTranscribe(request, env);
    }

    if (path === "/api/ai/voice/synthesize" && request.method === "POST") {
      return handleVoiceSynthesize(request, env);
    }

    if (path === "/health" && request.method === "GET") {
      return successResponse({ status: "ok" });
    }

    return errorResponse("Endpoint not found", "not_found", 404);
  },
};
