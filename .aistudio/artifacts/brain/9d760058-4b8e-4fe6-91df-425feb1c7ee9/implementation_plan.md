# Private Workspace Auth Isolation & Mobile Inline Today’s Schedule

This plan strengthens multi-tenant workspace isolation across Firebase Authentication and Firestore, introduces a post-sign-in Workspace Selector when a user belongs to both a personal studio and invited team workspaces, and replaces the mobile date popup sheet with a unified inline **Today’s Schedule** card positioned directly below the Calendar and above the **Upcoming Agenda**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and UX decisions were confirmed during clarification and govern this implementation:

- **Confirmed Decision 1 (Mobile Today’s Schedule Card Only)**: On mobile viewports (`< 1024px`), the **Today’s Schedule** card is rendered inline directly below the Calendar grid and above the **Upcoming Agenda** section. Tapping any date cell on the calendar updates this inline schedule card in place instead of opening a popup bottom sheet modal.
- **Confirmed Decision 2 (Post-Sign-In Workspace Selector)**: When an authenticated user has access to multiple workspaces (their own private studio plus one or more invited team workspaces), a dedicated **Workspace Selector** screen is displayed right after sign-in so they can explicitly choose which workspace to open. Users with only a single personal workspace enter it immediately.
- **Strict Tenant Isolation & Role Enforcement**: Every new user signing up (via Email/Password or Google Sign-In) is provisioned an isolated, empty personal workspace. Cross-tenant access is blocked unless the user's verified email has been explicitly added to a workspace's team roster with an assigned role (`Admin`, `Manager`, `Editor`, or `Viewer`).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Firebase Auth & Multi-Tenant Isolation**: Connects Email/Password registration, Email/Password login, Google Sign-In (`signInWithPopup`), and `onAuthStateChanged` session synchronization to isolated per-workspace data stores and Firestore documents (`/workspaces/{workspaceId}`).
  2. **Post-Login Workspace Selector**: Presents a clean studio picker whenever a signed-in user belongs to both a private workspace and shared team workspaces, displaying their assigned role (`Owner`, `Admin`, `Manager`, `Editor`, `Viewer`) and client/post counts on each card.
  3. **Mobile Inline Today’s Schedule**: Makes the **Today’s Schedule** card visible on both mobile and desktop—appearing right after the Calendar grid and above the **AGENDA • UPCOMING POSTS** section on mobile—while syncing with both the selected calendar date and the active Client filter dropdown.
- **Target Audience / Persona**: Social media agency owners, managers, content editors, and external collaborators managing multiple client calendars across desktop and mobile devices.
- **Key Value**: Guarantees zero data leakage between user accounts while giving mobile users immediate, one-scroll access to the monthly calendar, the selected day's schedule, and upcoming agenda items.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Sign Up / Sign In Flow**:
     - User switches between **Sign In** and **Sign Up** tabs or clicks **Continue with Google**.
     - On **Sign Up**, a new Firebase Auth user is created, a private workspace is initialized with zero clients/posts, and the user lands directly in their clean studio.
     - On **Sign In**, the user's private workspace and any invited team workspaces are fetched.
  2. **Post-Sign-In Workspace Selection Flow**:
     - If the user has access to more than one workspace (e.g., their own Private Studio + an invited role in `FirstDraft Studio`), a **Select a Workspace** view appears immediately after authentication.
     - Selecting a workspace loads only that workspace's clients, posts, campaigns, and role permissions (`Owner`, `Admin`, `Manager`, `Editor`, `Viewer`).
     - Users can also switch workspaces at any time from the collapsible **Workspace Dropdown** inside the hamburger menu / sidebar.
  3. **Mobile Calendar -> Today’s Schedule -> Upcoming Agenda Flow**:
     - On mobile, the user views the **Calendar** at the top (filtered by the **Client** dropdown).
     - Immediately below the Calendar & Categories Legend sits the **Today’s Schedule** card (defaulting to Today `2026-09-20` on load, or updating to whichever date cell the user taps on the calendar).
     - Directly below **Today’s Schedule** sits the **AGENDA • UPCOMING POSTS** section showing only upcoming posts (`date >= 2026-09-20`).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm editorial studio aesthetic with crisp structural borders and high-contrast legibility.
  - *Color Palette & Mood*: Warm alabaster canvas (`#FAF7F2`) in light mode and deep slate (`#151C24` / `#1D242C`) in dark mode, paired with terracotta brand accent (`#C44D34`) and semantic category dots.
  - *Typography & Hierarchy*: `Fraunces` editorial serif for studio headers, paired with crisp sans-serif UI controls and `tabular-nums` for dates and post counts.
  - *Touch & Spatial Ergonomics*: All mobile interactive calendar cells, schedule cards, and action buttons maintain comfortable touch hitboxes with zero popup modal interruption when browsing dates.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Inline Today’s Schedule Card Across Mobile & Desktop**
  - *Chosen Approach*: Remove `hidden lg:block` from the Today’s Schedule column in `HomeView` so it renders inline below the Calendar grid on mobile (`col-span-1`) and beside the Calendar on desktop (`lg:col-span-5`), and remove the redundant mobile bottom-sheet modal.
  - *Why*: Eliminates popup friction when tapping through calendar days on mobile and fulfills the exact vertical order: **Calendar -> Today’s Schedule -> Upcoming Agenda**.
