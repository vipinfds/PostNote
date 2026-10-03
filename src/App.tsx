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
} from './types';
import {
  INITIAL_MEDIA,
} from './data/initialData';
import { INITIAL_SUBSCRIPTION_STATE } from './data/pricingData';
import { getTodayDateStr } from './utils/theme';
import { Menu, Plus, Building2, Shield, ArrowRight, Lock, Users, LogOut } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signOutFirebase,
  ensureFirestoreWorkspace,
  syncClientToFirestore,
  syncPostToFirestore,
  deletePostFromFirestore,
  syncMemberToFirestore,
  deleteMemberFromFirestore,
} from './firebase';

// Component imports
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { HomeView } from './components/HomeView';
import { ClientsView } from './components/ClientsView';
import { ClientDetailView } from './components/ClientDetailView';
import { ContentOverviewView } from './components/ContentOverviewView';
import { QueueView } from './components/QueueView';
import { PostFormView } from './components/PostFormView';
import { ClientModal } from './components/ClientModal';
import { Toast } from './components/Toast';
import { ScreenLoader } from './components/ScreenLoader';

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
  const hasLoadedWorkspaceRef = useRef(false);

  // Synchronize Firebase Auth state with isolated tenant session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser || !fbUser.email) return;
      const cleanEmail = fbUser.email.trim().toLowerCase();
      const displayName = fbUser.displayName || cleanEmail.split('@')[0] || 'Studio User';
      const personalWsId = `ws_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      ensureFirestoreWorkspace(personalWsId, `${displayName}'s Studio`).catch(() => {});
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

  // Bidirectional multi-tenant sync with backend server (strictly isolated by user email & workspaceId)
  const fetchServerSync = async (overrideWsId?: string) => {
    if (!currentUser?.email) return;
    try {
      const targetWs = overrideWsId ?? activeWorkspaceId;
      const params = new URLSearchParams({ email: currentUser.email });
      if (targetWs) params.set('workspaceId', targetWs);

      const res = await fetch(`/api/sync?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();

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
    } catch {
      // offline or local dev fallback
    }
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

  // Sync changes from UI back to isolated tenant workspace
  useEffect(() => {
    if (!currentUser?.email || !activeWorkspaceId || !hasLoadedWorkspaceRef.current) return;
    if (myRole === 'Viewer') return;

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

  // Open Post Form (New or Edit)
  const handleOpenNewPost = (initialDate?: string, clientId?: string) => {
    setEditingPost(null);
    setPreselectedDate(initialDate);
    setPreselectedClientId(clientId);
    setIsPostFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setPreselectedDate(undefined);
    setPreselectedClientId(undefined);
    setIsPostFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePost = (postData: Omit<Post, 'id' | 'createdAt'> & { id?: string }) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access and cannot create or edit posts');
      return;
    }
    if (postData.id) {
      const updatedPost: Post = { ...postData, id: postData.id };
      setPosts((prev) =>
        prev.map((p) => (p.id === postData.id ? { ...p, ...updatedPost } : p))
      );
      if (auth.currentUser && activeWorkspaceId) {
        syncPostToFirestore(activeWorkspaceId, auth.currentUser.uid, updatedPost, false).catch(
          () => {}
        );
      }
      showToast('Post updated');
    } else {
      const newPost: Post = {
        ...postData,
        id: `post-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => [newPost, ...prev]);
      if (auth.currentUser && activeWorkspaceId) {
        syncPostToFirestore(activeWorkspaceId, auth.currentUser.uid, newPost, true).catch(
          () => {}
        );
      }
      showToast('Post created');
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

  // Approvals handlers
  const handleApprovePost = (postId: string) => {
    if (myRole === 'Viewer' || myRole === 'Editor') {
      showToast('Only Owners, Admins, and Managers can approve posts');
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'Approved' } : p))
    );
    showToast('Post approved');
  };

  const handleRequestChanges = (postId: string) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access');
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'Planned' } : p))
    );
    showToast('Sent back to planned');
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
  const handleSaveCampaign = (campData: Omit<Campaign, 'id'>) => {
    if (myRole === 'Viewer') {
      showToast('Viewers have read-only access');
      return;
    }
    const newCamp: Campaign = {
      ...campData,
      id: `camp-${Date.now()}`,
    };
    setCampaigns((prev) => [...prev, newCamp]);
    showToast('Campaign created');
  };

  // Team & RBAC handlers
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
    } catch {
      showToast('Failed to invite team member');
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
      const data = await res.json();
      if (res.ok && Array.isArray(data.teamMembers)) {
        setTeamMembers(data.teamMembers);
        const updatedMember = data.teamMembers.find((m: TeamMember) => m.id === memberId);
        if (auth.currentUser && activeWorkspaceId && updatedMember) {
          syncMemberToFirestore(activeWorkspaceId, updatedMember, role, false).catch(() => {});
        }
        showToast(`Updated role to ${role}`);
      } else {
        showToast(data.error || 'Could not update role');
      }
    } catch {
      showToast('Could not update role');
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
      const data = await res.json();
      if (res.ok && Array.isArray(data.teamMembers)) {
        setTeamMembers(data.teamMembers);
        if (auth.currentUser && activeWorkspaceId) {
          deleteMemberFromFirestore(activeWorkspaceId, memberId).catch(() => {});
        }
        showToast('Member access revoked');
      } else {
        showToast(data.error || 'Could not remove member');
      }
    } catch {
      showToast('Could not remove member');
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
          subscription={subscription}
          initialTab={portalTab}
          isViewOnly={portalIsViewOnly}
          isLockedPortal={isLockedPortalSession}
          onApprovePost={handleApprovePost}
          onRequestChanges={(postId, notes) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      status: 'Planned',
                      caption: notes ? `${p.caption}\n\n[Client Feedback]: ${notes}` : p.caption,
                    }
                  : p
              )
            );
            showToast('Feedback submitted to studio team');
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

    // 1. If Post Form is open (New or Edit)
    if (isPostFormOpen) {
      return (
        <PostFormView
          initialPost={editingPost}
          clients={clients}
          campaigns={campaigns}
          mediaLibrary={mediaFiles}
          preselectedClientId={preselectedClientId}
          preselectedDate={preselectedDate}
          onBack={() => {
            setIsPostFormOpen(false);
            setEditingPost(null);
          }}
          onSave={handleSavePost}
          onCreateClient={(clientData) => handleSaveClient(clientData)}
          onDelete={handleDeletePost}
          onUploadToLibrary={handleUploadMedia}
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
          />
        );
      }

      if (activeMoreSubScreen === 'analytics') {
        return (
          <AnalyticsView
            posts={posts}
            clients={clients}
            onBack={handleSubScreenBack}
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

      {/* Desktop Navigation Sidebar (Shown on Desktop screens lg: >= 1024px) */}
      {!portalClient && !isPostFormOpen && (
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
        {!portalClient && !isPostFormOpen && (
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

        <main className="flex-1 flex flex-col">
          {renderScreenContent()}
        </main>

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
