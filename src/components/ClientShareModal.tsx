import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Eye,
  Lock,
  Sparkles,
  Share2,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';
import { Client } from '../types';

interface ClientShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onOpenPortalPreview: () => void;
  isDark?: boolean;
}

export const ClientShareModal: React.FC<ClientShareModalProps> = ({
  isOpen,
  onClose,
  client,
  onOpenPortalPreview,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [allowApprovals, setAllowApprovals] = useState(true);
  const [allowAnalytics, setAllowAnalytics] = useState(true);
  const [allowFeedback, setAllowFeedback] = useState(true);
  const [activeUrlType, setActiveUrlType] = useState<'standard' | 'hash'>('standard');

  const uniqueToken = React.useMemo(() => {
    let hash = 5381;
    const str = `${client.id}-view-only-analytics`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  }, [client.id]);

  // Determine origins:
  // In Google AI Studio, ais-dev-*.run.app is a private authenticated developer instance.
  // The public shared instance accessible by clients is ais-pre-*.run.app.
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isDevOrigin = rawOrigin.includes('ais-dev-');
  const publicOrigin = isDevOrigin ? rawOrigin.replace('ais-dev-', 'ais-pre-') : rawOrigin;

  // 1. Standard Query Param URL with resilient client payload
  const standardShareableUrl = `${publicOrigin}/?portal=${encodeURIComponent(
    client.id
  )}&name=${encodeURIComponent(client.name)}&handle=${encodeURIComponent(
    client.handle
  )}&color=${encodeURIComponent(client.color || '#C44D34')}&view=analytics&token=${uniqueToken}`;

  // 2. Hash Route Alternative (100% immune to server routing configurations)
  const hashShareableUrl = `${publicOrigin}/#/portal/${encodeURIComponent(
    client.id
  )}?name=${encodeURIComponent(client.name)}&handle=${encodeURIComponent(
    client.handle
  )}&view=analytics&token=${uniqueToken}`;

  const currentActiveUrl = activeUrlType === 'standard' ? standardShareableUrl : hashShareableUrl;

  // Register portal on server store when modal opens
  useEffect(() => {
    if (!isOpen) return;
    try {
      fetch('/api/portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          client,
          permissions: { allowApprovals, allowAnalytics, allowFeedback },
        }),
      }).catch((e) => {
        console.warn('Portal server sync notice:', e);
      });
    } catch {}
  }, [isOpen, client, allowApprovals, allowAnalytics, allowFeedback]);

  if (!isOpen) return null;

  const handleCopyLink = (url: string, isHash = false) => {
    navigator.clipboard.writeText(url);
    if (isHash) {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2200);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(
      `Hi ${client.name}! Here is your direct link to view your live PostNote analytics and content performance: ${currentActiveUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`${client.name} - View-Only Content Analytics`);
    const body = encodeURIComponent(
      `Hi ${client.name} team,\n\nHere is your unique view-only link to inspect your company's live content analytics, platform performance, and publication velocity:\n\n${currentActiveUrl}\n\nNo sign-in required. This link provides view-only access to your brand's performance metrics.\n\nBest,\nFirst Draft Studio`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div
      id="client-share-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        id="client-share-modal-container"
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-2xl transition-all max-h-[92vh] flex flex-col overflow-hidden animate-slide-up ${
          isDark
            ? 'bg-[#182028] border-[#2A3644] text-stone-100'
            : 'bg-[#FAF8F5] border-[#E5E0D8] text-[#1E252B]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-[#26313E] bg-[#151C24]' : 'border-[#EDE8E0] bg-[#F4EFE9]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
              style={{ backgroundColor: client.color || '#C44D34' }}
            >
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Share Client Portal</h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Direct view for {client.name} team
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Explanation Banner */}
          <div
            className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
              isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-white mb-1">
              <Sparkles className="w-4 h-4 text-[#C44D34]" />
              <span>Direct Link for {client.name}</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-[11px]">
              Share this link with <strong>{client.name}</strong>. They can view upcoming posts,
              sign off on drafts, and track company analytics anytime without needing a login.
            </p>
          </div>

          {/* Public Access Badge */}
          {isDevOrigin && (
            <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Public Access Fixed:</strong> Link is automatically generated for the public domain (<code>ais-pre-*.run.app</code>) so outside clients won’t see “Page not found”.
              </span>
            </div>
          )}

          {/* URL Mode Switcher Tabs */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Format:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-stone-100 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700">
              <button
                onClick={() => setActiveUrlType('standard')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  activeUrlType === 'standard'
                    ? 'bg-[#C44D34] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Standard URL
              </button>
              <button
                onClick={() => setActiveUrlType('hash')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  activeUrlType === 'hash'
                    ? 'bg-[#C44D34] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Hash Route (#)
              </button>
            </div>
          </div>

          {/* Shareable Link Input Box */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Sharable Link (No Login Required)
            </label>
            <div
              className={`flex items-center gap-2 p-2 rounded-xl border ${
                isDark ? 'bg-[#141A21] border-[#2C3848]' : 'bg-[#F2ECE2] border-[#DDD7CE]'
              }`}
            >
              <input
                type="text"
                readOnly
                value={currentActiveUrl}
                className="bg-transparent flex-1 text-xs font-mono outline-hidden select-all text-stone-800 dark:text-stone-200 px-1 truncate"
              />
              <button
                onClick={() => handleCopyLink(currentActiveUrl, activeUrlType === 'hash')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  (activeUrlType === 'standard' ? copied : copiedHash)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#C44D34] hover:bg-[#B03E26] text-white shadow-xs'
                }`}
              >
                {(activeUrlType === 'standard' ? copied : copiedHash) ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleSendWhatsApp}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                isDark
                  ? 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share WhatsApp</span>
            </button>

            <button
              onClick={handleSendEmail}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                isDark
                  ? 'border-stone-700 hover:bg-stone-800 text-stone-300'
                  : 'border-stone-200 hover:bg-stone-100 text-stone-700'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Email Link</span>
            </button>
          </div>

          {/* Portal Settings & Permissions */}
          <div
            className={`p-3.5 rounded-2xl border space-y-2.5 ${
              isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Client Portal Permissions
            </div>

            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <span className="text-stone-700 dark:text-stone-300 font-medium">
                1-Click Post Approvals (Approve / Request Revisions)
              </span>
              <input
                type="checkbox"
                checked={allowApprovals}
                onChange={(e) => setAllowApprovals(e.target.checked)}
                className="accent-[#C44D34] w-4 h-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <span className="text-stone-700 dark:text-stone-300 font-medium">
                Live Company Analytics Dashboard
              </span>
              <input
                type="checkbox"
                checked={allowAnalytics}
                onChange={(e) => setAllowAnalytics(e.target.checked)}
                className="accent-[#C44D34] w-4 h-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <span className="text-stone-700 dark:text-stone-300 font-medium">
                Allow Client Comments & Feedback
              </span>
              <input
                type="checkbox"
                checked={allowFeedback}
                onChange={(e) => setAllowFeedback(e.target.checked)}
                className="accent-[#C44D34] w-4 h-4 rounded"
              />
            </label>
          </div>

          {/* Actions: Test in New Window & Studio Preview */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                window.open(currentActiveUrl, '_blank');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                isDark
                  ? 'border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700'
                  : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Link (New Tab)</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenPortalPreview();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#181E24] hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview in App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
