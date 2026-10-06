import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  BarChart3,
  Plus,
  Share2,
  Clock,
  Layers,
  Activity,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  LayoutGrid,
} from 'lucide-react';
import { Client, Post, PostCategory, PostStatus, Campaign } from '../types';
import {
  CATEGORY_COLORS,
  STATUS_STYLES,
  formatSectionDate,
  computeCampaignDuration,
  getTodayDateStr,
  normalizePostStatus,
} from '../utils/theme';
import { INITIAL_CAMPAIGNS } from '../data/initialData';
import { ClientShareModal } from './ClientShareModal';
import { StatusStageBadge } from './StatusStageBadge';
import { PlatformLogo } from './PlatformLogo';

interface ClientDetailViewProps {
  client: Client;
  posts: Post[];
  campaigns?: Campaign[];
  initialTab?: 'overview' | 'analytics';
  onBack: () => void;
  onNewPostForClient: (clientId: string) => void;
  onEditPost: (post: Post) => void;
  onOpenPortal?: (
    client: Client,
    initialTab?: 'overview' | 'approvals' | 'upcoming' | 'analytics' | 'calendar',
    isViewOnly?: boolean
  ) => void;
  isDark?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  posts,
  campaigns = INITIAL_CAMPAIGNS,
  initialTab = 'overview',
  onBack,
  onNewPostForClient,
  onEditPost,
  onOpenPortal,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'analytics'>(
    initialTab
  );
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<'all' | PostStatus>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const todayStr = getTodayDateStr();

