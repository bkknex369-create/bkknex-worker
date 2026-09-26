// Stage 2: Post-AI validation (Contract 5)
// Deterministic rule-based checks AFTER getting the provider response

import { validateOutput, SAFETY_RULESET_VERSION } from "./SafetyPolicy";
import { CERTAINTY_OVERRIDE } from "./SafetyPolicy";

export interface PostAiValidationResult {
  flags: string[];
  isValid: boolean;
  rewrittenResponse?: string;
  escalationRequired: boolean;
  rulesetVersion: string;
}

export function validatePostAi(reply: string): PostAiValidationResult {
  const validation = validateOutput(reply);
  const flags: string[] = [];

  if (validation.hasDiagnosis) {
    flags.push("diagnosis_language_detected");
  }
  if (validation.hasPrescription) {
    flags.push("prescription_language_detected");
  }
  if (validation.hasExcessiveCertainty) {
    flags.push("excessive_certainty");
  }

  let rewrittenResponse: string | undefined;
  let isValid = !validation.requiresEscalation;

  if (validation.requiresEscalation) {
    rewrittenResponse = injectSafetyOverride(reply, validation);
    isValid = false;
  }

  return {
    flags,
    isValid,
    rewrittenResponse,
    escalationRequired: validation.requiresEscalation,
    rulesetVersion: SAFETY_RULESET_VERSION,
  };
}

function injectSafetyOverride(
  originalReply: string,
  validation: any
): string {
  // Construct a safe response based on what went wrong
  if (validation.hasDiagnosis || validation.hasPrescription) {
    return CERTAINTY_OVERRIDE;
  }

  // If only certainty issue, modify the response
  if (validation.hasExcessiveCertainty) {
    return (
      originalReply +
      "\n\n(Disclaimer: I'm an AI assistant providing general wellness information, not medical advice. Please consult a healthcare professional for personalized guidance.)"
    );
  }

  return originalReply;
}
