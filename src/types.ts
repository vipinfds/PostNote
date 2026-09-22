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
  | 'ai-assistants';

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

export interface TeamMember {
  id: string;
  name?: string;
  email: string;
  role?: string;
  status: 'active' | 'invited';
  avatar?: string;
  initials?: string;
  isYou?: boolean;
}
