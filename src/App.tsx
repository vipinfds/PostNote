import React, { useState, useEffect, useRef } from 'react';
import {
  TabType,
  MoreSubScreen,
  Post,
  Client,
  Campaign,
  Idea,
  MediaItem,
  TeamMember,
  ThemeMode,
  SubscriptionState,
  WorkspaceRole,
  WorkspaceSummary,
  PostActivityItem,
  StudioNotification,
} from './types';
import {
  INITIAL_MEDIA,
} from './data/initialData';
import { INITIAL_SUBSCRIPTION_STATE } from './data/pricingData';
import { getTodayDateStr } from './utils/theme';
import { Menu, Plus, Building2, Shield, ArrowRight, Lock, Users, LogOut, Cloud, CloudOff, Bell, CheckCheck, MessageSquare, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  auth,
  isFirebaseConfigured,
  subscribeToAuthChanges,
  signOutFirebase,
  makeWorkspaceIdForEmail,
  ensureFirestoreWorkspace,
  syncClientToFirestore,
  syncPostToFirestore,
  deletePostFromFirestore,
  syncMemberToFirestore,
  deleteMemberFromFirestore,
} from './firebase';
import {
  staticGetWorkspaceSync,
  staticSaveWorkspaceSync,
  staticInviteTeamMember,
  staticUpdateTeamMemberRole,
  staticRemoveTeamMember,
  getStaticWorkspacesForUser,
} from './utils/staticWorkspaceStore';

// Component imports
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { ClientsView } from './components/ClientsView';
import { ClientDetailView } from './components/ClientDetailView';
import { ContentOverviewView } from './components/ContentOverviewView';
import { QueueView } from './components/QueueView';
import { PostFormView } from './components/PostFormView';
import { ClientModal } from './components/ClientModal';
import { Toast } from './components/Toast';
import { ScreenLoader } from './components/ScreenLoader';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

