# CampusVote — Backend Implementation Strategy

> **Branch:** `backend/initial-setup`
> **Deliverable:** 4 (Implementation Phase)
> **Architecture:** Serverless — React + Firebase

---

## 1. Guiding Principles

Every decision in this document is filtered through two lenses:

| Principle | What it means for CampusVote |
|-----------|------------------------------|
| **KISS** — Keep It Simple, Stupid | Prefer Firebase-managed services over custom infrastructure. One Cloud Function should do one thing. No premature abstractions. |
| **DRY** — Don't Repeat Yourself | Shared helpers, reusable Firestore converters, a single security-rules file, and typed interfaces that the frontend and functions share. |

> **IMPORTANT:**
> The entire backend lives inside Firebase. There is **no** Express server, **no** PostgreSQL database, **no** container orchestration. If you're writing boilerplate, stop and look for a Firebase built-in.

---

## 2. Technology Stack

| Layer | Technology | Why (KISS) |
|-------|-----------|------------|
| **Auth** | Firebase Authentication (+ VSU SSO via SAML/OIDC provider) | Zero custom auth code. Firebase handles sessions, tokens, and refresh automatically. |
| **Database** | Cloud Firestore | Real-time listeners, offline support, and security rules baked in. No ORM needed. |
| **Server Logic** | Cloud Functions for Firebase (2nd gen, Node.js/TypeScript) | Only for operations that **must** be trusted (vote submission, result tallying, admin verification). Everything else runs client-side. |
| **Hosting** | Firebase Hosting + CDN | One-command deploy. Global CDN for the React SPA. |
| **Monitoring** | Firebase Crashlytics + Cloud Logging | Audit trail for NFR-07 comes free from Cloud Logging. |

> **TIP:**
> Keep the number of Cloud Functions **small**. Each function is a deployment unit, a cold-start risk, and a maintenance burden. Start with ≤ 5 functions and add only when a client-side approach is provably insufficient.

---

## 3. Firestore Data Model

> **NOTE:**
> The data model maps directly to the Class Diagram (Figure 2) from Deliverable 3. Collections are top-level; sub-collections are used only when access patterns demand it.

### 3.1 Collections Overview

```
firestore-root/
├── users/              # Student & Admin profiles (mirrors Firebase Auth)
│   └── {uid}
├── elections/           # Election metadata
│   └── {electionId}
│       └── candidates/  # Sub-collection: candidates per election
│           └── {candidateId}
├── votes/               # Immutable vote records
│   └── {voteId}
└── auditLogs/           # Admin action log (NFR-07)
    └── {logId}
```

### 3.2 Document Schemas

#### `users/{uid}`

| Field | Type | Notes |
|-------|------|-------|
| `uid` | `string` | Same as Firebase Auth UID |
| `email` | `string` | VSU email |
| `displayName` | `string` | From SSO profile |
| `role` | `"student" \| "admin"` | RBAC (NFR-06) |
| `createdAt` | `timestamp` | Account creation |
| `verified` | `boolean` | Admin-verified flag (FR-09) |

> **TIP — DRY:** The `role` field is the **single source of truth** for authorization. Security rules and Cloud Functions both read this one field — no duplicate role tables.

#### `elections/{electionId}`

| Field | Type | Notes |
|-------|------|-------|
| `title` | `string` | e.g. "SGA President 2026" |
| `description` | `string` | Election details |
| `positions` | `string[]` | List of positions to vote on |
| `status` | `"draft" \| "open" \| "closed"` | Election lifecycle (FR-06) |
| `createdBy` | `string` | Admin UID |
| `openAt` | `timestamp \| null` | When polls open |
| `closeAt` | `timestamp \| null` | When polls close |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

#### `elections/{electionId}/candidates/{candidateId}`

| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` | Candidate full name |
| `position` | `string` | Which position they're running for |
| `bio` | `string` | Biography (FR-03) |
| `platform` | `string` | Campaign platform (FR-03) |
| `photoURL` | `string \| null` | Optional headshot URL |
| `voteCount` | `number` | Running tally — updated atomically by Cloud Function |
| `createdAt` | `timestamp` | |

> **WARNING:**
> `voteCount` is **never** written by the client. Security rules deny all client writes to this field. Only the `submitVote` Cloud Function increments it inside a transaction.

#### `votes/{voteId}`

| Field | Type | Notes |
|-------|------|-------|
| `voterId` | `string` | Student UID |
| `electionId` | `string` | Which election |
| `candidateId` | `string` | Which candidate |
| `position` | `string` | Which position |
| `timestamp` | `timestamp` | When the vote was cast |

> **IMPORTANT — Tamper-resistance (NFR-04):** Security rules make this collection **create-only, no update, no delete**. Once a vote document exists, it is immutable.

#### `auditLogs/{logId}`

| Field | Type | Notes |
|-------|------|-------|
| `action` | `string` | e.g. `"election.created"`, `"candidate.added"`, `"election.opened"` |
| `performedBy` | `string` | Admin UID |
| `targetId` | `string` | Resource affected |
| `details` | `map` | Free-form context |
| `timestamp` | `timestamp` | Server timestamp |

> **NOTE — DRY:** Audit logging is handled by a **single reusable helper** (`logAdminAction`) called from every admin Cloud Function — not scattered across the codebase.

---

## 4. Cloud Functions Design

> **IMPORTANT — KISS rule:** If Firestore security rules can enforce it, don't write a Cloud Function. Functions exist only for **trusted server-side logic**.

### 4.1 Function Inventory

| # | Function Name | Trigger | Purpose | Reqs Addressed |
|---|--------------|---------|---------|----------------|
| 1 | `submitVote` | HTTPS Callable | Validate eligibility → write vote doc → increment candidate `voteCount` (transaction) | FR-02, FR-04, NFR-04 |
| 2 | `onUserCreate` | Auth `onCreate` | Create `users/{uid}` doc with default `"student"` role | FR-01 |
| 3 | `manageElection` | HTTPS Callable | Create / update / open / close elections. Writes audit log. | FR-06, NFR-07 |
| 4 | `manageCandidate` | HTTPS Callable | Add / edit / remove candidates in an election. Writes audit log. | FR-07, NFR-07 |
| 5 | `tallyResults` | HTTPS Callable (admin-only) | Recalculate final results from `votes` collection as a verification step | FR-05 |

### 4.2 `submitVote` — Detailed Flow

This is the most critical function. It maps directly to the **Sequence Diagram** (Figure 3) and **Activity Diagram** (Figure 4) from Deliverable 3.

```
Vote Submission Flow:

1. Student (Client) → submitVote (Cloud Function):
   callableFunction({ electionId, candidateId, position })

2. Cloud Function:
   a. Verify auth (context.auth)
   b. Read election doc — is status "open"?
   c. Query votes where voterId == uid AND electionId == eid AND position == pos

3. Decision:
   - If already voted for this position → Error 409: "You have already voted"
   - If eligible → BEGIN TRANSACTION:
     i.   Create vote doc (immutable)
     ii.  Increment candidate voteCount
     iii. COMMIT → Return Success { voteId }
```

> **TIP — KISS:** The entire flow is a **single Firestore transaction**. No message queues, no sagas, no eventual consistency headaches.

### 4.3 Shared Utilities (DRY)

All Cloud Functions import from a shared `utils/` directory:

```
functions/
├── src/
│   ├── index.ts              # Exports all functions
│   ├── submitVote.ts
│   ├── onUserCreate.ts
│   ├── manageElection.ts
│   ├── manageCandidate.ts
│   ├── tallyResults.ts
│   └── utils/
│       ├── auth.ts            # assertAuthenticated(), assertAdmin()
│       ├── audit.ts           # logAdminAction()
│       ├── errors.ts          # AppError class, error codes
│       └── validators.ts      # validateElectionId(), validateCandidateData()
```

```typescript
// utils/auth.ts — DRY auth checks
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

export function assertAuthenticated(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  return request.auth;
}

