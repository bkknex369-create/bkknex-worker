import { validateAndMinimizeContext } from "../context/HealthContextValidator";

describe("Health Context Minimization", () => {
  it("should accept all allowed fields", () => {
    const context = {
      age: 35,
      gender: "female",
      pregnancy_status: "not_pregnant",
      activity_level: "moderate",
      sleep_hours_per_night: 7,
      stress_level: "low",
      medication_names: ["aspirin"],
      allergies: ["peanuts"],
      chronic_conditions: ["asthma"],
      menopause_stage: "premenopausal",
      diet_type: "balanced",
    };
    const result = validateAndMinimizeContext(context);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.context)).toHaveLength(11);
  });

  it("should strip identifier fields", () => {
    const context = {
      age: 35,
      userId: "user123",
      email: "user@example.com",
      activity_level: "moderate",
    };
    const result = validateAndMinimizeContext(context);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(!("userId" in result.context)).toBe(true);
    expect(result.strippedFields).toContain("userId");
  });

  it("should reject invalid field types", () => {
    const context = {
      age: "not a number",
      activity_level: "moderate",
    };
    const result = validateAndMinimizeContext(context);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("wrong type"))).toBe(true);
  });

  it("should strip unknown fields", () => {
    const context = {
      age: 35,
      activity_level: "moderate",
      unknown_field: "should be stripped",
    };
    const result = validateAndMinimizeContext(context);
    expect(result.strippedFields).toContain("unknown_field");
  });

  it("should validate enum values", () => {
    const context = {
      gender: "invalid_gender",
      activity_level: "moderate",
    };
    const result = validateAndMinimizeContext(context);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid gender"))).toBe(true);
  });
});
