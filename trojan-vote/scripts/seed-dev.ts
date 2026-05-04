/**
 * scripts/seed-dev.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time seed script: creates a stable admin account in the Firebase
 * emulator so you can log in via the UI without resetting each run.
 *
 * Usage:
 *   1. Start the emulator with persistence:
 *        npm run emulators:dev
 *   2. In a second terminal, run this script once:
 *        npm run seed:admin
 *   3. Stop the emulator — data is auto-exported to ./emulator-data/
 *   4. Every future `npm run emulators:dev` restores it automatically.
 *
 * Admin credentials (UI login):
 *   Email    : admin@vsu.edu
 *   Password : Admin1234!
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PROJECT_ID = 'campus-vote-d0ea8';
const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR = 'http://127.0.0.1:8080';

const ADMIN_EMAIL = 'admin@vsu.edu';
const ADMIN_PASSWORD = 'Admin1234!';

// ── helpers ───────────────────────────────────────────────────────────────────

async function createAuthUser(email: string, password: string): Promise<string> {
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
    // Already exists — sign in instead to retrieve the uid
    if (text.includes('EMAIL_EXISTS')) {
      console.log('ℹ️  Auth user already exists — fetching existing uid...');
      return getUidByEmail(email, password);
    }
    throw new Error(`createAuthUser failed: ${text}`);
  }

  const json = JSON.parse(text);
  return json.localId as string;
}

async function getUidByEmail(email: string, password: string): Promise<string> {
  const res = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!res.ok) throw new Error(`signIn failed: ${await res.text()}`);
  const json = await res.json();
  return json.localId as string;
}

async function setFirestoreDoc(
  collection: string,
  docId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const firestoreFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') firestoreFields[k] = { stringValue: v };
    else if (typeof v === 'number') firestoreFields[k] = { integerValue: v };
    else if (typeof v === 'boolean') firestoreFields[k] = { booleanValue: v };
    else firestoreFields[k] = { nullValue: null };
  }

  const url =
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/` +
    `${collection}/${docId}`;

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

// ── main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Seeding dev admin account...\n');

  // 1. Create (or retrieve) the Auth user
  const uid = await createAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`✅ Auth user ready  uid : ${uid}`);

  // 2. Wait briefly in case onUserCreate trigger fires a default 'student' doc
  await new Promise((r) => setTimeout(r, 1_500));

  // 3. Write the Firestore profile with role: 'admin'
  await setFirestoreDoc('users', uid, {
    email: ADMIN_EMAIL,
    role: 'admin',
    verified: true,
  });
  console.log(`✅ Firestore profile written  users/${uid}`);

  console.log('\n──────────────────────────────────────────');
  console.log('  Login credentials for the UI:');
  console.log(`  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
  console.log('──────────────────────────────────────────');
  console.log('\n🔖 Stop the emulator now — data will be saved to ./emulator-data/');
  console.log('   Future starts with `npm run emulators:dev` will restore it.\n');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
