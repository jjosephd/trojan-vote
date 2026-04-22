import { HttpsError } from "firebase-functions/v2/https";

/**
 * Reusable error for unauthenticated requests.
 */
export class UnauthenticatedError extends HttpsError {
  constructor(message = "User must be authenticated.") {
    super("unauthenticated", message);
  }
}

/**
 * Reusable error for unauthorized (permission denied) requests.
 */
export class UnauthorizedError extends HttpsError {
  constructor(message = "User does not have required permissions.") {
    super("permission-denied", message);
  }
}

/**
 * Reusable error for invalid input data.
 */
export class ValidationError extends HttpsError {
  constructor(message: string) {
    super("invalid-argument", message);
  }
}

/**
 * Reusable error for resource not found.
 */
export class NotFoundError extends HttpsError {
  constructor(message: string) {
    super("not-found", message);
  }
}
