import { SignJWT } from "jose";
import worker from "../index";

const TEST_SECRET = "test-supabase-jwt-secret-for-chat-tests-only";
const key = new TextEncoder().encode(TEST_SECRET);

async function validToken(): Promise<string> {
  return new SignJWT({ sub: "user123", aud: "test", iss: "test" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(key);
}

function fakeAi(run: jest.Mock): Ai {
  return { run } as unknown as Ai;
}

function baseEnv(run: jest.Mock) {
  return {
    AI_PROVIDER: "workers-ai",
    VOICE_PROVIDER: "null",
    AI: fakeAi(run),
    SAFETY_RULESET_VERSION: "1.0.0",
    SUPABASE_JWT_SECRET: TEST_SECRET,
  } as any;
}

function chatRequest(body: unknown, authHeader?: string): Request {
  return new Request("https://worker.example/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/chat", () => {
  it("rejects a request with no Authorization header", async () => {
    const run = jest.fn();
    const response = await worker.fetch(
      chatRequest({ message: "hi", healthContext: {} }),
      baseEnv(run)
    );

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("routes a valid request through the Workers AI provider and returns its reply", async () => {
    const run = jest.fn().mockResolvedValue({ response: "Drink water regularly and rest." });
    const token = await validToken();

    const response = await worker.fetch(
      chatRequest(
        { message: "How much water should I drink?", healthContext: {} },
        `Bearer ${token}`
      ),
      baseEnv(run)
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    expect(data.reply).toBe("Drink water regularly and rest.");
    expect(data.metadata.safetyRulesetVersion).toBeDefined();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toBe("@cf/zai-org/glm-5.3-flash");
  });

  it("returns a retryable 503 when the Workers AI call fails", async () => {
    const run = jest.fn().mockRejectedValue(new Error("model unavailable"));
    const token = await validToken();

    const response = await worker.fetch(
      chatRequest({ message: "hi", healthContext: {} }, `Bearer ${token}`),
      baseEnv(run)
    );

    expect(response.status).toBe(503);
    const data = (await response.json()) as any;
    expect(data.code).toBe("provider_error");
    expect(data.retryable).toBe(true);
  });

  it("rejects malformed JSON before touching the AI provider", async () => {
    const run = jest.fn();
    const token = await validToken();
    const request = new Request("https://worker.example/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "{not json",
    });

    const response = await worker.fetch(request, baseEnv(run));

    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects a health context carrying an identifier field without calling the provider", async () => {
    const run = jest.fn();
    const token = await validToken();

    const response = await worker.fetch(
      chatRequest(
        { message: "hi", healthContext: { email: "user@example.com" } },
        `Bearer ${token}`
      ),
      baseEnv(run)
    );

    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });
});
