// Stage 1: Pre-AI classification (Contract 5)
// Deterministic rule-based flags BEFORE calling the provider

import { classifyInput, SAFETY_RULESET_VERSION } from "./SafetyPolicy";
import {
  CRISIS_RESPONSE,
  MEDICATION_REDIRECT,
  DIAGNOSIS_REDIRECT,
} from "./SafetyPolicy";

export interface PreAiClassificationResult {
  flags: string[];
  shouldBypass: boolean;
  bypassResponse?: string;
  intent: string;
  rulesetVersion: string;
}

export function classifyPreAi(message: string): PreAiClassificationResult {
  const classification = classifyInput(message);
  const flags: string[] = [];

  if (classification.isCrisis) {
    flags.push("crisis_language_detected");
  }
  if (classification.isMedicationChange) {
    flags.push("medication_change_attempt");
  }
  if (classification.isDiagnosisRequest) {
    flags.push("diagnosis_request");
  }

  let shouldBypass = false;
  let bypassResponse: string | undefined;

  if (classification.isCrisis) {
    shouldBypass = true;
    bypassResponse = CRISIS_RESPONSE;
  } else if (classification.isMedicationChange) {
    shouldBypass = true;
    bypassResponse = MEDICATION_REDIRECT;
  } else if (classification.isDiagnosisRequest) {
    shouldBypass = true;
    bypassResponse = DIAGNOSIS_REDIRECT;
  }

  return {
    flags,
    shouldBypass,
    bypassResponse,
    intent: classification.intent,
    rulesetVersion: SAFETY_RULESET_VERSION,
  };
}
