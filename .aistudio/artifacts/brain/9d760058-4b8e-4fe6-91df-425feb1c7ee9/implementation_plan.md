# Firebase Auth Error Handling & Firestore State Synchronization Plan

This plan completes the end-to-end synchronization between **Firebase Authentication** (both Google Sign-In and Email/Password Sign-In & Sign-Up), the **React application session state (`onAuthStateChanged`)**, and **Cloud Firestore** security rules and document helpers.

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed decisions from your selections:
> - **Confirmed Decision 1 (Immediate Firestore Sync for Email/Password & Google Users)**: Allow all authenticated Firebase users (both Google OAuth and newly created Email/Password accounts) to create and sync their isolated workspaces, clients, posts, and team members in Firestore immediately without being blocked by `emailVerified === false`.
> - **Confirmed Decision 2 (Automatic Session Restoration via `onAuthStateChanged`)**: When `onAuthStateChanged` detects an active Firebase Auth user on page load or tab refresh, automatically restore `currentUser`, hydrate their workspaces from `/api/auth/signin`, and synchronize their Firestore workspace document.

---

## 1. Overview & Key Alignment Fixes

1. **Support Both Google and Email/Password Users in Firestore Sync**:
   - Currently, `ensureFirestoreWorkspace`, `syncClientToFirestore`, `syncPostToFirestore`, `deletePostFromFirestore`, `syncMemberToFirestore`, and `deleteMemberFromFirestore` exit early if `!user.emailVerified`, which skips Firestore writes for Email/Password accounts because `createUserWithEmailAndPassword` initializes `emailVerified` as `false`.
   - Update both the client-side sync guards and `firestore.rules` (`isAuthenticatedUser()`) so any authenticated user with a valid UID and email (`request.auth != null && request.auth.token.email is string`) can read and write their own isolated workspace documents, while keeping `isBootstrappedAdmin()` strictly requiring `request.auth.token.email_verified == true`.
2. **Canonical Workspace ID Consistency (`makeWorkspaceIdForEmail`)**:
   - Standardize the workspace ID generator across `App.tsx`, `SignInView.tsx`, `firebase.ts`, and `server.ts` so `vipin@firstdraftstudio.in` always resolves to `ws_vipin` and any other email resolves to `ws_<sanitized_email>`, preventing mismatched workspace paths during `onAuthStateChanged`.
3. **Full `onAuthStateChanged` Session Hydration & Error Handling**:
   - Track `isAuthReady` in `App.tsx` and automatically restore `currentUser` + workspaces when Firebase Auth has an active session, even if `localStorage` was cleared.
   - Ensure `ensureFirestoreWorkspace` and all Firestore sync calls use `handleFirestoreError` for structured diagnostic logging while gracefully handling network or rule errors in the UI so user workflows are never interrupted.

---

## 2. Technical Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Firebase Auth (Google & Email/Pass)                  │
│  • signInWithPopup / signInWithEmailAndPassword / createUserWithEmail   │
│  • Emits auth state via onAuthStateChanged(auth, callback)              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             App.tsx Auth State & Session Synchronizer                   │
│  1. Canonical Workspace ID: makeWorkspaceIdForEmail(email)              │
│  2. If fbUser is signed in & currentUser is null:                       │
│     • Hydrates user & workspaces via /api/auth/signin                   │
│     • Sets currentUser, activeWorkspaceId, and persists session         │
│  3. Calls ensureFirestoreWorkspace(wsId, studioName)                    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Cloud Firestore (/workspaces/{workspaceId})              │
│  • Guarded by isAuthenticatedUser() + ownerId / member RBAC checks      │
│  • Syncs Workspace, Clients, Posts, and Team Members in real time       │
│  • Structured error reporting via handleFirestoreError                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Planned Component & Rule Updates

1. **Firebase Service Layer**:
   - Export `makeWorkspaceIdForEmail(email)` so `App.tsx` and `SignInView.tsx` compute the exact same workspace ID as the backend.
   - Update `ensureFirestoreWorkspace`, `syncClientToFirestore`, `syncPostToFirestore`, `deletePostFromFirestore`, `syncMemberToFirestore`, and `deleteMemberFromFirestore` to allow any authenticated user (`if (!user || !user.email) return;`) instead of blocking Email/Password users on `!user.emailVerified`.
   - Ensure `syncPostToFirestore` also ensures the parent client document exists in Firestore before creating a post so the relational `exists(.../clients/$(incoming().clientId))` rule in `firestore.rules` always succeeds.
2. **Application Auth State (`onAuthStateChanged` in `App.tsx`)**:
   - Upgrade the `onAuthStateChanged` listener to use `makeWorkspaceIdForEmail(cleanEmail)`, automatically restore `currentUser` and `activeWorkspaceId` if a Firebase Auth session is active on reload, and synchronize with `/api/auth/signin` and `ensureFirestoreWorkspace`.
3. **Authentication View (`SignInView.tsx`)**:
   - Map all Firebase Auth error codes (`auth/invalid-credential`, `auth/email-already-in-use`, `auth/wrong-password`, `auth/user-not-found`, `auth/weak-password`, `auth/too-many-requests`, `auth/popup-blocked`, `auth/unauthorized-domain`) to clear, actionable messages.
   - If `authMode === 'signup'` encounters `auth/email-already-in-use` in Firebase Auth, automatically attempt `firebaseSignInWithEmail` with the provided password so the user's `firebaseUid` is still linked for Firestore sync.
4. **Firestore Security Rules (`firestore.rules`)**:
   - Allow authenticated Email/Password and Google users (`request.auth != null && request.auth.token.email is string`) to manage their own `/workspaces/{workspaceId}` and subcollections (`clients`, `posts`, `members`) while preserving strict `ownerId == request.auth.uid` ownership checks and keeping `email_verified == true` on `isBootstrappedAdmin()`.
