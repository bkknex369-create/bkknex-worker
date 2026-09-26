import { AiProvider } from "../AiProvider";
import { HealthContext, ConversationMessage, SafetyMetadata } from "../../types";

export class GeminiProvider implements AiProvider {
  name = "gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateReply(
    healthContext: HealthContext,
    message: string,
    history: ConversationMessage[]
  ): Promise<{ reply: string; metadata: SafetyMetadata }> {
    const error: any = new Error("Gemini provider is not yet connected");
    error.statusCode = 501;
    error.code = "provider_not_connected";
    throw error;
  }

  async generateInsight(
    healthContext: HealthContext
  ): Promise<{ insight: string; metadata: SafetyMetadata }> {
    const error: any = new Error("Gemini provider is not yet connected");
    error.statusCode = 501;
    error.code = "provider_not_connected";
    throw error;
  }
}
