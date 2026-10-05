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
import { StatusStageBadge } from './StatusStageBadge';
import { MediaCarousel } from './MediaCarousel';
import { PlatformLogo } from './PlatformLogo';

export type ClientPortalTab =
  | 'overview'
  | 'upcoming'
  | 'analytics'
  | 'approvals'
  | 'calendar';

interface ClientPortalViewProps {
  client: Client;
  posts: Post[];
  campaigns?: Campaign[];
  subscription?: SubscriptionState;
  initialTab?: ClientPortalTab;
  isViewOnly?: boolean;
  isLockedPortal?: boolean;
  onApprovePost: (postId: string) => void;
  onRequestChanges: (postId: string, notes?: string, clientAuthorName?: string) => void;
  onAddClientFeedback?: (postId: string, comment: string, clientAuthorName?: string) => void;
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
  isLockedPortal = false,
  onApprovePost,
  onRequestChanges,
  onAddClientFeedback,
  onExit,
  isDark,
}) => {
  const normalizedInitial =
    initialTab === 'approvals'
      ? 'overview'
      : initialTab === 'calendar'
      ? 'upcoming'
      : initialTab;
  const [activeTab, setActiveTab] = useState<'overview' | 'upcoming' | 'analytics'>(
    normalizedInitial as 'overview' | 'upcoming' | 'analytics'
  );
  const [feedbackPostId, setFeedbackPostId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [clientReviewerName, setClientReviewerName] = useState<string>(
    `${client.name} (Client)`
  );
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<'all' | PostStatus>('all');

  // Grouped Review Batch Expansion state (when multiple posts are sent for review at once)
  const [isReviewBatchExpanded, setIsReviewBatchExpanded] = useState<boolean>(false);
  const [isApprovedBatchExpanded, setIsApprovedBatchExpanded] = useState<boolean>(true);

  // Selected post for Client Post Detail & Feedback Modal
  const [selectedPortalPostId, setSelectedPortalPostId] = useState<string | null>(null);
  const [modalFeedbackText, setModalFeedbackText] = useState<string>('');

  // Clickable Analytics Drill-Down in Client Portal
  const [analyticsDrillDown, setAnalyticsDrillDown] =
    useState<PortalAnalyticsDrillDown | null>({
      type: 'all',
      label: 'All Client Posts',
    });

  // Collapsible sections in Client Portal
  const [isCampaignsSectionOpen, setIsCampaignsSectionOpen] = useState<boolean>(true);
  const [isPastPostsSectionOpen, setIsPastPostsSectionOpen] = useState<boolean>(true);
  const [isAnalyticsSectionOpen, setIsAnalyticsSectionOpen] = useState<boolean>(true);
  const [expandedPortalCampaignId, setExpandedPortalCampaignId] = useState<string | null>(null);

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

  // All-time date span
  const allTimeDuration = computeCampaignDuration(clientPosts);

  // Client Analytics metrics
  const totalPosts = clientPosts.length;
  const platformCounts: Record<string, number> = {};
  clientPosts.forEach((p) => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 1);
  });
  Object.keys(platformCounts).forEach((k) => delete platformCounts[k]);
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
    .sort((a, b) => b.date.localeCompare(a.date));

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
        className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-3 ${
          isDark
            ? 'bg-[#161D25]/95 border-[#25303E]'
            : 'bg-white/95 border-[#E8E4DC]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
            style={{ backgroundColor: client.color || '#C44D34' }}
          >
            {client.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {client.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Client Review Portal</span>
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate">
              {client.industry} • {totalPosts} Total Posts •{' '}
              {allTimeDuration.label}
            </p>
          </div>
        </div>

        {!isLockedPortal && onExit && (
          <button
            id="exit-client-portal-btn"
            onClick={onExit}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:border-[#C44D34]'
                : 'bg-[#FAF8F5] border-[#E5DFD3] text-stone-700 hover:border-[#C44D34]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#C44D34]" />
            <span>Back to Studio</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
        {/* Top 4-Stage Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 tabular-nums">
          {(
            [
              { status: 'Planned' as PostStatus, count: plannedPosts.length },
              { status: 'In review' as PostStatus, count: pendingApprovals.length },
              { status: 'Approved' as PostStatus, count: approvedPosts.length },
              { status: 'Scheduled' as PostStatus, count: scheduledPosts.length },
            ] as const
          ).map((item) => (
            <button
              key={item.status}
              type="button"
              onClick={() => {
                setAnalyticsDrillDown({
                  type: 'stage',
                  stage: item.status,
                  label: `Stage: ${item.status}`,
                });
                setActiveTab('analytics');
              }}
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:border-[#C44D34] ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <StatusStageBadge status={item.status} size="sm" />
              <span
                className="text-xl font-black"
                style={{ color: STATUS_STYLES[item.status].hex }}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div
          className={`p-1 rounded-2xl border grid grid-cols-3 gap-1 ${
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
            <span>Review & Archive</span>
            {pendingApprovals.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                  activeTab === 'overview'
                    ? 'bg-white text-[#C44D34]'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {pendingApprovals.length}
              </span>
            )}
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
            <Calendar className="w-3.5 h-3.5" />
            <span>Content Schedule ({clientPosts.length})</span>
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
            <span>All Analytics</span>
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

            {/* 5. Collapsible All-Time Analytics Snapshot on Overview */}
            <div
              className={`rounded-3xl border shadow-xs overflow-hidden ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <button
                id="portal-toggle-analytics-section"
                type="button"
                onClick={() => setIsAnalyticsSectionOpen((prev) => !prev)}
                className="w-full p-5 flex items-center justify-between text-left cursor-pointer hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">
                      All-Time Performance & Pipeline Analytics
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Summary of {totalPosts} posts across {platformEntries.length} platforms and{' '}
                      {clientCampaigns.length} campaigns
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-stone-400 transition-transform duration-200 ${
                    isAnalyticsSectionOpen ? 'rotate-180 text-[#C44D34]' : ''
                  }`}
                />
              </button>

              {isAnalyticsSectionOpen && (
                <div className="px-5 pb-5 pt-2 border-t border-stone-100 dark:border-stone-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Platform Mix with SVG Logos */}
                    <div
                      className={`p-4 rounded-2xl border ${
                        isDark
                          ? 'bg-[#161C23] border-[#26313F]'
                          : 'bg-[#FAF8F5] border-[#ECE8E0]'
                      }`}
                    >
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                        Platform Distribution (Click to View Posts)
                      </h3>
                      <div className="space-y-2.5">
                        {platformEntries.map((item) => (
                          <button
                            key={item.platform}
                            type="button"
                            onClick={() => {
                              setAnalyticsDrillDown({
                                type: 'platform',
                                platform: item.platform,
                                label: `Platform: ${item.platform}`,
                              });
                              setActiveTab('analytics');
                            }}
                            className="w-full text-left group cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <PlatformLogo
                                platform={item.platform}
                                size="sm"
                                className="font-semibold group-hover:text-[#C44D34]"
                              />
                              <span className="text-stone-400 font-bold tabular-nums">
                                {item.count} ({item.percent}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#C44D34]"
                                style={{ width: `${item.percent}%` }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content Pillar Mix */}
                    <div
                      className={`p-4 rounded-2xl border ${
                        isDark
                          ? 'bg-[#161C23] border-[#26313F]'
                          : 'bg-[#FAF8F5] border-[#ECE8E0]'
                      }`}
                    >
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                        Content Category Breakdown (Click to View Posts)
                      </h3>
                      <div className="space-y-2.5">
                        {categoryEntries.map((item) => {
                          const catColor =
                            CATEGORY_COLORS[
                              item.category as keyof typeof CATEGORY_COLORS
                            ] || CATEGORY_COLORS.POST;
                          return (
                            <button
                              key={item.category}
                              type="button"
                              onClick={() => {
                                setAnalyticsDrillDown({
                                  type: 'category',
                                  category: item.category,
                                  label: `Category: ${item.category}`,
                                });
                                setActiveTab('analytics');
                              }}
                              className="w-full text-left group cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold group-hover:text-[#C44D34]">
                                  {item.category}
                                </span>
                                <span className="text-stone-400 font-bold tabular-nums">
                                  {item.count} ({item.percent}%)
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${item.percent}%`,
                                    backgroundColor: catColor.dot,
                                  }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT SCHEDULE (ALL POSTS TILL DATE WITH STAGE & PLATFORM FILTERS) */}
        {activeTab === 'upcoming' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* 4-Stage Filter Pills */}
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

              {/* Platform Filter Pills with SVG Brand Logos */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['all', 'Instagram', 'LinkedIn', 'Twitter', 'TikTok', 'Facebook'].map(
                  (plat) => (
                    <button
                      key={plat}
                      onClick={() => setFilterPlatform(plat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                        filterPlatform === plat
                          ? 'bg-[#C44D34] text-white'
                          : isDark
                          ? 'bg-[#1D242C] text-stone-400 hover:text-white'
                          : 'bg-white text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {plat === 'all' ? (
                        <span>All Platforms</span>
                      ) : (
                        <PlatformLogo
                          platform={plat}
                          size="xs"
                          className={filterPlatform === plat ? '!text-white' : ''}
                        />
                      )}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              {filteredCalendarPosts.map((post) => {
                const catColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
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
                      isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
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
        )}

        {/* TAB 3: ALL ANALYTICS FOR THIS CLIENT (CLICKABLE METRICS) */}
        {activeTab === 'analytics' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#C44D34]">
                Click any metric card, platform, category, or campaign to view matching posts
              </span>
            </div>

            {/* 4-Stage Summary Cards (Clickable) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
              <button
                type="button"
                onClick={() =>
                  setAnalyticsDrillDown({ type: 'all', label: 'All Client Posts' })
                }
                className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                  analyticsDrillDown?.type === 'all'
                    ? 'border-[#C44D34] ring-1 ring-[#C44D34]/30 bg-[#C44D34]/[0.05]'
                    : isDark
                    ? 'bg-[#1D242C] border-[#2A3440]'
                    : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="text-2xl font-black text-stone-900 dark:text-white">
                  {totalPosts}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">
                  TOTAL POSTS
                </div>
              </button>

              {(
                [
                  { status: 'Planned' as PostStatus, count: plannedPosts.length },
                  { status: 'In review' as PostStatus, count: pendingApprovals.length },
                  { status: 'Approved' as PostStatus, count: approvedPosts.length },
                  { status: 'Scheduled' as PostStatus, count: scheduledPosts.length },
                ] as const
              ).map((st) => {
                const isSel =
                  analyticsDrillDown?.type === 'stage' &&
                  analyticsDrillDown.stage === st.status;
                return (
                  <button
                    key={st.status}
                    type="button"
                    onClick={() =>
                      setAnalyticsDrillDown({
                        type: 'stage',
                        stage: st.status,
                        label: `Stage: ${st.status}`,
                      })
                    }
                    className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSel
                        ? 'border-[#C44D34] ring-1 ring-[#C44D34]/30 bg-[#C44D34]/[0.05]'
                        : isDark
                        ? 'bg-[#1D242C] border-[#2A3440]'
                        : 'bg-white border-[#E8E4DC]'
                    }`}
                  >
                    <div
                      className="text-2xl font-black"
                      style={{ color: STATUS_STYLES[st.status].hex }}
                    >
                      {st.count}
                    </div>
                    <div className="mt-1.5 flex justify-center">
                      <StatusStageBadge status={st.status} size="xs" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform Distribution (Clickable, using SVG Brand Logos) */}
              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">
                  Platform Distribution (Click to View Posts)
                </h3>
                <div className="space-y-3">
                  {platformEntries.map((item) => {
                    const isSel =
                      analyticsDrillDown?.type === 'platform' &&
                      analyticsDrillDown.platform === item.platform;
                    return (
                      <button
                        key={item.platform}
                        type="button"
                        onClick={() =>
                          setAnalyticsDrillDown({
                            type: 'platform',
                            platform: item.platform,
                            label: `Platform: ${item.platform}`,
                          })
                        }
                        className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer ${
                          isSel
                            ? 'border-[#C44D34] bg-[#C44D34]/10'
                            : 'border-transparent hover:bg-stone-50 dark:hover:bg-stone-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <PlatformLogo
                            platform={item.platform}
                            size="sm"
                            className="font-semibold"
                          />
                          <span className="text-stone-400 font-bold tabular-nums">
                            {item.count} posts ({item.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#C44D34]"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Breakdown (Clickable) */}
              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">
                  Content Pillar Mix (Click to View Posts)
                </h3>
                <div className="space-y-3">
                  {categoryEntries.map((item) => {
                    const catColor =
                      CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] ||
                      CATEGORY_COLORS.POST;
                    const isSel =
                      analyticsDrillDown?.type === 'category' &&
                      analyticsDrillDown.category === item.category;
                    return (
                      <button
                        key={item.category}
                        type="button"
                        onClick={() =>
                          setAnalyticsDrillDown({
                            type: 'category',
                            category: item.category,
                            label: `Category: ${item.category}`,
                          })
                        }
                        className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer ${
                          isSel
                            ? 'border-[#C44D34] bg-[#C44D34]/10'
                            : 'border-transparent hover:bg-stone-50 dark:hover:bg-stone-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold">{item.category}</span>
                          <span className="text-stone-400 font-bold tabular-nums">
                            {item.count} posts ({item.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.percent}%`,
                              backgroundColor: catColor.dot,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drill-Down Posts List in Client Portal Analytics */}
            {analyticsDrillDown && (
              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#C44D34]">
                      Posts for:
                    </span>
                    <span className="text-sm font-bold">{analyticsDrillDown.label}</span>
                    <span className="text-xs text-stone-400 font-bold tabular-nums">
                      ({portalAnalyticsPosts.length})
                    </span>
                  </div>
                  {analyticsDrillDown.type !== 'all' && (
                    <button
                      type="button"
                      onClick={() =>
                        setAnalyticsDrillDown({ type: 'all', label: 'All Client Posts' })
                      }
                      className="text-xs font-bold text-[#C44D34] hover:underline cursor-pointer"
                    >
                      Show All
                    </button>
                  )}
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
              <button
                type="button"
                onClick={() => setSelectedPortalPostId(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
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
    </div>
  );
};
