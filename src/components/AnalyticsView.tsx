import React, { useState } from 'react';
import { ArrowLeft, X, ChevronRight, Activity } from 'lucide-react';
import { Post, Client, PostStatus } from '../types';
import {
  POST_STAGES,
  STATUS_STYLES,
  CATEGORY_COLORS,
  normalizePostStatus,
} from '../utils/theme';
import { StatusStageBadge } from './StatusStageBadge';
import { PlatformLogo } from './PlatformLogo';

interface AnalyticsViewProps {
  posts: Post[];
  clients: Client[];
  onBack: () => void;
  onSelectPost?: (post: Post) => void;
  isDark?: boolean;
}

type DrillDownFilter =
  | { type: 'all'; label: string }
  | { type: 'status'; status: PostStatus; label: string }
  | { type: 'client'; clientId: string; clientName: string; label: string }
  | { type: 'platform'; platform: string; label: string };

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  posts,
  clients,
  onBack,
  onSelectPost,
  isDark,
}) => {
  const [hoveredClient, setHoveredClient] = useState<{
    name: string;
    count: number;
  } | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<{
    status: PostStatus;
    count: number;
  } | null>(null);
  const [activeDrillDown, setActiveDrillDown] = useState<DrillDownFilter | null>({
    type: 'all',
    label: 'All Posts',
  });

  const totalPosts = posts.length;
  const plannedCount = posts.filter((p) => normalizePostStatus(p.status) === 'Planned').length;
  const inReviewCount = posts.filter((p) => normalizePostStatus(p.status) === 'In review').length;
  const approvedCount = posts.filter((p) => normalizePostStatus(p.status) === 'Approved').length;
  const scheduledCount = posts.filter((p) => normalizePostStatus(p.status) === 'Scheduled').length;

  // Posts per client
  const clientData = clients.map((c) => {
    const count = posts.filter((p) => p.clientId === c.id).length;
    return { id: c.id, name: c.name, count, color: c.color || '#C44D34' };
  });

  const maxClientCount = Math.max(...clientData.map((d) => d.count), 1);

  // Platform distribution (using brand logos instead of color coding)
  const platformCounts: Record<string, number> = {};
  posts.forEach((p) => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  });

  const platformEntries = Object.entries(platformCounts)
    .map(([platform, count]) => ({
      platform,
      count,
      percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const maxPlatformCount = Math.max(...platformEntries.map((p) => p.count), 1);

  // 4-Stage breakdown
  const statusData = POST_STAGES.map((st) => {
    const count = posts.filter((p) => normalizePostStatus(p.status) === st).length;
    return { status: st, count, hex: STATUS_STYLES[st].hex };
  });
  const maxStatusCount = Math.max(...statusData.map((s) => s.count), 1);

  // Compute drill-down posts
  const drillDownPosts = React.useMemo(() => {
    if (!activeDrillDown) return [];
    if (activeDrillDown.type === 'all') {
      return posts.slice().sort((a, b) => b.date.localeCompare(a.date));
    }
    if (activeDrillDown.type === 'status') {
      return posts
        .filter((p) => normalizePostStatus(p.status) === activeDrillDown.status)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    if (activeDrillDown.type === 'client') {
      return posts
        .filter(
          (p) =>
            p.clientId === activeDrillDown.clientId ||
            p.clientName === activeDrillDown.clientName
        )
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    if (activeDrillDown.type === 'platform') {
      return posts
        .filter((p) => p.platform === activeDrillDown.platform)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    return [];
  }, [activeDrillDown, posts]);

  const isMetricSelected = (check: DrillDownFilter) => {
    if (!activeDrillDown) return false;
    if (activeDrillDown.type !== check.type) return false;
    if (check.type === 'all') return true;
    if (check.type === 'status' && activeDrillDown.type === 'status') {
      return activeDrillDown.status === check.status;
    }
    if (check.type === 'client' && activeDrillDown.type === 'client') {
      return activeDrillDown.clientId === check.clientId;
    }
    if (check.type === 'platform' && activeDrillDown.type === 'platform') {
      return activeDrillDown.platform === check.platform;
    }
    return false;
  };

  return (
    <div
      id="analytics-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Analytics</h2>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-2 tabular-nums">
              <span>{totalPosts} POSTS</span>
              <span>•</span>
              <span>{clients.length} CLIENTS</span>
              <span>•</span>
              <span className="text-[#C44D34]">CLICK ANY METRIC TO VIEW POSTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Interactive KPI Stats in 5-column responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 tabular-nums">
        <button
          id="analytics-kpi-all"
          type="button"
          onClick={() => setActiveDrillDown({ type: 'all', label: 'All Posts' })}
          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
            isMetricSelected({ type: 'all', label: 'All Posts' })
              ? 'border-[#C44D34] ring-2 ring-[#C44D34]/20 bg-[#C44D34]/[0.05]'
              : isDark
              ? 'bg-[#1D242C] border-[#2A3440] hover:border-stone-600'
              : 'bg-white border-[#E8E4DC] hover:border-stone-300'
          }`}
        >
          <div className="text-2xl font-black text-stone-900 dark:text-white">
            {totalPosts}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">
            TOTAL POSTS
          </div>
          <div className="text-[9px] font-semibold text-[#C44D34] mt-1">
            Click to view →
          </div>
        </button>

        <button
          id="analytics-kpi-planned"
          type="button"
          onClick={() =>
            setActiveDrillDown({
              type: 'status',
              status: 'Planned',
              label: 'Stage: Planned',
            })
          }
          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
            isMetricSelected({
              type: 'status',
              status: 'Planned',
              label: 'Stage: Planned',
            })
              ? 'border-[#C44D34] ring-2 ring-[#C44D34]/20 bg-[#C44D34]/[0.05]'
              : isDark
              ? 'bg-[#1D242C] border-[#2A3440] hover:border-stone-600'
              : 'bg-white border-[#E8E4DC] hover:border-stone-300'
          }`}
        >
          <div className="text-2xl font-black text-slate-600 dark:text-slate-300">
            {plannedCount}
          </div>
          <div className="mt-1 flex justify-center">
            <StatusStageBadge status="Planned" size="xs" />
          </div>
          <div className="text-[9px] font-semibold text-[#C44D34] mt-1">
            Click to view →
          </div>
        </button>

        <button
          id="analytics-kpi-in-review"
          type="button"
          onClick={() =>
            setActiveDrillDown({
              type: 'status',
              status: 'In review',
              label: 'Stage: In review',
            })
          }
          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
            isMetricSelected({
              type: 'status',
              status: 'In review',
              label: 'Stage: In review',
            })
              ? 'border-[#C44D34] ring-2 ring-[#C44D34]/20 bg-[#C44D34]/[0.05]'
              : isDark
              ? 'bg-[#1D242C] border-[#2A3440] hover:border-stone-600'
              : 'bg-white border-[#E8E4DC] hover:border-stone-300'
          }`}
        >
          <div className="text-2xl font-black text-amber-500">
            {inReviewCount}
          </div>
          <div className="mt-1 flex justify-center">
            <StatusStageBadge status="In review" size="xs" />
          </div>
          <div className="text-[9px] font-semibold text-[#C44D34] mt-1">
            Click to view →
          </div>
        </button>

        <button
          id="analytics-kpi-approved"
          type="button"
          onClick={() =>
            setActiveDrillDown({
              type: 'status',
              status: 'Approved',
              label: 'Stage: Approved',
            })
          }
          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
            isMetricSelected({
              type: 'status',
              status: 'Approved',
              label: 'Stage: Approved',
            })
              ? 'border-[#C44D34] ring-2 ring-[#C44D34]/20 bg-[#C44D34]/[0.05]'
              : isDark
              ? 'bg-[#1D242C] border-[#2A3440] hover:border-stone-600'
              : 'bg-white border-[#E8E4DC] hover:border-stone-300'
          }`}
        >
          <div className="text-2xl font-black text-emerald-600">
            {approvedCount}
          </div>
          <div className="mt-1 flex justify-center">
            <StatusStageBadge status="Approved" size="xs" />
          </div>
          <div className="text-[9px] font-semibold text-[#C44D34] mt-1">
            Click to view →
          </div>
        </button>

        <button
          id="analytics-kpi-scheduled"
          type="button"
          onClick={() =>
            setActiveDrillDown({
              type: 'status',
              status: 'Scheduled',
              label: 'Stage: Scheduled',
            })
          }
          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
            isMetricSelected({
              type: 'status',
              status: 'Scheduled',
              label: 'Stage: Scheduled',
            })
              ? 'border-[#C44D34] ring-2 ring-[#C44D34]/20 bg-[#C44D34]/[0.05]'
              : isDark
              ? 'bg-[#1D242C] border-[#2A3440] hover:border-stone-600'
              : 'bg-white border-[#E8E4DC] hover:border-stone-300'
          }`}
        >
          <div className="text-2xl font-black text-sky-600">
            {scheduledCount}
          </div>
          <div className="mt-1 flex justify-center">
            <StatusStageBadge status="Scheduled" size="xs" />
          </div>
          <div className="text-[9px] font-semibold text-[#C44D34] mt-1">
            Click to view →
          </div>
        </button>
      </div>

      {/* Responsive Grid for Interactive Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {/* Chart 1: POSTS PER CLIENT (Clickable) */}
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              POSTS PER CLIENT
            </h3>
            <span className="text-[10px] text-stone-400">Click client to view</span>
          </div>

          <div className="space-y-2.5">
            {clientData.map((item) => {
              const pct = Math.round((item.count / maxClientCount) * 100);
              const selected = isMetricSelected({
                type: 'client',
                clientId: item.id,
                clientName: item.name,
                label: `Client: ${item.name}`,
              });

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setActiveDrillDown({
                      type: 'client',
                      clientId: item.id,
                      clientName: item.name,
                      label: `Client: ${item.name}`,
                    })
                  }
                  onMouseEnter={() =>
                    setHoveredClient({ name: item.name, count: item.count })
                  }
                  onMouseLeave={() => setHoveredClient(null)}
                  className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer group ${
                    selected
                      ? 'border-[#C44D34] bg-[#C44D34]/10'
                      : isDark
                      ? 'border-transparent hover:bg-stone-800/60'
                      : 'border-transparent hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-stone-700 dark:text-stone-200 group-hover:text-[#C44D34] transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[11px] font-bold text-stone-500 tabular-nums">
                      {item.count} post{item.count === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[#C44D34] group-hover:bg-[#a83c26]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {hoveredClient && (
            <div className="mt-3 p-2 rounded-lg bg-stone-900 text-white text-[11px] font-semibold text-center animate-fade-in">
              Click to view {hoveredClient.count} post{hoveredClient.count === 1 ? '' : 's'} for{' '}
              {hoveredClient.name}
            </div>
          )}
        </div>

        {/* Chart 2: PLATFORM DISTRIBUTION (Clean SVG Brand Logos instead of color coding, Clickable) */}
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              PLATFORM DISTRIBUTION
            </h3>
            <span className="text-[10px] text-stone-400">Click platform to view</span>
          </div>

          <div className="space-y-2.5">
            {platformEntries.map((item) => {
              const barPct = Math.round((item.count / maxPlatformCount) * 100);
              const selected = isMetricSelected({
                type: 'platform',
                platform: item.platform,
                label: `Platform: ${item.platform}`,
              });

              return (
                <button
                  key={item.platform}
                  type="button"
                  onClick={() =>
                    setActiveDrillDown({
                      type: 'platform',
                      platform: item.platform,
                      label: `Platform: ${item.platform}`,
                    })
                  }
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer group ${
                    selected
                      ? 'border-[#C44D34] bg-[#C44D34]/10'
                      : isDark
                      ? 'bg-[#161D25] border-[#25303E] hover:border-[#C44D34]/50'
                      : 'bg-[#FAF8F5] border-[#ECE8E0] hover:border-[#C44D34]/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <PlatformLogo
                      platform={item.platform}
                      size="md"
                      className="font-bold text-stone-800 dark:text-stone-100 group-hover:text-[#C44D34] transition-colors"
                    />
                    <span className="text-[11px] font-bold text-stone-500 tabular-nums">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-stone-200/70 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-stone-800 dark:bg-stone-200 group-hover:bg-[#C44D34]"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart 3: 4-STAGE BREAKDOWN (Clickable) */}
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              4-STAGE WORKFLOW BREAKDOWN
            </h3>
            <span className="text-[10px] text-stone-400">Click stage to view</span>
          </div>

          <div className="flex items-end justify-between gap-3 h-40 pt-4 pb-2 border-b border-stone-200 dark:border-stone-800">
            {statusData.map((item) => {
              const barHeight = Math.max(
                Math.round((item.count / maxStatusCount) * 100),
                12
              );
              const isHovered = hoveredStatus?.status === item.status;
              const selected = isMetricSelected({
                type: 'status',
                status: item.status,
                label: `Stage: ${item.status}`,
              });

              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={() =>
                    setActiveDrillDown({
                      type: 'status',
                      status: item.status,
                      label: `Stage: ${item.status}`,
                    })
                  }
                  className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer p-1 rounded-xl transition-all ${
                    selected ? 'bg-[#C44D34]/10 ring-1 ring-[#C44D34]' : ''
                  }`}
                  onMouseEnter={() => setHoveredStatus({ status: item.status, count: item.count })}
                  onMouseLeave={() => setHoveredStatus(null)}
                >
                  <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1 tabular-nums">
                    {item.count}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-300"
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: isHovered || selected ? '#C44D34' : item.hex,
                    }}
                  />
                  <div className="mt-2">
                    <StatusStageBadge status={item.status} size="xs" />
                  </div>
                </button>
              );
            })}
          </div>

          {hoveredStatus && (
            <div className="mt-3 p-2 rounded-lg bg-stone-900 text-white text-[11px] font-semibold text-center animate-fade-in">
              Click to view {hoveredStatus.count} {hoveredStatus.status} post
              {hoveredStatus.count === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Drill-Down Posts Section */}
      {activeDrillDown && (
        <div
          id="analytics-drilldown-panel"
          className={`mt-5 p-4 sm:p-5 rounded-3xl border shadow-xs animate-fade-in ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#C44D34]">
                Viewing Posts for Metric:
              </span>
              <span className="text-sm font-bold text-stone-900 dark:text-white">
                {activeDrillDown.label}
              </span>
              <span className="text-xs font-bold text-stone-400 tabular-nums">
                ({drillDownPosts.length} post{drillDownPosts.length === 1 ? '' : 's'})
              </span>
            </div>

            {activeDrillDown.type !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveDrillDown({ type: 'all', label: 'All Posts' })}
                className="text-xs font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset to All Posts</span>
              </button>
            )}
          </div>

          {drillDownPosts.length === 0 ? (
            <div className="py-10 text-center text-xs text-stone-400">
              No posts match <strong>{activeDrillDown.label}</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {drillDownPosts.map((post) => {
                const catColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                const activityCount = post.activityLog?.length || 0;

                return (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost && onSelectPost(post)}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      onSelectPost ? 'cursor-pointer hover:border-[#C44D34]' : ''
                    } ${
                      isDark
                        ? 'bg-[#161D25] border-[#25303E]'
                        : 'bg-[#FAF8F5] border-[#ECE8E0]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-stone-700 dark:text-stone-200 truncate">
                            {post.clientName}
                          </span>
                          <span className="text-stone-400">•</span>
                          <PlatformLogo platform={post.platform} size="xs" />
                        </div>
                        <StatusStageBadge status={post.status} size="xs" />
                      </div>

                      <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                        {post.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                        {post.caption}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-[10px] text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-bold uppercase tracking-wider"
                          style={{ color: catColor.text }}
                        >
                          {post.category}
                        </span>
                        <span>•</span>
                        <span className="tabular-nums font-semibold">{post.date}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {activityCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[#C44D34] font-bold">
                            <Activity className="w-3 h-3" />
                            <span>{activityCount}</span>
                          </span>
                        )}
                        {onSelectPost && (
                          <span className="font-bold text-[#C44D34] inline-flex items-center">
                            View <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
