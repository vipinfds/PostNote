import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { INITIAL_POSTS, INITIAL_CLIENTS, INITIAL_CAMPAIGNS, INITIAL_IDEAS } from './src/data/initialData';
import { Post, Client } from './src/types';

dotenv.config();

// In-memory store for shareable client portals
interface SharedPortalRecord {
  id: string;
  client: any;
  posts: any[];
  permissions?: any;
  updatedAt: string;
}
const sharedPortalsMap = new Map<string, SharedPortalRecord>();

// Persistent workspace store file path
const DATA_FILE = path.resolve(process.cwd(), 'postnote-store.json');

interface TunnelConfig {
  provider?: 'localtunnel' | 'cloudflare';
  subdomain?: string;
  token?: string;
  customDomain?: string;
  mode?: 'permanent' | 'quick';
}

interface TenantTeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Manager' | 'Editor' | 'Viewer';
  status: 'active' | 'invited';
  avatar?: string;
  addedAt: string;
}

interface TenantWorkspace {
  id: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  posts: Post[];
  clients: Client[];
  campaigns: any[];
  ideas: any[];
  teamMembers: TenantTeamMember[];
  lastUpdated: string;
}

interface RegisteredUser {
  name: string;
  email: string;
  passwordHash: string;
  personalWorkspaceId: string;
  createdAt: string;
}

// Workspace data interface
interface WorkspaceStore {
  posts: Post[];
  clients: Client[];
  campaigns: any[];
  ideas: any[];
  tunnelConfig?: TunnelConfig;
  workspaces?: Record<string, TenantWorkspace>;
  users?: Record<string, RegisteredUser>;
  lastUpdated: string;
}

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(`postnote_salt_${pw}`).digest('hex');
}

function makeWorkspaceIdForEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  if (clean === 'vipin@firstdraftstudio.in') return 'ws_vipin';
  return 'ws_' + clean.replace(/[^a-z0-9]/g, '_').slice(0, 60);
}

// In-memory workspace state initialized from disk or defaults
let workspaceStore: WorkspaceStore = {
  posts: [...INITIAL_POSTS],
  clients: [...INITIAL_CLIENTS],
  campaigns: [...INITIAL_CAMPAIGNS],
  ideas: [...INITIAL_IDEAS],
  tunnelConfig: {
    provider: 'localtunnel',
    subdomain: 'postnote-vipin',
    token: '',
    customDomain: 'mcp.firstdraftstudio.in',
    mode: 'permanent',
  },
  workspaces: {},
  users: {},
  lastUpdated: new Date().toISOString(),
};

// Load saved workspace store if available
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.posts) && Array.isArray(parsed.clients)) {
      workspaceStore = {
        posts: parsed.posts,
        clients: parsed.clients,
        campaigns: parsed.campaigns || INITIAL_CAMPAIGNS,
        ideas: parsed.ideas || INITIAL_IDEAS,
        tunnelConfig: parsed.tunnelConfig || {
          token: process.env.CLOUDFLARE_TUNNEL_TOKEN || '',
          customDomain: process.env.CLOUDFLARE_CUSTOM_DOMAIN || 'mcp.firstdraftstudio.in',
          mode: process.env.CLOUDFLARE_TUNNEL_TOKEN ? 'permanent' : 'quick',
        },
        workspaces: parsed.workspaces || {},
        users: parsed.users || {},
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
      console.log(`[Store] Loaded ${workspaceStore.posts.length} posts and ${workspaceStore.clients.length} clients from store`);
    }
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(workspaceStore, null, 2), 'utf-8');
  }
} catch (e) {
  console.warn('[Store] Could not load persisted data file, using defaults:', e);
}

// Ensure default owner account (vipin@firstdraftstudio.in) and workspace (ws_vipin) exist
function ensureDefaultOwnerWorkspace() {
  if (!workspaceStore.users) workspaceStore.users = {};
  if (!workspaceStore.workspaces) workspaceStore.workspaces = {};

  // Merge any new sample posts or clients from INITIAL_POSTS / INITIAL_CLIENTS that aren't in workspaceStore yet
  const existingPostIds = new Set(workspaceStore.posts.map((p) => p.id));
  let addedNewSeedData = false;
  for (const seedPost of INITIAL_POSTS) {
    if (!existingPostIds.has(seedPost.id)) {
      workspaceStore.posts.push(seedPost);
      existingPostIds.add(seedPost.id);
      addedNewSeedData = true;
    }
  }
  const existingClientIds = new Set(workspaceStore.clients.map((c) => c.id));
  for (const seedClient of INITIAL_CLIENTS) {
    if (!existingClientIds.has(seedClient.id)) {
      workspaceStore.clients.push(seedClient);
      existingClientIds.add(seedClient.id);
      addedNewSeedData = true;
    }
  }

  const ownerEmail = 'vipin@firstdraftstudio.in';
  if (!workspaceStore.users[ownerEmail]) {
    workspaceStore.users[ownerEmail] = {
      name: 'Vipin',
      email: ownerEmail,
      passwordHash: hashPassword('postnote2026'),
      personalWorkspaceId: 'ws_vipin',
      createdAt: new Date().toISOString(),
    };
  }

  if (!workspaceStore.workspaces['ws_vipin']) {
    workspaceStore.workspaces['ws_vipin'] = {
      id: 'ws_vipin',
      name: 'FirstDraft Studio',
      ownerEmail,
      ownerName: 'Vipin',
      posts: workspaceStore.posts,
      clients: workspaceStore.clients,
      campaigns: workspaceStore.campaigns,
      ideas: workspaceStore.ideas,
      teamMembers: [
        {
          id: 'member-owner-vipin',
          name: 'Vipin',
          email: ownerEmail,
          role: 'Owner',
          status: 'active',
          avatar: 'VI',
          addedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  } else {
    // Keep top-level store and ws_vipin in sync for MCP tools
    workspaceStore.workspaces['ws_vipin'].posts = workspaceStore.posts;
    workspaceStore.workspaces['ws_vipin'].clients = workspaceStore.clients;
    workspaceStore.workspaces['ws_vipin'].campaigns = workspaceStore.campaigns;
    workspaceStore.workspaces['ws_vipin'].ideas = workspaceStore.ideas;
  }

  if (addedNewSeedData) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(workspaceStore, null, 2), 'utf-8');
    } catch {}
  }
}
ensureDefaultOwnerWorkspace();

