import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  X,
  Calendar,
  ExternalLink,
  Link as LinkIcon,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { Campaign, Client, Post, PostStatus } from '../types';
import {
  STATUS_STYLES,
  computeCampaignDuration,
  normalizePostStatus,
} from '../utils/theme';
import { StatusStageBadge } from './StatusStageBadge';

interface CampaignsViewProps {
  campaigns: Campaign[];
  clients: Client[];
  posts: Post[];
  onBack: () => void;
  onSaveCampaign: (campaign: Omit<Campaign, 'id'> & { id?: string }) => void;
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
  const [metaAdLink, setMetaAdLink] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const targetClient = clients.find((c) => c.id === clientId);
    const formattedMetaUrl = metaAdLink.trim()
      ? metaAdLink.trim().startsWith('http')
        ? metaAdLink.trim()
        : `https://${metaAdLink.trim()}`
      : undefined;

    onSaveCampaign({
      name: name.trim(),
      clientId: clientId || undefined,
      clientName: targetClient?.name,
      description: description.trim(),
      metaAdLink: formattedMetaUrl,
    });
    setName('');
    setDescription('');
    setMetaAdLink('');
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
            <h2 className="text-base font-bold tracking-tight">Campaigns & Analytics</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
              {campaigns.length} ACTIVE
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3 mt-4">
        {campaigns.map((camp) => {
          const client =
            clients.find((c) => c.id === camp.clientId) ||
            clients.find(
              (c) => c.name.toLowerCase() === (camp.clientName || '').toLowerCase()
            );
          const campaignPosts = posts.filter(
            (p) =>
              p.campaignId === camp.id ||
              (p.campaign && p.campaign.toLowerCase() === camp.name.toLowerCase()) ||
              (!p.campaign && !p.campaignId && camp.clientId && p.clientId === camp.clientId)
          );
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
            campaignPosts.length > 0
              ? Math.round((readyCount / campaignPosts.length) * 100)
              : 0;
          const durationInfo = computeCampaignDuration(
            campaignPosts,
            camp.startDate,
            camp.endDate
          );
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: client?.color || '#C44D34' }}
                    />
                    <span className="font-semibold text-stone-600 dark:text-stone-300">
                      {client?.name || camp.clientName || 'Multi-Client'}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 tabular-nums">
                      <Calendar className="w-3 h-3 text-[#C44D34]" />
                      <span>{durationInfo.label}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#C44D34] flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>{campaignPosts.length} posts</span>
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-stone-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-2 mt-1">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      {camp.name}
                    </h3>
                    {camp.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {camp.description}
                      </p>
                    )}
                  </div>

                  {/* Clickable Meta Ad Link & External Links */}
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {camp.metaAdLink && (
                      <a
                        href={camp.metaAdLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:text-blue-400 border border-[#1877F2]/30 text-xs font-bold inline-flex items-center gap-1 transition-colors"
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
                        className="px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold inline-flex items-center gap-1 hover:border-[#C44D34]"
                      >
                        <LinkIcon className="w-3 h-3 text-[#C44D34]" />
                        <span>{lnk.label}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-stone-400 mb-1 tabular-nums">
                    <span>READY ({readyCount}/{campaignPosts.length})</span>
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

              {/* Expanded Analytics & Posts in Campaign */}
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {(
                      [
                        { stage: 'Planned' as PostStatus, count: plannedCount },
                        { stage: 'In review' as PostStatus, count: inReviewCount },
                        { stage: 'Approved' as PostStatus, count: approvedCount },
                        { stage: 'Scheduled' as PostStatus, count: scheduledCount },
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.stage}
                        className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60"
                      >
                        <StatusStageBadge status={item.stage} size="xs" />
                        <div className="text-sm font-extrabold text-stone-900 dark:text-white mt-1 tabular-nums">
                          {item.count}
                        </div>
                      </div>
                    ))}
                  </div>

                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Posts in this campaign ({campaignPosts.length}):
                  </span>
                  {campaignPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between cursor-pointer text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-stone-800 dark:text-stone-200 truncate block">
                          {post.title}
                        </span>
                        <span className="text-[10px] text-stone-400 tabular-nums">
                          {post.date} · {post.platform}
                        </span>
                      </div>
                      <StatusStageBadge status={post.status} size="xs" />
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
                  <option
                    value=""
                    className="bg-white dark:bg-[#252E38] text-stone-800 dark:text-stone-200"
                  >
                    No specific client
                  </option>
                  {clients.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="bg-white dark:bg-[#252E38] text-stone-800 dark:text-stone-200"
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Meta Ad Link (Optional)
                </label>
                <input
                  type="text"
                  value={metaAdLink}
                  onChange={(e) => setMetaAdLink(e.target.value)}
                  placeholder="https://www.facebook.com/ads/library/..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />
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
                    isDark
                      ? 'text-stone-400 hover:text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-bold uppercase tracking-wider shadow-sm"
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
