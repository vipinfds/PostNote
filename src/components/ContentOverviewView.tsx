import React, { useState } from 'react';
import {
  Plus,
  ChevronDown,
  Check,
  FolderKanban,
  Clock,
  Search,
  X,
  ChevronRight,
  Download,
  ImagePlus,
  ExternalLink,
  Calendar,
  BarChart3,
  Link as LinkIcon,
  Pencil,
  CheckSquare,
  Square,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Post, Client, Campaign, PostStatus, CampaignExternalLink } from '../types';
import {
  CATEGORY_COLORS,
  STATUS_STYLES,
  POST_STAGES,
  formatSectionDate,
  getTodayDateStr,
  computeCampaignDuration,
  normalizePostStatus,
} from '../utils/theme';
import { downloadMediaFile } from '../utils/mediaDownload';
import { PullToRefreshContainer } from './PullToRefreshContainer';
import { MediaCarousel } from './MediaCarousel';
import { StatusStageBadge, getStageIcon } from './StatusStageBadge';
import { PlatformLogo } from './PlatformLogo';

interface ContentOverviewViewProps {
  posts: Post[];
  clients: Client[];
  campaigns?: Campaign[];
  onSaveCampaign?: (campaign: Omit<Campaign, 'id'> & { id?: string }) => void;
  onOpenNewPost: () => void;
  onEditPost: (post: Post) => void;
  onBulkUpdateStatus?: (postIds: string[], newStatus: PostStatus) => void;
  onBulkDeletePosts?: (postIds: string[]) => void;
  initialTab?: 'feed' | 'campaigns';
  isDark?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export const ContentOverviewView: React.FC<ContentOverviewViewProps> = ({
  posts,
  clients,
  campaigns = [],
  onSaveCampaign,
  onOpenNewPost,
  onEditPost,
  onBulkUpdateStatus,
  onBulkDeletePosts,
  initialTab = 'campaigns',
  isDark,
  onRefresh,
}) => {
  const [activeTab] = useState<'feed' | 'campaigns'>(initialTab);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | PostStatus>('All');
  const [filterMode, setFilterMode] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  // Campaign creation / edit modal state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignClientId, setNewCampaignClientId] = useState(clients[0]?.id || '');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [newCampaignMetaAdLink, setNewCampaignMetaAdLink] = useState('');
  const [newCampaignStartDate, setNewCampaignStartDate] = useState('');
  const [newCampaignEndDate, setNewCampaignEndDate] = useState('');
  const [newCampaignLinks, setNewCampaignLinks] = useState<CampaignExternalLink[]>([]);
  const [linkLabelDraft, setLinkLabelDraft] = useState('');
  const [linkUrlDraft, setLinkUrlDraft] = useState('');

  // Expanded campaign analytics state (default to first campaign if in campaigns tab)
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  const todayStr = getTodayDateStr();

  // Base posts filtered by Client, Status, and Search
  const baseMatchingPosts = posts.filter((p) => {
    const pStatus = normalizePostStatus(p.status);
    if (selectedClientId !== 'all' && p.clientId !== selectedClientId) {
      return false;
    }
    if (statusFilter !== 'All' && pStatus !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchCaption = p.caption?.toLowerCase().includes(q);
      const matchClient = p.clientName?.toLowerCase().includes(q);
      const matchCategory = p.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchCaption && !matchClient && !matchCategory) {
        return false;
      }
    }
    return true;
  });

  const upcomingCount = baseMatchingPosts.filter(
    (p) => p.date >= todayStr || normalizePostStatus(p.status) !== 'Scheduled'
  ).length;
  const pastCount = baseMatchingPosts.filter((p) => p.date < todayStr).length;
  const allRangeCount = baseMatchingPosts.length;

  const filteredPosts = baseMatchingPosts
    .filter((p) => {
      const isDelayed =
        p.date < todayStr && normalizePostStatus(p.status) !== 'Scheduled';
      if (filterMode === 'upcoming') return p.date >= todayStr || isDelayed;
      if (filterMode === 'past') return p.date < todayStr;
      return true;
    })
    .slice()
    .sort((a, b) =>
      filterMode === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );

  const visiblePostIds = filteredPosts.map((p) => p.id);
  const allVisibleSelected =
    visiblePostIds.length > 0 &&
    visiblePostIds.every((id) => selectedPostIds.includes(id));

