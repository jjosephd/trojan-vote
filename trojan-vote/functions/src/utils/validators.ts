import { ValidationError } from "./errors";

/**
 * Validates that a value is a non-empty string.
 * @param value The value to validate.
 * @param fieldName The name of the field for the error message.
 * @throws ValidationError if invalid.
 */
function requiredString(value: any, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required and must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * Validates that an election ID is a non-empty string.
 * @param electionId The election ID to validate.
 * @throws ValidationError if invalid.
 */
export function validateElectionId(electionId: any): string {
  return requiredString(electionId, "Election ID");
}

/**
 * Validates candidate data for creation or update.
 * @param data The candidate data to validate.
 * @throws ValidationError if invalid.
 */
export function validateCandidateData(data: any): { name: string; description?: string } {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Invalid candidate data.");
  }

  const name = requiredString(data.name, "Candidate name");

  return {
    name,
    description: typeof data.description === "string" ? data.description.trim() : undefined,
  };
}