export async function assertAdmin(
  request: CallableRequest,
  firestore: FirebaseFirestore.Firestore
) {
  const auth = assertAuthenticated(request);
  const userDoc = await firestore.doc(`users/${auth.uid}`).get();
  if (userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return auth;
}
```

```typescript
// utils/audit.ts — DRY audit logging
import { FieldValue } from "firebase-admin/firestore";

export async function logAdminAction(
  firestore: FirebaseFirestore.Firestore,
  action: string,
  performedBy: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  await firestore.collection("auditLogs").add({
    action,
    performedBy,
    targetId,
    details,
    timestamp: FieldValue.serverTimestamp(),
  });
}
```

> **TIP — DRY:** `assertAdmin()` is called at the top of every admin function. One change to the authorization logic propagates everywhere.

---

## 5. Firestore Security Rules

> **IMPORTANT — KISS:** Security rules are the **first line of defense**. They run before any client read/write — no Cloud Function needed for basic RBAC.

```javascript
// firestore.rules (single file — DRY)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Helper functions (DRY) ──────────────────────────
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function isAdmin() {
      return isSignedIn()
        && get(/databases/$(database)/documents/users/$(request.auth.uid))
             .data.role == "admin";
    }

    function isElectionOpen(electionId) {
      return get(/databases/$(database)/documents/elections/$(electionId))
               .data.status == "open";
    }

    // ── Users ───────────────────────────────────────────
    match /users/{uid} {
      allow read: if isSignedIn();
      allow write: if false; // Only Cloud Functions write user docs
    }

    // ── Elections ───────────────────────────────────────
    match /elections/{electionId} {
      allow read: if isSignedIn();
      allow write: if false; // Managed via manageElection Cloud Function

      // ── Candidates (sub-collection) ──────────────────
      match /candidates/{candidateId} {
        allow read: if isSignedIn();
        allow write: if false; // Managed via manageCandidate Cloud Function
      }
    }

    // ── Votes ───────────────────────────────────────────
    match /votes/{voteId} {
      // Students can read their own votes (FR-10)
      allow read: if isOwner(resource.data.voterId) || isAdmin();
      allow create, update, delete: if false; // Only submitVote Cloud Function
    }

    // ── Audit Logs ──────────────────────────────────────
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only Cloud Functions
    }
  }
}
```

> **NOTE — DRY:** The helper functions `isSignedIn()`, `isOwner()`, `isAdmin()`, and `isElectionOpen()` are defined once and reused across every rule.

---

## 6. Authentication Flow

### 6.1 VSU SSO Integration (FR-01)

```
Auth Flow:

