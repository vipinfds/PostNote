import React from 'react';
import { Calendar, Users, List, Clock, LayoutGrid } from 'lucide-react';
import { MainTab } from '../types';

interface BottomNavProps {
  currentTab?: MainTab;
  activeTab?: MainTab;
  onSelectTab: (tab: MainTab) => void;
  isDark?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab: currentTabProp, activeTab: activeTabProp, onSelectTab, isDark }) => {
  const currentTab = activeTabProp || currentTabProp || 'home';
  const tabs = [
    { id: 'home' as MainTab, label: 'HOME', icon: Calendar },
    { id: 'clients' as MainTab, label: 'CLIENTS', icon: Users },
    { id: 'content' as MainTab, label: 'CONTENT', icon: List },
    { id: 'queue' as MainTab, label: 'QUEUE', icon: Clock },
    { id: 'more' as MainTab, label: 'MORE', icon: LayoutGrid },
  ];

  return (
    <nav
      id="app-bottom-nav"
      aria-label="Main Navigation"
      className={`sticky bottom-0 z-30 w-full px-2 py-2.5 border-t transition-colors duration-200 ${
        isDark
          ? 'bg-[#181E24] border-[#2A343F] text-[#9BA3AF]'
          : 'bg-[#FAF7F2] border-[#EAE5DC] text-[#8C827A]'
      }`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className="relative flex flex-col items-center justify-center w-16 py-0.5 group focus:outline-none transition-transform active:scale-95"
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
                className={`w-5 h-5 transition-colors duration-150 ${
                  isActive
                    ? 'text-[#C44D34] stroke-[2.2]'
                    : isDark
                    ? 'text-[#9BA3AF] group-hover:text-stone-300 stroke-[1.8]'
                    : 'text-[#8C827A] group-hover:text-stone-700 stroke-[1.8]'
                }`}
              />

              <span
                className={`text-[10px] tracking-wider font-semibold mt-1 transition-colors duration-150 ${
                  isActive
                    ? 'text-[#C44D34]'
                    : isDark
                    ? 'text-[#9BA3AF]'
                    : 'text-[#8C827A]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
