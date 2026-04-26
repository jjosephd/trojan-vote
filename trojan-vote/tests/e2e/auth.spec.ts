/**
 * CampusVote – Login & Authentication Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Test Plan Coverage
 *   TC-01  Valid student login with correct credentials
 *   TC-02  Login with incorrect password
 *   TC-03  Login with unregistered email
 *   TC-04  Login with empty username and password fields
 *   TC-05  Admin login with admin credentials
 *   TC-06  Student session logout
 *
 * Prerequisites
 *   - Vite dev server running  : npm run dev  (port 5173)
 *   - Firebase emulators running: firebase emulators:start
 */

import { test, expect, Page } from '@playwright/test';
import {
  seedStudent,
  seedAdmin,
  clearAuthEmulator,
  clearFirestoreEmulator,
} from './helpers/emulator';

// ── Shared page-object helpers ────────────────────────────────────────────────

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
}

// ── Suite setup / teardown ────────────────────────────────────────────────────

test.beforeAll(async () => {
  // Clean slate for every run so test accounts don't accumulate
  await clearAuthEmulator();
  await clearFirestoreEmulator();
});

test.afterAll(async () => {
  await clearAuthEmulator();
  await clearFirestoreEmulator();
});

// ── TC-01: Valid student login ────────────────────────────────────────────────

test('TC-01 | valid student login loads the student dashboard', async ({
  page,
}) => {
  const { email, password } = await seedStudent('tc01');

  await page.goto('/');
  await fillLoginForm(page, email, password);

  // Dashboard should be visible – identified by its heading or nav role
  await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible({
    timeout: 8_000,
  });

  // URL should NOT still be on login
  await expect(page).not.toHaveURL(/\/login/);
});

// ── TC-02: Wrong password ─────────────────────────────────────────────────────

test('TC-02 | wrong password shows invalid credentials error', async ({
  page,
}) => {
  const { email } = await seedStudent('tc02');

  await page.goto('/login');
  await fillLoginForm(page, email, 'WrongPassword!99');

  await expect(page.locator('[data-testid="login-error"]')).toContainText(
    /invalid credentials|wrong password|incorrect/i,
    { timeout: 6_000 },
  );

  // User must remain on the login page
  await expect(page).toHaveURL(/\/login/);
});

// ── TC-03: Unregistered email ─────────────────────────────────────────────────

test('TC-03 | unregistered email shows account-not-found error', async ({
  page,
}) => {
  await page.goto('/login');
  await fillLoginForm(page, 'nobody@vsu.edu', 'SomePass123!');

  await expect(page.locator('[data-testid="login-error"]')).toContainText(
    /account not found|no user|not found/i,
    { timeout: 6_000 },
  );

  await expect(page).toHaveURL(/\/login/);
});

// ── TC-04: Empty fields ───────────────────────────────────────────────────────

test('TC-04 | empty email and password shows validation error', async ({
  page,
}) => {
  await page.goto('/login');

  // Click submit without filling any field
  await page.click('[data-testid="login-submit"]');

  // HTML5 / custom validation message must appear
  await expect(page.locator('[data-testid="login-email-error"]')).toBeVisible({
    timeout: 4_000,
  });
  await expect(
    page.locator('[data-testid="login-password-error"]'),
  ).toBeVisible({
    timeout: 4_000,
  });

  // Must not navigate away
  await expect(page).toHaveURL(/\/login/);
});

// ── TC-05: Admin login ────────────────────────────────────────────────────────

test('TC-05 | admin login loads the admin dashboard with elevated controls', async ({
  page,
}) => {
  const { email, password } = await seedAdmin('tc05');

  await page.goto('/login');
  await fillLoginForm(page, email, password);

  // Admin-only UI landmarks
  await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible({
    timeout: 8_000,
  });

  // Admin-specific controls should be present (e.g. "Manage Elections")
  await expect(
    page.locator('[data-testid="admin-manage-elections"]'),
  ).toBeVisible({ timeout: 6_000 });

  await expect(page).not.toHaveURL(/\/login/);
});

// ── TC-06: Logout ─────────────────────────────────────────────────────────────

test('TC-06 | student logout terminates session and redirects to login', async ({
  page,
}) => {
  const { email, password } = await seedStudent('tc06');

  // Log in first
  await page.goto('/login');
  await fillLoginForm(page, email, password);
  await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible({
    timeout: 8_000,
  });

  // Perform logout
  await page.click('[data-testid="logout-button"]');

  // Must land on login page
  await expect(page).toHaveURL(/\/login/, { timeout: 6_000 });

  // Navigating back to dashboard must redirect to login (session cleared)
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 6_000 });
});
