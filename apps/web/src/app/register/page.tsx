'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ShieldCheck,
  Mail,
  Send,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { AuthStore } from '../../lib/auth-store';
import { loginWithFacebook } from '../../components/auth/FacebookSdk';

type RegisterStep = 'name' | 'username' | 'password' | 'verify';
type VerificationChannel = 'whatsapp' | 'telegram' | 'email';

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

export default function RegisterPage() {
  const router = useRouter();

  // Steps
  const [step, setStep] = useState<RegisterStep>('name');

  // Step 1: Name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Step 2: Username
  const [username, setUsername] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Step 3: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 4: Mandatory Verification
  const [verificationChannel, setVerificationChannel] = useState<VerificationChannel>('email');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // General Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fullName = `${firstName} ${lastName}`.trim();
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9.]/g, '');
  const emailAddress = cleanUsername ? `${cleanUsername}@eazzio.com` : '';

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Name Submit
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMessage('Enter your first name');
      return;
    }
    if (firstName.trim().length > 100 || lastName.trim().length > 100) {
      setErrorMessage('Name exceeds maximum allowed length');
      return;
    }
    setErrorMessage(null);
    setStep('username');
  };

  // Step 2: Username Submit with Immediate PostgreSQL Duplicate Check
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanUsername) {
      setErrorMessage('Choose an email address');
      return;
    }
    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters long');
      return;
    }
    if (cleanUsername.length > 64) {
      setErrorMessage('Username exceeds maximum allowed length');
      return;
    }

    setIsCheckingUsername(true);
    setErrorMessage(null);

    try {
      const checkRes = await AuthStore.identify(emailAddress);
      if (checkRes.exists) {
        setErrorMessage('That username is taken. Try another.');
        return;
      }
      setStep('password');
    } catch {
      setStep('password');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Step 3: Password Validation & Proceed to Mandatory Verification
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMessage('Use 8 characters or more for your password');
      return;
    }
    if (password.length > 1024) {
      setErrorMessage('Password exceeds maximum allowed length');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setErrorMessage(null);
    setStep('verify');
  };

  // Step 4: Dispatch Verification OTP
  const handleSendVerificationCode = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    const target =
      verificationChannel === 'email'
        ? recoveryEmail.trim()
        : `${countryCode}${phoneNumber.replace(/[^0-9]/g, '')}`;

    if (verificationChannel === 'email') {
      if (!recoveryEmail.trim() || !recoveryEmail.includes('@') || !recoveryEmail.includes('.')) {
        setErrorMessage('Enter a valid recovery email address');
        return;
      }
    } else {
      const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
      if (!cleanDigits || cleanDigits.length < 7 || cleanDigits.length > 15) {
        setErrorMessage('Enter a valid phone number (7-15 digits)');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/send-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          channel: verificationChannel,
          countryCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code');
      }

      setOtpSent(true);
      if (data.devCode) {
        setOtpCode(data.devCode);
        setSuccessNotice(`Verification code dispatched to ${target}. (Code: ${data.devCode})`);
      } else {
        setOtpCode('');
        setSuccessNotice(`Verification code dispatched to ${target}. Check your inbox/messages.`);
      }
      setCooldown(data.cooldownSeconds || 60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  // Step 4: Verify OTP & Create Account
  const handleVerifyAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpSent) {
      setErrorMessage('Please request a verification code first');
      return;
    }

    const cleanOtp = otpCode.replace(/[^0-9]/g, '');
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMessage('Enter the 6-digit verification code');
      return;
    }

    const target =
      verificationChannel === 'email'
        ? recoveryEmail.trim()
        : `${countryCode}${phoneNumber.replace(/[^0-9]/g, '')}`;

    setIsLoading(true);
    try {
      // 1. Verify OTP code
      const verifyRes = await fetch('/api/auth/verify-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          code: cleanOtp,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Incorrect or expired verification code. Please check and try again.');
      }

      // 2. Complete Account Registration in PostgreSQL
      await AuthStore.register(emailAddress, password, fullName || cleanUsername);
      router.push('/mail');
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification or account creation failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Social Login: Facebook OAuth Handler
  const handleFacebookAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fbUser = await loginWithFacebook();
      AuthStore.setSession(
        {
          id: fbUser.id,
          email: fbUser.email,
          displayName: fbUser.name,
          role: 'user',
        },
        `fb_token_${Date.now()}`
      );
      router.push('/mail');
    } catch (err: any) {
      setErrorMessage(err.message || 'Facebook registration was not completed.');
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Main Registration Card */}
      <div className="w-full max-w-[460px] bg-white border border-[#E2E8F0] p-8 sm:p-10 rounded-[16px] shadow-sm relative transition-all my-auto">
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === 'name'
                  ? 'bg-[#14B8A6] text-white'
                  : 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]'
              }`}
            >
              {step === 'name' ? '1' : step === 'username' ? '2' : step === 'password' ? '3' : '4'}
            </span>
            <span className="text-xs font-semibold text-[#0F172A]">
              {step === 'name' && 'Your Name'}
              {step === 'username' && 'Choose Email'}
              {step === 'password' && 'Set Password'}
              {step === 'verify' && 'Verify Account'}
            </span>
          </div>

          <span className="text-[11px] font-medium text-[#64748B]">
            Step {step === 'name' ? '1' : step === 'username' ? '2' : step === 'password' ? '3' : '4'} of 4
          </span>
        </div>

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Global Success Notice */}
        {successNotice && (
          <div className="mb-5 p-3 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 'name' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Create an account</h1>
              <p className="text-sm text-[#475569]">Enter your name to get started.</p>
            </div>

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="first-name-input" className="block text-xs font-semibold text-[#0F172A]">
                  First name
                </label>
                <input
                  id="first-name-input"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="First name"
                  className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="last-name-input" className="block text-xs font-semibold text-[#0F172A]">
                  Last name (optional)
                </label>
                <input
                  id="last-name-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#14B8A6] hover:text-[#0F766E] transition-colors focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                >
                  Sign in instead
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

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#64748B] font-medium">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFacebookAuth}
              disabled={isLoading}
              className="w-full bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-[10px] py-2.5 px-4 text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-2.5 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
            >
              <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Continue with Facebook</span>
            </button>
          </div>
        )}

        {/* Step 2: Username / Email */}
        {step === 'username' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Choose your email</h1>
              <p className="text-sm text-[#475569]">Create your custom @eazzio.com address.</p>
            </div>

            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username-input" className="block text-xs font-semibold text-[#0F172A]">
                  Email address
                </label>
                <div className="relative flex items-center">
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''));
                      setErrorMessage(null);
                    }}
                    placeholder="username"
                    className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 pr-28 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                    required
                    autoFocus
                  />
                  <span className="absolute right-3.5 text-xs font-semibold text-[#64748B] select-none pointer-events-none">
                    @eazzio.com
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B]">You can use letters, numbers, and periods.</p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('name')}
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isCheckingUsername}
                  className="px-6 py-2.5 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm shadow-sm shadow-[#14B8A6]/20 transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                >
                  <span>{isCheckingUsername ? 'Checking...' : 'Next'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Password */}
        {step === 'password' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Create a strong password</h1>
              <p className="text-sm text-[#475569]">Use 8 or more characters for security.</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reg-password-input" className="block text-xs font-semibold text-[#0F172A]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Password (min. 8 characters)"
                    className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 pr-10 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
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
                <label htmlFor="confirm-password-input" className="block text-xs font-semibold text-[#0F172A]">
                  Confirm password
                </label>
                <input
                  id="confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Confirm password"
                  className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-[#475569] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#14B8A6] focus:ring-[#14B8A6] w-3.5 h-3.5"
                />
                <span>Show password</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('username')}
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

        {/* Step 4: Mandatory Phone / Recovery Verification */}
        {step === 'verify' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mandatory Security Verification</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Verify Your Account</h1>
              <p className="text-xs text-[#475569]">
                Choose your preferred channel to receive a 6-digit verification code.
              </p>
            </div>

            {/* Verification Channel Selector Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVerificationChannel('email');
                  setOtpSent(false);
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={`p-2.5 rounded-[10px] border flex flex-col items-center justify-center gap-1 transition-all text-xs font-semibold ${
                  verificationChannel === 'email'
                    ? 'border-[#14B8A6] bg-[#14B8A6]/10 text-[#0F172A] shadow-sm'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A]'
                }`}
              >
                <Mail className={`w-4 h-4 ${verificationChannel === 'email' ? 'text-[#14B8A6]' : ''}`} />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVerificationChannel('whatsapp');
                  setOtpSent(false);
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={`p-2.5 rounded-[10px] border flex flex-col items-center justify-center gap-1 transition-all text-xs font-semibold ${
                  verificationChannel === 'whatsapp'
                    ? 'border-[#25D366] bg-[#25D366]/10 text-[#0F172A] shadow-sm'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A]'
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${verificationChannel === 'whatsapp' ? 'text-[#25D366]' : ''}`} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVerificationChannel('telegram');
                  setOtpSent(false);
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={`p-2.5 rounded-[10px] border flex flex-col items-center justify-center gap-1 transition-all text-xs font-semibold ${
                  verificationChannel === 'telegram'
                    ? 'border-[#229ED9] bg-[#229ED9]/10 text-[#0F172A] shadow-sm'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A]'
                }`}
              >
                <Send className={`w-4 h-4 ${verificationChannel === 'telegram' ? 'text-[#229ED9]' : ''}`} />
                <span>Telegram</span>
              </button>
            </div>

            {/* Target Input Section */}
            <div className="space-y-3 pt-1">
              {verificationChannel === 'email' ? (
                <div className="space-y-1.5">
                  <label htmlFor="reg-recovery-email" className="block text-xs font-semibold text-[#0F172A]">
                    Recovery Email Address
                  </label>
                  <input
                    id="reg-recovery-email"
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => {
                      setRecoveryEmail(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all font-medium"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="reg-phone-input" className="block text-xs font-semibold text-[#0F172A]">
                    {verificationChannel === 'whatsapp' ? 'WhatsApp Phone Number' : 'Telegram Phone Number'}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-white border border-[#CBD5E1] rounded-[10px] px-2.5 py-2.5 text-xs text-[#0F172A] outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all font-medium"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      id="reg-phone-input"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Phone number (e.g. 9876543210)"
                      className="flex-1 bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all font-medium"
                    />
                  </div>
                  {verificationChannel === 'telegram' && (
                    <p className="text-[11px] text-[#64748B] pt-0.5">
                      💡 Tip: Open{' '}
                      <a
                        href="https://t.me/eazzioMailOtp_bot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#229ED9] underline font-semibold"
                      >
                        @eazzioMailOtp_bot
                      </a>{' '}
                      in Telegram and click <b>Start</b> to receive your code directly.
                    </p>
                  )}
                </div>
              )}


              {/* Send / Resend Code Action */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={isLoading || cooldown > 0}
                  className="px-4 py-2 rounded-[8px] bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isLoading
                      ? 'Sending...'
                      : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : otpSent
                      ? 'Resend Code'
                      : 'Send Verification Code'}
                  </span>
                </button>

                {otpSent && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Code Dispatched
                  </span>
                )}
              </div>
            </div>

            {/* 6-Digit OTP Code Input Form */}
            {otpSent && (
              <form onSubmit={handleVerifyAndCreateAccount} className="space-y-4 pt-3 border-t border-[#F1F5F9] animate-in fade-in">
                <div className="space-y-1.5">
                  <label htmlFor="otp-input" className="block text-xs font-semibold text-[#0F172A]">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMessage(null);
                    }}
                    placeholder="• • • • • •"
                    className="w-full bg-[#F8FAFC] border-2 border-[#CBD5E1] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 rounded-[10px] px-4 py-3 text-center text-xl font-bold tracking-[8px] text-[#0F172A] placeholder-[#94A3B8] outline-none transition-all"
                    required
                    autoFocus
                  />
                  <p className="text-[11px] text-[#64748B] text-center">
                    Enter the 6-digit code received via {verificationChannel === 'whatsapp' ? 'WhatsApp' : verificationChannel === 'telegram' ? 'Telegram' : 'Email'}.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('password')}
                    className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 4}
                    className="px-6 py-2.5 rounded-[10px] bg-[#14B8A6] hover:bg-[#19B8A4] active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm shadow-sm shadow-[#14B8A6]/20 transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                  >
                    <span>{isLoading ? 'Verifying...' : 'Verify & Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {!otpSent && (
              <div className="pt-3 flex items-center justify-between border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setStep('password')}
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none rounded-[6px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Language & Privacy Links */}
      <div className="w-full max-w-[460px] mt-8 flex items-center justify-between text-xs text-[#64748B]">
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
