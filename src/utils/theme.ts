import { PostCategory, PostStatus } from '../types';

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

export const STATUS_STYLES: Record<PostStatus, { badge: string; text: string }> = {
  Published: {
    badge: 'bg-[#EAF7EE] dark:bg-emerald-950/70 text-[#15803D] dark:text-emerald-400 border border-[#CDEED5] dark:border-emerald-800/60',
    text: 'PUBLISHED',
  },
  Scheduled: {
    badge: 'bg-[#EBF3FC] dark:bg-blue-950/70 text-[#1D4ED8] dark:text-blue-400 border border-[#CFE2FA] dark:border-blue-800/60',
    text: 'SCHEDULED',
  },
  'In review': {
    badge: 'bg-[#F4EFFB] dark:bg-purple-950/70 text-[#7E22CE] dark:text-purple-400 border border-[#E5DAF6] dark:border-purple-800/60',
    text: 'IN_REVIEW',
  },
  Approved: {
    badge: 'bg-[#E8F8F5] dark:bg-teal-950/70 text-[#0F766E] dark:text-teal-400 border border-[#C8EFE7] dark:border-teal-800/60',
    text: 'APPROVED',
  },
  Planned: {
    badge: 'bg-[#F2F1ED] dark:bg-stone-800 text-[#57534E] dark:text-stone-300 border border-[#E5E2DC] dark:border-stone-700',
    text: 'PLANNED',
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
