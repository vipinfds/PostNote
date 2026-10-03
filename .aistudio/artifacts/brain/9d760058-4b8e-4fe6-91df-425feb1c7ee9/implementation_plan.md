# Fix GitHub Pages Deployment (`https://vipinfds.github.io/PostNote/`) & Standalone Static Mode

This plan resolves why `https://vipinfds.github.io/PostNote/` stopped loading after `firebase-applet-config.json` was added to `.gitignore`, and makes the app work 100% seamlessly on both **AI Studio / Full-Stack Node** and **GitHub Pages (Static Hosting)**.

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed decisions from your selections:
> - **Confirmed Decision 1 (Crash-Safe Firebase Init + Standalone GitHub Pages Mode)**: Guard Firebase initialization so missing `firebase-applet-config.json` in GitHub Actions never crashes the app at startup (`auth/invalid-api-key`), and provide a complete client-side multi-tenant fallback when `/api/*` backend routes return `404` on GitHub Pages.
> - **Confirmed Decision 2 (Default FirstDraft Studio Portfolio on GitHub Pages)**: When signing into `vipin@firstdraftstudio.in` on GitHub Pages, automatically hydrate the full **FirstDraft Studio** portfolio (`INITIAL_POSTS`, `INITIAL_CLIENTS`, `INITIAL_CAMPAIGNS`, `INITIAL_IDEAS`) and persist changes in `localStorage`.

---

## 1. Root Causes Why `https://vipinfds.github.io/PostNote/` Broke

1. **Top-Level `getAuth(app)` Crash When `firebase-applet-config.json` Is Gitignored**:
   - Earlier, `firebase-applet-config.json` was added to `.gitignore` so GitHub’s secret scanner wouldn't block your push.
   - However, when GitHub Actions built the app for GitHub Pages (`deploy-pages.yml`), `localFirebaseConfig` was `{}` and `resolvedFirebaseConfig.apiKey` evaluated to `""` (empty string).
   - Calling `export const auth = getAuth(app)` at module import time with an empty `apiKey` immediately throws an uncaught `FirebaseError: Firebase: Error (auth/invalid-api-key)` before React even mounts—resulting in a **blank white screen** on `https://vipinfds.github.io/PostNote/`.
2. **Static Hosting on GitHub Pages Has No Express Backend (`/api/auth/*`, `/api/sync`)**:
   - GitHub Pages serves static files from `./dist` and does not run `server.ts`. Any `fetch('/api/auth/signin')` or `fetch('/api/sync')` on `vipinfds.github.io` returns a `404` HTML page from GitHub Pages.
3. **GitHub Pages SPA Routing (`404.html`) & Build Artifact Hygiene**:
   - `npm run build` previously bundled `dist/server.cjs` directly inside `./dist`, which got uploaded to GitHub Pages, and lacked a `404.html` SPA fallback for deep links (like client portals).

---

## 2. Technical Architecture & Dual-Mode Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     PostNote Application Boot                            │
│  1. Safe Firebase Initializer (src/firebase.ts)                          │
│     • Checks if apiKey is non-empty before calling getAuth/getFirestore  │
│     • If apiKey is absent (e.g. unconfigured GitHub Actions build),      │
│       exports safe no-op Auth/Firestore adapters — ZERO startup crash!   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│           Dual-Runtime Auth & Workspace Sync Engine                      │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │  Full-Stack Mode (AI Studio)   │  │  Static Mode (GitHub Pages)    │  │
│  │  • Uses /api/auth/* & /api/sync│  │  • Detects 404/non-JSON on /api│  │
│  │  • Syncs live with server.ts   │  │  • Uses persistent localStorage│  │
│  │    and Cloud Firestore         │  │  • Loads FirstDraft Studio data│  │
│  └────────────────────────────────┘  └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Planned Fixes

1. **Crash-Safe Firebase Initialization (`src/firebase.ts`)**:
   - Check `Boolean(resolvedFirebaseConfig.apiKey)` before calling `initializeApp`, `getAuth`, and `getFirestore`.
   - Export a safe `subscribeToAuthChanges(callback)` helper instead of calling `onAuthStateChanged(auth, ...)` directly on an uninitialized `auth` instance, so the app boots cleanly even if built in GitHub Actions without `firebase-applet-config.json`.
   - Support passing `VITE_FIREBASE_API_KEY` in `.github/workflows/deploy-pages.yml` (via GitHub Actions Secrets if configured) while working 100% without it if not set.
2. **Standalone Static Host Fallback for Auth & Workspace Sync (`src/App.tsx` & `src/components/SignInView.tsx`)**:
   - In `SignInView.tsx`: If `/api/auth/signin` or `/api/auth/signup` returns non-JSON or `404` (as happens on `vipinfds.github.io/PostNote/`), automatically authenticate against the browser's persistent multi-tenant store (`postnote_static_tenants_v1`), pre-seeded with `vipin@firstdraftstudio.in` (`postnote2026`) and the full **FirstDraft Studio** dataset.
   - In `App.tsx`: Upgrade `fetchServerSync` and the save `useEffect` so when `/api/sync` is unavailable (on GitHub Pages), workspace data (`posts`, `clients`, `campaigns`, `ideas`, `teamMembers`) is loaded from and persisted to `localStorage` scoped by `workspaceId` (`ws_vipin` pre-populated with `INITIAL_POSTS`, `INITIAL_CLIENTS`, `INITIAL_CAMPAIGNS`, `INITIAL_IDEAS`).
3. **GitHub Pages Build & Workflow Optimization (`vite.config.ts` & `.github/workflows/deploy-pages.yml`)**:
   - Ensure `.github/workflows/deploy-pages.yml` builds the Vite SPA cleanly (`npx vite build`) and copies `dist/index.html` to `dist/404.html` so direct URL refreshes and Client Portal links work on `https://vipinfds.github.io/PostNote/`.
