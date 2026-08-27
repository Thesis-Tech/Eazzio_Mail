import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const GlobalFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#020617] border-t border-[#1E293B] text-[#94A3B8] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-8 mb-10 sm:mb-12">
          {/* Brand & Mission */}
          <div className="sm:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-[#14B8A6] to-[#0E172A] flex items-center justify-center font-bold text-white shadow-sm shadow-[#14B8A6]/20 shrink-0 text-sm">
                E
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#F8FAFC] tracking-tight text-lg">Eazzio</span>
                <span className="font-semibold text-[#5BCDC0] text-xs px-2 py-0.5 rounded-full bg-[#134E4A]/50 border border-[#14B8A6]/30">
                  Mail
                </span>
              </div>
            </Link>
            <p className="text-[#94A3B8] text-xs leading-relaxed max-w-sm">
              Professional email and collaboration suite engineered for unmatched speed, privacy, and team efficiency.
              Zero ads, zero tracker scripts, and full data sovereignty.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
              <ShieldCheck className="w-4 h-4 text-[#14B8A6]" />
              <span>TLS 1.3 • Strict SPF / DKIM / DMARC</span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <p className="font-semibold text-[#F8FAFC] uppercase tracking-wider text-[11px]">Product</p>
            <ul className="space-y-2">
              <li>
                <Link href="/mail" className="hover:text-white transition-colors">
                  Webmail App
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-white transition-colors">
                  Interactive Demo
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="space-y-3">
            <p className="font-semibold text-[#F8FAFC] uppercase tracking-wider text-[11px]">Resources</p>
            <ul className="space-y-2">
              <li>
                <Link href="/mail" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/mail" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/mail" className="hover:text-white transition-colors">
                  API Status
                </Link>
              </li>
              <li>
                <Link href="/mail" className="hover:text-white transition-colors">
                  Developer Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3">
            <p className="font-semibold text-[#F8FAFC] uppercase tracking-wider text-[11px]">Company & Legal</p>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  About Eazzio
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Column */}
          <div className="space-y-3">
            <p className="font-semibold text-[#F8FAFC] uppercase tracking-wider text-[11px]">Account</p>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Create an account
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-white transition-colors">
                  Forgot Password
                </Link>
              </li>
              <li>
                <Link href="/mail" className="text-[#14B8A6] hover:text-[#5BCDC0] transition-colors font-medium">
                  Launch Webmail →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Guarantee Bar */}
        <div className="pt-6 sm:pt-8 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-[11px] text-[#94A3B8] text-center sm:text-left">
          <p>© 2026 Eazzio Inc. All rights reserved. Eazzio Mail is an Eazzio ecosystem product.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[#CBD5E1]">
            <span>Desktop-First Enterprise Architecture</span>
            <span>Security by Design</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
