import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Play,
  Download,
  Eye,
} from 'lucide-react';
import { MediaItem } from '../types';
import { downloadMediaFile } from '../utils/mediaDownload';

interface MediaCarouselProps {
  mediaItems: MediaItem[];
  fallbackTitle?: string;
  heightClass?: string;
  showCaptionBar?: boolean;
  onPreviewMedia?: (item: MediaItem) => void;
  isDark?: boolean;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  mediaItems,
  fallbackTitle = 'Media Asset',
  heightClass = 'aspect-video max-h-[280px]',
  showCaptionBar = true,
  onPreviewMedia,
  isDark,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!mediaItems || mediaItems.length === 0) return null;

  const total = mediaItems.length;
  const safeIndex = activeIndex >= total ? 0 : activeIndex;
  const current = mediaItems[safeIndex];
  const isVideo = current.type === 'video';
  const displaySrc = current.url || current.thumbnailUrl || current.videoSrc || '';

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev <= 0 ? total - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev >= total - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden select-none group ${
        isDark ? 'bg-[#171E26] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
      }`}
    >
      {/* Main Media Viewport */}
      <div
        onClick={(e) => {
          if (onPreviewMedia) {
            e.stopPropagation();
            onPreviewMedia(current);
          }
        }}
        className={`relative w-full bg-stone-950 overflow-hidden flex items-center justify-center ${heightClass} ${
          onPreviewMedia ? 'cursor-pointer' : ''
        }`}
      >
        {isVideo ? (
          <div className="relative w-full h-full">
            {current.thumbnailUrl ? (
              <img
                src={current.thumbnailUrl}
                alt={current.title || fallbackTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <video
                src={displaySrc}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/75 text-white flex items-center justify-center shadow-md">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={displaySrc}
            alt={current.title || fallbackTitle}
            className="w-full h-full object-cover transition-all duration-200"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Top-left Media Type & Counter */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-black/70 text-white flex items-center gap-1 backdrop-blur-xs">
            {isVideo ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
            {isVideo ? current.duration || 'VIDEO' : 'IMAGE'}
          </span>

          {total > 1 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-white tabular-nums backdrop-blur-xs">
              {safeIndex + 1} / {total}
            </span>
          )}
        </div>

        {/* Top-right Quick Actions */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {onPreviewMedia && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewMedia(current);
              }}
              className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white transition-colors cursor-pointer"
              title="Enlarge media"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadMediaFile(displaySrc, current.title || fallbackTitle);
            }}
            className="p-1.5 rounded-lg bg-black/70 hover:bg-[#C44D34] text-white transition-colors cursor-pointer"
            title="Download current slide"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Left & Right Carousel Navigation Buttons */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous media slide"
              title="Previous slide"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-[#C44D34] text-white flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next media slide"
              title="Next slide"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-[#C44D34] text-white flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </>
        )}

        {/* Carousel Pagination Dots */}
        {total > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs flex items-center gap-1.5"
          >
            {mediaItems.map((m, idx) => (
              <button
                key={m.id || idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === safeIndex ? 'w-4 bg-[#C44D34]' : 'w-1.5 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Optional Footer Bar with Slide Title & Thumbnail Strip */}
      {showCaptionBar && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold truncate text-stone-700 dark:text-stone-200">
              {current.title || `${fallbackTitle} (${safeIndex + 1}/${total})`}
            </span>
          </div>

          {total > 1 ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                className={`px-2 py-0.5 rounded border text-[10px] font-bold transition-colors cursor-pointer ${
                  isDark
                    ? 'border-stone-700 text-stone-300 hover:border-[#C44D34]'
                    : 'border-stone-200 text-stone-600 hover:border-[#C44D34]'
                }`}
              >
                Prev
              </button>
              <span className="text-[10px] font-bold text-stone-400 tabular-nums px-1">
                {safeIndex + 1}/{total}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className={`px-2 py-0.5 rounded border text-[10px] font-bold transition-colors cursor-pointer ${
                  isDark
                    ? 'border-stone-700 text-stone-300 hover:border-[#C44D34]'
                    : 'border-stone-200 text-stone-600 hover:border-[#C44D34]'
                }`}
              >
                Next
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadMediaFile(displaySrc, current.title || fallbackTitle);
              }}
              className="text-[10px] font-bold text-[#C44D34] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
