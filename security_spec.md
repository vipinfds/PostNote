# Security Specification: PostNote Studio Multi-Tenant RBAC

## 1. Data Invariants
1. **Workspace Isolation**: A workspace (`/workspaces/{workspaceId}`) can only be read or modified by its owner (`ownerId == request.auth.uid`), a bootstrapped admin (`vipin@firstdraftstudio.in` with `email_verified == true`), or an active member present in `/workspaces/{workspaceId}/members/$(request.auth.uid)`.
2. **Sub-Resource Master Gate**: Every subcollection (`/members`, `/clients`, `/posts`) must verify parent workspace existence (`exists(/databases/$(database)/documents/workspaces/$(workspaceId))`) and membership/ownership on single-document reads and writes.
3. **Role-Based Tiered Access (RBAC)**:
   - `Owner` / `Admin`: Full CRUD on workspace, members, clients, and posts.
   - `Manager` / `Editor`: Can create and update clients and posts; cannot modify workspace settings or team roles.
   - `Viewer`: Read-only access (`get`) on workspace, clients, and posts; cannot create, update, or delete any document.
4. **Identity & Temporal Integrity**:
   - `ownerId`, `authorId`, `workspaceId`, and `createdAt` are immutable after creation.
   - `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
   - All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
5. **Terminal State Locking**: Once a `Post` reaches `status == 'Published'`, non-Admin/non-Owner members cannot mutate it.

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on Workspace Create)**:
   `{ "name": "Spoofed Studio", "ownerId": "victim_uid_999", "ownerEmail": "attacker@evil.com", "createdAt": "SERVER_TIME", "updatedAt": "SERVER_TIME" }`
2. **Payload 2 (Unverified Email Write Attack)**:
   Authenticated user with `email_verified: false` attempting to create `/workspaces/ws_1`.
3. **Payload 3 (Shadow Field Injection on Workspace Update)**:
   `{ "name": "Valid Name", "isSuperAdmin": true, "updatedAt": "SERVER_TIME" }`
4. **Payload 4 (Privilege Escalation on Member Self-Promotion)**:
   Member with role `Viewer` updating `/workspaces/ws_1/members/viewer_uid` with `{ "role": "Admin", "updatedAt": "SERVER_TIME" }`.
5. **Payload 5 (Orphaned Subcollection Write)**:
   Creating `/workspaces/non_existent_ws/posts/post_1` where parent workspace does not exist.
6. **Payload 6 (Cross-Tenant Post Read/Write)**:
   User from `ws_2` attempting to read or write `/workspaces/ws_1/posts/post_1` without a member doc in `ws_1`.
7. **Payload 7 (Immutable Field Tampering on Post Update)**:
   Owner or Editor attempting to change `ownerId` or `createdAt` on an existing `/workspaces/ws_1/posts/post_1`.
8. **Payload 8 (Denial of Wallet / Oversized String Payload)**:
   Creating a post with `caption` of 25,000 characters (exceeding `maxLength: 5000`).
9. **Payload 9 (ID Poisoning Attack)**:
   Creating `/workspaces/invalid$id!with#bad*chars` that violates `^[a-zA-Z0-9_\-]+$`.
10. **Payload 10 (Terminal State Bypass on Published Post)**:
    An `Editor` attempting to update `caption` on a post whose existing `status` is `'Published'`.
11. **Payload 11 (Client-Forged Timestamp Attack)**:
    Creating a client with a hardcoded past timestamp `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
12. **Payload 12 (PII Leak on Member Record)**:
    An authenticated non-member attempting to `get` `/workspaces/ws_1/members/member_1` to harvest team email addresses.
