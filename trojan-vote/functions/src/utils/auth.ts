import { CallableRequest } from "firebase-functions/v2/https";
import { Firestore } from "firebase-admin/firestore";
import { UnauthenticatedError, UnauthorizedError } from "./errors";

/**
 * Asserts that the user is authenticated.
 * @param request The callable request object.
 * @throws UnauthenticatedError if not authenticated.
 */
export function assertAuthenticated(request: CallableRequest<any>): void {
  if (!request.auth) {
    throw new UnauthenticatedError();
  }
}

/**
 * Fetches the user's role from Firestore.
 * @param uid The user's UID.
 * @param firestore The Firestore instance.
 * @returns The user's role or null if not found.
 */
async function getUserRole(uid: string, firestore: Firestore): Promise<string | null> {
  const userDoc = await firestore.collection("users").doc(uid).get();
  return userDoc.exists ? userDoc.data()?.role : null;
}

/**
 * Asserts that the user is an admin.
 * @param request The callable request object.
 * @param firestore The Firestore instance.
 * @throws UnauthenticatedError if not authenticated.
 * @throws UnauthorizedError if not an admin.
 */
export async function assertAdmin(
  request: CallableRequest<any>,
  firestore: Firestore
): Promise<void> {
  assertAuthenticated(request);

  const uid = request.auth!.uid;
  const role = await getUserRole(uid, firestore);

  if (role !== "admin") {
    throw new UnauthorizedError("Admin permissions required.");
  }
}
