import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export * from "./onUserCreate";
export * from "./submitVote";
export * from "./manageElection";
export * from "./manageCandidate";
export * from "./tallyResults";

export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});
