import { onCall, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { assertAdmin } from "./utils/auth";
import { logAdminAction } from "./utils/audit";
import { ValidationError, NotFoundError } from "./utils/errors";
import { validateCandidateData } from "./utils/validators";

interface ManageCandidateData {
  action: "add" | "edit" | "remove";
  electionId: string;
  candidateId?: string;
  data?: {
    name?: string;
    position?: string;
    description?: string;
  };
}

export const manageCandidate = onCall(async (request: CallableRequest<ManageCandidateData>) => {
  const db = admin.firestore();
  await assertAdmin(request, db);

  const { action, electionId, candidateId, data } = request.data;
  const uid = request.auth!.uid;

  if (!electionId) {
    throw new ValidationError("Election ID is required.");
  }

  const electionRef = db.collection("elections").doc(electionId);
  const electionDoc = await electionRef.get();
  if (!electionDoc.exists) {
    throw new NotFoundError("Election not found.");
  }

  switch (action) {
    case "add": {
      const validatedData = validateCandidateData(data);
      const candidateRef = electionRef.collection("candidates").doc();
      const candidateDoc = {
        ...validatedData,
        voteCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      };
      await candidateRef.set(candidateDoc);
      await logAdminAction(db, "ADD_CANDIDATE", uid, candidateRef.id, { electionId, ...candidateDoc });
      return { success: true, candidateId: candidateRef.id };
    }

    case "edit": {
      if (!candidateId) throw new ValidationError("Candidate ID is required for edit.");
      const candidateRef = electionRef.collection("candidates").doc(candidateId);
      const candidateDoc = await candidateRef.get();
      if (!candidateDoc.exists) throw new NotFoundError("Candidate not found.");

      const updateData: any = {};
      if (data?.name) updateData.name = data.name.trim();
      if (data?.position) updateData.position = data.position.trim();
      if (data?.description !== undefined) updateData.description = data.description.trim();
      updateData.updatedAt = FieldValue.serverTimestamp();

      await candidateRef.update(updateData);
      await logAdminAction(db, "EDIT_CANDIDATE", uid, candidateId, { electionId, ...updateData });
      return { success: true };
    }

    case "remove": {
      if (!candidateId) throw new ValidationError("Candidate ID is required for removal.");
      const candidateRef = electionRef.collection("candidates").doc(candidateId);
      const candidateDoc = await candidateRef.get();
      if (!candidateDoc.exists) throw new NotFoundError("Candidate not found.");

      await candidateRef.delete();
      await logAdminAction(db, "REMOVE_CANDIDATE", uid, candidateId, { electionId });
      return { success: true };
    }

    default:
      throw new ValidationError("Invalid action.");
  }
});
