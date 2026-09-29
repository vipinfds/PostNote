# PostNote — Base44 dev environment notes

## Architecture
- Single-server fullstack app: `server.ts` (tsx) runs Express on port 3000 and mounts **Vite in middleware mode** for the React frontend (no separate frontend process).
- Dev command: `npx tsx server.ts`. Production build: `vite build` + esbuild bundle (not used in this dev setup).
- No database — data lives in `src/data/initialData.ts` (client-side state only).
- No lockfile — compose runs `npm install` on startup (pinned via package.json ranges).

## Quirks
- `vite.config.ts` sets `base: '/PostNote/'` (for GitHub Pages). In dev middleware mode this works fine — Vite rewrites module URLs to `/PostNote/...` and serves them; don't "fix" it.
- Vite 6.2 blocks unknown Host headers: the compose passes `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.${BASE44_SANDBOX_HOST_DOMAIN}` so the preview proxy host is allowed. If the sandbox host domain changes, this resolves automatically via the env var.
- Bind mounts need polling for live reload: `CHOKIDAR_USEPOLLING=true` is set in compose.
- `GEMINI_API_KEY` is optional — `server.ts` `/api/gemini/polish` falls back to smart templates when the key is missing or the Gemini call fails. Verify AI generation works with a real key; the model name used is `gemini-3.8-flash` (hardcoded in server.ts).

## Verify it's working
- `curl http://127.0.0.1:3000/api/health` → `{"status":"ok",...}`
- `curl http://127.0.0.1:3000/` → HTML with `<script src="/PostNote/src/main.tsx">`
- Preview should render the PostNote calendar home screen.

## Run
`docker compose -f docker-compose.base44.yml up -d` (deps install + server start on container boot).