- **Decision 2: Explicit Post-Sign-In Workspace Selector for Multi-Workspace Users**
  - *Chosen Approach*: Trigger a dedicated workspace picker state (`isSelectingWorkspace`) after sign-in when `workspaces.length > 1`, while auto-selecting `2026-09-20` (Today) on the Home calendar so "Today’s Schedule" is immediately populated.
  - *Why*: Prevents confusion for invited team members about whether they are viewing their own personal sandbox or the agency's shared workspace.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Firebase Auth + Tenant Workspace API                 │
│  • Email/Password & Google Sign-In   • Firestore /workspaces/{wsId}      │
│  • Strict Email/UID Membership Check • Role Enforcement (Owner..Viewer)  │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        Application Root State (App)                      │
│  • currentUser, activeWorkspaceId, workspaces[], myRole                  │
│  • Post-Login Workspace Selector Gate (when workspaces.length > 1)       │
└───────────────┬──────────────────────────────────────────┬───────────────┘
                │                                          │
                ▼                                          ▼
┌───────────────────────────────────┐      ┌───────────────────────────────┐
│   Navigation & Workspace Switch   │      │       HomeView Layout         │
│  • Hamburger Drawer Dropdown      │      │  1. Client Filter Dropdown    │
│  • Desktop Sidebar Dropdown       │      │  2. Monthly Calendar Grid     │
│  • Team & Role Management View    │      │  3. Inline Today's Schedule   │
│                                   │      │  4. Upcoming Agenda Section   │
└───────────────────────────────────┘      └───────────────────────────────┘
```

### Interactive Component & State Mapping
1. **Authentication & Session Listener**:
   - Synchronizes Firebase Auth state (`onAuthStateChanged`) with workspace membership verification so uninvited accounts never read or overwrite another user's workspace cache.
   - Enforces read-only posture in the UI and backend whenever `myRole === 'Viewer'`.
2. **Post-Sign-In Workspace Selector**:
   - Displays each accessible workspace with its badge (`Private · Owner` or `Shared Team · <Role>`), owner email, and item counts, setting `activeWorkspaceId` and triggering an isolated workspace sync on selection.
3. **HomeView Schedule & Agenda Synchronization**:
   - Initializes `selectedDayDate` to `'2026-09-20'` (Today) so **Today’s Schedule** immediately displays today's queued posts for the selected client.
   - Tapping any calendar day updates `selectedDayDate`, dynamically refreshing the inline **Today’s Schedule** card (title, post count, client badge, media previews/download actions, and `+ Schedule` button) on both mobile and desktop without opening a popup modal.
