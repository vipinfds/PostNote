import { PostCategory, PostStatus } from '../types';

export const CATEGORY_COLORS: Record<PostCategory, { dot: string; text: string; bg: string }> = {
  POST: { dot: '#C44D34', text: '#C44D34', bg: '#FDF2F0' },
  TIPS: { dot: '#2563EB', text: '#2563EB', bg: '#EFF6FF' },
  'BEHIND THE SCENES': { dot: '#15803D', text: '#15803D', bg: '#F0FDF4' },
  QUOTE: { dot: '#9333EA', text: '#9333EA', bg: '#FAF5FF' },
  EDUCATE: { dot: '#D97706', text: '#D97706', bg: '#FFFBEB' },
  ENGAGE: { dot: '#E11D48', text: '#E11D48', bg: '#FFF1F2' },
  RELAX: { dot: '#0D9488', text: '#0D9488', bg: '#F0FDFA' },
};

export const STATUS_STYLES: Record<PostStatus, { badge: string; text: string }> = {
  Published: {
    badge: 'bg-[#EAF7EE] text-[#15803D] border border-[#CDEED5]',
    text: 'PUBLISHED',
  },
  Scheduled: {
    badge: 'bg-[#EBF3FC] text-[#1D4ED8] border border-[#CFE2FA]',
    text: 'SCHEDULED',
  },
  'In review': {
    badge: 'bg-[#F4EFFB] text-[#7E22CE] border border-[#E5DAF6]',
    text: 'IN_REVIEW',
  },
  Approved: {
    badge: 'bg-[#E8F8F5] text-[#0F766E] border border-[#C8EFE7]',
    text: 'APPROVED',
  },
  Planned: {
    badge: 'bg-[#F2F1ED] text-[#57534E] border border-[#E5E2DC]',
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
