// GitHub sync watcher: polls origin every SYNC_INTERVAL_MS, merges new remote
// commits into the current working branch, and reports status on :3001.
// Never force-pushes and never checks out or modifies the default branch.
// On a merge conflict it aborts, flags the files, and pauses until HEAD moves
// (i.e. someone commits a resolution), then resumes automatically.
import { execFileSync } from 'node:child_process';
import http from 'node:http';

const INTERVAL = Number(process.env.SYNC_INTERVAL_MS || 120000);
const STATUS_PORT = Number(process.env.SYNC_STATUS_PORT || 3001);

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf-8' });
}

const state = {
  status: 'starting', // starting | ok | paused | waiting | error
  branch: null,
  lastSyncAt: null,
  lastCommit: null,
  recentMerges: [],
  conflicts: [],
  pausedReason: null,
  lastError: null,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function syncOnce() {
  state.lastSyncAt = new Date().toISOString();
  state.lastError = null;

  // Skip while the worktree is dirty (something else may be committing).
  if (git(['status', '--porcelain']).trim()) {
    state.status = 'waiting';
    state.lastError = 'worktree dirty, skipping this cycle';
    return;
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  state.branch = branch;
  git(['fetch', '--all', '--prune']);

  // While paused on a conflict, wait until HEAD moves past the conflict point.
  if (state.status === 'paused' && state.pausedHead) {
    if (git(['rev-parse', 'HEAD']).trim() === state.pausedHead) {
      state.lastError = `paused: ${state.pausedReason} — commit a resolution to resume`;
      return;
    }
    state.status = 'ok';
    state.pausedHead = null;
    state.pausedReason = null;
    state.conflicts = [];
    console.log('[sync] resolution detected, resuming merges');
  }

  let mergedThisCycle = false;
  const refs = git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((r) => r !== 'origin/HEAD' && !r.startsWith('origin/base44/'));

  for (const ref of refs) {
    const short = ref.replace(/^origin\//, '');
    if (short === branch) continue;

    let count = 0;
    try {
      count = Number(git(['rev-list', '--count', `HEAD..${ref}`]).trim());
    } catch {
      continue;
    }
    if (count === 0) continue;

    try {
      git(['merge', '--no-edit', ref]);
      console.log(`[sync] merged ${ref} (${count} commit${count === 1 ? '' : 's'})`);
      state.recentMerges.unshift({ ref, commits: count, at: state.lastSyncAt });
      state.recentMerges = state.recentMerges.slice(0, 20);
      mergedThisCycle = true;
    } catch {
      let conflicts = [];
      try {
        conflicts = git(['diff', '--name-only', '--diff-filter=U']).trim().split('\n').filter(Boolean);
      } catch { /* fall through to abort */ }
      try {
        git(['merge', '--abort']);
      } catch { /* already clean */ }
      state.status = 'paused';
      state.pausedHead = git(['rev-parse', 'HEAD']).trim();
      state.pausedReason = `merge conflict with ${ref}`;
      state.conflicts = conflicts;
      state.lastError = `merge conflict with ${ref}: ${conflicts.join(', ')}`;
      console.warn(`[sync] CONFLICT merging ${ref} — conflicting files: ${conflicts.join(', ')} — paused until resolved`);
      return; // stop applying further merges this cycle
    }
  }

  if (mergedThisCycle) {
    state.lastCommit = git(['rev-parse', '--short', 'HEAD']).trim();

    // Install new/changed dependencies so the app doesn't crash on missing imports.
    const touchedPackages = git(['diff', '--name-only', `${state.lastCommit}^`, state.lastCommit])
      .split('\n')
      .filter((f) => f === 'package.json' || f === 'package-lock.json');
    if (touchedPackages.length) {
      console.log(`[sync] ${touchedPackages.join(', ')} changed — running npm install`);
      state.installingDeps = true;
      try {
        execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: { ...process.env, CI: 'true' },
        });
        console.log('[sync] dependencies installed');
      } finally {
        state.installingDeps = false;
      }
    }
  }
  state.status = 'ok';
}

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
  })
  .listen(STATUS_PORT, '0.0.0.0', () => {
    console.log(`[sync] status endpoint listening on :${STATUS_PORT}`);
  });

(async () => {
  while (true) {
    try {
      await syncOnce();
    } catch (e) {
      if (state.status !== 'paused') state.status = 'error';
      state.lastError = String(e?.message || e);
      console.error('[sync] error:', e?.message || e);
    }
    await sleep(INTERVAL);
  }
})();
