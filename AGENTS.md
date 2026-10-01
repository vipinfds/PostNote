# PostNote — Base44 dev environment notes

## Architecture
- Single-server fullstack app: `server.ts` (tsx) runs Express on port 3000 and mounts **Vite in middleware mode** for the React frontend (no separate frontend process).
- Dev command: `npx tsx server.ts`. Production build: `vite build` + esbuild bundle (not used in this dev setup).
- No database — data lives in `src/data/initialData.ts` (client-side state only).
- Compose runs `npm install` on startup (not `npm ci` — the merged lockfile can be out of sync, e.g. `ms@2.1.2` missing). `scripts/sync-github.mjs` re-runs `npm install` after any merge that touches `package.json`/`package-lock.json`.

## Quirks
- `vite.config.ts` sets `base: '/PostNote/'` (for GitHub Pages). In dev middleware mode this works fine — Vite rewrites module URLs to `/PostNote/...` and serves them; don't "fix" it.
- Vite 6.2 blocks unknown Host headers: the compose passes `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.${BASE44_SANDBOX_HOST_DOMAIN}` so the preview proxy host is allowed. If the sandbox host domain changes, this resolves automatically via the env var.
- Bind mounts need polling for live reload: `CHOKIDAR_USEPOLLING=true` is set in compose.
- `GEMINI_API_KEY` is optional — `server.ts` `/api/gemini/polish` falls back to smart templates when the key is missing or the Gemini call fails.
- Gemini model: the repo originally called `gemini-3.8-flash`, which 503s/404s for this key. Primary `gemini-3.1-flash-lite` and overload fallback `gemini-3.5-flash-lite` both generated live; `gemini-2.5-flash-lite` returned 404 despite appearing in `ai.models.list()`. The compose uses `tsx watch` so server.ts edits reload automatically.

## Verify it's working
- `curl http://127.0.0.1:3000/api/health` → `{"status":"ok",...}`
- `curl http://127.0.0.1:3000/` → HTML with `<script src="/PostNote/src/main.tsx">`
- Preview should render the PostNote calendar home screen.

## GitHub sync watcher
- `sync-watcher` compose service runs `scripts/sync-github.mjs`: polls `origin` every 2 min (`SYNC_INTERVAL_MS`), merges new commits from user branches into the working branch (skips `origin/base44/*`), reports JSON status on internal port 3001 (unpublished — `docker compose -f docker-compose.base44.yml exec -T sync-watcher node -e "fetch('http://127.0.0.1:3001/').then(r=>r.json()).then(console.log)"`).
- On a merge conflict it aborts, lists the files, and pauses until HEAD moves (a resolution commit), then resumes. Skips cycles while the worktree is dirty (e.g. mid-turn platform commits).

## Run
`docker compose -f docker-compose.base44.yml up -d` (deps install + server start on container boot).
