# React Router DOM Refactor Plan

## 1. Overview
The current application uses manual state (`useState<Page>`) combined with `window.history.replaceState` to handle navigation. This approach lacks deep linking support, breaks browser back/forward buttons, and scales poorly. This document outlines the plan to migrate the frontend to `react-router-dom` while ensuring existing Playwright end-to-end tests remain fully functional.

## 2. Dependencies
- Install React Router DOM: `npm install react-router-dom`

## 3. Architectural Changes

### 3.1. Route Definition & Layout
We will introduce a `BrowserRouter` at the application root (`main.tsx` or `App.tsx`). The main routing structure will utilize a `Layout` component to persistently render the `NavBar` for authenticated users.

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/dashboard" element={<StudentDashboard />} />
      <Route path="/candidates" element={<CandidatesPage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
    </Route>
  </Routes>
</BrowserRouter>
```

### 3.2. Authentication Context
Currently, the authentication state (`user`, `loading`) is managed in `App.tsx` and prop-drilled. To simplify protected routing, we will lift the Firebase auth state into an `AuthContext`. 
- `AuthProvider`: Wraps the app, listens to `onAuthStateChanged`, and provides `user` and `loading` state.
- `useAuth()`: Custom hook to access auth state inside route guards and components.

### 3.3. Route Guards
We need strict route guards to mimic the existing behavior tested by Playwright:
- **`ProtectedRoute`**: If `!user`, redirects to `/login` using `<Navigate to="/login" replace />`.
- **`AdminRoute`**: If `user.role !== 'admin'`, renders the "Access Denied" view or redirects to `/dashboard`.
- **Login Redirect**: If a logged-in user visits `/login`, redirect them to `/admin` or `/dashboard` based on their role.

## 4. Component Updates

### 4.1. `NavBar.tsx`
- Remove `page` and `setPage` props.
- Access the current user via `useAuth()`.
- Use `useLocation` to determine the active tab (e.g., `location.pathname === '/candidates'`).
- Replace `setPage(id)` with `navigate('/' + id)` using the `useNavigate` hook, or replace the `<button>` elements with `<Link>` / `<NavLink>` from `react-router-dom`. If using `<button>` with `navigate`, we can ensure zero structural changes to the DOM, maximizing test compatibility.

### 4.2. `App.tsx`
- Remove `useState<Page>`, `user`, and `loading` (moved to `AuthContext`).
- Remove the manual `useEffect` that manipulates `window.history`.
- Return the `Routes` configuration.

## 5. Test Compatibility Assurance

The existing Playwright suite (`tests/e2e/auth.spec.ts`, etc.) relies on specific behaviors that we must preserve:

1. **URL Assertions**: Tests use `await expect(page).toHaveURL(/\/login/)` and `await expect(page).not.toHaveURL(/\/login/)`. React Router's `<Navigate>` and `useNavigate` hook will natively update the URL, satisfying these checks perfectly.
2. **UI Selectors**: Tests interact with elements via `data-testid` (e.g., `[data-testid="student-dashboard"]`, `[data-testid="logout-button"]`). We must ensure these test IDs remain on their respective components.
3. **Redirect Logic**: 
   - Visiting `/dashboard` without auth must redirect to `/login` (tested in `TC-06`).
   - Logging in must navigate away from `/login`.
   - Logging out must redirect to `/login`.
   By strictly mapping our `react-router` configuration to the existing manual history logic, all of these E2E assertions will continue to pass without needing any modifications to the test files themselves.

## 6. Implementation Steps
1. Create `src/context/AuthContext.tsx`.
2. Create route guard components (`ProtectedRoute`, `AdminRoute`) in `src/components/`.
3. Update `NavBar.tsx` to use `useNavigate` and `useLocation`.
4. Refactor `App.tsx` to implement `BrowserRouter` and `<Routes>`.
5. Run `npx playwright test` locally against the Firebase emulator to verify 100% pass rate.
