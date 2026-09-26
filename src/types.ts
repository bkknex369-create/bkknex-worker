// Core request/response types for the AI Health gateway

export interface HealthContext {
  age?: number;
  gender?: "male" | "female" | "other" | "prefer_not_say";
  pregnancy_status?: "not_pregnant" | "pregnant" | "postpartum" | "unknown";
  menopause_stage?: "premenopausal" | "perimenopausal" | "postmenopausal";
  medication_names?: string[];
  allergies?: string[];
  chronic_conditions?: string[];
  activity_level?: "sedentary" | "light" | "moderate" | "vigorous";
  sleep_hours_per_night?: number;
  stress_level?: "low" | "moderate" | "high" | "very_high";
  diet_type?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationHistory {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  healthContext: HealthContext;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  safetyFlag?: {
    flagged: boolean;
    reason?: string;
    requiresProfessionalCare?: boolean;
  };
  metadata?: {
    preFaiFlags: string[];
    postAiFlags: string[];
    safetyRulesetVersion: string;
  };
}

export interface InsightRequest {
  healthContext: HealthContext;
}

export interface InsightResponse {
  insight: string;
  metadata?: {
    preFaiFlags: string[];
    postAiFlags: string[];
    safetyRulesetVersion: string;
  };
}

export interface VoiceTranscribeRequest {
  audioBlob: ArrayBuffer;
  format?: "wav" | "mp3" | "webm";
}

export interface VoiceTranscribeResponse {
  text: string;
  confidence?: number;
}

export interface VoiceSynthesizeRequest {
  text: string;
  voiceProfile?: {
    gender?: "male" | "female";
    accent?: string;
    speed?: number;
  };
}

export interface VoiceSynthesizeResponse {
  audioBlob: ArrayBuffer;
  format: "wav" | "mp3";
}

export interface ApiError {
  error: string;
  code: string;
  retryable: boolean;
  details?: Record<string, any>;
}

export interface SafetyMetadata {
  preAiFlags: string[];
  postAiFlags: string[];
  safetyRulesetVersion: string;
}
