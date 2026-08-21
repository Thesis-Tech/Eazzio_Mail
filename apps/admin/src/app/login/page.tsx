'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Mail, Lock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { AdminAuthStore } from '../../lib/admin-auth-store';
import { AdminUser } from '../../types/admin';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@eazzio.com');
  const [password, setPassword] = useState('password123');
  const [totpCode, setTotpCode] = useState('');
  const [role, setRole] = useState<'PlatformAdmin' | 'OrgAdmin'>('PlatformAdmin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please provide email and password');
      }

      // Simulate Authentication & Token Issuance
      const adminUser: AdminUser = {
        userId: `usr-${Date.now()}`,
        email: email.trim(),
        displayName: role === 'PlatformAdmin' ? 'Platform SuperAdmin' : 'Organization Admin',
        role,
        organizationName: role === 'PlatformAdmin' ? 'Global Platform Scope' : 'Acme Corporation',
        organizationId: role === 'PlatformAdmin' ? undefined : 'org-acme-1',
      };

      AdminAuthStore.setSession({
        token: `admin-jwt-${Date.now()}`,
        user: adminUser,
        expiresAt: Date.now() + 86400000,
      });

      router.push('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0F1115] flex flex-col items-center justify-center p-6 text-white" data-testid="admin-login-page">
      <div className="w-full max-w-md bg-[#16181D] border border-[#2A2E37] rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2D5BFF]/20 border border-[#2D5BFF]/40 text-[#2D5BFF] mx-auto flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Eazzio Admin Portal</h1>
          <p className="text-xs text-slate-400">Sign in with administrative credentials</p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Role Selection</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('PlatformAdmin')}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  role === 'PlatformAdmin'
                    ? 'bg-[#2D5BFF]/20 border-[#2D5BFF] text-[#2D5BFF]'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="role-platform-admin"
              >
                Platform Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('OrgAdmin')}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  role === 'OrgAdmin'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-[#121418] border-[#2A2E37] text-slate-400 hover:text-white'
                }`}
                data-testid="role-org-admin"
              >
                Org Admin
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Admin Email</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl pl-9 pr-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
                placeholder="admin@eazzio.com"
                data-testid="admin-email-input"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl pl-9 pr-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
                placeholder="••••••••••••"
                data-testid="admin-password-input"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">2FA TOTP Code (Optional)</label>
            <div className="relative flex items-center">
              <Key className="w-4 h-4 text-slate-500 absolute left-3" />
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full bg-[#121418] border border-[#2A2E37] rounded-xl pl-9 pr-3 py-2.5 text-white outline-none focus:border-[#2D5BFF]"
                placeholder="123456"
                data-testid="admin-totp-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#2D5BFF] hover:bg-[#1E48E0] font-bold text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            data-testid="admin-submit-btn"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Access Admin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
