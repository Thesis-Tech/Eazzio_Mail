'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Send, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthStore } from '../../lib/auth-store';
import { loginWithFacebook } from '../../components/auth/FacebookSdk';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'password' | 'telegram'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramOtp, setTelegramOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Normalize email: if user enters 'rahul', it becomes 'rahul@eazzio.com'
  const normalizedEmail = identifier.includes('@')
    ? identifier.toLowerCase().trim()
    : `${identifier.toLowerCase().trim()}@eazzio.com`;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!identifier || !password) {
        throw new Error('Please enter both your email/username and password');
      }

      // Simulate authentication request
      await new Promise((resolve) => setTimeout(resolve, 300));

      AuthStore.setSession(
        {
          id: 'user_123',
          email: normalizedEmail,
          displayName: normalizedEmail.split('@')[0],
          role: 'user',
        },
        'token_' + Date.now()
      );

      window.location.href = '/';
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramOtpSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setErrorMessage('Please provide a valid phone number');
      return;
    }
    setIsOtpSent(true);
    setErrorMessage(null);
  };

  const handleTelegramOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!telegramOtp || telegramOtp.length < 4) {
        throw new Error('Please enter a valid verification code');
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      AuthStore.setSession(
        {
          id: 'user_telegram_' + Date.now(),
          email: `${phone.replace(/\D/g, '')}@telegram.eazzio.com`,
          displayName: `Telegram User (${phone})`,
          role: 'user',
        },
        'token_tg_' + Date.now()
      );

      window.location.href = '/';
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'OTP verification failed');
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
          <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to Eazzio Mail</h2>
          <p className="text-sm text-slate-400">Enter your <span className="text-[#2D5BFF] font-semibold">@eazzio.com</span> username or email</p>
        </div>

        {/* Tab Switcher: Password vs Telegram OTP */}
        <div className="flex bg-[#0F1115] p-1 rounded-xl border border-[#2A2E37]">
          <button
            type="button"
            onClick={() => { setAuthMode('password'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'password' ? 'bg-[#2D5BFF] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            data-testid="tab-password"
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('telegram'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'telegram' ? 'bg-[#2D5BFF] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            data-testid="tab-telegram"
          >
            Telegram OTP
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2.5" data-testid="auth-error-alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Password Form */}
        {authMode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4" data-testid="login-form">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username or Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="username or username@eazzio.com"
                  className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <a href="#" className="text-xs text-[#2D5BFF] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              data-testid="login-submit-button"
            >
              {isLoading ? 'Signing in...' : 'Sign in to Mailbox'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Telegram OTP Form */
          <div className="space-y-4">
            {!isOtpSent ? (
              <form onSubmit={handleTelegramOtpSend} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number (with country code)</label>
                  <div className="relative">
                    <Send className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Request Telegram OTP
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleTelegramOtpVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Enter Telegram Verification Code</label>
                  <input
                    type="text"
                    value={telegramOtp}
                    onChange={(e) => setTelegramOtp(e.target.value)}
                    required
                    placeholder="123456"
                    className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl px-4 py-2.5 text-center tracking-widest text-lg font-mono text-white placeholder-slate-500 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2 text-center">Code sent to Telegram for {phone}</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Continue'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* OAuth Divider & Social Logins */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2A2E37]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#16181D] px-2 text-slate-500">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={async () => {
              try {
                const fbProfile = await loginWithFacebook();
                AuthStore.setSession({
                  id: fbProfile.id,
                  email: fbProfile.email,
                  displayName: fbProfile.name,
                  role: 'user'
                }, 'token_fb_' + Date.now());
                window.location.href = '/';
              } catch (err: unknown) {
                setErrorMessage((err as Error).message || 'Facebook login failed');
              }
            }}
            className="py-2.5 px-3 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2]/20 text-xs font-semibold text-[#1877F2] flex items-center justify-center gap-1.5 transition-all"
            data-testid="fb-login-button"
          >
            Facebook
          </button>
          <button
            type="button"
            onClick={() => {
              AuthStore.setSession({ id: 'user_oauth_google', email: 'user@eazzio.com', displayName: 'Google User', role: 'user' }, 'token_google');
              window.location.href = '/';
            }}
            className="py-2.5 px-3 rounded-xl bg-[#0F1115] border border-[#2A2E37] hover:border-slate-600 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => {
              AuthStore.setSession({ id: 'user_oauth_github', email: 'dev@eazzio.com', displayName: 'GitHub User', role: 'user' }, 'token_github');
              window.location.href = '/';
            }}
            className="py-2.5 px-3 rounded-xl bg-[#0F1115] border border-[#2A2E37] hover:border-slate-600 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
          >
            GitHub
          </button>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#2D5BFF] font-semibold hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
