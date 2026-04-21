# Task 03: Firestore Security Rules

**Objective**: Implement the single source of truth for authorization via Firestore security rules, adhering to KISS principles.

## Checklist

- [ ] **Setup `firestore.rules` File**
  - Open or create the `firestore.rules` file in the project root.
- [ ] **Implement Helper Functions**
  - Write `isSignedIn()`
  - Write `isOwner(uid)`
  - Write `isAdmin()`
  - Write `isElectionOpen(electionId)`
- [ ] **Define Collection Rules**
  - **`users/{uid}`**: Allow read if signed in; write `false` (handled by Functions).
  - **`elections/{electionId}`**: Allow read if signed in; write `false`.
  - **`elections/{electionId}/candidates/{candidateId}`**: Allow read if signed in; write `false`.
  - **`votes/{voteId}`**: Allow read if `isOwner` or `isAdmin`; allow create/update/delete `false` (enforces immutable votes, handled by `submitVote`).
  - **`auditLogs/{logId}`**: Allow read if `isAdmin`; write `false`.
- [ ] **Verification**
  - Run the Firebase local emulator suite and write simple tests or perform manual checks using the emulator UI to verify access denial.
