import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Eye,
  Lock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Client, Post } from '../types';
import { normalizePostStatus } from '../utils/theme';

export type ShareLinkPreset =
  | 'overview'
  | 'approvals'
  | 'calendar'
  | 'upcoming'
  | 'analytics';

interface ClientShareModalProps {
  client: Client;
  posts: Post[];
  onClose: () => void;
  onOpenLivePortal?: (
    initialTab: 'overview' | 'approvals' | 'upcoming' | 'analytics' | 'calendar',
    isViewOnly: boolean
  ) => void;
  isDark?: boolean;
}

export const ClientShareModal: React.FC<ClientShareModalProps> = ({
  client,
  posts,
  onClose,
  onOpenLivePortal,
  isDark,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const clientPosts = posts.filter((p) => p.clientId === client.id);
  const inReviewCount = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'In review'
  ).length;
  const approvedCount = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Approved'
  ).length;
  const scheduledCount = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Scheduled'
  ).length;

  // Deterministic client token
  const clientSecretToken = React.useMemo(() => {
    const clean = client.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `pn_${clean}_live`;
  }, [client.id]);

  // Single Unified All-in-One Share Link (Overview, Approvals, Calendar, Posts & Client Analytics)
  const shareUrl = React.useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://postnote.studio';
    return `${origin}/?portal=${encodeURIComponent(client.id)}&token=${clientSecretToken}`;
  }, [client.id, clientSecretToken]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div
      id="client-share-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="client-share-modal"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#1A2129] border-[#2A3440] text-stone-100'
            : 'bg-[#FAF7F2] border-[#E6E2D8] text-[#1E252B]'
        }`}
      >
        {/* Top Header */}
        <div className="px-5 pt-5 pb-3.5 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
              style={{ backgroundColor: client.color }}
            >
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight">
                  Share {client.name} Portal
                </h3>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>All-in-One Link</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Includes Overview, Approvals, Monthly Calendar, Posts &amp; Analytics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Quick Summary Strip */}
          <div
            className={`p-3 rounded-2xl border grid grid-cols-4 gap-2 text-center tabular-nums ${
              isDark ? 'bg-[#141A21] border-[#252E3A]' : 'bg-white border-[#EAE6DF]'
            }`}
          >
            <div>
              <div className="text-sm font-extrabold">{clientPosts.length}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                Posts
              </div>
            </div>
            <div className="border-l border-stone-200 dark:border-stone-800">
              <div className="text-sm font-extrabold text-amber-500">
                {inReviewCount}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                In Review
              </div>
            </div>
            <div className="border-l border-stone-200 dark:border-stone-800">
              <div className="text-sm font-extrabold text-emerald-500">
                {approvedCount}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                Approved
              </div>
            </div>
            <div className="border-l border-stone-200 dark:border-stone-800">
              <div className="text-sm font-extrabold text-blue-500">
                {scheduledCount}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                Scheduled
              </div>
            </div>
          </div>

          {/* Generated Link Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>All-in-One Client Portal Link</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Strictly isolated to {client.name}
              </span>
            </div>

            <div
              className={`p-2 rounded-2xl border flex items-center gap-2 ${
                isDark ? 'bg-[#141A21] border-[#252E3A]' : 'bg-white border-[#EAE6DF]'
              }`}
            >
              <div className="flex items-center gap-2 pl-2 flex-1 min-w-0">
                <Share2 className="w-3.5 h-3.5 text-[#C44D34] shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-transparent text-xs font-mono text-stone-600 dark:text-stone-300 focus:outline-none truncate"
                />
              </div>

              <button
                id="copy-share-link-btn"
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#181E24] hover:bg-black text-white dark:bg-[#C44D34] dark:hover:bg-[#b0432c]'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Portal Preview Button */}
          {onOpenLivePortal && (
            <div className="pt-1">
              <button
                id="open-live-client-portal-btn"
                onClick={() => onOpenLivePortal('overview', false)}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#C44D34] hover:bg-[#af422b] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Open Client Portal</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
