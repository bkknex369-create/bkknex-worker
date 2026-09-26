// Health context minimization - only allow-listed fields pass through
// Rejects or strips anything else to prevent data leakage

import { HealthContext } from "../types";

// Exactly 11 allowed fields per task specification
const ALLOWED_FIELDS = [
  "age",
  "gender",
  "pregnancy_status",
  "menopause_stage",
  "medication_names",
  "allergies",
  "chronic_conditions",
  "activity_level",
  "sleep_hours_per_night",
  "stress_level",
  "diet_type",
] as const;

export interface ValidationResult {
  valid: boolean;
  context: HealthContext;
  strippedFields: string[];
  errors: string[];
}

export function validateAndMinimizeContext(
  input: unknown
): ValidationResult {
  const errors: string[] = [];
  const strippedFields: string[] = [];
  const cleanedContext: HealthContext = {};

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      context: {},
      strippedFields: [],
      errors: ["Health context must be an object"],
    };
  }

  const contextObj = input as Record<string, any>;

  // Check for identifiers
  const identifierFields = [
    "userId",
    "user_id",
    "email",
    "phone",
    "name",
    "firstName",
    "lastName",
    "address",
    "ssn",
    "id",
  ];

  for (const field of identifierFields) {
    if (field in contextObj) {
      errors.push(`Identifier field '${field}' not allowed in health context`);
      strippedFields.push(field);
    }
  }

  // Process allowed fields
  for (const field of ALLOWED_FIELDS) {
    if (field in contextObj) {
      const value = contextObj[field];

      // Type validation
      const error = validateFieldType(field, value);
      if (error) {
        errors.push(error);
        continue;
      }

      (cleanedContext as any)[field] = value;
    }
  }

  // Detect any other fields
  for (const field in contextObj) {
    if (!ALLOWED_FIELDS.includes(field as any) && !identifierFields.includes(field)) {
      strippedFields.push(field);
    }
  }

  return {
    valid: errors.length === 0,
    context: cleanedContext,
    strippedFields,
    errors,
  };
}

function validateFieldType(field: string, value: unknown): string | null {
  const typeRules: Record<string, string> = {
    age: "number",
    gender: "string",
    pregnancy_status: "string",
    menopause_stage: "string",
    activity_level: "string",
    sleep_hours_per_night: "number",
    stress_level: "string",
    diet_type: "string",
    medication_names: "array",
    allergies: "array",
    chronic_conditions: "array",
  };

  const expected = typeRules[field];
  const actual = Array.isArray(value) ? "array" : typeof value;

  if (expected && actual !== expected) {
    return `Field '${field}' has wrong type. Expected: ${expected}, got: ${actual}`;
  }

  // Enum validation for specific fields
  if (field === "gender" && !["male", "female", "other", "prefer_not_say"].includes(value as string)) {
    return `Invalid gender value: ${value}`;
  }

  if (field === "pregnancy_status" && !["not_pregnant", "pregnant", "postpartum", "unknown"].includes(value as string)) {
    return `Invalid pregnancy_status value: ${value}`;
  }

  if (field === "menopause_stage" && !["premenopausal", "perimenopausal", "postmenopausal"].includes(value as string)) {
    return `Invalid menopause_stage value: ${value}`;
  }

  if (field === "activity_level" && !["sedentary", "light", "moderate", "vigorous"].includes(value as string)) {
    return `Invalid activity_level value: ${value}`;
  }

  if (field === "stress_level" && !["low", "moderate", "high", "very_high"].includes(value as string)) {
    return `Invalid stress_level value: ${value}`;
  }

  return null;
}
