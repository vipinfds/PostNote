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
} from 'lucide-react';
import { Post, Client, PostCategory, SubscriptionState } from '../types';
import {
  CATEGORY_COLORS,
  STATUS_STYLES,
  formatLongDate,
  getTodayParts,
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
  const selectedDayPosts = getPostsForDate(activeScheduleDate);

  // Date-range counts for Agenda ('upcoming', 'past', 'all')
  const upcomingCount = filteredPosts.filter((p) => p.date >= TODAY_REF_DATE).length;
  const pastCount = filteredPosts.filter((p) => p.date < TODAY_REF_DATE).length;
  const allCount = filteredPosts.length;

  // Filter Agenda posts by date-range ('upcoming', 'past', 'all')
  const agendaPosts = filteredPosts
    .filter((p) => {
      if (agendaRangeFilter === 'upcoming') return p.date >= TODAY_REF_DATE;
      if (agendaRangeFilter === 'past') return p.date < TODAY_REF_DATE;
      return true;
    })
    .slice()
    .sort((a, b) =>
      agendaRangeFilter === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );

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
      {/* Brand Header (Full hero title on Desktop; compact plan bar on Mobile since Mobile Top Header already shows PostNote) */}
      <header className="flex flex-col items-center justify-center pb-1.5 sm:pb-2">
        <h1
          id="brand-logo"
          className="hidden lg:block font-serif text-[36px] font-bold tracking-tight text-[#C44D34] select-none"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          PostNote
        </h1>
        {onNavigateToBilling && (
          <button
            onClick={onNavigateToBilling}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#C44D34]/10 text-[#C44D34] hover:bg-[#C44D34]/20 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>
              {subscription?.isTrial
                ? `Agency Trial • ${subscription.trialDaysLeft}d left`
                : subscription?.planId === 'free'
                ? 'Free Plan • Upgrade'
                : `${subscription?.planId.toUpperCase()} Pro`}
            </span>
          </button>
        )}
      </header>

      {/* Month Switcher & Today Button */}
      <div className="flex items-center justify-between mt-1 mb-3.5 px-0.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="prev-month-btn"
            onClick={prevMonth}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? 'text-stone-300 hover:text-white hover:bg-stone-800'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <h2
            id="calendar-month-title"
            className="text-base sm:text-[17px] font-bold tracking-tight min-w-[130px] text-center sm:text-left"
          >
            {monthNames[currentMonth]} {currentYear}
          </h2>

          <button
            id="next-month-btn"
            onClick={nextMonth}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? 'text-stone-300 hover:text-white hover:bg-stone-800'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        <button
          id="today-nav-btn"
          onClick={jumpToToday}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            isDark
              ? 'bg-stone-800 text-stone-200 border border-stone-700 hover:bg-stone-700'
              : 'bg-white text-stone-700 border border-stone-300/80 hover:bg-stone-100 shadow-2xs'
          }`}
        >
          TODAY ({todayParts.shortLabel})
        </button>
      </div>

      {/* Calendar Header Bar + Client Filter Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300/70 dark:border-stone-800 mb-3.5 px-1">
        <div className="flex items-center">
          <div
            id="subtab-calendar"
            className="pb-2 px-2 text-xs font-bold tracking-widest uppercase relative text-[#C44D34]"
          >
            CALENDAR
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C44D34] rounded-full" />
          </div>
        </div>

        {/* Client Calendar & Agenda Filter Dropdown */}
        <div className="pb-2 flex items-center gap-2 max-w-full">
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

      {/* 1. Calendar View + Inline Today's Schedule (On Mobile: stacked after Calendar and above Agenda; On Desktop: side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column (lg:col-span-7): Calendar Grid & Legend */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Calendar Grid Container */}
          <div
            id="calendar-grid-card"
            className={`rounded-2xl border p-2 sm:p-2.5 shadow-xs transition-colors ${
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
                  className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase"
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-y-1 pt-1.5">
              {calendarDays.map((cell, idx) => {
                const dayPosts = getPostsForDate(cell.dateStr);
                const isSelected = activeScheduleDate === cell.dateStr;
                const isOffMonth = cell.monthOffset !== 0;

                return (
                  <button
                    key={idx}
                    id={`cal-day-${cell.dateStr}`}
                    onClick={() => setSelectedDayDate(cell.dateStr)}
                    className={`min-h-[48px] sm:min-h-[58px] p-1 flex flex-col items-center justify-start rounded-xl transition-all relative group cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-stone-800/70 ring-1 ring-[#C44D34]/85'
                          : 'bg-stone-100/80 ring-1 ring-[#C44D34]/80'
                        : 'hover:bg-stone-100/70 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    {/* Day number with circular today badge */}
                    <div className="w-6 h-6 flex items-center justify-center">
                      {cell.isToday ? (
                        <span className="w-6 h-6 rounded-full bg-[#181E24] dark:bg-white text-white dark:text-[#181E24] font-bold text-xs flex items-center justify-center shadow-xs tabular-nums">
                          {cell.dayNum}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-medium tabular-nums ${
                            isOffMonth
                              ? 'text-stone-300 dark:text-stone-600'
                              : isDark
                              ? 'text-stone-200'
                              : 'text-stone-800'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                      )}
                    </div>

                    {/* Post dots */}
                    <div className="flex flex-wrap items-center justify-center gap-1 mt-1 max-w-[36px]">
                      {dayPosts.slice(0, 3).map((post, pIdx) => {
                        const col = CATEGORY_COLORS[post.category]?.dot || '#C44D34';
                        return (
                          <span
                            key={pIdx}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: col }}
                            title={`${post.category}: ${post.title}`}
                          />
                        );
                      })}
                      {dayPosts.length > 3 && (
                        <span className="w-1 h-1 rounded-full bg-stone-400" />
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

        {/* Today’s Schedule Card (Visible on BOTH Mobile and Desktop: right after Calendar and above Agenda on mobile) */}
        <div id="todays-schedule-section" className="lg:col-span-5 space-y-4">
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate">
                  {isTodaySelected
                    ? `Today’s Schedule • ${formatLongDate(activeScheduleDate)}`
                    : formatLongDate(activeScheduleDate)}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 tabular-nums block truncate">
                  {selectedDayPosts.length} post{selectedDayPosts.length === 1 ? '' : 's'} scheduled
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

            {/* Day's posts */}
            <div className="space-y-2.5 mt-3 max-h-[360px] overflow-y-auto pr-0.5">
              {selectedDayPosts.length === 0 ? (
                <div className="text-center py-7">
                  <p className="text-xs text-stone-400">
                    No posts queued for {isTodaySelected ? 'today' : formatLongDate(activeScheduleDate)}
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
                  const statStyle = STATUS_STYLES[post.status] || STATUS_STYLES.Planned;

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

      {/* 2. Agenda Section Directly Below Calendar & Today's Schedule (With Upcoming / Past / All Toggle) */}
      <div className="mt-6 sm:mt-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-300/70 dark:border-stone-800 pb-2.5 mb-4 px-1">
          <div className="flex items-center gap-2">
            <span
              id="subtab-agenda"
              className="text-xs font-bold tracking-widest uppercase text-[#C44D34]"
            >
              AGENDA • {selectedClientObj ? selectedClientObj.name : 'ALL CLIENTS'}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#C44D34]/10 text-[#C44D34] tabular-nums">
              {agendaPosts.length}{' '}
              {agendaRangeFilter === 'upcoming'
                ? 'upcoming'
                : agendaRangeFilter === 'past'
                ? 'past'
                : 'total'}
            </span>
          </div>

          {/* Segmented Date-Range Toggle: Upcoming | Past | All */}
          <div
            id="agenda-date-range-filter"
            className={`p-1 rounded-xl border flex items-center gap-1 self-start sm:self-auto ${
              isDark ? 'bg-[#18202A] border-[#2A3646]' : 'bg-stone-200/70 border-stone-200'
            }`}
          >
            {(
              [
                { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
                { id: 'past', label: 'Past', count: pastCount },
                { id: 'all', label: 'All', count: allCount },
              ] as const
            ).map((tab) => {
              const active = agendaRangeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`agenda-range-${tab.id}`}
                  type="button"
                  onClick={() => setAgendaRangeFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#181E24] dark:bg-[#C44D34] text-white shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-stone-800 text-stone-400'
                        : 'bg-white/70 text-stone-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {agendaPosts.length === 0 ? (
          <div
            className={`p-7 sm:p-8 rounded-2xl border text-center ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {agendaRangeFilter === 'upcoming'
                ? `No upcoming posts scheduled${selectedClientObj ? ` for ${selectedClientObj.name}` : ''}.`
                : agendaRangeFilter === 'past'
                ? `No past posts found${selectedClientObj ? ` for ${selectedClientObj.name}` : ''}.`
                : `No posts scheduled${selectedClientObj ? ` for ${selectedClientObj.name}` : ''}.`}
            </p>
            <button
              type="button"
              onClick={() =>
                onOpenNewPost(
                  activeScheduleDate,
                  selectedClientId !== 'ALL' ? selectedClientId : undefined
                )
              }
              className="mt-2.5 px-4 py-2 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              + Schedule Post{selectedClientObj ? ` for ${selectedClientObj.name}` : ''}
            </button>
          </div>
        ) : (
          <div id="agenda-view-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {agendaPosts.map((post) => {
              const statStyle = STATUS_STYLES[post.status] || STATUS_STYLES.Planned;
              const isPast = post.date < TODAY_REF_DATE;

              return (
                <div
                  key={post.id}
                  onClick={() => onEditPost(post)}
                  className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                    isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[post.category]?.dot }}
                      />
                      <span
                        className="font-bold text-[10px] tracking-wider shrink-0"
                        style={{ color: CATEGORY_COLORS[post.category]?.text }}
                      >
                        {post.category}
                      </span>
                      <span className="text-stone-400">•</span>
                      <span className="text-stone-600 dark:text-stone-300 font-medium truncate">
                        {post.clientName}
                      </span>
                      <span className="text-stone-400">•</span>
                      <PlatformLogo platform={post.platform} size="xs" showLabel={false} />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusStageBadge status={post.status} size="xs" />
                      <span
                        className={`text-[10px] uppercase font-bold tabular-nums ${
                          isPast ? 'text-stone-400' : 'text-[#C44D34]'
                        }`}
                      >
                        {post.date}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                    {post.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                    {post.caption}
                  </p>

                  {/* Media Preview or Add Media */}
                  {((post.media && post.media.length > 0) || post.mediaUrl) ? (
                    <div
                      className="mt-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MediaCarousel
                        mediaItems={
                          post.media && post.media.length > 0
                            ? post.media
                            : [
                                {
                                  id: `media-${post.id}`,
                                  title: post.title || 'Attached Media',
                                  type: post.mediaType || 'image',
                                  url: post.mediaUrl,
                                  thumbnailUrl: post.mediaUrl,
                                },
                              ]
                        }
                        fallbackTitle={post.title}
                        heightClass="aspect-video max-h-[155px]"
                        showCaptionBar={false}
                        isDark={isDark}
                      />
                    </div>
                  ) : (
                    <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <span className="text-[10px] text-stone-400">No media</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPost(post);
                        }}
                        className="text-[10px] font-semibold text-stone-500 hover:text-[#C44D34] flex items-center gap-1 cursor-pointer"
                      >
                        <ImagePlus className="w-3 h-3" />
                        <span>+ Add Media</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (+) positioned above sticky mobile bottom nav */}
      <button
        id="fab-new-post"
        onClick={() =>
          onOpenNewPost(
            activeScheduleDate,
            selectedClientId !== 'ALL' ? selectedClientId : undefined
          )
        }
        className="fixed bottom-20 lg:bottom-8 right-5 sm:right-6 z-20 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#C44D34] hover:bg-[#B33E26] text-white shadow-lg shadow-[#C44D34]/30 flex items-center justify-center transition-transform active:scale-95 focus:outline-none cursor-pointer"
        aria-label="Create new post"
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
      </button>
      </div>
    </PullToRefreshContainer>
  );
};
