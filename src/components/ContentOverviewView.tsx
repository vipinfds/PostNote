import React, { useState } from 'react';
import {
  Plus,
  ChevronDown,
  Check,
  Film,
  Image as ImageIcon,
  Play,
  FolderKanban,
  Clock,
  Search,
  X,
  ChevronRight,
  List,
  Sparkles,
  Download,
  ImagePlus,
} from 'lucide-react';
import { Post, Client, Campaign, PostStatus } from '../types';
import { CATEGORY_COLORS, STATUS_STYLES, formatSectionDate } from '../utils/theme';
import { downloadMediaFile } from '../utils/mediaDownload';

interface ContentOverviewViewProps {
  posts: Post[];
  clients: Client[];
  campaigns?: Campaign[];
  onSaveCampaign?: (campaign: Omit<Campaign, 'id'>) => void;
  onOpenNewPost: () => void;
  onEditPost: (post: Post) => void;
  initialTab?: 'feed' | 'campaigns';
  isDark?: boolean;
}

export const ContentOverviewView: React.FC<ContentOverviewViewProps> = ({
  posts,
  clients,
  campaigns = [],
  onSaveCampaign,
  onOpenNewPost,
  onEditPost,
  initialTab = 'feed',
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'campaigns'>(initialTab);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | PostStatus>('All');
  const [filterMode, setFilterMode] = useState<'upcoming' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);

  // Campaign creation modal state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignClientId, setNewCampaignClientId] = useState(clients[0]?.id || '');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // Today reference date: 2026-09-20
  const todayStr = '2026-09-20';

  // Filter posts
  let filteredPosts = posts.filter((p) => {
    // 1. Client filter
    if (selectedClientId !== 'all' && p.clientId !== selectedClientId) {
      return false;
    }
    // 2. Status filter
    if (statusFilter !== 'All' && p.status !== statusFilter) {
      return false;
    }
    // 3. Upcoming filter
    if (filterMode === 'upcoming') {
      if (p.date < todayStr && p.status === 'Published') {
        return false;
      }
    }
    // 4. Search query
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

  // Sort chronologically
  filteredPosts.sort((a, b) => a.date.localeCompare(b.date));

  // Group by date
  const groupedByDate: Record<string, Post[]> = {};
  filteredPosts.forEach((post) => {
    if (!groupedByDate[post.date]) {
      groupedByDate[post.date] = [];
    }
    groupedByDate[post.date].push(post);
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const statusCounts = {
    All: posts.length,
    Planned: posts.filter((p) => p.status === 'Planned').length,
    'In review': posts.filter((p) => p.status === 'In review').length,
    Scheduled: posts.filter((p) => p.status === 'Scheduled').length,
    Published: posts.filter((p) => p.status === 'Published').length,
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim() || !onSaveCampaign) return;

    onSaveCampaign({
      name: newCampaignName.trim(),
      clientId: newCampaignClientId || undefined,
      description: newCampaignDesc.trim(),
    });
    setNewCampaignName('');
    setNewCampaignDesc('');
    setIsCampaignModalOpen(false);
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((camp) => {
    if (selectedClientId !== 'all' && camp.clientId && camp.clientId !== selectedClientId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        camp.name.toLowerCase().includes(q) ||
        (camp.description && camp.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
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
          <h2 className="text-xl font-bold tracking-tight">Content Queue</h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Post queue timeline, content schedule & marketing campaigns
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'campaigns' && onSaveCampaign && (
            <button
              onClick={() => setIsCampaignModalOpen(true)}
              className="px-3.5 py-1.5 border border-stone-300 dark:border-stone-700 hover:border-[#C44D34] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#C44D34]" />
              <span>New Campaign</span>
            </button>
          )}

          <button
            id="content-new-post-btn"
            onClick={onOpenNewPost}
            className="px-3.5 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Main Mode Toggle: Queue & Feed vs Campaigns */}
      <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
        <div
          className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDark ? 'bg-[#18202A] border-[#2A3646]' : 'bg-stone-100 border-stone-200'
          }`}
        >
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'feed'
                ? 'bg-white dark:bg-[#253242] text-stone-900 dark:text-white shadow-xs font-bold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Post Queue & Feed</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                activeTab === 'feed'
                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
              }`}
            >
              {posts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'campaigns'
                ? 'bg-white dark:bg-[#253242] text-stone-900 dark:text-white shadow-xs font-bold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Campaigns</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                activeTab === 'campaigns'
                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
              }`}
            >
              {campaigns.length}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={activeTab === 'feed' ? 'Search posts or clients...' : 'Search campaigns...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-100 placeholder-stone-500'
                : 'bg-white border-[#E8E4DC] text-stone-900 placeholder-stone-400'
            }`}
          />
        </div>
      </div>

      {/* Secondary Filter Bar for Queue & Feed Tab */}
      {activeTab === 'feed' && (
        <div className="space-y-2 mt-3 pt-3 border-t border-stone-200 dark:border-stone-800">
          {/* Status filters row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['All', 'Planned', 'In review', 'Scheduled', 'Published'] as const).map((status) => {
              const count = statusCounts[status];
              const isSelected = statusFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-[#181E24] dark:bg-[#C44D34] text-white shadow-xs font-bold'
                      : isDark
                      ? 'bg-[#1D242C] border border-[#2A3440] text-stone-300 hover:text-white'
                      : 'bg-white border border-[#E8E4DC] text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>{status === 'All' ? 'All Queue' : status}</span>
                  <span
                    className={`text-[10px] px-1 rounded-md ${
                      isSelected
                        ? 'bg-white/20 text-white'
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

          {/* Client filter & Upcoming toggle row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={() => setIsClientPickerOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
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
              <span>{selectedClient ? selectedClient.name : 'All clients'}</span>
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-stone-400" />
            </button>

            {/* Upcoming vs All Dates */}
            <div className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl">
              <button
                onClick={() => setFilterMode('upcoming')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filterMode === 'upcoming'
                    ? 'bg-[#181E24] dark:bg-[#C44D34] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filterMode === 'all'
                    ? 'bg-[#181E24] dark:bg-[#C44D34] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                All posts
              </button>
            </div>
          </div>
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
                  : 'Plan, schedule, or draft new content for your clients.'}
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
            Object.entries(groupedByDate).map(([dateStr, datePosts]) => (
              <div key={dateStr} className="space-y-2.5">
                {/* Date Section Header */}
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {formatSectionDate(dateStr)}
                  </h3>
                  {dateStr === todayStr && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#C44D34]/10 text-[#C44D34]">
                      TODAY
                    </span>
                  )}
                  <span className="text-[11px] text-stone-400">
                    ({datePosts.length} {datePosts.length === 1 ? 'post' : 'posts'})
                  </span>
                </div>

                {/* Post Cards in this Date (Responsive Grid: 1 col mobile, 2 col tablet, 3 col PC) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {datePosts.map((post) => {
                    const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                    const statStyle = STATUS_STYLES[post.status] || STATUS_STYLES.Planned;

                    return (
                      <div
                        key={post.id}
                        onClick={() => onEditPost(post)}
                        className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all group flex flex-col justify-between ${
                          isDark
                            ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                            : 'bg-white border-[#E8E4DC] hover:shadow-sm'
                        }`}
                      >
                        <div>
                          {/* Top row: dot + Category • Client, Right: Status */}
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: catStyle.dot }}
                              />
                              <span
                                className="font-bold text-[10px] tracking-wider uppercase"
                                style={{ color: catStyle.text }}
                              >
                                {post.category}
                              </span>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-600 dark:text-stone-300 font-medium text-xs truncate max-w-[120px]">
                                {post.clientName}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${statStyle.badge}`}
                            >
                              {statStyle.text}
                            </span>
                          </div>

                          {/* Post Title */}
                          <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1 group-hover:text-[#C44D34] transition-colors line-clamp-1">
                            {post.title}
                          </h4>

                          {/* Caption Excerpt */}
                          <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1.5 leading-relaxed">
                            {post.caption}
                          </p>

                          {/* Attached Media Thumbnails */}
                          {((post.media && post.media.length > 0) || post.mediaUrl) && (
                            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto">
                              {post.media && post.media.length > 0 ? (
                                post.media.slice(0, 3).map((m, idx) => (
                                  <div
                                    key={m.id || idx}
                                    className="relative w-14 h-11 rounded-lg bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700"
                                  >
                                    {m.type === 'video' ? (
                                      <div className="w-full h-full relative">
                                        {m.thumbnailUrl ? (
                                          <img
                                            src={m.thumbnailUrl}
                                            alt={m.title}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-stone-800 flex items-center justify-center">
                                            <Film className="w-3.5 h-3.5 text-stone-400" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                          <Play className="w-3 h-3 fill-white text-white" />
                                        </div>
                                      </div>
                                    ) : (
                                      <img
                                        src={m.url || m.thumbnailUrl}
                                        alt={m.title}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                  </div>
                                ))
                              ) : post.mediaUrl ? (
                                <div className="relative w-14 h-11 rounded-lg bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                                  <img
                                    src={post.mediaUrl}
                                    alt={post.title}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : null}
                              {post.media && post.media.length > 3 && (
                                <span className="text-[10px] font-semibold text-stone-400">
                                  +{post.media.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Quick Add Media button if post has no media */}
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

                        {/* Footer: Campaign tag & Platform + Quick Download */}
                        <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                          <div>
                            {post.campaignId ? (
                              <span className="flex items-center gap-1 text-[10px] text-[#C44D34] font-semibold truncate max-w-[130px]">
                                <FolderKanban className="w-3 h-3" />
                                {campaigns.find((c) => c.id === post.campaignId)?.name || 'Campaign'}
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
                                  const targetUrl = post.media?.[0]?.url || post.media?.[0]?.thumbnailUrl || post.mediaUrl || '';
                                  downloadMediaFile(targetUrl, post.title);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-[#C44D34] transition-colors"
                                title="Download media asset to device"
                              >
                                <Download className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                            )}
                            <span className="font-medium">{post.platform}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CAMPAIGNS VIEW */}
      {activeTab === 'campaigns' && (
        <div className="space-y-3.5 mt-5">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl border-stone-300 dark:border-stone-800 my-4">
              <FolderKanban className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-stone-600 dark:text-stone-300">
                No campaigns found
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Group client posts into thematic marketing campaigns, brand launches, and seasonal pushes.
              </p>
              {onSaveCampaign && (
                <button
                  onClick={() => setIsCampaignModalOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Campaign</span>
                </button>
              )}
            </div>
          ) : (
            filteredCampaigns.map((camp) => {
              const client = clients.find((c) => c.id === camp.clientId);
              const campaignPosts = posts.filter(
                (p) => p.campaignId === camp.id || (camp.clientId && p.clientId === camp.clientId)
              );
              const publishedCount = campaignPosts.filter((p) => p.status === 'Published').length;
              const scheduledCount = campaignPosts.filter((p) => p.status === 'Scheduled').length;
              const inReviewCount = campaignPosts.filter((p) => p.status === 'In review').length;
              const progress =
                campaignPosts.length > 0
                  ? Math.round((publishedCount / campaignPosts.length) * 100)
                  : 0;
              const isExpanded = expandedCampaignId === camp.id;

              return (
                <div
                  key={camp.id}
                  className={`p-4 rounded-2xl border shadow-xs transition-all ${
                    isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                  }`}
                >
                  <div
                    onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        {client && (
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: client.color }}
                          />
                        )}
                        <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                          {client ? client.name : 'All Clients'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-stone-400">
                        <span className="text-[11px] font-semibold">
                          {publishedCount}/{campaignPosts.length} published
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-stone-900 dark:text-white mt-1">
                      {camp.name}
                    </h3>

                    {camp.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                        {camp.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
                        <span>Campaign Completion</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full bg-[#C44D34] rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Counts */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold">
                        {campaignPosts.length} total posts
                      </span>
                      {scheduledCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                          {scheduledCount} scheduled
                        </span>
                      )}
                      {inReviewCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                          {inReviewCount} in review
                        </span>
                      )}
                      {publishedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                          {publishedCount} live
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Posts inside this Campaign */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                        Campaign Posts ({campaignPosts.length})
                      </h4>

                      {campaignPosts.length === 0 ? (
                        <p className="text-xs text-stone-400 py-2 italic">
                          No posts attached to this campaign yet.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {campaignPosts.map((p) => {
                            const statStyle = STATUS_STYLES[p.status] || STATUS_STYLES.Planned;
                            return (
                              <div
                                key={p.id}
                                onClick={() => onEditPost(p)}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                                  isDark
                                    ? 'bg-[#161E27] border-[#2A3646] hover:bg-[#1E2734]'
                                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="font-bold text-stone-900 dark:text-white truncate">
                                    {p.title}
                                  </p>
                                  <p className="text-[10px] text-stone-400 truncate mt-0.5">
                                    {p.date} • {p.platform}
                                  </p>
                                </div>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${statStyle.badge}`}
                                >
                                  {statStyle.text}
                                </span>
                              </div>
                            );
                          })}
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

      {/* Client Picker Modal */}
      {isClientPickerOpen && (
        <div
          onClick={() => setIsClientPickerOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] flex flex-col justify-end animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md mx-auto rounded-t-3xl border-t p-5 animate-slide-up transition-colors shadow-2xl ${
              isDark ? 'bg-[#181F26] border-[#2E3A47] text-white' : 'bg-[#FAF7F2] border-[#E8E3DA]'
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

      {/* New Campaign Modal */}
      {isCampaignModalOpen && (
        <div
          onClick={() => setIsCampaignModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl transition-colors ${
              isDark ? 'bg-[#181F26] border-[#2E3A47] text-white' : 'bg-white border-[#E8E3DA]'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold">Create New Campaign</h3>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autumn Product Launch 2026"
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

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">
                  Description / Strategy
                </label>
                <textarea
                  rows={3}
                  placeholder="Target audience, objectives, hashtags, key messaging..."
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
                    isDark
                      ? 'bg-[#1E2734] border-[#2A3646] text-white'
                      : 'bg-white border-stone-200'
                  }`}
                />
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
                  className="px-4 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
