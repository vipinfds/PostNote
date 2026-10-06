# Plan: Content Queue All-Stages Header, Combine Campaigns into Clients, and Unify Client Page with Client Portal

## 1. Rename `AGENDA & CONTENT QUEUE` to `CONTENT QUEUE` & Show All Stages (`HomeView.tsx`)
- Change the section title from `AGENDA & CONTENT QUEUE • ...` to **`CONTENT QUEUE • ...`**.
- Remove the `View: Approved Only` stage filter dropdown from the header bar and display posts across **all 4 stages** (`Planned`, `In review`, `Approved`, `Scheduled`), while keeping delayed past-due unscheduled posts highlighted in red, the compact Search icon toggle, and the `Upcoming / Past / All` dropdown.

## 2. Combine `Campaigns` into `Clients` & Remove `Needs Client Approval` Pill (`ClientsView.tsx`, Navigation)
- Remove the `Needs Client Approval` filter button from `ClientsView.tsx` (since pending review badges already appear on the Clients nav item and on each client card).
- Replace it with a **`Clients (N)` | `Campaigns (N)`** switcher inside `ClientsView.tsx` so you can view and manage all client campaigns, durations, Meta Ad links, and campaign creation/editing directly inside the **Clients** tab (plus a `+ New Campaign` button in the header).
- Remove the separate **Campaigns** tab from `DesktopSidebar.tsx`, `MobileNavDrawer.tsx`, `BottomNav.tsx`, and `MoreMenuView.tsx` since Campaigns is now combined inside **Clients**.

## 3. Unify the Internal Client Page with `ClientPortalView` + Add `Edit Client` Button (`ClientPortalView.tsx`, `App.tsx`)
- Previously, clicking a client opened an internal `ClientDetailView` while clicking "Preview Portal" opened `ClientPortalView`.
- Now, clicking any client in `ClientsView` opens the **Unified `ClientPortalView`** directly as the single Client Page!
- Enhance `ClientPortalView.tsx` when viewed inside the studio (`!isLockedPortal`) to include studio action buttons in the top header:
  - **`Edit Client`** button (`<Pencil />`) to edit client details (name, handle, brand color, notes).
  - **`Share Portal`** button (`<Share2 />`) to copy or share the client's portal link.
  - **`+ New Post`** button (`<Plus />`) to schedule a post for this client, and **`Edit Post`** support so studio members can edit posts directly from the unified Client Page.
