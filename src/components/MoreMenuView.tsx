import React from 'react';
import {
  Calendar,
  Users,
  FolderKanban,
  Lightbulb,
  BarChart3,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react';
import { MainTab, MoreSubScreen, SubscriptionState } from '../types';

interface MoreMenuViewProps {
  onNavigateSubScreen: (screen: MoreSubScreen) => void;
  onNavigateTab?: (tab: MainTab) => void;
  waitingApprovalsCount: number;
  clientsCount?: number;
  subscription?: SubscriptionState;
  isDark?: boolean;
}

export const MoreMenuView: React.FC<MoreMenuViewProps> = ({
  onNavigateSubScreen,
  onNavigateTab,
  waitingApprovalsCount,
  clientsCount = 0,
  isDark,
}) => {
  const sections: Array<{
    category: string;
    items: Array<{
      type: 'tab' | 'subscreen';
      id: string;
      title: string;
      description: string;
      icon: React.ElementType;
      badge?: string | number;
      badgeColor?: string;
      highlight?: boolean;
    }>;
  }> = [
    {
      category: 'Studio',
      items: [
        {
          type: 'tab',
          id: 'home',
          title: 'Calendar & Feed',
          description: 'Monthly schedule, grid view and post planning',
          icon: Calendar,
        },
        {
          type: 'tab',
          id: 'clients',
          title: 'Clients & Campaigns',
          description: 'Client portals, approvals, campaigns, and handles',
          icon: Users,
          badge:
            waitingApprovalsCount > 0
              ? `${waitingApprovalsCount} in review`
              : clientsCount > 0
              ? clientsCount
              : undefined,
          badgeColor:
            waitingApprovalsCount > 0 ? 'bg-amber-500 text-white' : undefined,
        },
      ],
    },
    {
      category: 'Workflow & Insights',
      items: [
        {
          type: 'subscreen',
          id: 'ideas',
          title: 'Ideas Bank',
          description: 'Capture, categorize and convert ideas into posts',
          icon: Lightbulb,
        },
        {
          type: 'subscreen',
          id: 'analytics',
          title: 'Analytics',
          description: 'Performance stats across platforms and clients',
          icon: BarChart3,
        },
      ],
    },
    {
      category: 'Administration',
      items: [
        {
          type: 'subscreen',
          id: 'settings',
          title: 'Settings',
          description:
            'Team Members, Plans & Billing, AI Assistants & MCP, theme and account setup',
          icon: SettingsIcon,
        },
      ],
    },
  ];

  const handleItemClick = (type: 'tab' | 'subscreen', id: string) => {
    if (type === 'tab') {
      if (onNavigateTab) {
        onNavigateTab(id as MainTab);
      }
    } else {
      onNavigateSubScreen(id as MoreSubScreen);
    }
  };

  return (
    <div
      id="more-menu-view"
      className={`min-h-[780px] pb-24 px-4 sm:px-6 pt-5 transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="pb-4 border-b border-stone-200 dark:border-stone-800">
        <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
          POST NOTE STUDIO
        </span>
        <h2 className="text-xl font-bold tracking-tight">Studio Hub & Menu</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Access studio workspaces, workflow engines, analytics, and settings.
        </p>
      </div>

      {/* Categorized Sections */}
      <div className="space-y-6 mt-6">
        {sections.map((section) => (
          <div key={section.category} className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-1">
              {section.category}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    id={`menu-item-${item.id}`}
                    onClick={() => handleItemClick(item.type, item.id)}
                    className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer flex items-center justify-between transition-all group ${
                      isDark
                        ? 'bg-[#1D242C] border-[#2A3440] hover:bg-[#222B34] hover:border-stone-700'
                        : 'bg-white border-[#E8E4DC] hover:border-stone-400 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          item.highlight
                            ? 'bg-[#C44D34]/15 text-[#C44D34]'
                            : isDark
                            ? 'bg-stone-800 text-stone-300 group-hover:text-white group-hover:bg-stone-700'
                            : 'bg-stone-100 text-stone-700 group-hover:bg-stone-200/70'
                        }`}
                      >
                        <Icon className="w-4 h-4 stroke-[2]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors truncate">
                            {item.title}
                          </h4>
                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold leading-none ${
                                item.badgeColor
                                  ? item.badgeColor
                                  : 'bg-[#C44D34] text-white'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Slogan Footer */}
      <div className="mt-10 text-center">
        <p className="text-[10px] font-extrabold tracking-widest text-stone-400 dark:text-stone-500 uppercase">
          PLAN. CREATE. APPROVE. PUBLISH.
        </p>
      </div>
    </div>
  );
};
