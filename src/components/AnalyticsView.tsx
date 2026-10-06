import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  ChevronRight,
  ChevronDown,
  Activity,
  RotateCcw,
  Check,
  Users,
} from 'lucide-react';
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

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  posts,
  clients,
  onBack,
  onSelectPost,
  isDark,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PostStatus | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected client object (if not 'all')
  const activeClient = React.useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  // 1. Posts scoped by the top "All Clients" / Client Dropdown
  const clientScopedPosts = React.useMemo(() => {
    if (selectedClientId === 'all') return posts;
    return posts.filter(
      (p) =>
        p.clientId === selectedClientId ||
        (activeClient && p.clientName === activeClient.name)
    );
  }, [posts, selectedClientId, activeClient]);

  const totalDeliverables = clientScopedPosts.length;

  // 2. 4-Stage Workflow Breakdown (scoped to the selected client or All Clients)
  const statusData = React.useMemo(() => {
    return POST_STAGES.map((st) => {
      const stagePosts = clientScopedPosts
        .filter((p) => normalizePostStatus(p.status) === st)
        .sort((a, b) => b.date.localeCompare(a.date));
      const count = stagePosts.length;
      const percent =
        totalDeliverables > 0
          ? Math.round((count / totalDeliverables) * 100)
          : 0;
      return {
        status: st,
        count,
        percent,
        hex: STATUS_STYLES[st].hex,
        posts: stagePosts,
      };
    });
  }, [clientScopedPosts, totalDeliverables]);

  // 3. Posts scoped by both Client + Stage (used for Platform Distribution on the left)
  const stageScopedPosts = React.useMemo(() => {
    if (!selectedStage) return clientScopedPosts;
    return clientScopedPosts.filter(
      (p) => normalizePostStatus(p.status) === selectedStage
    );
  }, [clientScopedPosts, selectedStage]);

  const stageScopedTotal = stageScopedPosts.length;

  // All platforms across the workspace
  const allPlatforms = React.useMemo(
    () => Array.from(new Set(posts.map((p) => p.platform))),
    [posts]
  );

  // Platform Distribution entries (Left column)
  const platformEntries = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allPlatforms.forEach((plat) => {
      counts[plat] = 0;
    });
    stageScopedPosts.forEach((p) => {
      counts[p.platform] = (counts[p.platform] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform,
        count,
        percent:
          stageScopedTotal > 0
            ? Math.round((count / stageScopedTotal) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allPlatforms, stageScopedPosts, stageScopedTotal]);

  const maxPlatformCount = Math.max(...platformEntries.map((p) => p.count), 1);

  // 4. Right-Side Post Breakdown List (scoped by Client + Stage + optional Platform click)
  const breakdownPosts = React.useMemo(() => {
    const base = selectedPlatform
      ? stageScopedPosts.filter((p) => p.platform === selectedPlatform)
      : stageScopedPosts;
    return base.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [stageScopedPosts, selectedPlatform]);

  // Per-client total counts for the top dropdown menu
  const clientOptionCounts = React.useMemo(() => {
    return clients.map((c) => {
      const count = posts.filter(
        (p) => p.clientId === c.id || p.clientName === c.name
      ).length;
      return {
        ...c,
        count,
        color: c.color || '#C44D34',
      };
    });
  }, [clients, posts]);

  const handleToggleStage = (st: PostStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStage((prev) => (prev === st ? null : st));
  };

  const handleResetFilters = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStage(null);
    setSelectedPlatform(null);
  };

  return (
    <div
      id="analytics-view"
      onClick={() => {
        if (selectedStage || selectedPlatform) {
          handleResetFilters();
        }
      }}
      className={`pb-8 px-4 pt-3 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Bar: Back + Title + Prominent "All Clients" Dropdown Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Analytics
            </h2>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-2 tabular-nums">
              <span>{totalDeliverables} DELIVERABLES</span>
              <span>•</span>
              <span className="text-[#C44D34]">
                {activeClient ? activeClient.name.toUpperCase() : 'ALL CLIENTS'}
              </span>
            </div>
          </div>
        </div>

        {/* Prominent "All Clients" Dropdown Menu */}
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          className="relative"
        >
          <button
            id="analytics-client-dropdown-btn"
            type="button"
            onClick={() => setClientDropdownOpen((prev) => !prev)}
            className={`px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-extrabold flex items-center gap-3 cursor-pointer shadow-xs transition-all min-w-[220px] justify-between ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] hover:border-[#C44D34] text-white'
                : 'bg-white border-[#E8E4DC] hover:border-[#C44D34] text-stone-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {activeClient ? (
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: activeClient.color || '#C44D34' }}
                />
              ) : (
                <Users className="w-4 h-4 text-[#C44D34] shrink-0" />
              )}
              <span className="truncate">
                {activeClient ? activeClient.name : 'All Clients'}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-[#C44D34]/12 text-[#C44D34] tabular-nums shrink-0">
                {totalDeliverables}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-stone-400 transition-transform duration-200 shrink-0 ${
                clientDropdownOpen ? 'rotate-180 text-[#C44D34]' : ''
              }`}
            />
          </button>

          {clientDropdownOpen && (
            <div
              className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl z-40 py-1.5 overflow-hidden animate-fade-in ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-100'
                  : 'bg-white border-[#E8E4DC] text-stone-900'
              }`}
            >
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-400 border-b border-stone-200/60 dark:border-stone-800">
                Filter by Client
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedClientId('all');
                  setClientDropdownOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  selectedClientId === 'all'
                    ? 'bg-[#C44D34]/10 text-[#C44D34]'
                    : isDark
                    ? 'hover:bg-stone-800/70'
                    : 'hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-3.5 h-3.5 text-[#C44D34]" />
                  <span>All Clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-stone-400 tabular-nums">
                    {posts.length} posts
                  </span>
                  {selectedClientId === 'all' && (
                    <Check className="w-3.5 h-3.5 text-[#C44D34]" />
                  )}
                </div>
              </button>

              <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60">
                {clientOptionCounts.map((client) => {
                  const isCurrent = selectedClientId === client.id;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setClientDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C44D34]/10 text-[#C44D34] font-bold'
                          : isDark
                          ? 'hover:bg-stone-800/70'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: client.color }}
                        />
                        <span className="truncate">{client.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-stone-400 tabular-nums">
                          {client.count}
                        </span>
                        {isCurrent && (
                          <Check className="w-3.5 h-3.5 text-[#C44D34]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN TOPPER: 4-STAGE WORKFLOW BREAKDOWN */}
      <div
        id="analytics-workflow-breakdown-card"
        className={`mt-3.5 p-4 rounded-3xl border shadow-xs transition-all ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-300">
              4-STAGE WORKFLOW BREAKDOWN{' '}
              {activeClient ? `• ${activeClient.name.toUpperCase()}` : ''}
            </h3>
            <p className="text-[11px] text-stone-400">
              Click any color segment or stage card to filter Platform Distribution & Post List below (click away to reset)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedStage ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-2xl bg-[#C44D34] hover:bg-[#b04129] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Show All Stages ({totalDeliverables})</span>
              </button>
            ) : (
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-[#C44D34]/10 text-[#C44D34] tabular-nums">
                {totalDeliverables} Total Deliverables
              </span>
            )}
          </div>
        </div>

        {/* Clickable Multi-Color Segmented Pipeline Bar */}
        <div className="mb-3">
          <div className="w-full h-4 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden flex gap-1 p-0.5">
            {statusData.map((item) => {
              const isSelected = selectedStage === item.status;
              if (item.count === 0) return null;
              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={(e) => handleToggleStage(item.status, e)}
                  title={`Filter by ${item.status}: ${item.count} posts (${item.percent}%)`}
                  className={`h-full first:rounded-l-lg last:rounded-r-lg transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-offset-1 ring-stone-900 dark:ring-white scale-y-105'
                      : selectedStage
                      ? 'opacity-40 hover:opacity-85'
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    width: `${Math.max(item.percent, 8)}%`,
                    backgroundColor: item.hex,
                  }}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 mt-2 tabular-nums">
            <div className="flex items-center gap-3 flex-wrap">
              {statusData.map((item) => (
                <button
                  key={item.status}
                  type="button"
                  onClick={(e) => handleToggleStage(item.status, e)}
                  className={`inline-flex items-center gap-1.5 font-bold cursor-pointer transition-opacity ${
                    selectedStage === item.status
                      ? 'text-stone-900 dark:text-white underline underline-offset-4'
                      : 'hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span>
                    {item.status}: {item.count} ({item.percent}%)
                  </span>
                </button>
              ))}
            </div>
            {selectedStage && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#C44D34]/15 text-[#C44D34] hover:bg-[#C44D34] hover:text-white font-extrabold text-[11px] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Show All Stages</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Compact Interactive Stage Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 tabular-nums">
          {statusData.map((item) => {
            const isSelected = selectedStage === item.status;

            return (
              <button
                key={item.status}
                id={`analytics-stage-${item.status.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={(e) => handleToggleStage(item.status, e)}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'border-[#C44D34] ring-2 ring-[#C44D34]/30 bg-[#C44D34]/[0.06]'
                    : selectedStage
                    ? isDark
                      ? 'bg-[#161D25]/60 border-[#25303E] opacity-60 hover:opacity-100'
                      : 'bg-[#FAF8F5]/60 border-[#ECE8E0] opacity-60 hover:opacity-100'
                    : isDark
                    ? 'bg-[#161D25] border-[#25303E] hover:border-[#C44D34]/60'
                    : 'bg-[#FAF8F5] border-[#ECE8E0] hover:border-[#C44D34]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <StatusStageBadge status={item.status} size="xs" />
                  <span className="text-[11px] font-bold text-stone-400">
                    {item.percent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <span
                    className="text-xl font-black"
                    style={{ color: item.hex }}
                  >
                    {item.count}
                  </span>
                  <span className="text-[10px] font-bold text-[#C44D34]">
                    {isSelected ? 'Filtered' : 'Filter'}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-stone-200/70 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.hex,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Split: Left = Platform Distribution | Right = Post Breakdown List View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3.5 items-start">
        {/* LEFT COLUMN (5 cols on lg): PLATFORM DISTRIBUTION */}
        <div
          className={`lg:col-span-5 p-4 rounded-3xl border ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                PLATFORM DISTRIBUTION
              </h3>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {selectedStage ? `Stage: ${selectedStage}` : 'All Stages'}{' '}
                {activeClient ? `• ${activeClient.name}` : '• All Clients'}
              </p>
            </div>
            {selectedPlatform ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlatform(null);
                }}
                className="text-[11px] font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>All Platforms</span>
              </button>
            ) : (
              <span className="text-[10px] font-semibold text-[#C44D34]">
                Click platform to filter list
              </span>
            )}
          </div>

          <div className="space-y-2">
            {platformEntries.map((item) => {
              const barPct = Math.round((item.count / maxPlatformCount) * 100);
              const isSelected = selectedPlatform === item.platform;

              return (
                <button
                  key={item.platform}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlatform((prev) =>
                      prev === item.platform ? null : item.platform
                    );
                  }}
                  className={`w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-[#C44D34] bg-[#C44D34]/10 ring-1 ring-[#C44D34]/30'
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

        {/* RIGHT COLUMN (7 cols on lg): POST BREAKDOWN LIST VIEW */}
        <div
          id="analytics-drilldown-panel"
          onClick={(e) => e.stopPropagation()}
          className={`lg:col-span-7 p-4 rounded-3xl border ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                POST BREAKDOWN
              </h3>
              <span className="text-xs font-bold text-[#C44D34]">
                • {activeClient ? activeClient.name : 'All Clients'}
              </span>
              {selectedStage && (
                <StatusStageBadge status={selectedStage} size="xs" />
              )}
              {selectedPlatform && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                  {selectedPlatform}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-stone-400 tabular-nums">
                {breakdownPosts.length}{' '}
                {breakdownPosts.length === 1 ? 'post' : 'posts'}
              </span>
              {(selectedStage || selectedPlatform) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-[#C44D34] hover:text-white text-[11px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {breakdownPosts.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              No posts match the current filter.
            </div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto pr-1 divide-y divide-stone-200/60 dark:divide-stone-800/80">
              {breakdownPosts.map((post) => {
                const catColor =
                  CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                const activityCount = post.activityLog?.length || 0;

                return (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost && onSelectPost(post)}
                    className={`py-2.5 px-2.5 first:pt-1.5 last:pb-1.5 rounded-xl transition-colors flex items-center justify-between gap-3 ${
                      onSelectPost
                        ? 'cursor-pointer hover:bg-stone-100/70 dark:hover:bg-stone-800/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <PlatformLogo
                        platform={post.platform}
                        size="sm"
                        showLabel={false}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                            {post.title}
                          </h4>
                          <span
                            className="text-[9px] font-extrabold uppercase tracking-wider shrink-0"
                            style={{ color: catColor.text }}
                          >
                            {post.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5 truncate">
                          <span className="font-semibold text-stone-600 dark:text-stone-300 truncate">
                            {post.clientName}
                          </span>
                          <span>•</span>
                          <span className="tabular-nums font-medium shrink-0">
                            {post.date}
                          </span>
                          {activityCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-[#C44D34] font-bold shrink-0">
                                <Activity className="w-3 h-3" />
                                <span>{activityCount}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusStageBadge status={post.status} size="xs" />
                      {onSelectPost && (
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
