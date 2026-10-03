import React, { useState, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshContainerProps {
  onRefresh?: () => Promise<void> | void;
  isDark?: boolean;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 64;
const MAX_PULL_DISTANCE = 96;

export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  onRefresh,
  isDark,
  children,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onRefresh || isRefreshing) return;
    const scrollTop =
      typeof window !== 'undefined'
        ? window.scrollY || document.documentElement.scrollTop
        : 0;
    if (scrollTop > 4) {
      startYRef.current = null;
      isPullingRef.current = false;
      return;
    }

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    startXRef.current = touch.clientX;
    isPullingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onRefresh || isRefreshing || !isPullingRef.current || startYRef.current === null) {
      return;
    }

    const scrollTop =
      typeof window !== 'undefined'
        ? window.scrollY || document.documentElement.scrollTop
        : 0;
    if (scrollTop > 4) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    const touch = e.touches[0];
    const deltaY = touch.clientY - startYRef.current;
    const deltaX = startXRef.current !== null ? touch.clientX - startXRef.current : 0;

    // Ignore horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return;
    }

    if (deltaY > 0) {
      const damped = Math.min(deltaY * 0.45, MAX_PULL_DISTANCE);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!onRefresh || isRefreshing || !isPullingRef.current) {
      setPullDistance(0);
      return;
    }

    isPullingRef.current = false;
    startYRef.current = null;
    startXRef.current = null;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(52);
      try {
        await Promise.all([
          Promise.resolve(onRefresh()),
          new Promise((resolve) => setTimeout(resolve, 350)),
        ]);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const isReadyToRefresh = pullDistance >= PULL_THRESHOLD;
  const showIndicator = pullDistance > 8 || isRefreshing;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full"
    >
      {/* Elastic Pull-to-Refresh Top Indicator */}
      <div
        aria-live="polite"
        style={{
          height: showIndicator ? `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` : '0px',
          opacity: showIndicator ? Math.min(pullDistance / 40, 1) : 0,
        }}
        className="w-full overflow-hidden flex items-center justify-center transition-all duration-150 ease-out pointer-events-none select-none"
      >
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold shadow-xs ${
            isDark
              ? 'bg-[#1D242C] border-[#2A3440] text-stone-200'
              : 'bg-white border-[#E8E4DC] text-stone-700'
          }`}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[#C44D34] animate-spin" />
              <span>Syncing workspace...</span>
            </>
          ) : (
            <>
              <ArrowDown
                style={{
                  transform: `rotate(${isReadyToRefresh ? 180 : 0}deg)`,
                }}
                className="w-3.5 h-3.5 text-[#C44D34] transition-transform duration-150"
              />
              <span>{isReadyToRefresh ? 'Release to refresh' : 'Pull down to sync'}</span>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};
