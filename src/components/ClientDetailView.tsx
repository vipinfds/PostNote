import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  BarChart3,
  Share2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Clock,
  Eye,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Client, Post } from '../types';
import { CATEGORY_COLORS, STATUS_STYLES } from '../utils/theme';
import { ClientShareModal } from './ClientShareModal';

interface ClientDetailViewProps {
  client: Client;
  posts: Post[];
  initialTab?: 'overview' | 'analytics';
  onBack: () => void;
  onNewPostForClient: (clientId: string) => void;
  onEditPost: (post: Post) => void;
  onOpenPortal: (client: Client, initialTab?: 'approvals' | 'calendar' | 'analytics', isViewOnly?: boolean) => void;
  isDark?: boolean;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  posts,
  initialTab = 'overview',
  onBack,
  onNewPostForClient,
  onEditPost,
  onOpenPortal,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>(initialTab);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'all'>('30d');

  const clientPosts = posts.filter((p) => p.clientId === client.id);

  // Statistics
  const totalPosts = clientPosts.length;
  const plannedCount = clientPosts.filter((p) => p.status === 'Planned').length;
  const inReviewCount = clientPosts.filter((p) => p.status === 'In review').length;
  const scheduledCount = clientPosts.filter((p) => p.status === 'Scheduled').length;
  const publishedCount = clientPosts.filter((p) => p.status === 'Published').length;
  const approvedCount = clientPosts.filter((p) => p.status === 'Approved').length;

  // Posts by type distribution
  const typeCounts: Record<string, number> = {};
  clientPosts.forEach((p) => {
    typeCounts[p.category] = (typeCounts[p.category] || 0) + 1;
  });

  const typeEntries = Object.entries(typeCounts).map(([cat, count]) => ({
    category: cat as keyof typeof CATEGORY_COLORS,
    count,
    percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
  }));

