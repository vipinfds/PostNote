import React, { useState } from 'react';
import { Plus, ChevronDown, Check, Film, Image as ImageIcon, Play } from 'lucide-react';
import { Post, Client } from '../types';
import { CATEGORY_COLORS, STATUS_STYLES, formatSectionDate } from '../utils/theme';

interface ContentOverviewViewProps {
  posts: Post[];
  clients: Client[];
  onOpenNewPost: () => void;
  onEditPost: (post: Post) => void;
  isDark?: boolean;
}

export const ContentOverviewView: React.FC<ContentOverviewViewProps> = ({
  posts,
  clients,
  onOpenNewPost,
  onEditPost,
  isDark,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'upcoming' | 'all'>('upcoming');
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);

  // Today reference date: 2026-09-20 (from the video recording)
  const todayStr = '2026-09-20';

  // Filter posts
  let filteredPosts = posts.filter((p) => {
    if (selectedClientId !== 'all' && p.clientId !== selectedClientId) {
      return false;
    }
    if (filterMode === 'upcoming') {
      // Upcoming includes today or future, and non-published past items
      return p.date >= todayStr;
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

  return (
    <div
      id="content-overview-view"
      className={`min-h-[780px] pb-24 px-4 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-3">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
            POST NOTE
          </span>
          <h2 className="text-xl font-bold tracking-tight">Content overview</h2>
        </div>

        <button
          onClick={onOpenNewPost}
          className="px-3.5 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* Filter Row: Client dropdown + Upcoming/All posts toggle */}
      <div className="flex items-center justify-between gap-2 mt-2 pb-4 border-b border-stone-200 dark:border-stone-800">
        {/* Client dropdown selector */}
        <button
          onClick={() => setIsClientPickerOpen(true)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            isDark
              ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 hover:bg-[#252E38]'
              : 'bg-white border-[#E8E4DC] text-stone-700 hover:bg-stone-50 shadow-xs'
          }`}
        >
          <span>{selectedClient ? selectedClient.name : 'All clients'}</span>
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-stone-400" />
        </button>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('upcoming')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterMode === 'upcoming'
                ? 'bg-[#181E24] text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterMode === 'all'
                ? 'bg-[#181E24] text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            All posts
          </button>
        </div>
      </div>

      {/* Date Grouped Posts Feed */}
      <div className="space-y-6 mt-5">
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs text-stone-500">No posts match the current filter.</p>
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
              </div>

              {/* Post Cards in this Date */}
              <div className="space-y-3">
                {datePosts.map((post) => {
                  const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                  const statStyle = STATUS_STYLES[post.status] || STATUS_STYLES.Planned;

                  return (
                    <div
                      key={post.id}
                      onClick={() => onEditPost(post)}
                      className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all group ${
                        isDark
                          ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                          : 'bg-white border-[#E8E4DC] hover:shadow-sm'
                      }`}
                    >
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
                          <span className="text-stone-600 dark:text-stone-300 font-medium text-xs">
                            {post.clientName}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${statStyle.badge}`}
                        >
                          {statStyle.text}
                        </span>
                      </div>

                      {/* Post Title */}
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1 group-hover:text-[#C44D34] transition-colors">
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

                      {/* Platform Tag */}
                      <div className="mt-2.5 flex items-center justify-end">
                        <span className="text-[11px] text-stone-400 font-medium">
                          {post.platform}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Client Picker Bottom Sheet */}
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
              Select Client
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
    </div>
  );
};
