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
} from 'lucide-react';
import { Client, Post } from '../types';
import { CATEGORY_COLORS } from '../utils/theme';
import { ClientShareModal } from './ClientShareModal';

interface ClientDetailViewProps {
  client: Client;
  posts: Post[];
  onBack: () => void;
  onNewPostForClient: (clientId: string) => void;
  onEditPost: (post: Post) => void;
  onOpenPortal: (client: Client, initialTab?: 'approvals' | 'calendar' | 'analytics', isViewOnly?: boolean) => void;
  isDark?: boolean;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  posts,
  onBack,
  onNewPostForClient,
  onEditPost,
  onOpenPortal,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Bar with Back, Title, Share & + New Post Button */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 gap-2">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors shrink-0"
          aria-label="Back to clients"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <div className="text-center flex-1 min-w-0">
          <div className="flex items-center justify-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: client.color || '#C44D34' }}
            />
            <h2 className="text-base font-bold tracking-tight truncate">{client.name}</h2>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium truncate">
            {client.handle}
          </p>
        </div>

        {/* Action Buttons: Share Portal & New Post */}
        <div className="flex items-center gap-1.5 shrink-0">
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
            <span>Share Portal</span>
          </button>

          <button
            onClick={() => onNewPostForClient(client.id)}
            className="px-3 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New post</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Switcher: Overview vs Analytics */}
      <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/70">
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

      {/* TAB 1: OVERVIEW & POSTS */}
      {activeTab === 'overview' && (
        <div className="space-y-4 mt-4">
          {/* Bio / Description */}
          {client.notes && (
            <p className="text-xs text-stone-600 dark:text-stone-400 px-1 leading-relaxed">
              {client.notes}
            </p>
          )}

          {/* Share Portal Banner Shortcut */}
          <div
            onClick={() => setIsShareModalOpen(true)}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer group transition-all ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#232C36]'
                : 'bg-white border-[#E8E4DC] hover:border-[#C44D34]/50 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#C44D34]/15 text-[#C44D34] flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-white">
                  Client Portal Link Ready
                </div>
                <div className="text-[10px] text-stone-500">
                  Allow {client.name} to view their calendar & analytics
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#C44D34] uppercase tracking-wide group-hover:underline">
              Share →
            </span>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-xl font-extrabold text-stone-900 dark:text-white">
                {totalPosts}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
                TOTAL POSTS
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-xl font-extrabold text-amber-600">
                {inReviewCount}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
                IN REVIEW
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-xl font-extrabold text-stone-900 dark:text-white">
                {scheduledCount + approvedCount}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
                SCHEDULED
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-center ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="text-xl font-extrabold text-emerald-600">
                {publishedCount}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
                PUBLISHED
              </div>
            </div>
          </div>

          {/* Posts by Type Progress Bars */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
              POSTS BY TYPE
            </h3>

            <div className="space-y-3">
              {typeEntries.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-2">No post categories yet</p>
              ) : (
                typeEntries.map((item) => {
                  const catColor = CATEGORY_COLORS[item.category]?.dot || '#C44D34';
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-700 dark:text-stone-300 text-[11px]">
                          {item.category}
                        </span>
                        <span className="text-[11px] font-bold text-stone-500">
                          {item.count} · {item.percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: catColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Posts */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
              UPCOMING POSTS
            </h3>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {upcomingPosts.length === 0 ? (
                <p className="text-xs text-stone-500 py-3 text-center">No upcoming posts.</p>
              ) : (
                upcomingPosts.map((post) => {
                  const catColor = CATEGORY_COLORS[post.category]?.text || '#C44D34';
                  const catBg = CATEGORY_COLORS[post.category]?.bg || '#FDF2F0';

                  return (
                    <div
                      key={post.id}
                      onClick={() => onEditPost(post)}
                      className="py-2.5 flex items-center justify-between gap-2 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 px-1 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-stone-500 dark:text-stone-400 shrink-0 w-12">
                          {formatShortDate(post.date)}
                        </span>
                        <span
                          className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                          style={{ color: catColor, backgroundColor: catBg }}
                        >
                          {post.category}
                        </span>
                        <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {post.title}
                        </span>
                      </div>

                      <span className="text-[11px] text-stone-400 font-medium shrink-0">
                        {post.platform}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENT SPECIFIC ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 mt-4">
          {/* Analytics Header Ribbon with Share CTA */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 ${
              isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {client.name} Dedicated Analytics
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-300 font-medium mt-0.5">
                Share live access with {client.name}
              </div>
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#C44D34] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share View</span>
            </button>
          </div>

          {/* Performance KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-stone-400">Est. Reach</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-serif text-stone-900 dark:text-white">
                {estImpressions.toLocaleString()}
              </div>
              <p className="text-[10px] text-stone-500 mt-1">Impressions across active platforms</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-stone-400">Engagement</span>
                <Sparkles className="w-3.5 h-3.5 text-[#C44D34]" />
              </div>
              <div className="text-2xl font-bold font-serif text-[#C44D34]">
                {estEngagementRate}%
              </div>
              <p className="text-[10px] text-stone-500 mt-1">Average interaction rate</p>
            </div>
          </div>

          {/* Platform Breakdown for this Client */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Platform Breakdown ({client.name})
            </h3>

            <div className="space-y-2.5">
              {platformEntries.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-2">No platforms assigned</p>
              ) : (
                platformEntries.map((item) => (
                  <div key={item.platform} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-stone-800 dark:text-stone-200">{item.platform}</span>
                      <span className="text-stone-500">
                        {item.count} posts ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Approval Velocity */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Review & Turnaround Velocity
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                <div className="text-base font-bold text-stone-900 dark:text-white">
                  {approvedCount + publishedCount} / {totalPosts}
                </div>
                <div className="text-[10px] text-stone-400 uppercase font-semibold">
                  Approved or Live
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                <div className="text-base font-bold text-emerald-600">
                  {inReviewCount === 0 ? 'Zero Backlog' : `${inReviewCount} In Review`}
                </div>
                <div className="text-[10px] text-stone-400 uppercase font-semibold">
                  Queue Health
                </div>
              </div>
            </div>
          </div>

          {/* Open Client View Preview directly */}
          <button
            onClick={() => onOpenPortal(client, 'analytics', true)}
            className="w-full py-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview View-Only Analytics as {client.name}</span>
          </button>
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
