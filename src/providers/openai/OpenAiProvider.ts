import { AiProvider } from "../AiProvider";
import { HealthContext, ConversationMessage, SafetyMetadata } from "../../types";

export class OpenAiProvider implements AiProvider {
  name = "openai";
  private apiKey: string;
  private model = "gpt-4o-mini";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateReply(
    healthContext: HealthContext,
    message: string,
    history: ConversationMessage[]
  ): Promise<{ reply: string; metadata: SafetyMetadata }> {
    const systemPrompt = this.buildSystemPrompt();
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const reply = data.choices[0]?.message?.content || "";

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
    const systemPrompt = this.buildInsightSystemPrompt();
    const contextSummary = this.summarizeHealthContext(healthContext);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Based on this health context, provide one wellness insight: ${contextSummary}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const insight = data.choices[0]?.message?.content || "";

    return {
      insight,
      metadata: {
        preAiFlags: [],
        postAiFlags: [],
        safetyRulesetVersion: "1.0.0",
      },
    };
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
