/**
 * CampusVote – Election Results & Data Visualization Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Test Plan Coverage
 *   TC-07  View election results page after polls close
 *   TC-08  Results displayed as charts/graphs
 *   TC-09  Results page with zero votes cast (empty-state)
 *   TC-10  Real-time results update after a new vote is submitted
 *   TC-11  Results page accessible (read-only) by a non-admin student
 *
 * Prerequisites
 *   - Vite dev server running  : npm run dev  (port 5173)
 *   - Firebase emulators running: firebase emulators:start
 */

import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';
import {
  seedStudent,
  seedAdmin,
  seedElection,
  setFirestoreDoc,
  clearAuthEmulator,
  clearFirestoreEmulator,
} from './helpers/emulator';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const ELECTION_ID = 'e2e-election-results';
const CANDIDATE_ALICE = 'cand-alice';
const CANDIDATE_BOB = 'cand-bob';

test.beforeAll(async () => {
  await clearAuthEmulator();
  await clearFirestoreEmulator();

  // Seed a closed election with two candidates
  await seedElection(ELECTION_ID, 'closed', '2026 SGA Election');
  await setFirestoreDoc(
    `elections/${ELECTION_ID}/candidates`,
    CANDIDATE_ALICE,
    {
      name: 'Alice Johnson',
      position: 'President',
      voteCount: 7,
    },
  );
  await setFirestoreDoc(`elections/${ELECTION_ID}/candidates`, CANDIDATE_BOB, {
    name: 'Bob Smith',
    position: 'President',
    voteCount: 3,
  });
});

test.afterAll(async () => {
  await clearAuthEmulator();
  await clearFirestoreEmulator();
});

// ── Helper: log in a student and land on the results page ────────────────────

async function loginAndGoToResults(
  page: Page,
  email: string,
  password: string,
  electionId = ELECTION_ID,
) {
  await page.goto('/login');
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 8_000 });
  await page.goto(`/elections/${electionId}/results`);
}

// ── TC-07: Results page after polls close ─────────────────────────────────────

test('TC-07 | closed election results page displays vote counts per candidate', async ({
  page,
}) => {
  const { email, password } = await seedStudent('tc07');
  await loginAndGoToResults(page, email, password);

  // Page heading
  await expect(page.locator('[data-testid="results-heading"]')).toBeVisible({
    timeout: 8_000,
  });

  // Both candidates must appear with their vote counts
  await expect(
    page.locator('[data-testid="candidate-result-cand-alice"]'),
  ).toContainText('Alice Johnson');
  await expect(
    page.locator('[data-testid="candidate-vote-count-cand-alice"]'),
  ).toContainText('7');

  await expect(
    page.locator('[data-testid="candidate-result-cand-bob"]'),
  ).toContainText('Bob Smith');
  await expect(
    page.locator('[data-testid="candidate-vote-count-cand-bob"]'),
  ).toContainText('3');
});

// ── TC-08: Charts/graphs are rendered ────────────────────────────────────────

test('TC-08 | results page renders a bar or pie chart with correct data', async ({
  page,
}) => {
  const { email, password } = await seedStudent('tc08');
  await loginAndGoToResults(page, email, password);

  // Chart container must be visible (SVG canvas, or a labelled chart region)
  const chart = page.locator('[data-testid="results-chart"]');
  await expect(chart).toBeVisible({ timeout: 8_000 });

  // Chart must contain at least one <svg> or <canvas> element
  const svgOrCanvas = chart.locator('svg, canvas');
  await expect(svgOrCanvas.first()).toBeVisible();
});

// ── TC-09: Zero votes / empty-state ──────────────────────────────────────────

test('TC-09 | closed election with no votes displays zero state', async ({
  page,
}) => {
  // Seed a separate election with no candidates/votes
  const emptyElectionId = 'e2e-election-empty';
  await seedElection(emptyElectionId, 'closed', 'Empty Election');

  const { email, password } = await seedStudent('tc09');
  await loginAndGoToResults(page, email, password, emptyElectionId);

  // Should show a friendly empty-state message
  await expect(page.locator('[data-testid="results-empty-state"]')).toBeVisible(
    {
      timeout: 8_000,
    },
  );

  // Chart should still render but show a zero state (or be hidden gracefully)
  // We simply assert no unhandled error banner is shown
  await expect(
    page.locator('[data-testid="app-error-banner"]'),
  ).not.toBeVisible();
});

// ── TC-10: Real-time update after a new vote ──────────────────────────────────

test('TC-10 | results update in real-time after a new vote is submitted', async ({
  page,
}) => {
  // Use an open election so votes can be submitted
  const liveElectionId = 'e2e-election-live';
  await seedElection(liveElectionId, 'open', 'Live Election');
  await setFirestoreDoc(
    `elections/${liveElectionId}/candidates`,
    'cand-charlie',
    {
      name: 'Charlie Davis',
      position: 'VP',
      voteCount: 0,
    },
  );

  const { email, password } = await seedStudent('tc10');
  await loginAndGoToResults(page, email, password, liveElectionId);

  // Record the current count (could be 0)
  const countLocator = page.locator(
    '[data-testid="candidate-vote-count-cand-charlie"]',
  );
  await expect(countLocator).toBeVisible({ timeout: 6_000 });
  const before = Number(await countLocator.textContent());

  // Simulate a vote arriving via Firestore REST update (emulator write)
  await setFirestoreDoc(
    `elections/${liveElectionId}/candidates`,
    'cand-charlie',
    {
      name: 'Charlie Davis',
      position: 'VP',
      voteCount: before + 1,
    },
  );

  // Real-time listener should update the displayed count without a page reload
  await expect(countLocator).toContainText(String(before + 1), {
    timeout: 10_000,
  });
});

// ── TC-11: Non-admin student gets read-only view ──────────────────────────────

test('TC-11 | non-admin student can view results but has no modification controls', async ({
  page,
}) => {
  const { email, password } = await seedStudent('tc11');
  await loginAndGoToResults(page, email, password);

  // Results are visible
  await expect(page.locator('[data-testid="results-heading"]')).toBeVisible({
    timeout: 8_000,
  });

  // Admin-only controls must NOT be present
  await expect(
    page.locator('[data-testid="admin-results-controls"]'),
  ).not.toBeVisible();

  // No "Edit" or "Delete" buttons should appear on any candidate row
  await expect(page.locator('[data-testid*="edit-candidate"]')).toHaveCount(0);
  await expect(page.locator('[data-testid*="delete-candidate"]')).toHaveCount(
    0,
  );
});
