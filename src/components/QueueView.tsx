import React, { useState } from 'react';
import { Plus, Film, Play } from 'lucide-react';
import { Post } from '../types';
import { STATUS_STYLES, CATEGORY_COLORS, getTodayDateStr } from '../utils/theme';
import { PullToRefreshContainer } from './PullToRefreshContainer';

interface QueueViewProps {
  posts: Post[];
  onOpenNewPost: () => void;
  onEditPost: (post: Post) => void;
  isDark?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  posts,
  onOpenNewPost,
  onEditPost,
  isDark,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Planned' | 'Scheduled' | 'Published'>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const todayStr = getTodayDateStr();

  // Filter posts by status first
  const statusMatchingPosts = posts.filter((post) => {
    if (statusFilter === 'All') return true;
    return post.status === statusFilter;
  });

  const upcomingCount = statusMatchingPosts.filter((p) => p.date >= todayStr).length;
  const pastCount = statusMatchingPosts.filter((p) => p.date < todayStr).length;
  const allCount = statusMatchingPosts.length;

  // Apply date-range filter ('upcoming' | 'past' | 'all')
  const filteredPosts = statusMatchingPosts
    .filter((post) => {
      if (dateRangeFilter === 'upcoming') return post.date >= todayStr;
      if (dateRangeFilter === 'past') return post.date < todayStr;
      return true;
    })
    .slice()
    .sort((a, b) =>
      dateRangeFilter === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );

  // Helper for date column: "AUG" and "5"
  const getDateParts = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return { month: months[monthIndex] || 'SEP', day: String(day) };
    } catch {
      return { month: 'SEP', day: '1' };
    }
  };

  const filterOptions: Array<'All' | 'Planned' | 'Scheduled' | 'Published'> = [
    'All',
    'Planned',
    'Scheduled',
    'Published',
  ];

  return (
    <PullToRefreshContainer onRefresh={onRefresh} isDark={isDark}>
      <div
        id="queue-view"
        className={`min-h-[780px] pb-24 px-4 pt-5 transition-colors ${
          isDark ? 'text-stone-100' : 'text-[#1E252B]'
        }`}
      >
      {/* Top Header */}
      <div className="flex items-start justify-between pb-3">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
            POST NOTE
          </span>
          <h2 className="text-xl font-bold tracking-tight">Post queue</h2>
        </div>

        <button
          id="queue-new-post-btn"
          onClick={onOpenNewPost}
          className="px-3.5 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* Filter Bar: Status Tabs + Upcoming / Past / All Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              id={`queue-filter-${opt.toLowerCase()}`}
              onClick={() => setStatusFilter(opt)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                statusFilter === opt
                  ? 'bg-[#181E24] dark:bg-[#C44D34] text-white shadow-xs'
                  : isDark
                  ? 'text-stone-400 hover:text-stone-200'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div
          className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-[#18202A] border-[#2A3646]' : 'bg-stone-200/70 border-stone-200'
          }`}
        >
          {(
            [
              { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
              { id: 'past', label: 'Past', count: pastCount },
              { id: 'all', label: 'All', count: allCount },
            ] as const
          ).map((range) => {
            const active = dateRangeFilter === range.id;
            return (
              <button
                key={range.id}
                type="button"
                onClick={() => setDateRangeFilter(range.id)}
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

      {/* Posts List with Date Column (Responsive Grid on Tablet/PC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
        {filteredPosts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-xs text-stone-500">No posts in this queue.</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const { month, day } = getDateParts(post.date);
            const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
            const statStyle = STATUS_STYLES[post.status] || STATUS_STYLES.Planned;

            return (
              <div
                key={post.id}
                id={`queue-item-${post.id}`}
                onClick={() => onEditPost(post)}
                className={`p-3.5 rounded-2xl border flex items-start gap-3.5 cursor-pointer hover:border-[#C44D34] transition-all group ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                    : 'bg-white border-[#E8E4DC] hover:shadow-xs'
                }`}
              >
                {/* Left Date Column */}
                <div className="w-10 text-center shrink-0 pt-0.5">
                  <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 tracking-wider">
                    {month}
                  </div>
                  <div className="text-lg font-extrabold text-stone-900 dark:text-white leading-none mt-0.5">
                    {day}
                  </div>
                </div>

                {/* Right Content */}
                <div className="flex-1 min-w-0">
                  {/* Client name + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0" />
                      <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 truncate">
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
                  <h4 className="text-xs font-bold text-stone-900 dark:text-white mt-1 truncate group-hover:text-[#C44D34] transition-colors">
                    {post.title}
                  </h4>

                  {/* Category · Platform */}
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-1 font-medium">
                    <span
                      className="font-bold tracking-wider uppercase"
                      style={{ color: catStyle.text }}
                    >
                      {post.category}
                    </span>
                    <span>•</span>
                    <span>{post.platform}</span>
                  </div>
                </div>

                {/* Right media thumbnail if attached */}
                {((post.media && post.media.length > 0) || post.mediaUrl) && (
                  <div className="relative w-11 h-11 rounded-lg bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700 self-center">
                    {post.media && post.media[0]?.type === 'video' ? (
                      <div className="w-full h-full relative">
                        {post.media[0]?.thumbnailUrl ? (
                          <img
                            src={post.media[0]?.thumbnailUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-800 flex items-center justify-center">
                            <Film className="w-3.5 h-3.5 text-stone-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 fill-white text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={post.media?.[0]?.url || post.media?.[0]?.thumbnailUrl || post.mediaUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>
    </PullToRefreshContainer>
  );
};
