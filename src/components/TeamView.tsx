import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Trash2,
  Shield,
  UserPlus,
  Building2,
  Check,
  Lock,
  Send,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { TeamMember, WorkspaceRole, WorkspaceSummary } from '../types';

export interface SentInvitationDetails {
  email: string;
  name?: string;
  role: WorkspaceRole;
  workspaceName: string;
  inviteUrl: string;
  sentAt: string;
}

interface TeamViewProps {
  members: TeamMember[];
  currentUserEmail?: string;
  myRole?: WorkspaceRole;
  workspaces?: WorkspaceSummary[];
  activeWorkspaceId?: string;
  onSwitchWorkspace?: (workspaceId: string) => void;
  onBack: () => void;
  onInviteMember: (email: string, role?: WorkspaceRole, name?: string) => void;
  onUpdateMemberRole?: (memberId: string, role: WorkspaceRole) => void;
  onRemoveMember: (id: string) => void;
  lastSentInvitation?: SentInvitationDetails | null;
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
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    description: 'Full access: manage team members, assign roles, clients, posts & settings.',
  },
  {
    id: 'Manager',
    label: 'Manager',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    description: 'Manage clients, campaigns, create/edit posts, and approve content.',
  },
  {
    id: 'Editor',
    label: 'Editor',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    description: 'Create and edit posts, ideas, and upload/download media.',
  },
  {
    id: 'Viewer',
    label: 'Viewer',
    badgeClass: 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30',
    description: 'Read-only access to calendar, posts, and media downloads.',
  },
];

export const TeamView: React.FC<TeamViewProps> = ({
  members,
  currentUserEmail,
  myRole = 'Owner',
  workspaces = [],
  activeWorkspaceId,
  onSwitchWorkspace,
  onBack,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
  lastSentInvitation,
  isDark,
}) => {
  const [email, setEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('Editor');
  const [localInviteBanner, setLocalInviteBanner] =
    useState<SentInvitationDetails | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const canManageTeam = myRole === 'Owner' || myRole === 'Admin';
  const activeWsName =
    workspaces.find((w) => w.id === activeWorkspaceId)?.name || 'PostNote Studio';

  const activeInvitation = lastSentInvitation || localInviteBanner;

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

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeam) return;
    const cleanEmail = email.trim().toLowerCase();
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
    setEmail('');
    setInviteName('');
  };

  const handleCopyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // ignore clipboard fallback
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
        `— ${currentUserEmail || 'PostNote Studio Team'}`
    );
    return `mailto:${inv.email}?subject=${subject}&body=${body}`;
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'Owner') {
      return 'bg-[#C44D34]/15 text-[#C44D34] border-[#C44D34]/30';
    }
    const found = ASSIGNABLE_ROLES.find((r) => r.id === role);
    return found ? found.badgeClass : 'bg-stone-500/15 text-stone-500 border-stone-500/30';
  };

  return (
    <div
      id="team-view"
      className={`min-h-[780px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Team & Access Control</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
              {members.length} {members.length === 1 ? 'MEMBER' : 'MEMBERS'} · YOUR ROLE:{' '}
              {myRole.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Switcher (Private vs Shared Team Workspaces) */}
      {workspaces.length > 0 && (
        <div
          className={`mt-4 p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C44D34]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Your Accessible Workspaces ({workspaces.length})
              </h3>
            </div>
            <span className="text-[10px] text-stone-400">Isolated per account</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onSwitchWorkspace && onSwitchWorkspace(ws.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
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
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {ws.isPersonal
                        ? 'Personal Private Studio'
                        : `Shared by ${ws.ownerEmail}`}{' '}
                      · {ws.postsCount} posts
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-[#C44D34] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite a teammate & assign role card */}
      <div
        className={`mt-4 p-4 rounded-2xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#C44D34]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Add Teammate & Assign Role
            </h3>
          </div>
          {!canManageTeam && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
              <Lock className="w-3 h-3" /> Admin / Owner only
            </span>
          )}
        </div>

        <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3">
          Adding a teammate&apos;s email here dispatches a workspace sign-up invitation email with a personalized registration link and pre-assigns their role.
        </p>

        {canManageTeam ? (
          <form onSubmit={handleInvite} className="space-y-3">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  <span>Send Invite</span>
                </button>
              </div>
            </div>

            {/* Role Permissions Legend */}
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
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/50 text-xs text-stone-500 dark:text-stone-400">
            You are viewing this workspace with the <strong>{myRole}</strong> role. Only Workspace Owners and Admins can invite members or modify roles.
          </div>
        )}

        {/* Sign-Up Email Dispatched Confirmation Card */}
        {activeInvitation && (
          <div
            id="team-invite-email-confirmation"
            className={`mt-4 p-4 rounded-2xl border animate-fade-in ${
              isDark
                ? 'bg-emerald-950/25 border-emerald-800/50 text-stone-100'
                : 'bg-emerald-50/70 border-emerald-200 text-stone-800'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Sign-Up Invitation Email Dispatched to {activeInvitation.email}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Role: {activeInvitation.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    When <strong>{activeInvitation.email}</strong> opens their sign-up link, their email and workspace access are pre-configured automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(activeInvitation.inviteUrl)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-[#1D242C] border-stone-700 text-stone-200 hover:border-[#C44D34]'
                      : 'bg-white border-stone-300 text-stone-700 hover:border-[#C44D34]'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied Sign-Up Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#C44D34]" />
                      <span>Copy Sign-Up Link</span>
                    </>
                  )}
                </button>

                <a
                  href={buildMailtoHref(activeInvitation)}
                  className="px-3 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#a93e27] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Email Client</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-2.5 mt-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Workspace Team Members ({members.length})
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-stone-400">
            <Shield className="w-3 h-3 text-[#C44D34]" />
            <span>Role-Based Access Active</span>
          </div>
        </div>

        {members.map((member) => {
          const isMe =
            currentUserEmail &&
            member.email.toLowerCase() === currentUserEmail.toLowerCase();
          const isOwnerMember = member.role === 'Owner';
          const memberInviteUrl = buildInviteSignUpUrl(
            member.email,
            (member.role as WorkspaceRole) || 'Editor',
            member.name
          );

          return (
            <div
              key={member.id}
              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors ${
                isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
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
                  <p className="text-[11px] text-stone-400 truncate">{member.email}</p>
                  {member.status === 'invited' ? (
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[10px] text-amber-500 font-semibold">
                        Sign-Up Invite Sent · Will gain {member.role || 'Editor'} access upon sign-up
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

              {/* Right Controls: Role Selector & Remove */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {canManageTeam && !isOwnerMember ? (
                  <>
                    <select
                      value={(member.role as WorkspaceRole) || 'Editor'}
                      onChange={(e) =>
                        onUpdateMemberRole &&
                        onUpdateMemberRole(member.id, e.target.value as WorkspaceRole)
                      }
                      aria-label={`Change role for ${member.email}`}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C44D34] cursor-pointer ${
                        isDark
                          ? 'bg-[#252E38] border-[#34414D] text-white'
                          : 'bg-stone-50 border-stone-200 text-stone-800'
                      }`}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onRemoveMember(member.id)}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Revoke workspace access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] font-semibold text-stone-400 px-2">
                    {isOwnerMember ? 'Workspace Owner' : member.role}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
