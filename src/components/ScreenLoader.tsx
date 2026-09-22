import React from 'react';

interface ScreenLoaderProps {
  isDark?: boolean;
}

export const ScreenLoader: React.FC<ScreenLoaderProps> = ({ isDark }) => {
  return (
    <div
      id="screen-loader"
      aria-label="Loading..."
      className="w-full flex-1 min-h-[400px] flex items-center justify-center animate-fade-in"
    >
      <div
        className={`w-7 h-7 rounded-full border-2 border-t-[#C44D34] animate-spin ${
          isDark ? 'border-[#2D3748]' : 'border-[#E5E0D8]'
        }`}
      />
    </div>
  );
};
