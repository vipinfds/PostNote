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
} from './types';
import {
  INITIAL_POSTS,
  INITIAL_CLIENTS,
  INITIAL_CAMPAIGNS,
  INITIAL_IDEAS,
  INITIAL_MEDIA,
  INITIAL_TEAM,
} from './data/initialData';

// Component imports
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

// More sub-screens
import { MoreMenuView } from './components/MoreMenuView';
import { IdeasBankView } from './components/IdeasBankView';
import { ApprovalsView } from './components/ApprovalsView';
import { MediaLibraryView } from './components/MediaLibraryView';
import { CampaignsView } from './components/CampaignsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { TeamView } from './components/TeamView';
import { AiAssistantsView } from './components/AiAssistantsView';

export default function App() {
  // Navigation States
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeMoreSubScreen, setActiveMoreSubScreen] = useState<MoreSubScreen | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);

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

  useEffect(() => {
    localStorage.setItem('postnote_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  // Toast trigger
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2500);
  };

  // Tab navigation with light screen loading flash
  const handleSelectTab = (tab: TabType) => {
    if (tab === activeTab && !activeMoreSubScreen && !selectedClientDetail && !isPostFormOpen) {
      return;
    }
    setIsLoadingScreen(true);
    setActiveTab(tab);
    setActiveMoreSubScreen(null);
    setSelectedClientDetail(null);
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
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const waitingApprovalsCount = posts.filter((p) => p.status === 'In review').length;

  // Render the current active screen
  const renderScreenContent = () => {
    if (isLoadingScreen) {
      return <ScreenLoader isDark={isDark} />;
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
            onBack={() => setSelectedClientDetail(null)}
            onNewPostForClient={(cId) => handleOpenNewPost(undefined, cId)}
            onEditPost={handleEditPost}
            isDark={isDark}
          />
        );
      }
      return (
        <ClientsView
          clients={clients}
          posts={posts}
          onSelectClient={(client) => setSelectedClientDetail(client)}
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
          isDark={isDark}
        />
      );
    }

    // 4. Tab: CONTENT (Content Overview)
    if (activeTab === 'content') {
      return (
        <ContentOverviewView
          posts={posts}
          clients={clients}
          onOpenNewPost={() => handleOpenNewPost()}
          onEditPost={handleEditPost}
          isDark={isDark}
        />
      );
    }

    // 5. Tab: QUEUE (Post Queue)
    if (activeTab === 'queue') {
      return (
        <QueueView
          posts={posts}
          onOpenNewPost={() => handleOpenNewPost()}
          onEditPost={handleEditPost}
          isDark={isDark}
        />
      );
    }

    // 6. Tab: MORE & Sub-screens
    if (activeTab === 'more') {
      if (activeMoreSubScreen === 'ideas') {
        return (
          <IdeasBankView
            ideas={ideas}
            clients={clients}
            onBack={() => setActiveMoreSubScreen(null)}
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
            onBack={() => setActiveMoreSubScreen(null)}
            onApprovePost={handleApprovePost}
            onRequestChanges={handleRequestChanges}
            onEditPost={handleEditPost}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'media') {
        return (
          <MediaLibraryView
            mediaFiles={mediaFiles}
            onBack={() => setActiveMoreSubScreen(null)}
            onUploadMedia={handleUploadMedia}
            onDeleteMedia={handleDeleteMedia}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'campaigns') {
        return (
          <CampaignsView
            campaigns={campaigns}
            clients={clients}
            posts={posts}
            onBack={() => setActiveMoreSubScreen(null)}
            onSaveCampaign={handleSaveCampaign}
            onSelectPost={handleEditPost}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'analytics') {
        return (
          <AnalyticsView
            posts={posts}
            clients={clients}
            onBack={() => setActiveMoreSubScreen(null)}
            isDark={isDark}
          />
        );
      }

      if (activeMoreSubScreen === 'settings') {
        return (
          <SettingsView
            theme={theme}
            onSetTheme={setTheme}
            onBack={() => setActiveMoreSubScreen(null)}
            onNavigateToTeam={() => setActiveMoreSubScreen('team')}
            onSignOut={() => showToast('Signed out of session')}
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
            onBack={() => setActiveMoreSubScreen(null)}
            onShowToast={showToast}
            isDark={isDark}
          />
        );
      }

      // Default More Menu
      return (
        <MoreMenuView
          onNavigateSubScreen={(sub) => setActiveMoreSubScreen(sub)}
          waitingApprovalsCount={waitingApprovalsCount}
          isDark={isDark}
        />
      );
    }

    return null;
  };

  return (
    <div
      id="app-root-container"
      className={`min-h-screen w-full flex justify-center selection:bg-[#C44D34]/20 transition-colors duration-200 ${
        isDark ? 'bg-[#12171D] text-stone-100' : 'bg-[#F4EFEA] text-[#1E252B]'
      }`}
    >
      {/* Mobile-proportioned container matching the screen recording frame */}
      <div
        id="phone-viewport"
        className={`w-full max-w-md min-h-screen relative flex flex-col transition-colors ${
          isDark ? 'bg-[#151C24]' : 'bg-[#FAF7F2]'
        } shadow-2xl`}
      >
        {/* Toast alert bubble */}
        <Toast message={toastMessage} isDark={isDark} />

        {/* Main View Area */}
        <main className="flex-1 flex flex-col">
          {renderScreenContent()}
        </main>

        {/* Bottom Navigation (5 tabs: Home, Clients, Content, Queue, More) */}
        {!isPostFormOpen && (
          <BottomNav
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
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
    </div>
  );
}
