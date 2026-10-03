import {
  Post,
  Client,
  Campaign,
  Idea,
  TeamMember,
  WorkspaceRole,
  WorkspaceSummary,
} from '../types';
import {
  INITIAL_POSTS,
  INITIAL_CLIENTS,
  INITIAL_CAMPAIGNS,
  INITIAL_IDEAS,
} from '../data/initialData';

const STATIC_STORE_KEY = 'postnote_static_tenants_v1';

export interface StaticWorkspaceData {
  id: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  posts: Post[];
  clients: Client[];
  campaigns: Campaign[];
  ideas: Idea[];
  teamMembers: TeamMember[];
  lastUpdated: string;
}

interface StaticRegisteredUser {
  name: string;
  email: string;
  password: string;
  personalWorkspaceId: string;
  createdAt: string;
}

interface StaticMultiTenantStore {
  users: Record<string, StaticRegisteredUser>;
  workspaces: Record<string, StaticWorkspaceData>;
}

export function makeStaticWorkspaceId(email: string): string {
  const clean = email.trim().toLowerCase();
  if (clean === 'vipin@firstdraftstudio.in') return 'ws_vipin';
  return 'ws_' + clean.replace(/[^a-z0-9]/g, '_').slice(0, 60);
}

function loadStaticStore(): StaticMultiTenantStore {
  let store: StaticMultiTenantStore = { users: {}, workspaces: {} };
  try {
    const raw = localStorage.getItem(STATIC_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        store = {
          users: parsed.users || {},
          workspaces: parsed.workspaces || {},
        };
      }
    }
  } catch {
    // ignore storage parse issues
  }

  const ownerEmail = 'vipin@firstdraftstudio.in';
  if (!store.users[ownerEmail]) {
    store.users[ownerEmail] = {
      name: 'Vipin',
      email: ownerEmail,
      password: 'postnote2026',
      personalWorkspaceId: 'ws_vipin',
      createdAt: new Date().toISOString(),
    };
  }

  if (!store.workspaces['ws_vipin']) {
    store.workspaces['ws_vipin'] = {
      id: 'ws_vipin',
      name: 'FirstDraft Studio',
      ownerEmail,
      ownerName: 'Vipin',
      posts: [...INITIAL_POSTS],
      clients: [...INITIAL_CLIENTS],
      campaigns: [...INITIAL_CAMPAIGNS],
      ideas: [...INITIAL_IDEAS],
      teamMembers: [
        {
          id: 'member-owner-vipin',
          name: 'Vipin',
          email: ownerEmail,
          role: 'Owner',
          status: 'active',
          avatar: 'VI',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
    saveStaticStore(store);
  }

  return store;
}

function saveStaticStore(store: StaticMultiTenantStore) {
  try {
    localStorage.setItem(STATIC_STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota issues
  }
}

function ensureUserWorkspaceInStore(
  store: StaticMultiTenantStore,
  email: string,
  name?: string
): StaticWorkspaceData {
  const cleanEmail = email.trim().toLowerCase();
  const wsId = makeStaticWorkspaceId(cleanEmail);
  const displayName = (name || store.users[cleanEmail]?.name || cleanEmail.split('@')[0] || 'Studio Owner').trim();
  const initials = displayName.slice(0, 2).toUpperCase();
  const isVipin = cleanEmail === 'vipin@firstdraftstudio.in';

  if (!store.workspaces[wsId]) {
    store.workspaces[wsId] = {
      id: wsId,
      name: isVipin ? 'FirstDraft Studio' : `${displayName}'s Studio`,
      ownerEmail: cleanEmail,
      ownerName: displayName,
      posts: isVipin ? [...INITIAL_POSTS] : [],
      clients: isVipin ? [...INITIAL_CLIENTS] : [],
      campaigns: isVipin ? [...INITIAL_CAMPAIGNS] : [],
      ideas: isVipin ? [...INITIAL_IDEAS] : [],
      teamMembers: [
        {
          id: `member_owner_${Date.now()}`,
          name: displayName,
          email: cleanEmail,
          role: 'Owner',
          status: 'active',
          avatar: initials,
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Activate any pending team invitations for this user
  for (const ws of Object.values(store.workspaces)) {
    for (const m of ws.teamMembers) {
      if (m.email.toLowerCase() === cleanEmail && m.status === 'invited') {
        m.status = 'active';
        m.name = displayName;
        m.avatar = initials;
      }
    }
  }

  saveStaticStore(store);
  return store.workspaces[wsId];
}

export function getStaticWorkspacesForUser(email: string, name?: string): WorkspaceSummary[] {
  const store = loadStaticStore();
  const cleanEmail = email.trim().toLowerCase();
  ensureUserWorkspaceInStore(store, cleanEmail, name);

  const summaries: WorkspaceSummary[] = [];
  for (const ws of Object.values(store.workspaces)) {
    const isOwner = ws.ownerEmail.toLowerCase() === cleanEmail;
    const member = ws.teamMembers.find((m) => m.email.toLowerCase() === cleanEmail);
    if (isOwner || member) {
      summaries.push({
        id: ws.id,
        name: ws.name,
        ownerEmail: ws.ownerEmail,
        ownerName: ws.ownerName,
        myRole: isOwner ? 'Owner' : ((member?.role as WorkspaceRole) || 'Editor'),
        isPersonal: isOwner,
        membersCount: ws.teamMembers.length,
        clientsCount: ws.clients.length,
        postsCount: ws.posts.length,
      });
    }
  }
  return summaries;
}

export function staticAuthenticateUser(params: {
  mode: 'signin' | 'signup';
  email: string;
  password?: string;
  name?: string;
  provider?: string;
}): {
  ok: boolean;
  error?: string;
  user?: {
    name: string;
    email: string;
    role: string;
    personalWorkspaceId: string;
  };
  workspaces?: WorkspaceSummary[];
} {
  const store = loadStaticStore();
  const cleanEmail = (params.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const displayName = (params.name || store.users[cleanEmail]?.name || cleanEmail.split('@')[0] || 'Studio Owner').trim();
  const personalWs = ensureUserWorkspaceInStore(store, cleanEmail, displayName);

  if (params.provider === 'google') {
    if (!store.users[cleanEmail]) {
      store.users[cleanEmail] = {
        name: displayName,
        email: cleanEmail,
        password: `google_${cleanEmail}`,
        personalWorkspaceId: personalWs.id,
        createdAt: new Date().toISOString(),
      };
      saveStaticStore(store);
    }
    return {
      ok: true,
      user: {
        name: store.users[cleanEmail].name || displayName,
        email: cleanEmail,
        role: 'Owner',
        personalWorkspaceId: personalWs.id,
      },
      workspaces: getStaticWorkspacesForUser(cleanEmail, displayName),
    };
  }

  const pw = String(params.password || '');
  if (pw.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  if (params.mode === 'signup') {
    store.users[cleanEmail] = {
      name: displayName,
      email: cleanEmail,
      password: pw,
      personalWorkspaceId: personalWs.id,
      createdAt: store.users[cleanEmail]?.createdAt || new Date().toISOString(),
    };
    saveStaticStore(store);
  } else {
    const existing = store.users[cleanEmail];
    if (!existing) {
      store.users[cleanEmail] = {
        name: displayName,
        email: cleanEmail,
        password: pw,
        personalWorkspaceId: personalWs.id,
        createdAt: new Date().toISOString(),
      };
      saveStaticStore(store);
    } else if (existing.password !== pw) {
      return {
        ok: false,
        error: 'Incorrect password for this account. Please check your password or use Sign Up to reset it.',
      };
    }
  }

  const userRecord = store.users[cleanEmail];
  return {
    ok: true,
    user: {
      name: userRecord.name || displayName,
      email: cleanEmail,
      role: 'Owner',
      personalWorkspaceId: personalWs.id,
    },
    workspaces: getStaticWorkspacesForUser(cleanEmail, userRecord.name),
  };
}

export function staticGetWorkspaceSync(email: string, workspaceId?: string) {
  const store = loadStaticStore();
  const cleanEmail = email.trim().toLowerCase();
  const personalWs = ensureUserWorkspaceInStore(store, cleanEmail);
  const targetWsId = workspaceId || personalWs.id;
  const ws = store.workspaces[targetWsId] || personalWs;

  const isOwner = ws.ownerEmail.toLowerCase() === cleanEmail;
  const member = ws.teamMembers.find((m) => m.email.toLowerCase() === cleanEmail);
  const myRole: WorkspaceRole = isOwner
    ? 'Owner'
    : ((member?.role as WorkspaceRole) || 'Owner');

  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    ownerEmail: ws.ownerEmail,
    myRole,
    posts: ws.posts,
    clients: ws.clients,
    campaigns: ws.campaigns,
    ideas: ws.ideas,
    teamMembers: ws.teamMembers,
    workspaces: getStaticWorkspacesForUser(cleanEmail),
    lastUpdated: ws.lastUpdated,
  };
}

export function staticSaveWorkspaceSync(params: {
  email: string;
  workspaceId: string;
  posts?: Post[];
  clients?: Client[];
  campaigns?: Campaign[];
  ideas?: Idea[];
}) {
  const store = loadStaticStore();
  const cleanEmail = params.email.trim().toLowerCase();
  const personalWs = ensureUserWorkspaceInStore(store, cleanEmail);
  const ws = store.workspaces[params.workspaceId] || personalWs;

  if (Array.isArray(params.posts)) ws.posts = params.posts;
  if (Array.isArray(params.clients)) ws.clients = params.clients;
  if (Array.isArray(params.campaigns)) ws.campaigns = params.campaigns;
  if (Array.isArray(params.ideas)) ws.ideas = params.ideas;
  ws.lastUpdated = new Date().toISOString();
  saveStaticStore(store);
}

export function staticInviteTeamMember(params: {
  workspaceId: string;
  actorEmail: string;
  inviteEmail: string;
  inviteName?: string;
  role: WorkspaceRole;
}): { teamMembers: TeamMember[]; member: TeamMember } {
  const store = loadStaticStore();
  const ws = store.workspaces[params.workspaceId] || ensureUserWorkspaceInStore(store, params.actorEmail);
  const cleanInvite = params.inviteEmail.trim().toLowerCase();
  const displayName = (params.inviteName || cleanInvite.split('@')[0] || 'Member').trim();

  const existing = ws.teamMembers.find((m) => m.email.toLowerCase() === cleanInvite);
  if (existing) {
    if (existing.role !== 'Owner') existing.role = params.role;
    saveStaticStore(store);
    return { teamMembers: [...ws.teamMembers], member: existing };
  }

  const newMember: TeamMember = {
    id: `member_${Date.now()}`,
    name: displayName,
    email: cleanInvite,
    role: params.role,
    status: store.users[cleanInvite] ? 'active' : 'invited',
    avatar: displayName.slice(0, 2).toUpperCase(),
  };
  ws.teamMembers.push(newMember);
  saveStaticStore(store);
  return { teamMembers: [...ws.teamMembers], member: newMember };
}

export function staticUpdateTeamMemberRole(params: {
  workspaceId: string;
  actorEmail: string;
  memberId: string;
  role: WorkspaceRole;
}): TeamMember[] {
  const store = loadStaticStore();
  const ws = store.workspaces[params.workspaceId] || ensureUserWorkspaceInStore(store, params.actorEmail);
  const target = ws.teamMembers.find((m) => m.id === params.memberId);
  if (target && target.role !== 'Owner') {
    target.role = params.role;
    saveStaticStore(store);
  }
  return [...ws.teamMembers];
}

export function staticRemoveTeamMember(params: {
  workspaceId: string;
  actorEmail: string;
  memberId: string;
}): TeamMember[] {
  const store = loadStaticStore();
  const ws = store.workspaces[params.workspaceId] || ensureUserWorkspaceInStore(store, params.actorEmail);
  ws.teamMembers = ws.teamMembers.filter(
    (m) => m.id !== params.memberId || m.role === 'Owner'
  );
  saveStaticStore(store);
  return [...ws.teamMembers];
}
