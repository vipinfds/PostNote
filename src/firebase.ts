import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirestore,
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

const app = initializeApp(resolvedFirebaseConfig);
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
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
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function firebaseSignUpWithEmail(name: string, email: string, pass: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred.user;
}

export async function firebaseSignInWithEmail(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function signOutFirebase() {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
}

/**
 * Ensures the signed-in Firebase user (Google or Email/Password) has a Workspace document in Firestore
 */
export async function ensureFirestoreWorkspace(workspaceId: string, name: string) {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const path = `workspaces/${safeWsId}`;
  const wsRef = doc(db, 'workspaces', safeWsId);

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
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safeClientId = sanitizeFirestoreId(client.id);
  const path = `workspaces/${safeWsId}/clients/${safeClientId}`;
  const clientRef = doc(db, 'workspaces', safeWsId, 'clients', safeClientId);

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
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safePostId = sanitizeFirestoreId(post.id);
  const safeClientId = sanitizeFirestoreId(post.clientId);
  const path = `workspaces/${safeWsId}/posts/${safePostId}`;
  const postRef = doc(db, 'workspaces', safeWsId, 'posts', safePostId);
  const clientRef = doc(db, 'workspaces', safeWsId, 'clients', safeClientId);

  try {
    await ensureFirestoreWorkspace(safeWsId, `${user.displayName || user.email.split('@')[0]}'s Studio`);

    // Ensure referenced client exists in Firestore so the relational rule passes
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
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safePostId = sanitizeFirestoreId(postId);
  const path = `workspaces/${safeWsId}/posts/${safePostId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', safeWsId, 'posts', safePostId));
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
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safeMemberId = sanitizeFirestoreId(member.id);
  const path = `workspaces/${safeWsId}/members/${safeMemberId}`;
  const memberRef = doc(db, 'workspaces', safeWsId, 'members', safeMemberId);

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
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const safeWsId = sanitizeFirestoreId(workspaceId);
  const safeMemberId = sanitizeFirestoreId(memberId);
  const path = `workspaces/${safeWsId}/members/${safeMemberId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', safeWsId, 'members', safeMemberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
