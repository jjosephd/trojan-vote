# Task 05: Admin Functions

**Objective**: Implement Cloud Functions for managing elections, candidates, and tallying results, while logging all actions.

## Checklist

- [ ] **Implement `manageElection` Function (`functions/src/manageElection.ts`)**
  - Set an HTTPS Callable trigger.
  - Call `assertAdmin`.
  - Handle actions: `create`, `update`, `open`, `close`.
  - Append audit log using `logAdminAction`.
- [ ] **Implement `manageCandidate` Function (`functions/src/manageCandidate.ts`)**
  - Set an HTTPS Callable trigger.
  - Call `assertAdmin`.
  - Handle actions: `add`, `edit`, `remove`.
  - Append audit log using `logAdminAction`.
- [ ] **Implement `tallyResults` Function (`functions/src/tallyResults.ts`)**
  - Set an HTTPS Callable trigger.
  - Call `assertAdmin`.
  - Recalculate and cross-check `votes` against candidate `voteCount`.
- [ ] **Update Main Index (`functions/src/index.ts`)**
  - Export `onUserCreate`, `submitVote`, `manageElection`, `manageCandidate`, and `tallyResults`.
- [ ] **Update Callable Wrappers (`src/lib/functions.ts`)**
  - Add typed wrappers for the new admin functions.
- [ ] **Verification**
  - Validate admin checks reject normal users.
  - Ensure all actions correctly write to the `auditLogs` collection.
