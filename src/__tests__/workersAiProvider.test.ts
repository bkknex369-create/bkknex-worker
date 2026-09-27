import { WorkersAiProvider, DEFAULT_WORKERS_AI_MODEL } from "../providers/workersAi/WorkersAiProvider";
import { HealthContext } from "../types";

function fakeAi(run: (model: string, input: unknown) => Promise<unknown>): Ai {
  return { run } as unknown as Ai;
}

const context: HealthContext = { age: 30, activity_level: "moderate" };

describe("WorkersAiProvider", () => {
  it("calls env.AI.run with the configured model and a system + user message", async () => {
    const run = jest.fn().mockResolvedValue({ response: "Stay hydrated and rest well." });
    const provider = new WorkersAiProvider(fakeAi(run));

    const result = await provider.generateReply(context, "How much water should I drink?", []);

    expect(run).toHaveBeenCalledTimes(1);
    const [model, input] = run.mock.calls[0];
    expect(model).toBe(DEFAULT_WORKERS_AI_MODEL);
    expect((input as any).messages[0].role).toBe("system");
    expect((input as any).messages.at(-1)).toEqual({
      role: "user",
      content: "How much water should I drink?",
    });
    expect(result.reply).toBe("Stay hydrated and rest well.");
    expect(result.metadata.safetyRulesetVersion).toBe("1.0.0");
  });

  it("includes prior conversation history between the system and user messages", async () => {
    const run = jest.fn().mockResolvedValue({ response: "ok" });
    const provider = new WorkersAiProvider(fakeAi(run));

    await provider.generateReply(context, "and now?", [
      { role: "user", content: "earlier question" },
      { role: "assistant", content: "earlier answer" },
    ]);

    const input = run.mock.calls[0][1] as any;
    expect(input.messages.map((m: any) => m.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
    ]);
  });

  it("never sends diagnosis/prescription instructions in the system prompt", async () => {
    const run = jest.fn().mockResolvedValue({ response: "ok" });
    const provider = new WorkersAiProvider(fakeAi(run));

    await provider.generateReply(context, "hi", []);

    const systemMessage = (run.mock.calls[0][1] as any).messages[0].content as string;
    expect(systemMessage).toContain("MUST NOT");
    expect(systemMessage).toContain("Prescribe");
    expect(systemMessage.toLowerCase()).toContain("professional");
  });

  it("generates an insight from a summarized health context", async () => {
    const run = jest.fn().mockResolvedValue({ response: "Take a short walk today." });
    const provider = new WorkersAiProvider(fakeAi(run));

    const result = await provider.generateInsight(context);

    expect(result.insight).toBe("Take a short walk today.");
    const userMessage = (run.mock.calls[0][1] as any).messages[1].content as string;
    expect(userMessage).toContain("Age: 30");
    expect(userMessage).toContain("Activity level: moderate");
  });

  it("wraps a rejected env.AI.run call as a retryable provider_error", async () => {
    const run = jest.fn().mockRejectedValue(new Error("upstream unavailable"));
    const provider = new WorkersAiProvider(fakeAi(run));

    await expect(provider.generateReply(context, "hi", [])).rejects.toMatchObject({
      statusCode: 503,
      code: "provider_error",
    });
  });

  it("treats an empty model response as a provider_error", async () => {
    const run = jest.fn().mockResolvedValue({ response: "" });
    const provider = new WorkersAiProvider(fakeAi(run));

    await expect(provider.generateReply(context, "hi", [])).rejects.toMatchObject({
      statusCode: 503,
      code: "provider_error",
    });
  });
});
