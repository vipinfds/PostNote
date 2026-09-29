import React, { useState } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  CreditCard,
  QrCode,
  Zap,
  Sparkles,
  Lock,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import { PlanTier, CURRENCY_SYMBOLS, FOUNDING_MEMBER_DETAILS } from '../data/pricingData';
import { BillingInterval, CurrencyCode, SubscriptionState } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: PlanTier;
  interval: BillingInterval;
  currency: CurrencyCode;
  isFounding: boolean;
  currentSubscription: SubscriptionState;
  onPaymentSuccess: (newSubscription: SubscriptionState) => void;
  isDark?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  interval,
  currency,
  isFounding,
  currentSubscription,
  onPaymentSuccess,
  isDark,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'apple-pay'>('card');
  const [extraClients, setExtraClients] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState('Vipin - Studio Lead');
  const [upiId, setUpiId] = useState('agency@okhdfcbank');

  if (!isOpen) return null;

  const curr = CURRENCY_SYMBOLS[currency];
  const pricingData = selectedPlan.pricing[currency];
  const baseMonthlyPrice = isFounding ? pricingData.launchMonthly : pricingData.regularMonthly;
  const effectiveMonthlyPrice = interval === 'annual' ? pricingData.annualMonthly : baseMonthlyPrice;

  // Extra clients calculation
  const extraRate = selectedPlan.extraClientPrice[currency] || 0;
  const extraClientsCostPerMonth = extraClients * extraRate;

  const totalMonthlyEquivalent = effectiveMonthlyPrice + extraClientsCostPerMonth;
  const billedAmount =
    interval === 'annual'
      ? (effectiveMonthlyPrice * 12) + (extraClientsCostPerMonth * 12)
      : totalMonthlyEquivalent;

  const regularBilledAmount =
    interval === 'annual'
      ? (pricingData.regularMonthly * 12) + (extraClientsCostPerMonth * 12)
      : (pricingData.regularMonthly + extraClientsCostPerMonth);

  const totalSavings = Math.max(0, regularBilledAmount - billedAmount);

  const formatMoney = (amount: number) => {
    return `${curr.position === 'prefix' ? curr.symbol : ''}${amount.toLocaleString()}${
      curr.position === 'suffix' ? curr.symbol : ''
    }`;
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);

      const nextRenewDate = new Date();
      if (interval === 'annual') {
        nextRenewDate.setFullYear(nextRenewDate.getFullYear() + 1);
      } else {
        nextRenewDate.setMonth(nextRenewDate.getMonth() + 1);
      }

      setTimeout(() => {
        onPaymentSuccess({
          planId: selectedPlan.id,
          interval,
          currency,
          isTrial: false,
          trialDaysLeft: 0,
          isFoundingMember: isFounding,
          extraClients,
          startedAt: new Date().toISOString(),
          renewsAt: nextRenewDate.toISOString(),
          paymentMethod:
            paymentMethod === 'card'
              ? `Visa ending in 4242`
              : paymentMethod === 'upi'
              ? `UPI (${upiId})`
              : 'Apple Pay / GPay',
          lastPaymentAmount: billedAmount,
        });
        onClose();
        setIsSuccess(false);
      }, 1200);
    }, 1400);
  };

  return (
    <div
      id="payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        id="payment-modal-container"
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl transition-all max-h-[92vh] flex flex-col overflow-hidden animate-slide-up ${
          isDark
            ? 'bg-[#182028] border-[#2A3644] text-stone-100'
            : 'bg-[#FAF8F5] border-[#E5E0D8] text-[#1E252B]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-[#26313E] bg-[#151C24]' : 'border-[#EDE8E0] bg-[#F4EFE9]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C44D34]/15 flex items-center justify-center text-[#C44D34]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Checkout: {selectedPlan.name} Plan</h3>
                {isFounding && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-[#C44D34] text-white">
                    Founding Lock
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {interval === 'annual' ? 'Billed annually (2 months free)' : 'Billed monthly, cancel anytime'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          /* Success Screen */
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-white font-serif">
              Welcome to {selectedPlan.name}!
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 max-w-xs leading-relaxed">
              Your payment of {formatMoney(billedAmount)} was successful. Your workspace has been upgraded
              with full limits instantly.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-stone-400">
              Receipt sent to vipin@firstdraftstudio.in
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <form onSubmit={handleSubmitPayment} className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Plan Summary Card */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#1D252F] border-[#2C3848]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Selected Workspace Plan
                  </div>
                  <div className="text-lg font-bold text-stone-900 dark:text-white font-serif mt-0.5">
                    {selectedPlan.name} Tier
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Up to {selectedPlan.limits.clients} clients • {selectedPlan.limits.teamMembers} team seats
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-[#C44D34] font-serif">
                    {formatMoney(billedAmount)}
                  </div>
                  <div className="text-[10px] text-stone-400">
                    {interval === 'annual' ? '/ year' : '/ month'}
                  </div>
                </div>
              </div>

              {/* Founding badge or savings callout */}
              {totalSavings > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
                  <span>Founding member rate locked</span>
                  <span>Save {formatMoney(totalSavings)}</span>
                </div>
              )}

              {/* Extra Clients Add-on if supported */}
              {selectedPlan.extraClientPrice[currency] !== null && selectedPlan.extraClientPrice[currency]! > 0 && (
                <div
                  className={`pt-3 border-t mt-3 flex items-center justify-between ${
                    isDark ? 'border-stone-800' : 'border-stone-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Need extra clients?
                    </div>
                    <div className="text-[10px] text-stone-400">
                      +{formatMoney(extraRate)} / extra client / mo
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExtraClients((c) => Math.max(0, c - 1))}
                      disabled={extraClients === 0}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center text-stone-600 dark:text-stone-300 disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{extraClients}</span>
                    <button
                      type="button"
                      onClick={() => setExtraClients((c) => c + 1)}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center text-stone-600 dark:text-stone-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                Payment Method
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-[#C44D34] bg-[#C44D34]/10 text-[#C44D34]'
                      : isDark
                      ? 'border-[#2A3440] hover:bg-stone-800/50 text-stone-300'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>

                {currency === 'INR' ? (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-[#C44D34] bg-[#C44D34]/10 text-[#C44D34]'
                        : isDark
                        ? 'border-[#2A3440] hover:bg-stone-800/50 text-stone-300'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / QR</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('apple-pay')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'apple-pay'
                        ? 'border-[#C44D34] bg-[#C44D34]/10 text-[#C44D34]'
                        : isDark
                        ? 'border-[#2A3440] hover:bg-stone-800/50 text-stone-300'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>1-Click Pay</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentMethod(currency === 'INR' ? 'apple-pay' : 'upi')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    (currency === 'INR' ? paymentMethod === 'apple-pay' : paymentMethod === 'upi')
                      ? 'border-[#C44D34] bg-[#C44D34]/10 text-[#C44D34]'
                      : isDark
                      ? 'border-[#2A3440] hover:bg-stone-800/50 text-stone-300'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Invoice</span>
                </button>
              </div>
            </div>

            {/* Inputs based on payment method */}
            {paymentMethod === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-hidden transition-all ${
                      isDark
                        ? 'bg-[#141A21] border-[#2C3848] text-white focus:border-[#C44D34]'
                        : 'bg-white border-[#DDD7CE] text-[#1E252B] focus:border-[#C44D34]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                      className={`w-full px-3.5 py-2.5 pl-9 rounded-xl border text-xs font-mono outline-hidden transition-all ${
                        isDark
                          ? 'bg-[#141A21] border-[#2C3848] text-white focus:border-[#C44D34]'
                          : 'bg-white border-[#DDD7CE] text-[#1E252B] focus:border-[#C44D34]'
                      }`}
                    />
                    <CreditCard className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      Expires (MM/YY)
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      required
                      placeholder="MM/YY"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-hidden transition-all ${
                        isDark
                          ? 'bg-[#141A21] border-[#2C3848] text-white focus:border-[#C44D34]'
                          : 'bg-white border-[#DDD7CE] text-[#1E252B] focus:border-[#C44D34]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      required
                      maxLength={4}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-hidden transition-all ${
                        isDark
                          ? 'bg-[#141A21] border-[#2C3848] text-white focus:border-[#C44D34]'
                          : 'bg-white border-[#DDD7CE] text-[#1E252B] focus:border-[#C44D34]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-xl border text-center space-y-2 ${
                    isDark ? 'bg-[#141A21] border-[#2C3848]' : 'bg-[#FAF6F0] border-[#E8E2D8]'
                  }`}
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Instant UPI AutoPay
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Accepts GPay, PhonePe, Paytm, CRED or any Indian bank UPI handle.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                    UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                    placeholder="name@okhdfcbank"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-hidden transition-all ${
                      isDark
                        ? 'bg-[#141A21] border-[#2C3848] text-white focus:border-[#C44D34]'
                        : 'bg-white border-[#DDD7CE] text-[#1E252B] focus:border-[#C44D34]'
                    }`}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'apple-pay' && (
              <div
                className={`p-4 rounded-xl border text-center space-y-3 ${
                  isDark ? 'bg-[#141A21] border-[#2C3848]' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-stone-900 text-white flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-stone-900 dark:text-white">
                  Apple Pay & Google Pay Express
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Biometric touch or FaceID authentication. Instant activation with zero card entry.
                </p>
              </div>
            )}

            {/* Security Guarantee */}
            <div className="flex items-center gap-2 text-[10px] text-stone-400 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>256-bit encrypted checkout • Cancel anytime from settings</span>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-[#C44D34] hover:bg-[#B03E26] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Activation...</span>
                </>
              ) : (
                <>
                  <span>
                    Pay {formatMoney(billedAmount)} {interval === 'annual' ? '/ Year' : '/ Month'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
