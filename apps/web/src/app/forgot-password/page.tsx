'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import { AuthStore } from '../../lib/auth-store';

type RecoveryStep = 'identifier' | 'code' | 'newPassword' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<RecoveryStep>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Enter your email or username');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await AuthStore.forgotPassword(identifier);
      setStep('code');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not initiate recovery. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      setErrorMessage('Enter the reset token or verification code');
      return;
    }
    setErrorMessage(null);
    setStep('newPassword');
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await AuthStore.resetPassword(identifier, resetToken, newPassword);
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please request a new recovery link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#EDEEF0] flex flex-col justify-between items-center p-4 sm:p-6 selection:bg-[#2D5BFF] selection:text-white">
      {/* Top Header Placeholder */}
      <div className="w-full max-w-6xl py-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2D5BFF] to-[#608BFF] flex items-center justify-center font-bold text-white text-base shadow-lg shadow-blue-500/25">
            E
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Eazzio</span>
        </div>
      </div>

      {/* Main Recovery Card */}
      <div className="w-full max-w-[460px] my-auto bg-[#14161B] border border-[#262A33] p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/60 relative overflow-hidden transition-all">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#2D5BFF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Step 1: Identifier */}
        {step === 'identifier' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/25 mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Account recovery</h1>
              <p className="text-sm text-slate-400">Enter your email or username to recover your account</p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleIdentifierSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setErrorMessage(null); }}
                  placeholder="Email or username"
                  className="w-full bg-[#0E1015] border border-[#2B303C] hover:border-[#3E4556] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3.5 text-base text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>{isLoading ? 'Searching...' : 'Next'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Code Verification */}
        {step === 'code' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/25 mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Enter recovery code</h1>
              <p className="text-sm text-slate-400">
                A password reset token was sent to <span className="text-slate-200 font-medium">{identifier}</span>
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => { setResetToken(e.target.value); setErrorMessage(null); }}
                  placeholder="Paste reset token / code"
                  className="w-full bg-[#0E1015] border border-[#2B303C] hover:border-[#3E4556] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3.5 text-sm font-mono text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('identifier')}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Set New Password */}
        {step === 'newPassword' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/25 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Create new password</h1>
              <p className="text-sm text-slate-400">Choose a strong password that you don't use for other websites</p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrorMessage(null); }}
                  placeholder="New password (min 8 characters)"
                  className="w-full bg-[#0E1015] border border-[#2B303C] hover:border-[#3E4556] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3.5 pr-11 text-base text-white placeholder-slate-500 outline-none transition-all"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-4 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
                  placeholder="Confirm new password"
                  className="w-full bg-[#0E1015] border border-[#2B303C] hover:border-[#3E4556] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3.5 text-base text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('code')}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>{isLoading ? 'Saving...' : 'Save password'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Password changed!</h1>
              <p className="text-sm text-slate-400">
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>
            </div>

            <div className="pt-4">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all"
              >
                Sign in to your account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Language & Privacy Links */}
      <div className="w-full max-w-[460px] py-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-400 transition-colors">
          <span>English (United States)</span>
          <ChevronDown className="w-3 h-3" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/help" className="hover:text-slate-400 transition-colors">Help</Link>
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
        </div>
      </div>
    </div>
  );
}
