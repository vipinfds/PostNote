import React from 'react';
import {
  Calendar,
  Users,
  FolderKanban,
  Lightbulb,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';
import { MainTab, MoreSubScreen } from '../types';

interface BottomNavProps {
  currentTab?: MainTab;
  activeTab?: MainTab;
  activeMoreSubScreen?: MoreSubScreen | null;
  onSelectTab: (tab: MainTab) => void;
  onSelectSubScreen?: (sub: MoreSubScreen) => void;
  isDark?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab: currentTabProp,
  activeTab: activeTabProp,
  activeMoreSubScreen,
  onSelectTab,
  onSelectSubScreen,
  isDark,
}) => {
  const currentTab = activeTabProp || currentTabProp || 'home';

  const navItems: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
    type: 'tab' | 'subscreen';
    tab?: MainTab;
    subScreen?: MoreSubScreen;
  }> = [
    {
      id: 'home',
      label: 'Calendar & Feed',
      icon: Calendar,
      type: 'tab',
      tab: 'home',
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      type: 'tab',
      tab: 'clients',
    },
    {
      id: 'ideas',
      label: 'Ideas Bank',
      icon: Lightbulb,
      type: 'subscreen',
      subScreen: 'ideas',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      type: 'subscreen',
      subScreen: 'analytics',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      type: 'subscreen',
      subScreen: 'settings',
    },
  ];

  const isItemActive = (item: (typeof navItems)[number]) => {
    if (item.type === 'tab') {
      return currentTab === item.tab && !activeMoreSubScreen;
    }
    if (item.subScreen === 'settings') {
      return (
        currentTab === 'more' &&
        (activeMoreSubScreen === 'settings' ||
          activeMoreSubScreen === 'team' ||
          activeMoreSubScreen === 'billing' ||
          activeMoreSubScreen === 'ai-assistants' ||
          !activeMoreSubScreen)
      );
    }
    return currentTab === 'more' && activeMoreSubScreen === item.subScreen;
  };

  const handleClick = (item: (typeof navItems)[number]) => {
    if (item.type === 'tab' && item.tab) {
      onSelectTab(item.tab);
    } else if (item.type === 'subscreen' && item.subScreen) {
      if (onSelectSubScreen) {
        onSelectSubScreen(item.subScreen);
      } else {
        onSelectTab('more');
      }
    }
  };

  return (
    <nav
      id="app-bottom-nav"
      aria-label="Main Navigation"
      className={`sticky bottom-0 z-40 w-full px-1 py-2 border-t backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)] transition-colors duration-200 ${
        isDark
          ? 'bg-[#181E24]/95 border-[#2A343F] text-[#9BA3AF]'
          : 'bg-[#FAF7F2]/95 border-[#EAE5DC] text-[#8C827A]'
      }`}
    >
      <div className="grid grid-cols-5 items-center max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => handleClick(item)}
              className="relative flex flex-col items-center justify-center py-0.5 px-0.5 group focus:outline-none transition-transform active:scale-95 cursor-pointer"
            >
              {/* Red dot indicator when active */}
              <div className="h-1.5 flex items-center justify-center mb-0.5">
                {isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C44D34]" />
                ) : (
                  <span className="w-1.5 h-1.5 opacity-0" />
                )}
              </div>

              <Icon
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-150 ${
                  isActive
                    ? 'text-[#C44D34] stroke-[2.2]'
                    : isDark
                    ? 'text-[#9BA3AF] group-hover:text-stone-300 stroke-[1.8]'
                    : 'text-[#8C827A] group-hover:text-stone-700 stroke-[1.8]'
                }`}
              />

              <span
                className={`text-[9px] sm:text-[10px] leading-tight text-center font-semibold mt-1 truncate max-w-full transition-colors duration-150 ${
                  isActive
                    ? 'text-[#C44D34] font-bold'
                    : isDark
                    ? 'text-[#9BA3AF]'
                    : 'text-[#8C827A]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
