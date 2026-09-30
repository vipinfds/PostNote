# PostNote MCP Server & Claude Read/Write Integration

A production-ready Model Context Protocol (MCP) server integrated into PostNote's backend, providing bidirectional read and write capabilities for Claude (Browser, Desktop, and CLI), persistent two-way data synchronization, and an interactive in-app connection inspector.

## User Review & Critical Decisions

> [!IMPORTANT]
> The previous connection issues were caused by two root flaws:
> 1. The application backend (`server.ts`) did not have an active `/mcp` or SSE handler—requests returned 404 or index.html.
> 2. The UI displayed a static dummy URL (`https://preview--postnote.run.app/mcp`) instead of the active deployed instance origin.
> 
> In this implementation, we provide both standard MCP protocols (Streamable HTTP Server-Sent Events and direct JSON-RPC 2.0 HTTP POST) and synchronize Claude's actions directly with PostNote's state.

- **Confirmed Decision 1 (Client Platform)**: Browser-based Claude connection support, alongside Claude Desktop and CLI configuration options.
- **Confirmed Decision 2 (Full Access)**: Full Read & Write access granted for posts (list, get, create, update, delete) and client management (list, create), plus workspace analytics.
- **Default Architecture**: Dynamic host resolution (`window.location.origin`), shared server memory & file store with `/api/sync` endpoint, and zero external dependency footprint using standard JSON-RPC 2.0 / MCP spec (`2024-11-05`).

---

### 1. Overview & Core Concept

PostNote will expose an official **Model Context Protocol (MCP)** server on its existing Express backend. Claude running in the browser, in Claude Desktop, or via developer agents can query the workspace, review pending social posts, generate scheduled campaigns, and update drafts directly inside PostNote.

When Claude calls `create_post` or `update_post`, the modifications immediately sync into PostNote's Calendar view, Queue tab, Content overview, and Client portals without requiring manual copy-pasting or file imports.

---

### 2. User Experience & Visual Design

#### A. Connect AI Assistants View (`AiAssistantsView.tsx`)
- **Dynamic Origin Detection**: Replaces hardcoded mock URLs with `window.location.origin + '/mcp'` and `window.location.origin + '/mcp/sse'`.
- **One-Click Copy & Protocol Selector**: Toggle between **Direct HTTP (Claude Web / Custom Connectors)** and **SSE Transport (Claude Desktop / Supergateway / Remote MCP)**.
- **Live MCP Connection Tester & Playground**:
  - Live "Test Connection" button that issues a real JSON-RPC `initialize` and `tools/list` handshake.
  - Interactive tool runner: Test "Read Posts" and "Create Sample Post" directly from the UI with an instant green/red status indicator, request latency, and structured JSON payload preview.
- **Platform-Specific Setup Guides**:
  1. *Claude in Browser (Claude.ai)*: Step-by-step instructions for remote MCP connectors, browser extensions, and curl test payloads.
  2. *Claude Desktop*: Copy-pasteable `claude_desktop_config.json` snippet with both SSE and local bridge commands.
  3. *Cursor / Windsurf / Claude Code*: Standard MCP config JSON.

#### B. Visual Identity & Aesthetic Alignment
- Follows PostNote's warm editorial aesthetic (stone palette, `#C44D34` terracotta accents, crisp borders, dark mode compatibility).
- Tabular figures (`tabular-nums`) for timestamps, latency badges, and tool call counters.
- Clean typographic metadata discipline (no decorative pill capsules; subtle unboxed labels with `·` dividers).

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Dual Protocol Support (SSE + Direct JSON-RPC)
- *Chosen Approach*: Support both `GET /mcp/sse` + `POST /mcp/message` (Server-Sent Events) and direct `POST /mcp` (JSON-RPC 2.0 Streamable HTTP).
- *Why*: Claude web interfaces, browser agents, and remote MCP proxies vary in transport requirements. Dual transport ensures 100% compatibility across Claude web, Claude Desktop, and CLI runners.
- *Alternatives Considered*: Only supporting stdio (incompatible with hosted web servers) or only SSE (fails with simple HTTP POST tools).

