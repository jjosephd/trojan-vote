import { Firestore, FieldValue } from "firebase-admin/firestore";

/**
 * Logs an administrative action to the auditLogs collection.
 * @param firestore The Firestore instance.
 * @param action The action performed (e.g., "CREATE_ELECTION").
 * @param performedBy The UID of the admin who performed the action.
 * @param targetId The ID of the affected resource (e.g., electionId).
 * @param details Additional metadata about the action.
 */
export async function logAdminAction(
  firestore: Firestore,
  action: string,
  performedBy: string,
  targetId: string,
  details: Record<string, any> = {}
): Promise<void> {
  await firestore.collection("auditLogs").add({
    action,
    performedBy,
    targetId,
    details,
    timestamp: FieldValue.serverTimestamp(),
  });
}
