# Unified Single-Scroll Post Details + Activity & Comments Pop-up & Approval Notifications

This plan removes the separate tab switcher inside the Post Details pop-up modal and places **Activity & Comments** directly below the post details, media carousel, and approval actions in a single continuous vertical scroll—while ensuring **Approve** actions explicitly notify the employee who submitted the post and the responsible content team.

## User Review & Critical Decisions

> [!IMPORTANT]
> Both requirements from your prompt are clear and self-contained:

- **Single Continuous Scroll Layout**: When opening any existing post pop-up, users see the post metadata, title, full caption, interactive media carousel, and **Approve / Request Changes** buttons at the top, followed immediately below by the **Activity & Comments** timeline and comment input box so they can swipe/scroll down naturally on one page.
- **Approval Notifications to Submitter & Content Team**: Clicking **Approve** (either on the Approvals screen or inside the Post Details pop-up) logs an `Approved Post` entry in the activity timeline, displays a confirmation banner/toast naming the employee who submitted the post (`submittedBy` / `createdBy`) and the content team, and pushes an approval notification to the header **Notification Bell**.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Single-Page Scrollable Post Modal**: Consolidates **Post Details** and **Activity & Comments** into one seamless view inside the read-only pop-up modal. Users no longer have to click a separate tab—scrolling or swiping down reveals the responsible content creator card, the chronological employee activity log, and the comment composer.
  2. **Explicit Approval Notification Feedback**: When a post is approved, the system records the approval in `post.activityLog`, dispatches a `StudioNotification` (`type: 'approved'`) to the employee who submitted the post for review and the content team (`Editor` / `Manager` roles), and shows an explicit confirmation banner inside the activity feed and toast alert.
  3. **Direct Scroll-to-Activity on Notification Click**: Clicking any notification in the top header **Notification Bell** opens the post pop-up and smoothly scrolls to the **Activity & Comments** section at the bottom of the modal.

---

## 2. User Experience & Visual Design

- **Single-Page Modal Flow (Top to Bottom)**:
  1. **Sticky Modal Header**: Client color dot, `"Post Details"`, **Edit (`Pencil`)** button (unlocks edit mode only when clicked), and **Close (`X`)** button.
  2. **Post Overview & Content**: Client name · Category · Platform · Date · Status, Submitter attribution line, Title, Full Caption, and Left/Right **Media Carousel**.
  3. **Approval Action Bar**: **Approve Post** and **Request Changes** buttons (with inline comment prompt when requesting changes, plus a clear note that approving or requesting changes notifies the submitter and content team).
  4. **Divider + Activity & Comments Section (Directly Below)**:
     - **Responsible Content Creator / Submitter** summary row.
     - **Employee Activity Log**: Chronological entries (`Created Post`, `Edited Post`, `Submitted for Approval`, `Requested Changes`, `Approved Post`, `Commented`) with employee name, role, timestamp, and highlighted comment callouts.
     - **Add Team Comment Bar**: Input field and **Comment** button at the bottom of the scroll container.

---

## 3. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌───────────────────────────────────────────────────────────────────┐
│                    Post Details Pop-up Modal                      │
│  [Header: Post Details]                        [✏ Edit]   [✕]     │
├───────────────────────────────────────────────────────────────────┤
│  1. Meta Row (Client · Category · Platform · Date · Status)       │
│  2. Title & Full Caption (Read-only)                              │
│  3. Interactive Media Carousel (< Left / Right > · 1/N)           │
│  4. Approval Controls: [✓ Approve Post]  [↺ Request Changes]      │
│     (Both notify Submitter + Content Team & log to Activity)      │
│  ───────────────────────────────────────────────────────────────  │
│  5. Activity & Comments (Directly Below — Swipe/Scroll Down)      │
│     • Responsible Submitter / Creator Badge                       │
│     • Chronological Employee Activity Timeline                    │
│     • Inline Comment Composer ([Write a comment...] [Comment])    │
└───────────────────────────────────────────────────────────────────┘
```

- **State & Notification Updates**:
  - Remove `activeModalTab` segmentation from `PostFormView` so the read-only view renders both the post details and the **Activity & Comments** section in a single scrollable container.
  - Auto-scroll to `#post-activity-section` when opened from a notification click (`initialModalTab === 'activity'`).
  - Ensure `handleApprovePost` updates `editingPost` in real time if the modal stays open or transitions, logs the approval with a notification summary (`"Notified <Submitter> & Content Team"`), and increments the unread badge in the header **Notification Bell**.
