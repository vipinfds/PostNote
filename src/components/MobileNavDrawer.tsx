import React, { useState } from 'react';
import {
  Calendar,
  Users,
  FolderKanban,
  Lightbulb,
  CheckCircle2,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Moon,
  Sun,
  X,
  LogOut,
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
  WorkspaceRole,
  WorkspaceSummary,
} from '../types';
import { BrandLogo } from './BrandLogo';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: MainTab;
  activeMoreSubScreen?: MoreSubScreen;
  onSelectTab: (tab: MainTab) => void;
  onSelectSubScreen: (screen: MoreSubScreen) => void;
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
  onSignOut?: () => void;
  isDark?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  activeMoreSubScreen,
  onSelectTab,
  onSelectSubScreen,
  onOpenNewPost,
  clientsCount,
  waitingApprovalsCount,
  currentUser,
  workspaces = [],
  activeWorkspaceId = '',
  myRole = 'Owner',
  teamMembersCount = 1,
  onSwitchWorkspace,
  onSignOut,
  isDark,
  theme,
  onToggleTheme,
}) => {
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const workspaceDisplayName =
    activeWorkspace?.name ||
    (currentUser ? `${currentUser.name}'s Private Studio` : 'FirstDraft Studio');

  const studioItems: Array<{
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
    {
      id: 'content' as MainTab,
      label: 'Campaigns',
      icon: FolderKanban,
    },
  ];

  const workflowItems: Array<{
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

  const handleTabClick = (tabId: MainTab) => {
    onSelectTab(tabId);
    onClose();
  };

  const handleSubScreenClick = (screenId: MoreSubScreen) => {
    onSelectSubScreen(screenId);
    onClose();
  };

  const handleNewPostClick = () => {
    onClose();
    onOpenNewPost();
  };

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div
        className={`relative flex flex-col w-[85%] max-w-xs h-full shadow-2xl z-10 overflow-hidden transition-transform animate-in slide-in-from-left duration-250 ${
          isDark
            ? 'bg-[#141B22] text-stone-200 border-r border-[#242E3B]'
            : 'bg-[#FAF7F2] text-[#1E252B] border-r border-[#E8E2D8]'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200/80 dark:border-stone-800/80">
          <div className="flex flex-col items-start">
            <BrandLogo size="md" isDark={isDark} />
            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium mt-0.5">
              Social Agency Studio
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace & Role Dropdown inside Hamburger Menu */}
        {currentUser && (
          <div className="px-3 pt-3 pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
            <button
              type="button"
              onClick={() => setIsWorkspaceDropdownOpen((prev) => !prev)}
              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                isDark
                  ? 'bg-[#1C2531] border-[#2A3646] hover:border-[#C44D34]'
                  : 'bg-white border-[#E2DDD3] hover:border-[#C44D34]'
              }`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C44D34] shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Workspace
                  </span>
                </div>
                <p className="font-bold text-xs truncate mt-0.5 text-stone-900 dark:text-white">
                  {workspaceDisplayName}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#C44D34]/15 text-[#C44D34]">
                    <Shield className="w-2.5 h-2.5" />
                    Role: {myRole}
                  </span>
                  <span className="text-[10px] text-stone-400 truncate max-w-[130px]">
                    {currentUser.email}
                  </span>
                </div>
              </div>
              {isWorkspaceDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
              )}
            </button>

            {isWorkspaceDropdownOpen && (
              <div
                className={`mt-2 p-2.5 rounded-xl border space-y-2 text-xs animate-in fade-in duration-150 ${
                  isDark
                    ? 'bg-[#18202B] border-[#2A3646]'
                    : 'bg-[#F3EFE6] border-[#E2DDD3]'
                }`}
              >
                {workspaces.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                      Switch Workspace
                    </p>
                    {workspaces.map((ws) => {
                      const isSelected = ws.id === activeWorkspaceId;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => {
                            if (onSwitchWorkspace) onSwitchWorkspace(ws.id);
                            setIsWorkspaceDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#C44D34] text-white'
                              : isDark
                              ? 'text-stone-300 hover:bg-[#222C38]'
                              : 'text-stone-800 hover:bg-white'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-bold">{ws.name}</p>
                            <p
                              className={`text-[10px] ${
                                isSelected ? 'text-white/80' : 'text-stone-400'
                              }`}
                            >
                              {ws.isPersonal ? 'Private · Owner' : `Team · ${ws.myRole}`}
                            </p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="pt-1.5 border-t border-stone-200/70 dark:border-stone-700/70 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      handleSubScreenClick('settings');
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-[#C44D34]/15 text-[#C44D34] hover:bg-[#C44D34]/25 font-bold text-[11px] text-center transition-colors cursor-pointer"
                  >
                    Settings & Team ({teamMembersCount})
                  </button>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 text-center truncate px-1">
                    Signed in as {currentUser.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Post Button */}
        <div className="p-3 border-b border-stone-200/60 dark:border-stone-800/60">
          <button
            onClick={handleNewPostClick}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#C44D34] hover:bg-[#b04028] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Post</span>
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Section 1: Studio */}
          <div className="space-y-0.5">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
              Studio
            </p>
            {studioItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#C44D34]/15 text-[#C44D34]'
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
          <div className="space-y-0.5">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
              Workflow & Insights
            </p>
            {workflowItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === 'more' && activeMoreSubScreen === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSubScreenClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
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

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                        item.badgeColor
                          ? item.badgeColor
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#C44D34]/15 text-[#C44D34]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section 3: Administration (Settings only) */}
          <div className="space-y-0.5">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
              Administration
            </p>
            <button
              onClick={() => handleSubScreenClick('settings')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
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

        {/* Drawer Footer with Theme & User info */}
        <div className="p-3 border-t border-stone-200/80 dark:border-stone-800/80 space-y-2">
          {/* Theme switcher */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isDark
                  ? 'bg-[#1E2734] text-stone-300 hover:text-white'
                  : 'bg-stone-200/60 text-stone-700 hover:text-stone-900'
              }`}
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                Switch
              </span>
            </button>
          )}

          {/* User profile / Sign out */}
          {currentUser && (
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#C44D34]/20 text-[#C44D34] font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate leading-tight">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              {onSignOut && (
                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  title="Sign Out"
                  className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