  // Platform distribution
  const platformCounts: Record<string, number> = {};
  clientPosts.forEach((p) => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  });

  const platformColors: Record<string, string> = {
    Instagram: '#E1306C',
    Facebook: '#1877F2',
    LinkedIn: '#0A66C2',
    TikTok: '#00F2FE',
    Twitter: '#1DA1F2',
    Other: '#8E8E93',
  };

  const platformEntries = Object.entries(platformCounts).map(([platform, count]) => ({
    platform,
    count,
    color: platformColors[platform] || '#8E8E93',
    percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
  }));

  // Upcoming / planned / scheduled posts sorted by date
  const upcomingPosts = clientPosts
    .filter((p) => p.status !== 'Published')
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[monthIndex]} ${day}`;
    } catch {
      return dateStr;
    }
  };

  // Performance simulation metrics
  const estImpressions = (publishedCount * 3420) + (scheduledCount * 1200);
  const estEngagementRate = totalPosts > 0 ? (4.2 + (publishedCount * 0.1)).toFixed(1) : '0.0';

  return (
    <div
      id="client-detail-view"
      className={`min-h-[780px] pb-24 px-4 sm:px-6 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Bar with Back, Title, Top Direct Analytics Button, Share Portal & + New Post Button */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors shrink-0"
            aria-label="Back to clients"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/20"
              style={{ backgroundColor: client.color || '#C44D34' }}
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">{client.name}</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium truncate">
                {client.handle}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Top Analytics Direct Button, Share Portal & New Post */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Direct Top Analytics Button */}
          <button
            id="top-analytics-btn"
            onClick={() => setActiveTab('analytics')}
            className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              activeTab === 'analytics'
                ? 'bg-[#C44D34] text-white border-[#C44D34]'
                : isDark
                ? 'border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700 hover:border-[#C44D34]/60'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:border-[#C44D34]/60'
            }`}
            title={`View ${client.name} Analytics directly`}
          >
            <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'analytics' ? 'text-white' : 'text-[#C44D34]'}`} />
            <span>Analytics</span>
          </button>

          {/* Share Portal Button */}
          <button
            id="share-portal-btn"
            onClick={() => setIsShareModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              isDark
                ? 'border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700 hover:border-[#C44D34]/60'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:border-[#C44D34]/60'
            }`}
            title="Generate unique sharable URL for client analytics"
          >
            <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
            <span className="hidden sm:inline">Share Portal</span>
            <span className="sm:hidden">Share</span>
          </button>

          {/* New Post Button */}
          <button
            onClick={() => onNewPostForClient(client.id)}
            className="px-3 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New post</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Switcher: Overview vs Analytics */}
      <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/70 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'overview'
              ? isDark
                ? 'bg-[#2A3644] text-white shadow-xs'
                : 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overview & Posts</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'analytics'
              ? isDark
                ? 'bg-[#2A3644] text-white shadow-xs'
                : 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#C44D34]" />
          <span>Client Analytics</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & POSTS (Responsive 2-column on tablet/PC) */}
      {activeTab === 'overview' && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (lg:col-span-5): Bio, 4 Key Stat Cards, Content Distributions */}
          <div className="lg:col-span-5 space-y-4">
            {/* Bio / Description */}
            {client.notes && (
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440] text-stone-300' : 'bg-white border-[#E8E4DC] text-stone-600'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Brand Focus & Notes
                </div>
                {client.notes}
              </div>
            )}

            {/* 4 Stat Cards in 2x2 grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className={`p-3.5 rounded-2xl border text-center transition-colors ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="text-2xl font-black text-stone-900 dark:text-white">
                  {totalPosts}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                  Total Posts
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border text-center transition-colors ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="text-2xl font-black text-[#C44D34]">
                  {inReviewCount}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                  In Review
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border text-center transition-colors ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="text-2xl font-black text-amber-500">
                  {scheduledCount}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                  Scheduled
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border text-center transition-colors ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="text-2xl font-black text-emerald-600">
                  {publishedCount}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                  Published
                </div>
              </div>
            </div>

            {/* Content Category Distribution */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                Content Pillars Mix
              </h3>
              {typeEntries.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">No posts recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {typeEntries.map((item) => {
                    const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.POST;
                    return (
                      <div key={item.category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: catStyle.dot }}
                            />
                            <span className="font-semibold text-stone-700 dark:text-stone-300">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-stone-500">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.percent}%`, backgroundColor: catStyle.dot }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Share Banner */}
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                isDark
                  ? 'bg-[#18222E] border-[#273545] text-stone-200'
                  : 'bg-stone-50 border-stone-200 text-stone-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#C44D34] shrink-0" />
                <span className="text-xs font-semibold">Share client view with {client.name}</span>
              </div>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-[#C44D34] text-white text-[11px] font-bold shrink-0 hover:bg-[#B33E26] transition-colors"
              >
                Get Link
              </button>
            </div>
          </div>

          {/* Right Column (lg:col-span-7): Upcoming & Scheduled Content Queue */}
          <div className="lg:col-span-7 space-y-4">
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Upcoming Content ({upcomingPosts.length})
                </h3>
                <button
                  onClick={() => onNewPostForClient(client.id)}
                  className="text-xs font-bold text-[#C44D34] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add post</span>
                </button>
              </div>

              {upcomingPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-stone-400">No upcoming posts scheduled.</p>
                  <button
                    onClick={() => onNewPostForClient(client.id)}
                    className="mt-2 text-xs font-bold text-[#C44D34] hover:underline"
                  >
                    + Schedule first post for {client.name}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingPosts.map((post) => {
                    const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                    const statStyle = STATUS_STYLES[post.status] || STATUS_STYLES.Planned;

                    return (
                      <div
                        key={post.id}
                        onClick={() => onEditPost(post)}
                        className={`p-3 rounded-xl border cursor-pointer hover:border-[#C44D34] transition-all flex items-center justify-between gap-3 ${
                          isDark
                            ? 'bg-[#151D25] border-[#24303E] hover:bg-[#1B2530]'
                            : 'bg-[#FAF8F5] border-[#E8E4DC] hover:bg-stone-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs mb-1">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: catStyle.dot }}
                            />
                            <span
                              className="font-bold text-[9px] uppercase tracking-wider"
                              style={{ color: catStyle.text }}
                            >
                              {post.category}
                            </span>
                            <span className="text-stone-400">•</span>
                            <span className="text-[11px] text-stone-500 font-medium">
                              {post.platform}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                            {post.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                            {post.caption}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                            {formatShortDate(post.date)}
                          </div>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 inline-block ${statStyle.badge}`}
                          >
                            {statStyle.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENT SPECIFIC ANALYTICS (Rich Responsive Dashboard for Tablet and PC) */}
      {activeTab === 'analytics' && (
        <div className="mt-4 space-y-5">
          {/* Header Row: Title & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                {client.name} Content Analytics & Velocity
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Direct metrics, approval velocity, and audience performance
              </p>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
              {(['30d', '90d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    timeRange === r
                      ? 'bg-[#C44D34] text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {r === '30d' ? 'Last 30 Days' : r === '90d' ? 'Last Quarter' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Metric KPI Cards across (responsive 2 cols on mobile, 4 cols on tablet/PC) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-2xl font-black text-stone-900 dark:text-white font-serif">
                {estImpressions.toLocaleString()}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                Est. Impressions
              </div>
              <span className="text-[10px] text-emerald-500 font-bold mt-1 inline-flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> +18.4% vs last mo
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-2xl font-black text-[#C44D34] font-serif">
                {estEngagementRate}%
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                Engagement Rate
              </div>
              <span className="text-[10px] text-emerald-500 font-bold mt-1 inline-flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> +2.1% benchmark
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-2xl font-black text-emerald-600 font-serif">
                {publishedCount} / {totalPosts}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                Content Delivered
              </div>
              <span className="text-[10px] text-stone-400 font-semibold mt-1 block">
                {scheduledCount} scheduled
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-2xl font-black text-amber-500 font-serif">
                {inReviewCount === 0 ? '0' : inReviewCount}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                Pending Client Review
              </div>
              <span className="text-[10px] text-stone-400 font-semibold mt-1 block">
                {inReviewCount === 0 ? 'All caught up' : 'Awaiting sign-off'}
              </span>
            </div>
          </div>

          {/* Responsive 2-column Grid for Charts on Tablet / PC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Platform Reach & Share */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                Platform Share for {client.name}
              </h4>
              <div className="space-y-3">
                {platformEntries.map((p) => (
                  <div key={p.platform}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {p.platform}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-stone-500">
                        {p.count} posts ({p.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.percent}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Status Breakdown & Approval Velocity */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                Content Pipeline Health
              </h4>
              <div className="space-y-3">
                {[
                  { label: 'Published & Live', count: publishedCount, color: '#16A34A' },
                  { label: 'Approved & Scheduled', count: scheduledCount + approvedCount, color: '#2563EB' },
                  { label: 'In Review (Client Side)', count: inReviewCount, color: '#D97706' },
                  { label: 'In Draft / Planned', count: plannedCount, color: '#9CA3AF' },
                ].map((s) => {
                  const pct = totalPosts > 0 ? Math.round((s.count / totalPosts) * 100) : 0;
                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-stone-700 dark:text-stone-300">
                          {s.label}
                        </span>
                        <span className="text-[11px] font-bold text-stone-500">
                          {s.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Share Portal Callout Card */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              isDark
                ? 'bg-[#182330] border-[#29384A] text-stone-100'
                : 'bg-[#FDF9F5] border-[#E8DFC0] text-[#1E252B]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#C44D34]" />
                <h4 className="text-sm font-bold tracking-tight">
                  Share this view with {client.name}
                </h4>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xl">
                Send a unique view-only link so {client.name} can open and inspect their own company analytics and upcoming posts without logging into your agency workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => onOpenPortal(client, 'analytics', true)}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  isDark
                    ? 'border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700'
                    : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview View</span>
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Client Portal Modal */}
      <ClientShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        client={client}
        onOpenPortalPreview={() => onOpenPortal(client, 'analytics', true)}
        isDark={isDark}
      />
    </div>
  );
};
