import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Film, Image as ImageIcon, Play } from 'lucide-react';
import { Post, PostCategory } from '../types';
import { CATEGORY_COLORS, STATUS_STYLES, formatLongDate } from '../utils/theme';

interface HomeViewProps {
  posts: Post[];
  onOpenNewPost: (initialDate?: string) => void;
  onEditPost: (post: Post) => void;
  isDark?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  posts,
  onOpenNewPost,
  onEditPost,
  isDark,
}) => {
  // Calendar month state (default to September 2026 as in the video)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 0-indexed: 8 is September
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'agenda'>('calendar');
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

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
    setCurrentYear(2026);
    setCurrentMonth(8); // September 2026
    setSelectedDayDate('2026-09-20');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Generate calendar grid days (Monday-first)
  // First day of current month
  const firstDayObj = new Date(currentYear, currentMonth, 1);
  // getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
  // We want Monday = 0, Sunday = 6
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
    const isToday = currentYear === 2026 && currentMonth === 8 && i === 20;
    calendarDays.push({
      dayNum: i,
      monthOffset: 0,
      dateStr,
      isToday,
    });
  }

  // Next month leading days (fill up to 35 or 42 cells)
  const remaining = 35 - calendarDays.length > 0 ? 35 - calendarDays.length : (42 - calendarDays.length > 0 ? 42 - calendarDays.length : 0);
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

  // Get posts for a specific date
  const getPostsForDate = (dateStr: string) => {
    return posts.filter((p) => p.date === dateStr);
  };

  const selectedDayPosts = selectedDayDate ? getPostsForDate(selectedDayDate) : [];

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
    <div
      id="home-view"
      className={`relative min-h-[780px] pb-24 px-4 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Brand Header */}
      <header className="flex flex-col items-center justify-center pt-1 pb-3">
        <h1
          id="brand-logo"
          className="font-serif text-[32px] sm:text-[36px] font-bold tracking-tight text-[#C44D34] select-none"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          PostNote
        </h1>
      </header>

      {/* Month Switcher & Today Button */}
      <div className="flex items-center justify-between mt-1 mb-4 px-1">
        <div className="flex items-center gap-3">
          <button
            id="prev-month-btn"
            onClick={prevMonth}
            className={`p-1.5 rounded-full transition-colors ${
              isDark
                ? 'text-stone-400 hover:text-white hover:bg-stone-800'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <h2
            id="calendar-month-title"
            className="text-[17px] font-bold tracking-tight min-w-[140px]"
          >
            {monthNames[currentMonth]} {currentYear}
          </h2>

          <button
            id="next-month-btn"
            onClick={nextMonth}
            className={`p-1.5 rounded-full transition-colors ${
              isDark
                ? 'text-stone-400 hover:text-white hover:bg-stone-800'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        <button
          id="today-nav-btn"
          onClick={jumpToToday}
          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
            isDark
              ? 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
              : 'bg-white text-stone-600 border border-stone-300/80 hover:bg-stone-100 shadow-xs'
          }`}
        >
          TODAY
        </button>
      </div>

      {/* Sub Tabs: CALENDAR vs AGENDA */}
      <div className="flex border-b border-stone-300/70 dark:border-stone-800 mb-4 px-2">
        <button
          id="subtab-calendar"
          onClick={() => setActiveSubTab('calendar')}
          className={`pb-2.5 px-3 text-xs font-bold tracking-widest uppercase transition-all relative ${
            activeSubTab === 'calendar'
              ? 'text-[#C44D34]'
              : isDark
              ? 'text-stone-400 hover:text-stone-200'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          CALENDAR
          {activeSubTab === 'calendar' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C44D34] rounded-full" />
          )}
        </button>

        <button
          id="subtab-agenda"
          onClick={() => setActiveSubTab('agenda')}
          className={`pb-2.5 px-3 text-xs font-bold tracking-widest uppercase transition-all relative ${
            activeSubTab === 'agenda'
              ? 'text-[#C44D34]'
              : isDark
              ? 'text-stone-400 hover:text-stone-200'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          AGENDA
          {activeSubTab === 'agenda' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C44D34] rounded-full" />
          )}
        </button>
      </div>

      {activeSubTab === 'calendar' ? (
        <>
          {/* Calendar Grid Container */}
          <div
            id="calendar-grid-card"
            className={`rounded-2xl border p-2 shadow-xs transition-colors ${
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
                const isSelected = selectedDayDate === cell.dateStr;
                const isOffMonth = cell.monthOffset !== 0;

                return (
                  <button
                    key={idx}
                    id={`cal-day-${cell.dateStr}`}
                    onClick={() => setSelectedDayDate(cell.dateStr)}
                    className={`min-h-[52px] sm:min-h-[58px] p-1 flex flex-col items-center justify-start rounded-xl transition-all relative group ${
                      isSelected
                        ? isDark
                          ? 'bg-stone-800/90 ring-2 ring-[#C44D34]'
                          : 'bg-stone-100 ring-2 ring-[#C44D34]'
                        : 'hover:bg-stone-100/70 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    {/* Day number with circular today badge */}
                    <div className="w-6 h-6 flex items-center justify-center">
                      {cell.isToday ? (
                        <span className="w-6 h-6 rounded-full bg-[#181E24] dark:bg-white text-white dark:text-[#181E24] font-bold text-xs flex items-center justify-center shadow-xs">
                          {cell.dayNum}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
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
            className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 mt-4 px-2"
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

          {/* Slogan Banner Card */}
          <div
            id="content-connects-banner"
            className={`mt-6 p-4 rounded-2xl border text-center transition-colors ${
              isDark
                ? 'bg-[#182028] border-[#2A3440]'
                : 'bg-white/90 border-[#E8E4DC]'
            }`}
          >
            <p className="text-[13px] font-black tracking-tight text-[#C44D34] uppercase">
              Content that connects. Consistency that grows.
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 font-medium">
              <span>• Plan with purpose</span>
              <span>• Stay consistent</span>
              <span>• Create impact</span>
            </div>
            <div className="mt-2.5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 tracking-widest">
              ☕ — POSTNOTE —
            </div>
          </div>
        </>
      ) : (
        /* Agenda View */
        <div id="agenda-view-list" className="space-y-3">
          {posts
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((post) => (
              <div
                key={post.id}
                onClick={() => onEditPost(post)}
                className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                  isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[post.category]?.dot }}
                    />
                    <span
                      className="font-bold text-[10px] tracking-wider"
                      style={{ color: CATEGORY_COLORS[post.category]?.text }}
                    >
                      {post.category}
                    </span>
                    <span className="text-stone-400">•</span>
                    <span className="text-stone-600 dark:text-stone-300 font-medium">
                      {post.clientName}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-stone-400">
                    {post.date}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  {post.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                  {post.caption}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Floating Action Button (+) */}
      <button
        id="fab-new-post"
        onClick={() => onOpenNewPost(selectedDayDate || undefined)}
        className="fixed bottom-20 right-6 z-20 w-13 h-13 rounded-full bg-[#C44D34] hover:bg-[#B33E26] text-white shadow-lg shadow-[#C44D34]/30 flex items-center justify-center transition-transform active:scale-95 focus:outline-none"
        aria-label="Create new post"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Day Details Bottom Sheet Modal (as in video 00:09 - 00:14) */}
      {selectedDayDate && (
        <div
          id="day-bottom-sheet-backdrop"
          onClick={() => setSelectedDayDate(null)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] flex flex-col justify-end animate-fade-in"
        >
          <div
            id="day-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md mx-auto rounded-t-3xl border-t px-5 pt-3 pb-8 max-h-[75vh] overflow-y-auto animate-slide-up shadow-2xl transition-colors ${
              isDark
                ? 'bg-[#181F26] border-[#2E3A47] text-white'
                : 'bg-[#FAF7F2] border-[#E8E3DA] text-[#1E252B]'
            }`}
          >
            {/* Top drag handle */}
            <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mb-4" />

            {/* Header: Date + Count */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold tracking-tight">
                {formatLongDate(selectedDayDate)}
              </h3>
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {selectedDayPosts.length} POST{selectedDayPosts.length === 1 ? '' : 'S'}
              </span>
            </div>

            {/* Post Cards */}
            <div className="space-y-3 mt-4">
              {selectedDayPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-stone-500">No posts scheduled for this date.</p>
                  <button
                    onClick={() => {
                      onOpenNewPost(selectedDayDate);
                      setSelectedDayDate(null);
                    }}
                    className="mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-[#C44D34] text-white hover:bg-[#B33E26] shadow-xs"
                  >
                    + Schedule Post for this day
                  </button>
                </div>
              ) : (
                selectedDayPosts.map((post) => {
                  const catStyle = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.POST;
                  const statStyle = STATUS_STYLES[post.status] || STATUS_STYLES.Planned;

                  return (
                    <div
                      key={post.id}
                      onClick={() => {
                        onEditPost(post);
                        setSelectedDayDate(null);
                      }}
                      className={`p-4 rounded-2xl border shadow-xs cursor-pointer hover:border-[#C44D34] transition-all ${
                        isDark
                          ? 'bg-[#202832] border-[#2C3744]'
                          : 'bg-white border-[#E8E4DC]'
                      }`}
                    >
                      {/* Meta header */}
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded"
                            style={{
                              color: catStyle.text,
                              backgroundColor: catStyle.bg,
                            }}
                          >
                            {post.category}
                          </span>
                          <span className="text-stone-600 dark:text-stone-300 font-medium text-xs">
                            {post.clientName}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400 font-medium">
                          {post.platform}
                        </span>
                      </div>

                      {/* Post Title */}
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1">
                        {post.title}
                      </h4>

                      {/* Caption */}
                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1">
                        {post.caption}
                      </p>

                      {/* Attached Media Previews */}
                      {((post.media && post.media.length > 0) || post.mediaUrl) && (
                        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
                          {post.media && post.media.length > 0 ? (
                            post.media.slice(0, 3).map((m, idx) => (
                              <div
                                key={m.id || idx}
                                className="relative w-16 h-12 rounded-lg bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700"
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
                            <div className="relative w-16 h-12 rounded-lg bg-stone-900 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
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

                      {/* Status Tag */}
                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${statStyle.badge}`}
                        >
                          {statStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
