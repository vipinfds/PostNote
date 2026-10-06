import React, { useState } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  BarChart3,
  Share2,
  Calendar,
  List,
  LayoutGrid,
  Search,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';
import { Client, Post, SubscriptionState, PostStatus, Campaign } from '../types';
import { PLANS } from '../data/pricingData';
import { STATUS_STYLES, normalizePostStatus, getTodayDateStr, computeCampaignDuration } from '../utils/theme';
import { INITIAL_CAMPAIGNS } from '../data/initialData';
import { ClientShareModal } from './ClientShareModal';
import { StatusStageBadge } from './StatusStageBadge';
import { PlatformLogo } from './PlatformLogo';

interface ClientsViewProps {
  clients: Client[];
  posts: Post[];
  campaigns?: Campaign[];
  subscription?: SubscriptionState;
  onNavigateToBilling?: () => void;
  onSelectClient: (client: Client, initialTab?: 'overview' | 'analytics') => void;
  onOpenNewClientModal: () => void;
  onEditClient: (client: Client, e: React.MouseEvent) => void;
  onDeleteClient: (clientId: string, e: React.MouseEvent) => void;
  onNewPostForClient?: (clientId: string) => void;
  onOpenPortalPreview?: (
    client: Client,
    initialTab?: 'overview' | 'upcoming' | 'analytics' | 'approvals' | 'calendar',
    isViewOnly?: boolean
  ) => void;
  isDark?: boolean;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  posts,
  campaigns = INITIAL_CAMPAIGNS,
  subscription,
  onNavigateToBilling,
  onSelectClient,
  onOpenNewClientModal,
  onEditClient,
  onDeleteClient,
  onNewPostForClient,
  onOpenPortalPreview,
  isDark,
}) => {
  const [sharingClient, setSharingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('postnote_clients_view_mode');
      if (saved === 'grid' || saved === 'list') return saved;
    }
    return 'list';
  });

  const todayStr = getTodayDateStr();
  const currentMonthPrefix = todayStr.slice(0, 7); // e.g., "2026-10"
  const currentMonthLabel = React.useMemo(() => {
    try {
      const [y, m] = currentMonthPrefix.split('-');
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'This Month';
    }
  }, [currentMonthPrefix]);

  const handleSetViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('postnote_clients_view_mode', mode);
    }
  };

  const currentPlan = PLANS.find((p) => p.id === (subscription?.planId || 'agency')) || PLANS[2];
  const maxClients =
    currentPlan.limits.clients === 'Unlimited'
      ? 999
      : (currentPlan.limits.clients as number) + (subscription?.extraClients || 0);
  const isAtLimit = clients.length >= maxClients;

  const handleNewClick = () => {
    if (isAtLimit) {
      if (onNavigateToBilling) {
        onNavigateToBilling();
      }
      return;
    }
    onOpenNewClientModal();
  };

  const filteredClients = clients.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.handle.toLowerCase().includes(query) ||
      (c.notes && c.notes.toLowerCase().includes(query))
    );
  });

  return (
    <div
      id="clients-view"
      className={`min-h-[780px] pb-24 px-4 sm:px-6 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header with Users icon & Actions (View toggle + New button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-[#C44D34] stroke-[2.2]" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clients</h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Manage client workspaces, monthly post progress, active campaigns, and shareable portals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Toggle: List vs Grid */}
          <div
            className={`p-1 rounded-xl border flex items-center gap-1 ${
              isDark ? 'bg-[#18202A] border-[#2A3646]' : 'bg-stone-100 border-stone-200'
            }`}
          >
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#253242] text-stone-900 dark:text-white shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#253242] text-stone-900 dark:text-white shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">Grid</span>
            </button>
          </div>

          <button
            id="new-client-btn"
            onClick={handleNewClick}
            className="px-3.5 py-2 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Client</span>
          </button>
        </div>
      </div>

      {/* Plan limit indicator & Search Bar */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div
          className={`py-2 px-3.5 rounded-xl border flex items-center justify-between text-[11px] flex-1 ${
            isAtLimit
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : isDark
              ? 'bg-[#1D242C] border-[#2A3440] text-stone-300'
              : 'bg-white border-[#E8E4DC] text-stone-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {clients.length} of {currentPlan.limits.clients} clients
            </span>
            <span className="opacity-60">•</span>
            <span className="font-medium">{currentPlan.name} Plan</span>
          </div>

          {onNavigateToBilling && (
            <button
              onClick={onNavigateToBilling}
              className="font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isAtLimit ? 'Upgrade for more' : 'Tiers & Pro'}</span>
            </button>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-100 placeholder-stone-500'
                : 'bg-white border-[#E8E4DC] text-stone-900 placeholder-stone-400'
            }`}
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-2xl border-stone-300 dark:border-stone-700 my-6">
          <Users className="w-10 h-10 text-stone-400 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No clients found</p>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No clients matched "${searchQuery}". Clear your search query.`
              : 'Add your first client to start organizing client posts and sharing custom portals.'}
          </p>
        </div>
      )}

      {/* CLEAN STACKED LIST VIEW */}
      {viewMode === 'list' && filteredClients.length > 0 && (
        <div className="mt-4 space-y-3">
          {filteredClients.map((client) => {
            const clientPosts = posts
              .filter((p) => p.clientId === client.id)
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date));
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

            // Current month posts breakdown (or latest active month if no posts in current month)
            const currentMonthPosts = clientPosts.filter((p) =>
              p.date.startsWith(currentMonthPrefix)
            );
            const activeMonthPosts =
              currentMonthPosts.length > 0 ? currentMonthPosts : clientPosts;
            const activeMonthTitle =
              currentMonthPosts.length > 0
                ? currentMonthLabel
                : clientPosts[0]?.date
                ? (() => {
                    const [y, m] = clientPosts[0].date.slice(0, 7).split('-');
                    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
                      'en-US',
                      { month: 'short', year: 'numeric' }
                    );
                  })()
                : currentMonthLabel;

            const monthDoneCount = activeMonthPosts.filter(
              (p) =>
                normalizePostStatus(p.status) === 'Approved' ||
                normalizePostStatus(p.status) === 'Scheduled'
            ).length;
            const monthTotalCount = activeMonthPosts.length;
            const monthDonePct =
              monthTotalCount > 0
                ? Math.round((monthDoneCount / monthTotalCount) * 100)
                : 0;

            // Next upcoming or latest post preview
            const upcomingSorted = clientPosts
              .filter((p) => p.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date));
            const featuredPost = upcomingSorted[0] || clientPosts[0] || null;

            // Active campaigns for this client
            const clientCampaigns = campaigns.filter(
              (c) =>
                c.clientId === client.id ||
                (c.clientName &&
                  c.clientName.toLowerCase() === client.name.toLowerCase())
            );
            const activeCampaign = clientCampaigns[0] || null;
            const activeCampaignPosts = activeCampaign
              ? clientPosts.filter(
                  (p) =>
                    (p.campaign || '').toLowerCase() ===
                      activeCampaign.name.toLowerCase() ||
                    p.campaignId === activeCampaign.id
                )
              : [];
            const activeCampaignDuration = activeCampaign
              ? computeCampaignDuration(
                  activeCampaignPosts,
                  activeCampaign.startDate,
                  activeCampaign.endDate
                )
              : null;

            return (
              <div
                key={client.id}
                id={`client-row-${client.id}`}
                onClick={() => onSelectClient(client, 'overview')}
                className={`p-4 sm:p-5 rounded-3xl border shadow-xs transition-all duration-150 cursor-pointer group ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B35] hover:border-[#C44D34]/60'
                    : 'bg-white border-[#E8E4DC] hover:border-[#C44D34]/60 hover:shadow-sm'
                }`}
              >
                {/* ROW 1: Client Identity + Campaign Badge + Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: client.color || '#C44D34' }}
                    >
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                          {client.name}
                        </h3>
                        <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                          {client.handle}
                        </span>
                        {activeCampaign && activeCampaignDuration && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] bg-[#C44D34]/10 text-[#C44D34] font-bold">
                            <FolderKanban className="w-3 h-3 shrink-0" />
                            <span>
                              {activeCampaign.name} · {activeCampaignDuration.label}
                            </span>
                          </span>
                        )}
                      </div>

                      {client.notes && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                          {client.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions on Right */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-wrap items-center gap-1.5 shrink-0"
                  >
                    {onOpenPortalPreview && (
                      <button
                        onClick={() => onOpenPortalPreview(client, 'overview', false)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isDark
                            ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                            : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                        }`}
                        title={`Open ${client.name} Client Portal`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#C44D34]" />
                        <span>Client Portal</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSharingClient(client)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDark
                          ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                          : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                      }`}
                      title={`Share all-in-one portal link for ${client.name}`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                      <span>Share Portal</span>
                    </button>

                    {onNewPostForClient && (
                      <button
                        onClick={() => onNewPostForClient(client.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#181E24] hover:bg-black text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs transition-colors cursor-pointer"
                        title={`Create post for ${client.name}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>New Post</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => onEditClient(client, e)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="Edit client"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => onDeleteClient(client.id, e)}
                      className="p-1.5 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="Delete client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ROW 2: Monthly Progress + 4-Stage Pipeline Bar + Latest Post Description */}
                <div className="mt-3.5 pt-3.5 border-t border-stone-100 dark:border-stone-800/80 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Left 7 Cols: Progress Bar & 4 Stage Counts */}
                  <div className="lg:col-span-7 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-200">
                        <Calendar className="w-3.5 h-3.5 text-[#C44D34]" />
                        <span>
                          {activeMonthTitle}: {monthDoneCount} of {monthTotalCount} posts done ({monthDonePct}%)
                        </span>
                      </span>

                      <div className="flex items-center gap-3 text-[11px] font-semibold tabular-nums">
                        {(
                          [
                            { status: 'Planned' as PostStatus, count: plannedCount },
                            { status: 'In review' as PostStatus, count: inReviewCount },
                            { status: 'Approved' as PostStatus, count: approvedCount },
                            { status: 'Scheduled' as PostStatus, count: scheduledCount },
                          ] as const
                        ).map((st) => (
                          <span key={st.status} className="inline-flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: STATUS_STYLES[st.status].hex }}
                            />
                            <span className="text-stone-500 dark:text-stone-400">{st.status}:</span>
                            <strong
                              className="font-extrabold"
                              style={{ color: STATUS_STYLES[st.status].hex }}
                            >
                              {st.count}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Multi-Stage Segmented Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden flex gap-0.5">
                      {totalPosts === 0 ? (
                        <div className="w-full h-full rounded-full bg-stone-200 dark:bg-stone-700" />
                      ) : (
                        <>
                          {scheduledCount > 0 && (
                            <div
                              title={`Scheduled: ${scheduledCount}`}
                              className="h-full transition-all"
                              style={{
                                width: `${(scheduledCount / totalPosts) * 100}%`,
                                backgroundColor: STATUS_STYLES.Scheduled.hex,
                              }}
                            />
                          )}
                          {approvedCount > 0 && (
                            <div
                              title={`Approved: ${approvedCount}`}
                              className="h-full transition-all"
                              style={{
                                width: `${(approvedCount / totalPosts) * 100}%`,
                                backgroundColor: STATUS_STYLES.Approved.hex,
                              }}
                            />
                          )}
                          {inReviewCount > 0 && (
                            <div
                              title={`In review: ${inReviewCount}`}
                              className="h-full transition-all"
                              style={{
                                width: `${(inReviewCount / totalPosts) * 100}%`,
                                backgroundColor: STATUS_STYLES['In review'].hex,
                              }}
                            />
                          )}
                          {plannedCount > 0 && (
                            <div
                              title={`Planned: ${plannedCount}`}
                              className="h-full transition-all"
                              style={{
                                width: `${(plannedCount / totalPosts) * 100}%`,
                                backgroundColor: STATUS_STYLES.Planned.hex,
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right 5 Cols: Latest / Upcoming Post Description */}
                  <div className="lg:col-span-5">
                    {featuredPost ? (
                      <div
                        className={`px-3 py-2 rounded-2xl border text-xs ${
                          isDark
                            ? 'bg-[#151B22] border-[#25303D]'
                            : 'bg-[#FAF8F5] border-[#EAE5DC]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <PlatformLogo platform={featuredPost.platform} size="xs" />
                            <span className="font-bold text-stone-900 dark:text-white truncate">
                              {featuredPost.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusStageBadge status={featuredPost.status} size="xs" />
                            <span className="text-[10px] font-bold text-[#C44D34] tabular-nums">
                              {featuredPost.date}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-1">
                          {featuredPost.caption}
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`px-3 py-2 rounded-2xl border text-[11px] text-stone-400 italic ${
                          isDark
                            ? 'bg-[#151B22] border-[#25303D]'
                            : 'bg-[#FAF8F5] border-[#EAE5DC]'
                        }`}
                      >
                        No posts created yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredClients.map((client) => {
            const clientPosts = posts.filter((p) => p.clientId === client.id);
            const clientPostsCount = clientPosts.length;
            const approvedCount = clientPosts.filter(
              (p) => normalizePostStatus(p.status) === 'Approved'
            ).length;
            const inReviewCount = clientPosts.filter(
              (p) => normalizePostStatus(p.status) === 'In review'
            ).length;
            const scheduledCount = clientPosts.filter(
              (p) => normalizePostStatus(p.status) === 'Scheduled'
            ).length;

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                className={`p-5 rounded-3xl border shadow-xs hover:border-[#C44D34] transition-all group flex flex-col justify-between ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                    : 'bg-white border-[#E8E4DC] hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div
                      onClick={() => onSelectClient(client, 'overview')}
                      className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                        style={{ backgroundColor: client.color || '#C44D34' }}
                      >
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-stone-900 dark:text-white truncate group-hover:text-[#C44D34] transition-colors">
                          {client.name}
                        </h3>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium truncate">
                          {client.handle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={(e) => onEditClient(client, e)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 cursor-pointer"
                        title="Edit client profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => onDeleteClient(client.id, e)}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 cursor-pointer"
                        title="Delete client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {client.notes && (
                    <p
                      onClick={() => onSelectClient(client, 'overview')}
                      className="text-xs text-stone-600 dark:text-stone-400 mt-2 line-clamp-2 cursor-pointer leading-relaxed"
                    >
                      {client.notes}
                    </p>
                  )}

                  <div
                    onClick={() => onSelectClient(client, 'overview')}
                    className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-stone-100 dark:border-stone-800/80 text-center cursor-pointer tabular-nums"
                  >
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                      <div className="text-xs font-bold text-stone-900 dark:text-white">
                        {clientPostsCount}
                      </div>
                      <div className="text-[9px] uppercase font-semibold text-stone-400 tracking-wider">
                        Total
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                      <div className="text-xs font-bold text-emerald-600">
                        {approvedCount + scheduledCount}
                      </div>
                      <div className="text-[9px] uppercase font-semibold text-stone-400 tracking-wider">
                        Done
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                      <div className="text-xs font-bold text-amber-500">
                        {inReviewCount}
                      </div>
                      <div className="text-[9px] uppercase font-semibold text-stone-400 tracking-wider">
                        In Review
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectClient(client, 'analytics')}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isDark
                        ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Analytics</span>
                  </button>

                  <button
                    onClick={() => setSharingClient(client)}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isDark
                        ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Share</span>
                  </button>

                  {onNewPostForClient && (
                    <button
                      onClick={() => onNewPostForClient(client.id)}
                      className="p-1.5 rounded-xl bg-[#181E24] hover:bg-black text-white shrink-0 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {sharingClient && (
        <ClientShareModal
          onClose={() => setSharingClient(null)}
          client={sharingClient}
          posts={posts}
          onOpenLivePortal={(initialTab, isViewOnly) => {
            if (onOpenPortalPreview) {
              onOpenPortalPreview(sharingClient, initialTab, isViewOnly);
            }
            setSharingClient(null);
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
};
