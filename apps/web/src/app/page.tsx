import React from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingHero } from '../components/landing/LandingHero';
import { ProductShowcaseSlider } from '../components/landing/ProductShowcaseSlider';
import { InteractiveMailDemo } from '../components/landing/InteractiveMailDemo';
import { PricingSection } from '../components/landing/PricingSection';
import { LandingFaq } from '../components/landing/LandingFaq';
import { CookieBanner } from '../components/landing/CookieBanner';
import { GlobalFooter } from '../components/landing/GlobalFooter';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Eazzio Mail',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'High-performance webmail suite engineered for privacy, speed, and clean organization. Features custom domain support, sub-second search, zero tracking pixels, and real-time synchronization.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Eazzio Free',
      price: '0.00',
      priceCurrency: 'USD',
      description: '500 MB encrypted storage, 1 email address, zero tracking pixels',
    },
    {
      '@type': 'Offer',
      name: 'Eazzio Mail Plus',
      price: '3.99',
      priceCurrency: 'USD',
      description: '1 GB secure storage, 15 email addresses, 3 custom email domains, unlimited folders and labels',
    },
    {
      '@type': 'Offer',
      name: 'Eazzio Mail Unlimited',
      price: '9.99',
      priceCurrency: 'USD',
      description: '500 GB massive storage, 15 email addresses, up to 3 custom email domains, advanced security',
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#14B8A6]/20 selection:text-[#0F172A] relative">
      {/* 1123: Accessible Skip to Content Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <LandingHeader />
      
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <LandingHero />
        <ProductShowcaseSlider />
        <InteractiveMailDemo />
        <PricingSection />
        <LandingFaq />
      </main>

      <GlobalFooter />
      <CookieBanner />
    </div>
  );
}
