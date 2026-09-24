import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, Film, Image as ImageIcon, Play } from 'lucide-react';
import { Post } from '../types';
import { CATEGORY_COLORS, getCategoryBadgeStyle } from '../utils/theme';

interface ApprovalsViewProps {
  posts: Post[];
  onBack: () => void;
  onApprovePost: (postId: string) => void;
  onRequestChanges: (postId: string) => void;
  onEditPost: (post: Post) => void;
  isDark?: boolean;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  posts,
  onBack,
  onApprovePost,
  onRequestChanges,
  onEditPost,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'needs-review' | 'approved'>('needs-review');

  const needsReviewPosts = posts.filter(
    (p) => p.status === 'In review'
  );
  const approvedPosts = posts.filter((p) => p.status === 'Approved');

  return (
    <div
      id="approvals-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Approvals</h2>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-2 mt-0.5">
              <span>{needsReviewPosts.length} WAITING</span>
              <span>•</span>
              <span>{approvedPosts.length} APPROVED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 mt-3 px-1">
        <button
          onClick={() => setActiveTab('needs-review')}
          className={`pb-2.5 px-3 text-xs font-bold tracking-widest uppercase transition-all relative ${
            activeTab === 'needs-review'
              ? 'text-[#C44D34]'
              : isDark
              ? 'text-stone-400 hover:text-stone-200'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          NEEDS REVIEW ({needsReviewPosts.length})
          {activeTab === 'needs-review' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C44D34] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`pb-2.5 px-3 text-xs font-bold tracking-widest uppercase transition-all relative ${
            activeTab === 'approved'
              ? 'text-[#C44D34]'
              : isDark
              ? 'text-stone-400 hover:text-stone-200'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          APPROVED ({approvedPosts.length})
          {activeTab === 'approved' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C44D34] rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4 mt-4">
        {activeTab === 'needs-review' ? (
          needsReviewPosts.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs text-stone-500">All caught up! No posts currently waiting for approval.</p>
            </div>
          ) : (
            needsReviewPosts.map((post) => {
              const catStyle = getCategoryBadgeStyle(post.category, isDark);

              return (
                <div
                  key={post.id}
                  className={`p-4 rounded-2xl border shadow-xs transition-all ${
                    isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                  }`}
                >
                  {/* Meta row */}
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-stone-400" />
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        {post.clientName}
                      </span>
                      <span className="text-stone-300 dark:text-stone-700">•</span>
                      <span
                        className="font-bold text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider"
                        style={catStyle}
                      >
                        {post.category}
                      </span>
                    </div>

                    <span className="text-[11px] text-stone-400 font-medium">
                      {post.date}
                    </span>
                  </div>

                  {/* Title & Caption */}
                  <h3
                    onClick={() => onEditPost(post)}
                    className="text-sm font-bold text-stone-900 dark:text-white hover:text-[#C44D34] cursor-pointer transition-colors mt-2"
                  >
                    {post.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    {post.caption}
                  </p>

                  {/* Attached Media */}
                  {((post.media && post.media.length > 0) || post.mediaUrl) && (
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                      {post.media && post.media.length > 0 ? (
                        post.media.map((m, idx) => (
                          <div
                            key={m.id || idx}
                            className="relative w-20 h-16 rounded-xl bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700"
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
                                    <Film className="w-4 h-4 text-stone-400" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <Play className="w-4 h-4 fill-white text-white" />
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
                        <div className="relative w-20 h-16 rounded-xl bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                          <img
                            src={post.mediaUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="text-[11px] text-stone-400 mt-2">
                    Platform: <span className="font-semibold text-stone-600 dark:text-stone-300">{post.platform}</span>
                  </div>

                  {/* Action Buttons: Approve & Request changes */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() => onApprovePost(post.id)}
                      className="py-2.5 px-3 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all active:scale-[0.98]"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onRequestChanges(post.id)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] ${
                        isDark
                          ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                          : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      Request changes
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Approved list */
          approvedPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xs text-stone-500">No approved posts yet.</p>
            </div>
          ) : (
            approvedPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onEditPost(post)}
                className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold">{post.clientName}</span>
                    <span className="text-stone-400">•</span>
                    <span className="text-stone-500">{post.date}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    APPROVED
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1.5">
                  {post.title}
                </h4>
                <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                  {post.caption}
                </p>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
