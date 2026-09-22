import React, { useState } from 'react';
import { ArrowLeft, Plus, FolderKanban, X } from 'lucide-react';
import { Campaign, Client, Post } from '../types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  clients: Client[];
  posts: Post[];
  onBack: () => void;
  onSaveCampaign: (campaign: Omit<Campaign, 'id'>) => void;
  onSelectPost: (post: Post) => void;
  isDark?: boolean;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  clients,
  posts,
  onBack,
  onSaveCampaign,
  onSelectPost,
  isDark,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [description, setDescription] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveCampaign({
      name: name.trim(),
      clientId: clientId || undefined,
      description: description.trim(),
    });
    setName('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div
      id="campaigns-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Campaigns</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
              {campaigns.length} ACTIVE
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3 mt-4">
        {campaigns.map((camp) => {
          const client = clients.find((c) => c.id === camp.clientId);
          const campaignPosts = posts.filter(
            (p) => p.campaignId === camp.id || (camp.clientId && p.clientId === camp.clientId)
          );
          const publishedCount = campaignPosts.filter((p) => p.status === 'Published').length;
          const progress = campaignPosts.length > 0 ? Math.round((publishedCount / campaignPosts.length) * 100) : 0;
          const isExpanded = selectedCampaignId === camp.id;

          return (
            <div
              key={camp.id}
              className={`p-4 rounded-2xl border shadow-xs transition-all ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              <div
                onClick={() => setSelectedCampaignId(isExpanded ? null : camp.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: client?.color || '#C44D34' }}
                    />
                    <span className="font-semibold text-stone-600 dark:text-stone-300">
                      {client?.name || 'Multi-Client'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-stone-400">
                    {campaignPosts.length} posts
                  </span>
                </div>

                <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-1">
                  {camp.name}
                </h3>
                {camp.description && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {camp.description}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-stone-400 mb-1">
                    <span>PROGRESS</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-[#C44D34] rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded posts in campaign */}
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Posts in this campaign:
                  </span>
                  {campaignPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between cursor-pointer text-xs"
                    >
                      <span className="font-semibold text-stone-800 dark:text-stone-200 truncate mr-2">
                        {post.title}
                      </span>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {post.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Campaign Modal */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl animate-scale-up ${
              isDark
                ? 'bg-[#1C232B] border-[#2E3A47] text-white'
                : 'bg-white border-[#E8E4DC] text-[#1E252B]'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold">New Campaign</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Winter Collection Launch"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Client
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                >
                  <option value="">No specific client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Goals, target audience, schedule notes..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed resize-none ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#181E24] hover:bg-black text-white text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
