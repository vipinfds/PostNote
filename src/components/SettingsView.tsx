import React, { useState } from 'react';
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
  Building2,
  UserPlus,
  Send,
  Lock,
  Mail,
  Check,
  Copy,
  ExternalLink,
  Shield,
  X,
  Sparkles,
} from 'lucide-react';
import {
  ThemeMode,
  SubscriptionState,
  WorkspaceRole,
  TeamMember,
  WorkspaceSummary,
} from '../types';
import { SentInvitationDetails } from './TeamView';

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
  teamMembers?: TeamMember[];
  teamMembersCount?: number;
  workspaces?: WorkspaceSummary[];
  activeWorkspaceId?: string;
  onSwitchWorkspace?: (workspaceId: string) => void;
  onInviteMember?: (email: string, role?: WorkspaceRole, name?: string) => void;
  onUpdateMemberRole?: (memberId: string, role: WorkspaceRole) => void;
  onRemoveMember?: (id: string) => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  isDark?: boolean;
}

const ASSIGNABLE_ROLES: {
  id: WorkspaceRole;
  label: string;
  badgeClass: string;
  description: string;
}[] = [
  {
    id: 'Admin',
    label: 'Admin',
    badgeClass:
      'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    description:
      'Full access: manage team members, assign roles, clients, posts & settings.',
  },
  {
    id: 'Manager',
    label: 'Manager',
    badgeClass:
      'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    description:
      'Manage clients, campaigns, create/edit posts, and approve content.',
  },
  {
    id: 'Editor',
    label: 'Editor',
    badgeClass:
      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    description:
      'Create and edit posts, ideas, and upload/download media.',
  },
  {
    id: 'Viewer',
    label: 'Viewer',
    badgeClass:
      'bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30',
    description:
      'Read-only access to calendar, posts, and media downloads.',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSetTheme,
  onBack,
  onNavigateToBilling,
  onNavigateToAiAssistants,
  subscription,
  currentUser,
  myRole = 'Owner',
  teamMembers = [],
  teamMembersCount,
  workspaces = [],
  activeWorkspaceId,
  onSwitchWorkspace,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
  onSignOut,
  onDeleteAccount,
  isDark,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('Editor');
  const [localInviteBanner, setLocalInviteBanner] =
    useState<SentInvitationDetails | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const canManageTeam = myRole === 'Owner' || myRole === 'Admin';
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const activeWsName =
    activeWs?.name ||
    (currentUser ? `${currentUser.name}'s Private Studio` : 'PostNote Studio');

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

  const totalMembersCount =
    typeof teamMembersCount === 'number' ? teamMembersCount : teamMembers.length;

  const buildInviteSignUpUrl = (
    targetEmail: string,
    role: WorkspaceRole,
    targetName?: string
  ) => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://postnote.studio';
    const params = new URLSearchParams();
    params.set('invite', '1');
    params.set('email', targetEmail);
    params.set('role', role);
    if (activeWorkspaceId) params.set('workspace', activeWorkspaceId);
    params.set('workspaceName', activeWsName);
    if (targetName) params.set('name', targetName);
    return `${origin}/?${params.toString()}`;
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeam || !onInviteMember) return;
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;
    const cleanName = inviteName.trim() || undefined;
    const inviteUrl = buildInviteSignUpUrl(cleanEmail, selectedRole, cleanName);

    onInviteMember(cleanEmail, selectedRole, cleanName);
    setLocalInviteBanner({
      email: cleanEmail,
      name: cleanName,
      role: selectedRole,
      workspaceName: activeWsName,
      inviteUrl,
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setInviteEmail('');
    setInviteName('');
  };

  const handleCopyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // ignore fallback
    }
  };

  const buildMailtoHref = (inv: SentInvitationDetails) => {
    const subject = encodeURIComponent(
      `You're invited to join ${inv.workspaceName} on PostNote Studio (${inv.role})`
    );
    const body = encodeURIComponent(
      `Hi ${inv.name || inv.email.split('@')[0]},\n\n` +
        `You have been invited to collaborate on "${inv.workspaceName}" in PostNote Studio with the ${inv.role} role.\n\n` +
        `Click the link below to sign up and access the shared workspace:\n` +
        `${inv.inviteUrl}\n\n` +
        `Once you sign up with ${inv.email}, your ${inv.role} permissions will be activated automatically.\n\n` +
        `— ${currentUser?.email || 'PostNote Studio Team'}`
    );
    return `mailto:${inv.email}?subject=${subject}&body=${body}`;
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'Owner') {
      return 'bg-[#C44D34]/15 text-[#C44D34] border-[#C44D34]/30';
    }
    const found = ASSIGNABLE_ROLES.find((r) => r.id === role);
    return found
      ? found.badgeClass
      : 'bg-stone-500/15 text-stone-500 border-stone-500/30';
  };

  return (
    <div
      id="settings-view"
      className={`min-h-[780px] pb-28 lg:pb-24 px-4 sm:px-6 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Settings</h2>
            <p className="text-[11px] text-stone-400">
              Workspace &amp; Current Plan, Team Access &amp; Role Assignment, Appearance, and Plans &amp; Billing
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {/* 1. User Profile Card */}
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

        {/* 2. Workspace & Current Plan Banner (Clicking directs to Plans & Billing) */}
        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors space-y-3 ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <button
            id="settings-workspace-plan-banner"
            type="button"
            onClick={onNavigateToBilling}
            className={`w-full p-4 rounded-2xl border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group ${
              isDark
                ? 'bg-[#151C24] border-[#283442] hover:border-[#C44D34]'
                : 'bg-[#FAF8F5] border-[#EAE4D9] hover:border-[#C44D34]'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#C44D34] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                    Active Workspace:
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#C44D34] transition-colors">
                    {activeWsName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#C44D34]/15 text-[#C44D34] text-[10px] font-extrabold uppercase">
                    {planName}
                  </span>
                  {subscription?.isTrial && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase">
                      {subscription.trialDaysLeft}d Trial
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Currently on the <strong>{planName}</strong> • Click here to view or manage your workspace plan &amp; billing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#C44D34] shrink-0 self-end sm:self-center">
              <span>Plans &amp; Billing</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Optional Workspace Switcher if user has multiple workspaces */}
          {workspaces.length > 1 && onSwitchWorkspace && (
            <div className="pt-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                Switch Workspace ({workspaces.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => onSwitchWorkspace(ws.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'border-[#C44D34] bg-[#C44D34]/10'
                          : isDark
                          ? 'border-[#2A3440] bg-[#161C22] hover:border-stone-600'
                          : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{ws.name}</span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getRoleBadge(
                              ws.myRole
                            )}`}
                          >
                            {ws.myRole}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <div className="w-4 h-4 rounded-full bg-[#C44D34] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Team Access, Role Assignment & Team Members Pop-up Trigger (Directly on Main Settings Page) */}
        <div
          id="settings-team-access-card"
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-colors space-y-4 ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/70 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#C44D34]/15 text-[#C44D34] flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  Team Access &amp; Assign Role
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Invite teammates with pre-assigned roles or open the Team Members pop-up to manage roles
                </p>
              </div>
            </div>

            {/* Team Members Tab/Button -> Opens Pop-up Modal */}
            <button
              id="open-team-members-popup-btn"
              type="button"
              onClick={() => setIsMembersModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#181E24] hover:bg-black dark:bg-[#C44D34] dark:hover:bg-[#a83e28] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-center"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Members ({totalMembersCount})</span>
            </button>
          </div>

          {canManageTeam ? (
            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Name (optional)"
                  maxLength={100}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-500'
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@email.com"
                  maxLength={150}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                    isDark
                      ? 'bg-[#252E38] border-[#34414D] text-white placeholder-stone-500'
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
                  }`}
                />
                <div className="flex gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as WorkspaceRole)}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] ${
                      isDark
                        ? 'bg-[#252E38] border-[#34414D] text-white'
                        : 'bg-stone-50 border-stone-200 text-stone-900'
                    }`}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        Role: {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#C44D34] hover:bg-[#A83E28] text-white text-xs font-bold uppercase tracking-wider shadow-xs shrink-0 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invite</span>
                  </button>
                </div>
              </div>

              {/* Role Permissions Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                {ASSIGNABLE_ROLES.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedRole === r.id
                        ? 'border-[#C44D34] bg-[#C44D34]/5'
                        : isDark
                        ? 'border-[#2A3440] bg-[#161C22]/60'
                        : 'border-stone-200/80 bg-stone-50/70'
                    }`}
                  >
                    <span
                      className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border mb-1 ${r.badgeClass}`}
                    >
                      {r.label}
                    </span>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug">
                      {r.description}
                    </p>
                  </div>
                ))}
              </div>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/50 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                You are viewing this workspace with the <strong>{myRole}</strong> role. Only Workspace Owners and Admins can invite members or modify roles.
              </span>
            </div>
          )}

          {/* Dispatched Invite Banner */}
          {localInviteBanner && (
            <div
              className={`p-3.5 rounded-2xl border animate-fade-in ${
                isDark
                  ? 'bg-emerald-950/25 border-emerald-800/50 text-stone-100'
                  : 'bg-emerald-50/70 border-emerald-200 text-stone-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Invitation sent to {localInviteBanner.email} ({localInviteBanner.role})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink(localInviteBanner.inviteUrl)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                      isDark
                        ? 'bg-[#1D242C] border-stone-700 text-stone-200'
                        : 'bg-white border-stone-300 text-stone-700'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied Link</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#C44D34]" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={buildMailtoHref(localInviteBanner)}
                    className="px-2.5 py-1 rounded-lg bg-[#C44D34] text-white text-[11px] font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Appearance Card */}
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

        {/* 5. AI Assistants & MCP */}
        {onNavigateToAiAssistants && (
          <div
            className={`p-4 rounded-2xl border shadow-xs transition-colors ${
              isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
            }`}
          >
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
          </div>
        )}

        {/* 6. SECOND LAST: Plans & Billing */}
        <div
          id="settings-billing-section"
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5">
            Plans &amp; Billing
          </h3>
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
        </div>

        {/* 7. LAST: Delete Account Card */}
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

      {/* Team Members Pop-Up Modal (List + Role Controls on the Right Side) */}
      {isMembersModalOpen && (
        <div
          id="team-members-modal-backdrop"
          onClick={() => setIsMembersModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            id="team-members-modal"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
              isDark
                ? 'bg-[#1A2129] border-[#2A3440] text-stone-100'
                : 'bg-[#FAF7F2] border-[#E6E2D8] text-[#1E252B]'
            }`}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C44D34]/15 text-[#C44D34] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight">
                      Workspace Team Members ({teamMembers.length})
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C44D34]">
                      <Shield className="w-3 h-3" />
                      <span>Role Control</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    View members and update their workspace role on the right side
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Team Members List with Role Selector on the Right */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {teamMembers.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-8">
                  No team members found in this workspace.
                </p>
              ) : (
                teamMembers.map((member) => {
                  const isMe =
                    currentUser?.email &&
                    member.email.toLowerCase() === currentUser.email.toLowerCase();
                  const isOwnerMember = member.role === 'Owner';
                  const memberInviteUrl = buildInviteSignUpUrl(
                    member.email,
                    (member.role as WorkspaceRole) || 'Editor',
                    member.name
                  );

                  return (
                    <div
                      key={member.id}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-colors ${
                        isDark
                          ? 'bg-[#141A21] border-[#252E3A]'
                          : 'bg-white border-[#EAE6DF]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.avatar ? (
                          <div className="w-10 h-10 rounded-full bg-[#C44D34]/15 text-[#C44D34] font-bold flex items-center justify-center text-xs shrink-0">
                            {member.avatar}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                              {member.name || member.email.split('@')[0]}
                            </h4>
                            {isMe && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                YOU
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${getRoleBadge(
                                member.role
                              )}`}
                            >
                              {member.role || 'Editor'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 truncate">
                            {member.email}
                          </p>
                          {member.status === 'invited' ? (
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-[10px] text-amber-500 font-semibold">
                                Invite Sent ({member.role || 'Editor'})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyInviteLink(memberInviteUrl)}
                                className="text-[10px] font-bold text-[#C44D34] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Copy Sign-Up Link</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-semibold">
                              Active Workspace Access
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Role Control Dropdown & Remove Button */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {canManageTeam && !isOwnerMember ? (
                          <>
                            <select
                              value={(member.role as WorkspaceRole) || 'Editor'}
                              onChange={(e) =>
                                onUpdateMemberRole &&
                                onUpdateMemberRole(
                                  member.id,
                                  e.target.value as WorkspaceRole
                                )
                              }
                              aria-label={`Change role for ${member.email}`}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                                isDark
                                  ? 'bg-[#252E38] border-[#34414D] text-white'
                                  : 'bg-stone-50 border-stone-200 text-stone-800'
                              }`}
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r.id} value={r.id}>
                                  Role: {r.label}
                                </option>
                              ))}
                            </select>
                            {onRemoveMember && (
                              <button
                                type="button"
                                onClick={() => onRemoveMember(member.id)}
                                className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Revoke workspace access"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-stone-400 px-2">
                            {isOwnerMember ? 'Workspace Owner' : member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
