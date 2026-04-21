# Task 01: Firebase Foundation Setup

**Objective**: Initialize the Firebase project and set up the foundational services (Auth, Firestore, Functions, Hosting) according to the KISS and DRY principles.

## Checklist

- [ ] **Initialize Firebase Project**
  - Run `firebase init` in the `trojan-vote` directory.
  - Select features: `Firestore`, `Functions`, `Hosting`, and `Emulators`.
  - Choose `TypeScript` for Cloud Functions.
  - Initialize the `firebase.json` and `.firebaserc` files.
- [ ] **Configure Firebase Authentication**
  - Go to the Firebase Console -> Authentication.
  - Enable **SAML/OIDC Provider** for VSU SSO integration.
  - Add the SSO provider settings.
  - Disable Email/Password and other unused providers to follow the KISS principle.
- [ ] **Configure Firestore**
  - Set up Firestore in native mode in the Firebase Console.
  - Ensure the default database is created.
  - Prepare to deploy basic `firestore.rules` (will be detailed in task 03).
- [ ] **Configure Cloud Functions**
  - Ensure Cloud Functions uses 2nd gen (Node.js/TypeScript).
  - Open `functions/package.json` and verify dependencies (`firebase-admin`, `firebase-functions`).
- [ ] **Setup React Context for Auth**
  - Create `src/contexts/AuthContext.tsx` handling VSU SSO.
  - Expose a `useAuth` hook providing the user profile from `users/{uid}`.
- [ ] **Verification**
  - Run `firebase emulators:start` and ensure all emulators boot up without errors.
