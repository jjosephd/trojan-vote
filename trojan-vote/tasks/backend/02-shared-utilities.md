# Task 02: Shared Utilities (DRY)

**Objective**: Create reusable utility functions for authorization, audit logging, errors, and validation to ensure DRY principles across all Cloud Functions.

## Checklist

- [x] **Setup Utilities Directory**
  - [x] Create the `functions/src/utils/` directory.
- [x] **Auth Utilities (`functions/src/utils/auth.ts`)**
  - [x] Implement `assertAuthenticated(request)` to check `request.auth`.
  - [x] Implement `assertAdmin(request, firestore)` to fetch user role from `users/{uid}` and ensure it is `"admin"`.
- [x] **Audit Utilities (`functions/src/utils/audit.ts`)**
  - [x] Implement `logAdminAction(firestore, action, performedBy, targetId, details)`.
  - [x] Ensure it writes to the `auditLogs` collection with a `serverTimestamp`.
- [x] **Error Utilities (`functions/src/utils/errors.ts`)**
  - [x] Define custom typed errors extending `HttpsError` for consistent error handling.
- [x] **Validator Utilities (`functions/src/utils/validators.ts`)**
  - [x] Implement reusable input validation (e.g., `validateElectionId`, `validateCandidateData`).
- [x] **Verification**
  - [x] Verify TypeScript compiles properly for all utility files.
