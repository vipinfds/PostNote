import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Film,
  Play,
  Download,
  ImagePlus,
  Sparkles,
  Users,
  Search,
  X,
  AlertCircle,
  CheckSquare,
  Square,
  Check,
  Trash2,
} from 'lucide-react';
import { Post, Client, PostCategory, PostStatus, SubscriptionState } from '../types';
import {
  CATEGORY_COLORS,
  STATUS_STYLES,
  POST_STAGES,
  formatLongDate,
  formatSectionDate,
  getTodayParts,
  normalizePostStatus,
} from '../utils/theme';
import { downloadMediaFile } from '../utils/mediaDownload';
import { PullToRefreshContainer } from './PullToRefreshContainer';
import { MediaCarousel } from './MediaCarousel';
import { StatusStageBadge } from './StatusStageBadge';
import { PlatformLogo } from './PlatformLogo';

interface HomeViewProps {
  posts: Post[];
  clients?: Client[];
  subscription?: SubscriptionState;
  onNavigateToBilling?: () => void;
  onOpenNewPost: (initialDate?: string, preselectedClientId?: string) => void;
  onEditPost: (post: Post) => void;
  onBulkUpdateStatus?: (postIds: string[], newStatus: PostStatus) => void;
  onBulkDeletePosts?: (postIds: string[]) => void;
  onRefresh?: () => Promise<void> | void;
  isDark?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  posts,
  clients = [],
  subscription,
  onNavigateToBilling,
  onOpenNewPost,
  onEditPost,
  onBulkUpdateStatus,
  onBulkDeletePosts,
  onRefresh,
  isDark,
}) => {
  // Sync with actual real-time local date and automatically roll over if date changes
  const [todayParts, setTodayParts] = useState(() => getTodayParts());
  const TODAY_REF_DATE = todayParts.dateStr;
  const [currentYear, setCurrentYear] = useState(() => todayParts.year);
  const [currentMonth, setCurrentMonth] = useState(() => todayParts.monthIndex);
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => todayParts.dateStr);
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [agendaRangeFilter, setAgendaRangeFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  // Default to 'Approved' as requested, switchable via dropdown
  const [agendaStageFilter, setAgendaStageFilter] = useState<'All' | PostStatus>('Approved');
  const [agendaSearchQuery, setAgendaSearchQuery] = useState<string>('');
  const [isAgendaSearchOpen, setIsAgendaSearchOpen] = useState<boolean>(false);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  useEffect(() => {
    const syncClock = () => {
      const latest = getTodayParts();
      setTodayParts((prev) => {
        if (prev.dateStr !== latest.dateStr) {
          setSelectedDayDate((sel) => (sel === prev.dateStr ? latest.dateStr : sel));
          setCurrentYear(latest.year);
          setCurrentMonth(latest.monthIndex);
          return latest;
        }
        return prev;
      });
    };
    const interval = setInterval(syncClock, 60_000);
    window.addEventListener('focus', syncClock);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncClock);
    };
  }, []);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    const latest = getTodayParts();
    setTodayParts(latest);
    setCurrentYear(latest.year);
    setCurrentMonth(latest.monthIndex);
    setSelectedDayDate(latest.dateStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Generate calendar grid days (Monday-first)
  const firstDayObj = new Date(currentYear, currentMonth, 1);
  let firstDayIndex = firstDayObj.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  interface CalendarCell {
    dayNum: number;
    monthOffset: -1 | 0 | 1;
    dateStr: string;
    isToday: boolean;
  }

  const calendarDays: CalendarCell[] = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
    const mStr = String(prevM + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    calendarDays.push({
      dayNum: day,
      monthOffset: -1,
      dateStr: `${prevY}-${mStr}-${dStr}`,
      isToday: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(i).padStart(2, '0');
    const dateStr = `${currentYear}-${mStr}-${dStr}`;
    const isToday = dateStr === TODAY_REF_DATE;
    calendarDays.push({
      dayNum: i,
      monthOffset: 0,
      dateStr,
      isToday,
    });
  }

  // Next month leading days (fill up to 35 or 42 cells)
  const remaining =
    35 - calendarDays.length > 0
      ? 35 - calendarDays.length
      : 42 - calendarDays.length > 0
      ? 42 - calendarDays.length
      : 0;
  for (let i = 1; i <= remaining; i++) {
    const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    const mStr = String(nextM + 1).padStart(2, '0');
    const dStr = String(i).padStart(2, '0');
    calendarDays.push({
      dayNum: i,
      monthOffset: 1,
      dateStr: `${nextY}-${mStr}-${dStr}`,
      isToday: false,
    });
  }

  // Filter posts by selected client (or show all clients)
  const filteredPosts =
    selectedClientId === 'ALL'
      ? posts
      : posts.filter((p) => p.clientId === selectedClientId);

  const selectedClientObj =
    selectedClientId === 'ALL'
      ? null
      : clients.find((c) => c.id === selectedClientId) || null;

  // Get posts for a specific date
  const getPostsForDate = (dateStr: string) => {
    return filteredPosts.filter((p) => p.date === dateStr);
  };

  const activeScheduleDate = selectedDayDate || TODAY_REF_DATE;
  const isTodaySelected = activeScheduleDate === TODAY_REF_DATE;
  const selectedDayPosts = getPostsForDate(activeScheduleDate).filter(
    (p) => normalizePostStatus(p.status) === 'Approved'
  );

  // Helper: A post is Delayed if its scheduled date has passed AND its status is NOT turned to 'Scheduled'
  const isPostDelayed = (p: Post) =>
    p.date < TODAY_REF_DATE && normalizePostStatus(p.status) !== 'Scheduled';

  // Base Agenda & Queue posts filtered by selected Client, Stage (or Delayed), and Search query
  const baseAgendaPosts = filteredPosts.filter((p) => {
    const pStatus = normalizePostStatus(p.status);
    const delayed = isPostDelayed(p);

    // If a specific stage is selected, include matching stage posts PLUS any delayed unscheduled posts so they are never hidden
    if (agendaStageFilter !== 'All' && pStatus !== agendaStageFilter && !delayed) {
      return false;
    }
    if (agendaSearchQuery.trim()) {
      const q = agendaSearchQuery.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchCaption = p.caption?.toLowerCase().includes(q);
      const matchClient = p.clientName?.toLowerCase().includes(q);
      const matchCategory = p.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchCaption && !matchClient && !matchCategory) {
        return false;
      }
    }
    return true;
  });

  // Stage counts scoped to client + date-range (including delayed posts in upcoming)
  const rangeScopedForStageCounts = filteredPosts.filter((p) => {
    if (agendaRangeFilter === 'upcoming') return p.date >= TODAY_REF_DATE || isPostDelayed(p);
    if (agendaRangeFilter === 'past') return p.date < TODAY_REF_DATE;
    return true;
  });

  const agendaStageCounts: Record<'All' | PostStatus, number> = {
    All: rangeScopedForStageCounts.length,
    Planned: rangeScopedForStageCounts.filter(
      (p) => normalizePostStatus(p.status) === 'Planned'
    ).length,
    'In review': rangeScopedForStageCounts.filter(
      (p) => normalizePostStatus(p.status) === 'In review'
    ).length,
    Approved: rangeScopedForStageCounts.filter(
      (p) => normalizePostStatus(p.status) === 'Approved'
    ).length,
    Scheduled: rangeScopedForStageCounts.filter(
      (p) => normalizePostStatus(p.status) === 'Scheduled'
    ).length,
  };

  // Date-range counts for Agenda ('upcoming', 'past', 'all')
  // Upcoming includes p.date >= TODAY_REF_DATE PLUS any delayed unscheduled posts (p.date < TODAY_REF_DATE && status !== 'Scheduled')
  const upcomingCount = baseAgendaPosts.filter(
    (p) => p.date >= TODAY_REF_DATE || isPostDelayed(p)
  ).length;
  const pastCount = baseAgendaPosts.filter((p) => p.date < TODAY_REF_DATE).length;
  const allCount = baseAgendaPosts.length;

  // Filter Agenda posts by date-range ('upcoming', 'past', 'all')
  // Whichever post is not changed to Scheduled and whose date is crossed still shows Marked in Red (DELAYED)
  const agendaPosts = baseAgendaPosts
    .filter((p) => {
      if (agendaRangeFilter === 'upcoming') {
        return p.date >= TODAY_REF_DATE || isPostDelayed(p);
      }
      if (agendaRangeFilter === 'past') return p.date < TODAY_REF_DATE;
      return true;
    })
    .slice()
    .sort((a, b) =>
      agendaRangeFilter === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );

  const toggleSelectPost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const allVisiblePostIds = agendaPosts.map((p) => p.id);
  const areAllVisibleSelected =
    allVisiblePostIds.length > 0 &&
    allVisiblePostIds.every((id) => selectedPostIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (areAllVisibleSelected) {
      setSelectedPostIds((prev) => prev.filter((id) => !allVisiblePostIds.includes(id)));
    } else {
      setSelectedPostIds((prev) => Array.from(new Set([...prev, ...allVisiblePostIds])));
    }
  };

  const categoriesList: PostCategory[] = [
    'POST',
    'TIPS',
    'BEHIND THE SCENES',
    'QUOTE',
    'EDUCATE',
    'ENGAGE',
    'RELAX',
  ];

  return (
    <PullToRefreshContainer onRefresh={onRefresh} isDark={isDark}>
      <div
        id="home-view"
        className={`relative min-h-[780px] pb-28 lg:pb-24 px-3.5 sm:px-5 pt-3 sm:pt-5 transition-colors ${
          isDark ? 'text-stone-100' : 'text-[#1E252B]'
        }`}
      >
      {/* Unified Calendar Header Bar: CALENDAR + Month Left/Right Slider + TODAY Button + Client Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-300/70 dark:border-stone-800 mb-3 px-1 pb-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div
            id="subtab-calendar"
            className="px-2 py-1 text-xs font-bold tracking-widest uppercase relative text-[#C44D34]"
          >
            CALENDAR
            <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-[#C44D34] rounded-full" />
          </div>

          <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">|</span>

          {/* Month Left/Right Slider */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              id="prev-month-btn"
              onClick={prevMonth}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark
                  ? 'text-stone-300 hover:text-white hover:bg-stone-800'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.4]" />
            </button>

            <h2
              id="calendar-month-title"
              className="text-sm sm:text-[15px] font-bold tracking-tight min-w-[115px] text-center"
            >
              {monthNames[currentMonth]} {currentYear}
            </h2>

            <button
              id="next-month-btn"
              onClick={nextMonth}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark
                  ? 'text-stone-300 hover:text-white hover:bg-stone-800'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.4]" />
            </button>
          </div>

          {/* TODAY Button right next to the Month Slider */}
          <button
            id="today-nav-btn"
            onClick={jumpToToday}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              isDark
                ? 'bg-stone-800 text-stone-200 border border-stone-700 hover:bg-stone-700'
                : 'bg-white text-stone-700 border border-stone-300/80 hover:bg-stone-100 shadow-2xs'
            }`}
          >
            TODAY ({todayParts.shortLabel})
          </button>
        </div>

        {/* Client Calendar & Agenda Filter Dropdown */}
        <div className="flex items-center gap-2 max-w-full">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
            {selectedClientObj ? (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedClientObj.color || '#C44D34' }}
              />
            ) : (
              <Users className="w-3.5 h-3.5 text-[#C44D34]" />
            )}
            <span className="hidden sm:inline">Client:</span>
          </div>
          <select
            id="home-client-calendar-select"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            aria-label="Filter calendar and agenda by client"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-colors max-w-[210px] sm:max-w-xs truncate ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-100'
                : 'bg-white border-[#E8E4DC] text-stone-800 shadow-2xs'
            }`}
          >
            <option value="ALL">All Clients ({posts.length} posts)</option>
            {clients.map((c) => {
              const count = posts.filter((p) => p.clientId === c.id).length;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({count} {count === 1 ? 'post' : 'posts'})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 1. Calendar View + Inline Today's Schedule (Strictly matched height on desktop, Today's Schedule scrolls internally) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:items-stretch">
        {/* Left Column (lg:col-span-7): Calendar Grid & Legend */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
          {/* Calendar Grid Container */}
          <div
            id="calendar-grid-card"
            className={`rounded-2xl border p-2 sm:p-2.5 shadow-xs transition-colors flex-1 flex flex-col justify-between ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440]'
                : 'bg-white/95 border-[#E8E4DC]'
            }`}
          >
            {/* Weekday headers: M T W T F S S */}
            <div className="grid grid-cols-7 text-center pb-2 border-b border-stone-200/60 dark:border-stone-800">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase flex items-center justify-center"
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-y-1.5 pt-2 pb-0.5 place-items-center flex-1">
              {calendarDays.map((cell, idx) => {
                const dayPosts = getPostsForDate(cell.dateStr);
                const isSelected = activeScheduleDate === cell.dateStr;
                const isOffMonth = cell.monthOffset !== 0;

                return (
                  <button
                    key={idx}
                    id={`cal-day-${cell.dateStr}`}
                    onClick={() => setSelectedDayDate(cell.dateStr)}
                    className={`w-10 h-11 sm:w-11 sm:h-12 flex flex-col items-center justify-center rounded-xl transition-all relative group cursor-pointer ${
                      cell.isToday
                        ? 'border-2 border-[#C44D34]'
                        : 'border-2 border-transparent hover:bg-stone-100/70 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    {/* Fixed-height numeral slot so all 7 columns share an exact baseline */}
                    <div className="h-5 flex items-center justify-center">
                      <span
                        className={`leading-none tabular-nums select-none transition-all ${
                          isSelected
                            ? isDark
                              ? 'font-black text-[15px] sm:text-[16px] text-white'
                              : 'font-black text-[15px] sm:text-[16px] text-[#181E24]'
                            : isOffMonth
                            ? 'text-xs font-medium text-stone-300 dark:text-stone-600'
                            : isDark
                            ? 'text-xs font-medium text-stone-200'
                            : 'text-xs font-medium text-stone-800'
                        }`}
                        style={
                          isSelected
                            ? {
                                textShadow: isDark
                                  ? '0 1px 0 rgba(0,0,0,0.85), 1px 1.5px 0 rgba(255,255,255,0.2)'
                                  : '0 1px 0 #ffffff, 1px 1.5px 0 rgba(24,30,36,0.2)',
                              }
                            : undefined
                        }
                      >
                        {cell.dayNum}
                      </span>
                    </div>

                    {/* Fixed-height post dots slot so dates with 0 posts align identically to dates with posts */}
                    <div className="h-2.5 flex items-center justify-center gap-1 mt-0.5">
                      {dayPosts.slice(0, 3).map((post, pIdx) => {
                        const col = CATEGORY_COLORS[post.category]?.dot || '#C44D34';
                        return (
                          <span
                            key={pIdx}
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: col }}
                            title={`${post.category}: ${post.title}`}
                          />
                        );
                      })}
                      {dayPosts.length > 3 && (
                        <span className="w-1 h-1 rounded-full bg-stone-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categories Legend */}
          <div
            id="categories-legend"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-1"
          >
            {categoriesList.map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat].dot }}
                />
                <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-300 tracking-wider">
                  {cat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (lg:col-span-5): Today’s Schedule Card — Matches Monthly Calendar height and scrolls internally */}
        <div id="todays-schedule-section" className="lg:col-span-5 flex flex-col">
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-col h-[310px] sm:h-[345px] lg:h-[360px] ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate">
                  {isTodaySelected
                    ? `Today’s Schedule • ${formatLongDate(activeScheduleDate)}`
                    : formatLongDate(activeScheduleDate)}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 tabular-nums block truncate">
                  {selectedDayPosts.length} approved post{selectedDayPosts.length === 1 ? '' : 's'}
                  {selectedClientObj ? ` • ${selectedClientObj.name}` : ''}
                </span>
              </div>

              <button
                onClick={() =>
                  onOpenNewPost(
                    activeScheduleDate,
                    selectedClientId !== 'ALL' ? selectedClientId : undefined
                  )
                }
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#C44D34] text-white hover:bg-[#B33E26] shadow-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Schedule</span>
              </button>
            </div>

            {/* Day's posts — Scrollable interior matching calendar height */}
            <div className="space-y-2.5 mt-3 flex-1 overflow-y-auto pr-1">
              {selectedDayPosts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-6">
                  <p className="text-xs text-stone-400">
                    No approved posts for {isTodaySelected ? 'today' : formatLongDate(activeScheduleDate)}
                    {selectedClientObj ? ` (${selectedClientObj.name})` : ''}.
                  </p>
                  <button
                    onClick={() =>
                      onOpenNewPost(
                        activeScheduleDate,
                        selectedClientId !== 'ALL' ? selectedClientId : undefined
                      )
                    }
                    className="mt-2 text-xs font-bold text-[#C44D34] hover:underline cursor-pointer"
                  >
                    + Create a post for this day
                  </button>
                </div>
              ) : (
                selectedDayPosts.map((post) => {
                  const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;

                  return (
                    <div
                      key={post.id}
                      onClick={() => onEditPost(post)}
                      className={`p-3 rounded-xl border cursor-pointer hover:border-[#C44D34] transition-all ${
                        isDark
                          ? 'bg-[#151D25] border-[#24303E] hover:bg-[#1A2430]'
                          : 'bg-[#FAF8F5] border-[#E8E4DC] hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: catStyle.dot }}
                          />
                          <span
                            className="font-bold text-[9px] uppercase tracking-wider shrink-0"
                            style={{ color: catStyle.text }}
                          >
                            {post.category}
                          </span>
                          <span className="text-stone-400">•</span>
                          <span className="text-stone-500 font-medium text-[11px] truncate">
                            {post.clientName}
                          </span>
                          <span className="text-stone-400">•</span>
                          <PlatformLogo platform={post.platform} size="xs" showLabel={false} />
                        </div>
                        <StatusStageBadge status={post.status} size="xs" />
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                        {post.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                        {post.caption}
                      </p>

                      {/* Attached Media Previews inside Today's Schedule */}
                      {((post.media && post.media.length > 0) || post.mediaUrl) && (
                        <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800">
                          <div className="flex items-center gap-1.5 overflow-x-auto">
                            {post.media && post.media.length > 0 ? (
                              post.media.slice(0, 3).map((m, idx) => (
                                <div
                                  key={m.id || idx}
                                  className="relative w-12 h-9 rounded-md bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700"
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
                                        <Play className="w-2.5 h-2.5 fill-white text-white" />
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
                              <div className="relative w-12 h-9 rounded-md bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                                <img
                                  src={post.mediaUrl}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetUrl =
                                post.media?.[0]?.url ||
                                post.media?.[0]?.thumbnailUrl ||
                                post.mediaUrl ||
                                '';
                              downloadMediaFile(targetUrl, post.title);
                            }}
                            className="text-[10px] font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                            title="Download media file"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Agenda & Content Queue Section Directly Below Calendar & Today's Schedule */}
      <div className="mt-6 sm:mt-7">
        <div className="flex flex-col gap-3 border-b border-stone-300/70 dark:border-stone-800 pb-3 mb-4 px-1">
          {/* Single Clean Header Row: Title + Stage View Dropdown on Left | Search Icon + Upcoming/Past/All on Right End */}
          <div className="flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2.5 shrink-0">
              <span
                id="subtab-agenda"
                className="text-xs font-bold tracking-widest uppercase text-[#C44D34] whitespace-nowrap"
              >
                AGENDA & CONTENT QUEUE •{' '}
                {selectedClientObj ? selectedClientObj.name : 'ALL CLIENTS'}
              </span>

              {/* Stage View Dropdown (Defaults to Approved) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <label
                  htmlFor="agenda-stage-dropdown"
                  className="text-[11px] font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap"
                >
                  View:
                </label>
                <select
                  id="agenda-stage-dropdown"
                  value={agendaStageFilter}
                  onChange={(e) =>
                    setAgendaStageFilter(e.target.value as 'All' | PostStatus)
                  }
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-colors shrink-0 ${
                    isDark
                      ? 'bg-[#1D242C] border-[#2A3440] text-stone-100'
                      : 'bg-white border-[#E8E4DC] text-stone-800 shadow-2xs'
                  }`}
                >
                  <option value="Approved">
                    Approved Only ({agendaStageCounts.Approved})
                  </option>
                  <option value="All">
                    All Stages ({agendaStageCounts.All})
                  </option>
                  <option value="Planned">
                    Planned ({agendaStageCounts.Planned})
                  </option>
                  <option value="In review">
                    In review ({agendaStageCounts['In review']})
                  </option>
                  <option value="Scheduled">
                    Scheduled ({agendaStageCounts.Scheduled})
                  </option>
                </select>
              </div>
            </div>

            {/* Right End: Search Icon (Expandable) + Segmented Date-Range Toggle (Upcoming | Past | All) */}
            <div className="flex items-center justify-end gap-2 ml-auto shrink-0">
              {/* Compact Search Icon Toggle */}
              {isAgendaSearchOpen || agendaSearchQuery ? (
                <div className="relative w-36 sm:w-44 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search queue..."
                    value={agendaSearchQuery}
                    onChange={(e) => setAgendaSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#C44D34] ${
                      isDark
                        ? 'bg-[#1D242C] border-[#2A3440] text-stone-100 placeholder-stone-500'
                        : 'bg-white border-[#E8E4DC] text-stone-900 placeholder-stone-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAgendaSearchQuery('');
                      setIsAgendaSearchOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title="Close search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAgendaSearchOpen(true)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-[#1D242C] border-[#2A3440] text-stone-300 hover:text-white hover:border-[#C44D34]'
                      : 'bg-white border-[#E8E4DC] text-stone-600 hover:text-stone-900 hover:border-[#C44D34] shadow-2xs'
                  }`}
                  title="Search queue"
                  aria-label="Search queue"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Date-Range Dropdown: Defaults to Upcoming, with Past & All */}
              <select
                id="agenda-date-range-filter"
                aria-label="Filter agenda by date range"
                value={agendaRangeFilter}
                onChange={(e) =>
                  setAgendaRangeFilter(
                    e.target.value as 'upcoming' | 'past' | 'all'
                  )
                }
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-colors shrink-0 ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] text-stone-100'
                    : 'bg-white border-[#E8E4DC] text-stone-800 shadow-2xs'
                }`}
              >
                <option value="upcoming">Upcoming ({upcomingCount})</option>
                <option value="past">Past ({pastCount})</option>
                <option value="all">All ({allCount})</option>
              </select>
            </div>
          </div>

          {/* Bulk Action Bar (Shown when 1+ posts are checked) */}
          {selectedPostIds.length > 0 && (
            <div
              id="agenda-bulk-action-bar"
              className={`p-2.5 sm:px-4 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5 animate-fade-in ${
                isDark
                  ? 'bg-[#1C2632] border-[#C44D34]/60 text-stone-100'
                  : 'bg-[#FFF7F5] border-[#C44D34]/40 text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#C44D34] cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{selectedPostIds.length} selected</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPostIds([])}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white underline cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onBulkUpdateStatus && (
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="bulk-status-select"
                      className="text-[11px] font-bold text-stone-500 dark:text-stone-300"
                    >
                      Bulk Status:
                    </label>
                    <select
                      id="bulk-status-select"
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value as PostStatus;
                        if (!val) return;
                        onBulkUpdateStatus(selectedPostIds, val);
                        setSelectedPostIds([]);
                        e.target.value = '';
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                        isDark
                          ? 'bg-[#151C24] border-[#2A3440] text-white'
                          : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    >
                      <option value="" disabled>
                        Move to Status...
                      </option>
                      {POST_STAGES.map((st) => (
                        <option key={st} value={st}>
                          Mark as {st}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {onBulkDeletePosts && (
                  <button
                    type="button"
                    onClick={() => {
                      onBulkDeletePosts(selectedPostIds);
                      setSelectedPostIds([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete ({selectedPostIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {agendaPosts.length === 0 ? (
          <div
            className={`p-7 sm:p-8 rounded-2xl border text-center ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {agendaStageFilter !== 'All'
                ? `No ${agendaStageFilter.toLowerCase()} posts found${
                    selectedClientObj ? ` for ${selectedClientObj.name}` : ''
                  }. Use the View dropdown above to switch to All Stages.`
                : `No posts scheduled${
                    selectedClientObj ? ` for ${selectedClientObj.name}` : ''
                  }.`}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {agendaStageFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setAgendaStageFilter('All')}
                  className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
                >
                  Show All Stages ({agendaStageCounts.All})
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onOpenNewPost(
                    activeScheduleDate,
                    selectedClientId !== 'ALL' ? selectedClientId : undefined
                  )
                }
                className="px-4 py-2 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                + Schedule Post{selectedClientObj ? ` for ${selectedClientObj.name}` : ''}
              </button>
            </div>
          </div>
        ) : (
          <div id="agenda-view-list" className="space-y-5">
            {(() => {
              const groupedAgendaByDate: Record<string, Post[]> = {};
              agendaPosts.forEach((post) => {
                if (!groupedAgendaByDate[post.date]) {
                  groupedAgendaByDate[post.date] = [];
                }
                groupedAgendaByDate[post.date].push(post);
              });
              return Object.entries(groupedAgendaByDate);
            })().map(([dateStr, datePosts]) => {
              const isDateToday = dateStr === TODAY_REF_DATE;
              const isDatePast = dateStr < TODAY_REF_DATE;
              const delayedInDateCount = datePosts.filter((p) =>
                isPostDelayed(p)
              ).length;

              return (
                <div key={dateStr} className="space-y-2">
                  {/* Date Section Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                        {formatSectionDate(dateStr)}
                      </h3>
                      {isDateToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#C44D34]/15 text-[#C44D34]">
                          TODAY
                        </span>
                      )}
                      {isDatePast && delayedInDateCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-red-600 text-white shadow-2xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>
                            {delayedInDateCount} Delayed • Not Scheduled
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-stone-400 tabular-nums">
                      {datePosts.length} {datePosts.length === 1 ? 'post' : 'posts'}
                    </span>
                  </div>

                  {/* List View Rows for this Date */}
                  <div
                    className={`rounded-2xl border divide-y overflow-hidden shadow-2xs ${
                      isDark
                        ? 'bg-[#1D242C] border-[#2A3440] divide-[#26303D]'
                        : 'bg-white border-[#E8E4DC] divide-[#EFECE6]'
                    }`}
                  >
                    {datePosts.map((post) => {
                      const isDelayed = isPostDelayed(post);
                      const isSelected = selectedPostIds.includes(post.id);
                      const catColor =
                        CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                      const thumbUrl =
                        post.media?.[0]?.thumbnailUrl ||
                        post.media?.[0]?.url ||
                        post.mediaUrl;
                      const isVideo =
                        post.media?.[0]?.type === 'video' ||
                        post.mediaType === 'video';

                      return (
                        <div
                          key={post.id}
                          onClick={() => onEditPost(post)}
                          className={`p-3 sm:px-4 sm:py-3 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isDelayed
                              ? isDark
                                ? 'bg-red-950/30 hover:bg-red-950/45 border-l-4 border-l-red-500'
                                : 'bg-red-50/80 hover:bg-red-50 border-l-4 border-l-red-500'
                              : isSelected
                              ? isDark
                                ? 'bg-[#C44D34]/15'
                                : 'bg-[#C44D34]/10'
                              : isDark
                              ? 'hover:bg-[#161D25]'
                              : 'hover:bg-[#FAF8F5]'
                          }`}
                        >
                          {/* Left Side: Thumbnail + Platform + Title + Client & Caption */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {thumbUrl ? (
                              <div className="relative w-12 h-12 rounded-xl bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                                <img
                                  src={thumbUrl}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                {isVideo && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <Play className="w-3 h-3 fill-white text-white" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className={`w-12 h-12 rounded-xl shrink-0 border flex items-center justify-center ${
                                  isDark
                                    ? 'bg-[#151C24] border-[#2A3440]'
                                    : 'bg-[#FAF7F2] border-[#E8E4DC]'
                                }`}
                              >
                                <PlatformLogo
                                  platform={post.platform}
                                  size="sm"
                                  showLabel={false}
                                />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: catColor.dot }}
                                />
                                <span
                                  className="font-extrabold text-[10px] uppercase tracking-wider shrink-0"
                                  style={{ color: catColor.text }}
                                >
                                  {post.category}
                                </span>
                                <span className="text-stone-400">•</span>
                                <span className="text-xs font-bold text-stone-700 dark:text-stone-200 truncate">
                                  {post.clientName}
                                </span>
                                <span className="text-stone-400">•</span>
                                <PlatformLogo
                                  platform={post.platform}
                                  size="xs"
                                  showLabel={false}
                                />
                                {isDelayed && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>DELAYED</span>
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate">
                                {post.title}
                              </h4>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                                {post.caption}
                              </p>
                            </div>
                          </div>

                          {/* Right Side: Date, Per-Post Status Dropdown, Download/Media, and Tick Mark at the End */}
                          <div
                            className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/50 dark:border-stone-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              className={`text-[11px] font-extrabold tabular-nums ${
                                isDelayed
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-stone-400'
                              }`}
                            >
                              {post.date}
                            </span>

                            {/* Per-Post Status Dropdown for instant status changes */}
                            {onBulkUpdateStatus ? (
                              <select
                                aria-label={`Change status for ${post.title}`}
                                value={normalizePostStatus(post.status)}
                                onChange={(e) => {
                                  const nextStatus = e.target.value as PostStatus;
                                  onBulkUpdateStatus([post.id], nextStatus);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-colors ${
                                  STATUS_STYLES[normalizePostStatus(post.status)]?.badge ||
                                  (isDark
                                    ? 'bg-[#161E27] border-[#2A3440] text-stone-200'
                                    : 'bg-stone-100 border-stone-200 text-stone-700')
                                }`}
                              >
                                {POST_STAGES.map((stage) => (
                                  <option
                                    key={stage}
                                    value={stage}
                                    className={
                                      isDark
                                        ? 'bg-[#1D242C] text-stone-100'
                                        : 'bg-white text-stone-900'
                                    }
                                  >
                                    {stage}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <StatusStageBadge status={post.status} size="xs" />
                            )}

                            {thumbUrl ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadMediaFile(thumbUrl, post.title);
                                }}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-[#C44D34] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                title="Download media"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditPost(post);
                                }}
                                className="text-[10px] font-bold text-stone-400 hover:text-[#C44D34] flex items-center gap-1 px-2 py-1 rounded-lg border border-transparent hover:border-stone-200 dark:hover:border-stone-700 cursor-pointer"
                              >
                                <ImagePlus className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">+ Media</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>
    </PullToRefreshContainer>
  );
};
