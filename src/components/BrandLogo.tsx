import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isDark?: boolean;
  className?: string;
}

/**
 * Official PostNote. brand wordmark logo
 * Matches the uploaded PostNote_logo_hires_transparent.png:
 * - Bold editorial serif "PostNote" in deep charcoal (#151B21 in light mode, #F8FAFC in dark mode)
 * - Terracotta-red circular period dot (#B93822 / #C44D34) at the right baseline
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  isDark = false,
  className = '',
}) => {
  const sizeStyles = {
    sm: {
      text: 'text-[17px]',
      dot: 'w-[5px] h-[5px] ml-[1.5px] mb-[3px]',
    },
    md: {
      text: 'text-[21px]',
      dot: 'w-[6px] h-[6px] ml-[2px] mb-[3.5px]',
    },
    lg: {
      text: 'text-[26px]',
      dot: 'w-[7px] h-[7px] ml-[2px] mb-[4.5px]',
    },
    xl: {
      text: 'text-[34px] sm:text-[38px]',
      dot: 'w-[8.5px] h-[8.5px] ml-[2.5px] mb-[6px]',
    },
  }[size];

  return (
    <span
      className={`inline-flex items-baseline select-none leading-none tracking-[-0.025em] ${className}`}
      aria-label="PostNote."
    >
      <span
        className={`font-serif font-black ${sizeStyles.text} ${
          isDark ? 'text-white' : 'text-[#151B21]'
        }`}
        style={{
          fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif",
          fontWeight: 800,
        }}
      >
        PostNote
      </span>
      <span
        className={`inline-block rounded-full bg-[#B93822] shrink-0 ${sizeStyles.dot}`}
        aria-hidden="true"
      />
    </span>
  );
};
