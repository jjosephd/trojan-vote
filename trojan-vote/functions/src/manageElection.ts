import { onCall, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { assertAdmin } from "./utils/auth";
import { logAdminAction } from "./utils/audit";
import { ValidationError, NotFoundError } from "./utils/errors";

interface ManageElectionData {
  action: "create" | "update" | "open" | "close";
  electionId?: string;
  data?: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  };
}

export const manageElection = onCall(async (request: CallableRequest<ManageElectionData>) => {
  const db = admin.firestore();
  await assertAdmin(request, db);

  const { action, electionId, data } = request.data;
  const uid = request.auth!.uid;

  switch (action) {
    case "create": {
      if (!data?.title) {
        throw new ValidationError("Title is required for creating an election.");
      }
      const newElectionRef = db.collection("elections").doc();
      const electionData = {
        title: data.title,
        description: data.description || "",
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        status: "draft",
        createdAt: FieldValue.serverTimestamp(),
      };
      await newElectionRef.set(electionData);
      await logAdminAction(db, "CREATE_ELECTION", uid, newElectionRef.id, electionData);
      return { success: true, electionId: newElectionRef.id };
    }

    case "update": {
      if (!electionId) throw new ValidationError("Election ID is required for update.");
      const electionRef = db.collection("elections").doc(electionId);
      const electionDoc = await electionRef.get();
      if (!electionDoc.exists) throw new NotFoundError("Election not found.");

      const updateData: any = {};
      if (data?.title) updateData.title = data.title;
      if (data?.description !== undefined) updateData.description = data.description;
      if (data?.startDate !== undefined) updateData.startDate = data.startDate;
      if (data?.endDate !== undefined) updateData.endDate = data.endDate;
      updateData.updatedAt = FieldValue.serverTimestamp();

      await electionRef.update(updateData);
      await logAdminAction(db, "UPDATE_ELECTION", uid, electionId, updateData);
      return { success: true };
    }

    case "open": {
      if (!electionId) throw new ValidationError("Election ID is required to open.");
      const electionRef = db.collection("elections").doc(electionId);
      const electionDoc = await electionRef.get();
      if (!electionDoc.exists) throw new NotFoundError("Election not found.");

      await electionRef.update({ status: "open", openedAt: FieldValue.serverTimestamp() });
      await logAdminAction(db, "OPEN_ELECTION", uid, electionId);
      return { success: true };
    }

    case "close": {
      if (!electionId) throw new ValidationError("Election ID is required to close.");
      const electionRef = db.collection("elections").doc(electionId);
      const electionDoc = await electionRef.get();
      if (!electionDoc.exists) throw new NotFoundError("Election not found.");

      await electionRef.update({ status: "closed", closedAt: FieldValue.serverTimestamp() });
      await logAdminAction(db, "CLOSE_ELECTION", uid, electionId);
      return { success: true };
    }

    default:
      throw new ValidationError("Invalid action.");
  }
});