  const toggleSelectPost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedPostIds((prev) => prev.filter((id) => !visiblePostIds.includes(id)));
    } else {
      setSelectedPostIds((prev) => Array.from(new Set([...prev, ...visiblePostIds])));
    }
  };

  // Group by date
  const groupedByDate: Record<string, Post[]> = {};
  filteredPosts.forEach((post) => {
    if (!groupedByDate[post.date]) {
      groupedByDate[post.date] = [];
    }
    groupedByDate[post.date].push(post);
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const statusCounts: Record<'All' | PostStatus, number> = {
    All: posts.length,
    Planned: posts.filter((p) => normalizePostStatus(p.status) === 'Planned').length,
    'In review': posts.filter((p) => normalizePostStatus(p.status) === 'In review').length,
    Approved: posts.filter((p) => normalizePostStatus(p.status) === 'Approved').length,
    Scheduled: posts.filter((p) => normalizePostStatus(p.status) === 'Scheduled').length,
  };

  const openNewCampaignModal = () => {
    setEditingCampaignId(null);
    setNewCampaignName('');
    setNewCampaignClientId(selectedClientId !== 'all' ? selectedClientId : clients[0]?.id || '');
    setNewCampaignDesc('');
    setNewCampaignMetaAdLink('');
    setNewCampaignStartDate('');
    setNewCampaignEndDate('');
    setNewCampaignLinks([]);
    setLinkLabelDraft('');
    setLinkUrlDraft('');
    setIsCampaignModalOpen(true);
  };

  const openEditCampaignModal = (camp: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    const matchedClient =
      clients.find((c) => c.id === camp.clientId) ||
      clients.find((c) => c.name.toLowerCase() === (camp.clientName || '').toLowerCase());
    setEditingCampaignId(camp.id);
    setNewCampaignName(camp.name);
    setNewCampaignClientId(matchedClient?.id || camp.clientId || '');
    setNewCampaignDesc(camp.description || '');
    setNewCampaignMetaAdLink(camp.metaAdLink || '');
    setNewCampaignStartDate(camp.startDate || '');
    setNewCampaignEndDate(camp.endDate || '');
    setNewCampaignLinks(camp.externalLinks || []);
    setLinkLabelDraft('');
    setLinkUrlDraft('');
    setIsCampaignModalOpen(true);
  };

  const handleAddExternalLinkDraft = () => {
    if (!linkUrlDraft.trim()) return;
    const rawUrl = linkUrlDraft.trim();
    const normalizedUrl =
      rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : `https://${rawUrl}`;
    setNewCampaignLinks((prev) => [
      ...prev,
      { label: linkLabelDraft.trim() || 'Campaign Resource', url: normalizedUrl },
    ]);
    setLinkLabelDraft('');
    setLinkUrlDraft('');
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim() || !onSaveCampaign) return;

    const targetClient = clients.find((c) => c.id === newCampaignClientId);
    let finalLinks = [...newCampaignLinks];
    if (linkUrlDraft.trim()) {
      const rawUrl = linkUrlDraft.trim();
      const normalizedUrl =
        rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
          ? rawUrl
          : `https://${rawUrl}`;
      finalLinks.push({
        label: linkLabelDraft.trim() || 'Campaign Link',
        url: normalizedUrl,
      });
    }

    const formattedMetaUrl = newCampaignMetaAdLink.trim()
      ? newCampaignMetaAdLink.trim().startsWith('http')
        ? newCampaignMetaAdLink.trim()
        : `https://${newCampaignMetaAdLink.trim()}`
      : undefined;

    onSaveCampaign({
      id: editingCampaignId || undefined,
      name: newCampaignName.trim(),
      clientId: newCampaignClientId || undefined,
      clientName: targetClient?.name,
      description: newCampaignDesc.trim(),
      metaAdLink: formattedMetaUrl,
      externalLinks: finalLinks,
      startDate: newCampaignStartDate || undefined,
      endDate: newCampaignEndDate || undefined,
    });
    setIsCampaignModalOpen(false);
  };

  // Helper to match posts belonging to a campaign
  const getPostsForCampaign = (camp: Campaign): Post[] => {
    return posts.filter(
      (p) =>
        p.campaignId === camp.id ||
        (p.campaign && p.campaign.toLowerCase() === camp.name.toLowerCase()) ||
        (!p.campaign &&
          !p.campaignId &&
          camp.clientId &&
          p.clientId === camp.clientId)
    );
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((camp) => {
    if (selectedClientId !== 'all') {
      const matchedClient =
        camp.clientId === selectedClientId ||
        clients.find((c) => c.id === selectedClientId)?.name === camp.clientName;
      if (!matchedClient) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        camp.name.toLowerCase().includes(q) ||
        (camp.description && camp.description.toLowerCase().includes(q)) ||
        (camp.clientName && camp.clientName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <PullToRefreshContainer onRefresh={onRefresh} isDark={isDark}>
      <div
        id="content-overview-view"
        className={`min-h-[780px] pb-24 px-4 sm:px-6 pt-5 transition-colors ${
          isDark ? 'text-stone-100' : 'text-[#1E252B]'
        }`}
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
              POST NOTE
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              {activeTab === 'campaigns' ? 'Campaigns & Ad Analytics' : 'Content Queue'}
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {activeTab === 'campaigns'
                ? 'Click any campaign to inspect post analytics, duration, and Meta Ad links'
                : 'Post queue timeline, 4-stage workflow & marketing campaigns'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSaveCampaign && (
              <button
                onClick={openNewCampaignModal}
                className="px-3.5 py-1.5 border border-stone-300 dark:border-stone-700 hover:border-[#C44D34] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderKanban className="w-3.5 h-3.5 text-[#C44D34]" />
                <span>New Campaign</span>
              </button>
            )}

            <button
              id="content-new-post-btn"
              onClick={onOpenNewPost}
              className="px-3.5 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Post</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Client Filter + Campaign Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsClientPickerOpen(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:bg-[#252E38]'
                  : 'bg-white border-[#E8E4DC] text-stone-700 hover:bg-stone-50 shadow-xs'
              }`}
            >
              {selectedClient?.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedClient.color }}
                />
              )}
              <span className="truncate max-w-[160px] sm:max-w-[220px]">
                {selectedClient ? selectedClient.name : 'All Clients'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-stone-400 shrink-0" />
            </button>

            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#C44D34]/10 text-[#C44D34] tabular-nums">
              {filteredCampaigns.length}{' '}
              {filteredCampaigns.length === 1 ? 'Campaign' : 'Campaigns'}
            </span>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search campaigns or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-2 sm:py-1.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-100 placeholder-stone-500'
                  : 'bg-white border-[#E8E4DC] text-stone-900 placeholder-stone-400'
              }`}
            />
          </div>
        </div>

        {/* Secondary Filter Bar for Queue & Feed Tab (4 Color-Coded Stages with Icons) */}
        {activeTab === 'feed' && (
          <div className="space-y-2.5 mt-3 pt-3 border-t border-stone-200 dark:border-stone-800">
            {/* 4-Stage Filter Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['All', ...POST_STAGES] as const).map((status) => {
                const count = statusCounts[status];
                const isSelected = statusFilter === status;
                const stStyle = status !== 'All' ? STATUS_STYLES[status] : null;

                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSelected
                        ? stStyle
                          ? `${stStyle.badge} ring-2 ring-[#C44D34]/30 font-bold shadow-xs`
                          : 'bg-[#181E24] dark:bg-[#C44D34] text-white border-transparent shadow-xs font-bold'
                        : isDark
                        ? 'bg-[#1D242C] border-[#2A3440] text-stone-300 hover:text-white'
                        : 'bg-white border-[#E8E4DC] text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {status !== 'All' && (
                      <span className={isSelected ? '' : stStyle?.iconColor}>
                        {getStageIcon(status, 'w-3.5 h-3.5 shrink-0')}
                      </span>
                    )}
                    <span>{status === 'All' ? 'All Stages' : status}</span>
                    <span
                      className={`text-[10px] px-1.5 rounded-md tabular-nums ${
                        isSelected
                          ? 'bg-black/10 dark:bg-white/15'
                          : isDark
                          ? 'bg-stone-800 text-stone-400'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Client filter & Date-Range toggle row (Upcoming | Past | All) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                {visiblePostIds.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      allVisibleSelected
                        ? 'bg-[#C44D34]/10 border-[#C44D34] text-[#C44D34]'
                        : isDark
                        ? 'bg-[#1D242C] border-[#2A3440] text-stone-300 hover:border-stone-600'
                        : 'bg-white border-[#E8E4DC] text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#C44D34]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-stone-400" />
                    )}
                    <span>Select All</span>
                  </button>
                )}

                <button
                  onClick={() => setIsClientPickerOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isDark
                      ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:bg-[#252E38]'
                      : 'bg-white border-[#E8E4DC] text-stone-700 hover:bg-stone-50 shadow-xs'
                  }`}
                >
                  {selectedClient?.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: selectedClient.color }}
                    />
                  )}
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {selectedClient ? selectedClient.name : 'All clients'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-stone-400 shrink-0" />
                </button>
              </div>

              {/* Date-Range Segmented Toggle: Upcoming | Past | All */}
              <div
                id="queue-date-range-filter"
                className={`flex items-center gap-1 p-1 rounded-xl border ${
                  isDark ? 'bg-[#18202A] border-[#2A3646]' : 'bg-stone-200/70 border-stone-200'
                }`}
              >
                {(
                  [
                    { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
                    { id: 'past', label: 'Past', count: pastCount },
                    { id: 'all', label: 'All', count: allRangeCount },
                  ] as const
                ).map((range) => {
                  const active = filterMode === range.id;
                  return (
                    <button
                      key={range.id}
                      id={`queue-range-${range.id}`}
                      type="button"
                      onClick={() => setFilterMode(range.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#181E24] dark:bg-[#C44D34] text-white shadow-xs font-bold'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      <span>{range.label}</span>
                      <span
                        className={`text-[10px] px-1 rounded tabular-nums ${
                          active
                            ? 'bg-white/20 text-white'
                            : isDark
                            ? 'bg-stone-800 text-stone-400'
                            : 'bg-white/70 text-stone-500'
                        }`}
                      >
                        {range.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BULK STATUS & ACTION BAR (Appears when 1+ posts are checked) */}
            {selectedPostIds.length > 0 && (
              <div
                id="content-overview-bulk-action-bar"
                className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5 shadow-sm transition-all ${
                  isDark
                    ? 'bg-[#1F2935] border-[#C44D34]/60 text-stone-100'
                    : 'bg-[#FFF7F5] border-[#C44D34]/40 text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#C44D34] text-white text-xs font-bold tabular-nums">
                    {selectedPostIds.length} Selected
                  </span>
                  <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                    Transition selected posts in one click:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onBulkUpdateStatus && (
                    <select
                      id="content-overview-bulk-status-select"
                      aria-label="Bulk change status for selected posts"
                      defaultValue=""
                      onChange={(e) => {
                        const targetStatus = e.target.value as PostStatus;
                        if (!targetStatus) return;
                        onBulkUpdateStatus(selectedPostIds, targetStatus);
                        setSelectedPostIds([]);
                        e.target.value = '';
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                        isDark
                          ? 'bg-[#161E27] border-[#334254] text-stone-100'
                          : 'bg-white border-stone-300 text-stone-800 shadow-xs'
                      }`}
                    >
                      <option value="" disabled>
                        Move to Status...
                      </option>
                      {POST_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          Set to {stage}
                        </option>
                      ))}
                    </select>
                  )}

                  {onBulkDeletePosts && (
                    <button
                      type="button"
                      onClick={() => {
                        onBulkDeletePosts(selectedPostIds);
                        setSelectedPostIds([]);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete ({selectedPostIds.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedPostIds([])}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      isDark
                        ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FEED & QUEUE VIEW */}
        {activeTab === 'feed' && (
          <div className="space-y-6 mt-5">
            {Object.keys(groupedByDate).length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-2xl border-stone-300 dark:border-stone-800 my-4">
                <Clock className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-stone-600 dark:text-stone-300">
                  No posts in this queue
                </p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No posts matched "${searchQuery}".`
                    : 'Plan, review, approve, or schedule content for your clients.'}
                </p>
                <button
                  onClick={onOpenNewPost}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Post</span>
                </button>
              </div>
            ) : (
              Object.entries(groupedByDate).map(([dateStr, datePosts]) => {
                const isDatePast = dateStr < todayStr;
                const hasDelayedInGroup = datePosts.some(
                  (p) => p.date < todayStr && normalizePostStatus(p.status) !== 'Scheduled'
                );

                return (
                <div key={dateStr} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-xs font-bold uppercase tracking-wider ${
                        hasDelayedInGroup
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      {formatSectionDate(dateStr)}
                    </h3>
                    {dateStr === todayStr && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#C44D34]/10 text-[#C44D34]">
                        TODAY
                      </span>
                    )}
                    {isDatePast && hasDelayedInGroup && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-red-600 text-white shadow-xs">
                        <AlertCircle className="w-3 h-3" />
                        DELAYED · NOT SCHEDULED
                      </span>
                    )}
                    <span className="text-[11px] text-stone-400">
                      ({datePosts.length} {datePosts.length === 1 ? 'post' : 'posts'})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {datePosts.map((post) => {
                      const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                      const isDelayedPost =
                        post.date < todayStr && normalizePostStatus(post.status) !== 'Scheduled';
                      const isChecked = selectedPostIds.includes(post.id);

                      return (
                        <div
                          key={post.id}
                          onClick={() => onEditPost(post)}
                          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all group flex flex-col justify-between ${
                            isDelayedPost
                              ? isDark
                                ? 'bg-red-950/25 border-red-500/60 hover:border-red-400'
                                : 'bg-red-50/70 border-red-300 hover:border-red-500'
                              : isChecked
                              ? isDark
                                ? 'bg-[#222C38] border-[#C44D34]'
                                : 'bg-[#FFF9F7] border-[#C44D34]'
                              : isDark
                              ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34] hover:border-[#C44D34]'
                              : 'bg-white border-[#E8E4DC] hover:shadow-sm hover:border-[#C44D34]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => toggleSelectPost(post.id, e)}
                                  className="p-0.5 rounded text-stone-400 hover:text-[#C44D34] transition-colors shrink-0 cursor-pointer"
                                  title={isChecked ? 'Deselect post' : 'Select post for bulk status update'}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-[#C44D34]" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: catStyle.dot }}
                                />
                                <span
                                  className="font-bold text-[10px] tracking-wider uppercase shrink-0"
                                  style={{ color: catStyle.text }}
                                >
                                  {post.category}
                                </span>
                                <span className="text-stone-400">•</span>
                                <span className="text-stone-600 dark:text-stone-300 font-medium text-xs truncate">
                                  {post.clientName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isDelayedPost && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-extrabold uppercase tracking-wider">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    Delayed
                                  </span>
                                )}
                                <StatusStageBadge status={post.status} size="xs" />
                              </div>
                            </div>

                            <h4
                              className={`text-sm font-bold mt-1 transition-colors line-clamp-1 ${
                                isDelayedPost
                                  ? 'text-red-700 dark:text-red-300 group-hover:text-red-600'
                                  : 'text-stone-900 dark:text-white group-hover:text-[#C44D34]'
                              }`}
                            >
                              {post.title}
                            </h4>

                            <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1.5 leading-relaxed">
                              {post.caption}
                            </p>

                            {((post.media && post.media.length > 0) || post.mediaUrl) && (
                              <div
                                className="mt-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MediaCarousel
                                  mediaItems={
                                    post.media && post.media.length > 0
                                      ? post.media
                                      : [
                                          {
                                            id: `media-${post.id}`,
                                            title: post.title || 'Attached Media',
                                            type: post.mediaType || 'image',
                                            url: post.mediaUrl,
                                            thumbnailUrl: post.mediaUrl,
                                          },
                                        ]
                                  }
                                  fallbackTitle={post.title}
                                  heightClass="aspect-video max-h-[160px]"
                                  showCaptionBar={false}
                                  isDark={isDark}
                                />
                              </div>
                            )}

                            {!((post.media && post.media.length > 0) || post.mediaUrl) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditPost(post);
                                }}
                                className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-stone-500 hover:text-[#C44D34] transition-colors"
                              >
                                <ImagePlus className="w-3.5 h-3.5 text-stone-400" />
                                <span>+ Add Media</span>
                              </button>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                            <div>
                              {post.campaignId || post.campaign ? (
                                <span className="flex items-center gap-1 text-[10px] text-[#C44D34] font-semibold truncate max-w-[140px]">
                                  <FolderKanban className="w-3 h-3" />
                                  {campaigns.find((c) => c.id === post.campaignId)?.name ||
                                    post.campaign ||
                                    'Campaign'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400">Standard Post</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {((post.media && post.media.length > 0) || post.mediaUrl) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const targetUrl =
                                      post.media?.[0]?.url ||
                                      post.media?.[0]?.thumbnailUrl ||
                                      post.mediaUrl ||
                                      '';
                                    downloadMediaFile(targetUrl, post.title);
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-[#C44D34] transition-colors"
                                  title="Download media asset to device"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                              )}
                              <PlatformLogo platform={post.platform} size="xs" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}

        {/* =========================================================
            CAMPAIGNS VIEW WITH POST-BASED ANALYTICS, DURATION & META AD LINKS
            ========================================================= */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4 mt-4">
            {/* Client filter bar for Campaigns */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <button
                onClick={() => setIsClientPickerOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:bg-[#252E38]'
                    : 'bg-white border-[#E8E4DC] text-stone-700 hover:bg-stone-50 shadow-xs'
                }`}
              >
                {selectedClient?.color && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: selectedClient.color }}
                  />
                )}
                <span className="truncate">
                  {selectedClient ? selectedClient.name : 'All clients'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-stone-400 shrink-0" />
              </button>

              <span className="text-[11px] text-stone-400 font-medium">
                Click any campaign card to expand full post analytics, duration & ad links
              </span>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-2xl border-stone-300 dark:border-stone-800 my-4">
                <FolderKanban className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-stone-600 dark:text-stone-300">
                  No campaigns found
                </p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  Group client posts into marketing campaigns with automatic duration analytics and Meta Ad links.
                </p>
                {onSaveCampaign && (
                  <button
                    onClick={openNewCampaignModal}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Campaign</span>
                  </button>
                )}
              </div>
            ) : (
              filteredCampaigns.map((camp) => {
                const client =
                  clients.find((c) => c.id === camp.clientId) ||
                  clients.find(
                    (c) => c.name.toLowerCase() === (camp.clientName || '').toLowerCase()
                  );
                const campaignPosts = getPostsForCampaign(camp);
                const totalCampPosts = campaignPosts.length;
                const plannedCount = campaignPosts.filter(
                  (p) => normalizePostStatus(p.status) === 'Planned'
                ).length;
                const inReviewCount = campaignPosts.filter(
                  (p) => normalizePostStatus(p.status) === 'In review'
                ).length;
                const approvedCount = campaignPosts.filter(
                  (p) => normalizePostStatus(p.status) === 'Approved'
                ).length;
                const scheduledCount = campaignPosts.filter(
                  (p) => normalizePostStatus(p.status) === 'Scheduled'
                ).length;

                const readyCount = approvedCount + scheduledCount;
                const progress =
                  totalCampPosts > 0 ? Math.round((readyCount / totalCampPosts) * 100) : 0;

                const durationInfo = computeCampaignDuration(
                  campaignPosts,
                  camp.startDate,
                  camp.endDate
                );

                // Platform breakdown for this campaign
                const platCounts: Record<string, number> = {};
                campaignPosts.forEach((p) => {
                  platCounts[p.platform] = (platCounts[p.platform] || 0) + 1;
                });

                const isExpanded = expandedCampaignId === camp.id;

                return (
                  <div
                    key={camp.id}
                    className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${
                      isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                      className="cursor-pointer"
                    >
                      {/* Top row: Client + Duration + Edit + Expand */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: client?.color || '#C44D34' }}
                          />
                          <span className="font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider text-[10px]">
                            {client ? client.name : camp.clientName || 'All Clients'}
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                            <Calendar className="w-3 h-3 text-[#C44D34]" />
                            <span>{durationInfo.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {onSaveCampaign && (
                            <button
                              type="button"
                              onClick={(e) => openEditCampaignModal(camp, e)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-[#C44D34] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                              title="Edit campaign & ad links"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-[11px] font-bold text-[#C44D34] flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Hide Analytics' : 'View Analytics'}</span>
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-stone-400 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
                        <div>
                          <h3 className="text-base font-bold text-stone-900 dark:text-white">
                            {camp.name}
                          </h3>
                          {camp.description && (
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-2xl">
                              {camp.description}
                            </p>
                          )}
                        </div>

                        {/* Direct Clickable Meta Ad Link & External Links on Card Header */}
                        <div
                          className="flex flex-wrap items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {camp.metaAdLink && (
                            <a
                              href={camp.metaAdLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:text-blue-400 border border-[#1877F2]/30 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                              title="Open Meta Ad Library / Ads Manager in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span>Meta Ad Link</span>
                            </a>
                          )}
                          {camp.externalLinks?.map((lnk, idx) => (
                            <a
                              key={idx}
                              href={lnk.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                                isDark
                                  ? 'bg-[#161E27] border-[#2A3646] text-stone-300 hover:border-[#C44D34] hover:text-white'
                                  : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-[#C44D34] hover:text-stone-900'
                              }`}
                            >
                              <LinkIcon className="w-3 h-3 text-[#C44D34]" />
                              <span>{lnk.label}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1 tabular-nums">
                          <span>
                            Pipeline Readiness ({readyCount}/{totalCampPosts} Approved or Scheduled)
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            className="h-full bg-[#C44D34] rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* 4 Color-Coded Stage Counters Row */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 text-[11px] tabular-nums">
                        <span className="font-bold text-stone-700 dark:text-stone-200 mr-1">
                          {totalCampPosts} Posts:
                        </span>
                        <StatusStageBadge status="Planned" size="xs" />
                        <span className="font-bold text-stone-600 dark:text-stone-300 mr-1">
                          {plannedCount}
                        </span>
                        <StatusStageBadge status="In review" size="xs" />
                        <span className="font-bold text-stone-600 dark:text-stone-300 mr-1">
                          {inReviewCount}
                        </span>
                        <StatusStageBadge status="Approved" size="xs" />
                        <span className="font-bold text-stone-600 dark:text-stone-300 mr-1">
                          {approvedCount}
                        </span>
                        <StatusStageBadge status="Scheduled" size="xs" />
                        <span className="font-bold text-stone-600 dark:text-stone-300">
                          {scheduledCount}
                        </span>
                      </div>
                    </div>

                    {/* =========================================================
                        EXPANDED CAMPAIGN ANALYTICS, DURATION, LINKS & POSTS
                        ========================================================= */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4 animate-fade-in">
                        {/* Analytics KPI Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div
                            className={`p-3 rounded-xl border ${
                              isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              Total Posts
                            </span>
                            <span className="text-lg font-extrabold text-stone-900 dark:text-white tabular-nums">
                              {totalCampPosts}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              Across {Object.keys(platCounts).length || 1} platforms
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-xl border ${
                              isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              Campaign Duration
                            </span>
                            <span className="text-lg font-extrabold text-[#C44D34] tabular-nums">
                              {durationInfo.daysSpan > 0 ? `${durationInfo.daysSpan} Days` : '—'}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5 truncate">
                              {durationInfo.startStr && durationInfo.endStr
                                ? `${durationInfo.startStr} → ${durationInfo.endStr}`
                                : 'Add posts to calculate'}
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-xl border ${
                              isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              Approved & Scheduled
                            </span>
                            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {readyCount} / {totalCampPosts}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              {progress}% ready to air
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-xl border ${
                              isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              In Review / Planned
                            </span>
                            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                              {inReviewCount} / {plannedCount}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              {inReviewCount} awaiting approval
                            </span>
                          </div>
                        </div>

                        {/* Stage Breakdown Bar & Platform Share */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div
                            className={`p-3.5 rounded-xl border space-y-2 ${
                              isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              4-Stage Campaign Breakdown
                            </span>
                            {(
                              [
                                { stage: 'Planned' as PostStatus, count: plannedCount },
                                { stage: 'In review' as PostStatus, count: inReviewCount },
                                { stage: 'Approved' as PostStatus, count: approvedCount },
                                { stage: 'Scheduled' as PostStatus, count: scheduledCount },
                              ] as const
                            ).map((row) => {
                              const pct =
                                totalCampPosts > 0
                                  ? Math.round((row.count / totalCampPosts) * 100)
                                  : 0;
                              const st = STATUS_STYLES[row.stage];
                              return (
                                <div key={row.stage} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <StatusStageBadge status={row.stage} size="xs" />
                                    <span className="text-[11px] font-bold text-stone-500 tabular-nums">
                                      {row.count} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${pct}%`, backgroundColor: st.hex }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div
                            className={`p-3.5 rounded-xl border space-y-2.5 flex flex-col justify-between ${
                              isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                            }`}
                          >
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                                Campaign Links & Ad Redirects
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {camp.metaAdLink ? (
                                  <a
                                    href={camp.metaAdLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 rounded-xl bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open Meta Ad Link</span>
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => openEditCampaignModal(camp, e)}
                                    className="px-3 py-1.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-500 hover:text-[#C44D34] hover:border-[#C44D34] inline-flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Add Meta Ad Link</span>
                                  </button>
                                )}

                                {camp.externalLinks?.map((lnk, idx) => (
                                  <a
                                    key={idx}
                                    href={lnk.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                                      isDark
                                        ? 'bg-[#1D242C] border-[#2E3B4A] text-stone-200 hover:border-[#C44D34]'
                                        : 'bg-white border-stone-200 text-stone-800 hover:border-[#C44D34]'
                                    }`}
                                  >
                                    <LinkIcon className="w-3.5 h-3.5 text-[#C44D34]" />
                                    <span>{lnk.label}</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </a>
                                ))}
                              </div>
                            </div>

                            {Object.keys(platCounts).length > 0 && (
                              <div className="pt-2 border-t border-stone-200/70 dark:border-stone-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                                  Platform Distribution
                                </span>
                                <div className="flex flex-wrap gap-2.5 text-xs">
                                  {Object.entries(platCounts).map(([plat, cnt]) => (
                                    <span
                                      key={plat}
                                      className="inline-flex items-center gap-1 font-semibold text-stone-700 dark:text-stone-300 tabular-nums"
                                    >
                                      <PlatformLogo platform={plat} size="xs" />
                                      <span>:</span>
                                      <strong>{cnt}</strong>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Posts in this Campaign */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                              Posts in Campaign ({totalCampPosts})
                            </h4>
                          </div>

                          {campaignPosts.length === 0 ? (
                            <p className="text-xs text-stone-400 py-2 italic">
                              No posts attached to this campaign yet.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {campaignPosts.map((p) => (
                                <div
                                  key={p.id}
                                  onClick={() => onEditPost(p)}
                                  className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                                    isDark
                                      ? 'bg-[#161E27] border-[#2A3646] hover:bg-[#1E2734]'
                                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <p className="font-bold text-stone-900 dark:text-white truncate">
                                      {p.title}
                                    </p>
                                    <div className="text-[10px] text-stone-400 flex items-center gap-1.5 mt-0.5 tabular-nums">
                                      <span>{p.date}</span>
                                      <span>·</span>
                                      <PlatformLogo platform={p.platform} size="xs" />
                                      <span>·</span>
                                      <span>{p.category}</span>
                                    </div>
                                  </div>
                                  <StatusStageBadge status={p.status} size="xs" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Client Picker Modal */}
        {isClientPickerOpen && (
          <div
            onClick={() => setIsClientPickerOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] flex flex-col justify-end animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md mx-auto rounded-t-3xl border-t p-5 animate-slide-up transition-colors shadow-2xl ${
                isDark
                  ? 'bg-[#181F26] border-[#2E3A47] text-white'
                  : 'bg-[#FAF7F2] border-[#E8E3DA]'
              }`}
            >
              <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3 px-1">
                Filter by Client
              </h3>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedClientId('all');
                    setIsClientPickerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-colors ${
                    selectedClientId === 'all'
                      ? isDark
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-200/80 text-stone-900'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <span>All clients</span>
                  {selectedClientId === 'all' && (
                    <Check className="w-4 h-4 text-[#C44D34] stroke-[3]" />
                  )}
                </button>

                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setIsClientPickerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-colors ${
                      selectedClientId === client.id
                        ? isDark
                          ? 'bg-stone-800 text-white'
                          : 'bg-stone-200/80 text-stone-900'
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: client.color }}
                      />
                      <span>{client.name}</span>
                    </div>
                    {selectedClientId === client.id && (
                      <Check className="w-4 h-4 text-[#C44D34] stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Campaign Modal (With Meta Ad Link & Custom External Links) */}
        {isCampaignModalOpen && (
          <div
            onClick={() => setIsCampaignModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl transition-colors my-8 ${
                isDark
                  ? 'bg-[#181F26] border-[#2E3A47] text-white'
                  : 'bg-white border-[#E8E3DA]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                <h3 className="text-base font-bold">
                  {editingCampaignId ? 'Edit Campaign & Links' : 'Create New Campaign'}
                </h3>
                <button
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-3.5 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Winter Collection Launch"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
                        isDark
                          ? 'bg-[#1E2734] border-[#2A3646] text-white'
                          : 'bg-white border-stone-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">
                      Target Client
                    </label>
                    <select
                      value={newCampaignClientId}
                      onChange={(e) => setNewCampaignClientId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
                        isDark
                          ? 'bg-[#1E2734] border-[#2A3646] text-white'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      <option value="">All Clients (Agency-wide)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">
                    Description / Strategy
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Target audience, objectives, ad sets, key messaging..."
                    value={newCampaignDesc}
                    onChange={(e) => setNewCampaignDesc(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
                      isDark
                        ? 'bg-[#1E2734] border-[#2A3646] text-white'
                        : 'bg-white border-stone-200'
                    }`}
                  />
                </div>

                {/* Optional Custom Start / End Dates (auto-computed from posts if left blank) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={newCampaignStartDate}
                      onChange={(e) => setNewCampaignStartDate(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                        isDark
                          ? 'bg-[#1E2734] border-[#2A3646] text-white'
                          : 'bg-white border-stone-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={newCampaignEndDate}
                      onChange={(e) => setNewCampaignEndDate(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                        isDark
                          ? 'bg-[#1E2734] border-[#2A3646] text-white'
                          : 'bg-white border-stone-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Meta Ad Link Input */}
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">
                    Meta Ad Link (Ads Manager / Ad Library URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.facebook.com/ads/library/..."
                    value={newCampaignMetaAdLink}
                    onChange={(e) => setNewCampaignMetaAdLink(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
                      isDark
                        ? 'bg-[#1E2734] border-[#2A3646] text-white'
                        : 'bg-white border-stone-200'
                    }`}
                  />
                </div>

                {/* Additional External Links */}
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">
                    Additional Campaign Links (Landing Page, Drive, Brief)
                  </label>
                  {newCampaignLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {newCampaignLinks.map((lnk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-semibold"
                        >
                          <span>{lnk.label}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewCampaignLinks((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-stone-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. Landing Page)"
                      value={linkLabelDraft}
                      onChange={(e) => setLinkLabelDraft(e.target.value)}
                      className={`w-1/3 px-2.5 py-1.5 rounded-xl border text-xs ${
                        isDark
                          ? 'bg-[#1E2734] border-[#2A3646] text-white'
                          : 'bg-white border-stone-200'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="https://..."
                      value={linkUrlDraft}
                      onChange={(e) => setLinkUrlDraft(e.target.value)}
                      className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs ${
                        isDark
                          ? 'bg-[#1E2734] border-[#2A3646] text-white'
                          : 'bg-white border-stone-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddExternalLinkDraft}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold hover:border-[#C44D34] cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCampaignModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {editingCampaignId ? 'Update Campaign' : 'Save Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PullToRefreshContainer>
  );
};