// Screen imports
import { IdeasBankView } from './components/IdeasBankView';
import { ApprovalsView } from './components/ApprovalsView';
import { CampaignsView } from './components/CampaignsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { TeamView } from './components/TeamView';
import { AiAssistantsView } from './components/AiAssistantsView';
import { BillingView } from './components/BillingView';
import { MoreMenuView } from './components/MoreMenuView';
import { ClientPortalView } from './components/ClientPortalView';
import { DesktopSidebar } from './components/DesktopSidebar';
import { SignInView } from './components/SignInView';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
    uid?: string;
    personalWorkspaceId?: string;
  } | null>(() => {
    try {
      const saved =
        localStorage.getItem('postnote_auth_user') ||
        sessionStorage.getItem('postnote_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [myRole, setMyRole] = useState<WorkspaceRole>('Owner');
  const [isSelectingWorkspace, setIsSelectingWorkspace] = useState<boolean>(false);
  const [syncMode, setSyncMode] = useState<'cloud' | 'static'>(() =>
    isFirebaseConfigured ? 'cloud' : 'static'
  );
  const hasLoadedWorkspaceRef = useRef(false);

  // Synchronize Firebase Auth state with isolated tenant session & auto-restore on reload
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      if (!fbUser || !fbUser.email) return;
      const cleanEmail = fbUser.email.trim().toLowerCase();
      const displayName = fbUser.displayName || cleanEmail.split('@')[0] || 'Studio User';
      const personalWsId = makeWorkspaceIdForEmail(cleanEmail);

      // Ensure Firestore workspace document exists for this authenticated Firebase user
      ensureFirestoreWorkspace(personalWsId, `${displayName}'s Studio`).catch(() => {});

      // Automatically restore session & hydrate workspaces if not yet in React state
      setCurrentUser((prev) => {
        if (prev && prev.email.toLowerCase() === cleanEmail) {
          if (!prev.uid || !prev.personalWorkspaceId) {
            const updated = {
              ...prev,
              uid: fbUser.uid,
              personalWorkspaceId: prev.personalWorkspaceId || personalWsId,
            };
            try {
              localStorage.setItem('postnote_auth_user', JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        }
        const restored = {
          name: displayName,
          email: cleanEmail,
          role: 'Owner',
          uid: fbUser.uid,
          personalWorkspaceId: personalWsId,
        };
        try {
          localStorage.setItem('postnote_auth_user', JSON.stringify(restored));
        } catch {}
        return restored;
      });

      setActiveWorkspaceId((prevWs) => prevWs || personalWsId);

      // Hydrate backend multi-tenant store (or static fallback) for this Firebase user
      try {
        const res = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            name: displayName,
            provider: 'google',
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data?.workspaces) && data.workspaces.length > 0) {
            setWorkspaces(data.workspaces);
            return;
          }
        }
      } catch {
        // Static host fallback below
      }
      setWorkspaces(getStaticWorkspacesForUser(cleanEmail, displayName));
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOutFirebase();
    localStorage.removeItem('postnote_auth_user');
    sessionStorage.removeItem('postnote_auth_user');
    hasLoadedWorkspaceRef.current = false;
    setIsSelectingWorkspace(false);
    setCurrentUser(null);
    setPosts([]);
    setClients([]);
    setCampaigns([]);
    setIdeas([]);
    setTeamMembers([]);
    setWorkspaces([]);
    setActiveWorkspaceId('');
    showToast('Signed out of session');
  };

  // Navigation States
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeMoreSubScreen, setActiveMoreSubScreen] = useState<MoreSubScreen | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [clientDetailTab, setClientDetailTab] = useState<'overview' | 'analytics'>('overview');
  const [portalClient, setPortalClient] = useState<Client | null>(null);
  const [portalTab, setPortalTab] = useState<'overview' | 'upcoming' | 'analytics' | 'approvals' | 'calendar'>('overview');
  const [portalIsViewOnly, setPortalIsViewOnly] = useState<boolean>(true);
  const [isLockedPortalSession, setIsLockedPortalSession] = useState<boolean>(false);

  // Post form state (for both New & Edit)
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [initialPostModalTab, setInitialPostModalTab] = useState<'details' | 'activity'>('details');
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>();
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>();

  // Client modal state (for New & Edit)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Loading transition state (video shows clean instant screen switch with loader)
  const [isLoadingScreen, setIsLoadingScreen] = useState(false);

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Studio Team Notifications state (persisted per workspace in localStorage)
  const [notifications, setNotifications] = useState<StudioNotification[]>(() => {
    try {
      const saved = localStorage.getItem('postnote_notifications_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('postnote_theme');
      return (saved as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  // Strictly isolated workspace state (never pre-populated with another user's data!)
  const [posts, setPosts] = useState<Post[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>(() => {
    try {
      const cached = localStorage.getItem('postnote_media_v2');
      return cached ? JSON.parse(cached) : INITIAL_MEDIA;
    } catch {
      return INITIAL_MEDIA;
    }
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    try {
      const cached = localStorage.getItem('postnote_subscription_v2');
      return cached ? JSON.parse(cached) : INITIAL_SUBSCRIPTION_STATE;
    } catch {
      return INITIAL_SUBSCRIPTION_STATE;
    }
  });

  // Bidirectional multi-tenant sync with backend server or static GitHub Pages store
  const fetchServerSync = async (overrideWsId?: string) => {
    if (!currentUser?.email) return;
    const targetWs = overrideWsId ?? activeWorkspaceId;

    const applyWorkspaceData = (data: any) => {
      if (data.workspaceId) {
        setActiveWorkspaceId(data.workspaceId);
      }
      if (data.myRole) {
        setMyRole(data.myRole);
      }
      if (Array.isArray(data.workspaces)) {
        setWorkspaces(data.workspaces);
      }
      if (Array.isArray(data.posts)) {
        setPosts((current) =>
          JSON.stringify(current) !== JSON.stringify(data.posts) ? data.posts : current
        );
      }
      if (Array.isArray(data.clients)) {
        setClients((current) =>
          JSON.stringify(current) !== JSON.stringify(data.clients) ? data.clients : current
        );
      }
      if (Array.isArray(data.campaigns)) {
        setCampaigns((current) =>
          JSON.stringify(current) !== JSON.stringify(data.campaigns) ? data.campaigns : current
        );
      }
      if (Array.isArray(data.ideas)) {
        setIdeas((current) =>
          JSON.stringify(current) !== JSON.stringify(data.ideas) ? data.ideas : current
        );
      }
      if (Array.isArray(data.teamMembers)) {
        setTeamMembers((current) =>
          JSON.stringify(current) !== JSON.stringify(data.teamMembers) ? data.teamMembers : current
        );
      }
      hasLoadedWorkspaceRef.current = true;
    };

    try {
      const params = new URLSearchParams({ email: currentUser.email });
      if (targetWs) params.set('workspaceId', targetWs);

      const res = await fetch(`/api/sync?${params.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setSyncMode('cloud');
        applyWorkspaceData(data);
        return;
      }
    } catch {
      // Fall through to static store fallback (e.g., GitHub Pages)
    }

    // Standalone static host fallback (GitHub Pages / offline)
    setSyncMode(isFirebaseConfigured && auth?.currentUser ? 'cloud' : 'static');
    if (!hasLoadedWorkspaceRef.current || overrideWsId) {
      const staticData = staticGetWorkspaceSync(currentUser.email, targetWs || undefined);
      applyWorkspaceData(staticData);
    }
  };

  const handleManualRefresh = async () => {
    await fetchServerSync(activeWorkspaceId || undefined);
    showToast('Workspace synced');
  };

  useEffect(() => {
    if (!currentUser?.email) return;
    hasLoadedWorkspaceRef.current = false;
    fetchServerSync(activeWorkspaceId || undefined);
    const interval = setInterval(() => fetchServerSync(activeWorkspaceId || undefined), 8000);
    const handleFocus = () => fetchServerSync(activeWorkspaceId || undefined);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.email, activeWorkspaceId]);

  // Sync changes from UI back to isolated tenant workspace (both backend API & static store)
  useEffect(() => {
    if (!currentUser?.email || !activeWorkspaceId || !hasLoadedWorkspaceRef.current) return;
    if (myRole === 'Viewer') return;

    // Immediately persist in static store so GitHub Pages / reloads never lose edits
    staticSaveWorkspaceSync({
      email: currentUser.email,
      workspaceId: activeWorkspaceId,
      posts,
      clients,
      campaigns,
      ideas,
    });

    const timer = setTimeout(() => {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          workspaceId: activeWorkspaceId,
          posts,
          clients,
          campaigns,
          ideas,
        }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [posts, clients, campaigns, ideas, currentUser?.email, activeWorkspaceId, myRole]);

  useEffect(() => {
    localStorage.setItem('postnote_media_v2', JSON.stringify(mediaFiles));
  }, [mediaFiles]);

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('postnote_subscription_v2', JSON.stringify(subscription));
  }, [subscription]);

  // Subscription update handler
  const handleUpdateSubscription = (newSub: SubscriptionState) => {
    setSubscription(newSub);
    showToast(`Workspace upgraded to ${newSub.planId.toUpperCase()}!`);
  };

  const handleNavigateToBilling = () => {
    setActiveTab('more');
    setActiveMoreSubScreen('billing');
    setSelectedClientDetail(null);
    setIsPostFormOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    localStorage.setItem('postnote_theme', theme);
    const effectiveIsDark =
      theme === 'dark' || (theme === 'system' && systemPrefersDark);

    if (effectiveIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, systemPrefersDark]);


  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  const [previousTab, setPreviousTab] = useState<TabType>('home');

  const handleSelectSubScreen = (sub: MoreSubScreen) => {
    if (activeTab !== 'more') {
      setPreviousTab(activeTab);
    }
    setActiveTab('more');
    setActiveMoreSubScreen(sub);
    setSelectedClientDetail(null);
    setPortalClient(null);
    setIsPostFormOpen(false);
  };

  const handleSubScreenBack = () => {
    const target = previousTab && previousTab !== 'more' ? previousTab : 'home';
    setActiveTab(target);
    setActiveMoreSubScreen(null);
  };

  // Toast trigger
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2500);
  };

  // URL detection for direct client portal links (supports query params, hash routes, path routes, and server API)
  useEffect(() => {
    const parseAndSetPortal = async () => {
      try {
        let portalId: string | null = null;
        let viewParam: string | null = null;
        let clientNameParam: string | null = null;
        let clientHandleParam: string | null = null;
        let clientColorParam: string | null = null;

        // 1. Check window.location.search (?portal=...)
        if (typeof window !== 'undefined' && window.location.search) {
          const searchParams = new URLSearchParams(window.location.search);
          portalId = searchParams.get('portal');
          viewParam = searchParams.get('view');
          clientNameParam = searchParams.get('name');
          clientHandleParam = searchParams.get('handle');
          clientColorParam = searchParams.get('color');
        }

        // 2. Check window.location.hash (#/portal/:id or #portal=:id)
        if (!portalId && typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash;
          if (hash.includes('/portal/')) {
            const parts = hash.split('/portal/')[1]?.split('?');
            portalId = parts?.[0] || null;
            if (parts?.[1]) {
              const hashParams = new URLSearchParams(parts[1]);
              viewParam = viewParam || hashParams.get('view');
              clientNameParam = clientNameParam || hashParams.get('name');
              clientHandleParam = clientHandleParam || hashParams.get('handle');
              clientColorParam = clientColorParam || hashParams.get('color');
            }
          } else if (hash.includes('portal=')) {
            const rawHash = hash.replace(/^#\/?/, '');
            const hashParams = new URLSearchParams(rawHash);
            portalId = hashParams.get('portal');
            viewParam = viewParam || hashParams.get('view');
            clientNameParam = clientNameParam || hashParams.get('name');
            clientHandleParam = clientHandleParam || hashParams.get('handle');
            clientColorParam = clientColorParam || hashParams.get('color');
          }
        }

        // 3. Check window.location.pathname (/portal/:id)
        if (!portalId && typeof window !== 'undefined' && window.location.pathname) {
          const path = window.location.pathname;
          if (path.startsWith('/portal/')) {
            portalId = path.split('/portal/')[1]?.split('/')[0] || null;
          }
        }

        if (!portalId) return;

        // Clean portalId
        const cleanPortalId = decodeURIComponent(portalId).trim();

        // Find existing client in local state
        let found = clients.find(
          (c) =>
            c.id.toLowerCase() === cleanPortalId.toLowerCase() ||
            c.handle.replace('@', '').toLowerCase() === cleanPortalId.toLowerCase() ||
            c.name.toLowerCase() === cleanPortalId.toLowerCase() ||
            c.name.toLowerCase().includes(cleanPortalId.toLowerCase()) ||
            c.id.toLowerCase().includes(cleanPortalId.toLowerCase())
        );

        // Special aliases for common names
        if (!found) {
          if (cleanPortalId.toLowerCase().includes('coder') || cleanPortalId.toLowerCase().includes('cordor')) {
            found = clients.find((c) => c.id === 'client-codery' || c.id === 'client-cordori');
          } else if (cleanPortalId.toLowerCase().includes('kudol')) {
            found = clients.find((c) => c.id === 'client-kudoli');
          }
        }

        // If not found in local memory, try fetching from backend portal registry
        if (!found) {
          try {
            const res = await fetch(`/api/portals/${encodeURIComponent(cleanPortalId)}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.portal?.client) {
                found = data.portal.client;
                // Add to client state
                setClients((prev) => [found!, ...prev.filter((c) => c.id !== found!.id)]);
                if (data.portal.posts && Array.isArray(data.portal.posts) && data.portal.posts.length > 0) {
                  setPosts((prevPosts) => {
                    const existingIds = new Set(prevPosts.map((p) => p.id));
                    const newPosts = data.portal.posts.filter((p: any) => !existingIds.has(p.id));
                    return [...newPosts, ...prevPosts];
                  });
                }
              }
            }
          } catch {}
        }

        // If still not found, construct resilient client from URL query parameters
        if (!found) {
          const reconstructedName =
            clientNameParam || cleanPortalId.replace(/^client-/, '').charAt(0).toUpperCase() + cleanPortalId.replace(/^client-/, '').slice(1);
          const reconstructedHandle = clientHandleParam || `@${cleanPortalId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const reconstructedColor = clientColorParam || '#3B82F6';

          found = {
            id: cleanPortalId.startsWith('client-') ? cleanPortalId : `client-${cleanPortalId}`,
            name: reconstructedName,
            handle: reconstructedHandle,
            color: reconstructedColor,
            notes: 'Client workspace portal — analytics and live review',
            postsCount: 5,
          };

          setClients((prev) => [found!, ...prev.filter((c) => c.id !== found!.id)]);
        }

        if (found) {
          setPortalClient(found);
          setIsLockedPortalSession(true);
          if (viewParam === 'analytics') {
            setPortalTab('analytics');
            setPortalIsViewOnly(true);
          } else if (viewParam === 'upcoming' || viewParam === 'calendar') {
            setPortalTab('upcoming');
            setPortalIsViewOnly(true);
          } else {
            setPortalTab('overview');
            setPortalIsViewOnly(false);
          }
        }
      } catch (err) {
        console.warn('Portal URL parsing error:', err);
      }
    };

    parseAndSetPortal();

    // Listen to hash changes if client link uses hash routing
    window.addEventListener('hashchange', parseAndSetPortal);
    return () => window.removeEventListener('hashchange', parseAndSetPortal);
  }, [clients]);

  // Tab navigation with light screen loading flash
  const handleSelectTab = (tab: TabType) => {
    if (tab === 'more') {
      handleSelectSubScreen('settings');
      return;
    }
    if (tab === activeTab && !activeMoreSubScreen && !selectedClientDetail && !isPostFormOpen && !portalClient) {
      return;
    }
    setIsLoadingScreen(true);
    setActiveTab(tab);
    setActiveMoreSubScreen(null);
    setSelectedClientDetail(null);
    setPortalClient(null);
    setIsPostFormOpen(false);
    setEditingPost(null);

    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      setIsLoadingScreen(false);
    }, 120);
  };

  // Helper to push a team & submitter notification
  const pushTeamNotification = (
    notif: Omit<StudioNotification, 'id' | 'createdAt' | 'read'>
  ) => {
    const newItem: StudioNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => {
      const next = [newItem, ...prev].slice(0, 40);
      try {
        localStorage.setItem('postnote_notifications_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('postnote_notifications_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Open Post Modal (New or View/Edit)
  const handleOpenNewPost = (initialDate?: string, clientId?: string) => {
    setEditingPost(null);
    setInitialPostModalTab('details');
    setPreselectedDate(initialDate);
    setPreselectedClientId(clientId);
    setIsPostFormOpen(true);
  };

  const handleEditPost = (post: Post, tab: 'details' | 'activity' = 'details') => {
    setEditingPost(post);
    setInitialPostModalTab(tab);
    setPreselectedDate(undefined);
    setPreselectedClientId(undefined);
    setIsPostFormOpen(true);
  };

  const handleSavePost = (postData: Omit<Post, 'id' | 'createdAt'> & { id?: string }) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access and cannot create or edit posts');
      return;
    }

    const actorName = currentUser?.name || 'Studio Member';
    const actorEmail = currentUser?.email || 'team@firstdraftstudio.in';
    const nowIso = new Date().toISOString();

    if (postData.id) {
      const existing = posts.find((p) => p.id === postData.id);
      const wasSubmittedForReview =
        existing?.status !== 'In review' && postData.status === 'In review';

      const newActivity: PostActivityItem = {
        id: `act-${Date.now()}`,
        type: wasSubmittedForReview ? 'submitted_for_review' : 'edited',
        actorName,
        actorEmail,
        actorRole: myRole,
        timestamp: nowIso,
        details: wasSubmittedForReview
          ? `Submitted post for approval (${postData.platform})`
          : `Updated post details (${postData.status})`,
      };

      const updatedPost: Post = {
        ...existing,
        ...postData,
        id: postData.id,
        createdBy: existing?.createdBy || {
          name: actorName,
          email: actorEmail,
          role: myRole,
        },
        submittedBy: wasSubmittedForReview
          ? { name: actorName, email: actorEmail, role: myRole }
          : existing?.submittedBy,
        activityLog: [...(existing?.activityLog || []), newActivity],
      };

      setPosts((prev) =>
        prev.map((p) => (p.id === postData.id ? updatedPost : p))
      );
      setEditingPost(updatedPost);

      if (auth?.currentUser && activeWorkspaceId) {
        syncPostToFirestore(activeWorkspaceId, auth.currentUser.uid, updatedPost, false).catch(
          () => {}
        );
      }

      if (wasSubmittedForReview) {
        pushTeamNotification({
          postId: updatedPost.id,
          postTitle: updatedPost.title,
          clientName: updatedPost.clientName,
          type: 'submitted_for_review',
          message: `${actorName} (${myRole}) submitted "${updatedPost.title}" for approval.`,
          actorName,
          actorEmail,
          targetSummary: 'Approvers (Owners, Admins & Managers)',
        });
        showToast(`Submitted for approval · Approvers notified`);
      } else {
        showToast('Post updated & activity logged');
      }
    } else {
      const isSubmittedDirectly = postData.status === 'In review';
      const initialActivities: PostActivityItem[] = [
        {
          id: `act-${Date.now()}-1`,
          type: 'created',
          actorName,
          actorEmail,
          actorRole: myRole,
          timestamp: nowIso,
          details: `Created post for ${postData.clientName} on ${postData.platform}`,
        },
      ];

      if (isSubmittedDirectly) {
        initialActivities.push({
          id: `act-${Date.now()}-2`,
          type: 'submitted_for_review',
          actorName,
          actorEmail,
          actorRole: myRole,
          timestamp: nowIso,
          details: 'Submitted for approval upon creation',
        });
      }

      const newPost: Post = {
        ...postData,
        id: `post-${Date.now()}`,
        createdAt: nowIso,
        createdBy: { name: actorName, email: actorEmail, role: myRole },
        submittedBy: isSubmittedDirectly
          ? { name: actorName, email: actorEmail, role: myRole }
          : undefined,
        activityLog: initialActivities,
      };

      setPosts((prev) => [newPost, ...prev]);
      if (auth?.currentUser && activeWorkspaceId) {
        syncPostToFirestore(activeWorkspaceId, auth.currentUser.uid, newPost, true).catch(
          () => {}
        );
      }

      if (isSubmittedDirectly) {
        pushTeamNotification({
          postId: newPost.id,
          postTitle: newPost.title,
          clientName: newPost.clientName,
          type: 'submitted_for_review',
          message: `${actorName} (${myRole}) created & submitted "${newPost.title}" for approval.`,
          actorName,
          actorEmail,
          targetSummary: 'Approvers (Owners, Admins & Managers)',
        });
      }
      showToast('Post created & activity logged');
    }
    setIsPostFormOpen(false);
    setEditingPost(null);
  };

  const handleDeletePost = (postId: string) => {
    if (myRole !== 'Owner' && myRole !== 'Admin') {
      showToast('Only Workspace Owners and Admins can delete posts');
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (auth.currentUser && activeWorkspaceId) {
      deletePostFromFirestore(activeWorkspaceId, postId).catch(() => {});
    }
    showToast('Post deleted');
    setIsPostFormOpen(false);
    setEditingPost(null);
  };

  // Client handlers
  const handleSaveClient = (clientData: {
    id?: string;
    name: string;
    handle: string;
    color: string;
    notes?: string;
  }) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access and cannot modify clients');
      return;
    }
    if (clientData.id) {
      const updatedClient: Client = { ...clientData, id: clientData.id };
      setClients((prev) =>
        prev.map((c) => (c.id === clientData.id ? { ...c, ...updatedClient } : c))
      );
      if (auth.currentUser && activeWorkspaceId) {
        syncClientToFirestore(activeWorkspaceId, auth.currentUser.uid, updatedClient, false).catch(
          () => {}
        );
      }
      showToast('Client updated');
      if (selectedClientDetail?.id === clientData.id) {
        setSelectedClientDetail((prev) => (prev ? { ...prev, ...clientData } : null));
      }
      return updatedClient;
    } else {
      const newClient: Client = {
        ...clientData,
        id: `client-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setClients((prev) => [...prev, newClient]);
      if (auth.currentUser && activeWorkspaceId) {
        syncClientToFirestore(activeWorkspaceId, auth.currentUser.uid, newClient, true).catch(
          () => {}
        );
      }
      showToast('Client added');
      return newClient;
    }
  };

  const handleDeleteClient = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (myRole !== 'Owner' && myRole !== 'Admin') {
      showToast('Only Workspace Owners and Admins can delete clients');
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    showToast('Client deleted');
    if (selectedClientDetail?.id === clientId) {
      setSelectedClientDetail(null);
    }
  };

  // Ideas handlers
  const handleAddToCalendar = (idea: Idea) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access');
      return;
    }
    const todayDate = getTodayDateStr();
    setEditingPost(null);
    setPreselectedClientId(idea.clientId);
    setPreselectedDate(todayDate);
    setEditingPost({
      id: '',
      title: idea.title,
      caption: idea.description || '',
      category: idea.category,
      clientId: idea.clientId,
      clientName: idea.clientName,
      date: todayDate,
      status: 'Planned',
      platform: 'Instagram',
      createdAt: new Date().toISOString(),
    });
    setIsPostFormOpen(true);
    showToast('Idea loaded into composer');
  };

  const handleSaveIdea = (ideaData: Omit<Idea, 'id' | 'createdAt'> & { id?: string }) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access');
      return;
    }
    if (ideaData.id) {
      setIdeas((prev) =>
        prev.map((i) => (i.id === ideaData.id ? { ...i, ...ideaData, id: ideaData.id! } : i))
      );
      showToast('Idea updated');
    } else {
      const newIdea: Idea = {
        ...ideaData,
        id: `idea-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setIdeas((prev) => [newIdea, ...prev]);
      showToast('Idea saved');
    }
  };

  const handleDeleteIdea = (id: string) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access');
      return;
    }
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    showToast('Idea deleted');
  };

  // Approvals & Post Activity handlers
  const handleApprovePost = (postId: string) => {
    if (myRole === 'Viewer' || myRole === 'Editor') {
      showToast('Only Owners, Admins, and Managers can approve posts');
      return;
    }

    const actorName = currentUser?.name || 'Approver';
    const actorEmail = currentUser?.email || 'owner@firstdraftstudio.in';
    const targetPost = posts.find((p) => p.id === postId);
    const submitter = targetPost?.submittedBy || targetPost?.createdBy;

    const editorsList = teamMembers
      .filter((m) => m.role === 'Editor' || m.role === 'Manager')
      .map((m) => m.name || m.email)
      .slice(0, 2);

    const recipientLabel = submitter
      ? `${submitter.name} (${submitter.role || 'Submitter'})${
          editorsList.length > 0 ? ` & Content Team (${editorsList.join(', ')})` : ' & Content Team'
        }`
      : editorsList.length > 0
      ? `Content Team (${editorsList.join(', ')})`
      : 'Content Team';

    const approvalActivity: PostActivityItem = {
      id: `act-${Date.now()}`,
      type: 'approved',
      actorName,
      actorEmail,
      actorRole: myRole,
      timestamp: new Date().toISOString(),
      details: `Approved post for publishing · Notified ${recipientLabel}`,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updated = {
          ...p,
          status: 'Approved' as const,
          activityLog: [...(p.activityLog || []), approvalActivity],
        };
        if (editingPost?.id === postId) {
          setEditingPost(updated);
        }
        return updated;
      })
    );

    if (targetPost) {
      pushTeamNotification({
        postId: targetPost.id,
        postTitle: targetPost.title,
        clientName: targetPost.clientName,
        type: 'approved',
        message: `${actorName} approved "${targetPost.title}" for publishing.`,
        actorName,
        actorEmail,
        targetSummary: recipientLabel,
      });
      showToast(
        submitter
          ? `Post approved · Notified ${submitter.name} & Content Team`
          : 'Post approved · Content Team notified'
      );
    } else {
      showToast('Post approved');
    }
  };

  const handleRequestChanges = (postId: string, comment?: string) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access');
      return;
    }

    const actorName = currentUser?.name || 'Reviewer';
    const actorEmail = currentUser?.email || 'owner@firstdraftstudio.in';
    const targetPost = posts.find((p) => p.id === postId);
    const submitter = targetPost?.submittedBy || targetPost?.createdBy;

    const editorsList = teamMembers
      .filter((m) => m.role === 'Editor' || m.role === 'Manager')
      .map((m) => m.name || m.email)
      .slice(0, 2);

    const targetSummary = submitter
      ? `${submitter.name} (${submitter.role || 'Submitter'})${
          editorsList.length > 0 ? ` & Content Team (${editorsList.join(', ')})` : ' & Content Team'
        }`
      : editorsList.length > 0
      ? `Content Team (${editorsList.join(', ')})`
      : 'Content Team & Submitter';

    const changeActivity: PostActivityItem = {
      id: `act-${Date.now()}`,
      type: 'changes_requested',
      actorName,
      actorEmail,
      actorRole: myRole,
      timestamp: new Date().toISOString(),
      comment: comment || 'Requested revisions before approval.',
      details: `Returned status to Planned · Notified ${targetSummary}`,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updated = {
          ...p,
          status: 'Planned' as const,
          activityLog: [...(p.activityLog || []), changeActivity],
        };
        if (editingPost?.id === postId) {
          setEditingPost(updated);
        }
        return updated;
      })
    );

    if (targetPost) {
      pushTeamNotification({
        postId: targetPost.id,
        postTitle: targetPost.title,
        clientName: targetPost.clientName,
        type: 'changes_requested',
        message: `${actorName} requested changes on "${targetPost.title}"`,
        comment: comment || 'Requested revisions before approval.',
        actorName,
        actorEmail,
        targetSummary,
      });
    }

    showToast(
      submitter
        ? `Changes requested · Notified ${submitter.name} & Content Team`
        : 'Changes requested · Content Team notified'
    );
  };

  const handleAddPostComment = (postId: string, comment: string) => {
    if (!comment.trim()) return;
    const actorName = currentUser?.name || 'Team Member';
    const actorEmail = currentUser?.email || 'team@firstdraftstudio.in';
    const targetPost = posts.find((p) => p.id === postId);
    const submitter = targetPost?.submittedBy || targetPost?.createdBy;

    const commentActivity: PostActivityItem = {
      id: `act-${Date.now()}`,
      type: 'comment',
      actorName,
      actorEmail,
      actorRole: myRole,
      timestamp: new Date().toISOString(),
      comment: comment.trim(),
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updated = {
          ...p,
          activityLog: [...(p.activityLog || []), commentActivity],
        };
        if (editingPost?.id === postId) {
          setEditingPost(updated);
        }
        return updated;
      })
    );

    if (targetPost) {
      const targetSummary = submitter
        ? `${submitter.name} & Content Team`
        : 'Content Team';
      pushTeamNotification({
        postId: targetPost.id,
        postTitle: targetPost.title,
        clientName: targetPost.clientName,
        type: 'comment',
        message: `${actorName} commented on "${targetPost.title}"`,
        comment: comment.trim(),
        actorName,
        actorEmail,
        targetSummary,
      });
    }

    showToast('Comment added & team notified');
  };

  const handleDeletePostComment = (postId: string, activityId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;
    const targetActivity = (targetPost.activityLog || []).find((a) => a.id === activityId);
    if (!targetActivity) return;

    const myEmail = (currentUser?.email || '').toLowerCase();
    const myName = (currentUser?.name || '').toLowerCase();
    const isAdminOrOwner = myRole === 'Owner' || myRole === 'Admin';
    const isOwnComment =
      (myEmail && (targetActivity.actorEmail || '').toLowerCase() === myEmail) ||
      (myName && (targetActivity.actorName || '').toLowerCase() === myName);

    if (!isAdminOrOwner && !isOwnComment) {
      showToast('You can only delete your own comments (Admins can delete any)');
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updated = {
          ...p,
          activityLog: (p.activityLog || []).filter((a) => a.id !== activityId),
        };
        if (editingPost?.id === postId) {
          setEditingPost(updated);
        }
        if (auth?.currentUser && activeWorkspaceId) {
          syncPostToFirestore(activeWorkspaceId, auth.currentUser.uid, updated, false).catch(
            () => {}
          );
        }
        return updated;
      })
    );
    showToast('Comment deleted');
  };

  const handleAddClientFeedback = (
    postId: string,
    comment: string,
    clientAuthorName?: string
  ) => {
    if (!comment.trim()) return;
    const targetPost = posts.find((p) => p.id === postId);
    const submitter = targetPost?.submittedBy || targetPost?.createdBy;
    const actorName =
      clientAuthorName?.trim() ||
      `${targetPost?.clientName || portalClient?.name || 'Client'} (Client)`;
    const actorEmail = `client@${(targetPost?.clientName || portalClient?.name || 'client')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}.com`;

    const editorsList = teamMembers
      .filter((m) => m.role === 'Editor' || m.role === 'Manager')
      .map((m) => m.name || m.email)
      .slice(0, 2);

    const targetSummary = submitter
      ? `${submitter.name} (${submitter.role || 'Submitter'})${
          editorsList.length > 0 ? ` & Content Team (${editorsList.join(', ')})` : ' & Content Team'
        }`
      : editorsList.length > 0
      ? `Content Team (${editorsList.join(', ')})`
      : 'Content Team';

    const feedbackActivity: PostActivityItem = {
      id: `act-${Date.now()}`,
      type: 'client_feedback',
      actorName,
      actorEmail,
      actorRole: 'Client Feedback',
      timestamp: new Date().toISOString(),
      comment: comment.trim(),
      details: `Marked as Client Feedback · Notified ${targetSummary}`,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updated = {
          ...p,
          activityLog: [...(p.activityLog || []), feedbackActivity],
        };
        if (editingPost?.id === postId) {
          setEditingPost(updated);
        }
        if (auth?.currentUser && activeWorkspaceId) {
          syncPostToFirestore(activeWorkspaceId, auth.currentUser.uid, updated, false).catch(
            () => {}
          );
        }
        return updated;
      })
    );

    if (targetPost) {
      pushTeamNotification({
        postId: targetPost.id,
        postTitle: targetPost.title,
        clientName: targetPost.clientName,
        type: 'client_feedback',
        message: `[Client Feedback] ${actorName} commented on "${targetPost.title}"`,
        comment: comment.trim(),
        actorName,
        actorEmail,
        targetSummary,
      });
    }

    showToast(
      submitter
        ? `Client Feedback added · Notified ${submitter.name} & Studio Team`
        : 'Client Feedback added · Studio Team notified'
    );
  };

  // Media Library handlers
  const handleUploadMedia = (item: Omit<MediaItem, 'id' | 'createdAt'>) => {
    const newMedia: MediaItem = {
      ...item,
      id: `media-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMediaFiles((prev) => [newMedia, ...prev]);
    showToast('File uploaded');
  };

  // Campaign handlers
  const handleSaveCampaign = (campData: Omit<Campaign, 'id'> & { id?: string }) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access');
      return;
    }
    if (campData.id) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campData.id ? { ...c, ...campData, id: campData.id! } : c))
      );
      showToast('Campaign updated');
    } else {
      const newCamp: Campaign = {
        ...campData,
        id: `camp-${Date.now()}`,
      };
      setCampaigns((prev) => [...prev, newCamp]);
      showToast('Campaign created');
    }
  };

  // Team & RBAC handlers (with static GitHub Pages fallback)
  const handleInviteMember = async (
    inviteEmail: string,
    role: WorkspaceRole = 'Editor',
    inviteName?: string
  ) => {
    if (myRole !== 'Owner' && myRole !== 'Admin') {
      showToast('Only Workspace Owners and Admins can invite team members');
      return;
    }
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          actorEmail: currentUser?.email,
          inviteEmail,
          inviteName,
          role,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to invite team member');
          return;
        }
        if (Array.isArray(data.teamMembers)) {
          setTeamMembers(data.teamMembers);
        }
        if (auth.currentUser && activeWorkspaceId && data.member) {
          syncMemberToFirestore(activeWorkspaceId, data.member, role, true).catch(() => {});
        }
        showToast(`Added ${inviteEmail} as ${role}`);
        return;
      }
    } catch {
      // Static fallback below
    }

    if (currentUser?.email && activeWorkspaceId) {
      const fallback = staticInviteTeamMember({
        workspaceId: activeWorkspaceId,
        actorEmail: currentUser.email,
        inviteEmail,
        inviteName,
        role,
      });
      setTeamMembers(fallback.teamMembers);
      showToast(`Added ${inviteEmail} as ${role}`);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: WorkspaceRole) => {
    if (myRole !== 'Owner' && myRole !== 'Admin') {
      showToast('Only Workspace Owners and Admins can update roles');
      return;
    }
    try {
      const res = await fetch('/api/team/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          actorEmail: currentUser?.email,
          memberId,
          role,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && Array.isArray(data.teamMembers)) {
          setTeamMembers(data.teamMembers);
          const updatedMember = data.teamMembers.find((m: TeamMember) => m.id === memberId);
          if (auth.currentUser && activeWorkspaceId && updatedMember) {
            syncMemberToFirestore(activeWorkspaceId, updatedMember, role, false).catch(() => {});
          }
          showToast(`Updated role to ${role}`);
          return;
        }
      }
    } catch {
      // Static fallback below
    }

    if (currentUser?.email && activeWorkspaceId) {
      const updatedList = staticUpdateTeamMemberRole({
        workspaceId: activeWorkspaceId,
        actorEmail: currentUser.email,
        memberId,
        role,
      });
      setTeamMembers(updatedList);
      showToast(`Updated role to ${role}`);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (myRole !== 'Owner' && myRole !== 'Admin') {
      showToast('Only Workspace Owners and Admins can remove members');
      return;
    }
    try {
      const res = await fetch('/api/team/member', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          actorEmail: currentUser?.email,
          memberId,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && Array.isArray(data.teamMembers)) {
          setTeamMembers(data.teamMembers);
          if (auth.currentUser && activeWorkspaceId) {
            deleteMemberFromFirestore(activeWorkspaceId, memberId).catch(() => {});
          }
          showToast('Member access revoked');
          return;
        }
      }
    } catch {
      // Static fallback below
    }

    if (currentUser?.email && activeWorkspaceId) {
      const updatedList = staticRemoveTeamMember({
        workspaceId: activeWorkspaceId,
        actorEmail: currentUser.email,
        memberId,
      });
      setTeamMembers(updatedList);
      showToast('Member access revoked');
    }
  };

  const handleSwitchWorkspace = (targetWsId: string) => {
    if (targetWsId === activeWorkspaceId) return;
    hasLoadedWorkspaceRef.current = false;
    setActiveWorkspaceId(targetWsId);
    fetchServerSync(targetWsId);
    const targetSummary = workspaces.find((w) => w.id === targetWsId);
    if (targetSummary) {
      showToast(`Switched to ${targetSummary.name} (${targetSummary.myRole})`);
    }
  };

  const isDark =
    theme === 'dark' || (theme === 'system' && systemPrefersDark);

  const waitingApprovalsCount = posts.filter((p) => p.status === 'In review').length;

  // Render the current active screen
  const renderScreenContent = () => {
    if (isLoadingScreen) {
      return <ScreenLoader isDark={isDark} />;
    }

    // 0. If Client Portal View is open (live client mode)
    if (portalClient) {
      // STRICT CLIENT ISOLATION: Only posts belonging to this client are passed
      const clientScopedPosts = posts.filter((p) => p.clientId === portalClient.id);

      return (
        <ClientPortalView
          client={portalClient}
          posts={clientScopedPosts}
          campaigns={campaigns}
          subscription={subscription}
          initialTab={portalTab}
          isViewOnly={portalIsViewOnly}
          isLockedPortal={isLockedPortalSession}
          onApprovePost={handleApprovePost}
          onAddClientFeedback={handleAddClientFeedback}
          onRequestChanges={(postId, notes, clientAuthorName) => {
            const targetPost = posts.find((p) => p.id === postId);
            const submitter = targetPost?.submittedBy || targetPost?.createdBy;
            const actorName =
              clientAuthorName?.trim() || `${portalClient.name} (Client)`;
            const actorEmail = `client@${portalClient.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')}.com`;
            const targetSummary = submitter
              ? `${submitter.name} (${submitter.role || 'Submitter'}) & Studio Team`
              : 'Studio Content Team';

            const feedbackActivity: PostActivityItem = {
              id: `act-${Date.now()}`,
              type: 'client_feedback',
              actorName,
              actorEmail,
              actorRole: 'Client Feedback',
              timestamp: new Date().toISOString(),
              comment: notes || 'Client requested revisions before approval.',
              details: `Client requested changes · Returned status to Planned · Notified ${targetSummary}`,
            };

            setPosts((prev) =>
              prev.map((p) => {
                if (p.id !== postId) return p;
                const updated = {
                  ...p,
                  status: 'Planned' as const,
                  activityLog: [...(p.activityLog || []), feedbackActivity],
                };
                if (auth?.currentUser && activeWorkspaceId) {
                  syncPostToFirestore(
                    activeWorkspaceId,
                    auth.currentUser.uid,
                    updated,
                    false
                  ).catch(() => {});
                }
                return updated;
              })
            );

            if (targetPost) {
              pushTeamNotification({
                postId: targetPost.id,
                postTitle: targetPost.title,
                clientName: targetPost.clientName,
                type: 'client_feedback',
                message: `[Client Feedback] ${actorName} requested changes on "${targetPost.title}"`,
                comment: notes || 'Client requested revisions before approval.',
                actorName,
                actorEmail,
                targetSummary,
              });
            }

            showToast('Client Feedback submitted & studio team notified');
          }}
          onExit={
            isLockedPortalSession
              ? undefined
              : () => {
                  setPortalClient(null);
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('portal');
                    url.searchParams.delete('view');
                    url.searchParams.delete('token');
                    window.history.replaceState({}, '', url.toString());
                  } catch {}
                }
          }
          isDark={isDark}
        />
      );
    }

    // 2. Tab: HOME
    if (activeTab === 'home') {
      return (
        <HomeView
          posts={posts}
          clients={clients}
          subscription={subscription}
          onNavigateToBilling={handleNavigateToBilling}
          onOpenNewPost={handleOpenNewPost}
          onEditPost={handleEditPost}
          isDark={isDark}
          onRefresh={handleManualRefresh}
        />
      );
    }

    // 3. Tab: CLIENTS
    if (activeTab === 'clients') {
      if (selectedClientDetail) {
        return (
          <ClientDetailView
            client={selectedClientDetail}
            posts={posts}
            initialTab={clientDetailTab}
            onBack={() => setSelectedClientDetail(null)}
            onNewPostForClient={(cId) => handleOpenNewPost(undefined, cId)}
            onEditPost={handleEditPost}
            onOpenPortal={(client, tab = 'overview', isViewOnly = true) => {
              setPortalClient(client);
              setPortalTab(tab);
              setPortalIsViewOnly(isViewOnly);
              setIsLockedPortalSession(false);
            }}
            isDark={isDark}
          />
        );
      }
      return (
        <ClientsView
          clients={clients}
          posts={posts}
          subscription={subscription}
          onNavigateToBilling={handleNavigateToBilling}
          onSelectClient={(client, initialTab = 'overview') => {
            setSelectedClientDetail(client);
            setClientDetailTab(initialTab);
          }}
          onOpenNewClientModal={() => {
            setEditingClient(null);
            setIsClientModalOpen(true);
          }}
          onEditClient={(client, e) => {
            e.stopPropagation();
            setEditingClient(client);
            setIsClientModalOpen(true);
          }}
          onDeleteClient={handleDeleteClient}
          onNewPostForClient={(cId) => handleOpenNewPost(undefined, cId)}
          onOpenPortalPreview={(client, tab = 'overview', isViewOnly = true) => {
            setPortalClient(client);
            setPortalTab(tab);
            setPortalIsViewOnly(isViewOnly);
            setIsLockedPortalSession(false);
          }}
          isDark={isDark}
        />
      );
    }

    // 4. Tab: CONTENT / QUEUE (Unified Content Library, Post Queue & Campaigns)
    if (activeTab === 'content' || activeTab === 'queue') {
      return (
        <ContentOverviewView
          posts={posts}
          clients={clients}
          campaigns={campaigns}
          onSaveCampaign={handleSaveCampaign}
          onOpenNewPost={() => handleOpenNewPost()}
          onEditPost={handleEditPost}
          isDark={isDark}
          onRefresh={handleManualRefresh}
        />
      );
    }

    // 5. Tab: MORE & Sub-screens
    if (activeTab === 'more') {
      if (activeMoreSubScreen === 'ideas') {
        return (
          <IdeasBankView
            ideas={ideas}
            clients={clients}
            onBack={handleSubScreenBack}
            onAddToCalendar={handleAddToCalendar}
            onSaveIdea={handleSaveIdea}
            onDeleteIdea={handleDeleteIdea}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'approvals') {
        return (
          <ApprovalsView
            posts={posts}
            clients={clients}
            onBack={handleSubScreenBack}
            onApprovePost={handleApprovePost}
            onRequestChanges={handleRequestChanges}
            onEditPost={handleEditPost}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'media') {
        setActiveMoreSubScreen(null);
        return null;
      }

      if (activeMoreSubScreen === 'campaigns') {
        return (
          <ContentOverviewView
            posts={posts}
            clients={clients}
            campaigns={campaigns}
            onSaveCampaign={handleSaveCampaign}
            onOpenNewPost={() => handleOpenNewPost()}
            onEditPost={handleEditPost}
            initialTab="campaigns"
            isDark={isDark}
            onRefresh={handleManualRefresh}
          />
        );
      }

      if (activeMoreSubScreen === 'analytics') {
        return (
          <AnalyticsView
            posts={posts}
            clients={clients}
            onBack={handleSubScreenBack}
            onSelectPost={(post) => handleEditPost(post)}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'billing') {
        return (
          <BillingView
            subscription={subscription}
            onUpdateSubscription={handleUpdateSubscription}
            clients={clients}
            posts={posts}
            teamMembers={teamMembers}
            onBack={handleSubScreenBack}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'settings') {
        return (
          <SettingsView
            theme={theme}
            onSetTheme={setTheme}
            subscription={subscription}
            currentUser={currentUser}
            myRole={myRole}
            onNavigateToBilling={() => setActiveMoreSubScreen('billing')}
            onBack={handleSubScreenBack}
            onNavigateToTeam={() => setActiveMoreSubScreen('team')}
            onSignOut={handleSignOut}
            onDeleteAccount={() => {
              if (window.confirm('Are you sure you want to delete your account?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'team') {
        return (
          <TeamView
            members={teamMembers}
            currentUserEmail={currentUser?.email}
            myRole={myRole}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSwitchWorkspace={handleSwitchWorkspace}
            onBack={() => setActiveMoreSubScreen('settings')}
            onInviteMember={handleInviteMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onRemoveMember={handleRemoveMember}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'ai-assistants') {
        return (
          <AiAssistantsView
            onBack={handleSubScreenBack}
            onShowToast={showToast}
            isDark={isDark}
            onRefreshSync={() => fetchServerSync()}
          />
        );
      }

      // Default: Return directly to MoreMenuView (Studio Hub)
      return (
        <MoreMenuView
          onNavigateSubScreen={handleSelectSubScreen}
          onNavigateTab={handleSelectTab}
          waitingApprovalsCount={waitingApprovalsCount}
          clientsCount={clients.length}
          subscription={subscription}
          isDark={isDark}
        />
      );
    }

    return null;
  };

  // Sign-in Gate: Protect workspace behind authentication
  if (!currentUser && !isLockedPortalSession) {
    return (
      <SignInView
        onSignInSuccess={(user, initialWorkspaces) => {
          hasLoadedWorkspaceRef.current = false;
          setPosts([]);
          setClients([]);
          setCampaigns([]);
          setIdeas([]);
          setTeamMembers([]);
          setCurrentUser(user);
          if (initialWorkspaces && initialWorkspaces.length > 0) {
            setWorkspaces(initialWorkspaces);
            const defaultWs =
              initialWorkspaces.find((w) => w.isPersonal) || initialWorkspaces[0];
            setActiveWorkspaceId(defaultWs.id);
            if (initialWorkspaces.length > 1) {
              setIsSelectingWorkspace(true);
            }
          } else if (user.personalWorkspaceId) {
            setActiveWorkspaceId(user.personalWorkspaceId);
          }
          showToast(`Welcome, ${user.name}!`);
        }}
        isDark={isDark}
      />
    );
  }

  // Post-Sign-In Workspace Selector Screen (shown when user has access to multiple workspaces)
  if (currentUser && isSelectingWorkspace && workspaces.length > 1 && !isLockedPortalSession) {
    return (
      <div
        id="workspace-selector-screen"
        className={`min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 transition-colors ${
          isDark ? 'bg-[#151C24] text-stone-100' : 'bg-[#FAF7F2] text-[#1E252B]'
        }`}
      >
        <div
          className={`w-full max-w-lg rounded-3xl border p-6 sm:p-8 shadow-xl ${
            isDark ? 'bg-[#1C242E] border-[#2B3746]' : 'bg-white border-[#E6E0D5]'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#C44D34]">
                PostNote Studio
              </span>
              <h1
                className="font-serif text-2xl font-bold tracking-tight mt-0.5"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Select a Workspace
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Signed in as <span className="font-semibold">{currentUser.email}</span>. Choose which isolated workspace you want to open:
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {workspaces.map((ws) => {
              const isPersonal = ws.isPersonal;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    hasLoadedWorkspaceRef.current = false;
                    setActiveWorkspaceId(ws.id);
                    setIsSelectingWorkspace(false);
                    fetchServerSync(ws.id);
                    showToast(`Opened ${ws.name} (${ws.myRole})`);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                    isDark
                      ? 'bg-[#161D26] border-[#2A3646] hover:border-[#C44D34]'
                      : 'bg-[#FAF8F5] border-[#E5DFD3] hover:border-[#C44D34] hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 pr-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm ${
                        isPersonal
                          ? 'bg-[#C44D34] text-white'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isPersonal ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold truncate">{ws.name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C44D34]">
                          {isPersonal ? 'Private · Owner' : `Team · ${ws.myRole}`}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                        {isPersonal
                          ? 'Your private personal workspace'
                          : `Shared by ${ws.ownerName} (${ws.ownerEmail})`}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1 tabular-nums">
                        {ws.clientsCount} client{ws.clientsCount === 1 ? '' : 's'} · {ws.postsCount} post{ws.postsCount === 1 ? '' : 's'} · {ws.membersCount} member{ws.membersCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#C44D34] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="app-root-container"
      className={`min-h-screen w-full flex selection:bg-[#C44D34]/20 transition-colors duration-200 ${
        isDark ? 'bg-[#151C24] text-stone-100' : 'bg-[#FAF7F2] text-[#1E252B]'
      }`}
    >
      {/* Toast alert bubble */}
      <Toast message={toastMessage} isDark={isDark} />
      <OfflineIndicator />

      {/* Desktop Navigation Sidebar (Shown on Desktop screens lg: >= 1024px) */}
      {!portalClient && (
        <div className="hidden lg:block shrink-0">
          <DesktopSidebar
            activeTab={activeTab}
            activeMoreSubScreen={activeMoreSubScreen}
            onSelectTab={handleSelectTab}
            onSelectSubScreen={handleSelectSubScreen}
            onOpenNewPost={() => handleOpenNewPost()}
            clientsCount={clients.length}
            waitingApprovalsCount={waitingApprovalsCount}
            subscription={subscription}
            currentUser={currentUser}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            myRole={myRole}
            teamMembersCount={teamMembers.length}
            onSwitchWorkspace={handleSwitchWorkspace}
            isDark={isDark}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Mobile Top Header with Hamburger Menu (Visible on mobile/tablet, hidden on lg desktop) */}
        {!portalClient && (
          <header
            className={`lg:hidden sticky top-0 z-30 flex items-center justify-between px-3.5 py-2.5 border-b backdrop-blur-md transition-colors ${
              isDark
                ? 'bg-[#151C24]/95 border-[#242E3B] text-stone-200'
                : 'bg-[#FAF7F2]/95 border-[#E8E2D8] text-[#1E252B]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <button
                id="mobile-drawer-toggle"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="p-1.5 -ml-1 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#C44D34] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  P
                </div>
                <span className="font-serif font-bold text-sm tracking-tight">PostNote</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                title={
                  syncMode === 'cloud'
                    ? 'Connected / Cloud Mode: Workspace changes sync to Firestore & Cloud'
                    : 'Offline / Static Mode: Running on static host with browser local storage'
                }
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold tracking-wide select-none ${
                  syncMode === 'cloud'
                    ? isDark
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                    : isDark
                    ? 'bg-amber-950/40 border-amber-800/50 text-amber-400'
                    : 'bg-amber-50 border-amber-200/80 text-amber-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    syncMode === 'cloud' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>{syncMode === 'cloud' ? 'Connected / Cloud' : 'Offline / Static'}</span>
              </div>

              {/* Mobile Notification Bell */}
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className={`relative p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#1D242C] border-[#2A3440] text-stone-300 hover:text-white'
                    : 'bg-white border-[#E8E4DC] text-stone-700 hover:text-stone-900'
                }`}
                aria-label="Team Notifications"
                title="Team & Approval Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#C44D34] text-white text-[9px] font-extrabold flex items-center justify-center tabular-nums">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              <PWAInstallButton variant="header" isDark={isDark} />

              <button
                onClick={() => handleOpenNewPost()}
                className="px-2.5 py-1.5 bg-[#C44D34] hover:bg-[#b04028] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Post</span>
              </button>
            </div>
          </header>
        )}

        {/* Subtle Desktop Top Status Header (Visible on lg desktop screens) */}
        {!portalClient && (
          <div
            className={`hidden lg:flex items-center justify-between px-6 py-2 border-b text-xs transition-colors relative z-30 ${
              isDark
                ? 'bg-[#151C24]/90 border-[#242E3B] text-stone-400'
                : 'bg-[#FAF7F2]/90 border-[#E8E2D8] text-stone-500'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-stone-700 dark:text-stone-300 truncate">
                {workspaces.find((w) => w.id === activeWorkspaceId)?.name ||
                  (currentUser ? `${currentUser.name}'s Private Studio` : 'Workspace')}
              </span>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <span className="text-[11px] text-stone-400 truncate">
                {currentUser?.email}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <PWAInstallButton variant="header" isDark={isDark} />

              {/* Desktop Notification Bell Button */}
              <button
                id="header-notification-bell-btn"
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#1C242E] border-[#2A3543] text-stone-200 hover:border-[#C44D34]'
                    : 'bg-white border-[#E5DFD3] text-stone-700 hover:border-[#C44D34]'
                }`}
                title="View Team & Approval Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-[#C44D34]" />
                <span>Notifications</span>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#C44D34] text-white text-[10px] font-extrabold tabular-nums">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              <div
                id="sync-mode-indicator"
                title={
                  syncMode === 'cloud'
                    ? 'Connected / Cloud Mode: Workspace changes sync to Firestore & Cloud'
                    : 'Offline / Static Mode: Running on static host with local browser storage'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold tracking-wide transition-colors select-none ${
                  syncMode === 'cloud'
                    ? isDark
                      ? 'bg-emerald-950/35 border-emerald-800/50 text-emerald-400'
                      : 'bg-emerald-50/90 border-emerald-200/80 text-emerald-700'
                    : isDark
                    ? 'bg-amber-950/35 border-amber-800/50 text-amber-400'
                    : 'bg-amber-50/90 border-amber-200/80 text-amber-700'
                }`}
              >
                {syncMode === 'cloud' ? (
                  <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>
                  {syncMode === 'cloud' ? 'Connected / Cloud' : 'Offline / Static'}
                </span>
                <span className="text-[10px] opacity-75 font-normal hidden xl:inline">
                  {syncMode === 'cloud' ? '(Firestore Sync)' : '(Local Storage)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Team & Submitter Notifications Popover */}
        {isNotificationsOpen && (
          <div
            onClick={() => setIsNotificationsOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          >
            <div
              id="team-notifications-popover"
              onClick={(e) => e.stopPropagation()}
              className={`fixed top-12 right-3 sm:right-6 w-[360px] max-w-[92vw] max-h-[75vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden z-50 animate-fade-in ${
                isDark
                  ? 'bg-[#19212B] border-[#2C3847] text-stone-100'
                  : 'bg-white border-[#E5DFD3] text-[#1E252B]'
              }`}
            >
              <div
                className={`px-4 py-3 border-b flex items-center justify-between ${
                  isDark ? 'bg-[#1E2733] border-[#2C3847]' : 'bg-[#FAF7F2] border-[#E8E4DC]'
                }`}
              >
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#C44D34]">
                    Team & Review Notifications
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Alerts for content creators, submitters & approvers
                  </p>
                </div>
                {notifications.some((n) => !n.read) && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="text-[10px] font-bold text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400">
                    <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                    <p>No team notifications yet.</p>
                    <p className="text-[11px] mt-1">
                      When changes are requested, posts are approved, or comments are added, notifications appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const matchedPost = posts.find((p) => p.id === notif.postId);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setNotifications((prev) =>
                            prev.map((item) =>
                              item.id === notif.id ? { ...item, read: true } : item
                            )
                          );
                          setIsNotificationsOpen(false);
                          if (matchedPost) {
                            handleEditPost(matchedPost, 'activity');
                          }
                        }}
                        className={`p-3.5 text-xs transition-colors cursor-pointer ${
                          !notif.read
                            ? isDark
                              ? 'bg-[#222C3A]/70 hover:bg-[#263242]'
                              : 'bg-amber-50/40 hover:bg-stone-50'
                            : isDark
                            ? 'hover:bg-[#1E2733]'
                            : 'hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-100">
                            {notif.type === 'changes_requested' ? (
                              <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : notif.type === 'approved' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5 text-[#C44D34] shrink-0" />
                            )}
                            <span>{notif.clientName}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono tabular-nums shrink-0">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="mt-1 text-stone-700 dark:text-stone-300 leading-snug">
                          {notif.message}
                        </p>

                        {notif.comment && (
                          <div
                            className={`mt-1.5 p-2 rounded-lg border text-[11px] ${
                              isDark
                                ? 'bg-[#151C24] border-[#2A3543] text-amber-300'
                                : 'bg-white border-amber-200 text-stone-700'
                            }`}
                          >
                            &ldquo;{notif.comment}&rdquo;
                          </div>
                        )}

                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                          <span className="truncate">
                            Notified: <strong className="text-stone-500 dark:text-stone-300">{notif.targetSummary}</strong>
                          </span>
                          <span className="text-[#C44D34] font-bold shrink-0 ml-2">
                            Open Activity →
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col">
          {renderScreenContent()}
        </main>

        {/* Sticky Mobile Bottom Navigation Bar (Visible on mobile/tablet < 1024px) */}
        {!portalClient && (
          <div className="lg:hidden sticky bottom-0 z-30">
            <BottomNav
              activeTab={activeTab === 'queue' ? 'content' : activeTab}
              onSelectTab={(tab) => handleSelectTab(tab)}
              isDark={isDark}
            />
          </div>
        )}

        {/* Slide-out Mobile Navigation Drawer (Houses all Studio, Workflow, Intelligence, and Management items) */}
        <MobileNavDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          activeTab={activeTab}
          activeMoreSubScreen={activeMoreSubScreen || undefined}
          onSelectTab={handleSelectTab}
          onSelectSubScreen={handleSelectSubScreen}
          onOpenNewPost={() => handleOpenNewPost()}
          clientsCount={clients.length}
          waitingApprovalsCount={waitingApprovalsCount}
          subscription={subscription}
          currentUser={currentUser}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          myRole={myRole}
          teamMembersCount={teamMembers.length}
          onSwitchWorkspace={handleSwitchWorkspace}
          onSignOut={handleSignOut}
          isDark={isDark}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </div>

      {/* Post Details / Edit / Create Pop-up Modal */}
      {isPostFormOpen && (
        <PostFormView
          initialPost={editingPost}
          clients={clients}
          campaigns={campaigns}
          mediaLibrary={mediaFiles}
          preselectedClientId={preselectedClientId}
          preselectedDate={preselectedDate}
          initialModalTab={initialPostModalTab}
          currentUser={currentUser}
          myRole={myRole}
          onBack={() => {
            setIsPostFormOpen(false);
            setEditingPost(null);
          }}
          onSave={handleSavePost}
          onCreateClient={(clientData) => handleSaveClient(clientData)}
          onDelete={handleDeletePost}
          onApprovePost={handleApprovePost}
          onRequestChanges={handleRequestChanges}
          onAddPostComment={handleAddPostComment}
          onDeletePostComment={handleDeletePostComment}
          onUploadToLibrary={handleUploadMedia}
          isDark={isDark}
        />
      )}

      {/* Client Modal (New / Edit) */}
      <ClientModal
        isOpen={isClientModalOpen}
        clientToEdit={editingClient}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        isDark={isDark}
      />
    </div>
  );
}
