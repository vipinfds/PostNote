export type TabType = 'home' | 'clients' | 'content' | 'queue' | 'more';
export type MainTab = TabType;

export type MoreSubScreen =
  | 'ideas'
  | 'approvals'
  | 'media'
  | 'campaigns'
  | 'analytics'
  | 'settings'
  | 'team'
  | 'ai-assistants'
  | 'billing';

export type PlanTierId = 'free' | 'solo' | 'agency' | 'studio' | 'enterprise';
export type BillingInterval = 'monthly' | 'annual';
export type CurrencyCode = 'USD' | 'INR' | 'AED';

export interface SubscriptionState {
  planId: PlanTierId;
  interval: BillingInterval;
  currency: CurrencyCode;
  isTrial: boolean;
  trialDaysLeft: number;
  isFoundingMember: boolean;
  extraClients: number;
  startedAt: string;
  renewsAt: string;
  paymentMethod?: string;
  lastPaymentAmount?: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type PostCategory =
  | 'POST'
  | 'TIPS'
  | 'BEHIND THE SCENES'
  | 'QUOTE'
  | 'EDUCATE'
  | 'ENGAGE'
  | 'RELAX';

export type PostStatus =
  | 'Planned'
  | 'In review'
  | 'Approved'
  | 'Scheduled'
  | 'Published';

export type Platform =
  | 'Instagram'
  | 'Facebook'
  | 'LinkedIn'
  | 'Twitter'
  | 'TikTok'
  | 'Other';

export type PostPlatform = Platform;

export interface Client {
  id: string;
  name: string;
  handle: string;
  color: string;
  notes?: string;
  postsCount?: number;
  createdAt?: string;
}

export interface Post {
  id: string;
  clientId: string;
  clientName: string;
  campaignId?: string;
  campaign?: string;
  date: string; // YYYY-MM-DD
  status: PostStatus;
  category: PostCategory;
  platform: Platform;
  title: string;
  caption: string;
  media?: MediaItem[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt?: string;
}

export interface Idea {
  id: string;
  clientId: string;
  clientName: string;
  category: PostCategory;
  title: string;
  description?: string;
  createdAt?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  url?: string;
  thumbnailUrl?: string;
  duration?: string;
  videoSrc?: string;
  createdAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  description?: string;
  postsCount?: number;
}

export type WorkspaceRole = 'Owner' | 'Admin' | 'Manager' | 'Editor' | 'Viewer';

export interface TeamMember {
  id: string;
  name?: string;
  email: string;
  role?: WorkspaceRole | string;
  status: 'active' | 'invited';
  avatar?: string;
  initials?: string;
  isYou?: boolean;
  addedAt?: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  myRole: WorkspaceRole;
  isPersonal: boolean;
  membersCount: number;
  clientsCount: number;
  postsCount: number;
}

