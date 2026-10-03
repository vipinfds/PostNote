import { PostCategory, PostStatus } from '../types';

export const POST_STAGES: PostStatus[] = [
  'Planned',
  'In review',
  'Approved',
  'Scheduled',
];

export function normalizePostStatus(status?: string): PostStatus {
  if (status === 'In review') return 'In review';
  if (status === 'Approved') return 'Approved';
  if (status === 'Scheduled' || status === 'Published') return 'Scheduled';
  return 'Planned';
}

export const CATEGORY_COLORS: Record<
  PostCategory,
  { dot: string; text: string; bg: string; darkText: string; darkBg: string }
> = {
  POST: { dot: '#C44D34', text: '#C44D34', bg: '#FDF2F0', darkText: '#E25C43', darkBg: 'rgba(196, 77, 52, 0.22)' },
  TIPS: { dot: '#2563EB', text: '#2563EB', bg: '#EFF6FF', darkText: '#60A5FA', darkBg: 'rgba(37, 99, 235, 0.22)' },
  'BEHIND THE SCENES': { dot: '#15803D', text: '#15803D', bg: '#F0FDF4', darkText: '#4ADE80', darkBg: 'rgba(21, 128, 61, 0.22)' },
  QUOTE: { dot: '#9333EA', text: '#9333EA', bg: '#FAF5FF', darkText: '#C084FC', darkBg: 'rgba(147, 51, 234, 0.22)' },
  EDUCATE: { dot: '#D97706', text: '#D97706', bg: '#FFFBEB', darkText: '#FBBF24', darkBg: 'rgba(217, 119, 6, 0.22)' },
  ENGAGE: { dot: '#E11D48', text: '#E11D48', bg: '#FFF1F2', darkText: '#FB7185', darkBg: 'rgba(225, 29, 72, 0.22)' },
  RELAX: { dot: '#0D9488', text: '#0D9488', bg: '#F0FDFA', darkText: '#2DD4BF', darkBg: 'rgba(13, 148, 136, 0.22)' },
};

export function getCategoryBadgeStyle(category: PostCategory, isDark?: boolean) {
  const cat = CATEGORY_COLORS[category] || CATEGORY_COLORS.POST;
  return {
    color: isDark ? cat.darkText : cat.text,
    backgroundColor: isDark ? cat.darkBg : cat.bg,
  };
}

export const STATUS_STYLES: Record<
  PostStatus,
  {
    badge: string;
    text: string;
    label: string;
    hex: string;
    dotClass: string;
    iconColor: string;
  }
> = {
  Planned: {
    badge:
      'bg-[#F2F1ED] dark:bg-stone-800 text-[#57534E] dark:text-stone-300 border border-[#E5E2DC] dark:border-stone-700',
    text: 'PLANNED',
    label: 'Planned',
    hex: '#78716C',
    dotClass: 'bg-stone-500',
    iconColor: 'text-stone-600 dark:text-stone-300',
  },
  'In review': {
    badge:
      'bg-[#FFFBEB] dark:bg-amber-950/70 text-[#D97706] dark:text-amber-400 border border-[#FDE68A] dark:border-amber-800/60',
    text: 'IN REVIEW',
    label: 'In review',
    hex: '#D97706',
    dotClass: 'bg-amber-500',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  Approved: {
    badge:
      'bg-[#EAF7EE] dark:bg-emerald-950/70 text-[#15803D] dark:text-emerald-400 border border-[#CDEED5] dark:border-emerald-800/60',
    text: 'APPROVED',
    label: 'Approved',
    hex: '#16A34A',
    dotClass: 'bg-emerald-500',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  Scheduled: {
    badge:
      'bg-[#EBF3FC] dark:bg-blue-950/70 text-[#1D4ED8] dark:text-blue-400 border border-[#CFE2FA] dark:border-blue-800/60',
    text: 'SCHEDULED',
    label: 'Scheduled',
    hex: '#2563EB',
    dotClass: 'bg-blue-500',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

// Format date to "Tuesday, September 1"
export function formatLongDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Format date to "FRI, SEP 25"
export function formatSectionDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${weekday}, ${monthName} ${day}`;
  } catch {
    return dateStr;
  }
}

// Format date to "DD/MM/YYYY" for input fields
export function formatInputDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

export function parseInputDate(displayStr: string): string {
  try {
    const [d, m, y] = displayStr.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  } catch {
    return displayStr;
  }
}

// Get current local date as "YYYY-MM-DD" synced with user's system clock
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get current local year, 0-indexed month, day, and short label ("Oct 3")
export function getTodayParts(): {
  year: number;
  monthIndex: number;
  day: number;
  dateStr: string;
  shortLabel: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const day = now.getDate();
  const month = String(monthIndex + 1).padStart(2, '0');
  const dayPadded = String(day).padStart(2, '0');
  const shortMonth = now.toLocaleDateString('en-US', { month: 'short' });
  return {
    year,
    monthIndex,
    day,
    dateStr: `${year}-${month}-${dayPadded}`,
    shortLabel: `${shortMonth} ${day}`,
  };
}

// Compute campaign duration summary from a list of posts and optional campaign start/end dates
export function computeCampaignDuration(
  posts: { date: string }[],
  startDate?: string,
  endDate?: string
): {
  startStr: string | null;
  endStr: string | null;
  daysSpan: number;
  label: string;
} {
  const dates = posts.map((p) => p.date).filter(Boolean).sort();
  const minDate = startDate || (dates.length > 0 ? dates[0] : null);
  const maxDate = endDate || (dates.length > 0 ? dates[dates.length - 1] : null);

  if (!minDate || !maxDate) {
    return {
      startStr: null,
      endStr: null,
      daysSpan: 0,
      label: 'No schedule dates yet',
    };
  }

  try {
    const d1 = new Date(`${minDate}T00:00:00`);
    const d2 = new Date(`${maxDate}T00:00:00`);
    const diffMs = Math.max(0, d2.getTime() - d1.getTime());
    const daysSpan = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const label =
      minDate === maxDate
        ? `${fmt(d1)} (1 Day)`
        : `${fmt(d1)} – ${fmt(d2)} · ${daysSpan} Days`;
    return {
      startStr: minDate,
      endStr: maxDate,
      daysSpan,
      label,
    };
  } catch {
    return {
      startStr: minDate,
      endStr: maxDate,
      daysSpan: 1,
      label: `${minDate} – ${maxDate}`,
    };
  }
}
