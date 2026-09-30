import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Zap,
  Globe,
  Monitor,
  Terminal,
  Activity,
  Send,
  RefreshCw,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Code,
} from 'lucide-react';

interface AiAssistantsViewProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
  isDark?: boolean;
  onRefreshSync?: () => void;
}

type TabMode = 'claude-web' | 'claude-desktop' | 'inspector';

export const AiAssistantsView: React.FC<AiAssistantsViewProps> = ({
  onBack,
  onShowToast,
  isDark,
  onRefreshSync,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('claude-web');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic host detection so URL is never hardcoded or invalid
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpHttpUrl = `${origin}/mcp`;
  const mcpSseUrl = `${origin}/mcp/sse`;

  // Server ping & diagnostics state
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [serverPingMs, setServerPingMs] = useState<number | null>(null);
  const [toolCount, setToolCount] = useState<number>(8);

  // Inspector state
  const [inspectorLog, setInspectorLog] = useState<{
    action: string;
    status: 'pending' | 'success' | 'error';
    latencyMs?: number;
    request?: any;
    response?: any;
  } | null>(null);
  const [isRunningAction, setIsRunningAction] = useState(false);

  // Ping server on mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    setServerStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch('/mcp', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setServerStatus('online');
        setServerPingMs(latency);
        if (data.capabilities?.tools?.length) {
          setToolCount(data.capabilities.tools.length);
        }
      } else {
        setServerStatus('error');
      }
    } catch (e) {
      setServerStatus('error');
    }
  };

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast(`Copied ${label}`);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  // Test Handshake (initialize + tools/list)
  const runHandshakeTest = async () => {
    setIsRunningAction(true);
    const start = performance.now();
    const reqBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };
    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      setInspectorLog({
        action: 'Handshake & Tool Discovery (tools/list)',
        status: res.ok ? 'success' : 'error',
        latencyMs: latency,
        request: reqBody,
        response: data,
      });
      onShowToast(`Discovered ${data?.result?.tools?.length || 8} MCP tools`);
    } catch (err: any) {
      setInspectorLog({
        action: 'Handshake & Tool Discovery',
        status: 'error',
        latencyMs: Math.round(performance.now() - start),
        request: reqBody,
        response: { error: err?.message || 'Connection failed' },
      });
      onShowToast('Handshake error');
    } finally {
      setIsRunningAction(false);
    }
  };

  // Test Read (list_posts)
  const runReadTest = async () => {
    setIsRunningAction(true);
    const start = performance.now();
    const reqBody = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_posts',
        arguments: { limit: 3 },
      },
    };
    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      setInspectorLog({
        action: 'Read Access: Query Posts (list_posts)',
        status: res.ok ? 'success' : 'error',
        latencyMs: latency,
        request: reqBody,
        response: data,
      });
      onShowToast('Successfully read posts from workspace');
    } catch (err: any) {
      setInspectorLog({
        action: 'Read Access: Query Posts',
        status: 'error',
        latencyMs: Math.round(performance.now() - start),
        request: reqBody,
        response: { error: err?.message || 'Read failed' },
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  // Test Write (create_post)
  const runWriteTest = async () => {
    setIsRunningAction(true);
    const start = performance.now();
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 2);
    const dateStr = testDate.toISOString().split('T')[0];

    const reqBody = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'create_post',
        arguments: {
          clientName: 'Codery',
          title: `Claude MCP Live Test #${Math.floor(Math.random() * 900 + 100)}`,
          caption: 'Testing bidirectional MCP read & write access with Claude. Automatically scheduled in PostNote calendar! 🚀 #PostNote #ClaudeMCP',
          platform: 'LinkedIn',
          date: dateStr,
          status: 'Planned',
          category: 'POST',
        },
      },
    };
    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      setInspectorLog({
        action: 'Write Access: Create Scheduled Post (create_post)',
        status: res.ok ? 'success' : 'error',
        latencyMs: latency,
        request: reqBody,
        response: data,
      });
      onShowToast('Post created via MCP! Check your Calendar & Queue.');
      if (onRefreshSync) {
        onRefreshSync();
      }
    } catch (err: any) {
      setInspectorLog({
        action: 'Write Access: Create Post',
        status: 'error',
        latencyMs: Math.round(performance.now() - start),
        request: reqBody,
        response: { error: err?.message || 'Write failed' },
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  const desktopConfigJson = JSON.stringify(
    {
      mcpServers: {
        postnote: {
          command: 'npx',
          args: ['-y', 'mcp-remote', mcpSseUrl],
        },
      },
    },
    null,
    2
  );

  const curlTestCommand = `curl -X POST "${mcpHttpUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  return (
    <div
      id="ai-assistants-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Connect AI assistants (MCP)</h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Model Context Protocol · Read & Write access for Claude
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        <button
          onClick={checkServerHealth}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
            serverStatus === 'online'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : serverStatus === 'checking'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
          title="Click to re-ping server"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serverStatus === 'online'
                ? 'bg-emerald-500 animate-pulse'
                : serverStatus === 'checking'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          <span>
            {serverStatus === 'online'
              ? `Online (${serverPingMs}ms · ${toolCount} tools)`
              : serverStatus === 'checking'
              ? 'Checking...'
              : 'Offline / Typo'}
          </span>
          <RefreshCw className="w-3 h-3 ml-0.5 opacity-60" />
        </button>
      </div>

      {/* Main MCP Server URL Card */}
      <div
        className={`mt-4 p-4 rounded-2xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            YOUR ACTIVE MCP SERVER URL
          </span>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            FULL READ + WRITE ACCESS
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">
          Use this exact URL to connect Claude. It is dynamically resolved to your live instance:
        </p>

        <div className="flex items-center justify-between gap-2 mt-2.5 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60">
          <code className="text-xs font-mono text-stone-900 dark:text-stone-100 truncate font-semibold select-all">
            {mcpHttpUrl}
          </code>

          <button
            onClick={() => copyToClipboard(mcpHttpUrl, 'mcpHttp', 'MCP Server URL')}
            className="px-3 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
          >
            {copiedKey === 'mcpHttp' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>

        {/* SSE Alternate */}
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <span className="truncate">
            SSE Stream URL: <code className="font-mono text-stone-700 dark:text-stone-300">{mcpSseUrl}</code>
          </span>
          <button
            onClick={() => copyToClipboard(mcpSseUrl, 'mcpSse', 'SSE URL')}
            className="text-[11px] font-semibold text-[#C44D34] hover:underline shrink-0 ml-2"
          >
            {copiedKey === 'mcpSse' ? 'Copied SSE' : 'Copy SSE'}
          </button>
        </div>
      </div>

      {/* Tabs: Claude Web vs Desktop vs Inspector */}
      <div className="flex items-center gap-1 mt-5 p-1 rounded-xl bg-stone-200/70 dark:bg-stone-800/70 border border-stone-200/50 dark:border-stone-700/50">
        <button
          onClick={() => setActiveTab('claude-web')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'claude-web'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Claude in Browser</span>
        </button>

        <button
          onClick={() => setActiveTab('claude-desktop')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'claude-desktop'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Claude Desktop</span>
        </button>

        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'inspector'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#C44D34]" />
          <span>Live Tester</span>
        </button>
      </div>

      {/* TAB 1: Claude Web Guide */}
      {activeTab === 'claude-web' && (
        <div className="space-y-3 mt-3 animate-fade-in">
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#C44D34]" />
              How to Connect Claude (Browser / Claude.ai)
            </h3>

            <ol className="mt-3 space-y-2.5 text-xs text-stone-600 dark:text-stone-300">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-white">Copy the MCP Server URL</span>:
                  <div className="mt-1 font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded border border-stone-200 dark:border-stone-700 select-all">
                    {mcpHttpUrl}
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-white">In Claude.ai / Browser</span>:
                  Open your Claude workspace settings or connector modal. Paste the URL into the server URL field.
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-white">Claude registers 8 tools automatically</span>:
                  Full Read and Write permissions are granted for posts and clients.
                </div>
              </li>
            </ol>

            {/* Read & Write Tools List */}
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                ACTIVE MCP TOOLS REGISTERED
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Read Tools
                  </div>
                  <ul className="mt-1 text-[11px] text-stone-600 dark:text-stone-400 space-y-0.5 font-mono">
                    <li>• list_posts</li>
                    <li>• get_post</li>
                    <li>• list_clients</li>
                    <li>• get_workspace_stats</li>
                  </ul>
                </div>

                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                  <div className="text-[11px] font-bold text-[#C44D34] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Write Tools
                  </div>
                  <ul className="mt-1 text-[11px] text-stone-600 dark:text-stone-400 space-y-0.5 font-mono">
                    <li>• create_post (draft/schedule)</li>
                    <li>• update_post (status/copy)</li>
                    <li>• delete_post</li>
                    <li>• create_client</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sample Prompts */}
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                SAMPLE PROMPTS TO ASK CLAUDE
              </span>
              <div className="mt-2 space-y-1.5">
                {[
                  'What posts are currently scheduled for Codery this month?',
                  'Create a new LinkedIn post for Kudoli scheduled for Friday about creative design tips.',
                  'Update the status of post-codery-1 from "In review" to "Approved".',
                  'Give me workspace stats: how many total posts do we have planned vs scheduled?',
                ].map((prompt, i) => (
                  <div
                    key={i}
                    onClick={() => copyToClipboard(prompt, `prompt-${i}`, 'Sample prompt')}
                    className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] text-stone-700 dark:text-stone-300 cursor-pointer flex items-center justify-between group transition-colors"
                  >
                    <span className="italic truncate pr-2">"{prompt}"</span>
                    <Copy className="w-3 h-3 text-stone-400 group-hover:text-stone-700 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Claude Desktop Guide */}
      {activeTab === 'claude-desktop' && (
        <div className="space-y-3 mt-3 animate-fade-in">
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                Claude Desktop Configuration
              </h3>
              <button
                onClick={() =>
                  copyToClipboard(desktopConfigJson, 'desktopConfig', 'Claude Desktop configuration')
                }
                className="text-xs font-semibold text-[#C44D34] hover:underline flex items-center gap-1"
              >
                {copiedKey === 'desktopConfig' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'desktopConfig' ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
              Open <code className="font-mono text-stone-700 dark:text-stone-300">Claude Settings &gt; Developer &gt; Edit Config</code>, and paste this configuration into your <code className="font-mono text-stone-700 dark:text-stone-300">claude_desktop_config.json</code>:
            </p>

            <pre className="mt-3 p-3 rounded-xl bg-stone-900 text-stone-200 text-[11px] font-mono overflow-x-auto leading-relaxed border border-stone-800">
              {desktopConfigJson}
            </pre>

            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                OR TEST VIA TERMINAL CURL
              </span>
              <div className="mt-2 relative">
                <pre className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 text-[10px] font-mono overflow-x-auto border border-stone-200 dark:border-stone-700 select-all">
                  {curlTestCommand}
                </pre>
                <button
                  onClick={() => copyToClipboard(curlTestCommand, 'curlCmd', 'Curl test command')}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-200 hover:text-stone-900 shadow-xs text-[10px] font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Interactive Live Tester & Inspector */}
      {activeTab === 'inspector' && (
        <div className="space-y-3 mt-3 animate-fade-in">
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Live MCP Inspector & Runner
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Verify read and write operations directly against your server
                </p>
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={runHandshakeTest}
                disabled={isRunningAction}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700/80 text-stone-800 dark:text-stone-200 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-700/60 disabled:opacity-50"
              >
                <Code className="w-4 h-4 text-blue-500" />
                <span>1. Test Handshake</span>
                <span className="text-[9px] text-stone-400 font-normal">tools/list</span>
              </button>

              <button
                onClick={runReadTest}
                disabled={isRunningAction}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700/80 text-stone-800 dark:text-stone-200 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-700/60 disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>2. Test Read Access</span>
                <span className="text-[9px] text-stone-400 font-normal">list_posts</span>
              </button>

              <button
                onClick={runWriteTest}
                disabled={isRunningAction}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700/80 text-stone-800 dark:text-stone-200 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-700/60 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4 text-[#C44D34]" />
                <span>3. Test Write Access</span>
                <span className="text-[9px] text-stone-400 font-normal">create_post</span>
              </button>
            </div>

            {/* Result Log */}
            {inspectorLog && (
              <div className="mt-4 p-3 rounded-xl bg-stone-900 text-stone-200 text-xs border border-stone-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-[11px]">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    {inspectorLog.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {inspectorLog.action}
                  </span>
                  <span className="font-mono text-stone-400">
                    Latency: {inspectorLog.latencyMs}ms
                  </span>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400 mb-1">Response JSON:</div>
                  <pre className="font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto p-2 bg-black/40 rounded-lg text-emerald-300">
                    {JSON.stringify(inspectorLog.response, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
