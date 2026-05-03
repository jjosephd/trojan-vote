# Firebase Emulator Usage

The Firebase Local Emulator Suite provides an isolated, local environment for testing and development without affecting production data. 

## 1. Local Development
When you run the development server (`npm run dev`), the frontend application automatically connects to the local emulators. This behavior is configured in `src/lib/firebase.ts`. If the app is in development mode (`import.meta.env.DEV`), it points the Firebase client instances to the local emulator ports:
- **Auth Emulator**: port 9099
- **Firestore Emulator**: port 8080
- **Functions Emulator**: port 5001

## 2. End-to-End (E2E) Testing
The Playwright test suite (`tests/e2e/*.spec.ts`) heavily relies on the emulators:
- **Direct REST API Access**: Instead of using the Firebase Admin SDK inside the browser context, the tests use helper functions in `tests/e2e/helpers/emulator.ts` to directly hit the emulator's REST endpoints.
- **Test Isolation**: The `clearAuthEmulator()` and `clearFirestoreEmulator()` helpers are used in the `beforeAll` and `afterAll` hooks of each test file to purge all data. This ensures a clean slate and prevents test pollution.
- **Data Seeding**: Helpers like `seedStudent()`, `seedAdmin()`, and `seedElection()` use the REST API to quickly bypass UI flows and inject necessary records directly into the emulators before tests execute.

## Starting the Emulators
To launch the emulators, use the following command:
```bash
firebase emulators:start
```
The Emulator Suite UI can be accessed in your browser (typically at `http://localhost:4000`) to visually inspect authentication records, Firestore documents, and Function logs.
