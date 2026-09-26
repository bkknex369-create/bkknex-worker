import { HealthContext, ConversationMessage, SafetyMetadata } from "../types";

export interface AiProvider {
  name: string;
  generateReply(
    healthContext: HealthContext,
    message: string,
    history: ConversationMessage[]
  ): Promise<{ reply: string; metadata: SafetyMetadata }>;

  generateInsight(
    healthContext: HealthContext
  ): Promise<{ insight: string; metadata: SafetyMetadata }>;
}
