import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Client, ClientSocialLink, Platform } from '../types';
import { PlatformLogo } from './PlatformLogo';

interface ClientModalProps {
  isOpen: boolean;
  clientToEdit?: Client | null;
  onClose: () => void;
  onSave: (clientData: {
    id?: string;
    name: string;
    handle: string;
    color: string;
    notes?: string;
    socialUrl?: string;
    socialLinks?: ClientSocialLink[];
  }) => void;
  isDark?: boolean;
}

const PRESET_COLORS = [
  '#C44D34', // Terracotta Red
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#475569', // Slate
];

const PLATFORMS: Platform[] = [
  'Instagram',
  'LinkedIn',
  'Twitter',
  'TikTok',
  'Facebook',
  'YouTube',
  'Other',
];

function normalizeExternalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function detectPlatformFromUrl(url: string, fallback: Platform = 'Instagram'): Platform {
  const lower = url.toLowerCase();
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('twitter') || lower.includes('x.com')) return 'Twitter';
  if (lower.includes('tiktok')) return 'TikTok';
  if (lower.includes('facebook') || lower.includes('fb.com')) return 'Facebook';
  if (lower.includes('youtube') || lower.includes('youtu.be')) return 'YouTube';
  if (lower.includes('instagram') || lower.includes('instagr.am')) return 'Instagram';
  return fallback;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  clientToEdit,
  onClose,
  onSave,
  isDark,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [notes, setNotes] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<ClientSocialLink[]>([]);
  const [draftPlatform, setDraftPlatform] = useState<Platform>('Instagram');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftUrl, setDraftUrl] = useState('');

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setColor(clientToEdit.color || PRESET_COLORS[0]);
      setNotes(clientToEdit.notes || '');
      const existingLinks: ClientSocialLink[] =
        clientToEdit.socialLinks && clientToEdit.socialLinks.length > 0
          ? clientToEdit.socialLinks
          : clientToEdit.socialUrl
          ? [
              {
                platform: detectPlatformFromUrl(clientToEdit.socialUrl),
                url: clientToEdit.socialUrl,
                label: clientToEdit.handle || undefined,
              },
            ]
          : [];
      setSocialLinks(existingLinks);
      setSocialUrl(clientToEdit.socialUrl || existingLinks[0]?.url || '');
      setDraftPlatform('Instagram');
      setDraftLabel('');
      setDraftUrl('');
    } else {
      setName('');
      setColor(PRESET_COLORS[0]);
      setNotes('');
      setSocialUrl('');
      setSocialLinks([]);
      setDraftPlatform('Instagram');
      setDraftLabel('');
      setDraftUrl('');
    }
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddSocialLink = () => {
    const formatted = normalizeExternalUrl(draftUrl);
    if (!formatted) return;
    const autoPlatform = detectPlatformFromUrl(formatted, draftPlatform);
    const cleanLabel = draftLabel.trim();
    const newEntry: ClientSocialLink = {
      platform: draftPlatform !== 'Instagram' ? draftPlatform : autoPlatform,
      url: formatted,
      ...(cleanLabel ? { label: cleanLabel, handle: cleanLabel } : {}),
    };
    setSocialLinks((prev) => [...prev, newEntry]);
    if (!socialUrl.trim()) {
      setSocialUrl(formatted);
    }
    setDraftLabel('');
    setDraftUrl('');
  };

  const handleUpdateSocialLinkField = (
    index: number,
    field: keyof ClientSocialLink,
    value: string
  ) => {
    setSocialLinks((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'platform') {
          return { ...item, platform: value as Platform };
        }
        if (field === 'label') {
          return { ...item, label: value, handle: value };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveSocialLink = (index: number) => {
    setSocialLinks((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length === 0) {
        setSocialUrl('');
      } else if (socialUrl === prev[index]?.url) {
        setSocialUrl(next[0].url);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalLinks = socialLinks
      .map((l) => ({
        ...l,
        url: normalizeExternalUrl(l.url),
        label: l.label?.trim() || l.handle?.trim() || undefined,
      }))
      .filter((l) => Boolean(l.url));

    if (draftUrl.trim()) {
      const extraFormatted = normalizeExternalUrl(draftUrl);
      if (extraFormatted) {
        const autoPlatform = detectPlatformFromUrl(extraFormatted, draftPlatform);
        finalLinks.push({
          platform: draftPlatform !== 'Instagram' ? draftPlatform : autoPlatform,
          url: extraFormatted,
          ...(draftLabel.trim()
            ? { label: draftLabel.trim(), handle: draftLabel.trim() }
            : {}),
        });
      }
    }

    const cleanPrimaryUrl =
      normalizeExternalUrl(socialUrl) || finalLinks[0]?.url || undefined;

    if (cleanPrimaryUrl && !finalLinks.some((l) => l.url === cleanPrimaryUrl)) {
      finalLinks = [
        {
          platform: detectPlatformFromUrl(cleanPrimaryUrl),
          url: cleanPrimaryUrl,
        },
        ...finalLinks,
      ];
    }

    const rawHandleCandidate =
      finalLinks[0]?.label ||
      finalLinks[0]?.handle ||
      clientToEdit?.handle ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');

    const derivedHandle = rawHandleCandidate
      ? rawHandleCandidate.startsWith('@')
        ? rawHandleCandidate
        : `@${rawHandleCandidate}`
      : '';

    onSave({
      ...(clientToEdit ? { id: clientToEdit.id } : {}),
      name: name.trim(),
      handle: derivedHandle,
      color,
      notes: notes.trim(),
      socialUrl: cleanPrimaryUrl,
      socialLinks: finalLinks,
    });
    onClose();
  };

  return (
    <div
      id="client-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        id="client-modal-content"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl animate-scale-up transition-colors ${
          isDark
            ? 'bg-[#1C232B] border-[#2E3A47] text-white'
            : 'bg-white border-[#E8E4DC] text-[#1E252B]'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h3 className="text-base font-bold tracking-tight">
              {clientToEdit ? 'Edit Client & Social Accounts' : 'New Client & Social Accounts'}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Add multiple social account links for 1-click redirect from the Client Page
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Client Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nimbus Fitness"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                isDark
                  ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                  : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
              }`}
            />
          </div>

          {/* Multiple Client Social Accounts Manager */}
          <div
            className={`p-3.5 rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#161D24] border-[#2A3542]' : 'bg-[#FAF8F5] border-[#EAE4D9]'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#C44D34]" />
                <span>Social Accounts & Redirect Links ({socialLinks.length})</span>
              </label>
              <span className="text-[10px] font-semibold text-[#C44D34]">
                1-Click Redirect Enabled
              </span>
            </div>

            {/* Existing Social Account Rows (Editable inline — Platform + URL only) */}
            {socialLinks.length > 0 && (
              <div className="space-y-2">
                {socialLinks.map((item, idx) => (
                  <div
                    key={`social-account-${idx}`}
                    className={`p-2 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2 ${
                      isDark ? 'bg-[#1D252F] border-[#2E3A48]' : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <PlatformLogo platform={item.platform} size="xs" showLabel={false} />
                      <select
                        value={item.platform}
                        onChange={(e) =>
                          handleUpdateSocialLinkField(idx, 'platform', e.target.value)
                        }
                        className={`px-2 py-1 rounded-lg border text-[11px] font-bold focus:outline-none focus:border-[#C44D34] ${
                          isDark
                            ? 'bg-[#252E38] border-[#34414D] text-white'
                            : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) =>
                        handleUpdateSocialLinkField(idx, 'url', e.target.value)
                      }
                      placeholder="https://..."
                      className={`flex-1 min-w-0 px-2.5 py-1 rounded-lg border text-[11px] focus:outline-none focus:border-[#C44D34] ${
                        isDark
                          ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-500'
                          : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                      }`}
                    />

                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      {item.url && (
                        <a
                          href={normalizeExternalUrl(item.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-[#C44D34] hover:bg-[#C44D34]/10 transition-colors"
                          title="Test 1-click redirect"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(idx)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remove account link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Account Row (Platform + URL only) */}
            <div className="pt-1 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                + Add Social Account Link
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                <select
                  value={draftPlatform}
                  onChange={(e) => setDraftPlatform(e.target.value as Platform)}
                  className={`px-2.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white'
                      : 'bg-white border-stone-200 text-stone-900'
                  }`}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSocialLink();
                    }
                  }}
                  placeholder="Paste profile URL (e.g. instagram.com/brand)"
                  className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-500'
                      : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />

                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="px-3.5 py-2 rounded-xl bg-[#C44D34] hover:bg-[#b0432c] text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  title="Add social account link"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Link</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Brand Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative cursor-pointer"
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Notes / Bio
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brief description or focus of client..."
              className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#C44D34] resize-none ${
                isDark
                  ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                  : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
              }`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
            >
              {clientToEdit ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
