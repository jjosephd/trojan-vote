# Task 04: Core Voting Functions

**Objective**: Implement Cloud Functions that handle new user creation and secure voting execution.

## Checklist

- [x] **Implement `onUserCreate` Function (`functions/src/onUserCreate.ts`)**
  - Set an Auth `onCreate` trigger.
  - Create a new document in `users/{uid}` with role `"student"` and `verified: false`.
- [x] **Implement `submitVote` Function (`functions/src/submitVote.ts`)**
  - Set an HTTPS Callable trigger.
  - Call `assertAuthenticated`.
  - Open a Firestore transaction:
    - Check if the election status is `"open"`.
    - Query `votes` where `voterId == uid`, `electionId == eid`, and `position == pos`.
    - If already voted, throw `409 Conflict`.
    - If eligible, create vote document in `votes/`.
    - Increment `voteCount` on the candidate document atomically.
- [x] **Setup Callable Wrapper (`src/lib/functions.ts`)**
  - Create typed wrapper for `submitVote` using `httpsCallable`.
- [x] **Verification**
  - Test `onUserCreate` via emulator by simulating a new user login.
  - Test `submitVote` via emulator to ensure atomicity and that duplicates are rejected.
