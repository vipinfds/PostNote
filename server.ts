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

// Workspace data interface
interface WorkspaceStore {
  posts: Post[];
  clients: Client[];
  campaigns: any[];
  ideas: any[];
  lastUpdated: string;
}

// In-memory workspace state initialized from disk or defaults
let workspaceStore: WorkspaceStore = {
  posts: [...INITIAL_POSTS],
  clients: [...INITIAL_CLIENTS],
  campaigns: [...INITIAL_CAMPAIGNS],
  ideas: [...INITIAL_IDEAS],
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

function persistStore() {
  try {
    workspaceStore.lastUpdated = new Date().toISOString();
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

function startCloudTunnel() {
  const binaryPath = path.resolve(process.cwd(), 'bin/cloudflared');
  if (!fs.existsSync(binaryPath)) {
    console.warn('[Tunnel] cloudflared binary not found at', binaryPath);
    return;
  }

  try {
    if (tunnelProcess) {
      try {
        tunnelProcess.kill();
      } catch {}
      tunnelProcess = null;
    }

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
        console.log(`[Tunnel Active] Public Claude & ChatGPT Cloud URL: ${publicTunnelUrl}`);
      }
    };

    child.stdout.on('data', parseOutput);
    child.stderr.on('data', parseOutput);

    child.on('close', (code) => {
      console.log(`[Tunnel] exited with code ${code}`);
      publicTunnelUrl = null;
      setTimeout(() => {
        if (!publicTunnelUrl) {
          startCloudTunnel();
        }
      }, 5000);
    });
  } catch (err) {
    console.error('[Tunnel] Failed to spawn cloudflared:', err);
  }
}

// Generate public base URL respecting cloud proxies & public tunnel
function getPublicBaseUrl(req: express.Request): string {
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
  const PORT = 3000;

  // Global permissive CORS headers for Claude browser connections and external tools
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-session-id, Accept, Origin, User-Agent, mcp-session-id, cache-control, WWW-Authenticate'
    );
    res.header('Access-Control-Expose-Headers', '*');
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
    res.json({
      publicUrl: publicTunnelUrl,
      status: publicTunnelUrl ? 'active' : 'starting',
      mcpUrl: publicTunnelUrl ? `${publicTunnelUrl}/mcp` : null,
      openapiUrl: publicTunnelUrl ? `${publicTunnelUrl}/openapi.json` : null,
      oauthAuthorizeUrl: publicTunnelUrl ? `${publicTunnelUrl}/oauth/authorize` : null,
      oauthTokenUrl: publicTunnelUrl ? `${publicTunnelUrl}/oauth/token` : null,
    });
  });

  app.post('/api/tunnel/restart', (req, res) => {
    startCloudTunnel();
    res.json({ message: 'Tunnel restart initiated' });
  });

  // Client-server workspace state sync endpoints
  app.get('/api/sync', (req, res) => {
    res.json({
      posts: workspaceStore.posts,
      clients: workspaceStore.clients,
      campaigns: workspaceStore.campaigns,
      ideas: workspaceStore.ideas,
      lastUpdated: workspaceStore.lastUpdated,
    });
  });

  app.post('/api/sync', (req, res) => {
    try {
      const { posts, clients, campaigns, ideas } = req.body;
      let changed = false;

      if (Array.isArray(posts) && posts.length > 0) {
        workspaceStore.posts = posts;
        changed = true;
      }
      if (Array.isArray(clients) && clients.length > 0) {
        workspaceStore.clients = clients;
        changed = true;
      }
      if (Array.isArray(campaigns)) {
        workspaceStore.campaigns = campaigns;
      }
      if (Array.isArray(ideas)) {
        workspaceStore.ideas = ideas;
      }

      if (changed) {
        persistStore();
      }

      return res.json({
        success: true,
        lastUpdated: workspaceStore.lastUpdated,
        postsCount: workspaceStore.posts.length,
        clientsCount: workspaceStore.clients.length,
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
      model: 'gemini-3.1-flash-lite',
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
            model: 'gemini-3.1-flash-lite',
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
              model: 'gemini-3.1-flash-lite',
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
  // Interactive 1-Click Authorization Screen & Endpoint
  // -------------------------------------------------------------
  app.get('/oauth/authorize', (req, res) => {
    const clientId = (req.query.client_id as string) || 'claude_postnote_client';
    const redirectUri = (req.query.redirect_uri as string) || 'https://claude.ai/api/mcp/auth_callback';
    const responseType = req.query.response_type as string;
    const state = (req.query.state as string) || '';
    const codeChallenge = req.query.code_challenge as string;
    const codeChallengeMethod = (req.query.code_challenge_method as string) || 'S256';
    const auto = req.query.auto === 'true' || req.query.action === 'approve';

    if (auto) {
      const code = `pn_auth_${crypto.randomBytes(16).toString('hex')}`;
      pendingAuthCodes.set(code, {
        code,
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (state) redirectUrl.searchParams.set('state', state);

      return res.redirect(redirectUrl.toString());
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect Claude AI to PostNote</title>
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
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #141A1F;
        --card: #1D242C;
        --border: #2A3440;
        --text: #F3F4F6;
        --subtext: #9CA3AF;
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
      font-size: 1.4rem;
      font-weight: 750;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      line-height: 1.25;
    }
    p.desc {
      font-size: 0.875rem;
      color: var(--subtext);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .permissions-box {
      background: rgba(0,0,0,0.02);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1rem;
      margin-bottom: 1.75rem;
    }
    .perm-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext);
      margin-bottom: 0.65rem;
    }
    ul.perms {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    ul.perms li {
      font-size: 0.8125rem;
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      line-height: 1.4;
    }
    ul.perms li svg {
      width: 16px;
      height: 16px;
      stroke: var(--green);
      flex-shrink: 0;
      margin-top: 1px;
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
    }
    .btn-approve:hover {
      background: var(--primary-hover);
    }
    .btn-approve:active {
      transform: scale(0.99);
    }
    .footer-note {
      text-align: center;
      font-size: 0.75rem;
      color: var(--subtext);
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">
      <span>●</span> PostNote Connect
    </div>
    <h1>Connect Claude AI</h1>
    <p class="desc">
      Grant Claude full read and write permissions to manage your social media calendar, drafts, and client approvals.
    </p>

    <div class="permissions-box">
      <div class="perm-title">Permissions Granted</div>
      <ul class="perms">
        <li>
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span><strong>Read access:</strong> Query scheduled posts, campaigns, client guidelines, and metrics.</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span><strong>Write access:</strong> Draft, schedule, and update social posts directly in your calendar.</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span><strong>Workflow controls:</strong> Move posts across review and approval stages.</span>
        </li>
      </ul>
    </div>

    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="response_type" value="${responseType || 'code'}">
      <input type="hidden" name="state" value="${state}">
      <input type="hidden" name="code_challenge" value="${codeChallenge || ''}">
      <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
      
      <button type="submit" class="btn-approve">
        Approve & Connect Claude
      </button>
    </form>

    <div class="footer-note">
      Connecting to ${redirectUri.includes('claude.ai') ? 'Claude.ai' : redirectUri}
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  });

  app.post('/oauth/authorize', (req, res) => {
    const {
      client_id = 'claude_postnote_client',
      redirect_uri = 'https://claude.ai/api/mcp/auth_callback',
      state = '',
      code_challenge,
      code_challenge_method = 'S256',
    } = req.body || {};

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
    const id = req.params.id;
    const found = sharedPortalsMap.get(id);
    if (found) {
      return res.json({ portal: found });
    }
    for (const p of sharedPortalsMap.values()) {
      if (
        p.client?.id === id ||
        p.client?.handle?.replace('@', '').toLowerCase() === id.toLowerCase() ||
        p.client?.name?.toLowerCase() === id.toLowerCase()
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

        const generate = (model: string) => ai.models.generateContent({ model, contents: prompt });

        let response;
        try {
          response = await generate('gemini-3.1-flash-lite');
        } catch (retryableError: any) {
          const status = retryableError?.status;
          if (status === 503 || status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            // A different model can still respond when the primary is overloaded.
            response = await generate(status === 503 ? 'gemini-3.5-flash-lite' : 'gemini-3.1-flash-lite');
          } else {
            throw retryableError;
          }
        }

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
  if (process.env.NODE_ENV !== 'production') {
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
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Multi-AI Hub] MCP (Claude/Cursor), OpenAPI (ChatGPT), and Gemini Copilot ready`);
    startCloudTunnel();
  });
}

startServer();
