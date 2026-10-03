import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Client, Post, TeamMember, WorkspaceRole } from './types';

interface FirebaseAppletConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

const localConfigModules = (
  import.meta as unknown as {
    glob: (
      pattern: string,
      options: { eager: boolean; import: string }
    ) => Record<string, FirebaseAppletConfig>;
  }
).glob('../firebase-applet-config.json', { eager: true, import: 'default' });

const localFirebaseConfig: FirebaseAppletConfig =
  Object.values(localConfigModules)[0] || {};

const env =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ||
  {};

const resolvedFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || localFirebaseConfig.apiKey || '',
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    localFirebaseConfig.authDomain ||
    'gen-lang-client-0534314559.firebaseapp.com',
  projectId:
    env.VITE_FIREBASE_PROJECT_ID ||
    localFirebaseConfig.projectId ||
    'gen-lang-client-0534314559',
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    localFirebaseConfig.storageBucket ||
    'gen-lang-client-0534314559.firebasestorage.app',
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    localFirebaseConfig.messagingSenderId ||
    '215951254221',
  appId:
    env.VITE_FIREBASE_APP_ID ||
    localFirebaseConfig.appId ||
    '1:215951254221:web:84c4d37d6fcb5aedda3f84',
  firestoreDatabaseId:
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    localFirebaseConfig.firestoreDatabaseId ||
    'ai-studio-postnote-9d760058-4b8e-4fe6-91df-425feb1c7ee9',
};

export const isFirebaseConfigured = Boolean(
  resolvedFirebaseConfig.apiKey && resolvedFirebaseConfig.apiKey.trim().length > 5
);

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    appInstance = initializeApp(resolvedFirebaseConfig);
    dbInstance = getFirestore(appInstance, resolvedFirebaseConfig.firestoreDatabaseId);
    authInstance = getAuth(appInstance);
  } catch (initErr) {
    console.warn('Firebase initialization skipped (static environment):', initErr);
  }
}

// Export safe references so callers never crash on static hosts (e.g., GitHub Pages)
export const db = dbInstance as Firestore;
export const auth = (authInstance || ({ currentUser: null } as unknown)) as Auth;
export const googleProvider = new GoogleAuthProvider();

