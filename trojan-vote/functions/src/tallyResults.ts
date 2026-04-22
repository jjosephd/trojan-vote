import { onCall, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { assertAdmin } from "./utils/auth";
import { logAdminAction } from "./utils/audit";
import { ValidationError, NotFoundError } from "./utils/errors";

interface TallyResultsData {
  electionId: string;
}

export const tallyResults = onCall(async (request: CallableRequest<TallyResultsData>) => {
  const db = admin.firestore();
  await assertAdmin(request, db);

  const { electionId } = request.data;
  const uid = request.auth!.uid;

  if (!electionId) {
    throw new ValidationError("Election ID is required.");
  }

  const electionRef = db.collection("elections").doc(electionId);
  const electionDoc = await electionRef.get();
  if (!electionDoc.exists) {
    throw new NotFoundError("Election not found.");
  }

  // Fetch all candidates for this election
  const candidatesSnapshot = await electionRef.collection("candidates").get();
  const candidates = candidatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const results: any[] = [];
  const discrepancies: any[] = [];

  for (const candidate of candidates) {
    // Count actual votes in the 'votes' collection
    const votesSnapshot = await db.collection("votes")
      .where("electionId", "==", electionId)
      .where("candidateId", "==", candidate.id)
      .count()
      .get();
    
    const actualCount = votesSnapshot.data().count;
    const recordedCount = (candidate as any).voteCount || 0;

    results.push({
      candidateId: candidate.id,
      candidateName: (candidate as any).name,
      actualCount,
      recordedCount
    });

    if (actualCount !== recordedCount) {
      discrepancies.push({
        candidateId: candidate.id,
        actualCount,
        recordedCount
      });
      
      // Optionally update the candidate's voteCount to match actual votes
      await electionRef.collection("candidates").doc(candidate.id).update({
        voteCount: actualCount,
        talliedAt: FieldValue.serverTimestamp()
      });
    }
  }

  await logAdminAction(db, "TALLY_RESULTS", uid, electionId, {
    totalCandidates: candidates.length,
    discrepanciesCount: discrepancies.length,
    results
  });

  return {
    success: true,
    electionId,
    results,
    discrepanciesFound: discrepancies.length > 0,
    discrepancies
  };
});
