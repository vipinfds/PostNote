import React from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Users,
  Trash2,
  LogOut,
  ChevronRight,
  Bot,
  CreditCard,
} from 'lucide-react';
import { ThemeMode, SubscriptionState, WorkspaceRole } from '../types';

interface SettingsViewProps {
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  onBack: () => void;
  onNavigateToTeam: () => void;
  onNavigateToBilling: () => void;
  onNavigateToAiAssistants?: () => void;
  subscription?: SubscriptionState;
  currentUser?: {
    name: string;
    email: string;
    role?: string;
  } | null;
  myRole?: WorkspaceRole;
  teamMembersCount?: number;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  isDark?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSetTheme,
  onBack,
  onNavigateToTeam,
  onNavigateToBilling,
  onNavigateToAiAssistants,
  subscription,
  currentUser,
  myRole = 'Owner',
  teamMembersCount,
  onSignOut,
  onDeleteAccount,
  isDark,
}) => {
  const planName =
    subscription?.planId === 'free'
      ? 'Free Tier'
      : subscription?.planId === 'solo'
      ? 'Solo Pro'
      : subscription?.planId === 'studio'
      ? 'Studio Pro'
      : subscription?.planId === 'enterprise'
      ? 'Enterprise'
      : 'Agency Plan';

  const displayName = currentUser?.name || 'Studio User';
  const displayEmail = currentUser?.email || 'Not signed in';
  const initials =
    displayName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'ST';

  return (
    <div
      id="settings-view"
      className={`min-h-[780px] pb-28 lg:pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Settings</h2>
            <p className="text-[11px] text-stone-400">
              Account, Team Members, Plans &amp; Billing, and AI Assistants &amp; MCP
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {/* User profile card */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#C44D34]/15 text-[#C44D34] font-bold flex items-center justify-center text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                  {displayName}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C44D34]/10 text-[#C44D34]">
                  {myRole}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {displayEmail}
              </p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className={`px-3.5 py-2 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              isDark
                ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                : 'border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Studio Administration & Integrations Hub (Team Members, Plans & Billing, AI Assistants & MCP) */}
        <div
          className={`p-4 rounded-2xl border shadow-xs space-y-3 transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Workspace Administration &amp; Integrations
          </h3>

          <div className="grid grid-cols-1 gap-2.5">
            {/* 1. Team Members */}
            <button
              id="settings-nav-team"
              type="button"
              onClick={onNavigateToTeam}
              className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                isDark
                  ? 'bg-[#161D25] border-[#263240] hover:border-[#C44D34]'
                  : 'bg-[#FAF8F5] border-[#E8E2D8] hover:border-[#C44D34]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#C44D34]/15 text-[#C44D34] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                      Team Members
                    </span>
                    {typeof teamMembersCount === 'number' && (
                      <span className="px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold tabular-nums">
                        {teamMembersCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    Add teammates, assign workspace roles &amp; send sign-up invitations
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#C44D34] shrink-0" />
            </button>

            {/* 2. Plans & Billing */}
            <button
              id="settings-nav-billing"
              type="button"
              onClick={onNavigateToBilling}
              className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                isDark
                  ? 'bg-[#161D25] border-[#263240] hover:border-[#C44D34]'
                  : 'bg-[#FAF8F5] border-[#E8E2D8] hover:border-[#C44D34]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                      Plans &amp; Billing
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#C44D34]/15 text-[#C44D34] text-[10px] font-extrabold uppercase">
                      {planName}
                    </span>
                    {subscription?.isTrial && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase">
                        {subscription.trialDaysLeft}d Trial
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    Manage studio subscription, client quotas, and billing preferences
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#C44D34] shrink-0" />
            </button>

            {/* 3. AI Assistants & MCP */}
            {onNavigateToAiAssistants && (
              <button
                id="settings-nav-ai-assistants"
                type="button"
                onClick={onNavigateToAiAssistants}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                  isDark
                    ? 'bg-[#161D25] border-[#263240] hover:border-[#C44D34]'
                    : 'bg-[#FAF8F5] border-[#E8E2D8] hover:border-[#C44D34]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#C44D34]/15 text-[#C44D34] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                        AI Assistants &amp; MCP
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-[#C44D34] text-white text-[9px] font-extrabold uppercase">
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      Connect Claude Desktop, Cursor, ChatGPT Actions &amp; MCP endpoints
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#C44D34] shrink-0" />
              </button>
            )}
          </div>
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
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
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
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
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
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
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
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-950 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
