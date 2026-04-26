/**
 * CampusVote – Admin Functions Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Test Plan Coverage
 *   TC-12  Admin creates a new election
 *   TC-13  Admin attempts to delete an active (open) election — must be blocked
 *   TC-14  Admin views all submitted votes (results tracker)
 *   TC-15  Non-admin student attempts to access /admin — access denied
 *
 * Prerequisites
 *   - Vite dev server running  : npm run dev  (port 5173)
 *   - Firebase emulators running: firebase emulators:start
 */

import { test, expect, Page } from '@playwright/test';
import {
  seedStudent,
  seedAdmin,
  seedElection,
  setFirestoreDoc,
  clearAuthEmulator,
  clearFirestoreEmulator,
} from './helpers/emulator';

// ── Shared fixtures ───────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await clearAuthEmulator();
  await clearFirestoreEmulator();
});

test.afterAll(async () => {
  await clearAuthEmulator();
  await clearFirestoreEmulator();
});

// ── Helper: sign in via UI ────────────────────────────────────────────────────

async function loginViaUI(
  page: Page,
  email: string,
  password: string,
  expectedUrlPattern: RegExp = /\/(dashboard|admin)/,
) {
  await page.goto('/login');
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(expectedUrlPattern, { timeout: 10_000 });
}

// ── TC-12: Admin creates a new election ──────────────────────────────────────

test('TC-12 | admin can create a new election end-to-end', async ({ page }) => {
  const { email, password } = await seedAdmin('tc12');
  await loginViaUI(page, email, password, /\/admin/);

  // Navigate to election management
  await page.click('[data-testid="admin-manage-elections"]');
  await page.click('[data-testid="create-election-button"]');

  // Fill in the election form
  const electionTitle = `E2E Election ${Date.now()}`;
  await page.fill('[data-testid="election-title-input"]', electionTitle);
  await page.fill(
    '[data-testid="election-description-input"]',
    'Created by Playwright TC-12',
  );
  await page.click('[data-testid="election-form-submit"]');

  // Confirmation / success toast
  await expect(
    page.locator('[data-testid="election-created-toast"]'),
  ).toBeVisible({
    timeout: 8_000,
  });

  // New election must appear in the elections list
  await expect(page.locator('[data-testid="elections-list"]')).toContainText(
    electionTitle,
    { timeout: 8_000 },
  );
});

// ── TC-13: Admin cannot delete an active (open) election ─────────────────────

test('TC-13 | admin gets a warning when trying to delete an active election', async ({
  page,
}) => {
  const ACTIVE_ELECTION_ID = 'e2e-active-election';
  await seedElection(ACTIVE_ELECTION_ID, 'open', 'Active Election – TC-13');

  const { email, password } = await seedAdmin('tc13');
  await loginViaUI(page, email, password, /\/admin/);

  await page.goto('/admin/elections');

  // Click delete on the active election row
  await page.click(`[data-testid="delete-election-${ACTIVE_ELECTION_ID}"]`);

  // A warning dialog or inline message must appear
  const warning = page.locator('[data-testid="delete-election-warning"]');
  await expect(warning).toBeVisible({ timeout: 6_000 });
  await expect(warning).toContainText(/cannot delete|active election|warning/i);

  // Election must still be present (deletion was NOT carried out)
  await expect(
    page.locator(`[data-testid="election-row-${ACTIVE_ELECTION_ID}"]`),
  ).toBeVisible();
});

// ── TC-14: Admin views the results tracker (vote log) ────────────────────────

test('TC-14 | admin can view all submitted votes in the results tracker', async ({
  page,
}) => {
  const TRACKED_ELECTION_ID = 'e2e-tracked-election';
  await seedElection(TRACKED_ELECTION_ID, 'closed', 'Tracked Election – TC-14');
  await setFirestoreDoc(
    `elections/${TRACKED_ELECTION_ID}/candidates`,
    'cand-t1',
    {
      name: 'Tracy Lee',
      position: 'Treasurer',
      voteCount: 4,
    },
  );

  // Seed some votes for audit visibility
  await setFirestoreDoc('votes', 'vote-t1', {
    voterId: 'mock-uid-1',
    electionId: TRACKED_ELECTION_ID,
    candidateId: 'cand-t1',
    position: 'Treasurer',
  });
  await setFirestoreDoc('votes', 'vote-t2', {
    voterId: 'mock-uid-2',
    electionId: TRACKED_ELECTION_ID,
    candidateId: 'cand-t1',
    position: 'Treasurer',
  });

  const { email, password } = await seedAdmin('tc14');
  await loginViaUI(page, email, password, /\/admin/);

  await page.goto(`/admin/elections/${TRACKED_ELECTION_ID}/results`);

  // Results tracker section must be visible
  await expect(
    page.locator('[data-testid="admin-results-tracker"]'),
  ).toBeVisible({ timeout: 8_000 });

  // Vote entries must be listed
  await expect(page.locator('[data-testid="vote-log-entry"]')).toHaveCount(2, {
    timeout: 6_000,
  });
});

// ── TC-15: Non-admin student cannot access /admin ─────────────────────────────

test('TC-15 | non-admin student navigating to /admin is redirected to dashboard', async ({
  page,
}) => {
  const { email, password } = await seedStudent('tc15');
  await loginViaUI(page, email, password, /\/dashboard/);

  // Attempt direct navigation to admin panel
  await page.goto('/admin');

  // Must be redirected away from /admin
  await expect(page).not.toHaveURL(/\/admin/, { timeout: 6_000 });

  // Should land on dashboard or a dedicated access-denied page
  await expect(page).toHaveURL(/\/(dashboard|access-denied)/, {
    timeout: 6_000,
  });

  // An access-denied banner or the student dashboard must be shown
  const accessDenied = page.locator('[data-testid="access-denied-message"]');
  const studentDash = page.locator('[data-testid="student-dashboard"]');
  await expect(accessDenied.or(studentDash)).toBeVisible({ timeout: 6_000 });
});
