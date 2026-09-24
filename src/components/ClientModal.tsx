import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Client } from '../types';

interface ClientModalProps {
  isOpen: boolean;
  clientToEdit?: Client | null;
  onClose: () => void;
  onSave: (clientData: { id?: string; name: string; handle: string; color: string; notes?: string }) => void;
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

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  clientToEdit,
  onClose,
  onSave,
  isDark,
}) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setHandle(clientToEdit.handle);
      setColor(clientToEdit.color || PRESET_COLORS[0]);
      setNotes(clientToEdit.notes || '');
    } else {
      setName('');
      setHandle('');
      setColor(PRESET_COLORS[0]);
      setNotes('');
    }
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...(clientToEdit ? { id: clientToEdit.id } : {}),
      name: name.trim(),
      handle: handle.trim().startsWith('@') ? handle.trim() : handle.trim() ? `@${handle.trim()}` : '',
      color,
      notes: notes.trim(),
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
        className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl animate-scale-up transition-colors ${
          isDark
            ? 'bg-[#1C232B] border-[#2E3A47] text-white'
            : 'bg-white border-[#E8E4DC] text-[#1E252B]'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <h3 className="text-base font-bold tracking-tight">
            {clientToEdit ? 'Edit Client' : 'New Client'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600"
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

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Handle
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="e.g. @nimbusfit"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                isDark
                  ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                  : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
              }`}
            />
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
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
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
              rows={3}
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-bold uppercase tracking-wider shadow-sm"
            >
              {clientToEdit ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
