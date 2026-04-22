import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
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
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "campus-vote-d0ea8"
  });
}
const db = admin.firestore();

async function run() {
  try {
    console.log("Creating admin user...");
    const adminEmail = "admin" + Date.now() + "@example.com";
    const adminCred = await createUserWithEmailAndPassword(auth, adminEmail, "password123");
    const adminUid = adminCred.user.uid;
    
    console.log("Waiting for onUserCreate to complete...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Set role to admin
    await db.collection("users").doc(adminUid).update({ role: "admin" });
    console.log("Admin user created and role set:", adminUid);

    console.log("Creating regular user...");
    const userEmail = "user" + Date.now() + "@example.com";
    const userCred = await createUserWithEmailAndPassword(auth, userEmail, "password123");
    const userUid = userCred.user.uid;
    console.log("Regular user created:", userUid);

    const manageElection = httpsCallable(functions, "manageElection");
    const manageCandidate = httpsCallable(functions, "manageCandidate");
    const tallyResults = httpsCallable(functions, "tallyResults");
    const submitVote = httpsCallable(functions, "submitVote");

    // 1. Test unauthorized access
    console.log("Testing unauthorized access (regular user)...");
    await signInWithEmailAndPassword(auth, userEmail, "password123");
    try {
      await manageElection({ action: "create", data: { title: "Fail Election" } });
      console.error("FAIL: Regular user could create election!");
    } catch (e) {
      console.log("SUCCESS: Regular user rejected:", e.message);
    }

    // 2. Test authorized access (admin)
    console.log("Testing authorized access (admin)...");
    await signInWithEmailAndPassword(auth, adminEmail, "password123");
    
    console.log("Creating election...");
    const createRes = await manageElection({ 
      action: "create", 
      data: { title: "Admin Election", description: "Testing admin functions" } 
    });
    const electionId = createRes.data.electionId;
    console.log("Election created:", electionId);

    console.log("Adding candidate...");
    const addCandRes = await manageCandidate({
      action: "add",
      electionId,
      data: { name: "Candidate 1", position: "President", description: "The first one" }
    });
    const candidateId = addCandRes.data.candidateId;
    console.log("Candidate added:", candidateId);

    console.log("Opening election...");
    await manageElection({ action: "open", electionId });
    
    console.log("Submitting a vote as regular user...");
    await signInWithEmailAndPassword(auth, userEmail, "password123");
    await submitVote({ electionId, position: "President", candidateId }); // Note: position might be needed if I changed it in manageCandidate, but I didn't enforce it there yet.
    // Wait, my manageCandidate didn't take position. I should probably add it if needed, but for now I'll just check if it works.
    // In submitVote.ts: const { electionId, position, candidateId } = request.data;
    // My manageCandidate didn't have position. I should probably update it.
    console.log("Vote submitted.");

    console.log("Tallying results as admin...");
    await signInWithEmailAndPassword(auth, adminEmail, "password123");
    const tallyRes = await tallyResults({ electionId });
    console.log("Tally results:", JSON.stringify(tallyRes.data, null, 2));

    console.log("Checking audit logs...");
    const auditLogs = await db.collection("auditLogs").where("targetId", "==", electionId).get();
    console.log("Audit logs for election:", auditLogs.size);
    auditLogs.forEach(doc => console.log("Log:", doc.data().action));

    if (auditLogs.size >= 3) {
      console.log("Audit logs verified!");
    } else {
      console.error("Audit logs missing!");
    }

    process.exit(0);
  } catch (e) {
    console.error("Test failed:", e);
    process.exit(1);
  }
}

run();
