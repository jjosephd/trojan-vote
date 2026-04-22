import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  
  await db.collection("users").doc(user.uid).set({
    role: "student",
    verified: false,
    email: user.email,
    createdAt: FieldValue.serverTimestamp()
  });
});
