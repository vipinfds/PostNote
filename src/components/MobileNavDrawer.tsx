import React from 'react';
import {
  Calendar,
  Users,
  List,
  Lightbulb,
  CheckCircle2,
  Image as ImageIcon,
  BarChart3,
  Settings as SettingsIcon,
  Bot,
  UserCheck,
  CreditCard,
  Plus,
  Moon,
  Sun,
  X,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { MainTab, MoreSubScreen, SubscriptionState } from '../types';

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
  subscription,
  currentUser,
  onSignOut,
  isDark,
  theme,
  onToggleTheme,
}) => {
  if (!isOpen) return null;

  const studioItems = [
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
    },
    {
      id: 'content' as MainTab,
      label: 'Content Queue',
      icon: List,
    },
  ];

  const workflowItems = [
    {
      id: 'approvals' as MoreSubScreen,
      label: 'Approvals',
      icon: CheckCircle2,
      badge: waitingApprovalsCount > 0 ? String(waitingApprovalsCount) : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'ideas' as MoreSubScreen,
      label: 'Ideas Bank',
      icon: Lightbulb,
    },
  ];

  const intelligenceItems = [
    {
      id: 'analytics' as MoreSubScreen,
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'ai-assistants' as MoreSubScreen,
      label: 'AI Assistants & MCP',
      icon: Bot,
      highlight: true,
      badge: 'Live',
      badgeColor: 'bg-[#C44D34] text-white',
    },
  ];

  const managementItems = [
    {
      id: 'team' as MoreSubScreen,
      label: 'Team Members',
      icon: UserCheck,
    },
    {
      id: 'billing' as MoreSubScreen,
      label: 'Plans & Billing',
      icon: CreditCard,
      highlight: subscription?.isTrial,
      badge: subscription?.isTrial ? `${subscription.trialDaysLeft}d trial` : undefined,
    },
    {
      id: 'settings' as MoreSubScreen,
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C44D34] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              P
            </div>
            <div>
              <h1 className="font-serif font-bold text-base tracking-tight leading-tight">
                PostNote
              </h1>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                Social Agency Studio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                </button>
              );
            })}
          </div>

          {/* Section 2: Workflow & Content */}
          <div className="space-y-0.5">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
              Workflow & Content
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

          {/* Section 3: Intelligence */}
          <div className="space-y-0.5">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
              Intelligence
            </p>
            {intelligenceItems.map((item) => {
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

          {/* Section 4: Management */}
          <div className="space-y-0.5">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
              Management
            </p>
            {managementItems.map((item) => {
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
                        isActive
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
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate leading-tight capitalize">
                    {currentUser.role}
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
