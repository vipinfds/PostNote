import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';

interface AiAssistantsViewProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
  isDark?: boolean;
}

export const AiAssistantsView: React.FC<AiAssistantsViewProps> = ({
  onBack,
  onShowToast,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);
  const mcpUrl = 'https://preview--postnote.run.app/mcp';

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    onShowToast('Copied MCP URL');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="ai-assistants-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h2 className="text-base font-bold tracking-tight">Connect AI assistants</h2>
        </div>
      </div>

      <p className="text-xs text-stone-600 dark:text-stone-400 mt-4 leading-relaxed px-1">
        Let Claude, ChatGPT and other tools read and write your PostNote content directly.
      </p>

      {/* MCP URL Box */}
      <div
        className={`mt-4 p-4 rounded-2xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          YOUR MCP SERVER URL
        </span>

        <div className="flex items-center justify-between gap-2 mt-2 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60">
          <code className="text-xs font-mono text-stone-800 dark:text-stone-200 truncate">
            {mcpUrl}
          </code>

          <button
            onClick={handleCopy}
            className="px-3 py-1 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center gap-1 shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="space-y-3 mt-4">
        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              1. Claude
            </h3>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#C44D34]/10 text-[#C44D34]">
              FASTEST WAY IN
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
            Open Claude Desktop Settings &gt; Developer &gt; Edit Config, and paste your PostNote MCP server snippet to manage posts and drafts seamlessly.
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              2. ChatGPT
            </h3>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-500">
              NEEDS DEVELOPER MODE
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
            Configure custom GPT Actions with the PostNote OpenAPI schema to compose social content and schedule into your calendar.
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              3. Custom AI Clients
            </h3>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-500">
              ANY OTHER AI CLIENT
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
            Works out-of-the-box with Cursor, Windsurf, LangChain, or any tool that implements the Model Context Protocol (MCP).
          </p>
        </div>
      </div>
    </div>
  );
};
