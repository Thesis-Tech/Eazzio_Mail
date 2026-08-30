'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronDown,
  Mail,
  Send,
  MessageSquare,
} from 'lucide-react';
import { AuthStore } from '../../lib/auth-store';

type RecoveryStep = 'identifier' | 'channel' | 'code' | 'newPassword' | 'success';
type RecoveryChannel = 'email' | 'telegram' | 'whatsapp';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', label: 'India (+91)' },
  { code: '+1', country: 'US', label: 'United States (+1)' },
  { code: '+44', country: 'GB', label: 'United Kingdom (+44)' },
  { code: '+971', country: 'AE', label: 'UAE (+971)' },
  { code: '+65', country: 'SG', label: 'Singapore (+65)' },
  { code: '+61', country: 'AU', label: 'Australia (+61)' },
  { code: '+49', country: 'DE', label: 'Germany (+49)' },
  { code: '+33', country: 'FR', label: 'France (+33)' },
  { code: '+81', country: 'JP', label: 'Japan (+81)' },
];

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<RecoveryStep>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState<RecoveryChannel>('email');
  const [recoveryTarget, setRecoveryTarget] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState('');

  const handleIdentifierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMessage('Enter your email or username');
      return;
    }
    if (cleanId.length > 254) {
      setErrorMessage('Identifier exceeds maximum allowed length');
      return;
    }
    setErrorMessage(null);
    setStep('channel');
  };

  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = recoveryTarget.trim();

    if (channel === 'email') {
      if (!target || !target.includes('@') || !target.includes('.')) {
        setErrorMessage('Enter a valid recovery email address');
        return;
      }
    } else {
      const digits = target.replace(/[^0-9]/g, '');
      if (digits.length < 7 || digits.length > 15) {
        setErrorMessage('Enter a valid phone number (7-15 digits)');
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fullTarget = channel === 'email'
        ? target
        : (target.startsWith('+') ? target : `${countryCode}${target}`);

      const res = await AuthStore.forgotPassword(identifier.trim(), channel, fullTarget);
      if (res.devToken) {
        setResetToken(res.devToken);
      }
      setDispatchNotice(res.message || `Reset code sent via ${channel}`);
      setStep('code');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send recovery code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = resetToken.trim();
    if (!cleanToken) {
      setErrorMessage('Enter the reset code');
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
    if (newPassword.length > 1024) {
      setErrorMessage('Password exceeds maximum allowed length');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await AuthStore.resetPassword(identifier.trim(), resetToken.trim(), newPassword);
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please request a new recovery link.');
    } finally {
      setIsLoading(false);
    }
  };

  const channelLabel = channel === 'email' ? 'recovery email' : channel === 'telegram' ? 'Telegram' : 'WhatsApp';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between items-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#14B8A6]/20 selection:text-[#0F172A]">
      {/* Centered Brand Header */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group focus:outline-none">
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-tr from-[#14B8A6] to-[#0E172A] flex items-center justify-center font-bold text-white shadow-sm shadow-[#14B8A6]/20 text-sm">
          E
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#0F172A] tracking-tight text-xl group-hover:text-[#14B8A6] transition-colors">
            Eazzio
          </span>
          <span className="font-semibold text-[#0F766E] text-xs px-2 py-0.5 rounded-full bg-[#F0FDFA] border border-[#CCFBF1]">
            Mail
          </span>
        </div>
      </Link>

      {/* Main Recovery Card */}
      <div className="w-full max-w-[440px] bg-white border border-[#E2E8F0] p-8 sm:p-10 rounded-[16px] shadow-sm relative transition-all my-auto">
        {/* Step 1: Identifier */}
        {step === 'identifier' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Account recovery</h1>
              <p className="text-sm text-[#475569]">Enter your Eazzio Mail email or username to recover your account.</p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleIdentifierSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="recovery-id-input" className="block text-xs font-semibold text-[#0F172A]">
                  Eazzio Mail email or username
                </label>
                <input
                  id="recovery-id-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setErrorMessage(null); }}
                  placeholder="name@eazzio.com"
                  className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to sign in</span>
                </Link>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.99] text-white font-semibold text-sm shadow-sm shadow-[#14B8A6]/20 transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Channel Selection + Recovery Contact */}
        {step === 'channel' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Choose recovery method</h1>
              <p className="text-sm text-[#475569]">
                How would you like to receive the password reset code for{' '}
                <span className="text-[#0F172A] font-semibold">{identifier}</span>?
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Channel Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'email' as RecoveryChannel, icon: Mail, label: 'Email' },
                { key: 'whatsapp' as RecoveryChannel, icon: MessageSquare, label: 'WhatsApp' },
                { key: 'telegram' as RecoveryChannel, icon: Send, label: 'Telegram' },
              ]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setChannel(key); setRecoveryTarget(''); setErrorMessage(null); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-[10px] border text-xs font-semibold transition-all ${
                    channel === key
                      ? 'bg-[#F0FDFA] border-[#14B8A6] text-[#0F766E] shadow-sm'
                      : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleChannelSubmit} className="space-y-5">
              {/* Email Input */}
              {channel === 'email' && (
                <div className="space-y-1.5">
                  <label htmlFor="recovery-email" className="block text-xs font-semibold text-[#0F172A]">
                    Recovery Email Address
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    value={recoveryTarget}
                    onChange={(e) => { setRecoveryTarget(e.target.value); setErrorMessage(null); }}
                    placeholder="your-gmail@gmail.com"
                    className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                    required
                  />
                  <p className="text-[11px] text-[#94A3B8]">The reset code will be sent to this email.</p>
                </div>
              )}

              {/* Phone Input for WhatsApp/Telegram */}
              {(channel === 'whatsapp' || channel === 'telegram') && (
                <div className="space-y-1.5">
                  <label htmlFor="recovery-phone" className="block text-xs font-semibold text-[#0F172A]">
                    {channel === 'telegram' ? 'Phone Number or @Username' : 'WhatsApp Phone Number'}
                  </label>
                  <div className="flex gap-2">
                    {/* Country Code Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="flex items-center gap-1 bg-white border border-[#CBD5E1] hover:border-[#94A3B8] rounded-[10px] px-3 py-2.5 text-sm text-[#0F172A] whitespace-nowrap transition-all min-w-[90px]"
                      >
                        <span>{countryCode}</span>
                        <ChevronDown className="w-3 h-3 text-[#64748B]" />
                      </button>
                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E2E8F0] rounded-[10px] shadow-lg z-20 w-52 max-h-40 overflow-y-auto">
                          {COUNTRY_CODES.map(({ code, label }) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => { setCountryCode(code); setShowCountryDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-[#F0FDFA] transition-colors ${
                                countryCode === code ? 'bg-[#F0FDFA] text-[#0F766E] font-semibold' : 'text-[#475569]'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      id="recovery-phone"
                      type="text"
                      value={recoveryTarget}
                      onChange={(e) => { setRecoveryTarget(e.target.value); setErrorMessage(null); }}
                      placeholder={channel === 'telegram' ? '8434237052 or @username' : '8434237052'}
                      className="flex-1 bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    {channel === 'telegram'
                      ? 'Make sure you have started @eazzioMailOtp_bot on Telegram first.'
                      : 'The reset code will be sent to this WhatsApp number.'}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep('identifier'); setErrorMessage(null); }}
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm shadow-sm shadow-[#14B8A6]/20 transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                >
                  <span>{isLoading ? 'Sending...' : 'Send Code'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Code Verification */}
        {step === 'code' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Enter recovery code</h1>
              <p className="text-sm text-[#475569]">
                A password reset code was sent to your {channelLabel}.
              </p>
              {dispatchNotice && (
                <p className="text-xs text-[#0F766E] font-medium flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {dispatchNotice}
                </p>
              )}
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="recovery-code-input" className="block text-xs font-semibold text-[#0F172A]">
                  Reset code
                </label>
                <input
                  id="recovery-code-input"
                  type="text"
                  value={resetToken}
                  onChange={(e) => { setResetToken(e.target.value); setErrorMessage(null); }}
                  placeholder="Paste reset code"
                  className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 font-mono text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all tracking-widest text-center uppercase"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep('channel'); setErrorMessage(null); }}
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.99] text-white font-semibold text-sm shadow-sm shadow-[#14B8A6]/20 transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Set New Password */}
        {step === 'newPassword' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Create new password</h1>
              <p className="text-sm text-[#475569]">Choose a strong password with at least 8 characters.</p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="new-pass-input" className="block text-xs font-semibold text-[#0F172A]">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-pass-input"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setErrorMessage(null); }}
                    placeholder="New password (min. 8 characters)"
                    className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 pr-10 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-new-pass-input" className="block text-xs font-semibold text-[#0F172A]">
                  Confirm new password
                </label>
                <input
                  id="confirm-new-pass-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
                  placeholder="Confirm new password"
                  className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('code')}
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm shadow-sm shadow-[#14B8A6]/20 transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                >
                  <span>{isLoading ? 'Saving...' : 'Save password'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <div className="space-y-6 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#14B8A6] mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Password updated</h1>
              <p className="text-sm text-[#475569]">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.99] text-white font-semibold text-sm shadow-sm shadow-[#14B8A6]/20 transition-all focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
              >
                <span>Sign in to your account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Language & Privacy Links */}
      <div className="w-full max-w-[440px] mt-8 flex items-center justify-between text-xs text-[#64748B]">
        <div className="flex items-center gap-1 cursor-pointer hover:text-[#0F172A] transition-colors">
          <span>English (United States)</span>
          <ChevronDown className="w-3 h-3" />
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-[#0F172A] transition-colors">Help</Link>
          <Link href="/" className="hover:text-[#0F172A] transition-colors">Privacy</Link>
          <Link href="/" className="hover:text-[#0F172A] transition-colors">Terms</Link>
        </div>
      </div>
    </div>
  );
}
