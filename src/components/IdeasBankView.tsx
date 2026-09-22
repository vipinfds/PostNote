import React, { useState } from 'react';
import { ArrowLeft, Plus, CalendarPlus, Pencil, Trash2, X } from 'lucide-react';
import { Idea, Client, PostCategory } from '../types';
import { CATEGORY_COLORS } from '../utils/theme';

interface IdeasBankViewProps {
  ideas: Idea[];
  clients: Client[];
  onBack: () => void;
  onAddToCalendar: (idea: Idea) => void;
  onSaveIdea: (idea: Omit<Idea, 'id' | 'createdAt'> & { id?: string }) => void;
  onDeleteIdea: (id: string) => void;
  isDark?: boolean;
}

export const IdeasBankView: React.FC<IdeasBankViewProps> = ({
  ideas,
  clients,
  onBack,
  onAddToCalendar,
  onSaveIdea,
  onDeleteIdea,
  isDark,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);

  // Form state
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory>('POST');

  const openNewModal = () => {
    setEditingIdea(null);
    setClientId(clients[0]?.id || '');
    setTitle('');
    setDescription('');
    setCategory('POST');
    setIsModalOpen(true);
  };

  const openEditModal = (idea: Idea) => {
    setEditingIdea(idea);
    setClientId(idea.clientId);
    setTitle(idea.title);
    setDescription(idea.description || '');
    setCategory(idea.category);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedClient = clients.find((c) => c.id === clientId);

    onSaveIdea({
      ...(editingIdea ? { id: editingIdea.id } : {}),
      clientId,
      clientName: selectedClient?.name || 'Unknown',
      title: title.trim(),
      description: description.trim(),
      category,
    });
    setIsModalOpen(false);
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

  return (
    <div
      id="ideas-bank-view"
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
            <h2 className="text-base font-bold tracking-tight">Ideas Bank</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
              {ideas.length} SAVED
            </span>
          </div>
        </div>

        <button
          id="new-idea-btn"
          onClick={openNewModal}
          className="px-3.5 py-1.5 bg-[#181E24] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* Ideas List */}
      <div className="space-y-3 mt-4">
        {ideas.map((idea) => {
          const catStyle = CATEGORY_COLORS[idea.category] || CATEGORY_COLORS.POST;

          return (
            <div
              key={idea.id}
              className={`p-4 rounded-2xl border shadow-xs transition-all ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440]'
                  : 'bg-white border-[#E8E4DC]'
              }`}
            >
              {/* Client dot + Name & Category tag */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-400" />
                  <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                    {idea.clientName}
                  </span>
                </div>

                <span
                  className="font-bold text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider"
                  style={{ color: catStyle.text, backgroundColor: catStyle.bg }}
                >
                  {idea.category}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-1">
                {idea.title}
              </h3>

              {/* Description */}
              {idea.description && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  {idea.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={() => onAddToCalendar(idea)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#C44D34] hover:text-[#A73B24] transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 stroke-[2]" />
                  <span>Add to calendar</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(idea)}
                    className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                    aria-label="Edit idea"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteIdea(idea.id)}
                    className="text-stone-400 hover:text-red-500 transition-colors"
                    aria-label="Delete idea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New/Edit Idea Modal */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl animate-scale-up transition-colors ${
              isDark
                ? 'bg-[#1C232B] border-[#2E3A47] text-white'
                : 'bg-white border-[#E8E4DC] text-[#1E252B]'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold">
                {editingIdea ? 'Edit Idea' : 'New Idea'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Client
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PostCategory)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Behind the Scenes video concept"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Description / Draft notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about this idea..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed resize-none ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#181E24] hover:bg-black text-white text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                  {editingIdea ? 'Save' : 'Save Idea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
