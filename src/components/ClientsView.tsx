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
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Link as LinkIcon,
  X,
  GripVertical,
} from 'lucide-react';
import { Client, Post, SubscriptionState, PostStatus, Campaign, CampaignExternalLink } from '../types';
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
  onSelectClient: (
    client: Client,
    initialTab?: 'overview' | 'analytics' | 'approvals' | 'calendar' | 'upcoming' | 'campaigns',
    initialCampaignId?: string
  ) => void;
  onOpenNewClientModal: () => void;
  onEditClient: (client: Client, e: React.MouseEvent) => void;
  onDeleteClient: (clientId: string, e: React.MouseEvent) => void;
  onReorderClients?: (reorderedClients: Client[]) => void;
  onNewPostForClient?: (clientId: string) => void;
  onSaveCampaign?: (campaign: Omit<Campaign, 'id'> & { id?: string }) => void;
  onEditPost?: (post: Post) => void;
  onOpenPortalPreview?: (
    client: Client,
    initialTab?: 'overview' | 'upcoming' | 'analytics' | 'approvals' | 'calendar' | 'campaigns',
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
  onReorderClients,
  onNewPostForClient,
  onSaveCampaign,
  onEditPost,
  onOpenPortalPreview,
  isDark,
}) => {
  const [sharingClient, setSharingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionTab, setSectionTab] = useState<'clients' | 'campaigns'>('clients');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [dragOverClientId, setDragOverClientId] = useState<string | null>(null);

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

  const openNewCampaignModal = () => {
    setEditingCampaignId(null);
    setNewCampaignName('');
    setNewCampaignClientId(clients[0]?.id || '');
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

  const filteredClients = clients.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.handle.toLowerCase().includes(query) ||
      (c.notes && c.notes.toLowerCase().includes(query));
    return matchesSearch;
  });

  const filteredCampaigns = campaigns.filter((camp) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      camp.name.toLowerCase().includes(query) ||
      (camp.description && camp.description.toLowerCase().includes(query)) ||
      (camp.clientName && camp.clientName.toLowerCase().includes(query))
    );
  });

  const handleClientDrop = (targetClientId: string) => {
    const sourceId = draggedClientId;
    setDraggedClientId(null);
    setDragOverClientId(null);
    if (!sourceId || sourceId === targetClientId || !onReorderClients) return;

    const fromIndex = clients.findIndex((c) => c.id === sourceId);
    const toIndex = clients.findIndex((c) => c.id === targetClientId);
    if (fromIndex < 0 || toIndex < 0) return;

    const updated = [...clients];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onReorderClients(updated);
  };

  return (
    <div
      id="clients-view"
      className={`min-h-[780px] pb-24 px-4 sm:px-6 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header with Users icon & Actions (View toggle + New Campaign + New Client) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-[#C44D34] stroke-[2.2]" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clients & Campaigns</h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Manage client portals, approvals, monthly post progress, and marketing campaigns
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* View Mode Toggle: List vs Grid (Shown on Clients tab) */}
          {sectionTab === 'clients' && (
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
          )}

          {onSaveCampaign && (
            <button
              id="clients-new-campaign-btn"
              onClick={openNewCampaignModal}
              className={`px-3.5 py-2 border text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'border-stone-700 hover:border-[#C44D34] text-stone-200'
                  : 'border-stone-300 hover:border-[#C44D34] text-stone-800 bg-white shadow-2xs'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#C44D34]" />
              <span>New Campaign</span>
            </button>
          )}

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

      {/* Plan limit indicator, Clients | Campaigns Switcher & Search Bar */}
      <div className="mt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div
            className={`py-2 px-3.5 rounded-xl border flex items-center justify-between gap-3 text-[11px] ${
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

          {/* Combined Clients & Campaigns Switcher */}
          <div
            className={`p-1 rounded-xl border flex items-center gap-1 ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <button
              id="clients-subtab-clients"
              type="button"
              onClick={() => setSectionTab('clients')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                sectionTab === 'clients'
                  ? 'bg-[#C44D34] text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>All Clients ({clients.length})</span>
            </button>
            <button
              id="clients-subtab-campaigns"
              type="button"
              onClick={() => setSectionTab('campaigns')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                sectionTab === 'campaigns'
                  ? 'bg-[#C44D34] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#C44D34] shrink-0" />
              <span>Campaigns ({campaigns.length})</span>
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={
              sectionTab === 'campaigns' ? 'Search campaigns...' : 'Search clients...'
            }
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
      {sectionTab === 'clients' && filteredClients.length === 0 && (
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
      {sectionTab === 'clients' && viewMode === 'list' && filteredClients.length > 0 && (
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

            const socialLinksToDisplay =
              client.socialLinks && client.socialLinks.length > 0
                ? client.socialLinks
                : client.socialUrl
                ? [{ platform: 'Instagram' as const, url: client.socialUrl }]
                : [];

            const isBeingDragged = draggedClientId === client.id;
            const isDropTarget = dragOverClientId === client.id && draggedClientId !== client.id;

            return (
              <div
                key={client.id}
                id={`client-row-${client.id}`}
                draggable={Boolean(onReorderClients)}
                onDragStart={(e) => {
                  setDraggedClientId(client.id);
                  e.dataTransfer.setData('text/plain', client.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  if (!onReorderClients) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverClientId !== client.id) {
                    setDragOverClientId(client.id);
                  }
                }}
                onDragEnter={(e) => {
                  if (!onReorderClients) return;
                  e.preventDefault();
                  setDragOverClientId(client.id);
                }}
                onDragLeave={() => {
                  if (dragOverClientId === client.id) {
                    setDragOverClientId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClientDrop(client.id);
                }}
                onDragEnd={() => {
                  setDraggedClientId(null);
                  setDragOverClientId(null);
                }}
                onClick={() => onSelectClient(client, 'overview')}
                className={`p-4 sm:p-5 rounded-3xl border shadow-xs transition-all duration-150 cursor-pointer group ${
                  isBeingDragged ? 'opacity-50 scale-[0.99]' : ''
                } ${
                  isDropTarget
                    ? 'ring-2 ring-[#C44D34] border-[#C44D34]'
                    : isDark
                    ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B35] hover:border-[#C44D34]/60'
                    : 'bg-white border-[#E8E4DC] hover:border-[#C44D34]/60 hover:shadow-sm'
                }`}
              >
                {/* LINE 1: Drag Handle + Client Avatar + Client Name + Delete */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {onReorderClients && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 -ml-1 rounded-lg text-stone-400 hover:text-[#C44D34] cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                        title="Drag and drop to reorder client"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: client.color || '#C44D34' }}
                    >
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors truncate">
                        {client.name}
                      </h3>
                      {client.notes && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                          {client.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => onDeleteClient(client.id, e)}
                    className="p-1.5 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer shrink-0"
                    title="Delete client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* LINE 2: Clean Social Media Icons for 1-Click Redirect + Plus Button */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2.5 flex flex-wrap items-center gap-1.5"
                >
                  {socialLinksToDisplay.map((link, idx) => {
                    const displayLabel = link.label || link.handle;
                    return (
                      <a
                        key={`${link.platform}-${idx}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                          isDark
                            ? 'bg-[#161E27] border-[#2C3848] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                            : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                        }`}
                        title={
                          displayLabel
                            ? `Open ${link.platform} (${displayLabel})`
                            : `Open ${link.platform}`
                        }
                      >
                        <PlatformLogo platform={link.platform} size="md" showLabel={false} />
                      </a>
                    );
                  })}
                  <button
                    type="button"
                    onClick={(e) => onEditClient(client, e)}
                    className="w-8 h-8 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:text-[#C44D34] hover:border-[#C44D34] transition-colors cursor-pointer"
                    title="Add or manage social account links"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* LINE 3: Approvals + Share Client Portal + Edit Client + New Post */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 flex flex-wrap items-center gap-2"
                >
                  <button
                    onClick={() => onSelectClient(client, 'approvals')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      inReviewCount > 0
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white'
                        : isDark
                        ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                        : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                    }`}
                    title={`Review ${client.name} client approvals`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        inReviewCount > 0 ? 'text-amber-500' : 'text-emerald-600'
                      }`}
                    />
                    <span>
                      {inReviewCount > 0
                        ? `Approvals (${inReviewCount} in review)`
                        : `Approvals (${approvedCount} approved)`}
                    </span>
                  </button>

                  <button
                    onClick={() => setSharingClient(client)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                        : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                    }`}
                    title={`Share or open Client Portal for ${client.name}`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Share Client Portal</span>
                  </button>

                  <button
                    onClick={(e) => onEditClient(client, e)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                        : 'border-stone-200 bg-[#FAF8F5] text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                    }`}
                    title="Edit client"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Edit</span>
                  </button>

                  {onNewPostForClient && (
                    <button
                      onClick={() => onNewPostForClient(client.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#181E24] hover:bg-black text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs transition-colors cursor-pointer"
                      title={`Create post for ${client.name}`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>New Post</span>
                    </button>
                  )}
                </div>

                {/* LINE 4: Clean Full-Width 4-Stage Progress Bar Only (No Recent Post Preview) */}
                <div className="mt-3.5 pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2">
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
              </div>
            );
          })}
        </div>
      )}

      {/* GRID VIEW */}
      {sectionTab === 'clients' && viewMode === 'grid' && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredClients.map((client) => {
            const clientPosts = posts.filter((p) => p.clientId === client.id);
            const totalPosts = clientPosts.length;
            const plannedCount = clientPosts.filter(
              (p) => normalizePostStatus(p.status) === 'Planned'
            ).length;
            const approvedCount = clientPosts.filter(
              (p) => normalizePostStatus(p.status) === 'Approved'
            ).length;
            const inReviewCount = clientPosts.filter(
              (p) => normalizePostStatus(p.status) === 'In review'
            ).length;
            const scheduledCount = clientPosts.filter(
              (p) => normalizePostStatus(p.status) === 'Scheduled'
            ).length;

            const socialLinksToDisplay =
              client.socialLinks && client.socialLinks.length > 0
                ? client.socialLinks
                : client.socialUrl
                ? [{ platform: 'Instagram' as const, url: client.socialUrl }]
                : [];

            const isBeingDragged = draggedClientId === client.id;
            const isDropTarget = dragOverClientId === client.id && draggedClientId !== client.id;

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                draggable={Boolean(onReorderClients)}
                onDragStart={(e) => {
                  setDraggedClientId(client.id);
                  e.dataTransfer.setData('text/plain', client.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  if (!onReorderClients) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverClientId !== client.id) {
                    setDragOverClientId(client.id);
                  }
                }}
                onDragEnter={(e) => {
                  if (!onReorderClients) return;
                  e.preventDefault();
                  setDragOverClientId(client.id);
                }}
                onDragLeave={() => {
                  if (dragOverClientId === client.id) {
                    setDragOverClientId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClientDrop(client.id);
                }}
                onDragEnd={() => {
                  setDraggedClientId(null);
                  setDragOverClientId(null);
                }}
                onClick={() => onSelectClient(client, 'overview')}
                className={`p-5 rounded-3xl border shadow-xs hover:border-[#C44D34] transition-all cursor-pointer group flex flex-col justify-between ${
                  isBeingDragged ? 'opacity-50 scale-[0.98]' : ''
                } ${
                  isDropTarget
                    ? 'ring-2 ring-[#C44D34] border-[#C44D34]'
                    : isDark
                    ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                    : 'bg-white border-[#E8E4DC] hover:shadow-sm'
                }`}
              >
                <div>
                  {/* LINE 1: Drag Handle + Client Name */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {onReorderClients && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 -ml-1 rounded-lg text-stone-400 hover:text-[#C44D34] cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                          title="Drag and drop to reorder client"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}
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
                        <p className="text-[11px] text-stone-400 font-medium truncate">
                          {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => onDeleteClient(client.id, e)}
                      className="p-1.5 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 cursor-pointer shrink-0"
                      title="Delete client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* LINE 2: Clean Social Media Icons for 1-Click Redirect + Plus Button */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-wrap items-center gap-1.5 mt-3"
                  >
                    {socialLinksToDisplay.map((link, idx) => {
                      const displayLabel = link.label || link.handle;
                      return (
                        <a
                          key={`${link.platform}-${idx}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                            isDark
                              ? 'bg-[#161E27] border-[#2C3848] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                              : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                          }`}
                          title={
                            displayLabel
                              ? `Open ${link.platform} (${displayLabel})`
                              : `Open ${link.platform}`
                          }
                        >
                          <PlatformLogo platform={link.platform} size="md" showLabel={false} />
                        </a>
                      );
                    })}
                    <button
                      type="button"
                      onClick={(e) => onEditClient(client, e)}
                      className="w-8 h-8 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:text-[#C44D34] hover:border-[#C44D34] transition-colors cursor-pointer"
                      title="Add or manage social account links"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* LINE 3: Approvals + Share Client Portal + Edit + New Post */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 flex flex-wrap items-center gap-1.5"
                  >
                    <button
                      onClick={() => onSelectClient(client, 'approvals')}
                      className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        inReviewCount > 0
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white'
                          : isDark
                          ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Approvals ({inReviewCount})</span>
                    </button>

                    <button
                      onClick={() => setSharingClient(client)}
                      className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isDark
                          ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                      }`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                      <span>Share Portal</span>
                    </button>

                    <button
                      onClick={(e) => onEditClient(client, e)}
                      className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isDark
                          ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#C44D34]" />
                      <span>Edit</span>
                    </button>

                    {onNewPostForClient && (
                      <button
                        onClick={() => onNewPostForClient(client.id)}
                        className="py-1.5 px-2.5 rounded-xl bg-[#181E24] hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 shrink-0 shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Post</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LINE 4: 4-Stage Progress Bar */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden flex gap-0.5">
                    {totalPosts === 0 ? (
                      <div className="w-full h-full rounded-full bg-stone-200 dark:bg-stone-700" />
                    ) : (
                      <>
                        {scheduledCount > 0 && (
                          <div
                            className="h-full"
                            style={{
                              width: `${(scheduledCount / totalPosts) * 100}%`,
                              backgroundColor: STATUS_STYLES.Scheduled.hex,
                            }}
                          />
                        )}
                        {approvedCount > 0 && (
                          <div
                            className="h-full"
                            style={{
                              width: `${(approvedCount / totalPosts) * 100}%`,
                              backgroundColor: STATUS_STYLES.Approved.hex,
                            }}
                          />
                        )}
                        {inReviewCount > 0 && (
                          <div
                            className="h-full"
                            style={{
                              width: `${(inReviewCount / totalPosts) * 100}%`,
                              backgroundColor: STATUS_STYLES['In review'].hex,
                            }}
                          />
                        )}
                        {plannedCount > 0 && (
                          <div
                            className="h-full"
                            style={{
                              width: `${(plannedCount / totalPosts) * 100}%`,
                              backgroundColor: STATUS_STYLES.Planned.hex,
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-stone-400 tabular-nums">
                    <span>Planned: {plannedCount}</span>
                    <span>Review: {inReviewCount}</span>
                    <span>Approved: {approvedCount}</span>
                    <span>Scheduled: {scheduledCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          COMBINED CAMPAIGNS SECTION INSIDE CLIENTS
          ========================================================= */}
      {sectionTab === 'campaigns' && (
        <div className="space-y-4 mt-4">
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
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
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

              const isExpanded = expandedCampaignId === camp.id;
              const livePosts = campaignPosts
                .filter((p) => p.date < todayStr)
                .sort((a, b) => b.date.localeCompare(a.date));
              const upcomingPosts = campaignPosts
                .filter((p) => p.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date));

              return (
                <div
                  key={camp.id}
                  onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                  className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all cursor-pointer group ${
                    isExpanded
                      ? isDark
                        ? 'bg-[#1D242C] border-[#C44D34]'
                        : 'bg-white border-[#C44D34]'
                      : isDark
                      ? 'bg-[#1D242C] border-[#2A3440] hover:border-[#C44D34]'
                      : 'bg-white border-[#E8E4DC] hover:border-[#C44D34]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: client?.color || '#C44D34' }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (client) onSelectClient(client, 'campaigns', camp.id);
                        }}
                        className="font-bold text-stone-600 dark:text-stone-300 hover:text-[#C44D34] uppercase tracking-wider text-[10px] cursor-pointer hover:underline"
                        title="Open Client Page Campaigns tab"
                      >
                        {client ? client.name : camp.clientName || 'All Clients'}
                      </button>
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
                      {client && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClient(client, 'campaigns', camp.id);
                          }}
                          className="px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-[#C44D34] text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-[#C44D34] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <FolderKanban className="w-3 h-3 text-[#C44D34]" />
                          <span>Client Page</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCampaignId(isExpanded ? null : camp.id);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-[#C44D34] text-white'
                            : 'bg-[#C44D34]/10 text-[#C44D34] hover:bg-[#C44D34] hover:text-white'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide Analytics' : 'View Analytics'}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
                    <div>
                      <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                        {camp.name}
                      </h3>
                      {camp.description && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-2xl">
                          {camp.description}
                        </p>
                      )}
                    </div>

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

                  {/* 4 Stage Counters Row */}
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

                  {/* Collapsible Campaign Analytics Panel (Click to open or close) */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#C44D34]">
                          Campaign Analytics — {camp.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedCampaignId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Close Analytics</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
                        <div
                          className={`p-3 rounded-xl border ${
                            isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Total Posts
                          </div>
                          <div className="text-lg font-black mt-0.5">{totalCampPosts}</div>
                        </div>

                        <div
                          className={`p-3 rounded-xl border ${
                            isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Days Running
                          </div>
                          <div className="text-lg font-black text-[#C44D34] mt-0.5">
                            {durationInfo.daysSpan > 0 ? `${durationInfo.daysSpan} Days` : '—'}
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-xl border ${
                            isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
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
                          className={`p-3 rounded-xl border ${
                            isDark ? 'bg-[#161E27] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E2D8]'
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

                      {campaignPosts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {campaignPosts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => onEditPost && onEditPost(p)}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                                isDark
                                  ? 'bg-[#161E27] border-[#2A3646]'
                                  : 'bg-stone-50 border-stone-200'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold truncate">{p.title}</div>
                                <div className="text-[10px] text-stone-400 mt-0.5 tabular-nums">
                                  {p.date} · {p.platform}
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

      {/* Campaign Creation / Edit Modal */}
      {isCampaignModalOpen && (
        <div
          onClick={() => setIsCampaignModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#1D242C] border-[#2A3440] text-stone-100' : 'bg-white border-[#E8E4DC] text-stone-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold">
                {editingCampaignId ? 'Edit Campaign' : 'Create New Campaign'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g., Q4 Product Launch"
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-[#151C24] border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Client</label>
                <select
                  value={newCampaignClientId}
                  onChange={(e) => setNewCampaignClientId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-[#151C24] border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  placeholder="Campaign objective, audience, or creative notes..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-[#151C24] border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newCampaignStartDate}
                    onChange={(e) => setNewCampaignStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-[#151C24] border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newCampaignEndDate}
                    onChange={(e) => setNewCampaignEndDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-[#151C24] border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Meta Ad Library / Ads Manager Link (Optional)</label>
                <input
                  type="text"
                  value={newCampaignMetaAdLink}
                  onChange={(e) => setNewCampaignMetaAdLink(e.target.value)}
                  placeholder="https://www.facebook.com/ads/library/..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-[#151C24] border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C44D34] hover:bg-[#A93E27] text-white text-xs font-bold cursor-pointer"
                >
                  {editingCampaignId ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
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
