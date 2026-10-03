import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  UserCheck,
  Send,
  X,
  Activity,
} from 'lucide-react';
import { Post, MediaItem } from '../types';
import { getCategoryBadgeStyle } from '../utils/theme';
import { MediaCarousel } from './MediaCarousel';

interface ApprovalsViewProps {
  posts: Post[];
  onBack: () => void;
  onApprovePost: (postId: string) => void;
  onRequestChanges: (postId: string, comment?: string) => void;
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
  const [requestChangesPostId, setRequestChangesPostId] = useState<string | null>(null);
  const [changeRequestComment, setChangeRequestComment] = useState<string>('');

  const needsReviewPosts = posts.filter((p) => p.status === 'In review');
  const approvedPosts = posts.filter((p) => p.status === 'Approved');

  const getMediaItemsForPost = (post: Post): MediaItem[] => {
    if (post.media && post.media.length > 0) return post.media;
    if (post.mediaUrl) {
      return [
        {
          id: `media-${post.id}`,
          title: post.title || 'Attached Media',
          type: post.mediaType || 'image',
          url: post.mediaUrl,
          thumbnailUrl: post.mediaUrl,
        },
      ];
    }
    return [];
  };

  const handleSubmitRequestChanges = (post: Post) => {
    const cleanComment = changeRequestComment.trim();
    onRequestChanges(
      post.id,
      cleanComment || 'Requested revisions before approval.'
    );
    setRequestChangesPostId(null);
    setChangeRequestComment('');
  };

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
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Approvals</h2>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-2 mt-0.5 tabular-nums">
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
          className={`pb-2.5 px-3 text-xs font-bold tracking-widest uppercase transition-all relative cursor-pointer ${
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
          className={`pb-2.5 px-3 text-xs font-bold tracking-widest uppercase transition-all relative cursor-pointer ${
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
              <p className="text-xs text-stone-500">
                All caught up! No posts currently waiting for approval.
              </p>
            </div>
          ) : (
            needsReviewPosts.map((post) => {
              const catStyle = getCategoryBadgeStyle(post.category, isDark);
              const mediaItems = getMediaItemsForPost(post);
              const submitter = post.submittedBy || post.createdBy;
              const isRequestingChangesHere = requestChangesPostId === post.id;
              const activityCount = post.activityLog?.length || 0;

              return (
                <div
                  key={post.id}
                  onClick={() => onEditPost(post)}
                  className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                    isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                  }`}
                >
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
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
                      <span className="text-stone-300 dark:text-stone-700">•</span>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        {post.platform}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-medium tabular-nums">
                      {activityCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[#C44D34] font-semibold">
                          <Activity className="w-3 h-3" />
                          <span>{activityCount}</span>
                        </span>
                      )}
                      <span>{post.date}</span>
                    </div>
                  </div>

                  {/* Submitter Attribution Banner */}
                  {submitter && (
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 mb-2">
                      <UserCheck className="w-3.5 h-3.5 text-[#C44D34] shrink-0" />
                      <span>
                        Submitted for approval by{' '}
                        <strong className="text-stone-800 dark:text-stone-200">
                          {submitter.name}
                        </strong>
                        {submitter.role ? ` · ${submitter.role}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Title & Caption */}
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white hover:text-[#C44D34] transition-colors mt-1">
                    {post.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    {post.caption}
                  </p>

                  {/* Attached Media Carousel with Left/Right Buttons */}
                  {mediaItems.length > 0 && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <MediaCarousel
                        mediaItems={mediaItems}
                        fallbackTitle={post.title}
                        heightClass="aspect-video max-h-[240px]"
                        isDark={isDark}
                      />
                    </div>
                  )}

                  {/* Inline Request Changes Comment Prompt */}
                  {isRequestingChangesHere && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-3.5 p-3.5 rounded-2xl border space-y-2.5 animate-fade-in ${
                        isDark
                          ? 'bg-[#161D25] border-amber-700/60'
                          : 'bg-amber-50/70 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Request Changes & Notify Team</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRequestChangesPostId(null);
                            setChangeRequestComment('');
                          }}
                          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Will notify{' '}
                        <strong className="text-stone-700 dark:text-stone-200">
                          {submitter
                            ? `${submitter.name} (${submitter.email})`
                            : 'the content team'}
                        </strong>{' '}
                        and log your comment in the post Activity tab:
                      </p>

                      <textarea
                        rows={3}
                        autoFocus
                        value={changeRequestComment}
                        onChange={(e) => setChangeRequestComment(e.target.value)}
                        placeholder="Add revision notes (e.g., Update CTA link, swap Slide 2 graphic, adjust tone)..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                          isDark
                            ? 'bg-[#1D242C] border-[#2E3B4A] text-white placeholder-stone-500'
                            : 'bg-white border-amber-200 text-stone-900 placeholder-stone-400'
                        }`}
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRequestChangesPostId(null);
                            setChangeRequestComment('');
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                            isDark
                              ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                              : 'border-stone-300 text-stone-600 hover:bg-white'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitRequestChanges(post)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#A93E27] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Feedback & Return to Planned</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: Approve & Request changes */}
                  {!isRequestingChangesHere && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-stone-100 dark:border-stone-800"
                    >
                      <button
                        type="button"
                        onClick={() => onApprovePost(post.id)}
                        className="py-2.5 px-3 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRequestChangesPostId(post.id);
                          setChangeRequestComment('');
                        }}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
                          isDark
                            ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                            : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request changes</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : /* Approved list */
        approvedPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xs text-stone-500">No approved posts yet.</p>
          </div>
        ) : (
          approvedPosts.map((post) => {
            const mediaItems = getMediaItemsForPost(post);
            return (
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
                    <span className="text-stone-500 tabular-nums">{post.date}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    APPROVED
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1.5">
                  {post.title}
                </h4>
                <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                  {post.caption}
                </p>
                {mediaItems.length > 0 && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <MediaCarousel
                      mediaItems={mediaItems}
                      fallbackTitle={post.title}
                      heightClass="aspect-video max-h-[200px]"
                      isDark={isDark}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
