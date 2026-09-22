import React from 'react';

interface ToastProps {
  message: string | null;
  isDark?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, isDark }) => {
  if (!message) return null;

  return (
    <div
      id="app-toast-container"
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-slide-up"
    >
      <div
        id="app-toast-bubble"
        className={`px-5 py-3.5 rounded-xl shadow-xl border text-sm font-semibold tracking-wide flex items-center gap-2.5 transition-colors ${
          isDark
            ? 'bg-[#222A32] text-white border-[#34414D] shadow-black/40'
            : 'bg-white text-[#1E252B] border-[#E8E4DC] shadow-stone-900/10'
        }`}
      >
        <span>{message}</span>
      </div>
    </div>
  );
};
