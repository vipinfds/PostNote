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
  Users,
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCheck,
  Share2,
  Check,
} from 'lucide-react';
import { Post, MediaItem, Client } from '../types';
import { getCategoryBadgeStyle, normalizePostStatus } from '../utils/theme';
import { MediaCarousel } from './MediaCarousel';
import { PlatformLogo } from './PlatformLogo';
import { StatusStageBadge } from './StatusStageBadge';

interface ApprovalsViewProps {
  posts: Post[];
  clients?: Client[];
  onBack: () => void;
  onApprovePost: (postId: string) => void;
  onRequestChanges: (postId: string, comment?: string) => void;
  onAddPostComment?: (postId: string, comment: string) => void;
  onEditPost: (post: Post) => void;
  isDark?: boolean;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  posts,
  clients = [],
  onBack,
  onApprovePost,
  onRequestChanges,
  onAddPostComment,
  onEditPost,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'needs-review' | 'approved'>('needs-review');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [requestChangesPostId, setRequestChangesPostId] = useState<string | null>(null);
  const [changeRequestComment, setChangeRequestComment] = useState<string>('');
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [inlineCommentText, setInlineCommentText] = useState<string>('');
  const [copiedPortalClientId, setCopiedPortalClientId] = useState<string | null>(null);

  const handleCopyClientPortalLink = (clientId: string) => {
    const clean = clientId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const token = `pn_${clean}_live`;
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://postnote.studio';
    const url = `${origin}/?portal=${encodeURIComponent(clientId)}&token=${token}&view=approvals`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedPortalClientId(clientId);
    setTimeout(() => setCopiedPortalClientId(null), 2200);
  };