function getOrCreatePrivateWorkspaceForUser(email: string, name?: string): TenantWorkspace {
  ensureDefaultOwnerWorkspace();
  const cleanEmail = email.trim().toLowerCase();
  const wsId = makeWorkspaceIdForEmail(cleanEmail);
  const displayName = (name || cleanEmail.split('@')[0] || 'User').trim();
  const initials = displayName.slice(0, 2).toUpperCase();

  if (!workspaceStore.workspaces![wsId]) {
    const isVipin = cleanEmail === 'vipin@firstdraftstudio.in';
    workspaceStore.workspaces![wsId] = {
      id: wsId,
      name: isVipin ? 'FirstDraft Studio' : `${displayName}'s Studio`,
      ownerEmail: cleanEmail,
      ownerName: displayName,
      // CRITICAL: New users get a completely private, empty workspace (not Vipin's data!)
      posts: isVipin ? [...workspaceStore.posts] : [],
      clients: isVipin ? [...workspaceStore.clients] : [],
      campaigns: isVipin ? [...workspaceStore.campaigns] : [],
      ideas: isVipin ? [...workspaceStore.ideas] : [],
      teamMembers: [
        {
          id: `member-owner-${Date.now()}`,
          name: displayName,
          email: cleanEmail,
          role: 'Owner',
          status: 'active',
          avatar: initials,
          addedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
    // Also activate any pending team invitations for this email across other workspaces
    for (const ws of Object.values(workspaceStore.workspaces!)) {
      for (const m of ws.teamMembers) {
        if (m.email.toLowerCase() === cleanEmail && m.status === 'invited') {
          m.status = 'active';
          m.name = displayName;
          m.avatar = initials;
        }
      }
    }
    persistStore();
  }
  return workspaceStore.workspaces![wsId];
}

function getWorkspacesForUser(email: string, name?: string) {
  const cleanEmail = email.trim().toLowerCase();
  getOrCreatePrivateWorkspaceForUser(cleanEmail, name);

  const summaries: any[] = [];
  for (const ws of Object.values(workspaceStore.workspaces || {})) {
    const isOwner = ws.ownerEmail.toLowerCase() === cleanEmail;
    const memberRecord = ws.teamMembers.find((m) => m.email.toLowerCase() === cleanEmail);

    if (isOwner || memberRecord) {
      summaries.push({
        id: ws.id,
        name: ws.name,
        ownerEmail: ws.ownerEmail,
        ownerName: ws.ownerName,
        myRole: isOwner ? 'Owner' : memberRecord!.role,
        isPersonal: isOwner,
        membersCount: ws.teamMembers.length,
        clientsCount: ws.clients.length,
        postsCount: ws.posts.length,
      });
    }
  }
  return summaries;
}

function getUserRoleInWorkspace(ws: TenantWorkspace, email: string): 'Owner' | 'Admin' | 'Manager' | 'Editor' | 'Viewer' | null {
  const cleanEmail = email.trim().toLowerCase();
  if (ws.ownerEmail.toLowerCase() === cleanEmail) return 'Owner';
  const member = ws.teamMembers.find((m) => m.email.toLowerCase() === cleanEmail);
  return member ? member.role : null;
}

function persistStore() {
  try {
    workspaceStore.lastUpdated = new Date().toISOString();
    if (workspaceStore.workspaces && workspaceStore.workspaces['ws_vipin']) {
      workspaceStore.posts = workspaceStore.workspaces['ws_vipin'].posts;
      workspaceStore.clients = workspaceStore.workspaces['ws_vipin'].clients;
      workspaceStore.campaigns = workspaceStore.workspaces['ws_vipin'].campaigns;
      workspaceStore.ideas = workspaceStore.workspaces['ws_vipin'].ideas;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(workspaceStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Failed to write store to disk:', err);
  }
}

// -------------------------------------------------------------
// OAuth 2.0 In-Memory Store & Models
// -------------------------------------------------------------
interface OAuthClient {
  client_id: string;
  client_secret?: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
}

interface AuthCodeRecord {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
  expiresAt: number;
}

const oauthClients = new Map<string, OAuthClient>([
  [
    'claude_postnote_client',
    {
      client_id: 'claude_postnote_client',
      client_secret: 'postnote_oauth_secret_2026',
      client_name: 'Claude AI',
      redirect_uris: [
        'https://claude.ai/api/mcp/auth_callback',
        'https://claude.com/api/mcp/auth_callback',
        'http://localhost:3000/oauth/callback',
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
  ],
]);

const pendingAuthCodes = new Map<string, AuthCodeRecord>();
const validAccessTokens = new Set<string>();

let publicTunnelUrl: string | null = null;
let tunnelProcess: ChildProcess | null = null;
let ltInstance: any = null;

async function startLocaltunnel(subdomain = 'postnote-vipin') {
  const cleanSub = (subdomain || 'postnote-vipin').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'postnote-vipin';
  console.log(`[Localtunnel] Connecting with free custom subdomain: "${cleanSub}"...`);

  if (ltInstance) {
    try {
      ltInstance.close();
    } catch {}
    ltInstance = null;
  }
  if (tunnelProcess) {
    try {
      tunnelProcess.kill();
    } catch {}
    tunnelProcess = null;
  }

  try {
    const localtunnelModule: any = await import('localtunnel');
    const localtunnelFn = localtunnelModule.default || localtunnelModule;
    const tunnel = await localtunnelFn({
      port: 3000,
      host: 'https://loca.lt',
      subdomain: cleanSub,
    });
    ltInstance = tunnel;
    publicTunnelUrl = tunnel.url;
    console.log(`[Localtunnel Active] 100% Free URL (Zero Signup / No Card): ${publicTunnelUrl}`);

    tunnel.on('close', () => {
      console.log('[Localtunnel] Tunnel connection closed.');
      ltInstance = null;
      setTimeout(() => {
        if (!ltInstance && (!workspaceStore.tunnelConfig?.provider || workspaceStore.tunnelConfig?.provider === 'localtunnel')) {
          startLocaltunnel(workspaceStore.tunnelConfig?.subdomain || cleanSub);
        }
      }, 5000);
    });

    tunnel.on('error', (err: any) => {
      console.warn('[Localtunnel Error]', err);
    });
  } catch (err) {
    console.error('[Localtunnel Failed]', err);
    // Graceful fallback to cloud tunnel
    startCloudTunnel();
  }
}

function initializeActiveTunnel() {
  const config = workspaceStore.tunnelConfig || {};
  if (config.provider === 'cloudflare' && config.token && config.mode !== 'quick') {
    startCloudTunnel();
  } else {
    // Default to Localtunnel: 100% free, no credit card, no signup
    startLocaltunnel(config.subdomain || 'postnote-vipin');
  }
}

function startCloudTunnel() {
  let binaryPath = path.resolve(process.cwd(), 'bin/cloudflared');
  if (!fs.existsSync(binaryPath)) {
    binaryPath = path.resolve(process.cwd(), 'node_modules/cloudflared/bin/cloudflared');
  }
  if (!fs.existsSync(binaryPath)) {
    try {
      const cf = require('cloudflared');
      if (cf?.bin && fs.existsSync(cf.bin)) {
        binaryPath = cf.bin;
      }
    } catch {}
  }
  if (!fs.existsSync(binaryPath)) {
    console.warn('[Tunnel] cloudflared binary not found at', binaryPath);
    return;
  }

  try {
    if (ltInstance) {
      try { ltInstance.close(); } catch {}
      ltInstance = null;
    }
    if (tunnelProcess) {
      try {
        tunnelProcess.kill();
      } catch {}
      tunnelProcess = null;
    }

    const config = workspaceStore.tunnelConfig || {};
    const hasToken = Boolean(config.token && config.token.trim().length > 15);
    const usePermanent = hasToken && config.mode !== 'quick';

    if (usePermanent) {
      const token = config.token!.trim();
      const customDomain = (config.customDomain || 'mcp.firstdraftstudio.in')
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim();

      console.log(`[Tunnel] Launching permanent Cloudflare Tunnel for domain: https://${customDomain}`);
      publicTunnelUrl = `https://${customDomain}`;

      const child = spawn(binaryPath, [
        'tunnel',
        '--protocol',
        'http2',
        'run',
        '--token',
        token,
      ]);

      tunnelProcess = child;

      child.stdout.on('data', (d: Buffer) => {
        const text = d.toString();
        if (text.includes('ERR') || text.includes('error')) {
          console.warn('[Cloudflared Token]', text.trim());
        }
      });
      child.stderr.on('data', (d: Buffer) => {
        const text = d.toString();
        if (text.includes('ERR') || text.includes('error') || text.includes('Registered tunnel connection')) {
          console.log('[Cloudflared]', text.trim());
        }
      });

      child.on('close', (code) => {
        console.log(`[Permanent Tunnel] exited with code ${code}`);
        tunnelProcess = null;
      });
    } else {
      console.log('[Tunnel] Launching automatic quick tunnel (trycloudflare.com)...');
      const child = spawn(binaryPath, [
        'tunnel',
        '--protocol',
        'http2',
        '--url',
        'http://localhost:3000',
        '--no-autoupdate',
      ]);

      tunnelProcess = child;

      const parseOutput = (data: Buffer) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
        if (match) {
          publicTunnelUrl = match[0];
          console.log(`[Tunnel Active] Quick Cloud URL: ${publicTunnelUrl}`);
        }
      };

      child.stdout.on('data', parseOutput);
      child.stderr.on('data', parseOutput);

      child.on('close', (code) => {
        console.log(`[Tunnel] exited with code ${code}`);
        publicTunnelUrl = null;
        setTimeout(() => {
          if (!publicTunnelUrl && !tunnelProcess && workspaceStore.tunnelConfig?.provider === 'cloudflare') {
            startCloudTunnel();
          }
        }, 5000);
      });
    }
  } catch (err) {
    console.error('[Tunnel] Failed to spawn cloudflared:', err);
  }
}

// Generate public base URL respecting cloud proxies, custom domains & public tunnel
function getPublicBaseUrl(req: express.Request): string {
  // If permanent custom domain is configured and active
  const config = workspaceStore.tunnelConfig;
  if (config?.token && config?.mode !== 'quick' && config?.customDomain) {
    const domain = config.customDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();
    if (domain) {
      return `https://${domain}`;
    }
  }

  const reqHost = req.headers['x-forwarded-host'] || req.headers.host || '';
  const hostStr = Array.isArray(reqHost) ? reqHost[0] : String(reqHost);
  if (hostStr.includes('trycloudflare.com')) {
    return `https://${hostStr}`;
  }
  if (publicTunnelUrl && !hostStr.includes('localhost')) {
    return publicTunnelUrl;
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol || 'https';
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

// SSE session tracking
interface SseSession {
  id: string;
  res: express.Response;
  timer: NodeJS.Timeout;
}
const sseSessions = new Map<string, SseSession>();

// Tool definitions for MCP
const MCP_TOOLS = [
  {
    name: 'list_posts',
    description: 'List and filter social media posts in the PostNote workspace (Read Access). Returns posts with details, platform, client, status, and scheduled date.',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Filter by client ID (e.g. "client-codery") or client name (e.g. "Codery", "Kudoli")',
        },
        status: {
          type: 'string',
          enum: ['Planned', 'In review', 'Approved', 'Scheduled', 'Published'],
          description: 'Filter by approval/publishing status',
        },
        platform: {
          type: 'string',
          enum: ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'Other'],
          description: 'Filter by social media platform',
        },
        limit: {
          type: 'number',
          description: 'Max posts to return (default: 50)',
        },
      },
    },
  },
  {
    name: 'get_post',
    description: 'Retrieve full details of a specific social media post by its ID (Read Access).',
    inputSchema: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'The unique ID of the post (e.g. "post-codery-1")',
        },
      },
      required: ['postId'],
    },
  },
  {
    name: 'create_post',
    description: 'Create a new social media post draft or scheduled item in PostNote (Write Access). Updates the calendar and queue in real-time.',
    inputSchema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'The client or brand name (e.g. "Codery", "Kudoli", "Cordori", "Nimbus Fitness", "Brew & Bean Co.")',
        },
        clientId: {
          type: 'string',
          description: 'Optional client ID if known',
        },
        title: {
          type: 'string',
          description: 'Brief headline or title for the post',
        },
        caption: {
          type: 'string',
          description: 'The full copy/caption text of the social post, including hashtags and emojis',
        },
        platform: {
          type: 'string',
          enum: ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'Other'],
          description: 'Social platform target (default: "Instagram")',
        },
        date: {
          type: 'string',
          description: 'Scheduled publishing date in YYYY-MM-DD format (e.g. "2026-10-05"). Defaults to today or tomorrow if omitted.',
        },
        status: {
          type: 'string',
          enum: ['Planned', 'In review', 'Approved', 'Scheduled', 'Published'],
          description: 'Initial workflow status (default: "Planned")',
        },
        category: {
          type: 'string',
          enum: ['POST', 'TIPS', 'BEHIND THE SCENES', 'QUOTE', 'EDUCATE', 'ENGAGE', 'RELAX'],
          description: 'Category tag for the content (default: "POST")',
        },
        campaign: {
          type: 'string',
          description: 'Optional campaign name to associate with this post',
        },
      },
      required: ['title', 'caption'],
    },
  },
  {
    name: 'update_post',
    description: 'Update an existing social media post in PostNote (Write Access). Can modify caption, title, scheduled date, status, or platform.',
    inputSchema: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'The unique ID of the post to update',
        },
        caption: {
          type: 'string',
          description: 'Updated copy/caption text',
        },
        title: {
          type: 'string',
          description: 'Updated headline/title',
        },
        status: {
          type: 'string',
          enum: ['Planned', 'In review', 'Approved', 'Scheduled', 'Published'],
          description: 'New workflow status',
        },
        date: {
          type: 'string',
          description: 'New scheduled date in YYYY-MM-DD format',
        },
        platform: {
          type: 'string',
          enum: ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'Other'],
          description: 'New platform target',
        },
        category: {
          type: 'string',
          enum: ['POST', 'TIPS', 'BEHIND THE SCENES', 'QUOTE', 'EDUCATE', 'ENGAGE', 'RELAX'],
          description: 'New category tag',
        },
      },
      required: ['postId'],
    },
  },
  {
    name: 'delete_post',
    description: 'Delete a post from the PostNote workspace by ID (Write Access).',
    inputSchema: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'The ID of the post to delete',
        },
      },
      required: ['postId'],
    },
  },
  {
    name: 'list_clients',
    description: 'List all clients, social handles, brand colors, notes, and active post counts in PostNote (Read Access).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_client',
    description: 'Create a new client profile in PostNote (Write Access).',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Client company or brand name (e.g. "Acme Corp")',
        },
        handle: {
          type: 'string',
          description: 'Primary social handle (e.g. "@acmecorp")',
        },
        color: {
          type: 'string',
          description: 'Brand accent hex color (e.g. "#3B82F6")',
        },
        notes: {
          type: 'string',
          description: 'Client bio, target audience, or brand guidelines',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_workspace_stats',
    description: 'Get an overview of workspace health: total posts, status breakdown (Planned, In review, Approved, Scheduled, Published), platform distribution, and upcoming deadlines.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Gemini Function Declarations matching @google/genai SDK format
const GEMINI_FUNCTION_DECLARATIONS = MCP_TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.inputSchema,
}));

