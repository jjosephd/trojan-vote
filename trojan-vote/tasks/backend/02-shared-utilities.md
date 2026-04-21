# Task 02: Shared Utilities (DRY)

**Objective**: Create reusable utility functions for authorization, audit logging, errors, and validation to ensure DRY principles across all Cloud Functions.

## Checklist

- [ ] **Setup Utilities Directory**
  - Create the `functions/src/utils/` directory.
- [ ] **Auth Utilities (`functions/src/utils/auth.ts`)**
  - Implement `assertAuthenticated(request)` to check `request.auth`.
  - Implement `assertAdmin(request, firestore)` to fetch user role from `users/{uid}` and ensure it is `"admin"`.
- [ ] **Audit Utilities (`functions/src/utils/audit.ts`)**
  - Implement `logAdminAction(firestore, action, performedBy, targetId, details)`.
  - Ensure it writes to the `auditLogs` collection with a `serverTimestamp`.
- [ ] **Error Utilities (`functions/src/utils/errors.ts`)**
  - Define custom typed errors extending `HttpsError` for consistent error handling.
- [ ] **Validator Utilities (`functions/src/utils/validators.ts`)**
  - Implement reusable input validation (e.g., `validateElectionId`, `validateCandidateData`).
- [ ] **Verification**
  - Verify TypeScript compiles properly for all utility files.
