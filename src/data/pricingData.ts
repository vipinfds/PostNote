import { PlanTierId, BillingInterval, CurrencyCode } from '../types';

export interface PlanPricing {
  launchMonthly: number;
  regularMonthly: number;
  annualMonthly: number; // Price per month when billed annually
}

export interface PlanTier {
  id: PlanTierId;
  name: string;
  badge?: string;
  subtitle: string;
  targetUser: string;
  pricing: Record<CurrencyCode, PlanPricing>;
  extraClientPrice: Record<CurrencyCode, number | null>; // Price per extra client/mo
  limits: {
    clients: number | 'Unlimited';
    teamMembers: number | 'Unlimited';
    reviewers: string;
    posts: string;
    campaigns: number | 'Unlimited';
    mediaStorage: string;
    mediaStorageMB: number;
    approvalLinks: string;
    analytics: string;
    branding: string;
    support: string;
  };
  features: string[];
  isPopular?: boolean;
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, { symbol: string; position: 'prefix' | 'suffix'; code: string }> = {
  USD: { symbol: '$', position: 'prefix', code: 'USD' },
  INR: { symbol: '₹', position: 'prefix', code: 'INR' },
  AED: { symbol: 'AED ', position: 'prefix', code: 'AED' },
};

export const PLANS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'Try PostNote with zero risk',
    targetUser: 'A freelancer testing with one client',
    pricing: {
      USD: { launchMonthly: 0, regularMonthly: 0, annualMonthly: 0 },
      INR: { launchMonthly: 0, regularMonthly: 0, annualMonthly: 0 },
      AED: { launchMonthly: 0, regularMonthly: 0, annualMonthly: 0 },
    },
    extraClientPrice: { USD: null, INR: null, AED: null },
    limits: {
      clients: 1,
      teamMembers: 1,
      reviewers: '2 reviewers',
      posts: '~25 / month',
      campaigns: 1,
      mediaStorage: '100 MB',
      mediaStorageMB: 100,
      approvalLinks: 'Basic links',
      analytics: 'Basic stats',
      branding: 'Standard PostNote footer',
      support: 'Community',
    },
    features: [
      '1 Client workspace',
      '1 Team member seat',
      '2 Client reviewers (free)',
      '~25 Scheduled posts / month',
      'Content calendar & ideas bank',
      'Status pipeline (planned → published)',
      '1 Active campaign',
      '100 MB Media storage',
      'Basic approval links',
      'Community support',
    ],
  },
  {
    id: 'solo',
    name: 'Solo',
    subtitle: 'For independent creators & solo practitioners',
    targetUser: 'A freelancer with 2-3 client retainers',
    pricing: {
      USD: { launchMonthly: 12, regularMonthly: 15, annualMonthly: 10 },
      INR: { launchMonthly: 499, regularMonthly: 699, annualMonthly: 399 },
      AED: { launchMonthly: 29, regularMonthly: 39, annualMonthly: 24 },
    },
    extraClientPrice: { USD: null, INR: null, AED: null },
    limits: {
      clients: 3,
      teamMembers: 1,
      reviewers: 'Unlimited (Always free)',
      posts: 'Unlimited',
      campaigns: 3,
      mediaStorage: '2 GB',
      mediaStorageMB: 2048,
      approvalLinks: 'Full link sharing',
      analytics: 'Basic performance',
      branding: 'Standard PostNote',
      support: 'Standard Email',
    },
    features: [
      'Up to 3 Client workspaces',
      '1 Team member seat',
      'Unlimited client reviewers (free)',
      'Unlimited scheduled posts',
      'Content calendar & ideas bank',
      'Full status pipeline',
      '3 Active campaigns',
      '2 GB Media library storage',
      'Client approval links with comments',
      'Basic analytics & calendar exports',
      'Standard email support',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    badge: 'MOST POPULAR',
    isPopular: true,
    subtitle: 'Everything small teams need to scale retainers',
    targetUser: 'Small agency of 2-3 people with up to 10 clients',
    pricing: {
      USD: { launchMonthly: 29, regularMonthly: 39, annualMonthly: 25 },
      INR: { launchMonthly: 1499, regularMonthly: 1999, annualMonthly: 1249 },
      AED: { launchMonthly: 79, regularMonthly: 99, annualMonthly: 66 },
    },
    extraClientPrice: { USD: 3, INR: 249, AED: 12 },
    limits: {
      clients: 10,
      teamMembers: 3,
      reviewers: 'Unlimited (Always free)',
      posts: 'Unlimited',
      campaigns: 'Unlimited',
      mediaStorage: '10 GB',
      mediaStorageMB: 10240,
      approvalLinks: 'Full with logo branding',
      analytics: 'Full insights & exports',
      branding: 'Agency logo on client view',
      support: 'Fast Email',
    },
    features: [
      'Up to 10 Client workspaces',
      '3 Team member seats included',
      'Unlimited client reviewers (never counts as seats)',
      'Unlimited scheduled posts',
      'Content calendar & ideas bank',
      'Unlimited campaigns & content streams',
      '10 GB Media library storage',
      'Client approval links with direct sign-off',
      'Full analytics & engagement tracking',
      'Agency logo branded client view',
      'Add extra clients (+$3/client/mo)',
      'Fast email support',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    badge: 'FOR GROWING AGENCIES',
    subtitle: 'Advanced power for mature studios & creative shops',
    targetUser: 'Established agency with a bigger team and up to 25 clients',
    pricing: {
      USD: { launchMonthly: 59, regularMonthly: 79, annualMonthly: 50 },
      INR: { launchMonthly: 3499, regularMonthly: 4499, annualMonthly: 2999 },
      AED: { launchMonthly: 179, regularMonthly: 219, annualMonthly: 149 },
    },
    extraClientPrice: { USD: 2, INR: 169, AED: 8 },
    limits: {
      clients: 25,
      teamMembers: 10,
      reviewers: 'Unlimited (Always free)',
      posts: 'Unlimited',
      campaigns: 'Unlimited',
      mediaStorage: '50 GB',
      mediaStorageMB: 51200,
      approvalLinks: 'Full white-label',
      analytics: 'Full advanced insights',
      branding: 'Full white-label experience',
      support: 'Priority 24/7',
    },
    features: [
      'Up to 25 Client workspaces',
      '10 Team member seats included',
      'Unlimited client reviewers (always free)',
      'Unlimited scheduled posts',
      'Content calendar & ideas bank',
      'Unlimited campaigns',
      '50 GB High-speed media library',
      'Full white-label client approval view',
      'Advanced analytics & automated reports',
      'Add extra clients (+$2/client/mo)',
      'Priority customer support',
      'Early access to new AI & publishing features',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'CUSTOM VOLUME',
    subtitle: 'Tailored terms for multi-brand holding groups & networks',
    targetUser: 'Multi-brand or multi-office setups needing custom terms',
    pricing: {
      USD: { launchMonthly: 199, regularMonthly: 249, annualMonthly: 169 },
      INR: { launchMonthly: 14999, regularMonthly: 19999, annualMonthly: 12999 },
      AED: { launchMonthly: 699, regularMonthly: 899, annualMonthly: 599 },
    },
    extraClientPrice: { USD: 0, INR: 0, AED: 0 },
    limits: {
      clients: 'Unlimited',
      teamMembers: 'Unlimited',
      reviewers: 'Unlimited',
      posts: 'Unlimited',
      campaigns: 'Unlimited',
      mediaStorage: 'Custom / Unlimited',
      mediaStorageMB: 1024000,
      approvalLinks: 'Custom domain + white-label',
      analytics: 'Custom BI exports',
      branding: 'Full + custom domain (e.g. review.youragency.com)',
      support: 'Dedicated manager + SLA',
    },
    features: [
      '25+ to Unlimited client workspaces',
      'Unlimited team member seats',
      'Unlimited client reviewers',
      'Custom domain for approval links (review.agency.com)',
      'Full white-label portal',
      'Custom media storage capacity',
      'Custom security & single sign-on (SSO)',
      'Dedicated account manager & SLA guarantee',
      'Custom invoicing & vendor onboarding',
    ],
  },
];

export const FOUNDING_MEMBER_DETAILS = {
  totalSpots: 20,
  claimedSpots: 13,
  remainingSpots: 7,
  discountPercentage: 25,
  guaranteeText: 'First 20 paying agencies lock in the launch price for life. Never subject to future price hikes.',
};

export const PRICING_FAQ = [
  {
    question: 'Why are client reviewers completely free on every plan?',
    answer:
      'Client collaboration and rapid approval is the core superpower of PostNote. We believe you should never be penalised or forced to pay per client seat just because a client is reviewing, commenting on, or approving a draft.',
  },
  {
    question: 'How does the 14-day free trial work?',
    answer:
      'Every new signup immediately enjoys 14 days of full Agency plan capabilities — including multiple team seats, up to 10 clients, and branded approval links — with no credit card required upfront. At the end of the trial, you can choose to activate your founding subscription or downgrade to Free.',
  },
  {
    question: 'Can I add extra clients if I outgrow my tier?',
    answer:
      'Yes! On the Agency tier, you can add extra clients for just $3/client/month (or ₹249 / AED 12). On Studio, extra clients are only $2/client/month. You can also upgrade to the next tier at any time with prorated billing.',
  },
  {
    question: 'What happens to my rate when prices increase after launch?',
    answer:
      'Founding members who subscribe during launch are locked in at their initial rate for life as long as their subscription remains active. Price revisions will only ever apply to brand new customers.',
  },
  {
    question: 'Can I switch between monthly and annual billing?',
    answer:
      'Yes, you can toggle between monthly and annual billing at any time. Annual billing gives you approximately 2 months free per year (saving ~20%).',
  },
];

export const INITIAL_SUBSCRIPTION_STATE: import('../types').SubscriptionState = {
  planId: 'agency',
  interval: 'monthly',
  currency: 'USD',
  isTrial: true,
  trialDaysLeft: 11,
  isFoundingMember: true,
  extraClients: 0,
  startedAt: '2026-09-18T10:00:00Z',
  renewsAt: '2026-10-02T10:00:00Z',
  paymentMethod: undefined,
};
