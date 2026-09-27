import { AiProvider } from "../AiProvider";
import { HealthContext, ConversationMessage, SafetyMetadata } from "../../types";

export const DEFAULT_WORKERS_AI_MODEL = "@cf/zai-org/glm-5.3-flash";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class WorkersAiProvider implements AiProvider {
  name = "workers-ai";
  private ai: Ai;
  private model: string;

  constructor(ai: Ai, model: string = DEFAULT_WORKERS_AI_MODEL) {
    this.ai = ai;
    this.model = model;
  }

  async generateReply(
    healthContext: HealthContext,
    message: string,
    history: ConversationMessage[]
  ): Promise<{ reply: string; metadata: SafetyMetadata }> {
    const messages: ChatMessage[] = [
      { role: "system", content: this.buildSystemPrompt() },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const reply = await this.runChat(messages);

    return {
      reply,
      metadata: {
        preAiFlags: [],
        postAiFlags: [],
        safetyRulesetVersion: "1.0.0",
      },
    };
  }

  async generateInsight(
    healthContext: HealthContext
  ): Promise<{ insight: string; metadata: SafetyMetadata }> {
    const contextSummary = this.summarizeHealthContext(healthContext);
    const messages: ChatMessage[] = [
      { role: "system", content: this.buildInsightSystemPrompt() },
      {
        role: "user",
        content: `Based on this health context, provide one wellness insight: ${contextSummary}`,
      },
    ];

    const insight = await this.runChat(messages);

    return {
      insight,
      metadata: {
        preAiFlags: [],
        postAiFlags: [],
        safetyRulesetVersion: "1.0.0",
      },
    };
  }

  private async runChat(messages: ChatMessage[]): Promise<string> {
    let result: any;
    try {
      result = await this.ai.run(this.model as any, { messages } as any);
    } catch (e: any) {
      const error: any = new Error(
        `Workers AI request failed: ${e?.message || String(e)}`
      );
      error.statusCode = 503;
      error.code = "provider_error";
      throw error;
    }

    const reply =
      typeof result === "string"
        ? result
        : result?.response ?? result?.choices?.[0]?.message?.content ?? "";

    if (!reply) {
      const error: any = new Error("Workers AI returned an empty response");
      error.statusCode = 503;
      error.code = "provider_error";
      throw error;
    }

    return reply;
  }

  private buildSystemPrompt(): string {
    return `You are a supportive wellness companion for the AI Health & Wellness app.
Your role is to:
- Explain health concepts and wellness strategies
- Educate about healthy habits
- Help users understand their health information
- Suggest questions to ask healthcare professionals
- Encourage seeking professional care when appropriate

You MUST NOT:
- Provide definitive diagnoses
- Prescribe, recommend changing, or stopping medications
- Claim certainty from limited information
- Replace professional medical advice
- Make emergency medical decisions
- Provide mental health crisis intervention (redirect to crisis resources)

Always prioritize safety and defer to professionals.`;
  }

  private buildInsightSystemPrompt(): string {
    return `You are a wellness insights generator. Provide one helpful, actionable wellness insight
based on the user's health context. Keep it brief, positive, and focused on healthy habits.
Never diagnose or prescribe.`;
  }

  private summarizeHealthContext(context: HealthContext): string {
    const parts: string[] = [];
    if (context.age) parts.push(`Age: ${context.age}`);
    if (context.activity_level) parts.push(`Activity level: ${context.activity_level}`);
    if (context.sleep_hours_per_night)
      parts.push(`Sleep: ${context.sleep_hours_per_night} hours`);
    if (context.stress_level) parts.push(`Stress level: ${context.stress_level}`);
    if (context.chronic_conditions?.length)
      parts.push(`Conditions: ${context.chronic_conditions.join(", ")}`);
    return parts.join("; ") || "No specific health context provided";
  }
}
