/**
 * Phase 0 Test Runner for PostNote Studio Firestore Security Rules
 * Verifies all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Workspace Create',
    operation: 'create',
    path: '/workspaces/ws_1',
    auth: { uid: 'attacker_uid', email: 'attacker@evil.com', email_verified: true },
    payload: {
      name: 'Spoofed Studio',
      ownerId: 'victim_uid_999',
      ownerEmail: 'attacker@evil.com',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write Attack',
    operation: 'create',
    path: '/workspaces/ws_1',
    auth: { uid: 'user_1', email: 'vipin@firstdraftstudio.in', email_verified: false },
    payload: {
      name: 'Unverified Studio',
      ownerId: 'user_1',
      ownerEmail: 'vipin@firstdraftstudio.in',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Workspace Update',
    operation: 'update',
    path: '/workspaces/ws_1',
    auth: { uid: 'owner_1', email: 'owner@studio.com', email_verified: true },
    payload: {
      name: 'Valid Name',
      isSuperAdmin: true,
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Privilege Escalation on Member Self-Promotion',
    operation: 'update',
    path: '/workspaces/ws_1/members/viewer_uid',
    auth: { uid: 'viewer_uid', email: 'viewer@studio.com', email_verified: true },
    payload: {
      role: 'Admin',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Subcollection Write',
    operation: 'create',
    path: '/workspaces/non_existent_ws/posts/post_1',
    auth: { uid: 'owner_1', email: 'owner@studio.com', email_verified: true },
    payload: {
      workspaceId: 'non_existent_ws',
      ownerId: 'owner_1',
      authorId: 'owner_1',
      clientId: 'client_1',
      clientName: 'Client',
      date: '2026-10-03',
      status: 'Planned',
      category: 'POST',
      platform: 'Instagram',
      title: 'Orphan Post',
      caption: 'Caption',
      mediaUrl: '',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Cross-Tenant Post Read/Write',
    operation: 'get',
    path: '/workspaces/ws_1/posts/post_1',
    auth: { uid: 'outsider_uid', email: 'outsider@other.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable Field Tampering on Post Update',
    operation: 'update',
    path: '/workspaces/ws_1/posts/post_1',
    auth: { uid: 'owner_1', email: 'owner@studio.com', email_verified: true },
    payload: {
      ownerId: 'new_owner_uid',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Denial of Wallet / Oversized String Payload',
    operation: 'create',
    path: '/workspaces/ws_1/posts/post_big',
    auth: { uid: 'owner_1', email: 'owner@studio.com', email_verified: true },
    payload: {
      workspaceId: 'ws_1',
      ownerId: 'owner_1',
      authorId: 'owner_1',
      clientId: 'client_1',
      clientName: 'Client',
      date: '2026-10-03',
      status: 'Planned',
      category: 'POST',
      platform: 'Instagram',
      title: 'Valid Title',
      caption: 'A'.repeat(25000),
      mediaUrl: '',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning Attack',
    operation: 'create',
    path: '/workspaces/invalid$id!with#bad*chars',
    auth: { uid: 'owner_1', email: 'owner@studio.com', email_verified: true },
    payload: {
      name: 'Studio',
      ownerId: 'owner_1',
      ownerEmail: 'owner@studio.com',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Bypass on Published Post',
    operation: 'update',
    path: '/workspaces/ws_1/posts/published_post_1',
    auth: { uid: 'editor_uid', email: 'editor@studio.com', email_verified: true },
    payload: {
      caption: 'Tampering after publish',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client-Forged Timestamp Attack',
    operation: 'create',
    path: '/workspaces/ws_1/clients/client_1',
    auth: { uid: 'owner_1', email: 'owner@studio.com', email_verified: true },
    payload: {
      workspaceId: 'ws_1',
      ownerId: 'owner_1',
      authorId: 'owner_1',
      name: 'Brand',
      handle: '@brand',
      color: '#C44D34',
      notes: '',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'PII Leak on Member Record',
    operation: 'get',
    path: '/workspaces/ws_1/members/member_1',
    auth: { uid: 'stranger_uid', email: 'stranger@evil.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