1. Student Browser → Firebase Auth: signInWithPopup(SAMLProvider)
2. Firebase Auth → VSU SSO: Redirect to VSU login
3. VSU SSO → Firebase Auth: SAML assertion (email, name)
4. Firebase Auth → Student Browser: Firebase ID Token
5. (If new user) Firebase Auth → onUserCreate Cloud Function
6. onUserCreate → Firestore: Create users/{uid} { role: "student", verified: false }
```

> **TIP — KISS:** Firebase Auth handles the entire SAML handshake. The `onUserCreate` function simply seeds a Firestore profile — no session management, no token storage.

### 6.2 Client-Side Auth (DRY)

A single React context provides auth state to the entire app:

```typescript
// src/contexts/AuthContext.tsx — single source of auth truth
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "student" | "admin";
  verified: boolean;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profile = await getDoc(doc(db, "users", firebaseUser.uid));
        setUserProfile(profile.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// DRY hook — used everywhere instead of raw Firebase calls
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
```

---

## 7. Frontend ↔ Backend Integration

### 7.1 Callable Function Wrapper (DRY)

```typescript
// src/lib/functions.ts — single import for all backend calls
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export const submitVote = httpsCallable(functions, "submitVote");
export const manageElection = httpsCallable(functions, "manageElection");
export const manageCandidate = httpsCallable(functions, "manageCandidate");
export const tallyResults = httpsCallable(functions, "tallyResults");
```

> **TIP — DRY:** Components never call `httpsCallable()` directly. They import typed wrappers from `src/lib/functions.ts`. If a function name changes, one file updates.

### 7.2 Real-Time Listeners (DRY)

```typescript
// src/hooks/useElection.ts — reusable real-time hook
import { useEffect, useState } from "react";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useElection(electionId: string) {
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    // Single listener for election metadata
    const unsubElection = onSnapshot(
      doc(db, "elections", electionId),
      (snap) => setElection(snap.data() as Election)
    );

    // Single listener for candidates
    const unsubCandidates = onSnapshot(
      collection(db, "elections", electionId, "candidates"),
      (snap) => setCandidates(
        snap.docs.map(d => ({ id: d.id, ...d.data() }) as Candidate)
      )
    );

    return () => { unsubElection(); unsubCandidates(); };
  }, [electionId]);

  return { election, candidates };
}
```

> **NOTE — KISS:** Firestore `onSnapshot` gives us real-time updates without WebSockets, polling, or a custom pub/sub layer. This directly satisfies **FR-05** (real-time results) and **FR-08** (live results tracker).

---

## 8. Implementation Phases

### Phase 1 — Foundation (Week 1)

| Task | Details | KISS/DRY |
|------|---------|----------|
| Initialize Firebase project | `firebase init` — Firestore, Functions, Hosting, Auth | KISS: One CLI sets up everything |
| Deploy security rules | Single `firestore.rules` file | DRY: All rules in one place |
| Create `onUserCreate` function | Seeds user profile on first login | KISS: Minimal trigger function |
| Set up `AuthContext` | Single context for all auth state | DRY: One hook, used everywhere |
| Configure VSU SSO provider | Firebase Console → Auth → SAML provider | KISS: Zero custom auth code |

### Phase 2 — Core Voting (Week 2)

| Task | Details | KISS/DRY |
|------|---------|----------|
| Implement `submitVote` | Transaction: validate → write vote → increment count | KISS: Single transaction |
| Build voting UI | Candidate list → select → confirm → receipt | KISS: Linear flow |
| Create `useElection` hook | Real-time election + candidate data | DRY: One hook for all election views |
| Vote history page | Query `votes` where `voterId == uid` | FR-10 |

### Phase 3 — Admin Dashboard (Week 3)

| Task | Details | KISS/DRY |
|------|---------|----------|
| Implement `manageElection` | CRUD + open/close lifecycle | DRY: Single function, action parameter |
| Implement `manageCandidate` | Add/edit/remove candidates | DRY: Single function, action parameter |
| Build admin UI | Election manager + candidate manager | KISS: Simple forms |
| Audit logging | `logAdminAction()` in every admin function | DRY: One utility, called everywhere |

### Phase 4 — Polish & Verification (Week 4)

| Task | Details | KISS/DRY |
|------|---------|----------|
| Implement `tallyResults` | Cross-check `votes` against candidate `voteCount` | KISS: Admin-triggered, not automatic |
| Results display | Real-time vote counts + percentages (FR-05) | Reuses `useElection` hook |
| Vote confirmation notification | Firebase Cloud Messaging or in-app toast (FR-09) | KISS: In-app toast first, FCM stretch goal |
| Load testing | Firebase Emulator Suite + scripted 500 concurrent users (NFR-02) | KISS: Use emulator, not prod |
| Security audit | Review rules, test with emulator, verify RBAC | NFR-01, NFR-04, NFR-06 |

---

## 9. Project Structure

```
trojan-vote/
├── docs/
│   └── backend/
│       └── implementation-strategy.md    ← You are here
├── functions/                            ← Cloud Functions (Firebase)
│   ├── src/
│   │   ├── index.ts                      # Re-exports all functions
│   │   ├── submitVote.ts                 # FR-02, FR-04
│   │   ├── onUserCreate.ts              # FR-01
│   │   ├── manageElection.ts            # FR-06
│   │   ├── manageCandidate.ts           # FR-07
│   │   ├── tallyResults.ts              # FR-05
│   │   └── utils/                        # ← DRY shared utilities
│   │       ├── auth.ts                   # assertAuthenticated, assertAdmin
│   │       ├── audit.ts                  # logAdminAction
│   │       ├── errors.ts                 # Typed error codes
│   │       └── validators.ts             # Input validation helpers
│   ├── package.json
│   └── tsconfig.json
├── src/                                  ← React SPA (Vite)
│   ├── contexts/
│   │   └── AuthContext.tsx               # ← DRY auth state
│   ├── hooks/
│   │   ├── useAuth.ts                    # Re-export from context
│   │   └── useElection.ts               # ← DRY real-time data
│   ├── lib/
│   │   ├── firebase.ts                   # Firebase app init (KISS: one file)
│   │   └── functions.ts                  # ← DRY callable wrappers
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── ElectionListPage.tsx
│   │   ├── VotingPage.tsx
│   │   ├── ResultsPage.tsx
│   │   ├── VoteHistoryPage.tsx
│   │   └── admin/
│   │       ├── DashboardPage.tsx
│   │       ├── ElectionManagerPage.tsx
│   │       └── CandidateManagerPage.tsx
│   └── components/                       # Reusable UI components
├── firestore.rules                       # ← DRY: Single rules file
├── firebase.json
└── .firebaserc
```

---

## 10. KISS & DRY Checklist

Use this checklist during code review to ensure we stay on principle:

- [ ] **No custom auth** — Firebase Auth + SSO handles everything
- [ ] **No custom server** — Cloud Functions only, no Express/Koa/Fastify
- [ ] **No custom real-time** — Firestore `onSnapshot` for all live data
- [ ] **Single `firestore.rules` file** — all authorization in one place
- [ ] **Shared `utils/` in functions** — auth, audit, validation helpers reused
- [ ] **Single `AuthContext`** — one hook for all auth needs across the app
- [ ] **Typed callable wrappers** — `src/lib/functions.ts` is the only import point
- [ ] **≤ 5 Cloud Functions** — if you need more, justify it
- [ ] **Immutable votes** — security rules deny update/delete on `votes/`
- [ ] **Audit via helper** — `logAdminAction()` called, never hand-rolled

---

## 11. Requirements Traceability

| Req. ID | Description | Implementation |
|---------|-------------|----------------|
| FR-01 | VSU SSO authentication | Firebase Auth SAML provider + `onUserCreate` function |
| FR-02 | One vote per student per election per position | `submitVote` transaction checks existing votes |
| FR-03 | Browse candidate profiles | Firestore `candidates` sub-collection + `useElection` hook |
| FR-04 | Cast one vote per position | `submitVote` enforces in transaction |
| FR-05 | Real-time results after close | `onSnapshot` on candidates + election status check |
| FR-06 | Admin CRUD on elections | `manageElection` Cloud Function |
| FR-07 | Admin manage candidates | `manageCandidate` Cloud Function |
| FR-08 | Live results tracker for admin | `onSnapshot` — same hook as FR-05 |
| FR-09 | Vote confirmation | In-app toast on successful `submitVote` response |
| FR-10 | Vote history | Client query: `votes` where `voterId == uid` |
| NFR-01 | HTTPS/TLS | Firebase Hosting enforces HTTPS by default |
| NFR-02 | 500 concurrent users | Firestore auto-scales; validate with emulator |
| NFR-03 | Responsive UI | React + CSS (frontend concern) |
| NFR-04 | Tamper-resistant votes | Security rules: create-only, no update/delete |
| NFR-05 | < 3s page load | Firebase CDN + Vite code-splitting |
| NFR-06 | RBAC | `isAdmin()` in security rules + `assertAdmin()` in functions |
| NFR-07 | Audit logging | `logAdminAction()` in all admin functions |

---

## 12. Decision Log

| # | Decision | Rationale (KISS/DRY) |
|---|----------|---------------------|
| D1 | Use Firestore over Realtime Database | Richer queries, security rules, offline support. KISS: one database for everything. |
| D2 | Callable functions over REST endpoints | Type-safe, auto-auth, no CORS config. KISS: less boilerplate. |
| D3 | `voteCount` on candidate doc vs. aggregation query | Real-time reads are cheap; aggregation queries on every page load are expensive. KISS: denormalize for reads, single transaction for writes. |
| D4 | Sub-collection for candidates | Candidates are always accessed in context of an election. KISS: natural hierarchy, simpler security rules. |
| D5 | Single `manageElection` function (not separate create/update/delete) | DRY: one deployment, one set of auth checks, one audit log call. Action is a parameter. |
| D6 | Security rules deny all direct writes to sensitive collections | KISS: rules are simple allow/deny. All mutation logic lives in Cloud Functions where it can be transactional and audited. |