  const clientPosts = posts
    .filter((p) => p.clientId === client.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  // Derive campaigns for this client
  const clientCampaigns: Campaign[] = React.useMemo(() => {
    const matched = campaigns.filter(
      (c) =>
        c.clientId === client.id ||
        (c.clientName && c.clientName.toLowerCase() === client.name.toLowerCase())
    );
    const postCampNames: string[] = Array.from(
      new Set(
        clientPosts
          .map((p) => p.campaign)
          .filter((name): name is string => Boolean(name && name !== 'No campaign'))
      )
    );
    const derived: Campaign[] = [...matched];
    postCampNames.forEach((cName) => {
      if (!derived.some((d) => d.name.toLowerCase() === cName.toLowerCase())) {
        derived.push({
          id: `camp-derived-${cName}`,
          name: cName,
          clientId: client.id,
          clientName: client.name,
        });
      }
    });
    return derived;
  }, [campaigns, client.id, client.name, clientPosts]);

  // Calendar Month State (defaults to the month of the latest/upcoming post or current month)
  const initialCalendarMonth = React.useMemo(() => {
    if (clientPosts.length > 0) {
      const upcoming = clientPosts.find((p) => p.date >= todayStr);
      const refDate = upcoming ? upcoming.date : clientPosts[clientPosts.length - 1].date;
      const [y, m] = refDate.split('-').map(Number);
      if (y && m) return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [clientPosts, todayStr]);

  const [calendarYear, setCalendarYear] = useState<number>(initialCalendarMonth.year);
  const [calendarMonth, setCalendarMonth] = useState<number>(initialCalendarMonth.month);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const filteredPosts = clientPosts
    .filter((p) => (filterPlatform === 'all' ? true : p.platform === filterPlatform))
    .filter((p) =>
      filterStage === 'all' ? true : normalizePostStatus(p.status) === filterStage
    )
    .filter((p) =>
      selectedMonthFilter === 'ALL' ? true : p.date.startsWith(selectedMonthFilter)
    );

  // Month-wise grouping of filteredPosts (e.g., "July 2026", "August 2026", "September 2026", "October 2026")
  const monthGroups = React.useMemo(() => {
    const map = new Map<
      string,
      { monthKey: string; monthLabel: string; posts: Post[] }
    >();
    // Sort chronologically by date ascending inside each month
    const sorted = [...filteredPosts].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((post) => {
      const monthKey = post.date.slice(0, 7); // YYYY-MM
      if (!map.has(monthKey)) {
        const [y, m] = monthKey.split('-').map(Number);
        const monthLabel =
          y && m
            ? new Date(y, m - 1, 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })
            : monthKey;
        map.set(monthKey, { monthKey, monthLabel, posts: [] });
      }
      map.get(monthKey)!.posts.push(post);
    });
    return Array.from(map.values());
  }, [filteredPosts]);

  // All available months across clientPosts for quick month pills
  const availableMonths = React.useMemo(() => {
    const keys: string[] = Array.from(
      new Set<string>(clientPosts.map((p) => p.date.slice(0, 7)))
    ).sort();
    return keys.map((key) => {
      const [y, m] = key.split('-').map(Number);
      const label =
        y && m
          ? new Date(y, m - 1, 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })
          : key;
      const count = clientPosts.filter((p) => p.date.startsWith(key)).length;
      return { key, label, count };
    });
  }, [clientPosts]);

  // 4-Stage Pipeline Metrics
  const totalPosts = clientPosts.length;
  const plannedCount = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Planned'
  ).length;
  const inReviewCount = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'In review'
  ).length;
  const approvedCount = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Approved'
  ).length;
  const scheduledCount = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Scheduled'
  ).length;
  const postsDoneSoFar = scheduledCount + approvedCount;

  // Platform breakdown
  const platformCounts: Record<string, number> = {};
  clientPosts.forEach((p) => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  });

  // Category breakdown
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
    category: category as PostCategory,
    count,
    percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
  }));

  const platforms = ['all', ...Array.from(new Set(clientPosts.map((p) => p.platform)))];

  // Build Calendar Grid Cells for (calendarYear, calendarMonth)
  const calendarCells = React.useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const cells: {
      dayNumber: number | null;
      dateStr: string | null;
      posts: Post[];
    }[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({ dayNumber: null, dateStr: null, posts: [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mPadded = String(calendarMonth + 1).padStart(2, '0');
      const dPadded = String(day).padStart(2, '0');
      const dateStr = `${calendarYear}-${mPadded}-${dPadded}`;
      const dayPosts = clientPosts.filter((p) => p.date === dateStr);
      cells.push({ dayNumber: day, dateStr, posts: dayPosts });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ dayNumber: null, dateStr: null, posts: [] });
    }

    return cells;
  }, [calendarYear, calendarMonth, clientPosts]);

  const calendarMonthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' }
  );

  return (
    <div
      id="client-detail-view"
      className={`min-h-[780px] pb-24 px-4 sm:px-6 pt-4 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            id="back-to-clients-btn"
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Client Workspace
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="share-client-btn"
            onClick={() => setIsShareModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:border-[#C44D34]'
                : 'bg-white border-[#E8E4DC] text-stone-700 hover:border-[#C44D34]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
            <span>Share Portal Link</span>
          </button>

          <button
            id="add-post-for-client-btn"
            onClick={() => onNewPostForClient(client.id)}
            className="px-3.5 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Hero Client Card */}
      <div
        className={`mt-4 p-5 rounded-3xl border shadow-xs relative overflow-hidden ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: client.color }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
              style={{ backgroundColor: client.color }}
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">{client.name}</h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                  {client.handle}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {client.notes || 'Active content client'}
              </p>
            </div>
          </div>

          {onOpenPortal && (
            <button
              type="button"
              onClick={() => onOpenPortal(client, 'overview', false)}
              className="px-3.5 py-2 rounded-xl bg-[#C44D34]/10 hover:bg-[#C44D34] text-[#C44D34] hover:text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-center shrink-0"
            >
              Open Live Client Portal
            </button>
          )}
        </div>

        {/* TOP SUMMARY STRIP: Posts Done So Far + Separate Campaign Running Dates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 tabular-nums">
          {/* Card 1: Posts Done So Far */}
          <div
            className={`lg:col-span-4 p-3.5 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-[#161B22] border-[#26303C]' : 'bg-[#FAF8F5] border-[#EFECE6]'
            }`}
          >
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                Posts Done So Far
              </div>
              <div className="text-2xl font-black mt-0.5 flex items-baseline gap-2">
                <span>{totalPosts}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ({postsDoneSoFar} approved/scheduled)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#C44D34]/10 text-[#C44D34] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Active Campaigns & Their Separate Running Dates */}
          <div
            className={`lg:col-span-8 p-3.5 rounded-2xl border ${
              isDark ? 'bg-[#161B22] border-[#26303C]' : 'bg-[#FAF8F5] border-[#EFECE6]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[#C44D34]" />
                <span>Campaign Running Dates ({clientCampaigns.length})</span>
              </div>
              <span className="text-[10px] text-stone-400">
                Start date &amp; days running per campaign
              </span>
            </div>

            {clientCampaigns.length === 0 ? (
              <p className="text-xs text-stone-400 italic">
                No active campaigns running for {client.name}.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clientCampaigns.map((camp) => {
                  const campPosts = clientPosts.filter(
                    (p) =>
                      (p.campaign || '').toLowerCase() === camp.name.toLowerCase() ||
                      p.campaignId === camp.id
                  );
                  const dur = computeCampaignDuration(
                    campPosts,
                    camp.startDate,
                    camp.endDate
                  );
                  const startFormatted = dur.startStr
                    ? new Date(`${dur.startStr}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Not started';

                  return (
                    <div
                      key={camp.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        isDark
                          ? 'bg-[#1D242C] border-[#2A3440]'
                          : 'bg-white border-stone-200/80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {camp.name}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          Start: <strong className="text-stone-700 dark:text-stone-200">{startFormatted}</strong> • {campPosts.length} posts
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-[#C44D34]/10 text-[#C44D34] text-xs font-black shrink-0">
                        {dur.daysSpan} {dur.daysSpan === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 4-Stage Pipeline Strip: Planned, In review, Approved, Scheduled */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 tabular-nums">
          {(
            [
              { status: 'Planned' as PostStatus, count: plannedCount },
              { status: 'In review' as PostStatus, count: inReviewCount },
              { status: 'Approved' as PostStatus, count: approvedCount },
              { status: 'Scheduled' as PostStatus, count: scheduledCount },
            ] as const
          ).map((st) => (
            <button
              key={st.status}
              type="button"
              onClick={() => {
                setFilterStage((prev) => (prev === st.status ? 'all' : st.status));
                setActiveTab('overview');
              }}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                filterStage === st.status
                  ? 'border-[#C44D34] ring-1 ring-[#C44D34]/30 bg-[#C44D34]/[0.06]'
                  : isDark
                  ? 'bg-[#161B22] border-[#26303C] hover:border-stone-600'
                  : 'bg-[#FAF8F5] border-[#EFECE6] hover:border-stone-300'
              }`}
            >
              <StatusStageBadge status={st.status} size="xs" />
              <span
                className="text-lg font-black"
                style={{ color: STATUS_STYLES[st.status].hex }}
              >
                {st.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* View Switcher Tabs: Month-Wise Posts List, Full-Page Content Calendar, Pipeline Analytics */}
      <div
        className={`mt-4 p-1 rounded-2xl border grid grid-cols-3 gap-1 ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <button
          id="tab-client-overview"
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#C44D34] text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Month-Wise Posts ({totalPosts})</span>
        </button>

        <button
          id="tab-client-calendar"
          onClick={() => setActiveTab('calendar')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-[#C44D34] text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Full-Page Calendar</span>
        </button>

        <button
          id="tab-client-analytics"
          onClick={() => setActiveTab('analytics')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#C44D34] text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Pipeline Analytics</span>
        </button>
      </div>

      {/* TAB 1: MONTH-WISE POSTS & PIPELINE */}
      {activeTab === 'overview' && (
        <div className="mt-4 space-y-4">
          {/* Month Selector Pills (July, August, September, October, etc.) */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedMonthFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedMonthFilter === 'ALL'
                    ? 'bg-[#C44D34] text-white'
                    : isDark
                    ? 'bg-[#1D242C] text-stone-300 hover:text-white'
                    : 'bg-white text-stone-700 hover:text-stone-900 border border-[#E8E4DC]'
                }`}
              >
                All Months ({clientPosts.length})
              </button>
              {availableMonths.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMonthFilter(m.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedMonthFilter === m.key
                      ? 'bg-[#C44D34] text-white'
                      : isDark
                      ? 'bg-[#1D242C] text-stone-300 hover:text-white'
                      : 'bg-white text-stone-700 hover:text-stone-900 border border-[#E8E4DC]'
                  }`}
                >
                  {m.label} ({m.count})
                </button>
              ))}
            </div>
          )}

          {/* Stage + Platform Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterStage('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  filterStage === 'all'
                    ? 'bg-[#181E24] text-white dark:bg-stone-100 dark:text-stone-900'
                    : isDark
                    ? 'bg-[#1D242C] text-stone-400'
                    : 'bg-white text-stone-600'
                }`}
              >
                All Stages ({clientPosts.length})
              </button>
              {(['Planned', 'In review', 'Approved', 'Scheduled'] as PostStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStage(st)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      filterStage === st
                        ? 'ring-2 ring-[#C44D34] bg-[#C44D34]/10'
                        : isDark
                        ? 'bg-[#1D242C] opacity-80 hover:opacity-100'
                        : 'bg-white opacity-85 hover:opacity-100'
                    }`}
                  >
                    <StatusStageBadge status={st} size="xs" />
                  </button>
                )
              )}
            </div>

            {platforms.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {platforms.map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setFilterPlatform(plat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      filterPlatform === plat
                        ? 'bg-[#C44D34] text-white'
                        : isDark
                        ? 'bg-[#1D242C] text-stone-400 hover:text-white'
                        : 'bg-white text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {plat === 'all' ? 'All Platforms' : plat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Month-by-Month Grouped Posts List */}
          {monthGroups.length === 0 ? (
            <div
              className={`p-8 rounded-3xl border text-center ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-400'
                  : 'bg-white border-[#E8E4DC] text-stone-500'
              }`}
            >
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No posts match this filter</p>
              <button
                onClick={() => onNewPostForClient(client.id)}
                className="mt-4 px-4 py-2 bg-[#C44D34] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Create Post
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {monthGroups.map((group) => {
                const mPlanned = group.posts.filter(
                  (p) => normalizePostStatus(p.status) === 'Planned'
                ).length;
                const mReview = group.posts.filter(
                  (p) => normalizePostStatus(p.status) === 'In review'
                ).length;
                const mApproved = group.posts.filter(
                  (p) => normalizePostStatus(p.status) === 'Approved'
                ).length;
                const mScheduled = group.posts.filter(
                  (p) => normalizePostStatus(p.status) === 'Scheduled'
                ).length;

                return (
                  <div
                    key={group.monthKey}
                    className={`rounded-3xl border overflow-hidden shadow-xs ${
                      isDark
                        ? 'bg-[#1D242C] border-[#2A3440]'
                        : 'bg-white border-[#E8E4DC]'
                    }`}
                  >
                    {/* Month Header Banner */}
                    <div
                      className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
                        isDark
                          ? 'bg-[#161C23] border-[#26313E]'
                          : 'bg-[#FAF8F5] border-[#EAE5DC]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-[#C44D34]" />
                        <h3 className="text-sm sm:text-base font-bold tracking-tight">
                          {group.monthLabel}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#C44D34]/10 text-[#C44D34] tabular-nums">
                          {group.posts.length}{' '}
                          {group.posts.length === 1 ? 'Post' : 'Posts'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums flex-wrap">
                        {mPlanned > 0 && (
                          <span className="text-stone-500">
                            {mPlanned} Planned
                          </span>
                        )}
                        {mReview > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            • {mReview} In Review
                          </span>
                        )}
                        {mApproved > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            • {mApproved} Approved
                          </span>
                        )}
                        {mScheduled > 0 && (
                          <span className="text-blue-600 dark:text-blue-400">
                            • {mScheduled} Scheduled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Posts in this month */}
                    <div className="p-4 space-y-2.5">
                      {group.posts.map((post) => {
                        const catColor =
                          CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;

                        return (
                          <div
                            key={post.id}
                            onClick={() => onEditPost(post)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:border-[#C44D34] ${
                              isDark
                                ? 'bg-[#161C23] border-[#26313F]'
                                : 'bg-[#FAF8F5] border-[#ECE8E0]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: catColor.dot }}
                                />
                                <span
                                  className="font-bold text-[10px] uppercase tracking-wider"
                                  style={{ color: catColor.text }}
                                >
                                  {post.category}
                                </span>
                                <span className="text-stone-300 dark:text-stone-700">•</span>
                                <PlatformLogo platform={post.platform} size="xs" />
                                {post.campaign && post.campaign !== 'No campaign' && (
                                  <>
                                    <span className="text-stone-300 dark:text-stone-700">•</span>
                                    <span className="text-[11px] font-semibold text-[#C44D34]">
                                      {post.campaign}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <StatusStageBadge status={post.status} size="xs" />
                                <span className="text-[11px] font-bold text-[#C44D34] tabular-nums">
                                  {formatSectionDate(post.date)}
                                </span>
                              </div>
                            </div>

                            <h4 className="text-sm font-bold mt-2">{post.title}</h4>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                              {post.caption}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FULL-PAGE MONTHLY CONTENT CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="mt-4 space-y-4">
          <div
            className={`rounded-3xl border shadow-xs overflow-hidden ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            {/* Calendar Month Navigation Bar */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C44D34]">
                  Monthly Content Calendar
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                  {calendarMonthName}
                </h2>
              </div>

              {/* Month Quick Jump Pills + Prev/Next */}
              <div className="flex items-center gap-2 flex-wrap">
                {availableMonths.map((m) => {
                  const [y, mo] = m.key.split('-').map(Number);
                  const isActive =
                    y === calendarYear && mo - 1 === calendarMonth;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setCalendarYear(y);
                        setCalendarMonth(mo - 1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#C44D34] text-white'
                          : isDark
                          ? 'bg-[#161C23] text-stone-300 hover:text-white border border-[#26313F]'
                          : 'bg-[#FAF8F5] text-stone-700 hover:text-stone-900 border border-[#E8E4DC]'
                      }`}
                    >
                      {m.label} ({m.count})
                    </button>
                  );
                })}

                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className={`p-2 rounded-xl border cursor-pointer ${
                      isDark
                        ? 'bg-[#161C23] border-[#26313F] text-stone-200 hover:border-[#C44D34]'
                        : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-700 hover:border-[#C44D34]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className={`p-2 rounded-xl border cursor-pointer ${
                      isDark
                        ? 'bg-[#161C23] border-[#26313F] text-stone-200 hover:border-[#C44D34]'
                        : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-700 hover:border-[#C44D34]'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 7-Column Weekday Header */}
            <div
              className={`grid grid-cols-7 border-b text-center text-[11px] font-extrabold uppercase tracking-wider ${
                isDark
                  ? 'bg-[#161C23] border-[#26313F] text-stone-400'
                  : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-500'
              }`}
            >
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2.5 border-r last:border-r-0 border-stone-200/60 dark:border-stone-800">
                  {day}
                </div>
              ))}
            </div>

            {/* Full-Page 7-Column Calendar Day Cells */}
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, idx) => {
                const isToday = cell.dateStr === todayStr;
                return (
                  <div
                    key={idx}
                    className={`min-h-[145px] sm:min-h-[175px] p-2 sm:p-2.5 border-b border-r last:border-r-0 transition-colors flex flex-col ${
                      !cell.dayNumber
                        ? isDark
                          ? 'bg-[#141A21]/60 border-[#242E3A]'
                          : 'bg-stone-50/70 border-[#ECE8E0]'
                        : isToday
                        ? isDark
                          ? 'bg-[#C44D34]/10 border-[#26313F]'
                          : 'bg-[#C44D34]/[0.05] border-[#E8E4DC]'
                        : isDark
                        ? 'bg-[#1D242C] border-[#26313F]'
                        : 'bg-white border-[#E8E4DC]'
                    }`}
                  >
                    {cell.dayNumber && (
                      <>
                        {/* Date Number Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold tabular-nums ${
                              isToday
                                ? 'bg-[#C44D34] text-white'
                                : 'text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                          {cell.posts.length > 0 && (
                            <span className="text-[10px] font-bold text-[#C44D34] tabular-nums">
                              {cell.posts.length} {cell.posts.length === 1 ? 'post' : 'posts'}
                            </span>
                          )}
                        </div>

                        {/* Full Post Names Written Below the Date */}
                        <div className="space-y-1.5 flex-1">
                          {cell.posts.map((post) => {
                            const stStyle = STATUS_STYLES[normalizePostStatus(post.status)];
                            return (
                              <div
                                key={post.id}
                                onClick={() => onEditPost(post)}
                                className={`p-2 rounded-xl border text-left cursor-pointer transition-all hover:border-[#C44D34] shadow-2xs ${
                                  isDark
                                    ? 'bg-[#151C24] border-[#2B3746]'
                                    : 'bg-[#FAF8F5] border-[#E5DFD3]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <PlatformLogo platform={post.platform} size="xs" showLabel={false} />
                                  <span
                                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded"
                                    style={{
                                      color: stStyle.hex,
                                      backgroundColor: `${stStyle.hex}18`,
                                    }}
                                  >
                                    {post.status}
                                  </span>
                                </div>
                                <div className="text-[11px] sm:text-xs font-bold text-stone-900 dark:text-white leading-snug break-words">
                                  {post.title}
                                </div>
                                <div className="text-[10px] font-semibold text-[#C44D34] mt-0.5 uppercase tracking-wider">
                                  {post.category}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PIPELINE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="mt-4 space-y-4">
          {/* 4-Stage Workflow Breakdown */}
          <div
            className={`p-5 rounded-3xl border shadow-xs ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                4-Stage Content Pipeline
              </h3>
              <span className="text-xs font-semibold text-stone-400 tabular-nums">
                {totalPosts} Total Posts ({postsDoneSoFar} Approved/Scheduled)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              {(
                [
                  { status: 'Planned' as PostStatus, count: plannedCount },
                  { status: 'In review' as PostStatus, count: inReviewCount },
                  { status: 'Approved' as PostStatus, count: approvedCount },
                  { status: 'Scheduled' as PostStatus, count: scheduledCount },
                ] as const
              ).map((st) => {
                const pct =
                  totalPosts > 0 ? Math.round((st.count / totalPosts) * 100) : 0;
                return (
                  <div
                    key={st.status}
                    className={`p-3.5 rounded-2xl border ${
                      isDark
                        ? 'bg-[#161B22] border-[#26303C]'
                        : 'bg-[#FAF8F5] border-[#EFECE6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <StatusStageBadge status={st.status} size="xs" />
                      <span className="text-[11px] font-bold text-stone-400">
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="text-2xl font-black"
                      style={{ color: STATUS_STYLES[st.status].hex }}
                    >
                      {st.count}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      {st.count === 1 ? '1 post' : `${st.count} posts`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div
            className={`p-5 rounded-3xl border shadow-xs ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Posts by Platform
            </h3>
            {platformEntries.length === 0 ? (
              <p className="text-xs text-stone-400">No platform data yet.</p>
            ) : (
              <div className="space-y-3">
                {platformEntries.map((item) => (
                  <div key={item.platform}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <PlatformLogo
                        platform={item.platform}
                        size="sm"
                        className="font-semibold"
                      />
                      <span className="text-stone-400 font-medium tabular-nums">
                        {item.count} posts ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: client.color || '#C44D34',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content Pillar / Category Mix */}
          <div
            className={`p-5 rounded-3xl border shadow-xs ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Posts by Content Category
            </h3>
            {categoryEntries.length === 0 ? (
              <p className="text-xs text-stone-400">No category data yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryEntries.map((item) => {
                  const catColor =
                    CATEGORY_COLORS[item.category] || CATEGORY_COLORS.POST;
                  return (
                    <div key={item.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: catColor.dot }}
                          />
                          <span className="font-semibold text-[11px] uppercase tracking-wider">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-stone-400 font-medium tabular-nums">
                          {item.count} ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: catColor.dot,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Client Portal Modal */}
      {isShareModalOpen && (
        <ClientShareModal
          client={client}
          posts={clientPosts}
          onClose={() => setIsShareModalOpen(false)}
          onOpenLivePortal={(initialPortalTab, isViewOnly) => {
            setIsShareModalOpen(false);
            if (onOpenPortal) {
              onOpenPortal(client, initialPortalTab, isViewOnly);
            }
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
};
