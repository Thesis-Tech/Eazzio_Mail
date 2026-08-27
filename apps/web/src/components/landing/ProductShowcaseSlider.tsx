'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Edit3,
  Search,
  FolderTree,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';

interface Slide {
  id: string;
  tag: string;
  title: string;
  description: string;
  icon: React.ElementType;
  highlights: string[];
  mockPreviewTitle: string;
  mockPreviewSubtitle: string;
}

const slides: Slide[] = [
  {
    id: 'inbox',
    tag: 'Core Experience',
    title: 'High-Performance Focused Inbox',
    description:
      'Engineered for rapid triage. High-density message lists, conversation threading, star markers, and instant keyboard workflows help you reach Inbox Zero effortlessly.',
    icon: Inbox,
    highlights: ['Sub-second rendering', 'Conversation thread collapsing', 'Smart unread badges', 'Custom label tags'],
    mockPreviewTitle: 'Live Conversation View',
    mockPreviewSubtitle: 'Real-time WebSocket push updates with zero manual refresh needed',
  },
  {
    id: 'compose',
    tag: 'Productivity',
    title: 'Smart Compose & Rich Text Editing',
    description:
      'A sleek, non-intrusive floating composer. Format emails with rich styling, attach documents with automatic size validation, and schedule dispatches effortlessly.',
    icon: Edit3,
    highlights: ['Multi-recipient To / Cc / Bcc', 'Rich text & code formatting', 'Base64 attachment uploader', 'Draft auto-save'],
    mockPreviewTitle: 'Floating Modular Composer',
    mockPreviewSubtitle: 'Compose without losing context of your reading pane',
  },
  {
    id: 'search',
    tag: 'Intelligence',
    title: 'Universal Instant Search with Syntax Filters',
    description:
      'Find any email in milliseconds. Use advanced syntax filters like from:name, has:attachment, or is:unread with intuitive typeahead auto-completion.',
    icon: Search,
    highlights: ['Instant typeahead query suggestions', 'Syntax chip tokenization', 'Snippet highlights', 'Multi-folder search'],
    mockPreviewTitle: 'Global Search Index',
    mockPreviewSubtitle: 'Search across 500+ messages in less than 50ms',
  },
  {
    id: 'organization',
    tag: 'Organization',
    title: 'Automated Rules, Folders & Labels',
    description:
      'Organize your communication workspace. Create custom color-coded labels, manage priority folders, and automate sorting with rule-based action triggers.',
    icon: FolderTree,
    highlights: ['Automated subject & sender rules', 'Multi-color label categorization', 'System & custom folders', 'Quick search pills'],
    mockPreviewTitle: 'Rule Engine & Label Manager',
    mockPreviewSubtitle: 'Automate repetitive sorting tasks and keep your workspace structured',
  },
  {
    id: 'security',
    tag: 'Security & Privacy',
    title: 'Enterprise-Grade Security & Zero Tracking',
    description:
      'Built from the ground up for strict data sovereignty. Zero tracking pixels, strict SPF/DKIM/DMARC authentication, and quarantined spam filters.',
    icon: ShieldCheck,
    highlights: ['Strict SPF, DKIM & DMARC checks', 'Tracking pixel neutralization', 'Clean attachment sanitization', 'Zero advertiser tracking'],
    mockPreviewTitle: 'Cryptographic Authentication Gate',
    mockPreviewSubtitle: 'Every incoming message is cryptographically verified before reaching your inbox',
  },
];

export const ProductShowcaseSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const current = slides[currentIndex];
  const IconComponent = current.icon;

  return (
    <section id="features" className="py-20 md:py-24 bg-white border-t border-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-semibold text-[#0F766E] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Product Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight mb-4">
            Everything you need for modern communication.
          </h2>
          <p className="text-[#475569] text-base">
            Engineered with modern web architecture to deliver a fast, clutter-free, and private email experience.
          </p>
        </div>

        {/* Feature Showcase Card */}
        <div className="relative rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] p-6 sm:p-8 md:p-10 shadow-sm overflow-hidden transition-all duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-[6px] text-[#0F766E] bg-[#F0FDFA] border border-[#CCFBF1]">
                  {current.tag}
                </span>
                <span className="text-xs text-[#64748B] font-mono">
                  0{currentIndex + 1} / 0{slides.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-white border border-[#CCFBF1] flex items-center justify-center text-[#14B8A6] shrink-0 shadow-sm">
                  <IconComponent className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">{current.title}</h3>
              </div>

              <p className="text-[#334155] text-sm sm:text-base leading-relaxed">{current.description}</p>

              {/* Bullet highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {current.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Preview Visual Column - Dark Product Interface Representation */}
            <div className="lg:col-span-6">
              <div className="rounded-[12px] bg-[#020617] border border-[#263244] p-5 shadow-inner space-y-4">
                <div className="flex items-center justify-between border-b border-[#263244] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-[#94A3B8]">{current.mockPreviewTitle}</span>
                  <div className="w-4" />
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3 rounded-[8px] bg-[#111827] border border-[#263244] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#134E4A] text-[#14B8A6] flex items-center justify-center font-bold text-xs">
                        EM
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#F8FAFC]">{current.mockPreviewTitle}</p>
                        <p className="text-[11px] text-[#94A3B8] truncate">{current.mockPreviewSubtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#14B8A6] bg-[#134E4A] px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>

                  <div className="p-3 rounded-[8px] bg-[#0B1220] border border-[#263244]/60 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#CBD5E1]">
                      <span className="font-semibold">Security Policy Verification</span>
                      <span className="text-[#14B8A6] font-mono text-[11px]">100% Enforced</span>
                    </div>
                    <div className="w-full bg-[#172033] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#14B8A6] h-full rounded-full w-4/5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slider Controls Footer */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
            {/* Pagination Dots */}
            <div className="flex items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none ${
                    idx === currentIndex ? 'w-8 bg-[#14B8A6]' : 'w-2 bg-[#CBD5E1] hover:bg-[#94A3B8]'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Prev / Next Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="p-2 rounded-[10px] bg-white hover:bg-[#F8FAFC] text-[#334155] hover:text-[#0F172A] border border-[#CBD5E1] transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="p-2 rounded-[10px] bg-white hover:bg-[#F8FAFC] text-[#334155] hover:text-[#0F172A] border border-[#CBD5E1] transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
