# PostNote Sign-In Service & Claude OAuth 2.0 Integration

A native OAuth 2.0 and sign-in service for PostNote implementing RFC 8414 authorization server discovery, RFC 7591 dynamic client registration, PKCE authentication, and 1-click instant approval for Claude.ai custom connectors.

## User Review & Critical Decisions

> [!IMPORTANT]
> The errors reported by Claude:
> - *"Couldn't determine how this server signs in"*
> - *"Couldn't register with PostNote's sign-in service. You can try again, or add an OAuth Client ID in the connector settings"*
> 
> Occur because Claude.ai's browser connector requires an **OAuth 2.0 handshake** (RFC 8414 / RFC 7591). When you enter an MCP URL into Claude.ai, Claude performs discovery at `/.well-known/oauth-authorization-server` and calls the registration endpoint (`/oauth/register`) to register itself as a client before requesting user authorization.
> 
> We are implementing the complete OAuth 2.0 Sign-In Service with **1-click instant approval** as selected.

- **Confirmed Decision 1 (Auth Method)**: 1-Click Instant Approval. When Claude redirects to PostNote to sign in, a clean branded screen displays the requested permissions with an instant "Approve & Connect Claude" button.
- **Confirmed Decision 2 (OAuth Discovery & Dynamic Registration)**: Expose RFC 8414 (`/.well-known/oauth-authorization-server`), RFC 9728 (`/.well-known/oauth-protected-resource`), and RFC 7591 (`/oauth/register`) so Claude automatically detects and registers without manual hurdles.
- **Confirmed Decision 3 (Static Client ID Fallback)**: Provide a pre-configured Client ID (`claude_postnote_client`) and endpoint links directly on the PostNote **AI Assistants** screen in case manual entry is ever chosen.

---

### 1. Overview & Core Concept

When connecting Claude via the browser connector in Claude.ai, Claude initiates an interactive OAuth 2.0 flow:
1. **Discovery**: Claude queries PostNote's metadata at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`.
2. **Registration**: Claude contacts `/oauth/register` to register the Claude web redirect callback (`https://claude.ai/api/mcp/auth_callback`).
3. **1-Click User Sign-In**: Claude opens the authorization URL (`/oauth/authorize`), where the user clicks "Approve & Connect" to grant full Read and Write access.
4. **Token Exchange**: Claude securely exchanges the authorization code with PKCE at `/oauth/token` for an access token.
5. **Full MCP Session**: Claude connects to `/mcp` with the Bearer token and begins querying and creating social media posts directly.

---

### 2. User Experience & Visual Design

#### A. 1-Click Authorization Screen (`/oauth/authorize`)
- A dedicated, lightweight authentication view styled in PostNote's warm editorial identity (stone background, terracotta `#C44D34` accents, crisp borders):
  - **App Header**: PostNote logo + "Connect Claude AI".
  - **Permissions Checklist**:
    - ✓ View and search social media posts, calendar schedule, and queue
    - ✓ Draft and schedule new posts for clients (Codery, Kudoli, etc.)
    - ✓ Update copy, approval status, and publication dates
  - **Action Button**: High-contrast, prominent **"Approve & Connect Claude"** button that immediately issues the authorization code and redirects back to `https://claude.ai/api/mcp/auth_callback`.
  - **Auto-Approval Parameter**: Supports instant redirect for automated flows.

#### B. Updated AI Assistants Settings View (`AiAssistantsView.tsx`)
- Adds a **"Claude Sign-In & OAuth Credentials"** section displaying:
  - **OAuth Status**: 🟢 Sign-In Service Ready
  - **OAuth Client ID**: `claude_postnote_client` (with 1-click copy)
  - **Authorization URL**: `https://<origin>/oauth/authorize`
  - **Token URL**: `https://<origin>/oauth/token`
  - Explanatory note resolving the `"Couldn't determine how this server signs in"` prompt.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Built-in Express OAuth Service vs External Identity Provider
- *Chosen Approach*: Implement a lightweight, zero-dependency RFC-compliant OAuth 2.0 provider inside `server.ts` utilizing Node's built-in `crypto` module.
- *Why*: Eliminates complex third-party account linking and avoids cloud configuration barriers. The user gets a 1-click self-contained sign-in flow hosted directly on their app instance.
- *Alternatives Considered*: Firebase Auth or Google OAuth (would require users to register Google Cloud console OAuth clients and manage domain verification).

#### Decision 2: PKCE (Proof Key for Code Exchange) Support
- *Chosen Approach*: Support PKCE with SHA-256 (`S256`) and plain methods.
- *Why*: Claude.ai strictly mandates PKCE (`code_challenge` and `code_verifier`) for OAuth security when connecting browser-based connectors.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Claude AI Browser                    │
└───────┬───────────────────┬───────────────────┬────────┘
        │ 1. Discovery      │ 2. Register       │ 3. Sign In
        │    Metadata       │    RFC 7591       │    (1-Click)
        ▼                   ▼                   ▼
┌────────────────────────────────────────────────────────┐
│            PostNote OAuth 2.0 Sign-In Engine           │
│                                                        │
│  • /.well-known/oauth-authorization-server             │
│  • /.well-known/oauth-protected-resource               │
│  • POST /oauth/register (Dynamic Client Registration)  │
│  • GET  /oauth/authorize (1-Click Approval Screen)     │
│  • POST /oauth/token (PKCE Token Generation)           │
└───────────────────────────┬────────────────────────────┘
                            │ 4. Bearer Token
                            ▼
┌────────────────────────────────────────────────────────┐
│              PostNote MCP Server (/mcp)                │
│       8 Read/Write Tools (list, create, update)        │
└────────────────────────────────────────────────────────┘
```

#### API Endpoints to Implement in `server.ts`:
1. `GET /.well-known/oauth-authorization-server`:
   - Returns RFC 8414 metadata: issuer, authorization_endpoint, token_endpoint, registration_endpoint, code_challenge_methods_supported (`["S256", "plain"]`), response_types (`["code"]`).
2. `GET /.well-known/oauth-protected-resource`:
   - Returns RFC 9728 metadata pointing to the authorization server and `/mcp` resource.
3. `POST /oauth/register`:
   - Accepts client registration from Claude, validates redirect URIs (`https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback`), returns 201 with `client_id` and registered properties.
4. `GET /oauth/authorize`:
   - Validates client and PKCE parameters, renders the 1-click approval UI, redirects on approval with `code` and `state`.
5. `POST /oauth/token`:
   - Validates authorization code, verifies PKCE code verifier (`code_challenge === sha256(code_verifier)`), returns Bearer access token.
6. `POST /mcp` & `GET /mcp`:
   - Accepts Bearer token authentication or open local calls.

#### Verification Plan
1. **Discovery Handshake**: Verify `curl -s http://localhost:3000/.well-known/oauth-authorization-server` returns valid JSON metadata with correct origin.
2. **Registration Verification**: Test `POST /oauth/register` with Claude callback payload and verify 201 Created.
3. **PKCE Flow Verification**: Test `/oauth/authorize` generation and `/oauth/token` exchange.
4. **UI Validation**: Verify the "AI Assistants" screen displays the OAuth Client ID and status indicator.
