import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Image as ImageIcon,
  Film,
  Plus,
  Check,
  FolderKanban,
  Play,
  Eye,
  Link as LinkIcon,
  Download,
  ImagePlus,
  Sparkles,
} from 'lucide-react';
import { Post, Client, Campaign, PostCategory, PostPlatform, PostStatus, MediaItem } from '../types';
import { downloadMediaFile } from '../utils/mediaDownload';

interface PostFormViewProps {
  initialPost?: Post | null;
  clients: Client[];
  campaigns: Campaign[];
  mediaLibrary?: MediaItem[];
  preselectedClientId?: string;
  preselectedDate?: string;
  onBack: () => void;
  onSave: (postData: Omit<Post, 'id' | 'createdAt'> & { id?: string }) => void;
  onCreateClient?: (clientData: {
    name: string;
    handle: string;
    color: string;
    notes?: string;
  }) => Client | void;
  onDelete?: (postId: string) => void;
  onUploadToLibrary?: (item: Omit<MediaItem, 'id' | 'createdAt'>) => void;
  isDark?: boolean;
}

const QUICK_CLIENT_COLORS = [
  '#C44D34',
  '#2E6F40',
  '#2563EB',
  '#7C3AED',
  '#D97706',
  '#0D9488',
  '#E11D48',
  '#4F46E5',
];

