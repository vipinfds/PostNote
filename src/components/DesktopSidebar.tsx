import React from 'react';
import {
  Calendar,
  Users,
  List,
  Clock,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  Settings as SettingsIcon,
  CreditCard,
  Plus,
  Sparkles,
  Building2,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { MainTab, MoreSubScreen, SubscriptionState, ThemeMode } from '../types';

interface DesktopSidebarProps {
  activeTab: MainTab;
  activeMoreSubScreen: MoreSubScreen | null;
  onSelectTab: (tab: MainTab) => void;
  onSelectSubScreen: (sub: MoreSubScreen) => void;
  onOpenNewPost: () => void;
  clientsCount: number;
  waitingApprovalsCount: number;
  subscription?: SubscriptionState;
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
  isDark,
  theme,
  onToggleTheme,
}) => {
  const mainNavItems = [
    {
      id: 'home' as MainTab,
      label: 'Calendar & Feed',
      icon: Calendar,
      isSubScreen: false,
    },
    {
      id: 'clients' as MainTab,
      label: 'Clients',
      icon: Users,
      badge: clientsCount > 0 ? String(clientsCount) : undefined,
      isSubScreen: false,
    },
    {
      id: 'content' as MainTab,
      label: 'Content Library',
      icon: List,
      isSubScreen: false,
    },
    {
      id: 'queue' as MainTab,
      label: 'Post Queue',
      icon: Clock,
      isSubScreen: false,
    },
  ];

  const toolsNavItems = [
    {
      id: 'analytics' as MoreSubScreen,
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'ideas-bank' as MoreSubScreen,
      label: 'Ideas Bank',
      icon: Lightbulb,
    },
    {
      id: 'approvals' as MoreSubScreen,
      label: 'Approvals',
      icon: CheckCircle2,
      badge: waitingApprovalsCount > 0 ? String(waitingApprovalsCount) : undefined,
      badgeColor: 'bg-amber-500 text-white',
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

  return (
    <aside
      id="desktop-sidebar-nav"
      className={`w-64 shrink-0 flex flex-col justify-between border-r min-h-screen p-4 transition-colors ${
        isDark
          ? 'bg-[#141B22] border-[#242E3B] text-stone-200'
          : 'bg-[#FAF7F2] border-[#E8E2D8] text-[#1E252B]'
      }`}
    >
      {/* Top Workspace & Brand */}
      <div className="space-y-4">
        {/* Brand header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div>
            <h1
              className="font-serif text-2xl font-bold tracking-tight text-[#C44D34] select-none"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              PostNote
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
              Agency Content Studio
            </p>
          </div>
        </div>

        {/* Active Workspace Pill */}
        <div
          className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs ${
            isDark ? 'bg-[#1C2531] border-[#2A3646]' : 'bg-white border-[#E2DDD3]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-[#C44D34] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              FD
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate">First Draft Studio</p>
              <p className="text-[10px] text-stone-400 truncate">Pro Workspace</p>
            </div>
          </div>
        </div>

        {/* Primary Action Button: + New Post */}
        <button
          onClick={onOpenNewPost}
          className="w-full py-2.5 px-3 rounded-xl bg-[#C44D34] hover:bg-[#B33E26] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Post</span>
        </button>

        {/* Main Navigation Links */}
        <div className="space-y-1 pt-2">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
            Studio Menu
          </p>

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !activeMoreSubScreen;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
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
              </button>
            );
          })}
        </div>

        {/* Tools & Workspace Section */}
        <div className="space-y-1 pt-2">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
            Management & Tools
          </p>

          {toolsNavItems.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTab === 'more' && activeMoreSubScreen === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => onSelectSubScreen(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#C44D34] text-white shadow-xs'
                    : isDark
                    ? 'text-stone-300 hover:bg-[#1E2734] hover:text-white'
                    : 'text-stone-700 hover:bg-stone-200/60 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 stroke-[2] ${
                      tool.highlight && !isActive ? 'text-[#C44D34]' : ''
                    }`}
                  />
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
      </div>

      {/* Bottom Subscription status & Account footer */}
      <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
        {subscription && (
          <button
            onClick={() => onSelectSubScreen('billing')}
            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
              isDark
                ? 'bg-[#1A232E] border-[#2A3748] hover:border-[#C44D34]'
                : 'bg-white border-[#E4DFD6] hover:border-[#C44D34]'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#C44D34]">
                <Sparkles className="w-3 h-3" />
                <span>{subscription.isTrial ? 'Agency Trial' : `${subscription.planId.toUpperCase()} Plan`}</span>
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

        <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-stone-400">
          <span>PostNote v2.4</span>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className={`p-1.5 rounded-lg border transition-colors ${
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
