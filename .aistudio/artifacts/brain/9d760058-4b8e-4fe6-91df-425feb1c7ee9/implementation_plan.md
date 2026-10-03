# Pull-to-Refresh Touch Gesture for Home & Queue Views

This plan adds a responsive touch pull-to-refresh gesture on the **Home** and **Content Queue** views that triggers `fetchServerSync()` for immediate manual data synchronization, complete with an elastic pull indicator spinner and a toast confirmation when the sync finishes.

---

## 1. Reusable `PullToRefreshContainer` Component (`src/components/PullToRefreshContainer.tsx`)

- **Touch Gesture Mechanics (`onTouchStart`, `onTouchMove`, `onTouchEnd`)**:
  - Activates only when the page is scrolled to the very top (`window.scrollY <= 0`) and the user drags downward (`deltaY > 0`).
  - Applies smooth elastic resistance (`Math.min(deltaY * 0.45, 96)`) so pulling feels responsive and natural without jarring the layout.
  - Displays a top pull indicator badge showing:
    - **"Pull down to sync"** while dragging below the threshold (`< 64px`), with a rotating arrow/spinner icon proportional to pull distance.
    - **"Release to refresh"** once pulled past the trigger threshold (`>= 64px`).
    - **"Syncing workspace..."** with an animated spinning loader (`RefreshCw`) while `onRefresh()` is awaiting `fetchServerSync()`.
- **Safe Scroll Coexistence**:
  - Ignores horizontal swipes (`Math.abs(deltaX) > Math.abs(deltaY)`) and normal upward scrolling so calendar navigation and vertical page scrolling remain completely unaffected.

---

## 2. Integration with `fetchServerSync` & Toast Notification (`src/App.tsx`)

- **Manual Refresh Handler (`handleManualRefresh`)**:
  - Create an async `handleManualRefresh` callback in `src/App.tsx` that invokes `await fetchServerSync(activeWorkspaceId || undefined)` and triggers `showToast('Workspace synced with latest updates')` once complete.
- **Pass `onRefresh` Prop to Views**:
  - Pass `onRefresh={handleManualRefresh}` to `HomeView`, `ContentOverviewView`, and `QueueView`.

---

## 3. Home & Queue View Integration (`src/components/HomeView.tsx`, `src/components/ContentOverviewView.tsx`, `src/components/QueueView.tsx`)

- Wrap the **Home** view (`HomeView.tsx`) and **Queue** views (`ContentOverviewView.tsx` and `QueueView.tsx`) in `PullToRefreshContainer` when `onRefresh` is provided, enabling touch pull-to-refresh on mobile and tablet devices.
