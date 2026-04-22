import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { assertAuthenticated } from "./utils/auth";

interface SubmitVoteData {
  electionId: string;
  position: string;
  candidateId: string;
}

export const submitVote = onCall(async (request: CallableRequest<SubmitVoteData>) => {
  assertAuthenticated(request);

  const uid = request.auth!.uid;
  const { electionId, position, candidateId } = request.data;

  if (!electionId || !position || !candidateId) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();

  await db.runTransaction(async (transaction) => {
    // 1. Check if the election status is "open"
    const electionRef = db.collection("elections").doc(electionId);
    const electionDoc = await transaction.get(electionRef);

    if (!electionDoc.exists) {
      throw new HttpsError("not-found", "Election not found.");
    }

    if (electionDoc.data()?.status !== "open") {
      throw new HttpsError("failed-precondition", "Election is not open.");
    }

    // 2. Query votes where voterId == uid, electionId == eid, and position == pos
    const voteQuery = db.collection("votes")
      .where("voterId", "==", uid)
      .where("electionId", "==", electionId)
      .where("position", "==", position);

    const existingVotes = await transaction.get(voteQuery);

    if (!existingVotes.empty) {
      throw new HttpsError("already-exists", "User has already voted for this position.");
    }

    // 3. Verify candidate exists
    const candidateRef = electionRef.collection("candidates").doc(candidateId);
    const candidateDoc = await transaction.get(candidateRef);

    if (!candidateDoc.exists) {
      throw new HttpsError("not-found", "Candidate not found.");
    }

    // 4. Create vote document in votes/
    const newVoteRef = db.collection("votes").doc();
    transaction.set(newVoteRef, {
      voterId: uid,
      electionId,
      position,
      candidateId,
      timestamp: FieldValue.serverTimestamp()
    });

    // 5. Increment voteCount on the candidate document atomically
    transaction.update(candidateRef, {
      voteCount: FieldValue.increment(1)
    });
  });

  return { success: true };
});

