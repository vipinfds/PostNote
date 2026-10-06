import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  BarChart3,
  Plus,
  Share2,
  Layers,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  List,
  GripVertical,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Send,
  X,
  Check,
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
  initialTab?: 'overview' | 'analytics' | 'approvals' | 'calendar';
  onBack: () => void;
  onNewPostForClient: (clientId: string) => void;
  onEditPost: (post: Post) => void;
  onApprovePost?: (postId: string) => void;
  onRequestChanges?: (postId: string, comment?: string) => void;
  onAddPostComment?: (postId: string, comment: string) => void;
  onReschedulePost?: (postId: string, newDateStr: string) => void;
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
  onApprovePost,
  onRequestChanges,
  onAddPostComment,
  onReschedulePost,
  onOpenPortal,
  isDark,
}) => {
  // Default to Monthly Calendar first ('calendar') unless explicitly opened to 'analytics' or 'approvals'
  const [activeTab, setActiveTab] = useState<
    'calendar' | 'overview' | 'approvals' | 'analytics'
  >(
    initialTab === 'analytics'
      ? 'analytics'
      : initialTab === 'approvals'
      ? 'approvals'
      : 'calendar'
  );
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<'all' | PostStatus>('all');
  const [analyticsStageFilter, setAnalyticsStageFilter] = useState<'all' | PostStatus>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Approvals Tab states
  const [approvalsSubTab, setApprovalsSubTab] = useState<'needs-review' | 'approved'>(
    'needs-review'
  );
  const [requestChangesPostId, setRequestChangesPostId] = useState<string | null>(null);
  const [changeRequestComment, setChangeRequestComment] = useState<string>('');
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [inlineCommentText, setInlineCommentText] = useState<string>('');
  const [copiedApprovalLink, setCopiedApprovalLink] = useState(false);

  React.useEffect(() => {
    if (initialTab === 'analytics') setActiveTab('analytics');
    else if (initialTab === 'approvals') setActiveTab('approvals');
    else if (initialTab === 'calendar') setActiveTab('calendar');
  }, [initialTab, client.id]);

  // Drag-and-drop state for rescheduling posts in the Monthly Calendar
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);

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

  const activeCalendarMonthKey = `${calendarYear}-${String(calendarMonth + 1).padStart(
    2,
    '0'
  )}`;
  const calendarMonthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' }
  );

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

  // Posts filtered by stage and platform (used across calendar & list)
  const stageAndPlatformFilteredPosts = React.useMemo(() => {
    return clientPosts
      .filter((p) => (filterPlatform === 'all' ? true : p.platform === filterPlatform))
      .filter((p) =>
        filterStage === 'all' ? true : normalizePostStatus(p.status) === filterStage
      );
  }, [clientPosts, filterPlatform, filterStage]);

  const filteredPosts = React.useMemo(() => {
    return stageAndPlatformFilteredPosts.filter((p) =>
      selectedMonthFilter === 'ALL' ? true : p.date.startsWith(selectedMonthFilter)
    );
  }, [stageAndPlatformFilteredPosts, selectedMonthFilter]);

  // Posts for the currently viewed calendar month (or selectedMonthFilter when in list tab)
  const activeMonthPostsAll = React.useMemo(() => {
    const targetPrefix =
      activeTab === 'overview' && selectedMonthFilter !== 'ALL'
        ? selectedMonthFilter
        : activeCalendarMonthKey;
    return clientPosts.filter((p) => p.date.startsWith(targetPrefix));
  }, [clientPosts, activeTab, selectedMonthFilter, activeCalendarMonthKey]);

  const activeMonthLabel = React.useMemo(() => {
    if (activeTab === 'overview' && selectedMonthFilter !== 'ALL') {
      const [y, m] = selectedMonthFilter.split('-').map(Number);
      if (y && m) {
        return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      }
    }
    return calendarMonthName;
  }, [activeTab, selectedMonthFilter, calendarMonthName]);

  const activeMonthFilteredPosts = React.useMemo(() => {
    return stageAndPlatformFilteredPosts.filter((p) =>
      p.date.startsWith(activeCalendarMonthKey)
    );
  }, [stageAndPlatformFilteredPosts, activeCalendarMonthKey]);

  // Month-wise grouping of filteredPosts
  const monthGroups = React.useMemo(() => {
    const map = new Map<
      string,
      { monthKey: string; monthLabel: string; posts: Post[] }
    >();
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
              month: 'short',
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

  // Dynamic Analytics Posts (filtered by analyticsStageFilter when a stage is clicked)
  const analyticsScopedPosts = React.useMemo(() => {
    if (analyticsStageFilter === 'all') return clientPosts;
    return clientPosts.filter(
      (p) => normalizePostStatus(p.status) === analyticsStageFilter
    );
  }, [clientPosts, analyticsStageFilter]);

  const analyticsScopedTotal = analyticsScopedPosts.length;

  // Dynamic Platform breakdown (updates when analyticsStageFilter changes)
  const allClientPlatforms = React.useMemo(() => {
    return Array.from(new Set(clientPosts.map((p) => p.platform)));
  }, [clientPosts]);

  const platformEntries = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allClientPlatforms.forEach((plat) => {
      counts[plat] = 0;
    });
    analyticsScopedPosts.forEach((p) => {
      counts[p.platform] = (counts[p.platform] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform,
        count,
        percent:
          analyticsScopedTotal > 0
            ? Math.round((count / analyticsScopedTotal) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allClientPlatforms, analyticsScopedPosts, analyticsScopedTotal]);

  // Dynamic Category breakdown (updates when analyticsStageFilter changes)
  const allClientCategories = React.useMemo(() => {
    return Array.from(new Set(clientPosts.map((p) => p.category)));
  }, [clientPosts]);

  const categoryEntries = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allClientCategories.forEach((cat) => {
      counts[cat] = 0;
    });
    analyticsScopedPosts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([category, count]) => ({
        category: category as PostCategory,
        count,
        percent:
          analyticsScopedTotal > 0
            ? Math.round((count / analyticsScopedTotal) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allClientCategories, analyticsScopedPosts, analyticsScopedTotal]);

  const platforms = Array.from(
    new Set([
      'all',
      'Instagram',
      'LinkedIn',
      'YouTube',
      'TikTok',
      'Twitter',
      ...clientPosts.map((p) => p.platform),
    ])
  );

  // Build Calendar Grid Cells for (calendarYear, calendarMonth), respecting stage & platform filters
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
      const dayPosts = stageAndPlatformFilteredPosts.filter((p) => p.date === dateStr);
      cells.push({ dayNumber: day, dateStr, posts: dayPosts });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ dayNumber: null, dateStr: null, posts: [] });
    }

    return cells;
  }, [calendarYear, calendarMonth, stageAndPlatformFilteredPosts]);

  const handleDropOnCalendarCell = (targetDateStr: string | null, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDateStr(null);
    if (!targetDateStr) return;
    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    setDraggedPostId(null);
    if (postId && onReschedulePost) {
      onReschedulePost(postId, targetDateStr);
    }
  };

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

      {/* Hero Client Card (No duplicate top stage strip) */}
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
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
              style={{ backgroundColor: client.color }}
            >
              {client.name.substring(0, 2).toUpperCase()}
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

        {/* TOP SUMMARY STRIP: Posts So Far (Synced with Selected Month) + Clean Campaign Running Dates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 tabular-nums">
          {/* Card 1: Posts So Far for Selected Month */}
          <div
            className={`lg:col-span-4 p-3.5 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-[#161B22] border-[#26303C]' : 'bg-[#FAF8F5] border-[#EFECE6]'
            }`}
          >
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                Posts So Far ({activeMonthLabel})
              </div>
              <div className="text-2xl font-black mt-0.5 flex items-baseline gap-2">
                <span>{activeMonthPostsAll.length}</span>
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {activeMonthPostsAll.length === 1 ? 'post in month' : 'posts in month'}
                </span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                {totalPosts} total across all months ({postsDoneSoFar} approved/scheduled)
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#C44D34]/10 text-[#C44D34] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Active Campaigns & Clean Running Dates (No "1 Day" clutter) */}
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
                    : 'Not scheduled';

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
                          Start: <strong className="text-stone-700 dark:text-stone-200">{startFormatted}</strong> • {campPosts.length} {campPosts.length === 1 ? 'post' : 'posts'}
                        </div>
                      </div>
                      {dur.daysSpan > 1 && (
                        <div className="px-2.5 py-1 rounded-lg bg-[#C44D34]/10 text-[#C44D34] text-xs font-black shrink-0">
                          {dur.daysSpan} Days
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Switcher Tabs: 1st Monthly Calendar, 2nd Month-Wise List, 3rd Client Approvals, 4th Pipeline Analytics */}
      <div
        className={`mt-4 p-1 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-1 ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
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
          <span>Monthly Calendar</span>
        </button>

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
          <span>Month-Wise List ({totalPosts})</span>
        </button>

        <button
          id="tab-client-approvals"
          onClick={() => setActiveTab('approvals')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'approvals'
              ? 'bg-[#C44D34] text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approvals</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
              activeTab === 'approvals'
                ? 'bg-white/20 text-white'
                : inReviewCount > 0
                ? 'bg-amber-500 text-white'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            {inReviewCount}
          </span>
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

      {/* TAB 1 (DEFAULT): FULL-WIDTH MONTHLY CONTENT CALENDAR WITH DRAG-AND-DROP */}
      {activeTab === 'calendar' && (
        <div className="mt-4 space-y-4">
          {/* Calendar Control & Filter Bar: Month Switcher + Stage Tabs + Platform Dropdown */}
          <div
            className={`p-4 rounded-3xl border shadow-xs space-y-3 ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            {/* Row 1: Month Title & Month Quick Jump */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C44D34]">
                    Monthly Content Calendar • Drag & Drop Posts to Reschedule
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">
                      {calendarMonthName}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#C44D34]/10 text-[#C44D34] tabular-nums">
                      {activeMonthFilteredPosts.length}{' '}
                      {activeMonthFilteredPosts.length === 1 ? 'post' : 'posts'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Month Quick Jump Pills */}
                {availableMonths.map((m) => {
                  const [y, mo] = m.key.split('-').map(Number);
                  const isActive = y === calendarYear && mo - 1 === calendarMonth;
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

                {/* Prev / Next Month Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className={`p-2 rounded-xl border cursor-pointer ${
                      isDark
                        ? 'bg-[#161C23] border-[#26313F] text-stone-200 hover:border-[#C44D34]'
                        : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-700 hover:border-[#C44D34]'
                    }`}
                    title="Previous Month"
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
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Stage Filter Tabs (All, Planned, In review, Approved, Scheduled) + Platform Dropdown */}
            <div className="pt-3 border-t border-stone-200/70 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Stage Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterStage('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    filterStage === 'all'
                      ? 'bg-[#C44D34] text-white'
                      : isDark
                      ? 'bg-[#161C23] text-stone-300 hover:text-white border border-[#26313F]'
                      : 'bg-[#FAF8F5] text-stone-700 hover:text-stone-900 border border-[#E8E4DC]'
                  }`}
                >
                  All Stages ({activeMonthPostsAll.length})
                </button>
                {(['Planned', 'In review', 'Approved', 'Scheduled'] as PostStatus[]).map(
                  (st) => {
                    const stCountInMonth = activeMonthPostsAll.filter(
                      (p) => normalizePostStatus(p.status) === st
                    ).length;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          setFilterStage((prev) => (prev === st ? 'all' : st))
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
                          filterStage === st
                            ? 'border-[#C44D34] ring-1 ring-[#C44D34] bg-[#C44D34]/10'
                            : isDark
                            ? 'bg-[#161C23] border-[#26313F] opacity-85 hover:opacity-100'
                            : 'bg-[#FAF8F5] border-[#E8E4DC] opacity-90 hover:opacity-100'
                        }`}
                      >
                        <StatusStageBadge status={st} size="xs" />
                        <span className="text-[11px] font-extrabold tabular-nums">
                          ({stCountInMonth})
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Platform Dropdown (Clean & Never Hidden) */}
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Platform:
                </label>
                <select
                  id="client-calendar-platform-dropdown"
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                    isDark
                      ? 'bg-[#161C23] border-[#26313F] text-stone-100'
                      : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800'
                  }`}
                >
                  {platforms.map((plat) => (
                    <option key={plat} value={plat}>
                      {plat === 'all' ? 'All Platforms' : plat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Full-Width 7-Column Calendar Grid with Drag-and-Drop */}
          <div
            className={`rounded-3xl border shadow-xs overflow-hidden ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            {/* 7-Column Weekday Header */}
            <div
              className={`grid grid-cols-7 border-b text-center text-[11px] font-extrabold uppercase tracking-wider ${
                isDark
                  ? 'bg-[#161C23] border-[#26313F] text-stone-400'
                  : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-500'
              }`}
            >
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2.5 border-r last:border-r-0 border-stone-200/60 dark:border-stone-800"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 7-Column Calendar Day Cells */}
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, idx) => {
                const isToday = cell.dateStr === todayStr;
                const isDropTarget =
                  Boolean(cell.dateStr) && dragOverDateStr === cell.dateStr;

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => {
                      if (!cell.dateStr) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverDateStr !== cell.dateStr) {
                        setDragOverDateStr(cell.dateStr);
                      }
                    }}
                    onDragEnter={(e) => {
                      if (!cell.dateStr) return;
                      e.preventDefault();
                      setDragOverDateStr(cell.dateStr);
                    }}
                    onDragLeave={() => {
                      if (dragOverDateStr === cell.dateStr) {
                        setDragOverDateStr(null);
                      }
                    }}
                    onDrop={(e) => handleDropOnCalendarCell(cell.dateStr, e)}
                    className={`min-h-[145px] sm:min-h-[175px] p-2 border-b border-r last:border-r-0 transition-all flex flex-col ${
                      !cell.dayNumber
                        ? isDark
                          ? 'bg-[#141A21]/60 border-[#242E3A]'
                          : 'bg-stone-50/70 border-[#ECE8E0]'
                        : isDropTarget
                        ? 'bg-[#C44D34]/15 ring-2 ring-inset ring-[#C44D34]'
                        : isDark
                        ? 'bg-[#1D242C] border-[#26313F]'
                        : 'bg-white border-[#E8E4DC]'
                    } ${isToday && !isDropTarget ? 'ring-1 ring-inset ring-[#C44D34]' : ''}`}
                  >
                    {cell.dayNumber && (
                      <>
                        {/* Date Number Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={
                              isToday
                                ? `inline-flex items-center justify-center font-black text-base sm:text-lg leading-none tabular-nums ${
                                    isDark ? 'text-white' : 'text-[#181E24]'
                                  }`
                                : 'inline-flex items-center justify-center w-6 h-6 text-xs font-extrabold tabular-nums text-stone-700 dark:text-stone-300'
                            }
                            style={
                              isToday
                                ? {
                                    textShadow: isDark
                                      ? '0 1px 0 #000000, 1px 2px 0 rgba(196,77,52,0.75)'
                                      : '0 1px 0 #ffffff, 1px 2px 0 rgba(196,77,52,0.35)',
                                  }
                                : undefined
                            }
                          >
                            {cell.dayNumber}
                          </span>
                          {cell.posts.length > 0 && (
                            <span className="text-[10px] font-bold text-[#C44D34] tabular-nums">
                              {cell.posts.length}
                            </span>
                          )}
                        </div>

                        {/* Draggable Full Post Names Written Below the Date */}
                        <div className="space-y-1.5 flex-1">
                          {cell.posts.map((post) => {
                            const stStyle =
                              STATUS_STYLES[normalizePostStatus(post.status)];
                            const isDragging = draggedPostId === post.id;
                            return (
                              <div
                                key={post.id}
                                draggable
                                onDragStart={(e) => {
                                  setDraggedPostId(post.id);
                                  e.dataTransfer.setData('text/plain', post.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => {
                                  setDraggedPostId(null);
                                  setDragOverDateStr(null);
                                }}
                                onClick={() => onEditPost(post)}
                                title="Click to view/edit • Drag to another date to reschedule"
                                className={`p-2 rounded-xl border text-left cursor-grab active:cursor-grabbing transition-all hover:border-[#C44D34] shadow-2xs ${
                                  isDragging ? 'opacity-45 scale-95' : ''
                                } ${
                                  isDark
                                    ? 'bg-[#151C24] border-[#2B3746]'
                                    : 'bg-[#FAF8F5] border-[#E5DFD3]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1">
                                    <GripVertical className="w-3 h-3 text-stone-400 shrink-0" />
                                    <PlatformLogo
                                      platform={post.platform}
                                      size="xs"
                                      showLabel={false}
                                    />
                                  </div>
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
                                <div className="text-[11px] font-bold text-stone-900 dark:text-white leading-snug break-words">
                                  {post.title}
                                </div>
                                <div className="text-[9px] font-semibold text-[#C44D34] mt-0.5 uppercase tracking-wider">
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

      {/* TAB 2: MONTH-WISE POSTS LIST BREAKDOWN */}
      {activeTab === 'overview' && (
        <div className="mt-4 space-y-4">
          {/* Month Selector Pills + Stage Tabs + Platform Dropdown */}
          <div
            className={`p-4 rounded-3xl border shadow-xs space-y-3 ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            {availableMonths.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedMonthFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedMonthFilter === 'ALL'
                      ? 'bg-[#C44D34] text-white'
                      : isDark
                      ? 'bg-[#161C23] text-stone-300 hover:text-white border border-[#26313F]'
                      : 'bg-[#FAF8F5] text-stone-700 hover:text-stone-900 border border-[#E8E4DC]'
                  }`}
                >
                  All Months ({clientPosts.length})
                </button>
                {availableMonths.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setSelectedMonthFilter(m.key);
                      const [y, mo] = m.key.split('-').map(Number);
                      if (y && mo) {
                        setCalendarYear(y);
                        setCalendarMonth(mo - 1);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedMonthFilter === m.key
                        ? 'bg-[#C44D34] text-white'
                        : isDark
                        ? 'bg-[#161C23] text-stone-300 hover:text-white border border-[#26313F]'
                        : 'bg-[#FAF8F5] text-stone-700 hover:text-stone-900 border border-[#E8E4DC]'
                    }`}
                  >
                    {m.label} ({m.count})
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-stone-200/70 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterStage('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    filterStage === 'all'
                      ? 'bg-[#181E24] text-white dark:bg-stone-100 dark:text-stone-900'
                      : isDark
                      ? 'bg-[#161C23] text-stone-400 border border-[#26313F]'
                      : 'bg-[#FAF8F5] text-stone-600 border border-[#E8E4DC]'
                  }`}
                >
                  All Stages ({clientPosts.length})
                </button>
                {(['Planned', 'In review', 'Approved', 'Scheduled'] as PostStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() =>
                        setFilterStage((prev) => (prev === st ? 'all' : st))
                      }
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                        filterStage === st
                          ? 'border-[#C44D34] ring-1 ring-[#C44D34] bg-[#C44D34]/10'
                          : isDark
                          ? 'bg-[#161C23] border-[#26313F] opacity-85 hover:opacity-100'
                          : 'bg-[#FAF8F5] border-[#E8E4DC] opacity-90 hover:opacity-100'
                      }`}
                    >
                      <StatusStageBadge status={st} size="xs" />
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Platform:
                </label>
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                    isDark
                      ? 'bg-[#161C23] border-[#26313F] text-stone-100'
                      : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800'
                  }`}
                >
                  {platforms.map((plat) => (
                    <option key={plat} value={plat}>
                      {plat === 'all' ? 'All Platforms' : plat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
                          <span className="text-stone-500">{mPlanned} Planned</span>
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

      {/* TAB 3: CLIENT APPROVALS & FEEDBACK */}
      {activeTab === 'approvals' && (
        <div className="mt-4 space-y-4">
          {/* Client Approvals Banner & Portal Share Link */}
          <div
            className={`p-4 sm:p-5 rounded-3xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C44D34]" />
                <h3 className="text-sm sm:text-base font-bold">
                  {client.name} Client Approvals & Sign-Off
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Review posts waiting for {client.name}&apos;s approval, record client feedback, or share the direct approval portal link.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const clean = client.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                  const token = `pn_${clean}_live`;
                  const origin =
                    typeof window !== 'undefined' && window.location.origin
                      ? window.location.origin
                      : 'https://postnote.studio';
                  const url = `${origin}/?portal=${encodeURIComponent(
                    client.id
                  )}&token=${token}&view=approvals`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).catch(() => {});
                  }
                  setCopiedApprovalLink(true);
                  setTimeout(() => setCopiedApprovalLink(false), 2200);
                }}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedApprovalLink
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isDark
                    ? 'bg-[#161C23] border-[#26313F] text-stone-200 hover:border-[#C44D34]'
                    : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800 hover:border-[#C44D34]'
                }`}
              >
                {copiedApprovalLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Approval Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Copy Client Approval Link</span>
                  </>
                )}
              </button>

              {onOpenPortal && (
                <button
                  type="button"
                  onClick={() => onOpenPortal(client, 'approvals', false)}
                  className="px-3.5 py-2 rounded-xl bg-[#C44D34] hover:bg-[#b04028] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Open Client Approval Portal
                </button>
              )}
            </div>
          </div>

          {/* Sub-Tabs: Needs Client Review vs Approved */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div
              className={`p-1 rounded-2xl border inline-flex items-center gap-1 ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <button
                type="button"
                onClick={() => setApprovalsSubTab('needs-review')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  approvalsSubTab === 'needs-review'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <span>Waiting Client Review</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                    approvalsSubTab === 'needs-review'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {inReviewCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setApprovalsSubTab('approved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  approvalsSubTab === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <span>Client Approved</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                    approvalsSubTab === 'approved'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {approvedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Approvals Post List */}
          {(() => {
            const list = clientPosts.filter((p) =>
              approvalsSubTab === 'needs-review'
                ? normalizePostStatus(p.status) === 'In review'
                : normalizePostStatus(p.status) === 'Approved'
            );

            if (list.length === 0) {
              return (
                <div
                  className={`p-10 rounded-3xl border text-center ${
                    isDark
                      ? 'bg-[#1D242C] border-[#2A3440] text-stone-400'
                      : 'bg-white border-[#E8E4DC] text-stone-500'
                  }`}
                >
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                    {approvalsSubTab === 'needs-review'
                      ? `No posts currently waiting on ${client.name}'s review`
                      : `No approved posts yet for ${client.name}`}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {approvalsSubTab === 'needs-review'
                      ? 'Move any post to "In review" when it is ready for client sign-off.'
                      : 'Posts approved by the client will appear here.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {list.map((post) => {
                  const catColor =
                    CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                  const isRequestingChangesHere = requestChangesPostId === post.id;
                  const isCommentingHere = commentingPostId === post.id;
                  const activityList = post.activityLog || [];

                  return (
                    <div
                      key={post.id}
                      onClick={() => onEditPost(post)}
                      className={`p-4 sm:p-5 rounded-3xl border shadow-xs cursor-pointer transition-all hover:border-[#C44D34] ${
                        isDark
                          ? 'bg-[#1D242C] border-[#2A3440]'
                          : 'bg-white border-[#E8E4DC]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PlatformLogo platform={post.platform} size="xs" />
                          <span
                            className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              color: catColor.text,
                              backgroundColor: `${catColor.dot}18`,
                            }}
                          >
                            {post.category}
                          </span>
                          {post.campaign && post.campaign !== 'No campaign' && (
                            <span className="text-[11px] font-semibold text-[#C44D34]">
                              • {post.campaign}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusStageBadge status={post.status} size="xs" />
                          <span className="text-[11px] font-bold text-[#C44D34] tabular-nums">
                            {formatSectionDate(post.date)}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold mt-2">
                        {post.title}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                        {post.caption}
                      </p>

                      {/* Recent Client / Team Comments */}
                      {activityList.filter((a) => Boolean(a.comment)).length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-stone-200/70 dark:border-stone-800 space-y-1.5">
                          {activityList
                            .filter((a) => Boolean(a.comment))
                            .slice(-2)
                            .map((act) => (
                              <div
                                key={act.id}
                                className={`p-2.5 rounded-xl border text-[11px] ${
                                  isDark
                                    ? 'bg-[#161C23] border-stone-800 text-stone-300'
                                    : 'bg-[#FAF8F5] border-stone-200 text-stone-700'
                                }`}
                              >
                                <span className="font-bold text-[#C44D34] mr-1.5">
                                  {act.actorName}:
                                </span>
                                <span>{act.comment}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Inline Comment Box */}
                      {isCommentingHere && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`mt-3 p-3 rounded-2xl border space-y-2 ${
                            isDark
                              ? 'bg-[#161C23] border-[#26313F]'
                              : 'bg-[#FAF8F5] border-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>Add Client / Team Note</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCommentingPostId(null);
                                setInlineCommentText('');
                              }}
                              className="text-stone-400 hover:text-stone-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            autoFocus
                            value={inlineCommentText}
                            onChange={(e) => setInlineCommentText(e.target.value)}
                            placeholder="Write feedback or approval note..."
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-[#C44D34] ${
                              isDark
                                ? 'bg-[#1D242C] border-stone-700 text-white'
                                : 'bg-white border-stone-200 text-stone-900'
                            }`}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setCommentingPostId(null)}
                              className="px-3 py-1 rounded-lg text-xs text-stone-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const clean = inlineCommentText.trim();
                                if (!clean) return;
                                if (onAddPostComment) {
                                  onAddPostComment(post.id, clean);
                                }
                                setCommentingPostId(null);
                                setInlineCommentText('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#C44D34] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Save Note</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Request Changes Box */}
                      {isRequestingChangesHere && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`mt-3 p-3.5 rounded-2xl border space-y-2.5 ${
                            isDark
                              ? 'bg-[#161C23] border-amber-700/60'
                              : 'bg-amber-50/70 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                              Request Revisions (Moves back to Planned)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestChangesPostId(null);
                                setChangeRequestComment('');
                              }}
                              className="text-stone-400 hover:text-stone-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            autoFocus
                            value={changeRequestComment}
                            onChange={(e) => setChangeRequestComment(e.target.value)}
                            placeholder="What changes did the client request?"
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                              isDark
                                ? 'bg-[#1D242C] border-[#2E3B4A] text-white'
                                : 'bg-white border-amber-200 text-stone-900'
                            }`}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRequestChangesPostId(null);
                                setChangeRequestComment('');
                              }}
                              className="px-3 py-1 rounded-lg text-xs text-stone-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onRequestChanges) {
                                  onRequestChanges(
                                    post.id,
                                    changeRequestComment.trim() ||
                                      'Client requested revisions.'
                                  );
                                }
                                setRequestChangesPostId(null);
                                setChangeRequestComment('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Submit Revision Request
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3.5 pt-3 border-t border-stone-200/60 dark:border-stone-800 flex flex-wrap items-center justify-end gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setCommentingPostId(
                              isCommentingHere ? null : post.id
                            );
                            setRequestChangesPostId(null);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            isDark
                              ? 'border-[#2B3746] bg-[#161C23] text-stone-300 hover:border-[#C44D34]'
                              : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-[#C44D34]'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#C44D34]" />
                          <span>Comment</span>
                        </button>

                        {onRequestChanges && (
                          <button
                            type="button"
                            onClick={() => {
                              setRequestChangesPostId(
                                isRequestingChangesHere ? null : post.id
                              );
                              setCommentingPostId(null);
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                              isDark
                                ? 'border-amber-700/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40'
                                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Request Changes</span>
                          </button>
                        )}

                        {approvalsSubTab === 'needs-review' && onApprovePost && (
                          <button
                            type="button"
                            onClick={() => onApprovePost(post.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Post</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: DYNAMIC INTERACTIVE PIPELINE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="mt-4 space-y-4">
          {/* Interactive 4-Stage Workflow Breakdown */}
          <div
            className={`p-5 rounded-3xl border shadow-xs ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  4-Stage Content Pipeline (Click any stage to filter Platform & Category counts)
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Showing breakdown for:{' '}
                  <strong className="text-[#C44D34]">
                    {analyticsStageFilter === 'all'
                      ? `All Stages (${totalPosts} posts)`
                      : `${analyticsStageFilter} (${analyticsScopedTotal} posts)`}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {analyticsStageFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setAnalyticsStageFilter('all')}
                    className="px-3 py-1 rounded-xl bg-[#C44D34] text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Show All Stages ({totalPosts})
                  </button>
                )}
                <span className="text-xs font-semibold text-stone-400 tabular-nums">
                  {totalPosts} Total ({postsDoneSoFar} Approved/Scheduled)
                </span>
              </div>
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
                const isSelectedStage = analyticsStageFilter === st.status;
                return (
                  <button
                    key={st.status}
                    type="button"
                    onClick={() =>
                      setAnalyticsStageFilter((prev) =>
                        prev === st.status ? 'all' : st.status
                      )
                    }
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelectedStage
                        ? 'border-[#C44D34] ring-2 ring-[#C44D34]/40 bg-[#C44D34]/10'
                        : isDark
                        ? 'bg-[#161B22] border-[#26303C] hover:border-[#C44D34]/60'
                        : 'bg-[#FAF8F5] border-[#EFECE6] hover:border-[#C44D34]/60'
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
                    <div className="text-[11px] text-stone-400 mt-0.5 flex items-center justify-between">
                      <span>{st.count === 1 ? '1 post' : `${st.count} posts`}</span>
                      <span className="text-[10px] font-bold text-[#C44D34]">
                        {isSelectedStage ? 'Active Filter' : 'Click to filter →'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Platform Breakdown + Content Category Mix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Platform Breakdown */}
            <div
              className={`p-5 rounded-3xl border shadow-xs ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Posts by Platform
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#C44D34]/10 text-[#C44D34]">
                  {analyticsStageFilter === 'all' ? 'All Stages' : analyticsStageFilter}
                </span>
              </div>
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
                        <span className="text-stone-500 dark:text-stone-300 font-bold tabular-nums">
                          {item.count} {item.count === 1 ? 'post' : 'posts'} ({item.percent}%)
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Posts by Content Category
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#C44D34]/10 text-[#C44D34]">
                  {analyticsStageFilter === 'all' ? 'All Stages' : analyticsStageFilter}
                </span>
              </div>
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
                          <span className="text-stone-500 dark:text-stone-300 font-bold tabular-nums">
                            {item.count} {item.count === 1 ? 'post' : 'posts'} ({item.percent}%)
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

          {/* Matching Posts List for Selected Stage */}
          <div
            className={`p-5 rounded-3xl border shadow-xs ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                {analyticsStageFilter === 'all'
                  ? `All Posts (${analyticsScopedPosts.length})`
                  : `${analyticsStageFilter} Posts (${analyticsScopedPosts.length})`}
              </h3>
            </div>
            {analyticsScopedPosts.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">
                No posts currently in the {analyticsStageFilter} stage.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {analyticsScopedPosts.map((post) => {
                  const catColor =
                    CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                  return (
                    <div
                      key={post.id}
                      onClick={() => onEditPost(post)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:border-[#C44D34] ${
                        isDark
                          ? 'bg-[#161C23] border-[#26313F]'
                          : 'bg-[#FAF8F5] border-[#ECE8E0]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <PlatformLogo platform={post.platform} size="xs" />
                          <span
                            className="font-bold text-[10px] uppercase tracking-wider"
                            style={{ color: catColor.text }}
                          >
                            {post.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusStageBadge status={post.status} size="xs" />
                          <span className="text-[10px] font-bold text-[#C44D34] tabular-nums">
                            {formatSectionDate(post.date)}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold mt-1.5">{post.title}</h4>
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
