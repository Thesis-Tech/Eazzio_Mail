'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { AuthStore } from '../../lib/auth-store';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!displayName || !email || !password) {
        throw new Error('Please fill in all required fields');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Simulate registration request
      await new Promise((resolve) => setTimeout(resolve, 300));

      AuthStore.setSession(
        {
          id: 'user_reg_' + Date.now(),
          email,
          displayName,
          role: 'user',
        },
        'token_reg_' + Date.now(),
      );

      window.location.href = '/';
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#EDEEF0] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-[#16181D] border border-[#2A2E37] p-8 rounded-2xl shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-xl text-white shadow-xl shadow-blue-500/20 mx-auto">
            E
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create your Account</h2>
          <p className="text-sm text-slate-400">Join Eazzio Mail with complete tenant isolation</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2.5"
            data-testid="register-error-alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Jane Doe"
                className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                data-testid="register-name-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                data-testid="register-email-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password (min 8 chars)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                data-testid="register-password-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                data-testid="register-confirm-password-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            data-testid="register-submit-button"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-[#2D5BFF] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
