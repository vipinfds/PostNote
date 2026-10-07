import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Layers,
  MessageSquare,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Check,
  Eye,
  FolderKanban,
  Link as LinkIcon,
  History,
  Sparkles,
  Send,
  X,
  RotateCcw,
  UserCheck,
  CheckCheck,
  CheckCircle2,
  Activity,
  ChevronLeft,
  List,
  GripVertical,
  Pencil,
  Share2,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { Client, Post, Campaign, SubscriptionState, PostStatus, MediaItem } from '../types';
import {
  CATEGORY_COLORS,
  STATUS_STYLES,
  getTodayDateStr,
  computeCampaignDuration,
  normalizePostStatus,
} from '../utils/theme';
import { INITIAL_CAMPAIGNS } from '../data/initialData';
import { ClientShareModal } from './ClientShareModal';
import { StatusStageBadge } from './StatusStageBadge';
import { MediaCarousel } from './MediaCarousel';
import { PlatformLogo } from './PlatformLogo';
import { BrandLogo } from './BrandLogo';

export type ClientPortalTab =
  | 'overview'
  | 'upcoming'
  | 'analytics'
  | 'approvals'
  | 'calendar'
  | 'campaigns';

interface ClientPortalViewProps {
  client: Client;
  posts: Post[];
  campaigns?: Campaign[];
  subscription?: SubscriptionState;
  initialTab?: ClientPortalTab;
  initialCampaignId?: string | null;
  isViewOnly?: boolean;
  isLockedPortal?: boolean;
  onApprovePost: (postId: string) => void;
  onRequestChanges: (postId: string, notes?: string, clientAuthorName?: string) => void;
  onAddClientFeedback?: (postId: string, comment: string, clientAuthorName?: string) => void;
  onReschedulePost?: (postId: string, newDateStr: string) => void;
  onEditClient?: (client: Client, e: React.MouseEvent) => void;
  onNewPostForClient?: (clientId: string) => void;
  onEditPost?: (post: Post) => void;
  onExit?: () => void;
  isDark?: boolean;
}

