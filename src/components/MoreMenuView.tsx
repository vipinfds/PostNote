import React from 'react';
import {
  Lightbulb,
  CheckCircle2,
  Image as ImageIcon,
  FolderKanban,
  BarChart3,
  Settings as SettingsIcon,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { MoreSubScreen } from '../types';

interface MoreMenuViewProps {
  onNavigateSubScreen: (screen: MoreSubScreen) => void;
  waitingApprovalsCount: number;
  isDark?: boolean;
}

export const MoreMenuView: React.FC<MoreMenuViewProps> = ({
  onNavigateSubScreen,
  waitingApprovalsCount,
  isDark,
}) => {
  const menuItems: Array<{
    id: MoreSubScreen;
    title: string;
    description: string;
    icon: React.ElementType;
    badge?: string | number;
  }> = [
    {
      id: 'ideas',
      title: 'Ideas Bank',
      description: 'Capture and store content ideas',
      icon: Lightbulb,
    },
    {
      id: 'approvals',
      title: 'Approvals',
      description: 'Review posts before they go live',
      icon: CheckCircle2,
      badge: waitingApprovalsCount > 0 ? waitingApprovalsCount : undefined,
    },
    {
      id: 'media',
      title: 'Media Library',
      description: 'Images and videos for your posts',
      icon: ImageIcon,
    },
    {
      id: 'campaigns',
      title: 'Campaigns',
      description: 'Group posts into campaigns',
      icon: FolderKanban,
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Posts, platforms and status insights',
      icon: BarChart3,
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Account, theme and team',
      icon: SettingsIcon,
    },
    {
      id: 'ai-assistants',
      title: 'Connect AI assistants',
      description: 'Use PostNote inside Claude, ChatGPT and more',
      icon: Bot,
    },
  ];

  return (
    <div
      id="more-menu-view"
      className={`min-h-[780px] pb-24 px-4 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="pb-4 border-b border-stone-200 dark:border-stone-800">
        <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
          POST NOTE
        </span>
        <h2 className="text-xl font-bold tracking-tight">More</h2>
      </div>

      {/* Menu Cards */}
      <div className="space-y-3 mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              id={`more-menu-item-${item.id}`}
              onClick={() => onNavigateSubScreen(item.id)}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer flex items-center justify-between transition-all group ${
                isDark
                  ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34]'
                  : 'bg-white border-[#E8E4DC] hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isDark
                      ? 'bg-stone-800 text-stone-300 group-hover:text-white group-hover:bg-stone-700'
                      : 'bg-stone-100 text-stone-700 group-hover:bg-stone-200/70'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors truncate">
                      {item.title}
                    </h3>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#C44D34] text-white text-[10px] font-extrabold leading-none">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
            </div>
          );
        })}
      </div>

      {/* Slogan Footer */}
      <div className="mt-8 text-center">
        <p className="text-[11px] font-extrabold tracking-widest text-stone-400 dark:text-stone-500 uppercase">
          PLAN. CREATE. APPROVE. PUBLISH.
        </p>
      </div>
    </div>
  );
};
