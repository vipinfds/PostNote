import React, { useState } from 'react';
import { ArrowLeft, Mail, Trash2 } from 'lucide-react';
import { TeamMember } from '../types';

interface TeamViewProps {
  members: TeamMember[];
  onBack: () => void;
  onInviteMember: (email: string) => void;
  onRemoveMember: (id: string) => void;
  isDark?: boolean;
}

export const TeamView: React.FC<TeamViewProps> = ({
  members,
  onBack,
  onInviteMember,
  onRemoveMember,
  isDark,
}) => {
  const [email, setEmail] = useState('');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    onInviteMember(email.trim());
    setEmail('');
  };

  const activeMembers = members.filter((m) => m.status === 'active');

  return (
    <div
      id="team-view"
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
            <h2 className="text-base font-bold tracking-tight">Your team</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
              {activeMembers.length} MEMBER · PRIVATE WORKSPACE
            </span>
          </div>
        </div>
      </div>

      {/* Invite a teammate card */}
      <div
        className={`mt-4 p-4 rounded-2xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
          Invite a teammate
        </h3>

        <form onSubmit={handleInvite} className="flex gap-2 mt-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
              isDark
                ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-600'
                : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
            }`}
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white text-xs font-bold uppercase tracking-wider shadow-xs shrink-0"
          >
            Invite
          </button>
        </form>
      </div>

      {/* Members list */}
      <div className="space-y-3 mt-4">
        {members.map((member) => (
          <div
            key={member.id}
            className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
            <div className="flex items-center gap-3">
              {member.avatar ? (
                <div className="w-10 h-10 rounded-full bg-stone-300 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center text-xs">
                  {member.avatar}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                    {member.name}
                  </h4>
                  {member.role === 'Owner' && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400">
                  {member.email}
                </p>
                {member.status === 'invited' && (
                  <span className="text-[10px] text-amber-500 font-semibold">
                    Invitation sent
                  </span>
                )}
              </div>
            </div>

            {member.role !== 'Owner' && (
              <button
                onClick={() => onRemoveMember(member.id)}
                className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                title="Remove invitation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
