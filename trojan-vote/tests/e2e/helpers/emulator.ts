/**
 * Firebase Emulator REST helpers
 * ---------------------------------------------------------------------------
 * These functions call the Firebase Auth & Firestore emulator management REST
 * APIs to seed and tear down data without needing the Admin SDK inside the
 * browser context. Call them from beforeAll / afterAll hooks.
 *
 * Emulator ports (defaults):
 *   Auth      : 9099
 *   Firestore : 8080
 */

const PROJECT_ID = 'campus-vote-d0ea8';
const AUTH_EMULATOR = `http://127.0.0.1:9099`;
const FIRESTORE_EMULATOR = `http://127.0.0.1:8080`;

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Creates a user account in the Auth emulator and returns the new uid.
 *  If the account already exists (EMAIL_EXISTS) it signs in instead and
 *  returns the existing uid — making this call idempotent.
 */
export async function createEmulatorUser(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    if (text.includes('EMAIL_EXISTS')) {
      // Account already seeded — sign in to retrieve the existing uid
      return signInEmulatorUser(email, password).then(async () => {
        const signinRes = await fetch(
          `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
          },
        );
        const signinJson = await signinRes.json();
        return signinJson.localId as string;
      });
    }
    throw new Error(`createEmulatorUser failed: ${text}`);
  }
  const json = JSON.parse(text);
  return json.localId as string;
}

/** Signs in via the Auth emulator and returns the idToken. */
export async function signInEmulatorUser(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!res.ok)
    throw new Error(`signInEmulatorUser failed: ${await res.text()}`);
  const json = await res.json();
  return json.idToken as string;
}

/** Deletes all users from the Auth emulator — use in afterAll. */
export async function clearAuthEmulator(): Promise<void> {
  await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: 'DELETE',
  });
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

/** Writes a document to Firestore via the emulator REST API. */
export async function setFirestoreDoc(
  collectionPath: string,
  docId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  // Convert plain JS values → Firestore REST Value format
  const firestoreFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') firestoreFields[k] = { stringValue: v };
    else if (typeof v === 'number') firestoreFields[k] = { integerValue: v };
    else if (typeof v === 'boolean') firestoreFields[k] = { booleanValue: v };
    else firestoreFields[k] = { nullValue: null };
  }

  const url =
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/` +
    `${collectionPath}/${docId}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });
  if (!res.ok) throw new Error(`setFirestoreDoc failed: ${await res.text()}`);
}

/** Clears all documents in a top-level collection via the emulator REST API. */
export async function clearFirestoreEmulator(): Promise<void> {
  await fetch(
    `${FIRESTORE_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
}

// ── Convenience seed helpers ──────────────────────────────────────────────────

export interface SeededAdmin {
  uid: string;
  email: string;
  password: string;
}

export interface SeededStudent {
  uid: string;
  email: string;
  password: string;
}

/**
 * Seeds a student user in Auth + Firestore users collection.
 * Returns uid, email, password for use in tests.
 */
export async function seedStudent(
  suffix = Date.now().toString(),
): Promise<SeededStudent> {
  const email = `student-${suffix}@vsu.edu`;
  const password = 'TestPass123!';
  const uid = await createEmulatorUser(email, password);
  await setFirestoreDoc('users', uid, {
    email,
    role: 'student',
    verified: true,
  });
  return { uid, email, password };
}

/**
 * Seeds an admin user in Auth + Firestore users collection.
 * Returns uid, email, password for use in tests.
 */
export async function seedAdmin(
  suffix = Date.now().toString(),
): Promise<SeededAdmin> {
  const email = `admin-${suffix}@vsu.edu`;
  const password = 'AdminPass123!';
  const uid = await createEmulatorUser(email, password);
  // Wait for the onUserCreate Cloud Function trigger to finish writing its
  // default { role: 'student' } doc before we overwrite it with role: 'admin'.
  await new Promise((r) => setTimeout(r, 1_500));
  await setFirestoreDoc('users', uid, { email, role: 'admin', verified: true });
  return { uid, email, password };
}

// ── Stable dev-admin seed ─────────────────────────────────────────────────────

/** Credentials that match the stable dev-admin seeded by `npm run seed:admin`. */
export const STABLE_ADMIN = {
  email: 'admin@vsu.edu',
  password: 'Admin1234!',
} as const;

/**
 * Ensures the stable admin@vsu.edu account exists in the Auth + Firestore
 * emulators.  Safe to call multiple times — will not error if the account was
 * already created by a previous test run or the seed:admin script.
 */
export async function seedStableAdmin(): Promise<SeededAdmin> {
  const { email, password } = STABLE_ADMIN;
  const uid = await createEmulatorUser(email, password);
  // Brief pause in case an onUserCreate trigger writes a default 'student' doc
  await new Promise((r) => setTimeout(r, 1_500));
  await setFirestoreDoc('users', uid, { email, role: 'admin', verified: true });
  return { uid, email, password };
}

/**
 * Seeds an election document and returns the election ID used.
 */
export async function seedElection(
  electionId: string,
  status: 'draft' | 'open' | 'closed' = 'open',
  title = 'Student Government Election 2026',
): Promise<void> {
  await setFirestoreDoc('elections', electionId, { title, status });
}
