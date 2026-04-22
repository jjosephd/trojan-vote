import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import admin from "firebase-admin";

const app = initializeApp({
  projectId: "campus-vote-d0ea8",
  apiKey: "test-api-key"
});

const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

const functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

// Initialize Admin SDK for setup
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
admin.initializeApp({
  projectId: "campus-vote-d0ea8"
});
const db = admin.firestore();

async function run() {
  try {
    console.log("Creating user...");
    const userCred = await createUserWithEmailAndPassword(auth, "testuser" + Date.now() + "@example.com", "password123");
    const uid = userCred.user.uid;
    console.log("User created:", uid);

    console.log("Waiting for onUserCreate to complete...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      console.log("User doc created by trigger!", userDoc.data());
    } else {
      console.error("User doc NOT created by trigger!");
    }

    console.log("Setting up election...");
    const electionId = "elec1";
    await db.collection("elections").doc(electionId).set({
      status: "open",
      title: "Test Election"
    });

    const candidateId = "cand1";
    const position = "President";
    await db.collection("candidates").doc(candidateId).set({
      electionId,
      position,
      name: "Test Candidate",
      voteCount: 0
    });

    console.log("Submitting vote...");
    const submitVote = httpsCallable(functions, "submitVote");
    const result = await submitVote({ electionId, position, candidateId });
    console.log("Vote submitted successfully!", result.data);

    console.log("Checking candidate voteCount...");
    const candDoc = await db.collection("candidates").doc(candidateId).get();
    console.log("Candidate voteCount:", candDoc.data()?.voteCount);

    console.log("Submitting vote again (should fail)...");
    try {
      await submitVote({ electionId, position, candidateId });
      console.error("Vote submitted again WITHOUT error. Atomicity/Duplicate check FAILED.");
    } catch (e) {
      console.log("Vote correctly rejected:", e.message);
    }
    
    process.exit(0);
  } catch (e) {
    console.error("Test failed:", e);
    process.exit(1);
  }
}

run();
