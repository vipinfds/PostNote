import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Users,
  Layers,
  HardDrive,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  Zap,
  Info,
  Building2,
  Lock,
} from 'lucide-react';
import {
  PLANS,
  CURRENCY_SYMBOLS,
  FOUNDING_MEMBER_DETAILS,
  PRICING_FAQ,
  PlanTier,
} from '../data/pricingData';
import {
  PlanTierId,
  BillingInterval,
  CurrencyCode,
  SubscriptionState,
  Client,
  Post,
  TeamMember,
} from '../types';
import { PaymentModal } from './PaymentModal';

interface BillingViewProps {
  subscription: SubscriptionState;
  onUpdateSubscription: (newSub: SubscriptionState) => void;
  clients: Client[];
  posts: Post[];
  teamMembers: TeamMember[];
  onBack: () => void;
  isDark?: boolean;
}

export const BillingView: React.FC<BillingViewProps> = ({
  subscription,
  onUpdateSubscription,
  clients,
  posts,
  teamMembers,
  onBack,
  isDark,
}) => {
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(subscription.interval);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(subscription.currency);
  const [useFoundingRates, setUseFoundingRates] = useState<boolean>(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showFullComparison, setShowFullComparison] = useState(false);

  // Checkout modal
  const [checkoutPlan, setCheckoutPlan] = useState<PlanTier | null>(null);

  const curr = CURRENCY_SYMBOLS[selectedCurrency];
  const currentPlan = PLANS.find((p) => p.id === subscription.planId) || PLANS[2]; // Default Agency

  // Client usage limits
  const maxClients =
    currentPlan.limits.clients === 'Unlimited'
      ? 999
      : (currentPlan.limits.clients as number) + subscription.extraClients;
  const clientCount = clients.length;
  const clientPercent = Math.min(100, Math.round((clientCount / maxClients) * 100));

  // Team seats usage
  const maxSeats = currentPlan.limits.teamMembers === 'Unlimited' ? 999 : (currentPlan.limits.teamMembers as number);
  const seatCount = teamMembers.length;
  const seatPercent = Math.min(100, Math.round((seatCount / maxSeats) * 100));

  const formatPrice = (amount: number) => {
    return `${curr.position === 'prefix' ? curr.symbol : ''}${amount.toLocaleString()}${
      curr.position === 'suffix' ? curr.symbol : ''
    }`;
  };

  const handleOpenCheckout = (plan: PlanTier) => {
    if (plan.id === 'free') {
      // Direct downgrade to free
      if (window.confirm('Switch back to the Free plan? You will retain 1 client workspace.')) {
        onUpdateSubscription({
          ...subscription,
          planId: 'free',
          isTrial: false,
          trialDaysLeft: 0,
          isFoundingMember: false,
        });
      }
      return;
    }
    setCheckoutPlan(plan);
  };

  return (
    <div
      id="billing-view"
      className={`min-h-[800px] pb-24 px-4 pt-4 animate-fade-in transition-colors ${
        isDark ? 'text-stone-100' : 'text-[#1E252B]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Plans & Billing</h2>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
              PostNote Studio Retainers
            </p>
          </div>
        </div>

        {/* Founding Member pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C44D34]/10 text-[#C44D34] text-[11px] font-extrabold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Founding Offer</span>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {/* CURRENT SUBSCRIPTION STATUS CARD */}
        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                CURRENT WORKSPACE PLAN
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white font-serif">
                  {currentPlan.name} Plan
                </h3>
                {subscription.isTrial ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
                    {subscription.trialDaysLeft} Days Trial Left
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide">
                    Active Subscription
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {subscription.isTrial
                  ? 'Enjoy full Agency capabilities during your 14-day trial window.'
                  : `Billed ${subscription.interval} in ${subscription.currency}. Renews ${new Date(
                      subscription.renewsAt
                    ).toLocaleDateString()}`}
              </p>
            </div>

            <button
              onClick={() => handleOpenCheckout(PLANS[2])}
              className="px-3 py-1.5 rounded-xl bg-[#C44D34] hover:bg-[#B03E26] text-white text-xs font-bold transition-colors shadow-xs"
            >
              {subscription.planId === 'free' ? 'Upgrade to Pro' : 'Manage / Switch'}
            </button>
          </div>

          {/* Usage Meters */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            {/* Clients Usage */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Clients</span>
                <span className="font-bold text-stone-900 dark:text-white">
                  {clientCount} / {currentPlan.limits.clients}
                  {subscription.extraClients > 0 && ` (+${subscription.extraClients})`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#C44D34] transition-all"
                  style={{ width: `${Math.min(100, (clientCount / (typeof currentPlan.limits.clients === 'number' ? currentPlan.limits.clients : 25)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Team Seats Usage */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Team Seats</span>
                <span className="font-bold text-stone-900 dark:text-white">
                  {seatCount} / {currentPlan.limits.teamMembers}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-stone-700 dark:bg-stone-400 transition-all"
                  style={{ width: `${Math.min(100, (seatCount / (typeof currentPlan.limits.teamMembers === 'number' ? currentPlan.limits.teamMembers : 10)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reviewers callout */}
          <div className="mt-3 py-1 px-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              <strong>Client reviewers are always free:</strong> Your clients can comment and approve
              without consuming team seats.
            </span>
          </div>
        </div>

        {/* FOUNDING MEMBER BANNER */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#241C1A] border-[#442B25] text-amber-200'
              : 'bg-[#FCF5EE] border-[#ECD5C5] text-[#7A2C1D]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#C44D34] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">
                Founding Member Offer: {FOUNDING_MEMBER_DETAILS.remainingSpots} of {FOUNDING_MEMBER_DETAILS.totalSpots} spots left!
              </div>
              <p className="text-[11px] opacity-80 leading-tight truncate">
                Lock in launch pricing for life before general rollout.
              </p>
            </div>
          </div>

          <button
            onClick={() => setUseFoundingRates(!useFoundingRates)}
            className="text-[10px] uppercase font-extrabold tracking-wider underline whitespace-nowrap text-[#C44D34]"
          >
            {useFoundingRates ? 'See Standard' : 'Founding Rates'}
          </button>
        </div>

        {/* CONTROLS: CURRENCY & BILLING CYCLE */}
        <div className="space-y-2">
          {/* Billing Cycle Toggle */}
          <div
            className={`p-1 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              isDark ? 'bg-[#182028] border-[#2A3440]' : 'bg-[#EFEBE4] border-[#E0DCD4]'
            }`}
          >
            <button
              onClick={() => setSelectedInterval('monthly')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                selectedInterval === 'monthly'
                  ? isDark
                    ? 'bg-[#26313E] text-white shadow-xs'
                    : 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setSelectedInterval('annual')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                selectedInterval === 'annual'
                  ? isDark
                    ? 'bg-[#26313E] text-white shadow-xs'
                    : 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#C44D34] text-white text-[9px] font-bold">
                Save ~20%
              </span>
            </button>
          </div>

          {/* Localized Currency Switcher */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-stone-400">Currency:</span>
            <div className="flex items-center gap-1.5">
              {(['USD', 'INR', 'AED'] as CurrencyCode[]).map((cCode) => (
                <button
                  key={cCode}
                  onClick={() => setSelectedCurrency(cCode)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCurrency === cCode
                      ? 'bg-[#C44D34] text-white'
                      : isDark
                      ? 'bg-stone-800 text-stone-400 hover:text-white'
                      : 'bg-stone-200 text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cCode === 'USD' ? 'USD ($)' : cCode === 'INR' ? 'INR (₹)' : 'AED (د.إ)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TIERS CARDS LIST */}
        <div className="space-y-3.5 mt-2">
          {PLANS.map((plan) => {
            const isCurrent = subscription.planId === plan.id;
            const pricingData = plan.pricing[selectedCurrency];
            const baseMonthly = useFoundingRates ? pricingData.launchMonthly : pricingData.regularMonthly;
            const displayPrice = selectedInterval === 'annual' ? pricingData.annualMonthly : baseMonthly;
            const regularCrossedOut = pricingData.regularMonthly > displayPrice ? pricingData.regularMonthly : null;

            return (
              <div
                key={plan.id}
                id={`pricing-card-${plan.id}`}
                className={`p-4 rounded-2xl border transition-all relative ${
                  plan.isPopular
                    ? isDark
                      ? 'bg-[#202934] border-[#C44D34] shadow-lg ring-1 ring-[#C44D34]/30'
                      : 'bg-white border-[#C44D34] shadow-md ring-1 ring-[#C44D34]/20'
                    : isDark
                    ? 'bg-[#182028] border-[#2A3440]'
                    : 'bg-white border-[#E8E2D8]'
                }`}
              >
                {/* Popular / Badge banner */}
                {plan.badge && (
                  <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-[#C44D34] text-white text-[9px] font-extrabold uppercase tracking-wider shadow-xs">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-stone-900 dark:text-white font-serif">
                      {plan.name}
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {plan.subtitle}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1.5">
                      {regularCrossedOut && (
                        <span className="text-xs text-stone-400 line-through">
                          {formatPrice(regularCrossedOut)}
                        </span>
                      )}
                      <span className="text-xl font-bold text-stone-900 dark:text-white font-serif">
                        {plan.id === 'enterprise' ? 'Custom' : formatPrice(displayPrice)}
                      </span>
                    </div>
                    {plan.id !== 'enterprise' && (
                      <span className="text-[10px] text-stone-400">
                        {selectedInterval === 'annual' ? '/mo (billed yearly)' : '/month'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Target User audience */}
                <div className="mt-2 text-[11px] font-medium text-stone-500 dark:text-stone-400 italic">
                  Best for: {plan.targetUser}
                </div>

                {/* Core limits strip */}
                <div
                  className={`grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl my-3 text-center ${
                    isDark ? 'bg-[#141A21]' : 'bg-[#FAF7F2]'
                  }`}
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">Clients</div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      {plan.limits.clients}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">Team Seats</div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      {plan.limits.teamMembers}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#C44D34]">Reviewers</div>
                    <div className="text-xs font-bold text-[#C44D34]">Unlimited (Free)</div>
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-1.5 my-3">
                  {plan.features.slice(0, 5).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                      <Check className="w-3.5 h-3.5 text-[#C44D34] shrink-0 stroke-[2.5]" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                  {plan.features.length > 5 && (
                    <div className="text-[11px] text-stone-400 font-medium pl-5">
                      +{plan.features.length - 5} more features
                    </div>
                  )}
                </div>

                {/* Card CTA */}
                <div className="mt-3 pt-2">
                  {isCurrent ? (
                    <button
                      disabled
                      className={`w-full py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 opacity-80 ${
                        isDark ? 'border-stone-700 text-stone-300' : 'border-stone-300 text-stone-600'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>Current Plan</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCheckout(plan)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                        plan.isPopular
                          ? 'bg-[#C44D34] hover:bg-[#B03E26] text-white'
                          : isDark
                          ? 'bg-stone-800 hover:bg-stone-700 text-white'
                          : 'bg-[#181E24] hover:bg-black text-white'
                      }`}
                    >
                      <span>
                        {plan.id === 'free'
                          ? 'Downgrade to Free'
                          : plan.id === 'enterprise'
                          ? 'Inquire for Enterprise'
                          : `Upgrade to ${plan.name}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* TOGGLE FULL DETAILED COMPARISON TABLE */}
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#182028] border-[#2A3440]' : 'bg-white border-[#E8E2D8]'
          }`}
        >
          <button
            onClick={() => setShowFullComparison(!showFullComparison)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold text-stone-900 dark:text-white"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C44D34]" />
              <span>Full Tier-by-Tier Comparison Matrix</span>
            </div>
            {showFullComparison ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {showFullComparison && (
            <div className="overflow-x-auto border-t border-stone-200 dark:border-stone-800">
              <table className="w-full text-[11px] text-left">
                <thead
                  className={`font-bold border-b ${
                    isDark ? 'bg-[#141A21] border-[#2A3440] text-stone-300' : 'bg-[#FAF7F2] border-[#E8E2D8] text-stone-700'
                  }`}
                >
                  <tr>
                    <th className="p-2.5">Feature</th>
                    <th className="p-2.5">Free</th>
                    <th className="p-2.5">Solo</th>
                    <th className="p-2.5 text-[#C44D34]">Agency</th>
                    <th className="p-2.5">Studio</th>
                    <th className="p-2.5">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                  <tr>
                    <td className="p-2.5 font-bold">Clients</td>
                    <td className="p-2.5">1</td>
                    <td className="p-2.5">3</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">10</td>
                    <td className="p-2.5">25</td>
                    <td className="p-2.5">25+</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Team seats</td>
                    <td className="p-2.5">1</td>
                    <td className="p-2.5">1</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">3</td>
                    <td className="p-2.5">10</td>
                    <td className="p-2.5">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Client reviewers</td>
                    <td className="p-2.5">2</td>
                    <td className="p-2.5 text-emerald-600">Unlimited</td>
                    <td className="p-2.5 font-bold text-emerald-600">Unlimited</td>
                    <td className="p-2.5 text-emerald-600">Unlimited</td>
                    <td className="p-2.5 text-emerald-600">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Posts</td>
                    <td className="p-2.5">~25/mo</td>
                    <td className="p-2.5">Unlimited</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">Unlimited</td>
                    <td className="p-2.5">Unlimited</td>
                    <td className="p-2.5">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Calendar & Ideas Bank</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Status Pipeline</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Campaigns</td>
                    <td className="p-2.5">1</td>
                    <td className="p-2.5">3</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">Unlimited</td>
                    <td className="p-2.5">Unlimited</td>
                    <td className="p-2.5">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Media Library</td>
                    <td className="p-2.5">100 MB</td>
                    <td className="p-2.5">2 GB</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">10 GB</td>
                    <td className="p-2.5">50 GB</td>
                    <td className="p-2.5">Custom</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Client Approval Links</td>
                    <td className="p-2.5">Basic</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">✓</td>
                    <td className="p-2.5">✓</td>
                    <td className="p-2.5">✓</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Analytics</td>
                    <td className="p-2.5">Basic</td>
                    <td className="p-2.5">Basic</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">Full</td>
                    <td className="p-2.5">Full</td>
                    <td className="p-2.5">Full</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Branded View</td>
                    <td className="p-2.5">✗</td>
                    <td className="p-2.5">✗</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">Logo only</td>
                    <td className="p-2.5">Full white-label</td>
                    <td className="p-2.5">Custom domain</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Extra clients</td>
                    <td className="p-2.5">✗</td>
                    <td className="p-2.5">✗</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">+$3/client</td>
                    <td className="p-2.5">+$2/client</td>
                    <td className="p-2.5">Included</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Support</td>
                    <td className="p-2.5">Community</td>
                    <td className="p-2.5">Email</td>
                    <td className="p-2.5 font-bold text-[#C44D34]">Email</td>
                    <td className="p-2.5">Priority</td>
                    <td className="p-2.5">Dedicated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CORE RULES & PHILOSOPHY CARDS */}
        <div className="space-y-2 mt-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
            THE POSTNOTE PROMISE
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
              isDark ? 'bg-[#182028] border-[#2A3440]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
            }`}
          >
            <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-[#C44D34]" />
              <span>Client Reviewers Are Always Free</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-[11px]">
              Clients approving or commenting on drafts never use up your team seats. Approvals are our core
              superpower, not a fee trap.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
              isDark ? 'bg-[#182028] border-[#2A3440]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
            }`}
          >
            <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4 text-[#C44D34]" />
              <span>Limits Scale with Scale, Not Crippled Features</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-[11px]">
              Every plan gets the full content calendar, queue, and status pipeline. You upgrade as you win
              more client retainers and team members.
            </p>
          </div>
        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div className="space-y-2 mt-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
            FREQUENTLY ASKED QUESTIONS
          </div>

          <div className="space-y-2">
            {PRICING_FAQ.map((faq, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border overflow-hidden ${
                  isDark ? 'bg-[#182028] border-[#2A3440]' : 'bg-white border-[#E8E2D8]'
                }`}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold"
                >
                  <span className="text-stone-800 dark:text-stone-200">{faq.question}</span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <div className="px-4 pb-3 text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-800 pt-2">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHECKOUT PAYMENT MODAL */}
      {checkoutPlan && (
        <PaymentModal
          isOpen={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          selectedPlan={checkoutPlan}
          interval={selectedInterval}
          currency={selectedCurrency}
          isFounding={useFoundingRates}
          currentSubscription={subscription}
          onPaymentSuccess={(newSub) => {
            onUpdateSubscription(newSub);
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
};
