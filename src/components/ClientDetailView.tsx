import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Client, Post } from '../types';
import { CATEGORY_COLORS, getCategoryBadgeStyle } from '../utils/theme';

interface ClientDetailViewProps {
  client: Client;
  posts: Post[];
  onBack: () => void;
  onNewPostForClient: (clientId: string) => void;
  onEditPost: (post: Post) => void;
  isDark?: boolean;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  posts,
  onBack,
  onNewPostForClient,
  onEditPost,
  isDark,
}) => {
  const clientPosts = posts.filter((p) => p.clientId === client.id);

  // Statistics
  const totalPosts = clientPosts.length;
  const plannedCount = clientPosts.filter((p) => p.status === 'Planned').length;
  const scheduledCount = clientPosts.filter((p) => p.status === 'Scheduled').length;
  const publishedCount = clientPosts.filter((p) => p.status === 'Published').length;

  // Posts by type distribution
  const typeCounts: Record<string, number> = {};
  clientPosts.forEach((p) => {
    typeCounts[p.category] = (typeCounts[p.category] || 0) + 1;
  });

  const typeEntries = Object.entries(typeCounts).map(([cat, count]) => ({
    category: cat as keyof typeof CATEGORY_COLORS,
    count,
    percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
  }));

  // Upcoming / planned / scheduled posts sorted by date
  const upcomingPosts = clientPosts
    .filter((p) => p.status !== 'Published')
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[monthIndex]} ${day}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      id="client-detail-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Bar with Back, Title & + New Post Button */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors"
          aria-label="Back to clients"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <div className="text-center flex-1 mx-2">
          <h2 className="text-base font-bold tracking-tight">{client.name}</h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
            {client.handle}
          </p>
        </div>

        <button
          onClick={() => onNewPostForClient(client.id)}
          className="px-3 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New post</span>
        </button>
      </div>

      {/* Bio / Description */}
      {client.notes && (
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-4 px-1 leading-relaxed">
          {client.notes}
        </p>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div
          className={`p-3.5 rounded-2xl border text-center ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="text-xl font-extrabold text-stone-900 dark:text-white">
            {totalPosts}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
            TOTAL POSTS
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border text-center ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="text-xl font-extrabold text-stone-900 dark:text-white">
            {plannedCount}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
            PLANNED
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border text-center ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="text-xl font-extrabold text-stone-900 dark:text-white">
            {scheduledCount}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
            SCHEDULED
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border text-center ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="text-xl font-extrabold text-stone-900 dark:text-white">
            {publishedCount}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
            PUBLISHED
          </div>
        </div>
      </div>

      {/* Posts by Type Progress Bars */}
      <div
        className={`mt-5 p-4 rounded-2xl border ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
          POSTS BY TYPE
        </h3>

        <div className="space-y-3">
          {typeEntries.map((item) => {
            const catColor = CATEGORY_COLORS[item.category]?.dot || '#C44D34';
            return (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-stone-300 text-[11px]">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-bold text-stone-500">
                    {item.count} · {item.percent}%
                  </span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: catColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Posts */}
      <div
        className={`mt-5 p-4 rounded-2xl border ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
          UPCOMING POSTS
        </h3>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {upcomingPosts.length === 0 ? (
            <p className="text-xs text-stone-500 py-3 text-center">No upcoming posts.</p>
          ) : (
            upcomingPosts.map((post) => {
              const catStyle = getCategoryBadgeStyle(post.category, isDark);

              return (
                <div
                  key={post.id}
                  onClick={() => onEditPost(post)}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 px-1 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 shrink-0 w-12">
                      {formatShortDate(post.date)}
                    </span>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                      style={catStyle}
                    >
                      {post.category}
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                      {post.title}
                    </span>
                  </div>

                  <span className="text-[11px] text-stone-400 font-medium shrink-0">
                    {post.platform}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
