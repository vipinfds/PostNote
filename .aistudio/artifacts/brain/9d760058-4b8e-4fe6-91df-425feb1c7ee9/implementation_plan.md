# Client Social Accounts, Streamlined Analytics Bar & Clean Client UI

This update refines client creation and editing across the workspace by removing the redundant **Primary Handle** input, adding full multi-account social URL support directly inside the **New Post → Add New Client** flow, simplifying the **Analytics** views to use the 4-stage segmented progress bar without redundant stage boxes, and decluttering the **Clients** tab and **Client Portal** headers.

## User Review & Critical Decisions

> [!IMPORTANT]
> Summary of your confirmed preferences from the clarification step:

- **Confirmed Decision 1 (Analytics Tab Layout)**: Remove the 4 stage metric boxes (`Planned`, `In review`, `Approved`, `Scheduled` cards) and keep the **4-Stage Workflow Breakdown** segmented progress bar and interactive stage legend at the top, along with the **Platform Distribution** and **Post Breakdown** list below.
- **Confirmed Decision 2 (Clean Client Card & Portal UI)**: Remove the inline campaign badge from the top client identity row so the client name, social account links, and action buttons stay clean and uncluttered, and move campaign information to a subtle secondary metadata row/footer.
- **Confirmed Decision 3 (Remove Primary Handle & Sync New Post Client Creation)**: Remove the separate **Primary Handle** input from **Edit Client & Social Accounts** (auto-deriving a fallback handle from the first social account label or client name) and upgrade the **New Post → + Add New Client** drawer so you can add multiple social account links (`Platform`, `Account Label / @handle`, `Profile URL`) right when creating a client from a new post.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Edit Client & Social Accounts (`ClientModal`)**: Removes the **Primary Handle** field so users only enter the **Client / Brand Name**, **Brand Color**, **Notes**, and **Client Social Accounts** (multiple links with platform, optional `@handle`/label, and URL).
  2. **Add New Client from New Post (`PostFormView`)**: Upgrades the inline **Create New Client Directly** drawer inside the **New Post** modal so it reflects the exact same structure—removing the old `Social Handle` box and allowing users to add one or more social account links (`Platform`, `@handle / Label`, `Profile URL`) with a `+ Add Link` button when creating a client on the fly.
  3. **Analytics Tab (`AnalyticsView` & `ClientPortalView`)**: Removes the 4 stage boxes below the progress bar so the **4-Stage Workflow Breakdown** features only the multi-color segmented progress bar and interactive stage legend (`Planned`, `In review`, `Approved`, `Scheduled`), followed by **Platform Distribution** and **Post Breakdown**.
  4. **Clean Client Card & Client Portal Header (`ClientsView` & `ClientPortalView`)**: Declutters the client header row by removing the cramped inline campaign badge and organizing social account pills and campaign details into a clean, well-spaced layout.
- **Target Audience / Persona**: Agency managers, social media teams, and clients reviewing content pipelines and multi-account social profiles.
- **Key Value**: Consistent client creation from every entry point, faster visual scanning in Analytics, and a polished, uncluttered Clients directory.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Editing or Creating a Client (`Edit Client & Social Accounts`)**:
     - Enter **Client / Brand Name**, pick a **Brand Color**, and add any number of **Client Social Accounts** (`Platform`, `Account Label / @handle`, `URL`). No redundant Primary Handle field.
  2. **Adding a Client from the New Post Button (`New Post → + Add New Client`)**:
     - Click **+ Add New Client** inside the New Post modal.
     - Enter **Client / Brand Name**, pick a **Brand Color**, and optionally add one or more **Client Social Accounts** (`Platform`, `@handle / label`, `https://...` URL) right inline before clicking **Save & Select Client**.
  3. **Viewing Analytics**:
     - View the **4-Stage Workflow Breakdown** progress bar and clickable stage legend (`Planned`, `In review`, `Approved`, `Scheduled`) without redundant stage cards underneath. Click any segment or legend item to filter **Platform Distribution** and **Post Breakdown** below.
  4. **Browsing Clients & Client Portal**:
     - The top row of each client card cleanly displays the Client Avatar, Name, one-click Social Account pills, and right-aligned action buttons. Active campaign info sits neatly in a quiet secondary footer/meta line without crowding the title row.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm editorial SaaS workspace with crisp 1px structural borders (`#E8E4DC` light / `#2A3440` dark) and terracotta accent (`#C44D34`).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` UI body with `tabular-nums` on all stage counts, percentages, and dates.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Removing Primary Handle while Preserving Backward Compatibility**
  - *Chosen Approach*: Remove the `Primary Handle` input field from both `ClientModal` and `PostFormView`. Automatically derive `client.handle` behind the scenes from the first social account's `@handle`/label (or `@clientname` if none is provided) so any existing views or dropdowns expecting `client.handle` remain seamless.
  - *Why*: Eliminates duplicate data entry when managing multiple social accounts per client.
- **Decision 2: Streamlined 4-Stage Progress Bar in Analytics**
  - *Chosen Approach*: Remove the 4 stage boxes grid in `AnalyticsView` (and the 5 summary boxes in `ClientPortalView`'s Analytics tab & Overview strip), replacing them with the single 4-stage segmented progress bar and interactive legend.
  - *Why*: Avoids repeating the exact same stage numbers twice in the same card while preserving one-click stage filtering.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Workspace State (App.tsx)                         │
│        clients[] (name, color, socialUrl, socialLinks[], notes)          │
└───────────────┬──────────────────────┬───────────────────┬───────────────┘
                │                      │                   │
                ▼                      ▼                   ▼
┌───────────────────────────┐ ┌─────────────────┐ ┌────────────────────────┐
│ ClientModal & PostFormView│ │  AnalyticsView  │ │      ClientsView &     │
│ - No Primary Handle input │ │ - 4-Stage Bar & │ │    ClientPortalView    │
│ - Multi-account Social    │ │   Legend only   │ │ - Uncluttered header   │
│   Links builder           │ │ - No stage boxes│ │ - Subtle campaign row  │
└───────────────────────────┘ └─────────────────┘ └────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - `ClientModal`: Removes `handle` input state; saves `name`, `color`, `notes`, `socialUrl` (first link URL), and `socialLinks` array, auto-setting `handle` from `socialLinks[0]?.label` or `@name`.
  - `PostFormView`: Updates `onCreateClient` prop signature and inline client form state to support adding multiple `ClientSocialLink` items (`platform`, `label`, `url`) and passes them to `handleSaveClient`.
  - `AnalyticsView`: Removes the 4 stage boxes grid below the segmented progress bar while keeping segment and legend click handlers wired to `selectedStage`.
  - `ClientsView` & `ClientPortalView`: Removes the inline campaign pill from the client title flex row and places campaign metadata in a clean secondary footer row; updates the Client Portal Analytics tab to use the 4-stage progress bar breakdown.
