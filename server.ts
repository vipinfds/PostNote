import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

// MCP tool execution engine
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

      // Determine client
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
          // Auto create client if brand name does not exist
          const newClientId = `client-${Date.now().toString(36)}`;
          matchedClient = {
            id: newClientId,
            name: args.clientName,
            handle: `@${args.clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            color: '#C44D34',
            notes: 'Auto-created via Claude MCP tool',
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

  // Standard JSON-RPC check
  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
    };
  }

  // Handle Notifications (no response required, return empty object or null)
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
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-session-id, Accept, Origin, User-Agent, mcp-session-id, cache-control'
    );
    res.header('Access-Control-Expose-Headers', '*');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      mcp: 'ready',
      postsCount: workspaceStore.posts.length,
      clientsCount: workspaceStore.clients.length,
    });
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
  // MCP (Model Context Protocol) Endpoints
  // -------------------------------------------------------------

  // GET /mcp — Server discovery & diagnostic handshake
  app.get('/mcp', (req, res) => {
    // If client requested text/event-stream or has ?sse=true, route to SSE handler
    if (
      req.headers.accept?.includes('text/event-stream') ||
      req.query.sse === 'true'
    ) {
      return handleSseConnection(req, res);
    }

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
      access: 'read_write',
      capabilities: {
        tools: MCP_TOOLS.map((t) => t.name),
        resources: false,
        prompts: false,
      },
      quickStart: {
        claudeBrowser: 'Use this URL directly in Claude custom connectors or remote tools.',
        claudeDesktop: 'Use SSE endpoint /mcp/sse or supergateway.',
      },
    });
  });

  // HEAD /mcp — Connector pre-flight ping
  app.head('/mcp', (req, res) => {
    res.sendStatus(200);
  });

  // POST /mcp — Direct Streamable HTTP JSON-RPC 2.0 Handler
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

  // GET /mcp/sse — Server-Sent Events endpoint
  function handleSseConnection(req: express.Request, res: express.Response) {
    const sessionId = crypto.randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial endpoint message pointing to message handler
    res.write(`event: endpoint\ndata: /mcp/message?sessionId=${sessionId}\n\n`);

    // Heartbeat every 15s to keep connection alive through proxies
    const timer = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    sseSessions.set(sessionId, { id: sessionId, res, timer });
    console.log(`[MCP SSE] Client connected (sessionId: ${sessionId})`);

    req.on('close', () => {
      clearInterval(timer);
      sseSessions.delete(sessionId);
      console.log(`[MCP SSE] Client disconnected (sessionId: ${sessionId})`);
    });
  }

  app.get('/mcp/sse', (req, res) => {
    handleSseConnection(req, res);
  });

  // POST /mcp/message — Receives JSON-RPC requests for active SSE sessions
  app.post('/mcp/message', (req, res) => {
    try {
      const sessionId =
        (req.query.sessionId as string) ||
        (req.headers['x-session-id'] as string) ||
        (req.headers['mcp-session-id'] as string);

      const response = processJsonRpc(req.body);

      // If there is an active SSE session, broadcast event
      if (sessionId && sseSessions.has(sessionId) && response) {
        const session = sseSessions.get(sessionId)!;
        session.res.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
      }

      // Also return in direct response
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

  // -------------------------------------------------------------
  // Client Portal sharing endpoints
  // -------------------------------------------------------------
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
    console.log(`[MCP] Server listening at /mcp and /mcp/sse with ${MCP_TOOLS.length} read/write tools`);
  });
}

startServer();
