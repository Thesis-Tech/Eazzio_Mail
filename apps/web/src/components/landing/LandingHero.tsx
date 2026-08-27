import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

export const LandingHero: React.FC = () => {
  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden bg-gradient-to-b from-[#F0FDFA]/60 via-[#F8FAFC] to-[#F8FAFC]">
      {/* Subtle Background Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[250px] sm:h-[350px] bg-[#14B8A6]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-semibold text-[#0F766E] mb-6 sm:mb-8 shadow-sm max-w-full">
          <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6] shrink-0" />
          <span className="truncate">Zero Tracking Pixels • Privacy by Design</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#0F172A] leading-[1.18] sm:leading-[1.15] mb-5 sm:mb-6">
          Professional email engineered for <span className="text-[#14B8A6]">privacy</span> &{' '}
          <span className="text-[#0E172A]">speed</span>.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-xl text-[#475569] max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-10">
          Experience a high-performance webmail suite with custom domains, instant full-text search,
          real-time WebSocket sync, and robust security designed for professionals and teams.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-12 w-full max-w-md sm:max-w-none mx-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-sm sm:text-base font-semibold transition-all shadow-md shadow-[#14B8A6]/25 hover:shadow-lg hover:shadow-[#14B8A6]/35 group focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[10px] bg-white hover:bg-[#F8FAFC] text-[#334155] hover:text-[#0F172A] border border-[#CBD5E1] text-sm sm:text-base font-medium transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
          >
            <span>Explore Interactive Demo</span>
          </a>
        </div>

        {/* Value Props Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 max-w-4xl mx-auto pt-8 border-t border-[#E2E8F0] text-left">
          <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-white border border-[#E2E8F0] shadow-sm hover:border-[#14B8A6]/40 transition-all">
            <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Free 500 MB Plan</p>
              <p className="text-[11px] text-[#64748B]">No credit card required</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-white border border-[#E2E8F0] shadow-sm hover:border-[#14B8A6]/40 transition-all">
            <Zap className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Realtime WebSocket</p>
              <p className="text-[11px] text-[#64748B]">Sub-second push delivery</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-white border border-[#E2E8F0] shadow-sm hover:border-[#14B8A6]/40 transition-all">
            <Lock className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Zero Tracking</p>
              <p className="text-[11px] text-[#64748B]">No ads, no data mining</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-white border border-[#E2E8F0] shadow-sm hover:border-[#14B8A6]/40 transition-all">
            <Sparkles className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Custom Domains</p>
              <p className="text-[11px] text-[#64748B]">Multi-domain DKIM/SPF</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
