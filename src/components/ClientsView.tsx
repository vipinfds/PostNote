import React from 'react';
import { Users, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { Client, Post, SubscriptionState } from '../types';
import { PLANS } from '../data/pricingData';

interface ClientsViewProps {
  clients: Client[];
  posts: Post[];
  subscription?: SubscriptionState;
  onNavigateToBilling?: () => void;
  onSelectClient: (client: Client) => void;
  onOpenNewClientModal: () => void;
  onEditClient: (client: Client, e: React.MouseEvent) => void;
  onDeleteClient: (clientId: string, e: React.MouseEvent) => void;
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
  isDark,
}) => {
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
      className={`min-h-[780px] pb-24 px-4 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header with Users icon & + New button */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-[#C44D34] stroke-[2.2]" />
          <h2 className="text-xl font-bold tracking-tight">Clients</h2>
        </div>

        <button
          id="new-client-btn"
          onClick={handleNewClick}
          className="px-3.5 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* Plan limit indicator */}
      <div
        className={`mt-3 py-2 px-3 rounded-xl border flex items-center justify-between text-[11px] ${
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

      {/* Client Cards List */}
      <div className="space-y-3.5 mt-4">
        {clients.map((client) => {
          const clientPostsCount = posts.filter((p) => p.clientId === client.id).length;

          return (
            <div
              key={client.id}
              id={`client-card-${client.id}`}
              onClick={() => onSelectClient(client)}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all group ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                  : 'bg-white border-[#E8E4DC] hover:shadow-sm'
              }`}
            >
              {/* Header: Dot + Name, Posts Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: client.color || '#22C55E' }}
                  />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                    {client.name}
                  </h3>
                </div>

                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                  {clientPostsCount} posts
                </span>
              </div>

              {/* Subtitle / Handle */}
              <p className="text-xs text-stone-400 font-medium mt-0.5 ml-4.5">
                {client.handle}
              </p>

              {/* Description */}
              {client.notes && (
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 ml-4.5 line-clamp-2 leading-relaxed">
                  {client.notes}
                </p>
              )}

              {/* Bottom Actions: Edit, Delete */}
              <div className="flex items-center justify-end gap-3 mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/60">
                <button
                  onClick={(e) => onEditClient(client, e)}
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => onDeleteClient(client.id, e)}
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
