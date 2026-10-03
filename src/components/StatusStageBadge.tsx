import React from 'react';
import {
  FileEdit,
  Clock,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';
import { PostStatus } from '../types';
import { STATUS_STYLES, normalizePostStatus } from '../utils/theme';

interface StatusStageBadgeProps {
  status: PostStatus | string;
  size?: 'xs' | 'sm' | 'md';
  showText?: boolean;
  className?: string;
}

export const getStageIcon = (
  status: PostStatus | string,
  className = 'w-3 h-3 shrink-0'
) => {
  const normalized = normalizePostStatus(status);
  switch (normalized) {
    case 'Planned':
      return <FileEdit className={className} />;
    case 'In review':
      return <Clock className={className} />;
    case 'Approved':
      return <CheckCircle2 className={className} />;
    case 'Scheduled':
      return <CalendarCheck className={className} />;
  }
};

export const StatusStageBadge: React.FC<StatusStageBadgeProps> = ({
  status,
  size = 'xs',
  showText = true,
  className = '',
}) => {
  const normalized = normalizePostStatus(status);
  const style = STATUS_STYLES[normalized] || STATUS_STYLES.Planned;

  const sizeClasses =
    size === 'md'
      ? 'px-2.5 py-1 text-[11px] gap-1.5 rounded-lg'
      : size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1 rounded-md'
      : 'px-1.5 py-0.5 text-[9px] gap-1 rounded-md';

  const iconSize =
    size === 'md'
      ? 'w-3.5 h-3.5 shrink-0'
      : size === 'sm'
      ? 'w-3 h-3 shrink-0'
      : 'w-2.5 h-2.5 shrink-0';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider shrink-0 ${sizeClasses} ${style.badge} ${className}`}
      title={`Stage: ${style.label}`}
    >
      {getStageIcon(normalized, iconSize)}
      {showText && <span>{style.text}</span>}
    </span>
  );
};