  // Track which client review batches are expanded (by clientId)
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});

  // Derive unique clients from clients prop + posts
  const clientFilterOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    clients.forEach((c) => {
      map.set(c.id, { id: c.id, name: c.name });
    });
    posts.forEach((p) => {
      if (p.clientId && !map.has(p.clientId)) {
        map.set(p.clientId, { id: p.clientId, name: p.clientName });
      }
    });
    return Array.from(map.values());
  }, [clients, posts]);

  const allNeedsReviewPosts = posts.filter(
    (p) => normalizePostStatus(p.status) === 'In review'
  );
  const allApprovedPosts = posts.filter(
    (p) => normalizePostStatus(p.status) === 'Approved'
  );

  const needsReviewPosts =
    selectedClientId === 'ALL'
      ? allNeedsReviewPosts
      : allNeedsReviewPosts.filter((p) => p.clientId === selectedClientId);

  const approvedPosts =
    selectedClientId === 'ALL'
      ? allApprovedPosts
      : allApprovedPosts.filter((p) => p.clientId === selectedClientId);

  const selectedClientName =
    selectedClientId === 'ALL'
      ? null
      : clientFilterOptions.find((c) => c.id === selectedClientId)?.name || null;

  // Group posts by Client Batch
  const groupPostsByClientBatch = (list: Post[]) => {
    const map = new Map<
      string,
      { clientId: string; clientName: string; color: string; posts: Post[] }
    >();
    list.forEach((post) => {
      const cId = post.clientId || post.clientName;
      if (!map.has(cId)) {
        const clientObj = clients.find((c) => c.id === post.clientId);
        map.set(cId, {
          clientId: cId,
          clientName: post.clientName,
          color: clientObj?.color || '#C44D34',
          posts: [],
        });
      }
      map.get(cId)!.posts.push(post);
    });
    return Array.from(map.values());
  };

  const reviewBatches = groupPostsByClientBatch(needsReviewPosts);
  const approvedBatches = groupPostsByClientBatch(approvedPosts);

  const isBatchExpanded = (batchKey: string, defaultOpen = false) => {
    if (selectedClientId !== 'ALL') return true;
    if (batchKey in expandedBatchIds) return expandedBatchIds[batchKey];
    return defaultOpen;
  };

  const toggleBatch = (batchKey: string, currentOpen: boolean) => {
    setExpandedBatchIds((prev) => ({
      ...prev,
      [batchKey]: !currentOpen,
    }));
  };

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

  const handleSubmitInlineComment = (post: Post) => {
    const clean = inlineCommentText.trim();
    if (!clean) return;
    if (onAddPostComment) {
      onAddPostComment(post.id, clean);
    } else {
      onRequestChanges(post.id, clean);
    }
    setCommentingPostId(null);
    setInlineCommentText('');
  };

  const renderPostCard = (post: Post, isApprovedMode: boolean) => {
    const catStyle = getCategoryBadgeStyle(post.category, isDark);
    const mediaItems = getMediaItemsForPost(post);
    const submitter = post.submittedBy || post.createdBy;
    const isRequestingChangesHere = requestChangesPostId === post.id;
    const isCommentingHere = commentingPostId === post.id;
    const activityList = post.activityLog || [];

    return (
      <div
        key={post.id}
        onClick={() => onEditPost(post)}
        className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all ${
          isDark ? 'bg-[#161D25] border-[#263240]' : 'bg-[#FAF8F5] border-[#E8E4DC]'
        }`}
      >
        {/* Meta row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
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
            <PlatformLogo platform={post.platform} size="xs" />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-400 font-medium tabular-nums">
            <StatusStageBadge status={post.status} size="xs" />
            {activityList.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[#C44D34] font-semibold">
                <Activity className="w-3 h-3" />
                <span>{activityList.length}</span>
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
              Submitted by{' '}
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

        {/* Attached Media Carousel */}
        {mediaItems.length > 0 && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <MediaCarousel
              mediaItems={mediaItems}
              fallbackTitle={post.title}
              heightClass="aspect-video max-h-[220px]"
              isDark={isDark}
            />
          </div>
        )}

        {/* Recent Comments Preview */}
        {activityList.filter((a) => Boolean(a.comment)).length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-stone-200/70 dark:border-stone-800 space-y-1.5">
            {activityList
              .filter((a) => Boolean(a.comment))
              .slice(-2)
              .map((act) => (
                <div
                  key={act.id}
                  className={`p-2 rounded-xl border text-[11px] ${
                    isDark
                      ? 'bg-[#1D242C] border-stone-800 text-stone-300'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="font-bold text-[#C44D34] mr-1.5">
                    {act.actorName}:
                  </span>
                  <span>{act.comment}</span>
                </div>
              ))}
          </div>
        )}

        {/* Inline Add Comment Box */}
        {isCommentingHere && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`mt-3 p-3 rounded-2xl border space-y-2 animate-fade-in ${
              isDark ? 'bg-[#1D242C] border-[#2E3B4A]' : 'bg-white border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Add Comment on Post</span>
              <button
                type="button"
                onClick={() => {
                  setCommentingPostId(null);
                  setInlineCommentText('');
                }}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              rows={2}
              autoFocus
              value={inlineCommentText}
              onChange={(e) => setInlineCommentText(e.target.value)}
              placeholder="Write a comment or note (keeps current status)..."
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-[#C44D34] ${
                isDark
                  ? 'bg-[#151C24] border-stone-700 text-white'
                  : 'bg-[#FAF8F5] border-stone-200 text-stone-900'
              }`}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCommentingPostId(null)}
                className="px-3 py-1 rounded-lg text-xs text-stone-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitInlineComment(post)}
                className="px-3.5 py-1.5 rounded-xl bg-[#C44D34] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Post Comment</span>
              </button>
            </div>
          </div>
        )}

        {/* Inline Request Changes Prompt */}
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
                <span>
                  {isApprovedMode
                    ? 'Change Decision & Request Revisions'
                    : 'Request Changes & Notify Team'}
                </span>
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

            <textarea
              rows={2}
              autoFocus
              value={changeRequestComment}
              onChange={(e) => setChangeRequestComment(e.target.value)}
              placeholder="Add revision notes (moves post back to Planned and notifies team)..."
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
                <span>Send Feedback &amp; Return to Planned</span>
              </button>
            </div>
          </div>
        )}

        {/* Practical Action Buttons */}
        {!isRequestingChangesHere && !isCommentingHere && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-stone-200/70 dark:border-stone-800"
          >
            {!isApprovedMode ? (
              <>
                <button
                  type="button"
                  onClick={() => onApprovePost(post.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestChangesPostId(post.id);
                    setChangeRequestComment('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                      : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Request changes</span>
                </button>
              </>
            ) : (
              /* Even when Approved, allow editing choice or adding comments */
              <button
                type="button"
                onClick={() => {
                  setRequestChangesPostId(post.id);
                  setChangeRequestComment('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDark
                    ? 'border-stone-700 text-amber-400 hover:bg-stone-800'
                    : 'border-stone-300 text-amber-700 hover:bg-amber-50'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Edit Choice / Request Changes</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCommentingPostId(post.id);
                setInlineCommentText('');
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                  : 'border-stone-300 text-stone-700 hover:bg-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#C44D34]" />
              <span>Add Comment</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id="approvals-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Header with Client Dropdown Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
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
              {selectedClientName && (
                <>
                  <span>•</span>
                  <span className="text-[#C44D34]">{selectedClientName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Client Dropdown Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
            <Users className="w-3.5 h-3.5 text-[#C44D34]" />
            <span>Client:</span>
          </div>
          <select
            id="approvals-client-dropdown"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            aria-label="Filter approvals by client"
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all cursor-pointer ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-100'
                : 'bg-white border-[#E8E4DC] text-stone-800 shadow-xs'
            }`}
          >
            <option value="ALL">
              All Clients ({allNeedsReviewPosts.length} waiting · {allApprovedPosts.length} approved)
            </option>
            {clientFilterOptions.map((c) => {
              const waitingCnt = allNeedsReviewPosts.filter(
                (p) => p.clientId === c.id
              ).length;
              const approvedCnt = allApprovedPosts.filter(
                (p) => p.clientId === c.id
              ).length;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({waitingCnt} waiting · {approvedCnt} approved)
                </option>
              );
            })}
          </select>
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

      {/* Content — Grouped into Expandable Client Review Batches */}
      <div className="space-y-4 mt-4">
        {activeTab === 'needs-review' ? (
          reviewBatches.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs text-stone-500">
                {selectedClientName
                  ? `No posts waiting for approval for ${selectedClientName}.`
                  : 'All caught up! No posts currently waiting for approval.'}
              </p>
              {selectedClientId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedClientId('ALL')}
                  className="mt-2.5 text-xs font-bold text-[#C44D34] hover:underline cursor-pointer"
                >
                  Show all clients
                </button>
              )}
            </div>
          ) : (
            reviewBatches.map((batch, idx) => {
              const batchKey = `review-${batch.clientId}`;
              const isOpen = isBatchExpanded(batchKey, idx === 0);

              return (
                <div
                  key={batch.clientId}
                  className={`rounded-3xl border shadow-xs overflow-hidden transition-all ${
                    isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                  }`}
                >
                  {/* Collapsible Batch Header */}
                  <div
                    onClick={() => toggleBatch(batchKey, isOpen)}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                        style={{ backgroundColor: batch.color }}
                      >
                        {batch.clientName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                            {batch.clientName}
                          </h3>
                          {clients.find((c) => c.id === batch.clientId)?.handle && (
                            <span className="text-[11px] text-stone-400 font-medium">
                              {clients.find((c) => c.id === batch.clientId)?.handle}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tabular-nums">
                            {batch.posts.length} {batch.posts.length === 1 ? 'Post' : 'Posts'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Click to {isOpen ? 'collapse' : 'expand posts'} for {batch.clientName}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopyClientPortalLink(batch.clientId)}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          copiedPortalClientId === batch.clientId
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isDark
                            ? 'bg-[#161D25] border-[#2C3846] text-stone-200 hover:border-[#C44D34]'
                            : 'bg-[#FAF8F5] border-[#E5DFD3] text-stone-700 hover:border-[#C44D34]'
                        }`}
                        title="Copy unified client portal link (Overview, Approvals, Posts & Analytics)"
                      >
                        {copiedPortalClientId === batch.clientId ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Portal Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-[#C44D34]" />
                            <span>Copy Portal Link</span>
                          </>
                        )}
                      </button>

                      {batch.posts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            batch.posts.forEach((p) => onApprovePost(p.id));
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Approve All ({batch.posts.length})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleBatch(batchKey, isOpen)}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-5 h-5 text-[#C44D34]" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Posts inside Batch */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3 animate-fade-in">
                      {batch.posts.map((post) => renderPostCard(post, false))}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : approvedBatches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xs text-stone-500">
              {selectedClientName
                ? `No approved posts for ${selectedClientName} yet.`
                : 'No approved posts yet.'}
            </p>
            {selectedClientId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedClientId('ALL')}
                className="mt-2.5 text-xs font-bold text-[#C44D34] hover:underline cursor-pointer"
              >
                Show all clients
              </button>
            )}
          </div>
        ) : (
          approvedBatches.map((batch, idx) => {
            const batchKey = `approved-${batch.clientId}`;
            const isOpen = isBatchExpanded(batchKey, idx === 0);

            return (
              <div
                key={batch.clientId}
                className={`rounded-3xl border shadow-xs overflow-hidden transition-all ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div
                  onClick={() => toggleBatch(batchKey, isOpen)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: batch.color }}
                    >
                      {batch.clientName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                          {batch.clientName}
                        </h3>
                        {clients.find((c) => c.id === batch.clientId)?.handle && (
                          <span className="text-[11px] text-stone-400 font-medium">
                            {clients.find((c) => c.id === batch.clientId)?.handle}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tabular-nums">
                          {batch.posts.length} Approved
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Click to expand · You can still edit choices or add comments on any approved post
                      </p>
                    </div>
                  </div>

                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-[#C44D34] shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-stone-400 shrink-0" />
                  )}
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3 animate-fade-in">
                    {batch.posts.map((post) => renderPostCard(post, true))}
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
