import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Users,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  PLANS,
  CURRENCY_SYMBOLS,
  FOUNDING_MEMBER_DETAILS,
  PRICING_FAQ,
  PlanTier,
} from '../data/pricingData';
import {
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
  teamMembers,
  onBack,
  isDark,
}) => {
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(subscription.interval);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(subscription.currency);
  const [useFoundingRates, setUseFoundingRates] = useState<boolean>(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Checkout modal
  const [checkoutPlan, setCheckoutPlan] = useState<PlanTier | null>(null);

  const curr = CURRENCY_SYMBOLS[selectedCurrency];
  const currentPlan = PLANS.find((p) => p.id === subscription.planId) || PLANS[2]; // Default Agency

  const clientCount = clients.length;
  const seatCount = teamMembers.length;

  const formatPrice = (amount: number) => {
    return `${curr.position === 'prefix' ? curr.symbol : ''}${amount.toLocaleString()}${
      curr.position === 'suffix' ? curr.symbol : ''
    }`;
  };

  const handleOpenCheckout = (plan: PlanTier) => {
    if (plan.id === 'free') {
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
            className="p-1.5 -ml-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight">Plans & Billing</h2>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
              Direct Tier-by-Tier Comparison
            </p>
          </div>
        </div>

        {/* Founding Member indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#C44D34]" />
          <span>Founding Offer ({FOUNDING_MEMBER_DETAILS.remainingSpots} left)</span>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {/* CURRENT SUBSCRIPTION STATUS BAR */}
        <div
          className={`p-4 rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                CURRENT WORKSPACE PLAN
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white font-serif">
                  {currentPlan.name} Plan
                </h3>
                {subscription.isTrial ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
                    {subscription.trialDaysLeft} Days Trial Left
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide">
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

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4 text-xs border-r border-stone-200 dark:border-stone-800 pr-4">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Clients</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {clientCount} / {currentPlan.limits.clients}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Team Seats</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {seatCount} / {currentPlan.limits.teamMembers}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleOpenCheckout(currentPlan.id === 'free' ? PLANS[2] : currentPlan)}
                className="px-4 py-2.5 rounded-xl bg-[#181E24] hover:bg-black text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
              >
                {subscription.isTrial
                  ? `Purchase ${currentPlan.name}`
                  : subscription.planId === 'free'
                  ? 'Upgrade Plan'
                  : 'Manage Current Plan'}
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS BAR: BILLING INTERVAL, CURRENCY & FOUNDING RATES */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Billing Cycle Toggle */}
          <div
            className={`p-1 rounded-xl border inline-flex items-center text-xs font-semibold ${
              isDark ? 'bg-[#182028] border-[#2A3440]' : 'bg-[#EFEBE4] border-[#E0DCD4]'
            }`}
          >
            <button
              onClick={() => setSelectedInterval('monthly')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
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
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedInterval === 'annual'
                  ? isDark
                    ? 'bg-[#26313E] text-white shadow-xs'
                    : 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded bg-[#181E24] text-white dark:bg-stone-200 dark:text-stone-900 text-[9px] font-bold">
                Save ~20%
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setUseFoundingRates(!useFoundingRates)}
              className="text-[11px] font-bold underline text-stone-600 dark:text-stone-300 hover:text-[#C44D34] cursor-pointer"
            >
              {useFoundingRates ? 'Showing Founding Rates (-25%)' : 'Switch to Founding Rates'}
            </button>

            <div className="flex items-center gap-1">
              {(['USD', 'INR', 'AED'] as CurrencyCode[]).map((cCode) => (
                <button
                  key={cCode}
                  onClick={() => setSelectedCurrency(cCode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedCurrency === cCode
                      ? 'bg-[#181E24] text-white dark:bg-stone-100 dark:text-stone-900'
                      : isDark
                      ? 'bg-stone-800 text-stone-400 hover:text-white'
                      : 'bg-stone-200 text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cCode === 'USD' ? 'USD ($)' : cCode === 'INR' ? 'INR (₹)' : 'AED'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DIRECT FULL TIER-BY-TIER COMPARISON MATRIX */}
        <div
          className={`rounded-2xl border overflow-hidden shadow-xs ${
            isDark ? 'bg-[#182028] border-[#2A3440]' : 'bg-white border-[#E8E2D8]'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead>
                <tr
                  className={`border-b align-top ${
                    isDark ? 'bg-[#141A21] border-[#2A3440]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                  }`}
                >
                  {/* Feature Column Header */}
                  <th className="p-4 w-[190px] align-bottom">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-1">
                      <Layers className="w-3.5 h-3.5 text-[#C44D34]" />
                      <span>Compare Tiers</span>
                    </div>
                    <div className="text-sm font-bold text-stone-900 dark:text-white font-serif">
                      Plan Features & Limits
                    </div>
                    <p className="text-[11px] font-normal text-stone-500 dark:text-stone-400 mt-1">
                      Choose the tier that matches your studio size.
                    </p>
                  </th>

                  {/* Plan Columns with Top Purchase/Upgrade Black Button */}
                  {PLANS.map((plan) => {
                    const isCurrent = subscription.planId === plan.id && !subscription.isTrial;
                    const isCurrentTrial = subscription.planId === plan.id && subscription.isTrial;
                    const isPopular = plan.id === 'agency'; // ONLY Agency gets the orange MOST POPULAR highlight
                    const pricingData = plan.pricing[selectedCurrency];
                    const baseMonthly = useFoundingRates
                      ? pricingData.launchMonthly
                      : pricingData.regularMonthly;
                    const displayPrice =
                      selectedInterval === 'annual' ? pricingData.annualMonthly : baseMonthly;
                    const regularCrossedOut =
                      pricingData.regularMonthly > displayPrice ? pricingData.regularMonthly : null;

                    // Restrained badge label: only Agency (orange), Studio (Growing Agency), Enterprise (Custom Volume)
                    const badgeLabel =
                      plan.id === 'agency'
                        ? 'MOST POPULAR'
                        : plan.id === 'studio'
                        ? 'GROWING AGENCY'
                        : plan.id === 'enterprise'
                        ? 'CUSTOM VOLUME'
                        : null;

                    return (
                      <th
                        key={plan.id}
                        className={`p-4 min-w-[145px] border-l transition-colors ${
                          isDark ? 'border-[#2A3440]' : 'border-[#E8E2D8]'
                        } ${
                          isPopular
                            ? isDark
                              ? 'bg-[#C44D34]/10'
                              : 'bg-[#C44D34]/[0.05]'
                            : ''
                        }`}
                      >
                        {/* Top Badge (Orange ONLY for Most Popular, subtle neutral for Growing Agency / Custom Volume) */}
                        <div className="h-5 mb-1.5 flex items-center">
                          {badgeLabel && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                                isPopular
                                  ? 'bg-[#C44D34] text-white'
                                  : isDark
                                  ? 'bg-stone-800 text-stone-300 border border-stone-700'
                                  : 'bg-stone-200/80 text-stone-700'
                              }`}
                            >
                              {badgeLabel}
                            </span>
                          )}
                        </div>

                        {/* Tier Name */}
                        <div className="text-base font-bold text-stone-900 dark:text-white font-serif">
                          {plan.name}
                        </div>

                        {/* Price */}
                        <div className="mt-1.5 mb-3">
                          <div className="flex items-baseline gap-1">
                            {regularCrossedOut && plan.id !== 'enterprise' && (
                              <span className="text-[11px] text-stone-400 line-through font-normal">
                                {formatPrice(regularCrossedOut)}
                              </span>
                            )}
                            <span className="text-lg font-bold text-stone-900 dark:text-white font-serif">
                              {plan.id === 'enterprise' ? 'Custom' : formatPrice(displayPrice)}
                            </span>
                          </div>
                          <div className="text-[10px] font-normal text-stone-400">
                            {plan.id === 'enterprise'
                              ? 'Tailored annual terms'
                              : selectedInterval === 'annual'
                              ? '/mo (billed yearly)'
                              : '/month'}
                          </div>
                        </div>

                        {/* Black Action Button at the Top of the Matrix */}
                        {isCurrent ? (
                          <button
                            disabled
                            className={`w-full py-2 px-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 opacity-80 ${
                              isDark
                                ? 'border-stone-700 text-stone-300 bg-stone-800/40'
                                : 'border-stone-300 text-stone-700 bg-stone-100'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Current Plan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenCheckout(plan)}
                            className="w-full py-2 px-2.5 rounded-xl bg-[#181E24] hover:bg-black text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                          >
                            {isCurrentTrial
                              ? `Purchase ${plan.name}`
                              : plan.id === 'free'
                              ? 'Switch to Free'
                              : plan.id === 'enterprise'
                              ? 'Contact Sales'
                              : `Upgrade to ${plan.name}`}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80 font-medium">
                {[
                  {
                    label: 'Client Workspaces',
                    values: ['1', '3', '10', '25', '25+ / Unlimited'],
                  },
                  {
                    label: 'Team Member Seats',
                    values: ['1', '1', '3', '10', 'Unlimited'],
                  },
                  {
                    label: 'Client Reviewers',
                    values: [
                      '2 reviewers',
                      'Unlimited (Free)',
                      'Unlimited (Free)',
                      'Unlimited (Free)',
                      'Unlimited (Free)',
                    ],
                    highlightEmerald: true,
                  },
                  {
                    label: 'Scheduled Posts',
                    values: ['~25 / mo', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
                  },
                  {
                    label: 'Calendar & Ideas Bank',
                    values: ['✓', '✓', '✓', '✓', '✓'],
                  },
                  {
                    label: 'Status Pipeline',
                    values: ['✓', '✓', '✓', '✓', '✓'],
                  },
                  {
                    label: 'Active Campaigns',
                    values: ['1', '3', 'Unlimited', 'Unlimited', 'Unlimited'],
                  },
                  {
                    label: 'Media Storage',
                    values: ['100 MB', '2 GB', '10 GB', '50 GB', 'Custom / Unlimited'],
                  },
                  {
                    label: 'Client Approval Links',
                    values: [
                      'Basic links',
                      'Full link sharing',
                      'Branded links',
                      'Full white-label',
                      'Custom domain',
                    ],
                  },
                  {
                    label: 'Analytics & Reports',
                    values: [
                      'Basic stats',
                      'Basic performance',
                      'Full insights',
                      'Advanced insights',
                      'Custom BI exports',
                    ],
                  },
                  {
                    label: 'Portal Branding',
                    values: [
                      'Standard footer',
                      'Standard',
                      'Agency logo',
                      'Full white-label',
                      'Custom domain',
                    ],
                  },
                  {
                    label: 'Extra Client Add-on',
                    values: [
                      '—',
                      '—',
                      selectedCurrency === 'USD'
                        ? '+$3 / client'
                        : selectedCurrency === 'INR'
                        ? '+₹249 / client'
                        : '+AED 12 / client',
                      selectedCurrency === 'USD'
                        ? '+$2 / client'
                        : selectedCurrency === 'INR'
                        ? '+₹169 / client'
                        : '+AED 8 / client',
                      'Included',
                    ],
                  },
                  {
                    label: 'Support Level',
                    values: [
                      'Community',
                      'Standard Email',
                      'Fast Email',
                      'Priority 24/7',
                      'Dedicated Manager',
                    ],
                  },
                ].map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-stone-800/30' : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <td className="p-3.5 font-bold text-stone-800 dark:text-stone-200">
                      {row.label}
                    </td>
                    {row.values.map((val, cIdx) => {
                      const isAgencyCol = cIdx === 2;
                      return (
                        <td
                          key={cIdx}
                          className={`p-3.5 border-l ${
                            isDark ? 'border-[#2A3440]' : 'border-[#E8E2D8]'
                          } ${
                            isAgencyCol
                              ? isDark
                                ? 'bg-[#C44D34]/10 font-bold text-stone-100'
                                : 'bg-[#C44D34]/[0.05] font-bold text-stone-900'
                              : 'text-stone-600 dark:text-stone-300'
                          } ${
                            row.highlightEmerald && cIdx > 0
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : ''
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CORE RULES & PHILOSOPHY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
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
                  className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold cursor-pointer"
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
