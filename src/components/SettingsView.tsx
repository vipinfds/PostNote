import React from 'react';
import { ArrowLeft, Sun, Moon, Monitor, Users, Trash2, LogOut } from 'lucide-react';
import { ThemeMode } from '../types';

interface SettingsViewProps {
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  onBack: () => void;
  onNavigateToTeam: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  isDark?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSetTheme,
  onBack,
  onNavigateToTeam,
  onSignOut,
  onDeleteAccount,
  isDark,
}) => {
  return (
    <div
      id="settings-view"
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
          <h2 className="text-base font-bold tracking-tight">Settings</h2>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {/* User profile card */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold flex items-center justify-center text-sm">
              VI
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">vipin</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                vipin@firstdraftstudio.in
              </p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isDark
                ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                : 'border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Appearance card */}
        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
            Appearance
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onSetTheme('light')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'border-[#C44D34] bg-[#C44D34]/5 text-[#C44D34]'
                  : isDark
                  ? 'border-[#2A3440] hover:bg-stone-800 text-stone-400'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-600'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </button>

            <button
              onClick={() => onSetTheme('dark')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'border-[#C44D34] bg-[#C44D34]/5 text-[#C44D34]'
                  : isDark
                  ? 'border-[#2A3440] hover:bg-stone-800 text-stone-400'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-600'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </button>

            <button
              onClick={() => onSetTheme('system')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'border-[#C44D34] bg-[#C44D34]/5 text-[#C44D34]'
                  : isDark
                  ? 'border-[#2A3440] hover:bg-stone-800 text-stone-400'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-600'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Your team card */}
        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#C44D34]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Your team
            </h3>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
            Invite your team — everyone you invite shares this private workspace. Other workspaces can't see your clients or posts.
          </p>

          <button
            onClick={onNavigateToTeam}
            className="w-full py-2.5 rounded-xl bg-[#181E24] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
          >
            Manage team
          </button>
        </div>

        {/* Delete account card */}
        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">
            Delete account
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
            Permanently delete your account along with all your clients and posts. This action cannot be undone.
          </p>

          <button
            onClick={onDeleteAccount}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-950 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
