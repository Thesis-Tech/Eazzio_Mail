'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { AuthStore } from '../../lib/auth-store';
import { ArrowRight, Menu, X } from 'lucide-react';

export const LandingHeader: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const authState = AuthStore.initFromStorage();
    setIsAuthenticated(authState && AuthStore.getState().isAuthenticated);

    const unsubscribe = AuthStore.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
    });
    return () => unsubscribe();
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none shrink-0" onClick={closeMobileMenu}>
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-[#14B8A6] to-[#0E172A] flex items-center justify-center font-bold text-white shadow-sm shadow-[#14B8A6]/20 shrink-0 text-sm">
            E
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#0F172A] tracking-tight text-lg group-hover:text-[#14B8A6] transition-colors">
              Eazzio
            </span>
            <span className="font-semibold text-[#0F766E] text-xs px-2 py-0.5 rounded-full bg-[#F0FDFA] border border-[#CCFBF1]">
              Mail
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
          <a href="#features" className="hover:text-[#0F172A] transition-colors">
            Features
          </a>
          <a href="#demo" className="hover:text-[#0F172A] transition-colors">
            Interactive Demo
          </a>
          <a href="#pricing" className="hover:text-[#0F172A] transition-colors">
            Pricing
          </a>
          <a href="#security" className="hover:text-[#0F172A] transition-colors">
            Security
          </a>
        </nav>

        {/* Desktop Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/mail"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-sm font-medium transition-all shadow-sm shadow-[#14B8A6]/20 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
            >
              <span>Go to Mail</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-2 text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors rounded-[10px] focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-4 py-2 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-sm font-medium transition-all shadow-sm shadow-[#14B8A6]/20 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
              >
                Create an account
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated && (
            <Link
              href="/mail"
              className="px-3 py-1.5 rounded-[8px] bg-[#14B8A6] text-white text-xs font-semibold"
            >
              Mail
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-[10px] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none transition-colors"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden border-b border-[#E2E8F0] bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-200"
        >
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#334155]">
            <a
              href="#features"
              onClick={closeMobileMenu}
              className="p-2.5 rounded-[8px] hover:bg-[#F8FAFC] hover:text-[#14B8A6] transition-colors"
            >
              Features
            </a>
            <a
              href="#demo"
              onClick={closeMobileMenu}
              className="p-2.5 rounded-[8px] hover:bg-[#F8FAFC] hover:text-[#14B8A6] transition-colors"
            >
              Interactive Demo
            </a>
            <a
              href="#pricing"
              onClick={closeMobileMenu}
              className="p-2.5 rounded-[8px] hover:bg-[#F8FAFC] hover:text-[#14B8A6] transition-colors"
            >
              Pricing
            </a>
            <a
              href="#security"
              onClick={closeMobileMenu}
              className="p-2.5 rounded-[8px] hover:bg-[#F8FAFC] hover:text-[#14B8A6] transition-colors"
            >
              Security
            </a>
          </nav>

          <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Link
                href="/mail"
                onClick={closeMobileMenu}
                className="w-full py-2.5 px-4 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Launch Webmail</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="w-full py-2.5 px-4 rounded-[10px] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] text-sm font-semibold text-center transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="w-full py-2.5 px-4 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-sm font-semibold text-center transition-all shadow-sm shadow-[#14B8A6]/20"
                >
                  Create an account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
