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

type HandlerContext = {
  db: admin.firestore.Firestore;
  uid: string;
  electionId?: string;
  data?: ManageElectionData["data"];
};

/** Fetches an election doc and throws if it doesn't exist. */
async function fetchElection(db: admin.firestore.Firestore, electionId?: string) {
  if (!electionId) throw new ValidationError("Election ID is required.");
  const ref = db.collection("elections").doc(electionId);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError("Election not found.");
  return ref;
}

const handlers: Record<ManageElectionData["action"], (ctx: HandlerContext) => Promise<unknown>> = {
  async create({ db, uid, data }) {
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
  },

  async update({ db, uid, electionId, data }) {
    const electionRef = await fetchElection(db, electionId);
    const updateData: Record<string, unknown> = {};
    if (data?.title) updateData.title = data.title;
    if (data?.description !== undefined) updateData.description = data.description;
    if (data?.startDate !== undefined) updateData.startDate = data.startDate;
    if (data?.endDate !== undefined) updateData.endDate = data.endDate;
    updateData.updatedAt = FieldValue.serverTimestamp();

    await electionRef.update(updateData);
    await logAdminAction(db, "UPDATE_ELECTION", uid, electionId!, updateData);
    return { success: true };
  },

  async open({ db, uid, electionId }) {
    const electionRef = await fetchElection(db, electionId);
    await electionRef.update({ status: "open", openedAt: FieldValue.serverTimestamp() });
    await logAdminAction(db, "OPEN_ELECTION", uid, electionId!);
    return { success: true };
  },

  async close({ db, uid, electionId }) {
    const electionRef = await fetchElection(db, electionId);
    await electionRef.update({ status: "closed", closedAt: FieldValue.serverTimestamp() });
    await logAdminAction(db, "CLOSE_ELECTION", uid, electionId!);
    return { success: true };
  },
};

export const manageElection = onCall(async (request: CallableRequest<ManageElectionData>) => {
  const db = admin.firestore();
  await assertAdmin(request, db);

  const { action, electionId, data } = request.data;
  const uid = request.auth!.uid;

  const handler = handlers[action];
  if (!handler) throw new ValidationError("Invalid action.");

  return handler({ db, uid, electionId, data });
});