#### Decision 2: Shared Server-Side Store with Client Sync
- *Chosen Approach*: Maintain a server-side JSON store (`/api/sync`) that seeds from initial agency data and synchronizes bidirectionally with browser `localStorage`.
- *Why*: In a client-side SPA, Claude's MCP requests hit `server.ts`. Storing workspace posts and clients on the server allows Claude to read existing posts and write new drafts that instantly appear in the user's browser view.
- *Alternatives Considered*: Pure in-memory reset on reboot (causes data loss between server restarts). We will use file-backed persistence with automatic fallback.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Claude AI Client                     │
│  (Claude Browser, Claude Desktop, or Claude Code CLI)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ 1. JSON-RPC 2.0 (SSE / POST)
                           ▼
┌────────────────────────────────────────────────────────┐
│              PostNote Backend (server.ts)              │
│                                                        │
│  ┌────────────────────┐      ┌──────────────────────┐  │
│  │  /mcp / /mcp/sse   │ ◄──► │  MCP Protocol Engine │  │
│  │  HTTP Endpoints    │      │  Spec: 2024-11-05    │  │
│  └────────────────────┘      └──────────┬───────────┘  │
│                                         │              │
│  ┌──────────────────────────────────────┴───────────┐  │
│  │ Tools Registry (Read & Write):                   │  │
│  │  • list_posts, get_post, get_workspace_stats    │  │
│  │  • create_post, update_post, delete_post         │  │
│  │  • list_clients, create_client                   │  │
│  └──────────────────────────────────────┬───────────┘  │
│                                         │ Read/Write   │
│                                         ▼              │
│  ┌──────────────────────────────────────────────────┐  │
│  │       PostNote Shared Data Store (store.json)    │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │                              │
│                         │ 2. /api/sync polling/fetch   │
└─────────────────────────┼──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                PostNote Frontend (React)               │
│                                                        │
│   • Calendar View (Month/Week grid)                    │
│   • Queue & Approvals Tab                              │
│   • Content & Client Overview                          │
│   • AI Assistants Live Tester & Config View            │
└────────────────────────────────────────────────────────┘
```

#### MCP Tool Specifications

1. **`list_posts`** (Read):
   - Parameters: `clientId` (string, opt), `status` (string, opt), `platform` (string, opt), `limit` (number, opt).
   - Returns: Formatted list of posts with dates, titles, captions, platforms, and approval statuses.
2. **`get_post`** (Read):
   - Parameters: `postId` (string, required).
   - Returns: Complete post record including caption, category, media links, and scheduling info.
3. **`create_post`** (Write):
   - Parameters: `clientName` or `clientId`, `title`, `caption`, `platform`, `date` (YYYY-MM-DD), `status` ('Planned' | 'In review' | 'Approved' | 'Scheduled'), `category`.
   - Action: Inserts post into shared store, updates client post count, returns created post with ID.
4. **`update_post`** (Write):
   - Parameters: `postId` (required), optional updates for `caption`, `status`, `date`, `title`, `platform`.
   - Action: Mutates post record in place and returns updated entity.
5. **`delete_post`** (Write):
   - Parameters: `postId` (required).
   - Action: Deletes post from workspace.
6. **`list_clients`** (Read):
   - Returns: All client profiles, handles, brand colors, and active post counts.
7. **`create_client`** (Write):
   - Parameters: `name`, `handle`, `color` (hex or preset).
   - Action: Registers new client profile.
8. **`get_workspace_stats`** (Read):
   - Returns: High-level metric summary (total posts, scheduled count, pending approvals, clients count).

#### Verification Plan
1. **Compilation Check**: Run `compile_applet` to verify TypeScript types, Express handlers, and React frontend builds.
2. **Endpoint Validation**: Query `POST /mcp` with an `initialize` JSON-RPC handshake and `tools/list` call to ensure valid responses.
3. **Read/Write Execution**: Execute `create_post` and verify persistence via `list_posts` and the frontend sync.
4. **UI Validation**: Verify the "Connect AI assistants" view renders active host URLs and the live tester functions seamlessly.
