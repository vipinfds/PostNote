import React from 'react';
import { Globe } from 'lucide-react';
import { Platform } from '../types';

interface PlatformLogoProps {
  platform: Platform | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const PlatformLogo: React.FC<PlatformLogoProps> = ({
  platform,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const iconDim =
    size === 'xs'
      ? 'w-3 h-3'
      : size === 'md'
      ? 'w-4 h-4'
      : size === 'lg'
      ? 'w-5 h-5'
      : 'w-3.5 h-3.5';

  const textDim =
    size === 'xs'
      ? 'text-[10px]'
      : size === 'md'
      ? 'text-xs'
      : size === 'lg'
      ? 'text-sm'
      : 'text-[11px]';

  const renderSvgLogo = () => {
    const normalized = (platform || '').toLowerCase();

    if (normalized === 'instagram') {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${iconDim} shrink-0`}
          aria-hidden="true"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      );
    }

    if (normalized === 'linkedin') {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${iconDim} shrink-0`}
          aria-hidden="true"
        >
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      );
    }

    if (normalized === 'twitter' || normalized === 'x') {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${iconDim} shrink-0`}
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    }

    if (normalized === 'tiktok') {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${iconDim} shrink-0`}
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    }

    if (normalized === 'facebook') {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${iconDim} shrink-0`}
          aria-hidden="true"
        >
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
        </svg>
      );
    }

    return <Globe className={`${iconDim} shrink-0`} />;
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-200 ${textDim} ${className}`}
      title={platform}
    >
      {renderSvgLogo()}
      {showLabel && <span>{platform}</span>}
    </span>
  );
};