export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null) => void
): () => void {
  if (!authInstance) {
    return () => {};
  }
  try {
    return onAuthStateChanged(authInstance, callback);
  } catch {
    return () => {};
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid,
      email: authInstance?.currentUser?.email,
      emailVerified: authInstance?.currentUser?.emailVerified,
      isAnonymous: authInstance?.currentUser?.isAnonymous,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo:
        authInstance?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot (only when Firebase is configured)
async function testConnection() {
  if (!dbInstance) return;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Defensive ID & string sanitizers matching firebase-blueprint.json
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeFirestoreId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned && ID_REGEX.test(cleaned) ? cleaned : `id_${Date.now()}`;
}

export function makeWorkspaceIdForEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  if (clean === 'vipin@firstdraftstudio.in') return 'ws_vipin';
  return 'ws_' + clean.replace(/[^a-z0-9]/g, '_').slice(0, 60);
}

function truncateString(val: string | undefined, max: number, fallback = ''): string {
  const str = (val ?? fallback).trim();
  return str.slice(0, max);
}

export async function signInWithGoogle() {
  if (!authInstance) {
    throw new Error(
      'Google Sign-In requires Firebase Auth credentials. On GitHub Pages, please use Email Sign-In/Sign-Up or Instant Owner Sign-In below.'
    );
  }
  const result = await signInWithPopup(authInstance, googleProvider);
  return result.user;
}

export async function firebaseSignUpWithEmail(name: string, email: string, pass: string) {
  if (!authInstance) {
    throw new Error('Firebase Auth not configured in static build.');
  }
  const cred = await createUserWithEmailAndPassword(authInstance, email, pass);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred.user;
}

export async function firebaseSignInWithEmail(email: string, pass: string) {
  if (!authInstance) {
    throw new Error('Firebase Auth not configured in static build.');
  }
  const cred = await signInWithEmailAndPassword(authInstance, email, pass);
  return cred.user;
}

export async function signOutFirebase() {
  if (!authInstance) return;
  try {
    await firebaseSignOut(authInstance);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
}

/**
 * Ensures the signed-in Firebase user (Google or Email/Password) has a Workspace document in Firestore
 */
export async function ensureFirestoreWorkspace(workspaceId: string, name: string) {
  if (!authInstance || !dbInstance) return;
  const user = authInstance.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const path = `workspaces/${safeWsId}`;
  const wsRef = doc(dbInstance, 'workspaces', safeWsId);

  try {
    const snap = await getDoc(wsRef);
    if (!snap.exists()) {
      await setDoc(wsRef, {
        name: truncateString(name, 100, 'My Studio Workspace'),
        ownerId: sanitizeFirestoreId(user.uid),
        ownerEmail: truncateString(user.email.toLowerCase(), 150, user.email.toLowerCase()),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncClientToFirestore(
  workspaceId: string,
  ownerUid: string,
  client: Client,
  isNew: boolean
) {
  if (!authInstance || !dbInstance) return;
  const user = authInstance.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safeClientId = sanitizeFirestoreId(client.id);
  const path = `workspaces/${safeWsId}/clients/${safeClientId}`;
  const clientRef = doc(dbInstance, 'workspaces', safeWsId, 'clients', safeClientId);

  try {
    await ensureFirestoreWorkspace(safeWsId, `${user.displayName || user.email.split('@')[0]}'s Studio`);

    if (isNew) {
      await setDoc(clientRef, {
        workspaceId: safeWsId,
        ownerId: sanitizeFirestoreId(ownerUid),
        authorId: sanitizeFirestoreId(user.uid),
        name: truncateString(client.name, 100, 'Client'),
        handle: truncateString(client.handle, 100, '@client'),
        color: truncateString(client.color, 20, '#C44D34'),
        notes: truncateString(client.notes || '', 1000, ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingSnap = await getDoc(clientRef);
      if (!existingSnap.exists()) {
        await setDoc(clientRef, {
          workspaceId: safeWsId,
          ownerId: sanitizeFirestoreId(ownerUid),
          authorId: sanitizeFirestoreId(user.uid),
          name: truncateString(client.name, 100, 'Client'),
          handle: truncateString(client.handle, 100, '@client'),
          color: truncateString(client.color, 20, '#C44D34'),
          notes: truncateString(client.notes || '', 1000, ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(clientRef, {
          name: truncateString(client.name, 100, 'Client'),
          handle: truncateString(client.handle, 100, '@client'),
          color: truncateString(client.color, 20, '#C44D34'),
          notes: truncateString(client.notes || '', 1000, ''),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function syncPostToFirestore(
  workspaceId: string,
  ownerUid: string,
  post: Post,
  isNew: boolean
) {
  if (!authInstance || !dbInstance) return;
  const user = authInstance.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safePostId = sanitizeFirestoreId(post.id);
  const safeClientId = sanitizeFirestoreId(post.clientId);
  const path = `workspaces/${safeWsId}/posts/${safePostId}`;
  const postRef = doc(dbInstance, 'workspaces', safeWsId, 'posts', safePostId);
  const clientRef = doc(dbInstance, 'workspaces', safeWsId, 'clients', safeClientId);

  try {
    await ensureFirestoreWorkspace(safeWsId, `${user.displayName || user.email.split('@')[0]}'s Studio`);

    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
      await setDoc(clientRef, {
        workspaceId: safeWsId,
        ownerId: sanitizeFirestoreId(ownerUid),
        authorId: sanitizeFirestoreId(user.uid),
        name: truncateString(post.clientName, 100, 'Client'),
        handle: truncateString(
          `@${(post.clientName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          100,
          '@client'
        ),
        color: '#C44D34',
        notes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const mediaUrl = truncateString(
      post.mediaUrl || post.media?.[0]?.url || post.media?.[0]?.thumbnailUrl || '',
      2000,
      ''
    );

    if (isNew) {
      await setDoc(postRef, {
        workspaceId: safeWsId,
        ownerId: sanitizeFirestoreId(ownerUid),
        authorId: sanitizeFirestoreId(user.uid),
        clientId: safeClientId,
        clientName: truncateString(post.clientName, 100, 'Client'),
        date: post.date.slice(0, 10),
        status: post.status,
        category: post.category,
        platform: post.platform,
        title: truncateString(post.title, 200, 'Untitled Post'),
        caption: truncateString(post.caption, 5000, ''),
        mediaUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingSnap = await getDoc(postRef);
      if (!existingSnap.exists()) {
        await setDoc(postRef, {
          workspaceId: safeWsId,
          ownerId: sanitizeFirestoreId(ownerUid),
          authorId: sanitizeFirestoreId(user.uid),
          clientId: safeClientId,
          clientName: truncateString(post.clientName, 100, 'Client'),
          date: post.date.slice(0, 10),
          status: post.status,
          category: post.category,
          platform: post.platform,
          title: truncateString(post.title, 200, 'Untitled Post'),
          caption: truncateString(post.caption, 5000, ''),
          mediaUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(postRef, {
          clientId: safeClientId,
          clientName: truncateString(post.clientName, 100, 'Client'),
          date: post.date.slice(0, 10),
          status: post.status,
          category: post.category,
          platform: post.platform,
          title: truncateString(post.title, 200, 'Untitled Post'),
          caption: truncateString(post.caption, 5000, ''),
          mediaUrl,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deletePostFromFirestore(workspaceId: string, postId: string) {
  if (!authInstance || !dbInstance) return;
  const user = authInstance.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safePostId = sanitizeFirestoreId(postId);
  const path = `workspaces/${safeWsId}/posts/${safePostId}`;
  try {
    await deleteDoc(doc(dbInstance, 'workspaces', safeWsId, 'posts', safePostId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncMemberToFirestore(
  workspaceId: string,
  member: TeamMember,
  role: WorkspaceRole,
  isNew: boolean
) {
  if (!authInstance || !dbInstance) return;
  const user = authInstance.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safeMemberId = sanitizeFirestoreId(member.id);
  const path = `workspaces/${safeWsId}/members/${safeMemberId}`;
  const memberRef = doc(dbInstance, 'workspaces', safeWsId, 'members', safeMemberId);

  try {
    await ensureFirestoreWorkspace(safeWsId, `${user.displayName || user.email.split('@')[0]}'s Studio`);

    if (isNew) {
      await setDoc(memberRef, {
        workspaceId: safeWsId,
        userId: safeMemberId,
        email: truncateString(member.email.toLowerCase(), 150, member.email.toLowerCase()),
        name: truncateString(member.name || member.email.split('@')[0], 100, 'Member'),
        role,
        status: member.status,
        addedByUid: sanitizeFirestoreId(user.uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(memberRef, {
        role,
        status: member.status,
        name: truncateString(member.name || member.email.split('@')[0], 100, 'Member'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteMemberFromFirestore(workspaceId: string, memberId: string) {
  if (!authInstance || !dbInstance) return;
  const user = authInstance.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safeMemberId = sanitizeFirestoreId(memberId);
  const path = `workspaces/${safeWsId}/members/${safeMemberId}`;
  try {
    await deleteDoc(doc(dbInstance, 'workspaces', safeWsId, 'members', safeMemberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