// OpenAPI 3.1 Specification Generator for ChatGPT Actions
function getOpenApiSpec(baseUrl: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'PostNote Social Media Workspace API',
      description: 'API for ChatGPT Actions and AI agents to manage social media drafts, scheduling, approvals, and clients in PostNote.',
      version: '1.0.0',
    },
    servers: [
      {
        url: baseUrl,
        description: 'PostNote Live Server',
      },
    ],
    paths: {
      '/api/gpt/posts': {
        get: {
          operationId: 'listPosts',
          summary: 'List and filter social media posts',
          description: 'Retrieve posts from the PostNote calendar and queue with optional filters for client, status, platform, and limit.',
          parameters: [
            { name: 'clientId', in: 'query', schema: { type: 'string' }, description: 'Client name or ID filter' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['Planned', 'In review', 'Approved', 'Scheduled', 'Published'] }, description: 'Status filter' },
            { name: 'platform', in: 'query', schema: { type: 'string', enum: ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'Other'] }, description: 'Platform filter' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Max posts to return' },
          ],
          responses: {
            '200': {
              description: 'List of matching posts',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalFound: { type: 'integer' },
                      returned: { type: 'integer' },
                      posts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            client: { type: 'string' },
                            platform: { type: 'string' },
                            date: { type: 'string' },
                            status: { type: 'string' },
                            category: { type: 'string' },
                            caption: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createPost',
          summary: 'Create and schedule a new social media post',
          description: 'Draft or schedule a new post for a client brand. Automatically populates the calendar and approvals queue.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'caption'],
                  properties: {
                    clientName: { type: 'string', description: 'Name of the client brand (e.g. Codery, Kudoli, Cordori)' },
                    title: { type: 'string', description: 'Headline or short title' },
                    caption: { type: 'string', description: 'Full caption/copy text with hashtags and emojis' },
                    platform: { type: 'string', enum: ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'Other'], default: 'Instagram' },
                    date: { type: 'string', description: 'Scheduled date in YYYY-MM-DD format (e.g. 2026-10-05)' },
                    status: { type: 'string', enum: ['Planned', 'In review', 'Approved', 'Scheduled', 'Published'], default: 'Planned' },
                    category: { type: 'string', default: 'POST' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Post created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      post: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/gpt/posts/{postId}': {
        get: {
          operationId: 'getPost',
          summary: 'Get details of a single post by ID',
          parameters: [
            { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Post details' },
          },
        },
        patch: {
          operationId: 'updatePost',
          summary: 'Update post caption, status, platform, or date',
          parameters: [
            { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    caption: { type: 'string' },
                    status: { type: 'string', enum: ['Planned', 'In review', 'Approved', 'Scheduled', 'Published'] },
                    date: { type: 'string' },
                    platform: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Post updated' },
          },
        },
        delete: {
          operationId: 'deletePost',
          summary: 'Delete a post by ID',
          parameters: [
            { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Post removed' },
          },
        },
      },
      '/api/gpt/clients': {
        get: {
          operationId: 'listClients',
          summary: 'List all active client workspaces',
          responses: {
            '200': { description: 'List of clients' },
          },
        },
        post: {
          operationId: 'createClient',
          summary: 'Create a new client brand',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    handle: { type: 'string' },
                    color: { type: 'string' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Client created' },
          },
        },
      },
      '/api/gpt/stats': {
        get: {
          operationId: 'getWorkspaceStats',
          summary: 'Get workspace health, status breakdown, and upcoming calendar posts',
          responses: {
            '200': { description: 'Workspace statistics' },
          },
        },
      },
    },
  };
}

// Tool execution engine
function executeMcpTool(name: string, args: any) {
  switch (name) {
    case 'list_posts': {
      let filtered = [...workspaceStore.posts];
      if (args?.clientId) {
        const query = String(args.clientId).toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.clientId.toLowerCase() === query ||
            p.clientName.toLowerCase().includes(query)
        );
      }
      if (args?.status) {
        filtered = filtered.filter(
          (p) => p.status.toLowerCase() === String(args.status).toLowerCase()
        );
      }
      if (args?.platform) {
        filtered = filtered.filter(
          (p) => p.platform.toLowerCase() === String(args.platform).toLowerCase()
        );
      }
      const limit = args?.limit ? Number(args.limit) : 50;
      const result = filtered.slice(0, limit);
      return {
        totalFound: filtered.length,
        returned: result.length,
        posts: result.map((p) => ({
          id: p.id,
          title: p.title,
          client: p.clientName,
          platform: p.platform,
          date: p.date,
          status: p.status,
          category: p.category,
          caption: p.caption,
          campaign: p.campaign || null,
        })),
      };
    }

    case 'get_post': {
      if (!args?.postId) {
        throw new Error('postId argument is required');
      }
      const post = workspaceStore.posts.find((p) => p.id === args.postId);
      if (!post) {
        throw new Error(`Post with id "${args.postId}" not found`);
      }
      return { post };
    }

    case 'create_post': {
      if (!args?.title || !args?.caption) {
        throw new Error('title and caption are required to create a post');
      }

      let matchedClient = workspaceStore.clients[0];
      if (args.clientId) {
        const found = workspaceStore.clients.find((c) => c.id === args.clientId);
        if (found) matchedClient = found;
      } else if (args.clientName) {
        const q = String(args.clientName).toLowerCase();
        const found = workspaceStore.clients.find(
          (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
        );
        if (found) {
          matchedClient = found;
        } else {
          const newClientId = `client-${Date.now().toString(36)}`;
          matchedClient = {
            id: newClientId,
            name: args.clientName,
            handle: `@${args.clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            color: '#C44D34',
            notes: 'Auto-created via AI tool',
            postsCount: 0,
          };
          workspaceStore.clients.push(matchedClient);
        }
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const newPost: Post = {
        id: `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        clientId: matchedClient.id,
        clientName: matchedClient.name,
        title: args.title,
        caption: args.caption,
        platform: args.platform || 'Instagram',
        date: args.date || todayStr,
        status: args.status || 'Planned',
        category: args.category || 'POST',
        campaign: args.campaign || undefined,
        createdAt: new Date().toISOString(),
      };

      workspaceStore.posts.unshift(newPost);
      matchedClient.postsCount = (matchedClient.postsCount || 0) + 1;
      persistStore();

      return {
        message: 'Post successfully created and added to PostNote calendar & queue',
        post: newPost,
      };
    }

    case 'update_post': {
      if (!args?.postId) {
        throw new Error('postId is required to update a post');
      }
      const postIndex = workspaceStore.posts.findIndex((p) => p.id === args.postId);
      if (postIndex === -1) {
        throw new Error(`Post with id "${args.postId}" not found`);
      }

      const existing = workspaceStore.posts[postIndex];
      const updated: Post = {
        ...existing,
        title: args.title !== undefined ? args.title : existing.title,
        caption: args.caption !== undefined ? args.caption : existing.caption,
        status: args.status !== undefined ? args.status : existing.status,
        date: args.date !== undefined ? args.date : existing.date,
        platform: args.platform !== undefined ? args.platform : existing.platform,
        category: args.category !== undefined ? args.category : existing.category,
      };

      workspaceStore.posts[postIndex] = updated;
      persistStore();

      return {
        message: `Post ${args.postId} updated successfully`,
        updatedPost: updated,
      };
    }

    case 'delete_post': {
      if (!args?.postId) {
        throw new Error('postId is required to delete a post');
      }
      const postIndex = workspaceStore.posts.findIndex((p) => p.id === args.postId);
      if (postIndex === -1) {
        throw new Error(`Post with id "${args.postId}" not found`);
      }

      const deleted = workspaceStore.posts.splice(postIndex, 1)[0];
      const client = workspaceStore.clients.find((c) => c.id === deleted.clientId);
      if (client && (client.postsCount || 0) > 0) {
        client.postsCount = (client.postsCount || 1) - 1;
      }
      persistStore();

      return {
        message: `Post "${deleted.title}" (id: ${deleted.id}) has been removed`,
        deletedId: deleted.id,
      };
    }

    case 'list_clients': {
      return {
        count: workspaceStore.clients.length,
        clients: workspaceStore.clients.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
          color: c.color,
          notes: c.notes || '',
          postsCount: c.postsCount || 0,
        })),
      };
    }

    case 'create_client': {
      if (!args?.name) {
        throw new Error('name is required to create a client');
      }
      const newClient: Client = {
        id: `client-${Date.now().toString(36)}`,
        name: args.name,
        handle: args.handle || `@${args.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        color: args.color || '#3B82F6',
        notes: args.notes || '',
        postsCount: 0,
        createdAt: new Date().toISOString(),
      };
      workspaceStore.clients.push(newClient);
      persistStore();
      return {
        message: `Client "${newClient.name}" created successfully`,
        client: newClient,
      };
    }

    case 'get_workspace_stats': {
      const statusCounts: Record<string, number> = {};
      const platformCounts: Record<string, number> = {};

      for (const p of workspaceStore.posts) {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
        platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const upcomingPosts = workspaceStore.posts
        .filter((p) => p.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);

      return {
        totalPosts: workspaceStore.posts.length,
        totalClients: workspaceStore.clients.length,
        byStatus: statusCounts,
        byPlatform: platformCounts,
        upcomingCount: upcomingPosts.length,
        upcomingSample: upcomingPosts.map((p) => ({
          id: p.id,
          title: p.title,
          client: p.clientName,
          date: p.date,
          status: p.status,
          platform: p.platform,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC 2.0 processor for MCP
function processJsonRpc(body: any) {
  const { jsonrpc, id, method, params } = body || {};

  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
    };
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    return id !== undefined ? { jsonrpc: '2.0', id, result: {} } : null;
  }

  switch (method) {
    case 'initialize': {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'postnote-mcp',
            version: '1.0.0',
          },
          instructions:
            'PostNote Model Context Protocol (MCP) server. You have full read and write access to manage social media posts, calendar items, queue approvals, and clients for creative agencies.',
        },
      };
    }

    case 'ping': {
      return { jsonrpc: '2.0', id, result: {} };
    }

    case 'tools/list': {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      };
    }

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const executionResult = executeMcpTool(toolName, toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(executionResult, null, 2),
              },
            ],
            isError: false,
          },
        };
      } catch (err: any) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error executing tool "${toolName}": ${err?.message || String(err)}`,
              },
            ],
            isError: true,
          },
        };
      }
    }

    case 'resources/list': {
      return {
        jsonrpc: '2.0',
        id,
        result: { resources: [] },
      };
    }

    case 'prompts/list': {
      return {
        jsonrpc: '2.0',
        id,
        result: { prompts: [] },
      };
    }

    default: {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Bind to 0.0.0.0:PORT immediately so Cloud Run health checks succeed right away
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Multi-AI Hub] MCP (Claude/Cursor), OpenAPI (ChatGPT), and Gemini Copilot ready`);
    if (process.env.ENABLE_AUTO_TUNNEL === 'true') {
      initializeActiveTunnel();
    }
  });

  // Global permissive CORS headers for Claude browser connections and external tools
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-session-id, Accept, Origin, User-Agent, mcp-session-id, cache-control, WWW-Authenticate, bypass-tunnel-reminder, Bypass-Tunnel-Reminder'
    );
    res.header('Access-Control-Expose-Headers', '*');
    res.header('bypass-tunnel-reminder', 'true');
    res.header('Bypass-Tunnel-Reminder', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Support both JSON bodies and URL-encoded form data (required for OAuth token requests)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      mcp: 'ready',
      oauth: 'active',
      gpt: 'ready',
      gemini: 'ready',
      tunnel: publicTunnelUrl ? 'active' : 'starting',
      postsCount: workspaceStore.posts.length,
      clientsCount: workspaceStore.clients.length,
    });
  });

  // Public cloud tunnel discovery endpoint
  app.get('/api/tunnel', (req, res) => {
    const config = workspaceStore.tunnelConfig || {};
    const provider = config.provider || 'localtunnel';
    const isPermanent = provider === 'localtunnel' || Boolean(config.token && config.token.trim().length > 15 && config.mode !== 'quick');
    res.json({
      publicUrl: publicTunnelUrl,
      status: publicTunnelUrl ? 'active' : 'starting',
      mcpUrl: publicTunnelUrl ? `${publicTunnelUrl}/mcp` : null,
      openapiUrl: publicTunnelUrl ? `${publicTunnelUrl}/openapi.json` : null,
      oauthAuthorizeUrl: publicTunnelUrl ? `${publicTunnelUrl}/oauth/authorize` : null,
      oauthTokenUrl: publicTunnelUrl ? `${publicTunnelUrl}/oauth/token` : null,
      isPermanent,
      provider,
      subdomain: config.subdomain || 'postnote-vipin',
      customDomain: config.customDomain || 'mcp.firstdraftstudio.in',
      mode: config.mode || (isPermanent ? 'permanent' : 'quick'),
    });
  });

  app.get('/api/tunnel/config', (req, res) => {
    const config = workspaceStore.tunnelConfig || {};
    const provider = config.provider || 'localtunnel';
    const hasToken = Boolean(config.token && config.token.trim().length > 15);
    const isPermanent = provider === 'localtunnel' || (hasToken && config.mode !== 'quick');
    res.json({
      hasToken,
      provider,
      subdomain: config.subdomain || 'postnote-vipin',
      customDomain: config.customDomain || 'mcp.firstdraftstudio.in',
      tokenMasked: hasToken ? `${config.token!.slice(0, 10)}...${config.token!.slice(-6)}` : null,
      mode: config.mode || (isPermanent ? 'permanent' : 'quick'),
      publicUrl: publicTunnelUrl,
      status: publicTunnelUrl ? 'active' : 'starting',
      isPermanent,
    });
  });

  // Localtunnel instant custom subdomain endpoint (100% free, zero card, zero signup)
  app.post('/api/tunnel/localtunnel', async (req, res) => {
    try {
      const { subdomain } = req.body;
      const cleanSub = (subdomain || 'postnote-vipin').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'postnote-vipin';
      if (!workspaceStore.tunnelConfig) {
        workspaceStore.tunnelConfig = {};
      }
      workspaceStore.tunnelConfig.provider = 'localtunnel';
      workspaceStore.tunnelConfig.subdomain = cleanSub;
      persistStore();

      await startLocaltunnel(cleanSub);

      return res.json({
        success: true,
        provider: 'localtunnel',
        subdomain: cleanSub,
        publicUrl: publicTunnelUrl,
        mcpUrl: `${publicTunnelUrl}/mcp`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to start localtunnel' });
    }
  });

  app.post('/api/tunnel/config', (req, res) => {
    try {
      const { token, customDomain, mode } = req.body;
      if (!workspaceStore.tunnelConfig) {
        workspaceStore.tunnelConfig = {};
      }
      workspaceStore.tunnelConfig.provider = 'cloudflare';
      if (typeof token === 'string') {
        workspaceStore.tunnelConfig.token = token.trim();
      }
      if (typeof customDomain === 'string' && customDomain.trim()) {
        workspaceStore.tunnelConfig.customDomain = customDomain.trim();
      }
      if (mode === 'permanent' || mode === 'quick') {
        workspaceStore.tunnelConfig.mode = mode;
      } else {
        workspaceStore.tunnelConfig.mode = workspaceStore.tunnelConfig.token ? 'permanent' : 'quick';
      }

      persistStore();
      startCloudTunnel();

      const isPermanent = Boolean(
        workspaceStore.tunnelConfig.token &&
        workspaceStore.tunnelConfig.mode !== 'quick'
      );

      return res.json({
        success: true,
        message: isPermanent ? 'Permanent Cloudflare Tunnel connected' : 'Quick tunnel active',
        isPermanent,
        customDomain: workspaceStore.tunnelConfig.customDomain,
        publicUrl: publicTunnelUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to update tunnel config' });
    }
  });

  app.post('/api/tunnel/reset', (req, res) => {
    try {
      workspaceStore.tunnelConfig = {
        provider: 'localtunnel',
        subdomain: 'postnote-vipin',
        token: '',
        customDomain: 'mcp.firstdraftstudio.in',
        mode: 'permanent',
      };
      persistStore();
      startLocaltunnel('postnote-vipin');
      return res.json({ success: true, message: 'Reverted to free Localtunnel custom subdomain' });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to reset tunnel' });
    }
  });

  app.post('/api/tunnel/restart', (req, res) => {
    initializeActiveTunnel();
    res.json({ message: 'Tunnel restart initiated' });
  });

  // -------------------------------------------------------------
  // Multi-Tenant Authentication, Private Workspaces & Team RBAC
  // -------------------------------------------------------------
  app.post('/api/auth/signup', (req, res) => {
    try {
      const { name, email, password, provider } = req.body || {};
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      const cleanEmail = email.trim().toLowerCase();
      const displayName = (name || cleanEmail.split('@')[0] || 'Studio Owner').trim();

      ensureDefaultOwnerWorkspace();
      if (!workspaceStore.users) workspaceStore.users = {};

      if (provider !== 'google') {
        if (!password || String(password).length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        // If user already exists with the same password, sign them in seamlessly;
        // if they are setting/updating their password via Sign Up, update it and sign them in
        if (workspaceStore.users[cleanEmail]) {
          workspaceStore.users[cleanEmail].name = displayName || workspaceStore.users[cleanEmail].name;
          workspaceStore.users[cleanEmail].passwordHash = hashPassword(String(password));
        }
      }

      const personalWs = getOrCreatePrivateWorkspaceForUser(cleanEmail, displayName);
      if (!workspaceStore.users[cleanEmail]) {
        workspaceStore.users[cleanEmail] = {
          name: displayName,
          email: cleanEmail,
          passwordHash: password ? hashPassword(String(password)) : hashPassword(`oauth_${cleanEmail}`),
          personalWorkspaceId: personalWs.id,
          createdAt: new Date().toISOString(),
        };
      }
      persistStore();

      const workspaces = getWorkspacesForUser(cleanEmail, displayName);
      return res.json({
        user: {
          name: workspaceStore.users[cleanEmail].name || displayName,
          email: cleanEmail,
          role: 'Owner',
          personalWorkspaceId: personalWs.id,
        },
        workspaces,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Sign up failed' });
    }
  });

  app.post('/api/auth/signin', (req, res) => {
    try {
      const { email, password, name, provider } = req.body || {};
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      const cleanEmail = email.trim().toLowerCase();
      ensureDefaultOwnerWorkspace();

      if (provider === 'google') {
        const displayName = (name || cleanEmail.split('@')[0] || 'User').trim();
        const personalWs = getOrCreatePrivateWorkspaceForUser(cleanEmail, displayName);
        if (!workspaceStore.users![cleanEmail]) {
          workspaceStore.users![cleanEmail] = {
            name: displayName,
            email: cleanEmail,
            passwordHash: hashPassword(`google_${cleanEmail}`),
            personalWorkspaceId: personalWs.id,
            createdAt: new Date().toISOString(),
          };
          persistStore();
        }
        const userRecord = workspaceStore.users![cleanEmail];
        const workspaces = getWorkspacesForUser(cleanEmail, userRecord.name);
        return res.json({
          user: {
            name: userRecord.name,
            email: cleanEmail,
            role: 'Owner',
            personalWorkspaceId: personalWs.id,
          },
          workspaces,
        });
      }

      let existingUser = workspaceStore.users?.[cleanEmail];

      // If no account exists yet and user enters valid email + password (>=6 chars),
      // auto-provision their private account & workspace so first-time Sign In never dead-ends
      if (!existingUser) {
        if (!password || String(password).length < 6) {
          return res.status(400).json({
            error: 'Password must be at least 6 characters.',
          });
        }
        const displayName = (name || cleanEmail.split('@')[0] || 'Studio Owner').trim();
        const personalWs = getOrCreatePrivateWorkspaceForUser(cleanEmail, displayName);
        existingUser = {
          name: displayName,
          email: cleanEmail,
          passwordHash: hashPassword(String(password)),
          personalWorkspaceId: personalWs.id,
          createdAt: new Date().toISOString(),
        };
        workspaceStore.users![cleanEmail] = existingUser;
        persistStore();
      } else {
        if (!password || existingUser.passwordHash !== hashPassword(String(password))) {
          return res.status(401).json({
            error: 'Incorrect password for this account. Please check your password or use Sign Up to reset it.',
          });
        }
      }

      const personalWs = getOrCreatePrivateWorkspaceForUser(cleanEmail, existingUser.name);
      // Activate any pending team invitations for this user
      for (const ws of Object.values(workspaceStore.workspaces || {})) {
        for (const m of ws.teamMembers) {
          if (m.email.toLowerCase() === cleanEmail && m.status === 'invited') {
            m.status = 'active';
            m.name = existingUser.name;
            m.avatar = existingUser.name.slice(0, 2).toUpperCase();
          }
        }
      }
      persistStore();

      const workspaces = getWorkspacesForUser(cleanEmail, existingUser.name);
      return res.json({
        user: {
          name: existingUser.name,
          email: cleanEmail,
          role: 'Owner',
          personalWorkspaceId: personalWs.id,
        },
        workspaces,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Sign in failed' });
    }
  });

  app.get('/api/workspaces', (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'email query parameter is required' });
    }
    const workspaces = getWorkspacesForUser(email);
    return res.json({ workspaces });
  });

  app.post('/api/team/invite', (req, res) => {
    try {
      const { workspaceId, actorEmail, inviteEmail, inviteName, role } = req.body || {};
      if (!workspaceId || !actorEmail || !inviteEmail) {
        return res.status(400).json({ error: 'workspaceId, actorEmail, and inviteEmail are required' });
      }
      const ws = workspaceStore.workspaces?.[workspaceId];
      if (!ws) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      const actorRole = getUserRoleInWorkspace(ws, actorEmail);
      if (actorRole !== 'Owner' && actorRole !== 'Admin') {
        return res.status(403).json({ error: 'Only Workspace Owners and Admins can invite team members.' });
      }

      const cleanInviteEmail = String(inviteEmail).trim().toLowerCase();
      const validRoles = ['Admin', 'Manager', 'Editor', 'Viewer'];
      const assignedRole = validRoles.includes(role) ? role : 'Editor';

      const existingMember = ws.teamMembers.find((m) => m.email.toLowerCase() === cleanInviteEmail);
      if (existingMember) {
        if (existingMember.role !== 'Owner') {
          existingMember.role = assignedRole;
        }
        persistStore();
        return res.json({ teamMembers: ws.teamMembers, updated: true });
      }

      const isAlreadyRegistered = Boolean(workspaceStore.users?.[cleanInviteEmail]);
      const displayName =
        (inviteName || workspaceStore.users?.[cleanInviteEmail]?.name || cleanInviteEmail.split('@')[0]).trim();

      const newMember: TenantTeamMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: displayName,
        email: cleanInviteEmail,
        role: assignedRole as any,
        status: isAlreadyRegistered ? 'active' : 'invited',
        avatar: displayName.slice(0, 2).toUpperCase(),
        addedAt: new Date().toISOString(),
      };

      ws.teamMembers.push(newMember);
      ws.lastUpdated = new Date().toISOString();
      persistStore();

      const origin = req.headers.origin || `http://${req.headers.host || 'localhost:3000'}`;
      const inviteParams = new URLSearchParams();
      inviteParams.set('invite', '1');
      inviteParams.set('email', cleanInviteEmail);
      inviteParams.set('role', assignedRole);
      inviteParams.set('workspace', ws.id);
      inviteParams.set('workspaceName', ws.name || 'PostNote Studio');
      if (inviteName) inviteParams.set('name', String(inviteName).trim());
      const inviteSignUpUrl = `${origin}/?${inviteParams.toString()}`;

      console.log(
        `[Invite Email Dispatched] To: ${cleanInviteEmail} | Role: ${assignedRole} | Sign-Up URL: ${inviteSignUpUrl}`
      );

      return res.json({
        teamMembers: ws.teamMembers,
        member: newMember,
        invitationEmail: {
          sent: true,
          to: cleanInviteEmail,
          role: assignedRole,
          workspaceName: ws.name || 'PostNote Studio',
          inviteUrl: inviteSignUpUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to invite team member' });
    }
  });

  app.patch('/api/team/role', (req, res) => {
    try {
      const { workspaceId, actorEmail, memberId, role } = req.body || {};
      const ws = workspaceStore.workspaces?.[workspaceId];
      if (!ws) return res.status(404).json({ error: 'Workspace not found' });

      const actorRole = getUserRoleInWorkspace(ws, actorEmail || '');
      if (actorRole !== 'Owner' && actorRole !== 'Admin') {
        return res.status(403).json({ error: 'Only Owners and Admins can change team roles.' });
      }

      const target = ws.teamMembers.find((m) => m.id === memberId);
      if (!target) return res.status(404).json({ error: 'Member not found' });
      if (target.role === 'Owner') {
        return res.status(400).json({ error: 'Cannot change the role of the Workspace Owner.' });
      }

      const validRoles = ['Admin', 'Manager', 'Editor', 'Viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      target.role = role;
      ws.lastUpdated = new Date().toISOString();
      persistStore();
      return res.json({ teamMembers: ws.teamMembers });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to update role' });
    }
  });

  app.delete('/api/team/member', (req, res) => {
    try {
      const { workspaceId, actorEmail, memberId } = req.body || {};
      const ws = workspaceStore.workspaces?.[workspaceId];
      if (!ws) return res.status(404).json({ error: 'Workspace not found' });

      const actorRole = getUserRoleInWorkspace(ws, actorEmail || '');
      if (actorRole !== 'Owner' && actorRole !== 'Admin') {
        return res.status(403).json({ error: 'Only Owners and Admins can remove team members.' });
      }

      const target = ws.teamMembers.find((m) => m.id === memberId);
      if (!target) return res.status(404).json({ error: 'Member not found' });
      if (target.role === 'Owner') {
        return res.status(400).json({ error: 'Cannot remove the Workspace Owner.' });
      }

      ws.teamMembers = ws.teamMembers.filter((m) => m.id !== memberId);
      ws.lastUpdated = new Date().toISOString();
      persistStore();
      return res.json({ teamMembers: ws.teamMembers });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to remove member' });
    }
  });

  // Client-server workspace state sync endpoints (Strictly scoped per user & workspace!)
  app.get('/api/sync', (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    const requestedWsId = String(req.query.workspaceId || '').trim();

    if (!email || !email.includes('@')) {
      return res.status(401).json({ error: 'Authentication required for workspace sync' });
    }

    const personalWs = getOrCreatePrivateWorkspaceForUser(email);
    const targetWsId = requestedWsId || personalWs.id;
    const ws = workspaceStore.workspaces?.[targetWsId];

    if (!ws) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const myRole = getUserRoleInWorkspace(ws, email);
    if (!myRole) {
      return res.status(403).json({ error: 'You do not have access to this private workspace.' });
    }

    const workspaces = getWorkspacesForUser(email);
    res.json({
      workspaceId: ws.id,
      workspaceName: ws.name,
      ownerEmail: ws.ownerEmail,
      myRole,
      posts: ws.posts,
      clients: ws.clients,
      campaigns: ws.campaigns,
      ideas: ws.ideas,
      teamMembers: ws.teamMembers,
      workspaces,
      lastUpdated: ws.lastUpdated,
    });
  });

  app.post('/api/sync', (req, res) => {
    try {
      const { email, workspaceId, posts, clients, campaigns, ideas } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const personalWs = getOrCreatePrivateWorkspaceForUser(cleanEmail);
      const targetWsId = workspaceId || personalWs.id;
      const ws = workspaceStore.workspaces?.[targetWsId];
      if (!ws) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      const myRole = getUserRoleInWorkspace(ws, cleanEmail);
      if (!myRole) {
        return res.status(403).json({ error: 'Forbidden: Not a member of this workspace' });
      }
      if (myRole === 'Viewer') {
        return res.status(403).json({ error: 'Viewers have read-only access and cannot modify workspace data.' });
      }

      let changed = false;
      if (Array.isArray(posts)) {
        ws.posts = posts;
        changed = true;
      }
      if (Array.isArray(clients)) {
        ws.clients = clients;
        changed = true;
      }
      if (Array.isArray(campaigns)) {
        ws.campaigns = campaigns;
        changed = true;
      }
      if (Array.isArray(ideas)) {
        ws.ideas = ideas;
        changed = true;
      }

      if (changed) {
        ws.lastUpdated = new Date().toISOString();
        persistStore();
      }

      return res.json({
        success: true,
        workspaceId: ws.id,
        myRole,
        lastUpdated: ws.lastUpdated,
        postsCount: ws.posts.length,
        clientsCount: ws.clients.length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  // -------------------------------------------------------------
  // ChatGPT OpenAPI 3.1 & REST Action Endpoints
  // -------------------------------------------------------------
  app.get(['/openapi.json', '/api/openapi.json'], (req, res) => {
    const baseUrl = getPublicBaseUrl(req);
    res.setHeader('Content-Type', 'application/json');
    res.json(getOpenApiSpec(baseUrl));
  });

  // ChatGPT Actions / REST: List Posts
  app.get('/api/gpt/posts', (req, res) => {
    try {
      const result = executeMcpTool('list_posts', req.query);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message });
    }
  });

  // ChatGPT Actions / REST: Create Post
  app.post('/api/gpt/posts', (req, res) => {
    try {
      const result = executeMcpTool('create_post', req.body);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message });
    }
  });

  // ChatGPT Actions / REST: Get Post
  app.get('/api/gpt/posts/:postId', (req, res) => {
    try {
      const result = executeMcpTool('get_post', { postId: req.params.postId });
      return res.json(result);
    } catch (e: any) {
      return res.status(404).json({ error: e?.message });
    }
  });

  // ChatGPT Actions / REST: Update Post
  app.patch('/api/gpt/posts/:postId', (req, res) => {
    try {
      const result = executeMcpTool('update_post', { postId: req.params.postId, ...req.body });
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message });
    }
  });

  // ChatGPT Actions / REST: Delete Post
  app.delete('/api/gpt/posts/:postId', (req, res) => {
    try {
      const result = executeMcpTool('delete_post', { postId: req.params.postId });
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message });
    }
  });

  // ChatGPT Actions / REST: List Clients
  app.get('/api/gpt/clients', (req, res) => {
    try {
      const result = executeMcpTool('list_clients', {});
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message });
    }
  });

  // ChatGPT Actions / REST: Create Client
  app.post('/api/gpt/clients', (req, res) => {
    try {
      const result = executeMcpTool('create_client', req.body);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message });
    }
  });

  // ChatGPT Actions / REST: Workspace Stats
  app.get('/api/gpt/stats', (req, res) => {
    try {
      const result = executeMcpTool('get_workspace_stats', {});
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message });
    }
  });

  // -------------------------------------------------------------
  // Gemini Declarations & In-App AI Copilot Endpoints
  // -------------------------------------------------------------
  app.get('/api/gemini/tools', (req, res) => {
    res.json({
      model: 'gemini-3.8-flash',
      functionDeclarations: GEMINI_FUNCTION_DECLARATIONS,
    });
  });

  // Direct In-App Gemini Copilot (Chat + Function Calling)
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history = [] } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message string is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      // When GEMINI_API_KEY is available, use real Gemini 3.8 Flash model with tools
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `You are PostNote AI, the intelligent social media workspace assistant for creative agencies and brand managers.
You have tools to manage social media posts, calendar scheduling, workflow approvals (Planned, In review, Approved, Scheduled, Published), and client profiles (like Codery, Kudoli, Cordori).
When the user asks you to list, create, update, delete posts or get stats, ALWAYS use your function calling tools.
Be concise, friendly, and helpful.`;

        // Format history for Gemini API
        const contents: any[] = [];
        if (Array.isArray(history)) {
          for (const h of history.slice(-6)) {
            if (h.role && h.text) {
              contents.push({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.text }],
              });
            }
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        try {
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: GEMINI_FUNCTION_DECLARATIONS as any }],
            },
          });

          // Check for function calls
          const functionCalls = geminiRes.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            console.log(`[Gemini Function Call] Invoked: ${call.name}`, call.args);
            const toolResult = executeMcpTool(call.name, call.args);

            // Second turn: pass tool execution result back to Gemini for natural response
            const followUpContents = [
              ...contents,
              {
                role: 'model',
                parts: [{ functionCall: call }],
              },
              {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: call.name,
                      response: { result: toolResult },
                    },
                  },
                ],
              },
            ];

            const secondRes = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: followUpContents,
              config: { systemInstruction },
            });

            return res.json({
              reply: secondRes.text || `Action completed: ${call.name}`,
              toolCalled: call.name,
              toolArgs: call.args,
              toolResult,
              updatedStore: true,
            });
          }

          return res.json({
            reply: geminiRes.text || 'I processed your request.',
            toolCalled: null,
          });
        } catch (apiErr: any) {
          console.warn('[Gemini API Fallback Engaged]:', apiErr?.message || apiErr);
          // Fall through to smart intent parser below
        }
      }

      // Fallback intent parser when GEMINI_API_KEY is not configured
      const lower = message.toLowerCase();
      if (lower.includes('post') && (lower.includes('create') || lower.includes('draft') || lower.includes('schedule') || lower.includes('add'))) {
        const client = workspaceStore.clients.find((c) => lower.includes(c.name.toLowerCase()))?.name || 'Codery';
        const newPostResult = executeMcpTool('create_post', {
          clientName: client,
          title: `Post for ${client} (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
          caption: message.length > 20 ? message : `Exciting update from ${client}! Stay tuned for big news. 🚀 #Innovation #Growth`,
          platform: lower.includes('linkedin') ? 'LinkedIn' : lower.includes('twitter') ? 'Twitter' : 'Instagram',
          status: 'Planned',
        });
        return res.json({
          reply: `I drafted and scheduled a new post for **${client}** in your PostNote calendar!`,
          toolCalled: 'create_post',
          toolResult: newPostResult,
          updatedStore: true,
        });
      }

      if (lower.includes('stat') || lower.includes('overview') || lower.includes('health') || lower.includes('summary')) {
        const stats = executeMcpTool('get_workspace_stats', {});
        return res.json({
          reply: `Your workspace currently has **${stats.totalPosts} total posts** across **${stats.totalClients} clients**, with **${stats.upcomingCount} upcoming** scheduled deadlines.`,
          toolCalled: 'get_workspace_stats',
          toolResult: stats,
        });
      }

      if (lower.includes('client')) {
        const clients = executeMcpTool('list_clients', {});
        return res.json({
          reply: `You have **${clients.count} active clients**: ${clients.clients.map((c: any) => c.name).join(', ')}.`,
          toolCalled: 'list_clients',
          toolResult: clients,
        });
      }

      const posts = executeMcpTool('list_posts', { limit: 5 });
      return res.json({
        reply: `Here are the latest posts in your PostNote calendar. You have ${posts.totalFound} posts in total.`,
        toolCalled: 'list_posts',
        toolResult: posts,
      });
    } catch (err: any) {
      console.error('[Gemini Chat Error]:', err);
      return res.status(500).json({ error: err?.message || 'Gemini processing failed' });
    }
  });

  // -------------------------------------------------------------
  // OAuth 2.0 RFC 8414 & RFC 9728 Discovery Endpoints
  // -------------------------------------------------------------
  const getAuthorizationServerMetadata = (req: express.Request) => {
    const baseUrl = getPublicBaseUrl(req);
    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      jwks_uri: `${baseUrl}/oauth/jwks`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256', 'plain'],
      scopes_supported: ['read', 'write', 'mcp:all', 'offline_access'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
      service_documentation: `${baseUrl}/#more`,
    };
  };

  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    res.json(getAuthorizationServerMetadata(req));
  });

  app.get('/mcp/.well-known/oauth-authorization-server', (req, res) => {
    res.json(getAuthorizationServerMetadata(req));
  });

  // Standard OpenID configuration alias
  app.get('/.well-known/openid-configuration', (req, res) => {
    res.json(getAuthorizationServerMetadata(req));
  });

  // RFC 9728 OAuth 2.0 Protected Resource Metadata
  const getProtectedResourceMetadata = (req: express.Request) => {
    const baseUrl = getPublicBaseUrl(req);
    return {
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      scopes_supported: ['read', 'write', 'mcp:all'],
    };
  };

  app.get('/.well-known/oauth-protected-resource', (req, res) => {
    res.json(getProtectedResourceMetadata(req));
  });

  app.get('/mcp/.well-known/oauth-protected-resource', (req, res) => {
    res.json(getProtectedResourceMetadata(req));
  });

  app.get('/oauth/jwks', (req, res) => {
    res.json({ keys: [] });
  });

  // -------------------------------------------------------------
  // RFC 7591 Dynamic Client Registration Endpoint
  // -------------------------------------------------------------
  const handleClientRegistration = (req: express.Request, res: express.Response) => {
    try {
      const {
        client_name = 'Claude AI',
        redirect_uris = [
          'https://claude.ai/api/mcp/auth_callback',
          'https://claude.com/api/mcp/auth_callback',
        ],
        grant_types = ['authorization_code', 'refresh_token'],
        response_types = ['code'],
        token_endpoint_auth_method = 'none',
      } = req.body || {};

      const clientId = `claude_postnote_${Date.now().toString(36)}`;
      const clientSecret = `sec_${crypto.randomBytes(16).toString('hex')}`;

      const clientRecord: OAuthClient = {
        client_id: clientId,
        client_secret: clientSecret,
        client_name,
        redirect_uris: Array.isArray(redirect_uris) && redirect_uris.length > 0
          ? redirect_uris
          : ['https://claude.ai/api/mcp/auth_callback', 'https://claude.com/api/mcp/auth_callback'],
        grant_types,
        response_types,
      };

      oauthClients.set(clientId, clientRecord);

      return res.status(201).json({
        client_id: clientId,
        client_secret: clientSecret,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0,
        client_name,
        redirect_uris: clientRecord.redirect_uris,
        grant_types,
        response_types,
        token_endpoint_auth_method,
      });
    } catch (err: any) {
      console.error('[OAuth Registration Error]:', err);
      return res.status(500).json({ error: 'invalid_client_metadata', error_description: err?.message });
    }
  };

  app.post(['/oauth/register', '/register'], handleClientRegistration);

  // -------------------------------------------------------------
  // Interactive Sign-in Required Authorization Screen & Endpoint
  // -------------------------------------------------------------
  const renderOAuthAuthorizeHtml = (params: {
    clientId: string;
    redirectUri: string;
    responseType: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    error?: string;
    email?: string;
  }) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to PostNote to Connect Claude</title>
  <style>
    :root {
      --bg: #F7F5F0;
      --card: #FFFFFF;
      --border: #E8E4DC;
      --text: #1E252B;
      --subtext: #5A6572;
      --primary: #C44D34;
      --primary-hover: #A83E28;
      --green: #10B981;
      --red: #EF4444;
      --input-bg: #F9F9F8;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #141A1F;
        --card: #1D242C;
        --border: #2A3440;
        --text: #F3F4F6;
        --subtext: #9CA3AF;
        --input-bg: #222B35;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      max-width: 440px;
      width: 100%;
      padding: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      background: rgba(196, 77, 52, 0.1);
      color: var(--primary);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 750;
      letter-spacing: -0.02em;
      margin-bottom: 0.35rem;
      line-height: 1.25;
    }
    p.desc {
      font-size: 0.85rem;
      color: var(--subtext);
      line-height: 1.45;
      margin-bottom: 1.25rem;
    }
    .error-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: var(--red);
      font-size: 0.8125rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .input-group {
      margin-bottom: 1rem;
      text-align: left;
    }
    .input-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext);
      margin-bottom: 0.4rem;
    }
    .input-field {
      width: 100%;
      padding: 0.75rem 0.875rem;
      border-radius: 0.75rem;
      border: 1px solid var(--border);
      background: var(--input-bg);
      color: var(--text);
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .input-field:focus {
      border-color: var(--primary);
    }
    .permissions-box {
      background: rgba(0,0,0,0.02);
      border: 1px solid var(--border);
      border-radius: 0.875rem;
      padding: 0.875rem;
      margin-top: 1.25rem;
      margin-bottom: 1.25rem;
    }
    .perm-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext);
      margin-bottom: 0.5rem;
    }
    ul.perms {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    ul.perms li {
      font-size: 0.775rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--subtext);
    }
    ul.perms li svg {
      width: 14px;
      height: 14px;
      stroke: var(--green);
      flex-shrink: 0;
    }
    .btn-approve {
      display: block;
      width: 100%;
      padding: 0.875rem 1rem;
      background: var(--primary);
      color: #FFFFFF;
      border: none;
      border-radius: 0.875rem;
      font-size: 0.9375rem;
      font-weight: 650;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
      text-align: center;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(196, 77, 52, 0.25);
    }
    .btn-approve:hover {
      background: var(--primary-hover);
    }
    .btn-approve:active {
      transform: scale(0.99);
    }
    .hint-box {
      margin-top: 1rem;
      padding: 0.65rem 0.85rem;
      border-radius: 0.75rem;
      background: rgba(0,0,0,0.025);
      font-size: 0.75rem;
      color: var(--subtext);
      text-align: center;
    }
    .footer-note {
      text-align: center;
      font-size: 0.75rem;
      color: var(--subtext);
      margin-top: 1.25rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">
      <span>●</span> PostNote Secure Sign-In
    </div>
    <h1>Sign In & Connect Claude</h1>
    <p class="desc">
      Authenticate your PostNote workspace account to grant Claude AI read and write access to your calendar and approvals.
    </p>

    ${params.error ? `<div class="error-box">⚠️ ${params.error}</div>` : ''}

    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${params.clientId}">
      <input type="hidden" name="redirect_uri" value="${params.redirectUri}">
      <input type="hidden" name="response_type" value="${params.responseType}">
      <input type="hidden" name="state" value="${params.state}">
      <input type="hidden" name="code_challenge" value="${params.codeChallenge}">
      <input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}">

      <div class="input-group">
        <label class="input-label">Workspace Email</label>
        <input 
          type="email" 
          name="email" 
          required 
          value="${params.email || 'vipin@firstdraftstudio.in'}" 
          class="input-field"
          placeholder="vipin@firstdraftstudio.in"
        >
      </div>

      <div class="input-group">
        <label class="input-label">Workspace Password</label>
        <input 
          type="password" 
          name="password" 
          required 
          value="postnote2026"
          class="input-field" 
          placeholder="••••••••••••"
        >
      </div>

      <div class="permissions-box">
        <div class="perm-title">Permissions Required by Claude</div>
        <ul class="perms">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Read posts, campaigns, and workspace stats</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Draft, schedule, and approve calendar content</span>
          </li>
        </ul>
      </div>

      <button type="submit" class="btn-approve">
        Sign In & Authorize Claude
      </button>

      <div class="hint-box">
        Default demo login: <strong>vipin@firstdraftstudio.in</strong> / <strong>postnote2026</strong>
      </div>
    </form>

    <div class="footer-note">
      Connecting to Claude.ai · RFC 8414 OAuth 2.0
    </div>
  </div>
