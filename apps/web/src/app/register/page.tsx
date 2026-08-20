'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Send,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { AuthStore } from '../../lib/auth-store';

export default function RegisterPage() {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [displayName, setDisplayName] = useState('');
  const [rawUsername, setRawUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91 ');

  // OTP Verification State
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  /**
   * Enforces strict username rules:
   * 1. Only a-z, 0-9, and at most one '.' (no special characters).
   * 2. Cannot start with a dot.
   */
  const sanitizeUsernameInput = (input: string): string => {
    let val = input.toLowerCase().replace(/@eazzio\.com$/i, '');
    val = val.replace(/[^a-z0-9.]/g, '');
    val = val.replace(/^\./, '');
    const dotIndex = val.indexOf('.');
    if (dotIndex !== -1) {
      const beforeDot = val.slice(0, dotIndex);
      const afterDot = val.slice(dotIndex + 1).replace(/\./g, '');
      val = `${beforeDot}.${afterDot}`;
    }
    return val;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeUsernameInput(e.target.value);
    setRawUsername(sanitized);
  };

  const cleanUsername = rawUsername;
  const fullEmailAddress = cleanUsername ? `${cleanUsername}@eazzio.com` : '';

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName || !cleanUsername || !password || !phoneNumber) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters long');
      return;
    }

    if (cleanUsername.length > 30) {
      setErrorMessage('Username cannot exceed 30 characters');
      return;
    }

    if (cleanUsername.endsWith('.')) {
      setErrorMessage('Username cannot end with a dot (.)');
      return;
    }

    const usernameRegex = /^[a-z0-9]+(\.[a-z0-9]+)?$/;
    if (!usernameRegex.test(cleanUsername)) {
      setErrorMessage('Username can only contain letters (a-z), numbers (0-9), and at most one dot (.) (e.g. rahul.kumar)');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid phone number with country code');
      return;
    }

    // Advance to OTP Step
    setStep('otp');
    setOtpChannel('whatsapp');
    setResendCooldown(30);
    setSuccessMessage(`OTP sent to WhatsApp at ${phoneNumber}`);
  };

  const handleSwitchToTelegram = () => {
    setOtpChannel('telegram');
    setResendCooldown(30);
    setErrorMessage(null);
    setSuccessMessage(`Fallback activated: Check Telegram Bot (@EazzioVerifyBot) for your code`);
  };

  const handleSwitchToWhatsApp = () => {
    setOtpChannel('whatsapp');
    setResendCooldown(30);
    setErrorMessage(null);
    setSuccessMessage(`OTP resent via WhatsApp to ${phoneNumber}`);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!otpCode || otpCode.trim().length < 4) {
        throw new Error('Please enter a valid 6-digit verification code');
      }

      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Successfully verified
      AuthStore.setSession(
        {
          id: 'user_reg_' + Date.now(),
          email: fullEmailAddress,
          displayName,
          phone: phoneNumber,
          isPhoneVerified: true,
          role: 'user',
        },
        'token_reg_' + Date.now()
      );

      // Redirect to home page
      window.location.href = '/';
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Invalid verification code');
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
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {step === 'details' ? 'Create your Eazzio Mail' : 'Verify your Phone'}
          </h2>
          <p className="text-sm text-slate-400">
            {step === 'details'
              ? 'Get your free @eazzio.com address with WhatsApp/Telegram verification'
              : `Enter the 6-digit verification code sent to ${phoneNumber}`}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${step === 'details' ? 'bg-[#2D5BFF]/20 text-[#2D5BFF] border border-[#2D5BFF]/40' : 'bg-emerald-500/15 text-emerald-400'}`}>
            <span>1. Account Details</span>
            {step === 'otp' && <CheckCircle2 className="w-3.5 h-3.5" />}
          </div>
          <div className="w-4 border-t border-[#2A2E37]"></div>
          <div className={`text-xs font-semibold px-3 py-1 rounded-full ${step === 'otp' ? 'bg-[#2D5BFF]/20 text-[#2D5BFF] border border-[#2D5BFF]/40' : 'text-slate-500 bg-[#0F1115]'}`}>
            <span>2. Phone Verification</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2.5" data-testid="register-error-alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success / Info Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Step 1: Account Details Form */}
        {step === 'details' ? (
          <form onSubmit={handleDetailsSubmit} className="space-y-4" data-testid="register-form">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Rahul Kumar"
                  className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  data-testid="register-name-input"
                />
              </div>
            </div>

            {/* Eazzio Username Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-300">Choose your Username</label>
                <span className="text-[10px] text-slate-400">a-z, 0-9 & only 1 dot (.)</span>
              </div>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={cleanUsername}
                  onChange={handleUsernameChange}
                  required
                  placeholder="rahul.kumar"
                  className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-32 py-2.5 text-sm font-medium text-white placeholder-slate-500 outline-none transition-all"
                  data-testid="register-username-input"
                />
                <div className="absolute right-2 px-2.5 py-1 rounded-lg bg-[#1C1F26] border border-[#2A2E37] text-xs font-semibold text-[#2D5BFF] select-none">
                  @eazzio.com
                </div>
              </div>
              {cleanUsername ? (
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5 pl-1">
                  <Sparkles className="w-3 h-3 text-[#2D5BFF]" />
                  Your address will be: <span className="text-white font-medium">{fullEmailAddress}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1 pl-1">
                  No special characters. Single dot permitted (e.g. <code>rahul.kumar</code>).
                </p>
              )}
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Number (for WhatsApp/Telegram OTP)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-1 focus:ring-[#2D5BFF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  data-testid="register-phone-input"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password (min 8 chars)</label>
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
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
              className="w-full py-3 px-4 rounded-xl bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              data-testid="register-submit-button"
            >
              <span>Continue to Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification Screen */
          <form onSubmit={handleVerifyOtp} className="space-y-6" data-testid="otp-form">
            {/* Active Channel Indicator */}
            <div className="p-4 rounded-xl bg-[#0F1115] border border-[#2A2E37] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {otpChannel === 'whatsapp' ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {otpChannel === 'whatsapp' ? 'WhatsApp OTP (Primary)' : 'Telegram Bot (Fallback)'}
                    </p>
                    <p className="text-[11px] text-slate-400">{phoneNumber}</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Free Delivery
                </span>
              </div>

              {otpChannel === 'telegram' && (
                <div className="pt-2 border-t border-[#2A2E37]/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Open Telegram Bot:</span>
                  <a
                    href="https://t.me/EazzioVerifyBot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2D5BFF] hover:underline flex items-center gap-1 font-medium"
                  >
                    @EazzioVerifyBot
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* 6-Digit OTP Code Input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                placeholder="123456"
                className="w-full bg-[#0F1115] border border-[#2A2E37] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/30 rounded-xl px-4 py-3 text-center tracking-[0.4em] text-2xl font-mono text-white placeholder-slate-600 outline-none transition-all"
                data-testid="otp-code-input"
              />
            </div>

            {/* Verify & Enter Button */}
            <button
              type="submit"
              disabled={isLoading || otpCode.length < 4}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              data-testid="verify-otp-button"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Phone & Open Mailbox</span>
                </>
              )}
            </button>

            {/* Fallback Channels & Resend Options */}
            <div className="space-y-3 pt-2 text-center text-xs">
              {otpChannel === 'whatsapp' ? (
                <button
                  type="button"
                  onClick={handleSwitchToTelegram}
                  className="text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors"
                  data-testid="switch-telegram-btn"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>Didn't get on WhatsApp? <strong>Get OTP on Telegram Bot</strong></span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSwitchToWhatsApp}
                  className="text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors"
                  data-testid="switch-whatsapp-btn"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resend via WhatsApp Message</span>
                </button>
              )}

              <div>
                {resendCooldown > 0 ? (
                  <span className="text-slate-500">Resend available in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setResendCooldown(30);
                      setSuccessMessage(`New code sent via ${otpChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}`);
                    }}
                    className="text-[#2D5BFF] hover:underline font-medium"
                  >
                    Resend OTP Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep('details'); setErrorMessage(null); setSuccessMessage(null); }}
                className="text-slate-500 hover:text-slate-300 block mx-auto text-[11px] pt-1"
              >
                ← Change Phone Number / Details
              </button>
            </div>
          </form>
        )}

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
