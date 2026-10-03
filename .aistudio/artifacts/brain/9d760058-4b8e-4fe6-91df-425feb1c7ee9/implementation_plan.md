# Fix & Harden Sign-In and Sign-Up Authentication Flows

This plan resolves the root causes preventing Google Sign-In and Email/Password Sign-In & Sign-Up from completing reliably, and verifies all authentication paths end-to-end.

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed decisions from your selections:
> - **Confirmed Decision 1 (Both Google & Email/Password Auth)**: Fix and harden both Google Sign-In and Email/Password Sign-In & Sign-Up flows.
> - **Confirmed Decision 2 (Non-Blocking Login & Sync)**: Ensure Sign-In and Sign-Up complete immediately and open the user's workspace even if optional background Firestore workspace initialization encounters a rule or permission error.

---

## 1. Overview & Root Causes Identified

During inspection of the authentication flow, three specific failure points were identified:

1. **Blocking `getDoc` Permission Exception in `ensureFirestoreWorkspace` (Breaks Google Sign-In & Email Auth)**:
   - In `firestore.rules`, `allow get` on `/workspaces/{workspaceId}` checks `existing().ownerId == request.auth.uid`. When a user signs in for the **first time**, the workspace document does not exist yet (`resource` is `null`), so `existing().ownerId` throws a Firestore `permission-denied` error on `getDoc(wsRef)` **before** `setDoc(wsRef)` is ever reached.
   - Because `SignInView` awaited `ensureFirestoreWorkspace(...)` inside `handleGoogleAuth` and `handleSubmit` without a `try/catch`, that thrown JSON error aborted the login and displayed a raw JSON error banner instead of signing the user in.
2. **Stale Firebase Session Interference in `App.tsx`**:
   - When signing in or signing up with Email/Password, `onAuthStateChanged` in `App.tsx` could fire on a previous or unverified session and trigger unhandled errors.
3. **Strict Email/Password Sign-In vs. Sign-Up Friction & Password Reset / Auto-Provisioning**:
   - If a user attempts to Sign Up with an email that was already created (e.g., via Demo or Google) or tries to Sign In with a new email, or if native Firebase Email/Password auth is not yet enabled in the Firebase Console, the flow should handle account creation/login smoothly with clear, human-readable error messages and fallback resilience.

---

## 2. User Experience & Visual Design

- **Instant, Frictionless Sign-In & Sign-Up**:
  - **Email/Password Sign-Up**: Creates a 100% isolated private workspace (`ws_<user>`) immediately, logs the user in without requiring a second click, and syncs in the background.
  - **Email/Password Sign-In**: Authenticates existing accounts (including the Owner account `vipin@firstdraftstudio.in` / `postnote2026` and any newly registered accounts) and loads their workspaces immediately.
  - **Google Sign-In**: Opens the Google OAuth popup (`signInWithPopup`). If the popup completes, signs the user in immediately and provisions their workspace without failing on Firestore pre-read checks. If the browser/iframe blocks third-party popups or unauthorized domains, displays a clear, helpful message and provides a 1-click fallback option.
- **Clean Error Feedback**:
  - Parses any structured JSON or Firebase error codes (`auth/popup-blocked`, `auth/unauthorized-domain`, `permission-denied`, etc.) into clean, human-readable messages instead of raw JSON strings.

---

## 3. Technical Architecture & Fixes

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SignInView (Auth Screen)                         │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │   Email / Password Form        │  │     Google Sign-In Button      │  │
│  │  • Sign In (/api/auth/signin)  │  │  • Firebase signInWithPopup    │  │
│  │  • Sign Up (/api/auth/signup)  │  │  • /api/auth/signin (google)   │  │
│  └───────────────┬────────────────┘  └───────────────┬────────────────┘  │
└──────────────────┼───────────────────────────────────┼───────────────────┘
                   │                                   │
                   ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│           Multi-Tenant Auth & Workspace Engine (Server + Client)         │
│  1. Backend (/api/auth/signup & /api/auth/signin):                       │
│     • Validates credentials, provisions isolated TenantWorkspace         │
│     • Supports seamless re-signup / password update if account exists    │
│  2. Non-Blocking Firestore Sync (ensureFirestoreWorkspace):              │
│     • Updated firestore.rules: allow get when resource == null           │
│     • Background non-blocking execution so login NEVER fails or hangs    │
│  3. Immediate Session Persistence & Workspace Hydration (App.tsx):       │
│     • Persists user to localStorage/sessionStorage & loads /api/sync     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Planned Changes
1. **Fix `firestore.rules` & `ensureFirestoreWorkspace`**:
   - Update `/workspaces/{workspaceId}` `allow get` in `firestore.rules` to permit checking non-existent workspace documents (`resource == null || existing().ownerId == request.auth.uid || ...`) so `getDoc` before `setDoc` never fails with `permission-denied`.
   - Make `ensureFirestoreWorkspace` in `SignInView.tsx` non-blocking (`ensureFirestoreWorkspace(...).catch(...)`) so Firestore rule or network latency can never block Sign-In or Sign-Up.
2. **Harden `/api/auth/signup` and `/api/auth/signin` on Backend**:
   - Ensure `/api/auth/signup` and `/api/auth/signin` handle whitespace, case-insensitivity, and existing Google/demo accounts gracefully, and persist to disk immediately.
   - Add a client-side local fallback in `SignInView.tsx` so even if a proxy or network hiccup occurs, valid credentials still complete authentication cleanly.
3. **End-to-End Automated Verification**:
   - Test Sign-Up with a brand-new user account, verify isolated workspace creation, test Sign-Out and Sign-In with that new account, and test Owner Sign-In (`vipin@firstdraftstudio.in`).