export const PostFormView: React.FC<PostFormViewProps> = ({
  initialPost,
  clients,
  campaigns,
  mediaLibrary = [],
  preselectedClientId,
  preselectedDate,
  onBack,
  onSave,
  onCreateClient,
  onDelete,
  onUploadToLibrary,
  isDark,
}) => {
  const isEditing = Boolean(initialPost);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [clientId, setClientId] = useState<string>(
    initialPost?.clientId || preselectedClientId || (clients[0]?.id || '')
  );
  const [isAddingNewClient, setIsAddingNewClient] = useState<boolean>(clients.length === 0);
  const [newClientName, setNewClientName] = useState('');
  const [newClientHandle, setNewClientHandle] = useState('');
  const [newClientColor, setNewClientColor] = useState('#C44D34');

  const handleCreateInlineClient = () => {
    if (!newClientName.trim() || !onCreateClient) return;
    const rawHandle = newClientHandle.trim() || newClientName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const formattedHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    const created = onCreateClient({
      name: newClientName.trim(),
      handle: formattedHandle,
      color: newClientColor,
      notes: '',
    });
    if (created && created.id) {
      setClientId(created.id);
    }
    setNewClientName('');
    setNewClientHandle('');
    setIsAddingNewClient(false);
  };
  const [campaignId, setCampaignId] = useState<string>(
    initialPost?.campaignId || ''
  );
  const [date, setDate] = useState<string>(
    initialPost?.date || preselectedDate || '2026-09-20'
  );
  const [status, setStatus] = useState<PostStatus>(
    initialPost?.status || 'Planned'
  );
  const [category, setCategory] = useState<PostCategory>(
    initialPost?.category || 'POST'
  );
  const [platform, setPlatform] = useState<PostPlatform>(
    initialPost?.platform || 'Instagram'
  );
  const [title, setTitle] = useState<string>(initialPost?.title || '');
  const [caption, setCaption] = useState<string>(initialPost?.caption || '');

  // Media attachments state
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>(() => {
    if (initialPost?.media && initialPost.media.length > 0) {
      return initialPost.media;
    }
    if (initialPost?.mediaUrl) {
      return [
        {
          id: `media-init-${initialPost.id}`,
          title: initialPost.title || 'Attached Media',
          type: initialPost.mediaType || 'image',
          url: initialPost.mediaUrl,
          thumbnailUrl: initialPost.mediaUrl,
        },
      ];
    }
    return [];
  });

  // UI state for media features
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlType, setUrlType] = useState<'image' | 'video'>('image');
  const [previewMediaItem, setPreviewMediaItem] = useState<MediaItem | null>(null);

  // Date picker popover state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => {
    const d = initialPost?.date || preselectedDate || '2026-09-20';
    return parseInt(d.split('-')[0], 10) || 2026;
  });
  const [pickerMonth, setPickerMonth] = useState(() => {
    const d = initialPost?.date || preselectedDate || '2026-09-20';
    return (parseInt(d.split('-')[1], 10) || 9) - 1;
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Handle local files (Drag & Drop or File Selector)
  const handleProcessFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    fileArray.forEach((file) => {
      const isVideo = file.type.startsWith('video');
      const blobUrl = URL.createObjectURL(file);
      const newItem: MediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: file.name,
        type: isVideo ? 'video' : 'image',
        url: blobUrl,
        thumbnailUrl: isVideo ? undefined : blobUrl,
        duration: isVideo ? '0:15' : undefined,
        createdAt: new Date().toISOString(),
      };

      setAttachedMedia((prev) => [...prev, newItem]);

      // Sync with user's media library
      if (onUploadToLibrary) {
        onUploadToLibrary({
          title: file.name,
          type: isVideo ? 'video' : 'image',
          url: blobUrl,
          thumbnailUrl: isVideo ? undefined : blobUrl,
          duration: isVideo ? '0:15' : undefined,
        });
      }
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    setAttachedMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  // Add from URL
  const handleAddFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const newItem: MediaItem = {
      id: `media-url-${Date.now()}`,
      title: urlInput.split('/').pop()?.split('?')[0] || 'Web Asset',
      type: urlType,
      url: urlInput.trim(),
      thumbnailUrl: urlType === 'image' ? urlInput.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    setAttachedMedia((prev) => [...prev, newItem]);
    setUrlInput('');
    setIsUrlInputOpen(false);
  };

  const handleAddSampleMedia = () => {
    const samples: MediaItem[] = [
      {
        id: `sample-${Date.now()}-1`,
        title: 'Editorial Studio Shoot',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
      },
      {
        id: `sample-${Date.now()}-2`,
        title: 'Minimalist Architecture Reel',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
        duration: '0:15',
        createdAt: new Date().toISOString(),
      },
    ];
    setAttachedMedia((prev) => [...prev, samples[prev.length % 2]]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedClient = clients.find((c) => c.id === clientId);
    const clientName = selectedClient ? selectedClient.name : 'Unknown';

    onSave({
      ...(initialPost ? { id: initialPost.id } : {}),
      clientId,
      clientName,
      campaignId: campaignId || undefined,
      title: title.trim(),
      caption: caption.trim(),
      date,
      status,
      category,
      platform,
      media: attachedMedia,
      mediaUrl: attachedMedia[0]?.url || attachedMedia[0]?.thumbnailUrl,
      mediaType: attachedMedia[0]?.type,
    });
  };

  // Calendar calculations for picker
  const firstDayObj = new Date(pickerYear, pickerMonth, 1);
  let firstDayIndex = firstDayObj.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(pickerMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    setDate(`${pickerYear}-${mStr}-${dStr}`);
    setIsDatePickerOpen(false);
  };

  const categories: PostCategory[] = [
    'POST',
    'TIPS',
    'BEHIND THE SCENES',
    'QUOTE',
    'EDUCATE',
    'ENGAGE',
    'RELAX',
  ];

  const platforms: PostPlatform[] = [
    'Instagram',
    'Facebook',
    'LinkedIn',
    'Twitter',
    'TikTok',
    'Other',
  ];

  const statuses: PostStatus[] = [
    'Planned',
    'In review',
    'Approved',
    'Scheduled',
    'Published',
  ];

  // Client's campaigns
  const availableCampaigns = campaigns.filter(
    (camp) => !camp.clientId || camp.clientId === clientId
  );

  return (
    <div
      id="post-form-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Top Bar with Back, Title & Delete (if editing) */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <button
          id="post-form-back-btn"
          onClick={onBack}
          className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <h2 className="text-base font-bold tracking-tight">
          {isEditing ? 'Edit post' : 'New post'}
        </h2>

        {isEditing && onDelete ? (
          <button
            id="post-form-delete-btn"
            onClick={() => {
              if (initialPost?.id) onDelete(initialPost.id);
            }}
            className="p-1.5 -mr-1 text-red-500 hover:text-red-700 transition-colors"
            aria-label="Delete post"
          >
            <Trash2 className="w-5 h-5 stroke-[2]" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {/* CLIENT (with direct + Add New Client option in dropdown) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              CLIENT
            </label>
            <button
              type="button"
              onClick={() => setIsAddingNewClient((prev) => !prev)}
              className="text-[11px] font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>{isAddingNewClient ? 'Cancel New Client' : 'Add New Client'}</span>
            </button>
          </div>

          <select
            id="post-form-client-select"
            value={isAddingNewClient ? '__ADD_NEW_CLIENT__' : clientId}
            onChange={(e) => {
              if (e.target.value === '__ADD_NEW_CLIENT__') {
                setIsAddingNewClient(true);
              } else {
                setIsAddingNewClient(false);
                setClientId(e.target.value);
              }
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all cursor-pointer ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-200'
                : 'bg-white border-[#E8E4DC] text-stone-800 shadow-xs'
            }`}
          >
            {clients.length === 0 && (
              <option value="" disabled>
                No clients yet — select &quot;+ Add New Client...&quot;
              </option>
            )}
            {clients.map((c) => (
              <option
                key={c.id}
                value={c.id}
                className="bg-white dark:bg-[#1D242C] text-stone-800 dark:text-stone-200"
              >
                {c.name} ({c.handle})
              </option>
            ))}
            <option
              value="__ADD_NEW_CLIENT__"
              className="bg-white dark:bg-[#1D242C] font-bold text-[#C44D34]"
            >
              + Add New Client...
            </option>
          </select>

          {/* Inline Quick Add Client Drawer */}
          {isAddingNewClient && (
            <div
              className={`mt-2.5 p-3.5 rounded-2xl border space-y-3 animate-fade-in ${
                isDark ? 'bg-[#171E26] border-[#2C3846]' : 'bg-[#FAF7F2] border-[#E5DEC9]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C44D34]">
                  Create New Client Directly
                </span>
                {clients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewClient(false)}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Client / Brand Name *
                  </label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="e.g. Acme Studio"
                    maxLength={100}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                      isDark
                        ? 'bg-[#222B35] border-[#32404E] text-white'
                        : 'bg-white border-stone-200 text-stone-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Social Handle
                  </label>
                  <input
                    type="text"
                    value={newClientHandle}
                    onChange={(e) => setNewClientHandle(e.target.value)}
                    placeholder="@acmestudio"
                    maxLength={100}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                      isDark
                        ? 'bg-[#222B35] border-[#32404E] text-white'
                        : 'bg-white border-stone-200 text-stone-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">
                    Color:
                  </span>
                  {QUICK_CLIENT_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewClientColor(col)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        newClientColor === col ? 'scale-125 ring-2 ring-offset-1 ring-stone-400' : ''
                      }`}
                      style={{ backgroundColor: col }}
                      aria-label={`Select color ${col}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCreateInlineClient}
                  disabled={!newClientName.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#A83E28] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save & Select Client</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CAMPAIGN */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            CAMPAIGN
          </label>
          <select
            id="post-form-campaign-select"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-200'
                : 'bg-white border-[#E8E4DC] text-stone-800 shadow-xs'
            }`}
          >
            <option value="" className="bg-white dark:bg-[#1D242C] text-stone-800 dark:text-stone-200">No campaign</option>
            {availableCampaigns.map((camp) => (
              <option key={camp.id} value={camp.id} className="bg-white dark:bg-[#1D242C] text-stone-800 dark:text-stone-200">
                {camp.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2-Column: DATE & STATUS */}
        <div className="grid grid-cols-2 gap-3">
          {/* DATE */}
          <div className="relative">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              DATE
            </label>
            <div
              onClick={() => setIsDatePickerOpen(true)}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200'
                  : 'bg-white border-[#E8E4DC] text-stone-800 shadow-xs'
              }`}
            >
              <span>{date}</span>
              <CalendarIcon className="w-4 h-4 text-stone-400" />
            </div>

            {/* Date Picker Popover */}
            {isDatePickerOpen && (
              <div
                id="date-picker-popup"
                className={`absolute z-30 top-full mt-2 left-0 w-64 p-3 rounded-2xl border shadow-xl animate-fade-in ${
                  isDark
                    ? 'bg-[#1C232B] border-[#2E3A47] text-white'
                    : 'bg-white border-[#E8E4DC] text-[#1E252B]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                  <span className="text-xs font-bold">
                    {monthNames[pickerMonth]} {pickerYear}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center pt-2 pb-1 text-[10px] font-bold text-stone-400">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const mStr = String(pickerMonth + 1).padStart(2, '0');
                    const dStr = String(d).padStart(2, '0');
                    const currentSelected = `${pickerYear}-${mStr}-${dStr}` === date;

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectDay(d)}
                        className={`h-7 w-7 text-xs font-semibold rounded-lg flex items-center justify-center transition-colors ${
                          currentSelected
                            ? 'bg-[#C44D34] text-white'
                            : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-200 dark:border-stone-800 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setDate('2026-09-20');
                      setIsDatePickerOpen(false);
                    }}
                    className="text-[#C44D34] hover:underline"
                  >
                    Today (Sep 20)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STATUS */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              STATUS
            </label>
            <select
              id="post-form-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200'
                  : 'bg-white border-[#E8E4DC] text-stone-800 shadow-xs'
              }`}
            >
              {statuses.map((s) => (
                <option key={s} value={s} className="bg-white dark:bg-[#1D242C] text-stone-800 dark:text-stone-200">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column: CATEGORY & PLATFORM */}
        <div className="grid grid-cols-2 gap-3">
          {/* CATEGORY */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              CATEGORY
            </label>
            <select
              id="post-form-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as PostCategory)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200'
                  : 'bg-white border-[#E8E4DC] text-stone-800 shadow-xs'
              }`}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-[#1D242C] text-stone-800 dark:text-stone-200">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* PLATFORM */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              PLATFORM
            </label>
            <select
              id="post-form-platform-select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PostPlatform)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] text-stone-200'
                  : 'bg-white border-[#E8E4DC] text-stone-800 shadow-xs'
              }`}
            >
              {platforms.map((plat) => (
                <option key={plat} value={plat} className="bg-white dark:bg-[#1D242C] text-stone-800 dark:text-stone-200">
                  {plat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TITLE */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            TITLE
          </label>
          <input
            id="post-form-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Winter Collection Teaser"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 placeholder-stone-600'
                : 'bg-white border-[#E8E4DC] text-stone-800 placeholder-stone-400 shadow-xs'
            }`}
          />
        </div>

        {/* CAPTION */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            CAPTION
          </label>
          <textarea
            id="post-form-caption-textarea"
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write the full post caption here..."
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#C44D34] transition-all resize-none ${
              isDark
                ? 'bg-[#1D242C] border-[#2A3440] text-stone-200 placeholder-stone-600'
                : 'bg-white border-[#E8E4DC] text-stone-800 placeholder-stone-400 shadow-xs'
            }`}
          />
        </div>

        {/* MEDIA UPLOAD & DOWNLOAD SECTION */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              MEDIA ATTACHMENTS {attachedMedia.length > 0 && `(${attachedMedia.length})`}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>+ Upload Media</span>
              </button>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <button
                type="button"
                onClick={() => setIsUrlInputOpen((prev) => !prev)}
                className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Add URL</span>
              </button>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <button
                type="button"
                onClick={handleAddSampleMedia}
                className="text-[11px] font-semibold text-stone-500 hover:text-[#C44D34] flex items-center gap-1"
                title="Add sample studio media asset"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sample Stock</span>
              </button>
            </div>
          </div>

          {/* Quick Add URL Form */}
          {isUrlInputOpen && (
            <div
              className={`p-3 mb-3 rounded-xl border flex flex-col gap-2 animate-fade-in ${
                isDark ? 'bg-[#1C232B] border-[#2E3A47]' : 'bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg or video.mp4"
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white'
                      : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
                <select
                  value={urlType}
                  onChange={(e) => setUrlType(e.target.value as 'image' | 'video')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-semibold ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white'
                      : 'bg-white border-stone-300 text-stone-900'
                  }`}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddFromUrl}
                  className="px-3 py-1.5 rounded-lg bg-[#181E24] hover:bg-black text-white text-xs font-bold"
                >
                  Attach
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInputChange}
            className="hidden"
            id="post-media-file-input"
          />

          {/* Drag and Drop Zone */}
          <div
            id="post-media-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-5 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-center ${
              isDraggingOver
                ? 'border-[#C44D34] bg-[#C44D34]/10 scale-[1.01]'
                : isDark
                ? 'border-[#2A3440] hover:border-stone-500 bg-[#1D242C]/60 hover:bg-[#1D242C]'
                : 'border-stone-300 hover:border-stone-400 bg-stone-50 hover:bg-stone-100/80'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#C44D34]/10 text-[#C44D34] flex items-center justify-center mb-2">
              <Upload className="w-5 h-5 stroke-[2.2]" />
            </div>
            <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Drag & drop images or videos here
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              or <span className="text-[#C44D34] font-semibold underline">browse from your computer</span> (PNG, JPG, MP4, MOV)
            </p>
          </div>

          {/* Attached Media Cards Grid */}
          {attachedMedia.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
              {attachedMedia.map((media) => {
                const isVideo = media.type === 'video';
                const displaySrc = media.url || media.thumbnailUrl || media.videoSrc;

                return (
                  <div
                    key={media.id}
                    className={`relative rounded-xl border overflow-hidden group shadow-xs ${
                      isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
                    }`}
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-[4/3] bg-stone-900 overflow-hidden flex items-center justify-center">
                      {isVideo ? (
                        <div className="relative w-full h-full">
                          {media.thumbnailUrl ? (
                            <img
                              src={media.thumbnailUrl}
                              alt={media.title}
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
                            <div className="w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={displaySrc}
                          alt={media.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}

                      {/* Type Badge */}
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-black/70 text-white flex items-center gap-1">
                        {isVideo ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                        {isVideo ? media.duration || 'VIDEO' : 'IMAGE'}
                      </span>

                      {/* Action buttons on hover / overlay */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMediaFile(displaySrc || '', media.title || 'post-media');
                          }}
                          className="p-1 rounded-full bg-black/70 hover:bg-[#C44D34] text-white transition-colors"
                          title="Download media file to computer"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewMediaItem(media);
                          }}
                          className="p-1 rounded-full bg-black/60 hover:bg-black text-white transition-colors"
                          title="Preview full screen"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMedia(media.id);
                          }}
                          className="p-1 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors"
                          title="Remove media"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Quick Download Link */}
                    <div className="p-2 flex items-center justify-between gap-1">
                      <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 truncate">
                        {media.title}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMediaFile(displaySrc || '', media.title || 'post-media');
                        }}
                        className="text-[10px] font-bold text-[#C44D34] hover:underline flex items-center gap-0.5 shrink-0"
                        title="Download media file"
                      >
                        <Download className="w-2.5 h-2.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-3">
          <button
            id="post-form-submit-btn"
            type="submit"
            className="w-full py-3 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white font-bold text-xs tracking-wider uppercase shadow-md transition-all active:scale-[0.99]"
          >
            {isEditing ? 'Save post' : 'Create post'}
          </button>
        </div>
      </form>

      {/* Enlarged Full Media Preview Modal */}
      {previewMediaItem && (
        <div
          onClick={() => setPreviewMediaItem(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setPreviewMediaItem(null)}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {previewMediaItem.type === 'video' ? (
              <video
                src={previewMediaItem.url || previewMediaItem.videoSrc}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[75vh] object-contain"
              />
            ) : (
              <img
                src={previewMediaItem.url || previewMediaItem.thumbnailUrl}
                alt={previewMediaItem.title}
                className="w-full max-h-[75vh] object-contain"
                referrerPolicy="no-referrer"
              />
            )}

            {/* Media details bar with Download button */}
            <div className="w-full p-3 bg-stone-950 text-white text-xs font-semibold flex items-center justify-between">
              <span className="truncate">{previewMediaItem.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/20">
                  {previewMediaItem.type}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    downloadMediaFile(
                      previewMediaItem.url || previewMediaItem.thumbnailUrl || previewMediaItem.videoSrc || '',
                      previewMediaItem.title
                    )
                  }
                  className="px-2.5 py-1 bg-[#C44D34] hover:bg-[#b04028] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Media</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
