'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

type Currency = 'USD' | 'INR';
type BillingCycle = 'monthly' | 'annual';

interface PlanDefinition {
  id: string;
  name: string;
  isRecommended: boolean;
  description: string;
  features: string[];
  ctaLabel: string;
  guaranteeNotice?: string;
  monthly: {
    USD: { price: string; periodText: string };
    INR: { price: string; periodText: string };
  };
  annual: {
    USD: { price: string; periodText: string; savingsText: string; billingNotice: string };
    INR: { price: string; periodText: string; savingsText: string; billingNotice: string };
  };
}

const pricingPlans: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Eazzio Free',
    isRecommended: false,
    description: 'Essential private email for individuals getting started with zero ads.',
    features: ['500 MB encrypted storage', '1 custom email address', 'Webmail & mobile web access', 'Zero tracking pixels'],
    ctaLabel: 'Get Eazzio Free',
    guaranteeNotice: 'No credit card required',
    monthly: {
      USD: { price: '$0.00', periodText: '/ month' },
      INR: { price: '₹0.00', periodText: '/ month' },
    },
    annual: {
      USD: { price: '$0.00', periodText: '/ year', savingsText: '', billingNotice: 'Free forever plan' },
      INR: { price: '₹0.00', periodText: '/ year', savingsText: '', billingNotice: 'Free forever plan' },
    },
  },
  {
    id: 'plus',
    name: 'Eazzio Mail Plus',
    isRecommended: true,
    description: 'High-performance email with custom domains and priority support for professionals.',
    features: [
      '1 GB secure storage',
      '15 email addresses for you',
      'Support for 3 custom email domains',
      'Unlimited folders and labels',
      'Unlimited high-speed email aliases',
      'Priority customer support',
    ],
    ctaLabel: 'Get Eazzio Mail Plus',
    guaranteeNotice: '30-day money-back guarantee',
    monthly: {
      USD: { price: '$3.99', periodText: '/ month' },
      INR: { price: '₹380.11', periodText: '/ month' },
    },
    annual: {
      USD: {
        price: '$38.30',
        periodText: '/ year',
        savingsText: 'You save $9.58 (20% off)',
        billingNotice: 'Billed at $38.30 every 12 months.',
      },
      INR: {
        price: '₹3,649.08',
        periodText: '/ year',
        savingsText: 'You save ₹912.70 (20% off)',
        billingNotice: 'Billed at ₹3,649.08 every 12 months.',
      },
    },
  },
  {
    id: 'unlimited',
    name: 'Eazzio Mail Unlimited',
    isRecommended: false,
    description: 'Maximum capacity and advanced tools for power users and small teams.',
    features: [
      '500 GB massive storage',
      '15 email addresses for you',
      'Support for up to 3 custom email domains',
      'Unlimited folders, labels and filters',
      'Encrypted cloud file storage',
      '24/7 dedicated priority support',
    ],
    ctaLabel: 'Get Eazzio Mail Unlimited',
    guaranteeNotice: '30-day money-back guarantee',
    monthly: {
      USD: { price: '$9.99', periodText: '/ month' },
      INR: { price: '₹951.71', periodText: '/ month' },
    },
    annual: {
      USD: {
        price: '$89.91',
        periodText: '/ year',
        savingsText: 'You save $29.97 (25% off)',
        billingNotice: 'Billed at $89.91 every 12 months.',
      },
      INR: {
        price: '₹8,565.39',
        periodText: '/ year',
        savingsText: 'You save ₹2,854.91 (25% off)',
        billingNotice: 'Billed at ₹8,565.39 every 12 months.',
      },
    },
  },
];

export const PricingSection: React.FC = () => {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  return (
    <section id="pricing" className="py-20 md:py-24 bg-[#F8FAFC] border-t border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-semibold text-[#0F766E] mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Fair & Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight mb-4">
            Eazzio Mail plans for your privacy
          </h2>
          <p className="text-[#475569] text-sm sm:text-base">
            Choose the plan that fits your workflow. Upgrade or cancel anytime with zero lock-in.
          </p>
        </div>

        {/* Control Switches: Currency + Billing */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-16">
          {/* Currency Switch */}
          <div className="flex items-center p-1 rounded-[10px] bg-white border border-[#E2E8F0] shadow-sm">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none ${
                currency === 'USD' ? 'bg-[#14B8A6] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('INR')}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none ${
                currency === 'INR' ? 'bg-[#14B8A6] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              INR (₹)
            </button>
          </div>

          {/* Billing Period Toggle */}
          <div className="flex items-center p-1 rounded-[10px] bg-white border border-[#E2E8F0] shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none ${
                billingCycle === 'monthly' ? 'bg-[#0E172A] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              1 Month
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none ${
                billingCycle === 'annual'
                  ? 'bg-[#0E172A] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <span>12 Months</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#CCFBF1] text-[#0F766E]">
                Save up to 25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {pricingPlans.map((plan) => {
            const isAnnual = billingCycle === 'annual';
            const priceInfo = isAnnual ? plan.annual[currency] : plan.monthly[currency];
            const annualInfo = isAnnual ? plan.annual[currency] : null;

            return (
              <div
                key={plan.id}
                className={`relative rounded-[16px] flex flex-col justify-between p-7 sm:p-8 transition-all ${
                  plan.isRecommended
                    ? 'bg-white border-2 border-[#14B8A6] shadow-lg shadow-[#14B8A6]/10'
                    : 'bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1]'
                }`}
              >
                {/* Recommended Badge */}
                {plan.isRecommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-[#14B8A6] text-white text-[11px] font-bold tracking-wide uppercase shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>RECOMMENDED</span>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-[#0F172A] mb-2">{plan.name}</h3>
                  <p className="text-xs text-[#475569] mb-6 leading-relaxed min-h-[36px]">{plan.description}</p>

                  {/* Price Header */}
                  <div className="mb-6 pb-6 border-b border-[#E2E8F0]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-[#0F172A] tracking-tight">{priceInfo.price}</span>
                      <span className="text-xs text-[#64748B] font-medium">{priceInfo.periodText}</span>
                    </div>

                    {/* Annual Savings & Notice */}
                    {annualInfo && annualInfo.savingsText ? (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-xs font-semibold text-[#0F766E]">{annualInfo.savingsText}</p>
                        <p className="text-[11px] text-[#64748B] font-mono">{annualInfo.billingNotice}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Included Features</p>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[#334155]">
                        <Check className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action CTA */}
                <div>
                  <Link
                    href="/register"
                    className={`w-full py-3 px-4 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none ${
                      plan.isRecommended
                        ? 'bg-[#14B8A6] hover:bg-[#19B8A4] text-white shadow-md shadow-[#14B8A6]/20'
                        : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] shadow-sm'
                    }`}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {plan.guaranteeNotice && (
                    <p className="text-center text-[11px] text-[#64748B] mt-3 font-medium">
                      {plan.guaranteeNotice}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