type PortalAnalyticsDrillDown =
  | { type: 'all'; label: string }
  | { type: 'stage'; stage: PostStatus; label: string }
  | { type: 'platform'; platform: string; label: string }
  | { type: 'category'; category: string; label: string }
  | { type: 'campaign'; campaignName: string; label: string };

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  client,
  posts,
  campaigns = INITIAL_CAMPAIGNS,
  initialTab = 'overview',
  initialCampaignId = null,
  isLockedPortal = false,
  onApprovePost,
  onRequestChanges,
  onAddClientFeedback,
  onReschedulePost,
  onEditClient,
  onNewPostForClient,
  onEditPost,
  onExit,
  isDark,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClientPortalTab>(
    initialTab === 'approvals' ? 'upcoming' : initialTab
  );
  const [feedbackPostId, setFeedbackPostId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [clientReviewerName, setClientReviewerName] = useState<string>(
    `${client.name} (Client)`
  );
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<'all' | PostStatus>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');

  // Grouped Review Batch Expansion state (when multiple posts are sent for review at once)
  const [isReviewBatchExpanded, setIsReviewBatchExpanded] = useState<boolean>(
    initialTab === 'approvals'
  );
  const [isApprovedBatchExpanded, setIsApprovedBatchExpanded] = useState<boolean>(false);

  // Selected post for Client Post Detail & Feedback Modal
  const [selectedPortalPostId, setSelectedPortalPostId] = useState<string | null>(null);
  const [modalFeedbackText, setModalFeedbackText] = useState<string>('');

  // Selected campaign for Campaign Analytics Pop-up Modal
  const [selectedCampaignForModal, setSelectedCampaignForModal] =
    useState<Campaign | null>(null);

  // Clickable Analytics Drill-Down in Client Portal (null = no filter active, click away dismisses)
  const [analyticsDrillDown, setAnalyticsDrillDown] =
    useState<PortalAnalyticsDrillDown | null>(null);

  // Collapsible sections in Client Portal
  const [isCampaignsSectionOpen, setIsCampaignsSectionOpen] = useState<boolean>(true);
  const [isPastPostsSectionOpen, setIsPastPostsSectionOpen] = useState<boolean>(true);
  const [expandedPortalCampaignId, setExpandedPortalCampaignId] = useState<string | null>(
    initialCampaignId
  );

  React.useEffect(() => {
    if (initialTab === 'approvals') {
      setActiveTab('upcoming');
      setIsReviewBatchExpanded(true);
    } else {
      setActiveTab(initialTab);
    }
  }, [initialTab, client.id]);

  React.useEffect(() => {
    if (initialCampaignId) {
      setExpandedPortalCampaignId(initialCampaignId);
    }
  }, [initialCampaignId]);

  const todayStr = getTodayDateStr();

  // Filter posts strictly for THIS client only
  const clientPosts = posts
    .filter((p) => p.clientId === client.id || p.clientName === client.name)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedPortalPost = React.useMemo(
    () => clientPosts.find((p) => p.id === selectedPortalPostId) || null,
    [clientPosts, selectedPortalPostId]
  );

  // Filter campaigns for THIS client (or derive from posts)
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

  React.useEffect(() => {
    if (initialCampaignId && clientCampaigns.length > 0) {
      const found = clientCampaigns.find((c) => c.id === initialCampaignId);
      if (found) {
        setSelectedCampaignForModal(found);
      }
    }
  }, [initialCampaignId, clientCampaigns]);

  // 4-Stage groupings
  const plannedPosts = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Planned'
  );
  const pendingApprovals = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'In review'
  );
  const approvedPosts = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Approved'
  );
  const scheduledPosts = clientPosts.filter(
    (p) => normalizePostStatus(p.status) === 'Scheduled'
  );

  // Upcoming vs Past (Till Date) groupings
  const upcomingClientPosts = clientPosts
    .filter((p) => p.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastClientPosts = clientPosts
    .filter((p) => p.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  // All-time date span, Start Date, and Days Running
  const allTimeDuration = computeCampaignDuration(clientPosts);
  const totalPosts = clientPosts.length;
  const postsDoneSoFar = scheduledPosts.length + approvedPosts.length;

  const formattedStartDate = React.useMemo(() => {
    if (!allTimeDuration.startStr) return 'Not started';
    try {
      const d = new Date(`${allTimeDuration.startStr}T00:00:00`);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return allTimeDuration.startStr;
    }
  }, [allTimeDuration.startStr]);

  const daysRunningSoFar = React.useMemo(() => {
    if (!allTimeDuration.startStr) return 0;
    try {
      const startD = new Date(`${allTimeDuration.startStr}T00:00:00`);
      const todayD = new Date(`${todayStr}T00:00:00`);
      const maxEndD = allTimeDuration.endStr
        ? new Date(`${allTimeDuration.endStr}T00:00:00`)
        : todayD;
      const effectiveEnd = todayD > maxEndD ? todayD : maxEndD;
      const diffMs = Math.max(0, effectiveEnd.getTime() - startD.getTime());
      return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    } catch {
      return allTimeDuration.daysSpan || 0;
    }
  }, [allTimeDuration.startStr, allTimeDuration.endStr, allTimeDuration.daysSpan, todayStr]);

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

  const portalAnalyticsPosts = React.useMemo(() => {
    if (!analyticsDrillDown) return [];
    if (analyticsDrillDown.type === 'all') return clientPosts;
    if (analyticsDrillDown.type === 'stage') {
      return clientPosts.filter(
        (p) => normalizePostStatus(p.status) === analyticsDrillDown.stage
      );
    }
    if (analyticsDrillDown.type === 'platform') {
      return clientPosts.filter((p) => p.platform === analyticsDrillDown.platform);
    }
    if (analyticsDrillDown.type === 'category') {
      return clientPosts.filter((p) => p.category === analyticsDrillDown.category);
    }
    if (analyticsDrillDown.type === 'campaign') {
      return clientPosts.filter(
        (p) =>
          (p.campaign || '').toLowerCase() ===
          analyticsDrillDown.campaignName.toLowerCase()
      );
    }
    return clientPosts;
  }, [analyticsDrillDown, clientPosts]);

  const getMediaItemsForPost = (post: Post): MediaItem[] => {
    if (post.media && post.media.length > 0) return post.media;
    if (post.mediaUrl) {
      return [
        {
          id: `media-${post.id}`,
          title: post.title || 'Attached Media',
          type: post.mediaType || 'image',
          url: post.mediaUrl,
          thumbnailUrl: post.mediaUrl,
        },
      ];
    }
    return [];
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackPostId || !feedbackNote.trim()) return;
    if (onAddClientFeedback) {
      onAddClientFeedback(
        feedbackPostId,
        feedbackNote.trim(),
        clientReviewerName.trim() || `${client.name} (Client)`
      );
    } else {
      onRequestChanges(
        feedbackPostId,
        feedbackNote.trim(),
        clientReviewerName.trim() || `${client.name} (Client)`
      );
    }
    setFeedbackPostId(null);
    setFeedbackNote('');
  };

  const handleModalSubmitClientFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortalPost || !modalFeedbackText.trim()) return;
    const cleanComment = modalFeedbackText.trim();
    const author = clientReviewerName.trim() || `${client.name} (Client)`;
    if (onAddClientFeedback) {
      onAddClientFeedback(selectedPortalPost.id, cleanComment, author);
    } else {
      onRequestChanges(selectedPortalPost.id, cleanComment, author);
    }
    setModalFeedbackText('');
  };

  // Filtered calendar/schedule posts
  const filteredCalendarPosts = clientPosts
    .filter((p) => filterPlatform === 'all' || p.platform === filterPlatform)
    .filter(
      (p) => filterStage === 'all' || normalizePostStatus(p.status) === filterStage
    )
    .filter((p) =>
      selectedMonthFilter === 'ALL' ? true : p.date.startsWith(selectedMonthFilter)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Available months across all clientPosts (e.g. July, August, September, October)
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

  // Month-wise grouping for the Posts tab
  const monthGroups = React.useMemo(() => {
    const map = new Map<
      string,
      { monthKey: string; monthLabel: string; posts: Post[] }
    >();
    filteredCalendarPosts.forEach((post) => {
      const monthKey = post.date.slice(0, 7);
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
  }, [filteredCalendarPosts]);

  // Full-Page Monthly Calendar state & grid cells
  const initialCalMonth = React.useMemo(() => {
    if (clientPosts.length > 0) {
      const sortedAsc = [...clientPosts].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      const upcoming = sortedAsc.find((p) => p.date >= todayStr);
      const refDate = upcoming
        ? upcoming.date
        : sortedAsc[sortedAsc.length - 1].date;
      const [y, m] = refDate.split('-').map(Number);
      if (y && m) return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [clientPosts, todayStr]);

  const [calendarYear, setCalendarYear] = useState<number>(initialCalMonth.year);
  const [calendarMonth, setCalendarMonth] = useState<number>(initialCalMonth.month);

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

  const activeCalendarMonthKey = `${calendarYear}-${String(calendarMonth + 1).padStart(
    2,
    '0'
  )}`;

  const calendarStageAndPlatformPosts = React.useMemo(() => {
    return clientPosts
      .filter((p) => filterPlatform === 'all' || p.platform === filterPlatform)
      .filter(
        (p) => filterStage === 'all' || normalizePostStatus(p.status) === filterStage
      );
  }, [clientPosts, filterPlatform, filterStage]);

  const activeCalendarMonthAllPosts = React.useMemo(() => {
    const targetPrefix =
      activeTab === 'upcoming' && selectedMonthFilter !== 'ALL'
        ? selectedMonthFilter
        : activeCalendarMonthKey;
    return clientPosts.filter((p) => p.date.startsWith(targetPrefix));
  }, [clientPosts, activeTab, selectedMonthFilter, activeCalendarMonthKey]);

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
      const dayPosts = calendarStageAndPlatformPosts.filter(
        (p) => p.date === dateStr
      );
      cells.push({ dayNumber: day, dateStr, posts: dayPosts });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ dayNumber: null, dateStr: null, posts: [] });
    }

    return cells;
  }, [calendarYear, calendarMonth, calendarStageAndPlatformPosts]);

  const calendarMonthName = new Date(
    calendarYear,
    calendarMonth,
    1
  ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const activeSummaryMonthLabel = React.useMemo(() => {
    if (activeTab === 'upcoming' && selectedMonthFilter !== 'ALL') {
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

  const renderClientPostReviewCard = (post: Post, isApprovedMode = false) => {
    const catColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
    const isCommenting = feedbackPostId === post.id;
    const mediaItems = getMediaItemsForPost(post);
    const clientFeedbackEntries = (post.activityLog || []).filter(
      (a) =>
        a.type === 'client_feedback' ||
        a.type === 'changes_requested' ||
        a.type === 'comment'
    );

    return (
      <div
        key={post.id}
        onClick={() => setSelectedPortalPostId(post.id)}
        className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-[#C44D34] ${
          isDark ? 'bg-[#161C23] border-[#26313F]' : 'bg-[#FAF8F5] border-[#ECE8E0]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
            <span className="text-stone-400">•</span>
            <PlatformLogo platform={post.platform} size="xs" />
            {post.campaign && post.campaign !== 'No campaign' && (
              <>
                <span className="text-stone-400">•</span>
                <span className="text-[11px] font-semibold text-[#C44D34]">
                  {post.campaign}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusStageBadge status={post.status} size="xs" />
            <span className="text-[11px] font-bold text-[#C44D34] tabular-nums">
              Scheduled: {post.date}
            </span>
          </div>
        </div>

        <h3 className="text-sm font-bold mt-2">{post.title}</h3>
        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 whitespace-pre-line leading-relaxed">
          {post.caption}
        </p>

        {mediaItems.length > 0 && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <MediaCarousel
              mediaItems={mediaItems}
              fallbackTitle={post.title}
              heightClass="aspect-video max-h-[240px]"
              isDark={isDark}
            />
          </div>
        )}

        {/* Recent Client Feedback Preview */}
        {clientFeedbackEntries.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-stone-800 space-y-1.5">
            {clientFeedbackEntries.slice(-2).map((entry) => (
              <div
                key={entry.id}
                className={`p-2 rounded-xl border text-[11px] flex items-start justify-between gap-2 ${
                  entry.type === 'client_feedback'
                    ? isDark
                      ? 'bg-[#C44D34]/10 border-[#C44D34]/30 text-stone-200'
                      : 'bg-[#C44D34]/[0.06] border-[#C44D34]/25 text-stone-800'
                    : isDark
                    ? 'bg-[#1D242C] border-stone-800 text-stone-300'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}
              >
                <div>
                  <span className="font-bold text-[#C44D34] uppercase tracking-wider text-[9px] mr-1.5">
                    {entry.type === 'client_feedback'
                      ? 'CLIENT FEEDBACK'
                      : entry.actorRole || 'STUDIO'}
                  </span>
                  <span className="font-semibold mr-1">{entry.actorName}:</span>
                  <span>{entry.comment || entry.details}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar (Works for both In Review and Approved so Client can edit their choice anytime) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3.5 pt-3 border-t border-stone-200/70 dark:border-stone-800 flex flex-wrap items-center gap-2"
        >
          {!isApprovedMode ? (
            <button
              type="button"
              onClick={() => onApprovePost(post.id)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Approve Post</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFeedbackPostId(isCommenting ? null : post.id);
                setFeedbackNote('');
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'border-amber-700/80 text-amber-400 hover:bg-amber-950/40'
                  : 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Edit Choice / Request Changes</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setFeedbackPostId(isCommenting ? null : post.id);
              setFeedbackNote('');
            }}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                : 'border-stone-300 text-stone-700 hover:bg-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#C44D34]" />
            <span>Add Comment / Feedback</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPortalPostId(post.id)}
            className="ml-auto text-xs font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isCommenting && (
          <form
            onSubmit={handleSendFeedback}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C44D34]">
                Marked as Client Feedback · Notifies Studio Team
              </span>
              <input
                type="text"
                value={clientReviewerName}
                onChange={(e) => setClientReviewerName(e.target.value)}
                placeholder="Your Name"
                className={`px-2.5 py-1 rounded-lg border text-[11px] w-44 focus:outline-none focus:border-[#C44D34] ${
                  isDark
                    ? 'bg-[#1D242C] border-stone-700 text-white'
                    : 'bg-white border-stone-300 text-stone-900'
                }`}
              />
            </div>
            <textarea
              rows={2}
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder={
                isApprovedMode
                  ? 'Add a follow-up comment or explain what needs to be changed on this approved post...'
                  : 'Write your feedback or revision note for the studio team...'
              }
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-[#C44D34] ${
                isDark
                  ? 'bg-[#1D242C] border-stone-700 text-white'
                  : 'bg-white border-stone-300 text-stone-900'
              }`}
              required
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setFeedbackPostId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRequestChanges(
                    post.id,
                    feedbackNote.trim() ||
                      (isApprovedMode
                        ? 'Client updated choice from Approved to Request Revisions.'
                        : 'Requested revisions before approval.'),
                    clientReviewerName.trim() || `${client.name} (Client)`
                  );
                  setFeedbackPostId(null);
                  setFeedbackNote('');
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  isDark
                    ? 'border-amber-700 text-amber-400 hover:bg-amber-950/40'
                    : 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>
                  {isApprovedMode
                    ? 'Switch to Needs Revision'
                    : 'Request Revisions'}
                </span>
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#C44D34] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Post Comment Only</span>
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div
      id="client-portal-view"
      className={`min-h-screen pb-24 transition-colors ${
        isDark ? 'bg-[#131920] text-stone-100' : 'bg-[#FAF7F2] text-[#1E252B]'
      }`}
    >
      {/* Top Client Portal Banner */}
      <div
        className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 ${
          isDark
            ? 'bg-[#161D25]/95 border-[#25303E]'
            : 'bg-white/95 border-[#E8E4DC]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {!isLockedPortal && onExit && (
            <button
              id="exit-client-portal-btn"
              onClick={onExit}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:border-[#C44D34]'
                  : 'bg-[#FAF8F5] border-[#E5DFD3] text-stone-700 hover:border-[#C44D34]'
              }`}
              title="Back to All Clients"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
            style={{ backgroundColor: client.color || '#C44D34' }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {client.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Unified Client Portal</span>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px] text-stone-400">
              <span>
                {totalPosts} Posts ({postsDoneSoFar} Approved/Scheduled)
                {client.notes ? ` • ${client.notes}` : ''}
              </span>
            </div>

            {/* Clean Icon-Only Social Channel Redirects + Plus Button */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {(client.socialLinks && client.socialLinks.length > 0
                ? client.socialLinks
                : client.socialUrl
                ? [{ platform: 'Instagram' as const, url: client.socialUrl, label: client.handle }]
                : []
              ).map((link, idx) => {
                const displayLabel = link.label || link.handle;
                return (
                  <a
                    key={`${link.platform}-${idx}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all hover:scale-105 ${
                      isDark
                        ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:border-[#C44D34]'
                        : 'bg-[#FAF8F5] border-[#E5DFD3] text-stone-700 hover:border-[#C44D34] shadow-2xs'
                    }`}
                    title={`Open ${link.platform}${displayLabel ? ` (${displayLabel})` : ''} in new tab`}
                  >
                    <PlatformLogo platform={link.platform} size="sm" showLabel={false} />
                  </a>
                );
              })}

              {!isLockedPortal && onEditClient && (
                <button
                  type="button"
                  onClick={(e) => onEditClient(client, e)}
                  className={`w-7 h-7 rounded-lg border border-dashed flex items-center justify-center transition-colors cursor-pointer ${
                    isDark
                      ? 'border-stone-700 text-stone-400 hover:text-[#C44D34] hover:border-[#C44D34]'
                      : 'border-stone-300 text-stone-500 hover:text-[#C44D34] hover:border-[#C44D34]'
                  }`}
                  title="Add or manage social media links"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isLockedPortal && onEditClient && (
            <button
              id="portal-edit-client-btn"
              type="button"
              onClick={(e) => onEditClient(client, e)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:border-[#C44D34]'
                  : 'bg-white border-[#E5DFD3] text-stone-700 hover:border-[#C44D34] shadow-2xs'
              }`}
              title="Edit client details & manage multiple social account links"
            >
              <Pencil className="w-3.5 h-3.5 text-[#C44D34]" />
              <span>Edit Client & Links</span>
            </button>
          )}

          {!isLockedPortal && (
            <button
              id="portal-share-link-btn"
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:border-[#C44D34]'
                  : 'bg-white border-[#E5DFD3] text-stone-700 hover:border-[#C44D34] shadow-2xs'
              }`}
              title="Share Client Portal Link"
            >
              <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
              <span>Share Portal</span>
            </button>
          )}

          {!isLockedPortal && onNewPostForClient && (
            <button
              id="portal-new-post-btn"
              type="button"
              onClick={() => onNewPostForClient(client.id)}
              className="px-3.5 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#A93E27] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Post</span>
            </button>
          )}

          <div className="hidden xl:flex items-center ml-1">
            <BrandLogo size="sm" isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Main Container (Wider max-w-7xl so Full-Page Calendar has plenty of room) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* Top 4-Stage Workflow Progress Breakdown Strip (No Stage Boxes) */}
        <div
          className={`p-4 rounded-2xl border mb-5 tabular-nums ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-300">
              4-Stage Workflow Breakdown • {totalPosts} Total Deliverables
            </span>
            {clientCampaigns.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                <FolderKanban className="w-3.5 h-3.5 text-[#C44D34]" />
                <span>
                  {clientCampaigns.length}{' '}
                  {clientCampaigns.length === 1 ? 'Active Campaign' : 'Active Campaigns'}
                </span>
              </span>
            )}
          </div>

          <div className="w-full h-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden flex gap-1 p-0.5">
            {totalPosts === 0 ? (
              <div className="w-full h-full rounded-lg bg-stone-200 dark:bg-stone-700" />
            ) : (
              (
                [
                  { status: 'Planned' as PostStatus, count: plannedPosts.length },
                  { status: 'In review' as PostStatus, count: pendingApprovals.length },
                  { status: 'Approved' as PostStatus, count: approvedPosts.length },
                  { status: 'Scheduled' as PostStatus, count: scheduledPosts.length },
                ] as const
              ).map((item) => {
                if (item.count === 0) return null;
                const pct = Math.round((item.count / totalPosts) * 100);
                const isSel =
                  activeTab === 'analytics' &&
                  analyticsDrillDown?.type === 'stage' &&
                  analyticsDrillDown.stage === item.status;
                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        activeTab === 'analytics' &&
                        analyticsDrillDown?.type === 'stage' &&
                        analyticsDrillDown.stage === item.status
                      ) {
                        setAnalyticsDrillDown(null);
                      } else {
                        setAnalyticsDrillDown({
                          type: 'stage',
                          stage: item.status,
                          label: `Stage: ${item.status}`,
                        });
                        setActiveTab('analytics');
                      }
                    }}
                    title={`Filter in Client Analytics by ${item.status}: ${item.count} (${pct}%)`}
                    className={`h-full first:rounded-l-lg last:rounded-r-lg transition-all cursor-pointer ${
                      isSel
                        ? 'ring-2 ring-offset-1 ring-stone-900 dark:ring-white scale-y-105'
                        : 'hover:opacity-90'
                    }`}
                    style={{
                      width: `${Math.max(pct, 8)}%`,
                      backgroundColor: STATUS_STYLES[item.status].hex,
                    }}
                  />
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 dark:text-stone-400 mt-2.5">
            {(
              [
                { status: 'Planned' as PostStatus, count: plannedPosts.length },
                { status: 'In review' as PostStatus, count: pendingApprovals.length },
                { status: 'Approved' as PostStatus, count: approvedPosts.length },
                { status: 'Scheduled' as PostStatus, count: scheduledPosts.length },
              ] as const
            ).map((item) => {
              const pct = totalPosts > 0 ? Math.round((item.count / totalPosts) * 100) : 0;
              const isSel =
                activeTab === 'analytics' &&
                analyticsDrillDown?.type === 'stage' &&
                analyticsDrillDown.stage === item.status;
              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      activeTab === 'analytics' &&
                      analyticsDrillDown?.type === 'stage' &&
                      analyticsDrillDown.stage === item.status
                    ) {
                      setAnalyticsDrillDown(null);
                    } else {
                      setAnalyticsDrillDown({
                        type: 'stage',
                        stage: item.status,
                        label: `Stage: ${item.status}`,
                      });
                      setActiveTab('analytics');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 font-bold cursor-pointer ${
                    isSel
                      ? 'text-stone-900 dark:text-white underline underline-offset-4'
                      : 'hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_STYLES[item.status].hex }}
                  />
                  <span>{item.status}:</span>
                  <strong style={{ color: STATUS_STYLES[item.status].hex }}>{item.count}</strong>
                  <span className="text-[11px] opacity-75">({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs: Overview, Campaigns, Full Calendar, Monthly Posts (with Approvals), Client Analytics */}
        <div
          className={`p-1 rounded-2xl border grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <button
            id="portal-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#C44D34] text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            id="portal-tab-campaigns"
            onClick={() => setActiveTab('campaigns')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-[#C44D34] text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Campaigns ({clientCampaigns.length})</span>
          </button>

          <button
            id="portal-tab-calendar"
            onClick={() => setActiveTab('calendar')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#C44D34] text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Full Calendar</span>
          </button>

          <button
            id="portal-tab-upcoming"
            onClick={() => setActiveTab('upcoming')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-[#C44D34] text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Monthly Posts ({clientPosts.length})</span>
            {pendingApprovals.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-[#C44D34]'
                    : 'bg-amber-500 text-white'
                }`}
                title={`${pendingApprovals.length} waiting for approval`}
              >
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            id="portal-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#C44D34] text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Client Analytics</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ARCHIVE (TILL DATE) */}
        {activeTab === 'overview' && (
          <div className="mt-5 space-y-5 animate-fade-in">
            {/* 1. Grouped Review Batch: Posts Waiting for Your Review */}
            <div
              className={`rounded-3xl border shadow-xs overflow-hidden ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              {pendingApprovals.length === 0 ? (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Posts Waiting for Your Review (0)</span>
                      </h2>
                      <p className="text-xs text-stone-400 mt-0.5">
                        All pending review batches have been reviewed. You can edit your choice or add comments on approved posts below anytime.
                      </p>
                    </div>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border text-center ${
                      isDark
                        ? 'bg-[#161C23] border-[#242E3A]'
                        : 'bg-[#FAF8F5] border-[#ECE8E0]'
                    }`}
                  >
                    <Check className="w-7 h-7 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-bold">All caught up!</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Grouped Batch Header: Click to expand all posts sent for review */}
                  <div
                    id="portal-review-batch-header"
                    onClick={() => setIsReviewBatchExpanded((prev) => !prev)}
                    className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isReviewBatchExpanded
                        ? isDark
                          ? 'bg-[#212B36] border-b border-[#2A3440]'
                          : 'bg-[#FAF7F2] border-b border-[#E8E4DC]'
                        : isDark
                        ? 'hover:bg-[#212B36]/60'
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-bold tracking-tight">
                            {client.name} — Review Batch
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {pendingApprovals.length}{' '}
                            {pendingApprovals.length === 1
                              ? 'Post Sent for Review'
                              : 'Posts Grouped for Review'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-stone-400">
                          <span>
                            Click to {isReviewBatchExpanded ? 'collapse' : 'expand'} all{' '}
                            {pendingApprovals.length} posts, add comments, or approve
                          </span>
                          <span>•</span>
                          <div className="flex items-center gap-1.5">
                            {Array.from(
                              new Set(pendingApprovals.map((p) => p.platform))
                            ).map((plat) => (
                              <PlatformLogo
                                key={plat}
                                platform={plat}
                                size="xs"
                                showLabel={false}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 self-end sm:self-center shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {pendingApprovals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            pendingApprovals.forEach((p) => onApprovePost(p.id));
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Approve All ({pendingApprovals.length})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsReviewBatchExpanded((prev) => !prev)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-[#161D25] border-[#2C3846] text-stone-200 hover:border-[#C44D34]'
                            : 'bg-white border-stone-200 text-stone-700 hover:border-[#C44D34]'
                        }`}
                      >
                        <span>
                          {isReviewBatchExpanded
                            ? 'Hide Posts'
                            : `Expand All ${pendingApprovals.length} Posts`}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            isReviewBatchExpanded ? 'rotate-180 text-[#C44D34]' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Posts inside the Review Batch */}
                  {isReviewBatchExpanded && (
                    <div className="p-4 sm:p-5 space-y-3 animate-fade-in">
                      {pendingApprovals.map((post) =>
                        renderClientPostReviewCard(post, false)
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 1B. Approved Posts Batch (Editable Choice & Add Comments Anytime) */}
            {approvedPosts.length > 0 && (
              <div
                className={`rounded-3xl border shadow-xs overflow-hidden ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div
                  id="portal-approved-batch-header"
                  onClick={() => setIsApprovedBatchExpanded((prev) => !prev)}
                  className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isApprovedBatchExpanded
                      ? isDark
                        ? 'bg-[#212B36] border-b border-[#2A3440]'
                        : 'bg-[#FAF7F2] border-b border-[#E8E4DC]'
                      : isDark
                      ? 'hover:bg-[#212B36]/60'
                      : 'hover:bg-stone-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold tracking-tight">
                          Approved Posts — Edit Choice or Add Comments ({approvedPosts.length})
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Approved
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Changed your mind after approving? Expand to edit your choice, request revisions, or add extra comments.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsApprovedBatchExpanded((prev) => !prev);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer self-end sm:self-center shrink-0 ${
                      isDark
                        ? 'bg-[#161D25] border-[#2C3846] text-stone-200'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>{isApprovedBatchExpanded ? 'Collapse' : 'Expand'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isApprovedBatchExpanded ? 'rotate-180 text-[#C44D34]' : ''
                      }`}
                    />
                  </button>
                </div>

                {isApprovedBatchExpanded && (
                  <div className="p-4 sm:p-5 space-y-3 animate-fade-in">
                    {approvedPosts.map((post) =>
                      renderClientPostReviewCard(post, true)
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Collapsible Section: Campaigns & Ad Links (Till Date) */}
            <div
              className={`rounded-3xl border shadow-xs overflow-hidden ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <button
                id="portal-toggle-campaigns-section"
                type="button"
                onClick={() => setIsCampaignsSectionOpen((prev) => !prev)}
                className="w-full p-5 flex items-center justify-between text-left cursor-pointer hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#C44D34]/10 text-[#C44D34] flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                      <span>Campaigns & Meta Ad Links (Till Date)</span>
                      <span className="text-xs font-bold text-[#C44D34] tabular-nums">
                        ({clientCampaigns.length})
                      </span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Click any campaign to inspect post analytics, duration, and clickable Meta Ad links
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-stone-400 transition-transform duration-200 ${
                    isCampaignsSectionOpen ? 'rotate-180 text-[#C44D34]' : ''
                  }`}
                />
              </button>

              {isCampaignsSectionOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-stone-100 dark:border-stone-800 space-y-3">
                  {clientCampaigns.length === 0 ? (
                    <p className="text-xs text-stone-400 py-4 text-center">
                      No campaigns recorded for {client.name} yet.
                    </p>
                  ) : (
                    clientCampaigns.map((camp) => {
                      const campPosts = clientPosts.filter(
                        (p) =>
                          (p.campaign || '').toLowerCase() === camp.name.toLowerCase() ||
                          p.campaignId === camp.id
                      );
                      const duration = computeCampaignDuration(
                        campPosts,
                        camp.startDate,
                        camp.endDate
                      );
                      const isExpanded = expandedPortalCampaignId === camp.id;

                      const stageCounts: Record<PostStatus, number> = {
                        Planned: campPosts.filter(
                          (p) => normalizePostStatus(p.status) === 'Planned'
                        ).length,
                        'In review': campPosts.filter(
                          (p) => normalizePostStatus(p.status) === 'In review'
                        ).length,
                        Approved: campPosts.filter(
                          (p) => normalizePostStatus(p.status) === 'Approved'
                        ).length,
                        Scheduled: campPosts.filter(
                          (p) => normalizePostStatus(p.status) === 'Scheduled'
                        ).length,
                      };

                      return (
                        <div
                          key={camp.id}
                          className={`rounded-2xl border transition-all ${
                            isExpanded
                              ? isDark
                                ? 'bg-[#161D26] border-[#C44D34]'
                                : 'bg-[#FAF8F5] border-[#C44D34]'
                              : isDark
                              ? 'bg-[#161C23] border-[#26313F]'
                              : 'bg-[#FAF8F5] border-[#ECE8E0]'
                          }`}
                        >
                          <div
                            onClick={() =>
                              setExpandedPortalCampaignId(isExpanded ? null : camp.id)
                            }
                            className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                                  {camp.name}
                                </h3>
                                <span className="text-stone-300 dark:text-stone-700">•</span>
                                <span className="text-xs font-bold text-[#C44D34] tabular-nums">
                                  {campPosts.length} post{campPosts.length === 1 ? '' : 's'}
                                </span>
                                <span className="text-stone-300 dark:text-stone-700">•</span>
                                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                                  Duration: {duration.label}
                                </span>
                              </div>
                              {camp.description && (
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                  {camp.description}
                                </p>
                              )}

                              {/* Clickable Meta Ad Link & Campaign Redirects */}
                              {(camp.metaAdLink ||
                                (camp.externalLinks && camp.externalLinks.length > 0)) && (
                                <div
                                  className="flex flex-wrap items-center gap-2 mt-2.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {camp.metaAdLink && (
                                    <a
                                      href={camp.metaAdLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Meta Ad Link</span>
                                    </a>
                                  )}
                                  {camp.externalLinks?.map((lnk, idx) => (
                                    <a
                                      key={idx}
                                      href={lnk.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                        isDark
                                          ? 'bg-[#1D242C] border-stone-700 text-stone-300 hover:border-[#C44D34] hover:text-white'
                                          : 'bg-white border-stone-200 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                                      }`}
                                    >
                                      <LinkIcon className="w-3 h-3 text-[#C44D34]" />
                                      <span>{lnk.label}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(['Planned', 'In review', 'Approved', 'Scheduled'] as PostStatus[]).map(
                                  (st) =>
                                    stageCounts[st] > 0 && (
                                      <div
                                        key={st}
                                        className="flex items-center gap-1 text-[10px] font-bold tabular-nums"
                                      >
                                        <StatusStageBadge status={st} size="xs" />
                                        <span className="text-stone-500">×{stageCounts[st]}</span>
                                      </div>
                                    )
                                )}
                              </div>
                              <ChevronRight
                                className={`w-4 h-4 text-stone-400 transition-transform ${
                                  isExpanded ? 'rotate-90 text-[#C44D34]' : ''
                                }`}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-3 border-t border-stone-200/70 dark:border-stone-800 space-y-2.5 animate-fade-in">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center tabular-nums">
                                {(
                                  ['Planned', 'In review', 'Approved', 'Scheduled'] as PostStatus[]
                                ).map((st) => (
                                  <div
                                    key={st}
                                    className={`p-2 rounded-xl border ${
                                      isDark
                                        ? 'bg-[#1D242C] border-stone-800'
                                        : 'bg-white border-stone-200/80'
                                    }`}
                                  >
                                    <div className="text-sm font-black">{stageCounts[st]}</div>
                                    <div className="mt-0.5 flex justify-center">
                                      <StatusStageBadge status={st} size="xs" />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {campPosts.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Posts in {camp.name} (Click any post to view & comment)
                                  </div>
                                  {campPosts.map((p) => (
                                    <div
                                      key={p.id}
                                      onClick={() => setSelectedPortalPostId(p.id)}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer hover:border-[#C44D34] transition-colors ${
                                        isDark
                                          ? 'bg-[#1D242C] border-stone-800'
                                          : 'bg-white border-stone-200/70'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="font-bold truncate">{p.title}</div>
                                        <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                                          <PlatformLogo platform={p.platform} size="xs" />
                                          <span>•</span>
                                          <span>{p.category}</span>
                                          <span>•</span>
                                          <span className="tabular-nums">{p.date}</span>
                                        </div>
                                      </div>
                                      <StatusStageBadge status={p.status} size="xs" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 3. Upcoming Scheduled & Planned Posts */}
            <div
              className={`p-5 rounded-3xl border shadow-xs ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    Upcoming Content Pipeline ({upcomingClientPosts.length})
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Click any post to view media, edit approval choice, or add Client Feedback
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className="text-xs font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Schedule</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {upcomingClientPosts.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">
                  No upcoming posts scheduled from {todayStr} onward.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {upcomingClientPosts.map((post) => {
                    const catColor =
                      CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                    const feedbackCount = (post.activityLog || []).filter(
                      (a) => a.type === 'client_feedback' || a.type === 'comment'
                    ).length;

                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPortalPostId(post.id)}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer hover:border-[#C44D34] transition-all ${
                          isDark
                            ? 'bg-[#161C23] border-[#26313F]'
                            : 'bg-[#FAF8F5] border-[#ECE8E0]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                            <div className="flex items-center gap-1.5">
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
                            </div>
                            <StatusStageBadge status={post.status} size="xs" />
                          </div>
                          <h4 className="text-xs font-bold truncate">{post.title}</h4>
                          <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                            {post.caption}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                          <PlatformLogo platform={post.platform} size="xs" />
                          <div className="flex items-center gap-2">
                            {feedbackCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[#C44D34] font-bold">
                                <MessageSquare className="w-3 h-3" />
                                <span>{feedbackCount}</span>
                              </span>
                            )}
                            <span className="font-bold text-[#C44D34] tabular-nums">
                              {post.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Collapsible Section: Past Posts Archive (Till Date) */}
            <div
              className={`rounded-3xl border shadow-xs overflow-hidden ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <button
                id="portal-toggle-past-posts-section"
                type="button"
                onClick={() => setIsPastPostsSectionOpen((prev) => !prev)}
                className="w-full p-5 flex items-center justify-between text-left cursor-pointer hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-500/10 text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                      <span>Past Posts Archive (Till Date)</span>
                      <span className="text-xs font-bold text-[#C44D34] tabular-nums">
                        ({pastClientPosts.length})
                      </span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Click any historical post to inspect media and leave Client Feedback
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-stone-400 transition-transform duration-200 ${
                    isPastPostsSectionOpen ? 'rotate-180 text-[#C44D34]' : ''
                  }`}
                />
              </button>

              {isPastPostsSectionOpen && (
                <div className="px-5 pb-5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {pastClientPosts.length === 0 ? (
                    <p className="text-xs text-stone-400 py-4 text-center">
                      No past posts prior to {todayStr}.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pastClientPosts.map((post) => {
                        const catColor =
                          CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                        const mediaItems = getMediaItemsForPost(post);

                        return (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPortalPostId(post.id)}
                            className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer hover:border-[#C44D34] transition-all ${
                              isDark
                                ? 'bg-[#161C23] border-[#26313F]'
                                : 'bg-[#FAF8F5] border-[#ECE8E0]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                                <div className="flex items-center gap-1.5">
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
                                  {post.campaign && post.campaign !== 'No campaign' && (
                                    <>
                                      <span className="text-stone-400">•</span>
                                      <span className="text-[10px] font-semibold text-[#C44D34]">
                                        {post.campaign}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <StatusStageBadge status={post.status} size="xs" />
                              </div>
                              <h4 className="text-xs font-bold">{post.title}</h4>
                              <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                                {post.caption}
                              </p>
                              {mediaItems.length > 0 && (
                                <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                                  <MediaCarousel
                                    mediaItems={mediaItems}
                                    fallbackTitle={post.title}
                                    heightClass="aspect-video max-h-[150px]"
                                    showCaptionBar={false}
                                    isDark={isDark}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                              <PlatformLogo platform={post.platform} size="xs" />
                              <span className="font-semibold tabular-nums">{post.date}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEDICATED CAMPAIGNS TAB (Clean Campaign List -> Click to Open Campaign Analytics Pop-up) */}
        {activeTab === 'campaigns' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <div
              className={`p-5 rounded-3xl border shadow-xs ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-200/70 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C44D34]/15 text-[#C44D34] flex items-center justify-center shrink-0">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold tracking-tight">
                      {client.name} — Campaigns ({clientCampaigns.length})
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Click any campaign below to open its Campaign Analytics pop-up (days running, live posts &amp; upcoming posts)
                    </p>
                  </div>
                </div>
              </div>

              {clientCampaigns.length === 0 ? (
                <p className="text-xs text-stone-400 py-8 text-center">
                  No campaigns recorded for {client.name} yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {clientCampaigns.map((camp) => {
                    const campPosts = clientPosts.filter(
                      (p) =>
                        (p.campaign || '').toLowerCase() === camp.name.toLowerCase() ||
                        p.campaignId === camp.id ||
                        (!p.campaign && !p.campaignId && camp.clientId === client.id)
                    );
                    const totalCampPosts = campPosts.length;
                    const livePostsCount = campPosts.filter(
                      (p) => p.date < todayStr
                    ).length;
                    const upcomingPostsCount = campPosts.filter(
                      (p) => p.date >= todayStr
                    ).length;
                    const duration = computeCampaignDuration(
                      campPosts,
                      camp.startDate,
                      camp.endDate
                    );

                    return (
                      <div
                        key={camp.id}
                        id={`portal-campaign-card-${camp.id}`}
                        onClick={() => setSelectedCampaignForModal(camp)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDark
                            ? 'bg-[#161C23] border-[#26313F] hover:border-[#C44D34]'
                            : 'bg-[#FAF8F5] border-[#ECE8E0] hover:border-[#C44D34]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                              {camp.name}
                            </h3>
                            <span className="text-stone-300 dark:text-stone-700">•</span>
                            <span className="text-xs font-bold text-[#C44D34] tabular-nums">
                              {totalCampPosts} {totalCampPosts === 1 ? 'post' : 'posts'}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">•</span>
                            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                              {duration.daysSpan > 0
                                ? `${duration.daysSpan} days (${duration.label})`
                                : duration.label}
                            </span>
                          </div>

                          {camp.description && (
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                              {camp.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-semibold tabular-nums">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Gone Live: <strong>{livePostsCount}</strong>
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">•</span>
                            <span className="text-amber-600 dark:text-amber-400">
                              Upcoming: <strong>{upcomingPostsCount}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="px-3 py-1.5 rounded-xl bg-[#C44D34]/10 text-[#C44D34] group-hover:bg-[#C44D34] group-hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>View Analytics</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FULL-PAGE MONTHLY CONTENT CALENDAR (Compact, Clean Grid + Click Post for Pop-up) */}
        {activeTab === 'calendar' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <div
              className={`rounded-3xl border shadow-xs overflow-hidden ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              {/* Clean Calendar Top Bar with Dropdown Filters */}
              <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C44D34]">
                      {client.name} • Content Calendar
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h2 className="text-lg sm:text-xl font-black tracking-tight">
                        {calendarMonthName}
                      </h2>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            isDark
                              ? 'bg-[#161C23] border-[#26313F] text-stone-200 hover:border-[#C44D34]'
                              : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-700 hover:border-[#C44D34]'
                          }`}
                          title="Previous month"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            isDark
                              ? 'bg-[#161C23] border-[#26313F] text-stone-200 hover:border-[#C44D34]'
                              : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-700 hover:border-[#C44D34]'
                          }`}
                          title="Next month"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clean Dropdowns: Month, Stage, Platform */}
                <div className="flex flex-wrap items-center gap-2">
                  {availableMonths.length > 0 && (
                    <select
                      value={`${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`}
                      onChange={(e) => {
                        const [y, mo] = e.target.value.split('-').map(Number);
                        if (y && mo) {
                          setCalendarYear(y);
                          setCalendarMonth(mo - 1);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                        isDark
                          ? 'bg-[#161C23] border-[#26313F] text-stone-100'
                          : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800'
                      }`}
                    >
                      {availableMonths.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label} ({m.count})
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={filterStage}
                    onChange={(e) =>
                      setFilterStage(e.target.value as 'all' | PostStatus)
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                      isDark
                        ? 'bg-[#161C23] border-[#26313F] text-stone-100'
                        : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800'
                    }`}
                  >
                    <option value="all">
                      All Stages ({activeCalendarMonthAllPosts.length})
                    </option>
                    {(['Planned', 'In review', 'Approved', 'Scheduled'] as PostStatus[]).map(
                      (st) => {
                        const stCount = activeCalendarMonthAllPosts.filter(
                          (p) => normalizePostStatus(p.status) === st
                        ).length;
                        return (
                          <option key={st} value={st}>
                            {st} ({stCount})
                          </option>
                        );
                      }
                    )}
                  </select>

                  <select
                    id="portal-calendar-platform-dropdown"
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                      isDark
                        ? 'bg-[#161C23] border-[#26313F] text-stone-100'
                        : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800'
                    }`}
                  >
                    {[
                      'all',
                      'Instagram',
                      'LinkedIn',
                      'YouTube',
                      'TikTok',
                      'Twitter',
                      'Facebook',
                    ].map((plat) => (
                      <option key={plat} value={plat}>
                        {plat === 'all' ? 'All Platforms' : plat}
                      </option>
                    ))}
                  </select>
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
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="py-2.5 border-r last:border-r-0 border-stone-200/60 dark:border-stone-800"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Full-Page 7-Column Calendar Grid with Compact Draggable Post Chips */}
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
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverDateStr(null);
                        if (!cell.dateStr) return;
                        const postId =
                          e.dataTransfer.getData('text/plain') || draggedPostId;
                        setDraggedPostId(null);
                        if (postId && onReschedulePost) {
                          onReschedulePost(postId, cell.dateStr);
                        }
                      }}
                      className={`min-h-[115px] sm:min-h-[135px] p-1.5 sm:p-2 border-b border-r last:border-r-0 transition-all flex flex-col overflow-hidden ${
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
                          {/* Compact Date Number Header */}
                          <div className="flex items-center justify-between mb-1 px-0.5">
                            <span
                              className={
                                isToday
                                  ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C44D34] text-white font-extrabold text-[11px] leading-none tabular-nums'
                                  : 'text-[11px] font-bold tabular-nums text-stone-500 dark:text-stone-400'
                              }
                            >
                              {cell.dayNumber}
                            </span>
                            {cell.posts.length > 0 && (
                              <span className="text-[9px] font-bold text-stone-400 tabular-nums">
                                {cell.posts.length}
                              </span>
                            )}
                          </div>

                          {/* Compact Draggable Post Pills inside Grid Cell */}
                          <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
                            {cell.posts.map((post) => {
                              const stStyle =
                                STATUS_STYLES[normalizePostStatus(post.status)];
                              const isDragging = draggedPostId === post.id;
                              return (
                                <div
                                  key={post.id}
                                  draggable={Boolean(onReschedulePost)}
                                  onDragStart={(e) => {
                                    setDraggedPostId(post.id);
                                    e.dataTransfer.setData('text/plain', post.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragEnd={() => {
                                    setDraggedPostId(null);
                                    setDragOverDateStr(null);
                                  }}
                                  onClick={() => setSelectedPortalPostId(post.id)}
                                  title={`${post.title} (${post.platform} • ${post.status}) — Click to open post pop-up, or drag to reschedule`}
                                  className={`px-1.5 py-1 rounded-lg border text-left cursor-grab active:cursor-grabbing transition-all hover:border-[#C44D34] ${
                                    isDragging ? 'opacity-45 scale-95' : ''
                                  } ${
                                    isDark
                                      ? 'bg-[#151C24] border-[#2B3746]'
                                      : 'bg-[#FAF8F5] border-[#E5DFD3]'
                                  }`}
                                  style={{
                                    borderLeftWidth: '3px',
                                    borderLeftColor: stStyle.hex,
                                  }}
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <PlatformLogo
                                      platform={post.platform}
                                      size="xs"
                                      showLabel={false}
                                    />
                                    <span className="text-[10px] font-bold text-stone-800 dark:text-stone-100 truncate leading-tight">
                                      {post.title}
                                    </span>
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

        {/* TAB 4: MONTHLY POSTS & APPROVALS (Combined Approvals on Top + Clean Dropdown Filters) */}
        {activeTab === 'upcoming' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            {/* Top Approvals Accordion Bar: Click to view & approve all posts waiting for review */}
            <div
              className={`rounded-3xl border shadow-xs overflow-hidden ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div
                onClick={() => setIsReviewBatchExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isReviewBatchExpanded
                    ? isDark
                      ? 'bg-[#212B36] border-b border-[#2A3440]'
                      : 'bg-[#FAF7F2] border-b border-[#E8E4DC]'
                    : isDark
                    ? 'hover:bg-[#212B36]/60'
                    : 'hover:bg-stone-50/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold tracking-tight">
                        Approvals — Posts Waiting for Review ({pendingApprovals.length})
                      </h2>
                      {pendingApprovals.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          Action Needed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Click to {isReviewBatchExpanded ? 'hide' : 'view'} posts waiting for approval
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {pendingApprovals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        pendingApprovals.forEach((p) => onApprovePost(p.id));
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Approve All ({pendingApprovals.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsReviewBatchExpanded((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#161D25] border-[#2C3846] text-stone-200'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>
                      {isReviewBatchExpanded
                        ? 'Hide Approvals'
                        : `Show Approvals (${pendingApprovals.length})`}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isReviewBatchExpanded ? 'rotate-180 text-[#C44D34]' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {isReviewBatchExpanded && (
                <div className="p-4 sm:p-5 space-y-3 animate-fade-in">
                  {pendingApprovals.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-3">
                      All posts have been reviewed! No pending approvals right now.
                    </p>
                  ) : (
                    pendingApprovals.map((post) =>
                      renderClientPostReviewCard(post, false)
                    )
                  )}
                </div>
              )}
            </div>

            {/* Clean 3-Dropdown Filter Bar: Month Dropdown, Stage Dropdown, Platform Dropdown */}
            <div
              className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {/* Month Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Month:
                  </label>
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                      isDark
                        ? 'bg-[#161C23] border-[#26313F] text-stone-100'
                        : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800'
                    }`}
                  >
                    <option value="ALL">All Months ({clientPosts.length})</option>
                    {availableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label} ({m.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stage Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Stage:
                  </label>
                  <select
                    value={filterStage}
                    onChange={(e) =>
                      setFilterStage(e.target.value as 'all' | PostStatus)
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                      isDark
                        ? 'bg-[#161C23] border-[#26313F] text-stone-100'
                        : 'bg-[#FAF8F5] border-[#E8E4DC] text-stone-800'
                    }`}
                  >
                    <option value="all">All Stages ({clientPosts.length})</option>
                    {(
                      ['Planned', 'In review', 'Approved', 'Scheduled'] as PostStatus[]
                    ).map((st) => {
                      const count = clientPosts.filter(
                        (p) => normalizePostStatus(p.status) === st
                      ).length;
                      return (
                        <option key={st} value={st}>
                          {st} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Platform Dropdown */}
                <div className="flex items-center gap-1.5">
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
                    {[
                      'all',
                      'Instagram',
                      'LinkedIn',
                      'YouTube',
                      'TikTok',
                      'Twitter',
                      'Facebook',
                    ].map((plat) => (
                      <option key={plat} value={plat}>
                        {plat === 'all' ? 'All Platforms' : plat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(selectedMonthFilter !== 'ALL' ||
                filterStage !== 'all' ||
                filterPlatform !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonthFilter('ALL');
                    setFilterStage('all');
                    setFilterPlatform('all');
                  }}
                  className="text-xs font-bold text-[#C44D34] hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Month-Wise Grouped Post Cards */}
            {monthGroups.length === 0 ? (
              <div
                className={`p-8 rounded-3xl border text-center ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <p className="text-xs text-stone-400">
                  No posts match the selected month, stage, or platform filter.
                </p>
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
                      className={`rounded-3xl border shadow-xs overflow-hidden ${
                        isDark
                          ? 'bg-[#1D242C] border-[#2A3440]'
                          : 'bg-white border-[#E8E4DC]'
                      }`}
                    >
                      {/* Month Header */}
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

                      {/* Posts inside this Month */}
                      <div className="p-4 space-y-3">
                        {group.posts.map((post) => {
                          const catColor =
                            CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                          const mediaItems = getMediaItemsForPost(post);
                          const isPast = post.date < todayStr;
                          const feedbackCount = (post.activityLog || []).filter(
                            (a) => a.type === 'client_feedback' || a.type === 'comment'
                          ).length;

                          return (
                            <div
                              key={post.id}
                              onClick={() => setSelectedPortalPostId(post.id)}
                              className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                                isDark
                                  ? 'bg-[#161C23] border-[#26313F]'
                                  : 'bg-[#FAF8F5] border-[#ECE8E0]'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
                                  <span className="text-stone-400">•</span>
                                  <PlatformLogo platform={post.platform} size="xs" />
                                  {post.campaign && post.campaign !== 'No campaign' && (
                                    <>
                                      <span className="text-stone-400">•</span>
                                      <span className="text-[11px] font-semibold text-[#C44D34]">
                                        {post.campaign}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusStageBadge status={post.status} size="xs" />
                                  <span
                                    className={`text-[11px] font-bold tabular-nums ${
                                      isPast ? 'text-stone-400' : 'text-[#C44D34]'
                                    }`}
                                  >
                                    {post.date}
                                  </span>
                                </div>
                              </div>

                              <h3 className="text-sm font-bold mt-2">{post.title}</h3>
                              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 whitespace-pre-line leading-relaxed">
                                {post.caption}
                              </p>

                              {mediaItems.length > 0 && (
                                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                  <MediaCarousel
                                    mediaItems={mediaItems}
                                    fallbackTitle={post.title}
                                    heightClass="aspect-video max-h-[220px]"
                                    isDark={isDark}
                                  />
                                </div>
                              )}

                              <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-stone-400">
                                  {feedbackCount > 0
                                    ? `${feedbackCount} comment${feedbackCount === 1 ? '' : 's'} / Client Feedback`
                                    : 'Click to view post, edit choice & add Client Feedback'}
                                </span>
                                <span className="font-bold text-[#C44D34] inline-flex items-center gap-1">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Review / Comment</span>
                                </span>
                              </div>
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

        {/* TAB 5: CLIENT ANALYTICS (Clean Non-Repetitive View: Platform Distribution + Content Pillar Pie Chart + Filtered Posts) */}
        {activeTab === 'analytics' && (
          <div
            onClick={() => setAnalyticsDrillDown(null)}
            className="mt-5 space-y-4 animate-fade-in"
          >
            {/* Active One-Click Filter Pill Banner */}
            {analyticsDrillDown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border border-[#C44D34]/30 bg-[#C44D34]/10 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#C44D34]">Active Filter:</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {analyticsDrillDown.label}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400 tabular-nums">
                    ({portalAnalyticsPosts.length} matching post
                    {portalAnalyticsPosts.length === 1 ? '' : 's'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsDrillDown(null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C44D34] text-white font-bold text-[11px] hover:bg-[#A93E27] transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filter</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform Distribution (One-Click Filter, same look as main Analytics page) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className={`p-5 rounded-3xl border shadow-xs ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                    Platform Distribution (Click to Filter)
                  </h3>
                  {analyticsDrillDown?.type === 'platform' && (
                    <button
                      type="button"
                      onClick={() => setAnalyticsDrillDown(null)}
                      className="text-[11px] font-bold text-[#C44D34] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {platformEntries.length === 0 ? (
                  <p className="text-xs text-stone-400 py-8 text-center">
                    No platform data available yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {platformEntries.map((item) => {
                      const isSel =
                        analyticsDrillDown?.type === 'platform' &&
                        analyticsDrillDown.platform === item.platform;
                      return (
                        <button
                          key={item.platform}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setAnalyticsDrillDown(null);
                            } else {
                              setAnalyticsDrillDown({
                                type: 'platform',
                                platform: item.platform,
                                label: `Platform: ${item.platform}`,
                              });
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#C44D34] bg-[#C44D34]/10'
                              : isDark
                              ? 'border-transparent hover:bg-stone-800/50'
                              : 'border-transparent hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <PlatformLogo
                              platform={item.platform}
                              size="sm"
                              className="font-bold"
                            />
                            <span className="text-stone-400 font-bold tabular-nums">
                              {item.count} posts ({item.percent}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#C44D34] transition-all duration-300"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Content Pillar Mix — Interactive SVG Pie Chart */}
              <div
                onClick={(e) => e.stopPropagation()}
                className={`p-5 rounded-3xl border shadow-xs ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                    Content Pillars (Click Slice or Legend to Filter)
                  </h3>
                  {analyticsDrillDown?.type === 'category' && (
                    <button
                      type="button"
                      onClick={() => setAnalyticsDrillDown(null)}
                      className="text-[11px] font-bold text-[#C44D34] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {categoryEntries.length === 0 || totalPosts === 0 ? (
                  <p className="text-xs text-stone-400 py-8 text-center">
                    No content pillar data available yet.
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Interactive SVG Donut / Pie Chart */}
                    <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                      <svg
                        viewBox="0 0 36 36"
                        className="w-36 h-36 -rotate-90 overflow-visible"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke={isDark ? '#26313F' : '#F1EDE6'}
                          strokeWidth="5.2"
                        />
                        {(() => {
                          let cumulativePercent = 0;
                          return categoryEntries.map((item) => {
                            const rawPct =
                              totalPosts > 0 ? (item.count / totalPosts) * 100 : 0;
                            const strokeDasharray = `${rawPct} ${100 - rawPct}`;
                            const strokeDashoffset = -cumulativePercent;
                            cumulativePercent += rawPct;
                            const catColor =
                              CATEGORY_COLORS[
                                item.category as keyof typeof CATEGORY_COLORS
                              ] || CATEGORY_COLORS.POST;
                            const isSel =
                              analyticsDrillDown?.type === 'category' &&
                              analyticsDrillDown.category === item.category;

                            return (
                              <circle
                                key={item.category}
                                cx="18"
                                cy="18"
                                r="15.9155"
                                fill="transparent"
                                stroke={catColor.dot}
                                strokeWidth={isSel ? '6.6' : '5.2'}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                onClick={() => {
                                  if (isSel) {
                                    setAnalyticsDrillDown(null);
                                  } else {
                                    setAnalyticsDrillDown({
                                      type: 'category',
                                      category: item.category,
                                      label: `Pillar: ${item.category}`,
                                    });
                                  }
                                }}
                                className="cursor-pointer transition-all duration-200 hover:opacity-85"
                              >
                                <title>{`${item.category}: ${item.count} posts (${item.percent}%)`}</title>
                              </circle>
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-lg font-black tabular-nums leading-none">
                          {analyticsDrillDown?.type === 'category'
                            ? portalAnalyticsPosts.length
                            : totalPosts}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                          {analyticsDrillDown?.type === 'category'
                            ? analyticsDrillDown.category
                            : 'Total Posts'}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Legend */}
                    <div className="flex-1 w-full space-y-1.5">
                      {categoryEntries.map((item) => {
                        const catColor =
                          CATEGORY_COLORS[
                            item.category as keyof typeof CATEGORY_COLORS
                          ] || CATEGORY_COLORS.POST;
                        const isSel =
                          analyticsDrillDown?.type === 'category' &&
                          analyticsDrillDown.category === item.category;
                        return (
                          <button
                            key={item.category}
                            type="button"
                            onClick={() => {
                              if (isSel) {
                                setAnalyticsDrillDown(null);
                              } else {
                                setAnalyticsDrillDown({
                                  type: 'category',
                                  category: item.category,
                                  label: `Pillar: ${item.category}`,
                                });
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                              isSel
                                ? 'border-[#C44D34] bg-[#C44D34]/10 font-bold'
                                : isDark
                                ? 'border-transparent hover:bg-stone-800/50'
                                : 'border-transparent hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: catColor.dot }}
                              />
                              <span className="font-bold">{item.category}</span>
                            </div>
                            <span className="text-stone-400 font-bold tabular-nums">
                              {item.count} ({item.percent}%)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filtered Posts List (Shown automatically when a stage, platform, or pillar is clicked; click away to dismiss) */}
            {analyticsDrillDown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`p-5 rounded-3xl border shadow-xs animate-fade-in ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#C44D34]">
                      Filtered Posts:
                    </span>
                    <span className="text-sm font-bold">{analyticsDrillDown.label}</span>
                    <span className="text-xs text-stone-400 font-bold tabular-nums">
                      ({portalAnalyticsPosts.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnalyticsDrillDown(null)}
                    className="text-xs font-bold text-[#C44D34] hover:underline cursor-pointer"
                  >
                    Close Filter
                  </button>
                </div>

                {portalAnalyticsPosts.length === 0 ? (
                  <p className="text-xs text-stone-400 py-6 text-center">
                    No posts found for {analyticsDrillDown.label}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {portalAnalyticsPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPortalPostId(post.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer hover:border-[#C44D34] transition-all flex items-center justify-between gap-3 ${
                          isDark
                            ? 'bg-[#161C23] border-[#26313F]'
                            : 'bg-[#FAF8F5] border-[#ECE8E0]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{post.title}</div>
                          <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-1">
                            <PlatformLogo platform={post.platform} size="xs" />
                            <span>•</span>
                            <span>{post.category}</span>
                            <span>•</span>
                            <span className="tabular-nums">{post.date}</span>
                          </div>
                        </div>
                        <StatusStageBadge status={post.status} size="xs" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C44D34]" />
            <span>
              Shared via <strong className="text-stone-600 dark:text-stone-300">PostNote Studio</strong>
            </span>
          </div>
          <span>Isolated Client Portal • {client.name}</span>
        </footer>
      </div>

      {/* Interactive Client Post Detail & Feedback Modal */}
      {selectedPortalPost && (
        <div
          id="client-portal-post-modal"
          onClick={() => setSelectedPortalPostId(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDark
                ? 'bg-[#1A222C] border-[#2C3949] text-stone-100'
                : 'bg-white border-[#E5DFD3] text-[#1E252B]'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
                isDark ? 'bg-[#151C24] border-[#263240]' : 'bg-[#FAF7F2] border-[#E8E4DC]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <PlatformLogo platform={selectedPortalPost.platform} size="sm" />
                <span className="text-stone-400">•</span>
                <StatusStageBadge status={selectedPortalPost.status} size="xs" />
                <span className="text-stone-400">•</span>
                <span className="text-xs font-bold text-[#C44D34] tabular-nums">
                  {selectedPortalPost.date}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isLockedPortal && onEditPost && (
                  <button
                    type="button"
                    onClick={() => {
                      const postToEdit = selectedPortalPost;
                      setSelectedPortalPostId(null);
                      onEditPost(postToEdit);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-[#1D242C] border-[#2C3949] text-stone-200 hover:border-[#C44D34]'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-[#C44D34]'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Edit Post</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPortalPostId(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C44D34]">
                  {selectedPortalPost.category}
                  {selectedPortalPost.campaign &&
                  selectedPortalPost.campaign !== 'No campaign'
                    ? ` • ${selectedPortalPost.campaign}`
                    : ''}
                </span>
                <h2
                  className="text-lg sm:text-xl font-bold mt-1 font-serif"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {selectedPortalPost.title}
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-2 whitespace-pre-line leading-relaxed">
                  {selectedPortalPost.caption}
                </p>
              </div>

              {getMediaItemsForPost(selectedPortalPost).length > 0 && (
                <div>
                  <MediaCarousel
                    mediaItems={getMediaItemsForPost(selectedPortalPost)}
                    fallbackTitle={selectedPortalPost.title}
                    heightClass="aspect-video max-h-[300px]"
                    isDark={isDark}
                  />
                </div>
              )}

              {/* Quick Approval / Edit Choice Bar (Works for both In Review and Approved/Scheduled) */}
              {normalizePostStatus(selectedPortalPost.status) === 'In review' ? (
                <div
                  className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-[#151C24] border-amber-700/40'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="text-xs">
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      Waiting for Client Approval
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Approve this post or leave Client Feedback below to notify the studio team.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApprovePost(selectedPortalPost.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Approve Post</span>
                  </button>
                </div>
              ) : (
                <div
                  className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-[#151C24] border-emerald-700/40'
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <div className="text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      Current Status: {selectedPortalPost.status}
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Need to edit your choice or request changes? You can update your decision or add comments anytime.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onRequestChanges(
                        selectedPortalPost.id,
                        modalFeedbackText.trim() ||
                          'Client edited choice and requested changes.',
                        clientReviewerName.trim() || `${client.name} (Client)`
                      )
                    }
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'border-amber-700 text-amber-400 hover:bg-amber-950/40'
                        : 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Edit Choice / Request Changes</span>
                  </button>
                </div>
              )}

              {/* Client Feedback & Activity Timeline */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#C44D34] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Client Feedback & Post Comments</span>
                  </h3>
                  <span className="text-[10px] text-stone-400">
                    Instantly notifies assigned studio team
                  </span>
                </div>

                {/* Add Client Feedback Form */}
                <form
                  onSubmit={handleModalSubmitClientFeedback}
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isDark
                      ? 'bg-[#151C24] border-[#283444]'
                      : 'bg-[#FAF8F5] border-[#E6E0D5]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#C44D34]">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Commenting as Client Feedback</span>
                    </span>
                    <input
                      type="text"
                      value={clientReviewerName}
                      onChange={(e) => setClientReviewerName(e.target.value)}
                      placeholder="Your Name / Brand"
                      className={`px-2.5 py-1 rounded-lg border text-xs w-48 focus:outline-none focus:border-[#C44D34] ${
                        isDark
                          ? 'bg-[#1D242C] border-stone-700 text-white'
                          : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    />
                  </div>

                  <textarea
                    rows={3}
                    value={modalFeedbackText}
                    onChange={(e) => setModalFeedbackText(e.target.value)}
                    placeholder="Add your comment or feedback on this post (this will be marked as Client Feedback and notify the studio team)..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed focus:outline-none focus:border-[#C44D34] ${
                      isDark
                        ? 'bg-[#1D242C] border-stone-700 text-white placeholder-stone-500'
                        : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'
                    }`}
                    required
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onRequestChanges(
                          selectedPortalPost.id,
                          modalFeedbackText.trim() ||
                            'Client edited choice and requested changes.',
                          clientReviewerName.trim() || `${client.name} (Client)`
                        );
                        setModalFeedbackText('');
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        isDark
                          ? 'border-amber-700 text-amber-400 hover:bg-amber-950/40'
                          : 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Changes & Return to Planned</span>
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#A93E27] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Client Feedback</span>
                    </button>
                  </div>
                </form>

                {/* Existing Comments & Activity List */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(selectedPortalPost.activityLog || []).length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-4">
                      No comments or feedback on this post yet.
                    </p>
                  ) : (
                    (selectedPortalPost.activityLog || [])
                      .slice()
                      .reverse()
                      .map((act) => {
                        const isClientFeedback =
                          act.type === 'client_feedback' ||
                          (act.actorRole || '').toLowerCase().includes('client');

                        return (
                          <div
                            key={act.id}
                            className={`p-3 rounded-2xl border text-xs ${
                              isClientFeedback
                                ? isDark
                                  ? 'bg-[#C44D34]/10 border-[#C44D34]/40'
                                  : 'bg-[#C44D34]/[0.06] border-[#C44D34]/30'
                                : isDark
                                ? 'bg-[#151C24] border-stone-800'
                                : 'bg-[#FAF8F5] border-stone-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-stone-900 dark:text-white">
                                  {act.actorName}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    isClientFeedback
                                      ? 'bg-[#C44D34] text-white'
                                      : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                                  }`}
                                >
                                  {isClientFeedback
                                    ? 'CLIENT FEEDBACK'
                                    : act.actorRole || 'STUDIO TEAM'}
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-400 tabular-nums">
                                {new Date(act.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {act.comment && (
                              <p className="mt-1.5 text-stone-700 dark:text-stone-200 leading-relaxed">
                                {act.comment}
                              </p>
                            )}
                            {act.details && (
                              <p className="mt-1 text-[11px] text-stone-400">
                                {act.details}
                              </p>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Analytics Pop-up Modal */}
      {selectedCampaignForModal &&
        (() => {
          const modalCamp = selectedCampaignForModal;
          const campPosts = clientPosts.filter(
            (p) =>
              (p.campaign || '').toLowerCase() === modalCamp.name.toLowerCase() ||
              p.campaignId === modalCamp.id ||
              (!p.campaign && !p.campaignId && modalCamp.clientId === client.id)
          );
          const duration = computeCampaignDuration(
            campPosts,
            modalCamp.startDate,
            modalCamp.endDate
          );
          const livePosts = campPosts
            .filter((p) => p.date < todayStr)
            .sort((a, b) => b.date.localeCompare(a.date));
          const upcomingPosts = campPosts
            .filter((p) => p.date >= todayStr)
            .sort((a, b) => a.date.localeCompare(b.date));

          return (
            <div
              id="campaign-analytics-modal"
              onClick={() => setSelectedCampaignForModal(null)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                  isDark
                    ? 'bg-[#1A222C] border-[#2C3949] text-stone-100'
                    : 'bg-white border-[#E5DFD3] text-[#1E252B]'
                }`}
              >
                {/* Modal Header */}
                <div
                  className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#151C24] border-[#263240]' : 'bg-[#FAF7F2] border-[#E8E4DC]'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C44D34]">
                      Campaign Analytics • {client.name}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold truncate mt-0.5">
                      {modalCamp.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCampaignForModal(null)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {modalCamp.description && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {modalCamp.description}
                    </p>
                  )}

                  {/* Summary Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
                    <div
                      className={`p-3 rounded-2xl border ${
                        isDark
                          ? 'bg-[#151C24] border-[#26313F]'
                          : 'bg-[#FAF8F5] border-[#ECE8E0]'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Total Posts
                      </div>
                      <div className="text-lg font-black mt-0.5">{campPosts.length}</div>
                    </div>

                    <div
                      className={`p-3 rounded-2xl border ${
                        isDark
                          ? 'bg-[#151C24] border-[#26313F]'
                          : 'bg-[#FAF8F5] border-[#ECE8E0]'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Days Running
                      </div>
                      <div className="text-lg font-black text-[#C44D34] mt-0.5">
                        {duration.daysSpan > 0 ? `${duration.daysSpan} Days` : '—'}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        {duration.label}
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-2xl border ${
                        isDark
                          ? 'bg-[#151C24] border-[#26313F]'
                          : 'bg-[#FAF8F5] border-[#ECE8E0]'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Gone Live
                      </div>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {livePosts.length}
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-2xl border ${
                        isDark
                          ? 'bg-[#151C24] border-[#26313F]'
                          : 'bg-[#FAF8F5] border-[#ECE8E0]'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Upcoming
                      </div>
                      <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                        {upcomingPosts.length}
                      </div>
                    </div>
                  </div>

                  {/* Posts Gone Live */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Posts Gone Live ({livePosts.length})
                    </h4>
                    {livePosts.length === 0 ? (
                      <p className="text-xs text-stone-400 py-2">
                        No posts have gone live for this campaign yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {livePosts.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => {
                              setSelectedCampaignForModal(null);
                              setSelectedPortalPostId(post.id);
                            }}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                              isDark
                                ? 'bg-[#151C24] border-[#26313F]'
                                : 'bg-[#FAF8F5] border-[#ECE8E0]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold truncate">{post.title}</div>
                              <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                                <PlatformLogo platform={post.platform} size="xs" />
                                <span>•</span>
                                <span>{post.category}</span>
                                <span>•</span>
                                <span className="tabular-nums">{post.date}</span>
                              </div>
                            </div>
                            <StatusStageBadge status={post.status} size="xs" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Posts */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Upcoming Posts ({upcomingPosts.length})
                    </h4>
                    {upcomingPosts.length === 0 ? (
                      <p className="text-xs text-stone-400 py-2">
                        No upcoming posts scheduled for this campaign.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {upcomingPosts.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => {
                              setSelectedCampaignForModal(null);
                              setSelectedPortalPostId(post.id);
                            }}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                              isDark
                                ? 'bg-[#151C24] border-[#26313F]'
                                : 'bg-[#FAF8F5] border-[#ECE8E0]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold truncate">{post.title}</div>
                              <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                                <PlatformLogo platform={post.platform} size="xs" />
                                <span>•</span>
                                <span>{post.category}</span>
                                <span>•</span>
                                <span className="tabular-nums">{post.date}</span>
                              </div>
                            </div>
                            <StatusStageBadge status={post.status} size="xs" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Share Client Portal Link Modal */}
      {isShareModalOpen && (
        <ClientShareModal
          client={client}
          posts={clientPosts}
          onClose={() => setIsShareModalOpen(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
};
