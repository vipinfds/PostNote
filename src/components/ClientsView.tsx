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
  ChevronRight,
  List,
  LayoutGrid,
  Search,
} from 'lucide-react';
import { Client, Post, SubscriptionState } from '../types';
import { PLANS } from '../data/pricingData';
import { ClientShareModal } from './ClientShareModal';

interface ClientsViewProps {
  clients: Client[];
  posts: Post[];
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
    // Default to list view as requested
    return 'list';
  });

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
              Manage client workspaces, company analytics, and shareable portals
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
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
            className="px-3.5 py-2 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
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
              className="font-bold text-[#C44D34] hover:underline flex items-center gap-1"
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

      {/* LIST VIEW */}
      {viewMode === 'list' && filteredClients.length > 0 && (
        <div className="mt-4 space-y-2">
          {/* Desktop Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-200 dark:border-stone-800">
            <div className="col-span-4">Client</div>
            <div className="col-span-3">Bio / Notes</div>
            <div className="col-span-2 text-center">Posts & Status</div>
            <div className="col-span-3 text-right">Quick Actions</div>
          </div>

          {/* List Rows */}
          {filteredClients.map((client) => {
            const clientPosts = posts.filter((p) => p.clientId === client.id);
            const clientPostsCount = clientPosts.length;
            const liveCount = clientPosts.filter((p) => p.status === 'Published').length;
            const inReviewCount = clientPosts.filter((p) => p.status === 'In review').length;
            const scheduledCount = clientPosts.filter((p) => p.status === 'Scheduled').length;

            return (
              <div
                key={client.id}
                id={`client-row-${client.id}`}
                className={`p-3.5 sm:px-4 rounded-2xl border shadow-xs transition-all duration-150 flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center justify-between group ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#232C36] hover:border-stone-600'
                    : 'bg-white border-[#E8E4DC] hover:bg-stone-50/80 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                {/* 1. Client Identity */}
                <div
                  onClick={() => onSelectClient(client, 'overview')}
                  className="col-span-4 flex items-center gap-3 cursor-pointer min-w-0 w-full"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10"
                    style={{ backgroundColor: client.color || '#C44D34' }}
                  >
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white truncate group-hover:text-[#C44D34] transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium truncate">
                      {client.handle}
                    </p>
                  </div>
                </div>

                {/* 2. Bio / Notes */}
                <div
                  onClick={() => onSelectClient(client, 'overview')}
                  className="col-span-3 min-w-0 cursor-pointer text-xs text-stone-600 dark:text-stone-400 truncate w-full"
                >
                  {client.notes ? (
                    <span className="truncate block">{client.notes}</span>
                  ) : (
                    <span className="text-stone-400 italic text-[11px]">No notes provided</span>
                  )}
                </div>

                {/* 3. Status & Post Counters */}
                <div
                  onClick={() => onSelectClient(client, 'overview')}
                  className="col-span-2 flex items-center justify-start md:justify-center gap-1.5 cursor-pointer w-full md:w-auto flex-wrap"
                >
                  <span
                    title="Total posts"
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  >
                    {clientPostsCount} <span className="text-[9px] font-medium opacity-70">posts</span>
                  </span>

                  {liveCount > 0 && (
                    <span
                      title="Published live posts"
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    >
                      {liveCount} live
                    </span>
                  )}

                  {inReviewCount > 0 && (
                    <span
                      title="In review"
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    >
                      {inReviewCount} rev
                    </span>
                  )}

                  {scheduledCount > 0 && (
                    <span
                      title="Scheduled"
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    >
                      {scheduledCount} sch
                    </span>
                  )}
                </div>

                {/* 4. Action Buttons */}
                <div className="col-span-3 flex items-center justify-between md:justify-end gap-1.5 w-full md:w-auto pt-2.5 md:pt-0 border-t md:border-t-0 border-stone-100 dark:border-stone-800/80">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Direct Analytics */}
                    <button
                      onClick={() => onSelectClient(client, 'analytics')}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDark
                          ? 'border-[#2C3848] bg-[#161E27] text-stone-300 hover:border-[#C44D34] hover:text-[#C44D34]'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                      }`}
                      title={`View ${client.name} Analytics`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#C44D34]" />
                      <span>Analytics</span>
                    </button>

                    {/* Direct Share Portal */}
                    <button
                      onClick={() => setSharingClient(client)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDark
                          ? 'border-[#2C3848] bg-[#161E27] text-stone-300 hover:border-[#C44D34] hover:text-[#C44D34]'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                      }`}
                      title={`Share client profile / portal with ${client.name}`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                      <span>Share</span>
                    </button>

                    {/* + New Post */}
                    {onNewPostForClient && (
                      <button
                        onClick={() => onNewPostForClient(client.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#181E24] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 shrink-0 shadow-xs transition-colors cursor-pointer"
                        title={`Create post for ${client.name}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="md:hidden">Post</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Edit */}
                    <button
                      onClick={(e) => onEditClient(client, e)}
                      className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 cursor-pointer"
                      title="Edit client profile"
                      aria-label={`Edit ${client.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => onDeleteClient(client.id, e)}
                      className="p-2 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 cursor-pointer"
                      title="Delete client"
                      aria-label={`Delete ${client.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight
                      onClick={() => onSelectClient(client, 'overview')}
                      className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 cursor-pointer hidden md:block group-hover:translate-x-0.5 transition-transform"
                    />
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
            const liveCount = clientPosts.filter((p) => p.status === 'Published').length;
            const inReviewCount = clientPosts.filter((p) => p.status === 'In review').length;
            const scheduledCount = clientPosts.filter((p) => p.status === 'Scheduled').length;

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                className={`p-4 rounded-2xl border shadow-xs hover:border-[#C44D34] transition-all group flex flex-col justify-between ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                    : 'bg-white border-[#E8E4DC] hover:shadow-sm'
                }`}
              >
                <div>
                  {/* Header: Color dot + Name + Handle + Action icons (Edit, Delete) */}
                  <div className="flex items-start justify-between">
                    <div
                      onClick={() => onSelectClient(client, 'overview')}
                      className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-xs ring-2 ring-white/20"
                        style={{ backgroundColor: client.color || '#C44D34' }}
                      />
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
                        className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50"
                        title="Edit client profile"
                        aria-label={`Edit ${client.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => onDeleteClient(client.id, e)}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50"
                        title="Delete client"
                        aria-label={`Delete ${client.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Notes/Bio snippet */}
                  {client.notes && (
                    <p
                      onClick={() => onSelectClient(client, 'overview')}
                      className="text-xs text-stone-600 dark:text-stone-400 mt-2 line-clamp-2 cursor-pointer leading-relaxed"
                    >
                      {client.notes}
                    </p>
                  )}

                  {/* Quick Stats Pill Row */}
                  <div
                    onClick={() => onSelectClient(client, 'overview')}
                    className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-stone-100 dark:border-stone-800/80 text-center cursor-pointer"
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
                        {liveCount}
                      </div>
                      <div className="text-[9px] uppercase font-semibold text-stone-400 tracking-wider">
                        Live
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                      <div className="text-xs font-bold text-amber-500">
                        {inReviewCount > 0 ? `${inReviewCount} rev` : `${scheduledCount} sch`}
                      </div>
                      <div className="text-[9px] uppercase font-semibold text-stone-400 tracking-wider">
                        Queue
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Direct Analytics, Share Portal, New Post */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1.5">
                  {/* 1. Direct Analytics Button */}
                  <button
                    onClick={() => onSelectClient(client, 'analytics')}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                      isDark
                        ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                    }`}
                    title={`View ${client.name} Analytics directly`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Analytics</span>
                  </button>

                  {/* 2. Direct Share Portal Button */}
                  <button
                    onClick={() => setSharingClient(client)}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                      isDark
                        ? 'border-[#2C3848] bg-[#161E27] text-stone-200 hover:border-[#C44D34] hover:text-[#C44D34]'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C44D34] hover:text-[#C44D34]'
                    }`}
                    title={`Share client profile / portal with ${client.name}`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                    <span>Share</span>
                  </button>

                  {/* 3. New Post shortcut */}
                  {onNewPostForClient && (
                    <button
                      onClick={() => onNewPostForClient(client.id)}
                      className="p-1.5 rounded-xl bg-[#181E24] hover:bg-black text-white shrink-0 shadow-xs transition-colors"
                      title={`Create post for ${client.name}`}
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

      {/* Share Modal when triggered directly from any client card / row */}
      {sharingClient && (
        <ClientShareModal
          isOpen={true}
          onClose={() => setSharingClient(null)}
          client={sharingClient}
          posts={posts}
          onOpenPortalPreview={() => {
            if (onOpenPortalPreview) {
              onOpenPortalPreview(sharingClient, 'overview', true);
            }
            setSharingClient(null);
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
};
