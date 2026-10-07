import React, { useState } from 'react';
import {
  Calendar,
  Users,
  FolderKanban,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  Settings as SettingsIcon,
  Plus,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Building2,
  Shield,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import {
  MainTab,
  MoreSubScreen,
  SubscriptionState,
  ThemeMode,
  WorkspaceRole,
  WorkspaceSummary,
} from '../types';
import { BrandLogo } from './BrandLogo';

interface DesktopSidebarProps {
  activeTab: MainTab;
  activeMoreSubScreen: MoreSubScreen | null;
  onSelectTab: (tab: MainTab) => void;
  onSelectSubScreen: (sub: MoreSubScreen) => void;
  onOpenNewPost: () => void;
  clientsCount: number;
  waitingApprovalsCount: number;
  subscription?: SubscriptionState;
  currentUser?: { name: string; email: string; role: string } | null;
  workspaces?: WorkspaceSummary[];
  activeWorkspaceId?: string;
  myRole?: WorkspaceRole;
  teamMembersCount?: number;
  onSwitchWorkspace?: (workspaceId: string) => void;
  isDark?: boolean;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  activeMoreSubScreen,
  onSelectTab,
  onSelectSubScreen,
  onOpenNewPost,
  clientsCount,
  waitingApprovalsCount,
  subscription,
  currentUser,
  workspaces = [],
  activeWorkspaceId = '',
  myRole = 'Owner',
  teamMembersCount = 1,
  onSwitchWorkspace,
  isDark,
  onToggleTheme,
}) => {
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const workspaceDisplayName =
    activeWorkspace?.name ||
    (currentUser ? `${currentUser.name}'s Private Studio` : 'FirstDraft Studio');

  const coreNavItems: Array<{
    id: MainTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    secondaryBadge?: string;
  }> = [
    {
      id: 'home' as MainTab,
      label: 'Calendar & Feed',
      icon: Calendar,
    },
    {
      id: 'clients' as MainTab,
      label: 'Clients',
      icon: Users,
      badge: clientsCount > 0 ? String(clientsCount) : undefined,
      secondaryBadge:
        waitingApprovalsCount > 0 ? `${waitingApprovalsCount} review` : undefined,
    },
  ];

  const workflowNavItems: Array<{
    id: MoreSubScreen;
    label: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
  }> = [
    {
      id: 'ideas' as MoreSubScreen,
      label: 'Ideas Bank',
      icon: Lightbulb,
    },
    {
      id: 'analytics' as MoreSubScreen,
      label: 'Analytics',
      icon: BarChart3,
    },
  ];

  const isSettingsGroupActive =
    activeTab === 'more' &&
    (activeMoreSubScreen === 'settings' ||
      activeMoreSubScreen === 'team' ||
      activeMoreSubScreen === 'billing' ||
      activeMoreSubScreen === 'ai-assistants');

  return (
    <aside
      id="desktop-sidebar-nav"
      className={`w-64 shrink-0 flex flex-col justify-between border-r h-screen sticky top-0 p-4 transition-colors ${
        isDark
          ? 'bg-[#141B22] border-[#242E3B] text-stone-200'
          : 'bg-[#FAF7F2] border-[#E8E2D8] text-[#1E252B]'
      }`}
    >
      {/* Scrollable Navigation Sections */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* Brand header */}
        <div className="flex flex-col items-start px-2 pt-1">
          <BrandLogo size="lg" isDark={isDark} />
          <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mt-1">
            Agency Content Studio
          </p>
          {subscription && (
            <button
              type="button"
              onClick={() => onSelectSubScreen('billing')}
              className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#C44D34]/10 text-[#C44D34] hover:bg-[#C44D34]/20 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>
                {subscription.isTrial
                  ? `${subscription.trialDaysLeft} days left`
                  : subscription.planId === 'free'
                  ? 'Free Plan • Upgrade'
                  : `${subscription.planId.toUpperCase()} Pro`}
              </span>
            </button>
          )}
        </div>

        {/* Primary Action Button: + New Post */}
        <button
          onClick={onOpenNewPost}
          className="w-full py-2.5 px-3 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Post</span>
        </button>

        {/* Section 1: Studio Core */}
        <div className="space-y-0.5 pt-1">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
            Studio
          </p>

          {coreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !activeMoreSubScreen;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C44D34] text-white shadow-xs'
                    : isDark
                    ? 'text-stone-300 hover:bg-[#1E2734] hover:text-white'
                    : 'text-stone-700 hover:bg-stone-200/60 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1">
                  {item.secondaryBadge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                      {item.secondaryBadge}
                    </span>
                  )}
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isDark
                          ? 'bg-stone-800 text-stone-300'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Section 2: Workflow & Insights */}
        <div className="space-y-0.5 pt-1">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
            Workflow & Insights
          </p>

          {workflowNavItems.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTab === 'more' && activeMoreSubScreen === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => onSelectSubScreen(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C44D34] text-white shadow-xs'
                    : isDark
                    ? 'text-stone-300 hover:bg-[#1E2734] hover:text-white'
                    : 'text-stone-700 hover:bg-stone-200/60 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span>{tool.label}</span>
                </div>

                {tool.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      tool.badgeColor
                        ? tool.badgeColor
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#C44D34]/15 text-[#C44D34]'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section 3: Settings (Houses AI Assistants & MCP, Team Members, Plans & Billing) */}
        <div className="space-y-0.5 pt-1 pb-2">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
            Administration
          </p>

          <button
            onClick={() => onSelectSubScreen('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isSettingsGroupActive
                ? 'bg-[#C44D34] text-white shadow-xs'
                : isDark
                ? 'text-stone-300 hover:bg-[#1E2734] hover:text-white'
                : 'text-stone-700 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4 stroke-[2]" />
              <span>Settings</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Subscription status & Account footer */}
      <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2 mt-2 shrink-0">
        {subscription && (
          <button
            onClick={() => onSelectSubScreen('settings')}
            className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#1A232E] border-[#2A3748] hover:border-[#C44D34]'
                : 'bg-white border-[#E4DFD6] hover:border-[#C44D34]'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#C44D34]">
                <Sparkles className="w-3 h-3" />
                <span>
                  {subscription.isTrial
                    ? 'Agency Trial'
                    : `${subscription.planId.toUpperCase()} Plan`}
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                {subscription.isTrial
                  ? `${subscription.trialDaysLeft} days remaining`
                  : 'Active subscription'}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          </button>
        )}

        <div className="flex items-center justify-between px-2 text-[11px] text-stone-400">
          <span>PostNote Studio</span>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#2A3748] bg-[#1C2531] text-amber-400 hover:text-amber-300 hover:bg-[#253242]'
                  : 'border-[#E4DFD6] bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
