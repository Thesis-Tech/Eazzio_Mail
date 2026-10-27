'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How does Eazzio Mail protect my privacy compared to Big Tech providers?',
    answer: 'Eazzio Mail does not scan your emails for ad targeting, does not inject tracking pixels, and strips remote trackers before rendering. Your emails are stored encrypted with industry-standard TLS 1.3 in transit and PostgreSQL encrypted storage at rest.',
  },
  {
    question: 'Can I use my own custom domain with Eazzio Mail?',
    answer: 'Yes. Eazzio Mail includes full custom domain support with automated MX, SPF, DKIM, and DMARC verification wizards. You can connect custom business domains in less than 2 minutes.',
  },
  {
    question: 'What happens when my 15-minute access token expires?',
    answer: 'Eazzio Mail uses short-lived JWT access tokens (15 minutes) paired with a cryptographically verified server session. Tokens refresh automatically in the background with zero disruption. When you log out, the session is revoked instantly server-side.',
  },
  {
    question: 'Are keyboard shortcuts supported for power users?',
    answer: 'Yes. Press "?" anywhere in your mailbox to view the full cheat sheet. Use "C" to compose, "/" to search, "GI" for inbox, "GS" for starred, "E" to archive, and "#" to trash.',
  },
  {
    question: 'Is there a desktop notification or mobile app?',
    answer: 'Eazzio Mail is responsive across mobile, tablet, and desktop screens with full PWA installation capabilities, real-time WebSocket instant notifications, and clean touch navigation.',
  },
];

export const LandingFaq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <div className="text-center mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-[#14B8A6] bg-[#F0FDFA] px-3.5 py-1 rounded-full border border-[#CCFBF1]">
          Frequently Asked Questions
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-3 tracking-tight">
          Everything you need to know
        </h2>
        <p className="text-sm text-[#475569] max-w-xl mx-auto mt-2 leading-relaxed">
          Clear answers about security, custom domains, reliability, and privacy.
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden transition-all shadow-sm hover:border-[#CBD5E1]"
            >
              <button
                type="button"
                onClick={() => handleToggle(index)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                id={`faq-question-${index}`}
                className="w-full px-6 py-5 text-left font-bold text-[#0F172A] flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:ring-inset transition-colors"
              >
                <span className="text-base">{item.question}</span>
                <div
                  className={`w-8 h-8 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-[#F0FDFA] text-[#14B8A6] border-[#CCFBF1]' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  className="px-6 pb-6 text-sm text-[#475569] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
