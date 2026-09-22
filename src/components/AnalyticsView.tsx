import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Post, Client } from '../types';

interface AnalyticsViewProps {
  posts: Post[];
  clients: Client[];
  onBack: () => void;
  isDark?: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  posts,
  clients,
  onBack,
  isDark,
}) => {
  const [hoveredClient, setHoveredClient] = useState<{ name: string; count: number; x: number; y: number } | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<{ status: string; count: number } | null>(null);

  const totalPosts = posts.length;
  const approvedCount = posts.filter((p) => p.status === 'Approved').length;
  const publishedCount = posts.filter((p) => p.status === 'Published').length;

  // Posts per client
  const clientData = clients.map((c) => {
    const count = posts.filter((p) => p.clientId === c.id).length;
    return { name: c.name, count, color: c.color || '#C44D34' };
  });

  const maxClientCount = Math.max(...clientData.map((d) => d.count), 1);

  // Platform distribution
  const platformCounts: Record<string, number> = {};
  posts.forEach((p) => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  });

  const platformColors: Record<string, string> = {
    Instagram: '#E1306C',
    Facebook: '#1877F2',
    LinkedIn: '#0A66C2',
    TikTok: '#00F2FE',
    Twitter: '#1DA1F2',
    Other: '#8E8E93',
  };

  const platformEntries = Object.entries(platformCounts).map(([platform, count]) => ({
    platform,
    count,
    color: platformColors[platform] || '#8E8E93',
    percent: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
  }));

  // Status breakdown
  const statuses = ['Planned', 'In review', 'Approved', 'Scheduled', 'Published'];
  const statusData = statuses.map((st) => {
    const count = posts.filter((p) => p.status === st).length;
    return { status: st, count };
  });
  const maxStatusCount = Math.max(...statusData.map((s) => s.count), 1);

  // Donut chart SVG path calculations
  let accumulatedAngle = 0;
  const donutSegments = platformEntries.map((p) => {
    const angle = (p.count / totalPosts) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      ...p,
      startAngle,
      endAngle: accumulatedAngle,
    };
  });

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  return (
    <div
      id="analytics-view"
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
          <div>
            <h2 className="text-base font-bold tracking-tight">Analytics</h2>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <span>{totalPosts} POSTS</span>
              <span>•</span>
              <span>{clients.length} CLIENTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 2 Stats */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div
          className={`p-4 rounded-2xl border text-center ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="text-2xl font-black text-stone-900 dark:text-white">
            {approvedCount}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">
            APPROVED
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border text-center ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="text-2xl font-black text-stone-900 dark:text-white">
            {publishedCount}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">
            PUBLISHED
          </div>
        </div>
      </div>

      {/* Chart 1: POSTS PER CLIENT */}
      <div
        className={`mt-4 p-4 rounded-2xl border ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-4">
          POSTS PER CLIENT
        </h3>

        <div className="space-y-3">
          {clientData.map((item) => {
            const pct = Math.round((item.count / maxClientCount) * 100);

            return (
              <div
                key={item.name}
                className="group cursor-pointer"
                onMouseEnter={() => setHoveredClient({ name: item.name, count: item.count, x: 0, y: 0 })}
                onMouseLeave={() => setHoveredClient(null)}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    {item.name}
                  </span>
                  <span className="text-[11px] font-bold text-stone-500">
                    {item.count}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[#C44D34] group-hover:bg-[#a83c26]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {hoveredClient && (
          <div className="mt-3 p-2 rounded-lg bg-stone-900 text-white text-[11px] font-semibold text-center animate-fade-in">
            {hoveredClient.name} posts : {hoveredClient.count}
          </div>
        )}
      </div>

      {/* Chart 2: PLATFORM DISTRIBUTION */}
      <div
        className={`mt-4 p-4 rounded-2xl border ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
          PLATFORM DISTRIBUTION
        </h3>

        <div className="flex flex-col items-center justify-center py-2">
          {/* Donut graphic */}
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
              {donutSegments.map((seg, idx) => {
                const isSingle = donutSegments.length === 1 || seg.count === totalPosts;
                if (isSingle) {
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="36"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="14"
                    />
                  );
                }
                const pathData = describeArc(50, 50, 36, seg.startAngle, Math.min(seg.endAngle - 0.5, 359.9));
                return (
                  <path
                    key={idx}
                    d={pathData}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold">{totalPosts}</span>
              <span className="text-[9px] font-bold uppercase text-stone-400">POSTS</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4">
            {platformEntries.map((item) => (
              <div key={item.platform} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {item.platform}
                </span>
                <span className="text-stone-400 font-medium">
                  ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart 3: STATUS BREAKDOWN */}
      <div
        className={`mt-4 p-4 rounded-2xl border ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-4">
          STATUS BREAKDOWN
        </h3>

        <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-2 border-b border-stone-200 dark:border-stone-800">
          {statusData.map((item) => {
            const barHeight = Math.max(Math.round((item.count / maxStatusCount) * 100), 8);
            const isHovered = hoveredStatus?.status === item.status;

            return (
              <div
                key={item.status}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                onMouseEnter={() => setHoveredStatus(item)}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                <div
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    isHovered ? 'bg-[#C44D34]' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                  style={{ height: `${barHeight}%` }}
                />
                <span className="text-[9px] font-bold text-stone-400 mt-2 truncate w-full text-center">
                  {item.status.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {hoveredStatus && (
          <div className="mt-3 p-2 rounded-lg bg-stone-900 text-white text-[11px] font-semibold text-center animate-fade-in">
            {hoveredStatus.status} count : {hoveredStatus.count}
          </div>
        )}
      </div>
    </div>
  );
};
