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
  Layers,
  ChevronRight,
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
  onOpenPortalPreview?: (client: Client, initialTab?: 'approvals' | 'calendar' | 'analytics', isViewOnly?: boolean) => void;
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

  return (
    <div
      id="clients-view"
      className={`min-h-[780px] pb-24 px-4 sm:px-6 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header with Users icon & + New button */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-[#C44D34] stroke-[2.2]" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clients</h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Manage client workspaces, company analytics, and shareable portals
            </p>
          </div>
        </div>

        <button
          id="new-client-btn"
          onClick={handleNewClick}
          className="px-3.5 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Client</span>
        </button>
      </div>

      {/* Plan limit indicator */}
      <div
        className={`mt-3 py-2 px-3.5 rounded-xl border flex items-center justify-between text-[11px] ${
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

      {/* Client Cards Grid: 1 col on Mobile, 2 cols on Tablet, 3 cols on PC/Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {clients.map((client) => {
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

      {/* Share Modal when triggered directly from any client card */}
      {sharingClient && (
        <ClientShareModal
          isOpen={true}
          onClose={() => setSharingClient(null)}
          client={sharingClient}
          onOpenPortalPreview={() => {
            if (onOpenPortalPreview) {
              onOpenPortalPreview(sharingClient, 'analytics', true);
            }
            setSharingClient(null);
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
};