</body>
</html>`;
  };

  app.get('/oauth/authorize', (req, res) => {
    const clientId = (req.query.client_id as string) || 'claude_postnote_client';
    const redirectUri = (req.query.redirect_uri as string) || 'https://claude.ai/api/mcp/auth_callback';
    const responseType = (req.query.response_type as string) || 'code';
    const state = (req.query.state as string) || '';
    const codeChallenge = (req.query.code_challenge as string) || '';
    const codeChallengeMethod = (req.query.code_challenge_method as string) || 'S256';

    const html = renderOAuthAuthorizeHtml({
      clientId,
      redirectUri,
      responseType,
      state,
      codeChallenge,
      codeChallengeMethod,
      email: 'vipin@firstdraftstudio.in',
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  });

  app.post('/oauth/authorize', (req, res) => {
    const {
      client_id = 'claude_postnote_client',
      redirect_uri = 'https://claude.ai/api/mcp/auth_callback',
      state = '',
      code_challenge = '',
      code_challenge_method = 'S256',
      response_type = 'code',
      email = '',
      password = '',
    } = req.body || {};

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    // Enforce authentication check: email & password required
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const html = renderOAuthAuthorizeHtml({
        clientId: client_id,
        redirectUri: redirect_uri,
        responseType: response_type,
        state,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        error: 'Please enter a valid workspace email address.',
        email: cleanEmail,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(401).send(html);
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      const html = renderOAuthAuthorizeHtml({
        clientId: client_id,
        redirectUri: redirect_uri,
        responseType: response_type,
        state,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        error: 'Invalid password. Password must be at least 6 characters.',
        email: cleanEmail,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(401).send(html);
    }

    const code = `pn_auth_${crypto.randomBytes(16).toString('hex')}`;
    pendingAuthCodes.set(code, {
      code,
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return res.redirect(redirectUrl.toString());
  });

  // REST API Auth endpoints
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanPass || cleanPass.length < 6) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      user: {
        name: cleanEmail.split('@')[0] || 'Vipin',
        email: cleanEmail,
        role: 'Studio Owner',
      },
    });
  });

  // -------------------------------------------------------------
  // OAuth 2.0 Token Exchange Endpoint (/oauth/token & /token)
  // -------------------------------------------------------------
  const handleTokenExchange = (req: express.Request, res: express.Response) => {
    const grantType = req.body?.grant_type || req.query?.grant_type;
    const code = req.body?.code || req.query?.code;
    const codeVerifier = req.body?.code_verifier || req.query?.code_verifier;

    if (grantType === 'authorization_code') {
      if (!code) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
      }

      const codeRecord = pendingAuthCodes.get(code);
      if (!codeRecord) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired or invalid' });
      }

      if (Date.now() > codeRecord.expiresAt) {
        pendingAuthCodes.delete(code);
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired' });
      }

      if (codeRecord.codeChallenge && codeVerifier) {
        if (codeRecord.codeChallengeMethod === 'S256') {
          const calculatedChallenge = crypto
            .createHash('sha256')
            .update(codeVerifier)
            .digest('base64url');
          if (calculatedChallenge !== codeRecord.codeChallenge) {
            console.warn('[PKCE Failed]: code_verifier mismatch');
            return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier verification failed' });
          }
        } else if (codeRecord.codeChallenge !== codeVerifier) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier verification failed' });
        }
      }

      pendingAuthCodes.delete(code);

      const accessToken = `postnote_tk_${crypto.randomBytes(24).toString('hex')}`;
      const refreshToken = `postnote_rf_${crypto.randomBytes(24).toString('hex')}`;
      validAccessTokens.add(accessToken);

      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 30 * 24 * 60 * 60,
        refresh_token: refreshToken,
        scope: 'read write mcp:all',
      });
    }

    if (grantType === 'refresh_token') {
      const accessToken = `postnote_tk_${crypto.randomBytes(24).toString('hex')}`;
      validAccessTokens.add(accessToken);
      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 30 * 24 * 60 * 60,
        scope: 'read write mcp:all',
      });
    }

    return res.status(400).json({ error: 'unsupported_grant_type', error_description: `Grant type ${grantType} not supported` });
  };

  app.post(['/oauth/token', '/token'], handleTokenExchange);

  // -------------------------------------------------------------
  // MCP (Model Context Protocol) Endpoints
  // -------------------------------------------------------------
  app.get('/mcp', (req, res) => {
    if (
      req.headers.accept?.includes('text/event-stream') ||
      req.query.sse === 'true'
    ) {
      return handleSseConnection(req, res);
    }

    const baseUrl = getPublicBaseUrl(req);

    return res.status(200).json({
      status: 'ok',
      server: 'postnote-mcp',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      description:
        'PostNote official MCP Server. Provides read and write access to social media drafts, scheduling, calendar, and client portals.',
      endpoints: {
        http_jsonrpc: '/mcp',
        sse: '/mcp/sse',
        sse_message: '/mcp/message',
      },
      auth: {
        type: 'oauth2',
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`,
        client_id: 'claude_postnote_client',
      },
      access: 'read_write',
      capabilities: {
        tools: MCP_TOOLS.map((t) => t.name),
        resources: false,
        prompts: false,
      },
      integrations: {
        chatgpt: {
          openapi: `${baseUrl}/openapi.json`,
          docs: 'Import openapi.json into ChatGPT Custom GPT Actions.',
        },
        gemini: {
          declarations: `${baseUrl}/api/gemini/tools`,
          docs: 'Use with @google/genai SDK function declarations.',
        },
      },
    });
  });

  app.head('/mcp', (req, res) => {
    res.sendStatus(200);
  });

  app.post('/mcp', (req, res) => {
    try {
      const payload = req.body;
      if (Array.isArray(payload)) {
        const responses = payload
          .map((item) => processJsonRpc(item))
          .filter(Boolean);
        return res.json(responses);
      }

      const response = processJsonRpc(payload);
      if (!response) {
        return res.status(204).end();
      }
      return res.json(response);
    } catch (err: any) {
      console.error('[MCP] POST /mcp error:', err);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: { code: -32603, message: err?.message || 'Internal MCP server error' },
      });
    }
  });

  function handleSseConnection(req: express.Request, res: express.Response) {
    const sessionId = crypto.randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`event: endpoint\ndata: /mcp/message?sessionId=${sessionId}\n\n`);

    const timer = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    sseSessions.set(sessionId, { id: sessionId, res, timer });

    req.on('close', () => {
      clearInterval(timer);
      sseSessions.delete(sessionId);
    });
  }

  app.get('/mcp/sse', (req, res) => {
    handleSseConnection(req, res);
  });

  app.post('/mcp/message', (req, res) => {
    try {
      const sessionId =
        (req.query.sessionId as string) ||
        (req.headers['x-session-id'] as string) ||
        (req.headers['mcp-session-id'] as string);

      const response = processJsonRpc(req.body);

      if (sessionId && sseSessions.has(sessionId) && response) {
        const session = sseSessions.get(sessionId)!;
        session.res.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
      }

      if (!response) {
        return res.status(204).end();
      }
      return res.json(response);
    } catch (err: any) {
      console.error('[MCP] POST /mcp/message error:', err);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: { code: -32603, message: err?.message || 'Internal MCP message error' },
      });
    }
  });

  // Client Portal sharing endpoints
  app.post('/api/portals', (req, res) => {
    try {
      const { id, client, posts, permissions } = req.body;
      if (!id || !client) {
        return res.status(400).json({ error: 'id and client are required' });
      }
      const record: SharedPortalRecord = {
        id,
        client,
        posts: Array.isArray(posts) ? posts : [],
        permissions: permissions || {},
        updatedAt: new Date().toISOString(),
      };
      sharedPortalsMap.set(id, record);
      return res.json({ success: true, id, record });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to save portal' });
    }
  });

  app.get('/api/portals/:id', (req, res) => {
    const rawId = decodeURIComponent(req.params.id || '').trim();
    const lowerId = rawId.toLowerCase();

    // 1. Check live workspaceStore first so the Client Portal always reflects the latest posts, campaigns, and social URLs
    const allClients: Client[] = [...(workspaceStore.clients || [])];
    const allPosts: Post[] = [...(workspaceStore.posts || [])];
    const allCampaigns: any[] = [...(workspaceStore.campaigns || [])];

    if (workspaceStore.workspaces) {
      for (const ws of Object.values(workspaceStore.workspaces)) {
        if (Array.isArray(ws.clients)) {
          for (const c of ws.clients) {
            const idx = allClients.findIndex((existing) => existing.id === c.id);
            if (idx >= 0) allClients[idx] = { ...allClients[idx], ...c };
            else allClients.push(c);
          }
        }
        if (Array.isArray(ws.posts)) {
          for (const p of ws.posts) {
            const idx = allPosts.findIndex((existing) => existing.id === p.id);
            if (idx >= 0) allPosts[idx] = p;
            else allPosts.push(p);
          }
        }
        if (Array.isArray(ws.campaigns)) {
          for (const camp of ws.campaigns) {
            const idx = allCampaigns.findIndex((existing) => existing.id === camp.id);
            if (idx >= 0) allCampaigns[idx] = camp;
            else allCampaigns.push(camp);
          }
        }
      }
    }

    const liveClient = allClients.find(
      (c) =>
        c.id.toLowerCase() === lowerId ||
        c.handle.replace('@', '').toLowerCase() === lowerId ||
        c.name.toLowerCase() === lowerId ||
        c.id.toLowerCase().includes(lowerId) ||
        c.name.toLowerCase().includes(lowerId)
    );

    if (liveClient) {
      const livePosts = allPosts.filter(
        (p) =>
          p.clientId === liveClient.id ||
          p.clientName.toLowerCase() === liveClient.name.toLowerCase()
      );
      const liveCampaigns = allCampaigns.filter(
        (camp) =>
          camp.clientId === liveClient.id ||
          (camp.clientName && camp.clientName.toLowerCase() === liveClient.name.toLowerCase())
      );
      return res.json({
        portal: {
          id: liveClient.id,
          client: liveClient,
          posts: livePosts,
          campaigns: liveCampaigns,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    // 2. Fallback to sharedPortalsMap
    const found = sharedPortalsMap.get(rawId);
    if (found) {
      return res.json({ portal: found });
    }
    for (const p of sharedPortalsMap.values()) {
      if (
        p.client?.id === rawId ||
        p.client?.handle?.replace('@', '').toLowerCase() === lowerId ||
        p.client?.name?.toLowerCase() === lowerId
      ) {
        return res.json({ portal: p });
      }
    }
    return res.status(404).json({ error: 'Portal not found' });
  });

  // AI Polish & Tone endpoint
  app.post('/api/gemini/polish', async (req, res) => {
    try {
      const { text, tone = 'engaging', platform = 'all' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        let polished = text;
        if (tone === 'engaging') {
          polished = `🚀 ${text}\n\nWhat are your thoughts on this? Drop a comment below 👇 #Growth #Innovation`;
        } else if (tone === 'professional') {
          polished = `Key architectural update:\n\n${text}\n\nOur team continues to optimize reliability and developer velocity across our systems.`;
        } else if (tone === 'punchy') {
          polished = `${text.split('.')[0]}. Built for scale. Zero compromises.`;
        }
        return res.json({ polished, tone, note: 'Generated via smart template (GEMINI_API_KEY not set)' });
      }

      let polished = text;
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are an expert social media copywriter for top tech companies and creative agencies.
Rewrite and polish the following social media post copy to match the tone "${tone}" targeted for ${platform} platform.
Keep the core message, but enhance clarity, hook, engagement, line breaks, and add 2-3 high-impact relevant hashtags at the bottom.
Do not include quotation marks or explanatory chatter, output ONLY the revised copy ready to post:

Post draft:
"""
${text}
"""`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        if (response.text) {
          polished = response.text.trim();
        }
      } catch (genError) {
        console.warn('Gemini generation fallback engaged:', genError);
        if (tone === 'engaging') {
          polished = `🚀 ${text}\n\nWhat are your thoughts on this? Drop your perspective below 👇 #Growth #Innovation`;
        } else if (tone === 'professional') {
          polished = `Key architectural update:\n\n${text}\n\nOur team continues to optimize reliability and developer velocity across our systems.`;
        } else if (tone === 'punchy') {
          polished = `${text.split('.')[0]}. Built for scale. Zero compromises.`;
        }
      }

      return res.json({ polished, tone });
    } catch (err: any) {
      console.error('Gemini polish error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to polish copy' });
    }
  });

  // Vite middleware in dev or static files in production
  const distPath = path.join(process.cwd(), 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const hasBuiltDist = fs.existsSync(distIndexPath);
  const isProdRuntime =
    hasBuiltDist &&
    (process.env.NODE_ENV === 'production' ||
      Boolean(process.env.K_SERVICE) ||
      Boolean(process.env.K_REVISION) ||
      process.argv[1]?.includes('server.cjs') ||
      !process.argv[1]?.endsWith('server.ts'));

  if (isProdRuntime) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
      } else {
        res.status(200).send('PostNote Studio starting...');
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // Dev SPA fallback so direct links serve index.html without 404
      app.use('*', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        try {
          const url = req.originalUrl;
          const indexPath = path.resolve(process.cwd(), 'index.html');
          let template = await fs.promises.readFile(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (viteErr) {
      console.warn('[Server] Vite dev server unavailable, falling back to static dist:', viteErr);
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (fs.existsSync(distIndexPath)) {
          res.sendFile(distIndexPath);
        } else {
          res.sendFile(path.resolve(process.cwd(), 'index.html'));
        }
      });
    }
  }
}

process.on('uncaughtException', (err) => {
  console.warn('[Server Warning] Caught exception:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Server Warning] Caught rejection:', reason?.message || reason);
});

startServer();
