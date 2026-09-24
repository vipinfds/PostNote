import React, { useState, useRef } from 'react';
import { ArrowLeft, Plus, Play, Pause, Trash2, X, Film, Image as ImageIcon } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaLibraryViewProps {
  mediaFiles: MediaItem[];
  onBack: () => void;
  onUploadMedia: (item: Omit<MediaItem, 'id' | 'createdAt'>) => void;
  onDeleteMedia: (id: string) => void;
  isDark?: boolean;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({
  mediaFiles,
  onBack,
  onUploadMedia,
  onDeleteMedia,
  isDark,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    const fakeUrl = URL.createObjectURL(file);

    onUploadMedia({
      title: file.name,
      type: isVid ? 'video' : 'image',
      url: fakeUrl,
      duration: isVid ? '0:15' : undefined,
    });
  };

  return (
    <div
      id="media-library-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Media Library</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
              {mediaFiles.length} FILES
            </span>
          </div>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Grid of media items (2 columns) */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {mediaFiles.map((file) => {
          const isVideo = file.type === 'video';

          return (
            <div
              key={file.id}
              className={`rounded-2xl border overflow-hidden relative shadow-xs flex flex-col transition-all group ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
              }`}
            >
              {/* Media Visual Area */}
              <div className="relative aspect-[4/3] bg-stone-900 overflow-hidden flex items-center justify-center">
                {isVideo ? (
                  <video
                    src={file.url || file.videoSrc || 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-studio-setting-41716-large.mp4'}
                    poster={file.thumbnailUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    onPlay={() => setPlayingId(file.id)}
                    onPause={() => setPlayingId(null)}
                  />
                ) : (
                  <img
                    src={file.url || file.thumbnailUrl}
                    alt={file.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Delete button floating top right */}
                <button
                  onClick={() => onDeleteMedia(file.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors"
                  title="Delete file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Type Badge */}
                <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/70 text-white flex items-center gap-1">
                  {isVideo ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {isVideo ? file.duration || 'VIDEO' : 'IMAGE'}
                </span>
              </div>

              {/* Title & Info */}
              <div className="p-2.5">
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                  {file.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
