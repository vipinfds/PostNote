import React, { useState, useEffect } from 'react';
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
} from './types';
import {
  INITIAL_POSTS,
  INITIAL_CLIENTS,
  INITIAL_CAMPAIGNS,
  INITIAL_IDEAS,
  INITIAL_MEDIA,
  INITIAL_TEAM,
} from './data/initialData';
import { INITIAL_SUBSCRIPTION_STATE } from './data/pricingData';
import { Menu, Plus } from 'lucide-react';

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
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem('postnote_auth_user') || sessionStorage.getItem('postnote_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSignOut = () => {
    localStorage.removeItem('postnote_auth_user');
    sessionStorage.removeItem('postnote_auth_user');
    setCurrentUser(null);
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

  // Database persistent state
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const cached = localStorage.getItem('postnote_posts_v2');
      return cached ? JSON.parse(cached) : INITIAL_POSTS;
    } catch {
      return INITIAL_POSTS;
    }
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const cached = localStorage.getItem('postnote_clients_v2');
      return cached ? JSON.parse(cached) : INITIAL_CLIENTS;
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const cached = localStorage.getItem('postnote_campaigns_v2');
      return cached ? JSON.parse(cached) : INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  });

  const [ideas, setIdeas] = useState<Idea[]>(() => {
    try {
      const cached = localStorage.getItem('postnote_ideas_v2');
      return cached ? JSON.parse(cached) : INITIAL_IDEAS;
    } catch {
      return INITIAL_IDEAS;
    }
  });

  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>(() => {
    try {
      const cached = localStorage.getItem('postnote_media_v2');
      return cached ? JSON.parse(cached) : INITIAL_MEDIA;
    } catch {
      return INITIAL_MEDIA;
    }
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const cached = localStorage.getItem('postnote_team_v2');
      return cached ? JSON.parse(cached) : INITIAL_TEAM;
    } catch {
      return INITIAL_TEAM;
    }
  });

  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    try {
      const cached = localStorage.getItem('postnote_subscription_v2');
      return cached ? JSON.parse(cached) : INITIAL_SUBSCRIPTION_STATE;
    } catch {
      return INITIAL_SUBSCRIPTION_STATE;
    }
  });

  // Bidirectional sync with backend server for Claude MCP read/write operations
  const fetchServerSync = async () => {
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        setPosts((current) => {
          // If server has different posts count or newer items, sync
          if (JSON.stringify(current) !== JSON.stringify(data.posts)) {
            return data.posts;
          }
          return current;
        });
      }
      if (Array.isArray(data.clients) && data.clients.length > 0) {
        setClients((current) => {
          if (JSON.stringify(current) !== JSON.stringify(data.clients)) {
            return data.clients;
          }
          return current;
        });
      }
    } catch {
      // offline or local dev fallback
    }
  };

  useEffect(() => {
    fetchServerSync();
    const interval = setInterval(fetchServerSync, 8000);
    const handleFocus = () => fetchServerSync();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Sync changes from UI back to backend for Claude MCP tools to read
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts, clients, campaigns, ideas }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [posts, clients, campaigns, ideas]);

  // Local storage caching effects
  useEffect(() => {
    localStorage.setItem('postnote_posts_v2', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('postnote_clients_v2', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('postnote_campaigns_v2', JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem('postnote_ideas_v2', JSON.stringify(ideas));
  }, [ideas]);

  useEffect(() => {
    localStorage.setItem('postnote_media_v2', JSON.stringify(mediaFiles));
  }, [mediaFiles]);

  useEffect(() => {
    localStorage.setItem('postnote_team_v2', JSON.stringify(teamMembers));
  }, [teamMembers]);

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
    if (postData.id) {
      // Update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postData.id
            ? { ...p, ...postData, id: postData.id! }
            : p
        )
      );
      showToast('Post updated');
    } else {
      // Create new
      const newPost: Post = {
        ...postData,
        id: `post-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => [newPost, ...prev]);
      showToast('Post created');
    }
    setIsPostFormOpen(false);
    setEditingPost(null);
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
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
    if (clientData.id) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientData.id
            ? { ...c, ...clientData, id: clientData.id! }
            : c
        )
      );
      showToast('Client updated');
      if (selectedClientDetail?.id === clientData.id) {
        setSelectedClientDetail((prev) => (prev ? { ...prev, ...clientData } : null));
      }
    } else {
      const newClient: Client = {
        ...clientData,
        id: `client-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setClients((prev) => [...prev, newClient]);
      showToast('Client added');
    }
  };

  const handleDeleteClient = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    showToast('Client deleted');
    if (selectedClientDetail?.id === clientId) {
      setSelectedClientDetail(null);
    }
  };

  // Ideas handlers
  const handleAddToCalendar = (idea: Idea) => {
    setEditingPost(null);
    setPreselectedClientId(idea.clientId);
    setPreselectedDate('2026-09-20');
    // Prepopulate post form
    setEditingPost({
      id: '',
      title: idea.title,
      caption: idea.description || '',
      category: idea.category,
      clientId: idea.clientId,
      clientName: idea.clientName,
      date: '2026-09-20',
      status: 'Planned',
      platform: 'Instagram',
      createdAt: new Date().toISOString(),
    });
    setIsPostFormOpen(true);
    showToast('Idea loaded into composer');
  };

  const handleSaveIdea = (ideaData: Omit<Idea, 'id' | 'createdAt'> & { id?: string }) => {
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
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    showToast('Idea deleted');
  };

  // Approvals handlers
  const handleApprovePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'Approved' } : p))
    );
    showToast('Post approved');
  };

  const handleRequestChanges = (postId: string) => {
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

  const handleDeleteMedia = (id: string) => {
    setMediaFiles((prev) => prev.filter((m) => m.id !== id));
    showToast('File deleted');
  };

  // Campaign handlers
  const handleSaveCampaign = (campData: Omit<Campaign, 'id'>) => {
    const newCamp: Campaign = {
      ...campData,
      id: `camp-${Date.now()}`,
    };
    setCampaigns((prev) => [...prev, newCamp]);
    showToast('Campaign created');
  };

  // Team handlers
  const handleInviteMember = (email: string) => {
    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: email.split('@')[0],
      email,
      role: 'Member',
      status: 'invited',
    };
    setTeamMembers((prev) => [...prev, newMember]);
    showToast('Invitation sent');
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    showToast('Member removed');
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
            onBack={() => setActiveMoreSubScreen('settings')}
            onInviteMember={handleInviteMember}
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
            onRefreshSync={fetchServerSync}
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
        onSignInSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.name}!`);
        }}
        isDark={isDark}
      />
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
