import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Zap,
  Globe,
  Bot,
  Sparkles,
  Activity,
  RefreshCw,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Code,
  ShieldCheck,
  ExternalLink,
  KeyRound,
  Lock,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Server,
  Link2,
  CheckCircle,
} from 'lucide-react';

interface AiAssistantsViewProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
  isDark?: boolean;
  onRefreshSync?: () => void;
}

type TabMode = 'claude' | 'chatgpt' | 'gemini' | 'copilot' | 'inspector';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolCalled?: string | null;
  toolResult?: any;
  timestamp: string;
}

export const AiAssistantsView: React.FC<AiAssistantsViewProps> = ({
  onBack,
  onShowToast,
  isDark,
  onRefreshSync,
}) => {
  // Default to Claude as requested
  const [activeTab, setActiveTab] = useState<TabMode>('claude');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic host detection
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const [publicTunnelUrl, setPublicTunnelUrl] = useState<string | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<'checking' | 'active' | 'starting'>('checking');
  const [tunnelProvider, setTunnelProvider] = useState<'localtunnel' | 'cloudflare'>('localtunnel');

  // Localtunnel Free Subdomain State (100% Free, No Credit Card, No Account)
  const [subdomainInput, setSubdomainInput] = useState('postnote-vipin');
  const [isUpdatingSubdomain, setIsUpdatingSubdomain] = useState(false);

  // Cloudflare Tunnel state (Optional alternative)
  const [showCloudflareSetup, setShowCloudflareSetup] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('mcp.firstdraftstudio.in');
  const [tokenInput, setTokenInput] = useState('');
  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [isSavingCloudflare, setIsSavingCloudflare] = useState(false);

  // Effective URLs for MCP, OAuth, and OpenAPI
  const effectiveBaseUrl = publicTunnelUrl || `https://${subdomainInput}.loca.lt`;
  const effectiveMcpUrl = `${effectiveBaseUrl}/mcp`;
  const effectiveAuthUrl = `${effectiveBaseUrl}/oauth/authorize`;
  const effectiveTokenUrl = `${effectiveBaseUrl}/oauth/token`;
  const effectiveOpenApiUrl = `${effectiveBaseUrl}/openapi.json`;

  const oauthClientId = 'claude_postnote_client';
  const oauthClientSecret = 'postnote_oauth_secret_2026';

  // Server health state
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [openApiSchema, setOpenApiSchema] = useState<any>(null);
  const [geminiTools, setGeminiTools] = useState<any>(null);

  // Copilot Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '👋 Hi! I am your PostNote AI Copilot. I have full read and write access to your calendar, drafts, clients, and approval queues. You can ask me to list posts, schedule new content, check client stats, or approve items!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isCopilotSending, setIsCopilotSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check health and poll tunnel
  useEffect(() => {
    checkServerHealth();
    fetchTunnelInfo();
    fetchOpenApi();
    fetchGeminiTools();

    const interval = setInterval(() => {
      fetchTunnelInfo();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'copilot') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const fetchTunnelInfo = async () => {
    try {
      const res = await fetch('/api/tunnel');
      if (res.ok) {
        const data = await res.json();
        if (data.publicUrl) {
          setPublicTunnelUrl(data.publicUrl);
          setTunnelStatus('active');
        } else {
          setTunnelStatus('starting');
        }
        if (data.provider) {
          setTunnelProvider(data.provider);
        }
        if (data.subdomain && !isUpdatingSubdomain) {
          setSubdomainInput(data.subdomain);
        }
      }

      // Also get detailed config
      const configRes = await fetch('/api/tunnel/config');
      if (configRes.ok) {
        const cfg = await configRes.json();
        setMaskedToken(cfg.tokenMasked);
        if (cfg.provider) setTunnelProvider(cfg.provider);
        if (cfg.subdomain) setSubdomainInput(cfg.subdomain);
      }
    } catch {
      setTunnelStatus('starting');
    }
  };

  // Localtunnel Free Subdomain Switcher (Zero Card / Zero Signup)
  const handleSaveLocaltunnel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSub = subdomainInput.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50);
    if (!cleanSub) {
      onShowToast('Please enter a valid subdomain name (e.g. postnote-vipin)');
      return;
    }

    setIsUpdatingSubdomain(true);
    try {
      const res = await fetch('/api/tunnel/localtunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: cleanSub }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(`Connected to https://${cleanSub}.loca.lt!`);
        if (data.publicUrl) {
          setPublicTunnelUrl(data.publicUrl);
          setTunnelStatus('active');
        }
        setTunnelProvider('localtunnel');
        fetchTunnelInfo();
      } else {
        onShowToast(`Failed: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      onShowToast(`Error: ${err?.message || 'Could not connect'}`);
    } finally {
      setIsUpdatingSubdomain(false);
    }
  };

  // Cloudflare Tunnel token handler
  const handleSaveCloudflare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim() && !maskedToken) {
      onShowToast('Please paste your Cloudflare Tunnel Token');
      return;
    }

    setIsSavingCloudflare(true);
    try {
      const res = await fetch('/api/tunnel/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenInput.trim() || undefined,
          customDomain: customDomainInput.trim(),
          mode: 'permanent',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast('Cloudflare Tunnel connected!');
        setTunnelProvider('cloudflare');
        fetchTunnelInfo();
      } else {
        onShowToast(`Failed: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      onShowToast(`Error: ${err?.message || 'Could not connect tunnel'}`);
    } finally {
      setIsSavingCloudflare(false);
    }
  };

  const handleResetToLocaltunnel = async () => {
    setIsUpdatingSubdomain(true);
    try {
      const res = await fetch('/api/tunnel/reset', { method: 'POST' });
      if (res.ok) {
        onShowToast('Switched to free Localtunnel');
        setTunnelProvider('localtunnel');
        fetchTunnelInfo();
      }
    } catch {
      onShowToast('Failed to switch to Localtunnel');
    } finally {
      setIsUpdatingSubdomain(false);
    }
  };

  const checkServerHealth = async () => {
    setServerStatus('checking');
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('error');
      }
    } catch {
      setServerStatus('error');
    }
  };

  const fetchOpenApi = async () => {
    try {
      const res = await fetch('/openapi.json');
      if (res.ok) {
        const data = await res.json();
        setOpenApiSchema(data);
      }
    } catch (e) {
      console.warn('Could not load OpenAPI schema', e);
    }
  };

  const fetchGeminiTools = async () => {
    try {
      const res = await fetch('/api/gemini/tools');
      if (res.ok) {
        const data = await res.json();
        setGeminiTools(data);
      }
    } catch (e) {
      console.warn('Could not load Gemini tools', e);
    }
  };

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast(`Copied ${label}`);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  // Send message to in-app Copilot
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput.trim();
    if (!textToSend || isCopilotSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsCopilotSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Task processed successfully.',
        toolCalled: data.toolCalled,
        toolResult: data.toolResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      if (data.updatedStore && onRefreshSync) {
        onRefreshSync();
        onShowToast('Workspace updated in real-time!');
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ Error executing request: ${err?.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsCopilotSending(false);
    }
  };

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
            <h2 className="text-base font-bold tracking-tight">AI Integrations & Connectors</h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              100% Free · Zero Card / Zero Signup · Claude MCP · ChatGPT Actions · In-App Copilot
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTunnelInfo}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              tunnelStatus === 'active'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
            title="Free Tunnel Status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tunnelStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
              }`}
            />
            <span>
              {tunnelStatus === 'active'
                ? `100% Free URL Active`
                : 'Connecting Free Tunnel...'}
            </span>
            <RefreshCw className="w-3 h-3 ml-0.5 opacity-60" />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-1 mt-4 p-1 rounded-xl bg-stone-200/70 dark:bg-stone-800/70 border border-stone-200/50 dark:border-stone-700/50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('claude')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'claude'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-purple-500" />
          <span>Claude.ai (Free MCP)</span>
        </button>

        <button
          onClick={() => setActiveTab('chatgpt')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'chatgpt'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-emerald-600" />
          <span>ChatGPT (OpenAPI)</span>
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'copilot'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-[#C44D34]" />
          <span>In-App Copilot</span>
        </button>

        <button
          onClick={() => setActiveTab('gemini')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'gemini'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Gemini SDK</span>
        </button>

        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'inspector'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-500" />
          <span>Tester</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CLAUDE.AI BROWSER MCP (PRIMARY) */}
      {/* ============================================================== */}
      {activeTab === 'claude' && (
        <div className="space-y-4 mt-4 animate-fade-in">
          {/* ZERO-CARD 100% FREE HERO CARD */}
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
                    Claude.ai Connector URL
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      100% FREE · NO CREDIT CARD
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Works directly with your custom subdomain. Zero accounts, zero card, no downloads.
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                ACTIVE & LIVE
              </span>
            </div>

            {/* URL Display with 1-Click Copy */}
            <div className="flex items-center justify-between gap-2 mt-3 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60">
              <code className="text-xs font-mono text-purple-700 dark:text-purple-300 truncate font-bold select-all">
                {effectiveMcpUrl}
              </code>

              <button
                onClick={() => copyToClipboard(effectiveMcpUrl, 'mcpUrl', 'Claude MCP URL')}
                className="px-3 py-1.5 bg-[#C44D34] hover:bg-[#A83E28] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
              >
                {copiedKey === 'mcpUrl' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy for Claude.ai</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="mt-3.5 pt-3 border-t border-stone-100 dark:border-stone-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                Connecting to Claude.ai in 30 seconds:
              </div>

              <ol className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    In <strong>Claude.ai</strong>, open <strong>Settings &gt; Connectors</strong> (or Organization Settings &gt; Connectors) and click <strong>Add custom connector</strong>.
                  </div>
                </li>

                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    Paste the copied URL (<code className="font-mono text-[11px] text-purple-600 dark:text-purple-400">{effectiveMcpUrl}</code>) into the remote MCP server field and click <strong>Add</strong>.
                  </div>
                </li>

                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    Claude discovers the OAuth service automatically. When the PostNote authorization popup opens, click <strong>Approve & Connect Claude</strong>!
                  </div>
                </li>
              </ol>
            </div>

            {/* Test Sign-in Link */}
            <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
              <span>Want to preview the approval screen?</span>
              <a
                href={effectiveAuthUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 flex items-center gap-1"
              >
                <span>Preview 1-Click Sign-in</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* CUSTOM SUBDOMAIN SELECTOR CARD (100% FREE, NO CARD, NO ACCOUNT) */}
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Link2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-stone-900 dark:text-white">
                    Customize Your Free Subdomain
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Pick your own permanent name. Powered by open-source Localtunnel (no signup or billing required).
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                ZERO SIGNUP REQUIRED
              </span>
            </div>

            <form onSubmit={handleSaveLocaltunnel} className="mt-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden px-3 py-1.5">
                  <span className="text-xs text-stone-400 font-mono select-none">https://</span>
                  <input
                    type="text"
                    value={subdomainInput}
                    onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="postnote-vipin"
                    className="flex-1 bg-transparent text-xs font-mono font-bold text-stone-900 dark:text-white focus:outline-hidden px-1"
                  />
                  <span className="text-xs text-stone-400 font-mono select-none">.loca.lt</span>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingSubdomain || !subdomainInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-40 shrink-0"
                >
                  {isUpdatingSubdomain ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Claim Subdomain</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-stone-500 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" /> No credit card needed
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" /> No registration or password
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" /> Bypasses Cloud Run cookie auth
                </span>
              </div>
            </form>
          </div>

          {/* ADVANCED: CLOUDFLARE ACCORDION (OPTIONAL FOR USERS WITH CLOUDFLARE) */}
          <div
            className={`p-3 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <button
              onClick={() => setShowCloudflareSetup(!showCloudflareSetup)}
              className="w-full flex items-center justify-between text-left text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-stone-400" />
                <span>Want to use Cloudflare Tunnel instead? (Requires Cloudflare Zero Trust account)</span>
              </div>
              {showCloudflareSetup ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </button>

            {showCloudflareSetup && (
              <form onSubmit={handleSaveCloudflare} className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Custom Domain
                    </label>
                    <input
                      type="text"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      placeholder="mcp.firstdraftstudio.in"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden font-mono text-stone-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Cloudflare Tunnel Token
                    </label>
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder={maskedToken ? `Active: ${maskedToken}` : 'Paste eyJh... token'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden font-mono text-stone-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {tunnelProvider === 'cloudflare' && (
                    <button
                      type="button"
                      onClick={handleResetToLocaltunnel}
                      className="text-xs text-stone-500 hover:text-stone-700 underline"
                    >
                      Switch back to free Localtunnel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingCloudflare || (!tokenInput.trim() && !maskedToken)}
                    className="ml-auto px-3.5 py-1.5 bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 text-xs font-semibold rounded-xl disabled:opacity-40"
                  >
                    {isSavingCloudflare ? 'Connecting...' : 'Connect Cloudflare'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Advanced OAuth Manual Details Card */}
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Manual OAuth Client Credentials (If Requested)
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                ADVANCED SETTINGS
              </span>
            </div>

            <p className="text-xs text-stone-500 mt-1">
              If Claude prompts to configure manually, you can provide these static credentials:
            </p>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-semibold mb-1">
                  <span>OAuth Client ID</span>
                  <button
                    onClick={() => copyToClipboard(oauthClientId, 'cid', 'Client ID')}
                    className="text-[#C44D34] hover:underline font-bold"
                  >
                    {copiedKey === 'cid' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code className="font-mono font-bold text-stone-900 dark:text-stone-100 select-all">
                  {oauthClientId}
                </code>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-semibold mb-1">
                  <span>OAuth Client Secret</span>
                  <button
                    onClick={() => copyToClipboard(oauthClientSecret, 'csec', 'Client Secret')}
                    className="text-[#C44D34] hover:underline font-bold"
                  >
                    {copiedKey === 'csec' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code className="font-mono font-bold text-stone-900 dark:text-stone-100 select-all">
                  {oauthClientSecret}
                </code>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 sm:col-span-2">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-semibold mb-1">
                  <span>Authorization URL</span>
                  <button
                    onClick={() => copyToClipboard(effectiveAuthUrl, 'aurl', 'Authorization URL')}
                    className="text-[#C44D34] hover:underline font-bold"
                  >
                    {copiedKey === 'aurl' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code className="font-mono text-stone-900 dark:text-stone-100 truncate block select-all">
                  {effectiveAuthUrl}
                </code>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 sm:col-span-2">
                <div className="flex items-center justify-between text-stone-500 text-[10px] font-semibold mb-1">
                  <span>Token URL</span>
                  <button
                    onClick={() => copyToClipboard(effectiveTokenUrl, 'turl', 'Token URL')}
                    className="text-[#C44D34] hover:underline font-bold"
                  >
                    {copiedKey === 'turl' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code className="font-mono text-stone-900 dark:text-stone-100 truncate block select-all">
                  {effectiveTokenUrl}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CHATGPT (OPENAPI 3.1 & CUSTOM ACTIONS) */}
      {/* ============================================================== */}
      {activeTab === 'chatgpt' && (
        <div className="space-y-4 mt-4 animate-fade-in">
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <Bot className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-stone-900 dark:text-white">
                    ChatGPT Custom GPT Actions (OpenAPI 3.1)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Connect ChatGPT directly in your browser with standard REST Actions
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                BROWSER CONNECTABLE
              </span>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
              ChatGPT connects to external services using <strong>OpenAPI Actions</strong>. You can create a Custom GPT in 60 seconds with zero app installs:
            </p>

            <div className="mt-3 p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">OpenAPI Spec URL</span>
                <code className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 select-all">
                  {effectiveOpenApiUrl}
                </code>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(openApiSchema || {}, null, 2),
                    'openApiSchema',
                    'OpenAPI 3.1 Schema'
                  )
                }
                className="px-3 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
              >
                {copiedKey === 'openApiSchema' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    <span>Copied Schema!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy OpenAPI JSON</span>
                  </>
                )}
              </button>
            </div>

            <ol className="mt-4 space-y-2 text-xs text-stone-600 dark:text-stone-300 border-t border-stone-100 dark:border-stone-800 pt-3">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div>
                  Go to <strong>chatgpt.com</strong> &gt; <strong>Explore GPTs</strong> &gt; <strong>Create a GPT</strong> &gt; <strong>Configure</strong>.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div>
                  Scroll down to <strong>Actions</strong> and click <strong>Create new action</strong>.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <div>
                  Click <strong>Copy OpenAPI JSON</strong> above, paste it into the Schema box, and set Authentication to <strong>None</strong>.
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: IN-APP INTERACTIVE AI COPILOT */}
      {/* ============================================================== */}
      {activeTab === 'copilot' && (
        <div className="space-y-3 mt-4 animate-fade-in">
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors flex flex-col h-[520px] ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            {/* Copilot Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#C44D34]/10 text-[#C44D34] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white">
                    PostNote Live Copilot
                  </h3>
                  <p className="text-[10px] text-stone-500">
                    Direct in-browser AI with full read/write tool access
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                READY TO CHAT
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 rounded-br-xs'
                        : 'bg-stone-100 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 rounded-bl-xs border border-stone-200 dark:border-stone-700/60'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {msg.toolCalled && (
                      <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700/70 text-[10px] font-mono text-[#C44D34] flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Invoked Tool: {msg.toolCalled}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-stone-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isCopilotSending && (
                <div className="flex items-center gap-2 text-xs text-stone-500 p-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C44D34]" />
                  <span>Copilot is inspecting calendar and executing tools...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto pb-2">
              <button
                onClick={() => handleSendMessage('Show me upcoming posts this week')}
                className="text-[10px] font-medium px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 whitespace-nowrap transition-colors"
              >
                📅 Upcoming posts
              </button>
              <button
                onClick={() =>
                  handleSendMessage('Draft a high-impact LinkedIn post for Codery about our new product update')
                }
                className="text-[10px] font-medium px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 whitespace-nowrap transition-colors"
              >
                ✍️ Draft LinkedIn post for Codery
              </button>
              <button
                onClick={() => handleSendMessage('Give me workspace health stats')}
                className="text-[10px] font-medium px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 whitespace-nowrap transition-colors"
              >
                📊 Workspace stats
              </button>
              <button
                onClick={() => handleSendMessage('List all active client workspaces')}
                className="text-[10px] font-medium px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 whitespace-nowrap transition-colors"
              >
                👥 List clients
              </button>
            </div>

            {/* Chat Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask Copilot to draft a post, change status, or query calendar..."
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-1 focus:ring-[#C44D34] text-stone-900 dark:text-white"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || isCopilotSending}
                className="p-2 rounded-xl bg-[#C44D34] hover:bg-[#A83E28] text-white disabled:opacity-40 transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: GEMINI 3.8 FLASH & FUNCTION CALLING */}
      {/* ============================================================== */}
      {activeTab === 'gemini' && (
        <div className="space-y-4 mt-4 animate-fade-in">
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-stone-900 dark:text-white">
                    Google Gemini 3.8 Flash Function Calling
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Use Google's modern @google/genai SDK to automate PostNote
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                GEMINI SDK
              </span>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
              PostNote exports 8 standard Function Declarations compatible with Gemini 3.8 Flash for programmatic autonomous agent workflows:
            </p>

            <div className="mt-3 p-3 rounded-xl bg-stone-900 text-stone-200 text-[11px] font-mono overflow-x-auto leading-relaxed border border-stone-800">
              <div className="text-stone-400 mb-1">// Tools endpoint: GET /api/gemini/tools</div>
              {geminiTools ? JSON.stringify(geminiTools, null, 2) : 'Loading tools...'}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: LIVE TESTER & INSPECTOR */}
      {/* ============================================================== */}
      {activeTab === 'inspector' && (
        <div className="space-y-3 mt-4 animate-fade-in">
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Live API & Tunnel Inspector
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Verify RFC 8414 discovery, MCP endpoints, and cloud tunnel health
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTunnelInfo}
                  className="px-2.5 py-1 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-medium"
                >
                  Refresh Info
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-xs space-y-1.5">
              <div><strong>Active Base URL:</strong> <code className="font-mono text-purple-600 dark:text-purple-400">{effectiveBaseUrl}</code></div>
              <div><strong>Tunnel Provider:</strong> {tunnelProvider === 'localtunnel' ? '🟢 Localtunnel (100% Free / Zero Card)' : '🟣 Cloudflare Tunnel'}</div>
              <div><strong>Subdomain:</strong> <code className="font-mono">{subdomainInput}.loca.lt</code></div>
              <div><strong>MCP Endpoint:</strong> <code className="font-mono">{effectiveMcpUrl}</code></div>
              <div><strong>OAuth RFC 8414:</strong> <code className="font-mono">{effectiveBaseUrl}/.well-known/oauth-authorization-server</code></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
