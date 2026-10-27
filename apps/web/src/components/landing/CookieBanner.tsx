'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Check, Settings2, X } from 'lucide-react';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
}

export const CookieBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    try {
      const consent = localStorage.getItem('eazzio_cookie_consent');
      if (!consent) {
        setIsOpen(true);
      }
    } catch (_) {
      setIsOpen(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const fullConsent: CookiePreferences = { necessary: true, functional: true, analytics: true };
    try {
      localStorage.setItem('eazzio_cookie_consent', JSON.stringify(fullConsent));
    } catch (_) {}
    setIsOpen(false);
  };

  const handleRejectNonEssential = () => {
    const minConsent: CookiePreferences = { necessary: true, functional: false, analytics: false };
    try {
      localStorage.setItem('eazzio_cookie_consent', JSON.stringify(minConsent));
    } catch (_) {}
    setIsOpen(false);
  };

  const handleSavePreferences = () => {
    try {
      localStorage.setItem('eazzio_cookie_consent', JSON.stringify(preferences));
    } catch (_) {}
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      role="region"
      className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className="bg-[#FFFFFF] dark:bg-[#16181D] border border-[#E2E8F0] dark:border-[#2A2E37] rounded-2xl shadow-2xl p-5 text-[#0F172A] dark:text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] dark:bg-[#14B8A6]/20 border border-[#CCFBF1] dark:border-[#14B8A6]/30 flex items-center justify-center text-[#14B8A6] shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Cookie &amp; Privacy Preferences</h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Strictly zero tracking pixels or third-party ads</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRejectNonEssential}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors"
            aria-label="Close cookie banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {!showPreferences ? (
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-3 leading-relaxed">
            Eazzio Mail uses strictly necessary authentication cookies and local preferences to ensure your session remains secure and high-performance. We never sell data.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5 border-y border-[#E2E8F0] dark:border-[#2A2E37] py-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block">Essential Cookies</span>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Authentication tokens, CSRF protection, and session state</span>
              </div>
              <span className="text-[11px] font-bold text-[#14B8A6] bg-[#F0FDFA] dark:bg-[#14B8A6]/20 px-2 py-0.5 rounded">Always Active</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block">Functional Preferences</span>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Theme color, mail density, keyboard shortcuts</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                className="w-4 h-4 accent-[#14B8A6] rounded"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowPreferences(!showPreferences)}
            className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#14B8A6] flex items-center gap-1 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showPreferences ? 'Simple View' : 'Customize'}</span>
          </button>

          <div className="flex items-center gap-2">
            {!showPreferences ? (
              <>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2E37] text-xs font-semibold hover:bg-[#F8FAFC] dark:hover:bg-[#1C1C21] transition-all"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-1.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-semibold transition-all shadow-sm"
                >
                  Accept All
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-4 py-1.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-semibold transition-all shadow-sm"
              >
                Save Choices
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
