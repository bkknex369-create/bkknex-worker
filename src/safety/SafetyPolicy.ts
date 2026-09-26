// Versioned safety policy for AI Health & Wellness Companion
// Version 1.0.0 - Contract 5 compliance

export const SAFETY_RULESET_VERSION = "1.0.0";

export const ALLOWED_INTENTS = [
  "explain",
  "educate",
  "summarize",
  "track",
  "wellness_coaching",
  "healthy_habits",
  "user_data_explanation",
  "prepare_clinician_questions",
  "encourage_professional_care",
];

export const FORBIDDEN_INTENTS = [
  "diagnosis",
  "medication_change",
  "prescription",
  "claim_certainty",
  "replace_professional",
  "emergency_decision",
];

export const CRISIS_KEYWORDS = [
  "suicide",
  "suicidal",
  "kill myself",
  "harm myself",
  "self-harm",
  "overdose",
  "hurt myself",
  "end my life",
  "ending everything",
  "no point living",
  "hopeless",
  "worthless",
  "can't go on",
  "severe depression",
  "panic attack",
  "can't breathe",
];

export const MEDICATION_KEYWORDS = [
  "stop taking",
  "don't take",
  "skip your",
  "increase your",
  "decrease your",
  "change your medication",
  "prescription",
  "prescribe",
  "drug interaction",
];

export const DIAGNOSIS_KEYWORDS = [
  "you have",
  "do i have",
  "do i have a",
  "do you think i have",
  "you are",
  "i have",
  "diagnosed",
  "you definitely",
  "you must have",
  "it's definitely",
  "certainly",
  "you're suffering from",
  "you've got",
  "what do i have",
];

export const CERTAINTY_INDICATORS = [
  "definitely",
  "certainly",
  "absolutely",
  "100%",
  "guaranteed",
  "without a doubt",
  "for sure",
  "no question",
  "obviously",
  "clearly",
];

export interface SafetyClassification {
  isCrisis: boolean;
  isMedicationChange: boolean;
  isDiagnosisRequest: boolean;
  intent: string;
  confidenceScore: number;
}

export interface SafetyValidation {
  hasDiagnosis: boolean;
  hasPrescription: boolean;
  hasExcessiveCertainty: boolean;
  requiresEscalation: boolean;
  rewriteSuggestion?: string;
}

export function classifyInput(message: string): SafetyClassification {
  const lower = message.toLowerCase();
  
  const isCrisis = CRISIS_KEYWORDS.some(kw => lower.includes(kw));
  const isMedicationChange = MEDICATION_KEYWORDS.some(kw => lower.includes(kw));
  const isDiagnosisRequest = DIAGNOSIS_KEYWORDS.some(kw => lower.includes(kw));
  
  let intent = "unknown";
  if (isCrisis) intent = "crisis";
  else if (isMedicationChange) intent = "medication_change";
  else if (isDiagnosisRequest) intent = "diagnosis_request";
  else intent = "wellness_query";

  const confidenceScore = isCrisis || isMedicationChange || isDiagnosisRequest ? 0.95 : 0.5;

  return {
    isCrisis,
    isMedicationChange,
    isDiagnosisRequest,
    intent,
    confidenceScore,
  };
}

export function validateOutput(reply: string): SafetyValidation {
  const lower = reply.toLowerCase();
  
  const hasDiagnosis = DIAGNOSIS_KEYWORDS.some(kw => lower.includes(kw));
  const hasPrescription = MEDICATION_KEYWORDS.some(kw => lower.includes(kw));
  const hasExcessiveCertainty = CERTAINTY_INDICATORS.some(kw => lower.includes(kw));
  
  const requiresEscalation = hasDiagnosis || hasPrescription || hasExcessiveCertainty;

  return {
    hasDiagnosis,
    hasPrescription,
    hasExcessiveCertainty,
    requiresEscalation,
  };
}

export const CRISIS_RESPONSE = `I'm concerned about your wellbeing. Please reach out to a mental health professional or crisis service immediately:
- National Suicide Prevention Lifeline: 988 (call or text)
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

You deserve professional support. Please don't hesitate to reach out.`;

export const MEDICATION_REDIRECT = `I can't provide medication advice. Changes to your medications should only be made with your healthcare provider. Please contact your doctor or pharmacist before making any changes.`;

export const DIAGNOSIS_REDIRECT = `I'm not able to provide a diagnosis. If you're concerned about your health, please schedule an appointment with your healthcare provider who can properly evaluate your symptoms.`;

export const CERTAINTY_OVERRIDE = `I want to be careful here: I can provide education and general wellness information, but I can't make medical conclusions based on the information you've shared. Please consult with a healthcare professional for personalized medical advice.`;
