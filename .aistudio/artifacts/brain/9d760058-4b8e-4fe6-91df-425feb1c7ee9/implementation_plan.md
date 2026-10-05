# Unified Client Portal & Pipeline-Only Client Analytics

This plan removes simulated social media metrics (impressions, engagement rates) across the client workspace and client portal, replaces the top summary cards with real content production and timeline metrics (**Posts Done So Far**, **Start Date**, and **Days Running** + the **4-Stage Pipeline**), and unifies **Approvals, Overview, Posts Schedule, and Client Analytics** into a single shareable Client Portal link.

---

## 1. Top Summary Metrics & 4-Stage Pipeline (No Impressions / Engagement Rate)
- **Remove Impressions & Engagement Rate**:
  - In `src/components/ClientDetailView.tsx`, remove `estImpressions`, `avgEngagementRate`, and all simulated Meta/social reach cards, tables, and progress bars.
  - Ensure both `src/components/ClientDetailView.tsx` and `src/components/ClientPortalView.tsx` rely strictly on internal post and schedule data.
- **New Top Summary Strip**:
  - Display a clean 3-card top summary strip at the top of the Client Portal (`ClientPortalView.tsx`) and Client Detail view (`ClientDetailView.tsx`):
    1. **Posts Done So Far**: Count of completed/scheduled posts (`Scheduled` + `Approved`, alongside total posts created).
    2. **Start Date**: Earliest post/campaign start date for the client (formatted clearly, e.g., `Sep 24, 2026`).
    3. **Days Running**: Total active days running from the client's start date (`computeCampaignDuration`).
- **4-Stage Pipeline Breakdown**:
  - Immediately below the top summary strip, display the 4-stage workflow pipeline cards:
    - **Planned**
    - **In review** (Waiting for Approval)
    - **Approved**
    - **Scheduled**
  - Clicking any stage filters the posts list below to inspect those exact posts.

---

## 2. Unified Single-Link Client Portal (Overview, Approvals, Posts & Analytics)
- **Dedicated Approvals & All-in-One Navigation in `ClientPortalView.tsx`**:
  - Update the Client Portal navigation tabs so a single shared link gives the client complete access to:
    1. **Overview**: Top summary (Posts So Far, Start Date, Days Running), 4-Stage Pipeline, Pending Approvals callout, Campaigns, and Past/Upcoming highlights.
    2. **Approvals**: Dedicated interactive approval queue where the client can review all `In review` posts (approve individual posts, approve all in batch, or request revisions/leave feedback) and edit their decision on `Approved` posts anytime.
    3. **Posts & Schedule**: Full filterable list of all client posts across stages and platforms.
    4. **Client Analytics**: Pipeline stage distribution, platform distribution, and content category breakdown with interactive post drill-down.
- **Single Unified Share Link (`ClientShareModal.tsx` & `ApprovalsView.tsx`)**:
  - Update `src/components/ClientShareModal.tsx` to present a **Single Unified Client Portal Link** (`?portal=<clientId>`) that includes Overview, Approvals, Posts, and Client Analytics in one place, with an optional default starting tab selector.
  - Add a **Copy Client Portal Link** button on each client group inside `src/components/ApprovalsView.tsx` so studio users can immediately copy and send the client's unified portal link when posts are waiting for approval.
