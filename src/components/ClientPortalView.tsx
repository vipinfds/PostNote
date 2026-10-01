import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
  Layers,
  MessageSquare,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Send,
  Eye,
} from 'lucide-react';
import { Client, Post, SubscriptionState } from '../types';
import { CATEGORY_COLORS } from '../utils/theme';

export type ClientPortalTab = 'overview' | 'upcoming' | 'analytics' | 'approvals' | 'calendar';

interface ClientPortalViewProps {
  client: Client;
  posts: Post[];
  subscription?: SubscriptionState;
  initialTab?: ClientPortalTab;
  isViewOnly?: boolean;
  isLockedPortal?: boolean;
  onApprovePost: (postId: string) => void;
  onRequestChanges: (postId: string, notes?: string) => void;
  onExit?: () => void;
  isDark?: boolean;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  client,
  posts,
  subscription,
  initialTab = 'overview',
  isViewOnly = false,
  isLockedPortal = false,
  onApprovePost,
  onRequestChanges,
  onExit,
  isDark,
}) => {
  // Normalize initialTab: 'approvals' -> 'overview', 'calendar' -> 'upcoming'
  const normalizedInitial =
    initialTab === 'approvals' ? 'overview' : initialTab === 'calendar' ? 'upcoming' : initialTab;
  const [activeTab, setActiveTab] = useState<'overview' | 'upcoming' | 'analytics'>(
    normalizedInitial as 'overview' | 'upcoming' | 'analytics'
  );
  const [feedbackPostId, setFeedbackPostId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');

  // Filter posts strictly for THIS client only (strict isolation)
  const clientPosts = posts.filter((p) => p.clientId === client.id);

  // Status groupings
  const pendingApprovals = clientPosts.filter((p) => p.status === 'In review');
  const approvedPosts = clientPosts.filter((p) => p.status === 'Approved');
  const scheduledPosts = clientPosts.filter((p) => p.status === 'Scheduled');
  const publishedPosts = clientPosts.filter((p) => p.status === 'Published');
  const plannedPosts = clientPosts.filter((p) => p.status === 'Planned');

  // Client Analytics metrics
  const totalPosts = clientPosts.length;
  const platformCounts: Record<string, number> = {};
  clientPosts.forEach((p) => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  });

  const categoryCounts: Record<string, number> = {};
  clientPosts.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  const platformEntries = Object.entries(platformCounts).map(([platform, count]) => ({
    platform,
    count,
    percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
  }));

  const categoryEntries = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count,
    percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
  }));

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackPostId) return;
    onRequestChanges(feedbackPostId, feedbackNote);
    setFeedbackPostId(null);
    setFeedbackNote('');
  };

  const filteredCalendarPosts = clientPosts
    .filter((p) => filterPlatform === 'all' || p.platform === filterPlatform)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div
      id="client-portal-view"
      className={`min-h-screen pb-24 px-4 sm:px-6 lg:px-8 pt-4 animate-fade-in transition-colors ${
        isDark ? 'bg-[#151C24] text-stone-100' : 'bg-[#FAF7F2] text-[#1E252B]'
      }`}
    >
      <div className="max-w-5xl mx-auto w-full">
        {/* Preview or Security Bar */}
        {!isLockedPortal && onExit ? (
          <div
            className={`mb-4 px-4 py-2.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                Agency Studio Preview: <strong>{client.name} Portal</strong>
              </span>
            </div>
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-bold shrink-0 hover:opacity-90 transition-opacity"
            >
              Exit Preview
            </button>
          </div>
        ) : (
          <div
            className={`mb-4 px-4 py-2 rounded-2xl border flex items-center justify-between text-xs ${
              isDark
                ? 'bg-[#18212B] border-[#283648] text-stone-300'
                : 'bg-white border-[#E8E2D8] text-stone-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold text-stone-900 dark:text-white">
                Private Client Portal
              </span>
              <span className="text-stone-400">•</span>
              <span className="truncate text-stone-500">
                Exclusive workspace for <strong>{client.name}</strong>
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] text-stone-400">
              Close tab to exit
            </span>
          </div>
        )}

      {/* Branded Portal Header */}
      <div
        className={`p-5 rounded-3xl border shadow-sm ${
          isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold shadow-xs shrink-0"
              style={{ backgroundColor: client.color || '#C44D34' }}
            >
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white font-serif">
                  {client.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                  Client Portal
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {client.handle} • Managed by First Draft Studio
              </p>
            </div>
          </div>
        </div>

        {client.notes && (
          <p className="text-xs text-stone-600 dark:text-stone-300 mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 leading-relaxed">
            {client.notes}
          </p>
        )}

        {/* Client Portal Tab Switcher (3 Tabs: Overview & Posts, Upcoming Content, Client Analytics) */}
        <div className="grid grid-cols-3 gap-1.5 mt-4 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'overview'
                ? isDark
                  ? 'bg-[#2A3644] text-white shadow-xs'
                  : 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="truncate">Overview Posts</span>
            {pendingApprovals.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C44D34] text-white text-[10px] flex items-center justify-center font-extrabold shrink-0">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'upcoming'
                ? isDark
                  ? 'bg-[#2A3644] text-white shadow-xs'
                  : 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="truncate">Upcoming Content</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold shrink-0">
              {scheduledPosts.length + plannedPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'analytics'
                ? isDark
                  ? 'bg-[#2A3644] text-white shadow-xs'
                  : 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="truncate">Client Analytics</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & POSTS */}
      {activeTab === 'overview' && (
        <div className="space-y-5 mt-4">
          {/* Key Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-xl font-extrabold text-stone-900 dark:text-white font-serif">
                {totalPosts}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Total Posts
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-xl font-extrabold text-amber-500 font-serif">
                {pendingApprovals.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Needs Sign-off
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-xl font-extrabold text-[#C44D34] font-serif">
                {scheduledPosts.length + plannedPosts.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Scheduled Pipeline
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-xl font-extrabold text-emerald-600 font-serif">
                {publishedPosts.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Published & Live
              </div>
            </div>
          </div>

          {/* Drafts Requiring Sign-off (if any) */}
          {pendingApprovals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Drafts Requiring Sign-off
                  </h2>
                </div>
                <span className="text-xs font-semibold text-stone-500">
                  {pendingApprovals.length} pending
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map((post) => {
                  const catColor = CATEGORY_COLORS[post.category]?.text || '#C44D34';
                  const catBg = CATEGORY_COLORS[post.category]?.bg || '#FDF2F0';

                  return (
                    <div
                      key={post.id}
                      className={`p-4 rounded-3xl border shadow-sm space-y-3 ${
                        isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                              style={{ color: catColor, backgroundColor: catBg }}
                            >
                              {post.category}
                            </span>
                            <span className="text-[11px] font-semibold text-stone-400">
                              {post.platform}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                            {post.title}
                          </h4>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                            {post.date}
                          </div>
                          <span className="text-[10px] font-bold text-amber-600 uppercase">
                            In Review
                          </span>
                        </div>
                      </div>

                      {/* Caption preview */}
                      <div
                        className={`p-3 rounded-xl text-xs leading-relaxed ${
                          isDark ? 'bg-[#141A21] text-stone-300' : 'bg-stone-50 text-stone-700'
                        }`}
                      >
                        {post.caption}
                      </div>

                      {/* Media item if present */}
                      {post.mediaUrl && (
                        <div className="rounded-xl overflow-hidden max-h-48 border border-stone-200 dark:border-stone-800">
                          <img
                            src={post.mediaUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Client Decision Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setFeedbackPostId(post.id)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            isDark
                              ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                              : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Request Changes</span>
                        </button>

                        <button
                          onClick={() => onApprovePost(post.id)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Approve Draft</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Client Posts Overview Feed */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                All Content Overview ({clientPosts.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {clientPosts.map((post) => {
                const catColor = CATEGORY_COLORS[post.category]?.text || '#C44D34';
                const catBg = CATEGORY_COLORS[post.category]?.bg || '#FDF2F0';

                return (
                  <div
                    key={post.id}
                    className={`p-3.5 rounded-2xl border shadow-xs space-y-2 ${
                      isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase"
                            style={{ color: catColor, backgroundColor: catBg }}
                          >
                            {post.category}
                          </span>
                          <span className="text-[11px] font-semibold text-stone-400">
                            {post.platform}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {post.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                          {post.date}
                        </span>
                        <div
                          className={`text-[10px] font-semibold capitalize mt-0.5 px-2 py-0.5 rounded-full inline-block ${
                            post.status === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : post.status === 'In review'
                              ? 'bg-amber-500/15 text-amber-600'
                              : post.status === 'Approved'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-stone-500/10 text-stone-500'
                          }`}
                        >
                          {post.status}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                      {post.caption}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPCOMING CONTENT */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4 mt-4">
          {/* Platform Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {['all', 'Instagram', 'LinkedIn', 'Twitter', 'Facebook', 'TikTok'].map((plat) => (
              <button
                key={plat}
                onClick={() => setFilterPlatform(plat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterPlatform === plat
                    ? 'bg-[#C44D34] text-white'
                    : isDark
                    ? 'bg-[#1D252F] text-stone-400 hover:text-white'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-[#E8E2D8]'
                }`}
              >
                {plat === 'all' ? 'All Platforms' : plat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredCalendarPosts.length === 0 ? (
              <div
                className={`p-8 rounded-3xl border text-center space-y-2 ${
                  isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
                }`}
              >
                <Clock className="w-8 h-8 mx-auto text-stone-400" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  No upcoming content found
                </h3>
                <p className="text-xs text-stone-500">
                  There are no scheduled posts for this filter. Check back soon!
                </p>
              </div>
            ) : (
              filteredCalendarPosts.map((post) => {
                const catColor = CATEGORY_COLORS[post.category]?.text || '#C44D34';
                const catBg = CATEGORY_COLORS[post.category]?.bg || '#FDF2F0';

                return (
                  <div
                    key={post.id}
                    className={`p-4 rounded-2xl border shadow-xs space-y-2 ${
                      isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase"
                            style={{ color: catColor, backgroundColor: catBg }}
                          >
                            {post.category}
                          </span>
                          <span className="text-[11px] font-semibold text-stone-400">
                            {post.platform}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                          {post.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                          {post.date}
                        </span>
                        <div
                          className={`text-[10px] font-semibold capitalize mt-0.5 px-2 py-0.5 rounded-full inline-block ${
                            post.status === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : post.status === 'In review'
                              ? 'bg-amber-500/15 text-amber-600'
                              : 'bg-[#C44D34]/10 text-[#C44D34]'
                          }`}
                        >
                          {post.status}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                      {post.caption}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLIENT SPECIFIC ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              {client.name} Performance Overview
            </h2>
            <span className="text-xs font-semibold text-stone-500">Live Insights</span>
          </div>

          {/* 4 Key Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-2xl font-extrabold text-stone-900 dark:text-white font-serif">
                {totalPosts}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Total Content Pieces
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-2xl font-extrabold text-emerald-600 font-serif">
                {publishedPosts.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Published & Live
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-2xl font-extrabold text-[#C44D34] font-serif">
                {approvedPosts.length + scheduledPosts.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Scheduled / Ready
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="text-2xl font-extrabold text-amber-600 font-serif">
                {pendingApprovals.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                Awaiting Signoff
              </div>
            </div>
          </div>

          {/* Responsive 2-column Grid for Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Distribution Bar */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Platform Distribution
            </h3>

            <div className="space-y-2.5">
              {platformEntries.map((item) => (
                <div key={item.platform} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-stone-700 dark:text-stone-300">{item.platform}</span>
                    <span className="text-stone-500">
                      {item.count} posts ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C44D34]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Pillar Breakdown */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Content Pillar Mix
            </h3>

            <div className="space-y-2.5">
              {categoryEntries.map((item) => {
                const catColor = CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS]?.dot || '#C44D34';
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-stone-700 dark:text-stone-300">{item.category}</span>
                      <span className="text-stone-500">
                        {item.count} posts ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.percent}%`, backgroundColor: catColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

          {/* Turnaround & Collaboration Velocity */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Review Speed & Velocity
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                <div className="text-base font-bold text-stone-900 dark:text-white">92%</div>
                <div className="text-[10px] text-stone-400 uppercase font-semibold">
                  First-Pass Approval
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                <div className="text-base font-bold text-stone-900 dark:text-white">1.2 Days</div>
                <div className="text-[10px] text-stone-400 uppercase font-semibold">
                  Average Sign-off
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revision Feedback Modal for Client */}
      {feedbackPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isDark ? 'bg-[#1D252F] border-[#2C3848] text-white' : 'bg-white border-[#E8E2D8] text-stone-900'
            }`}
          >
            <h3 className="text-base font-bold font-serif">Request Changes / Feedback</h3>
            <p className="text-xs text-stone-500">
              Explain what you would like the team to revise on this post draft.
            </p>
            <form onSubmit={handleSendFeedback} className="space-y-3">
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="e.g. Please swap the caption hook and adjust the headline..."
                required
                rows={3}
                className={`w-full p-3 rounded-xl border text-xs outline-hidden ${
                  isDark
                    ? 'bg-[#141A21] border-[#2C3848] text-white focus:border-[#C44D34]'
                    : 'bg-[#FAF7F2] border-stone-200 text-stone-900 focus:border-[#C44D34]'
                }`}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackPostId(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C44D34] text-white text-xs font-bold"
                >
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
