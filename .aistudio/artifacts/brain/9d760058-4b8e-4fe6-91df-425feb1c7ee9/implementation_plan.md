# Agenda & Queue Date-Range Filter (`Upcoming` / `Past` / `All`) + Mobile UI Optimization Plan

This plan introduces a unified 3-way date-range segmented toggle (**Upcoming**, **Past**, **All**) across both the **Home Agenda** and **Content Queue** views (defaulting to **Upcoming**), and delivers a comprehensive mobile UI/UX optimization across the app.

---

## 1. Date-Range Filter (`Upcoming` • `Past` • `All`) for Agenda & Queue

### A. Home View — Agenda Section (`src/components/HomeView.tsx`)
- **Segmented Date-Range Control**:
  - Add a compact 3-way segmented control (`Upcoming` | `Past` | `All`) in the **AGENDA** section header, defaulting to **`Upcoming`**.
  - Display live badge counts on the active view so you can immediately see how many posts are Upcoming (`date >= today`), Past (`date < today`), or All (`total`).
- **Smart Chronological Sorting**:
  - **Upcoming**: Shows posts from today onward (`post.date >= TODAY_REF_DATE`), sorted ascending (`soonest first`).
  - **Past**: Shows posts before today (`post.date < TODAY_REF_DATE`), sorted descending (`most recent past post first`).
  - **All**: Shows all posts for the selected client (or all clients), sorted chronologically.
- **Synced with Client Dropdown**:
  - Works seamlessly together with the **Client** filter dropdown (`All Clients` or a specific client).

### B. Content Queue & Overview (`src/components/ContentOverviewView.tsx` & `src/components/QueueView.tsx`)
- **Upgrade Queue Date Filter to 3-Way Toggle**:
  - Upgrade the 2-way toggle (`Upcoming` / `All posts`) to a 3-way segmented control: **`Upcoming`** (default), **`Past`**, and **`All`** with post counts.
  - Ensure **Upcoming** strictly filters `post.date >= todayStr`, **Past** strictly filters `post.date < todayStr` (sorted newest-to-oldest), and **All** displays the full timeline.

---

## 2. Mobile UI Audit & Optimization Plan

After auditing all screens at mobile viewport widths (`360px–430px`), we identified the following layout bottlenecks and will optimize them:

### A. Sticky Mobile Bottom Navigation Bar + Safe-Area Spacing (`src/App.tsx` & `src/components/BottomNav.tsx`)
- **Restore Sticky Bottom Navigation (`lg:hidden`)**:
  - Mount `BottomNav` at the bottom of the mobile viewport (`Home`, `Clients`, `Queue`, `Settings`) alongside the top Hamburger Drawer so switching core tabs takes a single thumb tap.
  - Adjust the Floating Action Button (`+`) bottom offset on mobile (`bottom-20 lg:bottom-8`) so it never overlaps the bottom navigation bar or card actions.

### B. De-Duplicate Mobile Home Header & Tighten Calendar (`src/components/HomeView.tsx`)
- **Eliminate Redundant Mobile Brand Header**:
  - On mobile (`< 1024px`), the sticky top bar already displays the `PostNote` logo and `+ Post` button. We will make the large centered `PostNote` header compact on mobile (`hidden lg:flex` for the big title, keeping the trial/plan badge accessible) so the Calendar and **Today’s Schedule** appear immediately above the fold without scrolling.
- **Responsive Calendar & Agenda Header**:
  - Prevent the Calendar + Client filter dropdown and Agenda header + `Upcoming / Past / All` toggle from cramping on narrow screens by wrapping cleanly with full-width mobile alignment.

### C. Content Queue Mobile Filter Bar & Search (`src/components/ContentOverviewView.tsx`)
- **Full-Width Search & Clean 2-Row Mobile Filter Layout**:
  - Make the search input full-width on mobile (`w-full sm:max-w-xs`) so it doesn't wrap awkwardly beside the `Post Queue / Campaigns` segmented tabs.
  - Hide horizontal scrollbars (`no-scrollbar`) on the status filter strip (`All Queue`, `Planned`, `In review`, `Scheduled`, `Published`) and stack the Client Selector + `Upcoming / Past / All` toggle cleanly on mobile.

### D. Clients List Mobile Card Ergonomics (`src/components/ClientsView.tsx`)
- **Labeled Mobile Quick Actions**:
  - In List View on mobile, client rows currently squeeze 5 small icon-only buttons (`Analytics`, `Share`, `+`, `Edit`, `Delete`) onto the right edge. We will organize the mobile action bar with clear touch-friendly `Analytics`, `Share`, and `+ Post` buttons on the left and `Edit` / `Delete` on the right (`min-h-[38px]` tap targets).

### E. Post Composer Date Picker & Action Toolbar (`src/components/PostFormView.tsx`)
- **Mobile-Centered Calendar Popover**:
  - Fix the Date Picker popover so it never clips off the edge of narrow mobile screens.
- **Wrap-Safe Media Toolbar**:
  - Make the `+ Upload Media • Add URL • Sample Stock` toolbar wrap cleanly into touch-friendly pill buttons on mobile screens.

### F. Settings & Team View Dynamic User & Mobile Polish (`src/components/SettingsView.tsx` & `src/components/TeamView.tsx`)
- **Dynamic Authenticated User Profile in Settings**:
  - Replace the static hardcoded name/email in `SettingsView.tsx` with your actual signed-in `currentUser` name, initials, email, and active workspace role, and ensure the Sign Out button never truncates long email addresses on mobile.
- **Mobile Team Invite Form**:
  - Stack the Role selector and `Add Member` submit button cleanly on mobile so the button is full-width and easy to tap.
