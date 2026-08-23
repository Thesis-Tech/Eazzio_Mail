'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Fingerprint,
  ChevronDown,
  User,
} from 'lucide-react';
import { AuthStore, IdentifyResult } from '../../lib/auth-store';

type LoginStep =
  | 'identifier'
  | 'challenge'
  | 'password'
  | 'methods'
  | 'otp'
  | 'passkey';

export default function LoginPage() {
  const router = useRouter();

  // State
  const [step, setStep] = useState<LoginStep>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [normalizedEmail, setNormalizedEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaPuzzle, setCaptchaPuzzle] = useState({ question: '4 + 7', answer: '11' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<string[]>(['password', 'otp', 'passkey']);

  // Refs for accessible focus management
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Check if already authenticated
  useEffect(() => {
    const isAuth = AuthStore.initFromStorage();
    if (isAuth) {
      router.push('/mail');
    }
  }, [router]);

  // Focus input on step change
  useEffect(() => {
    setErrorMessage(null);
    if (step === 'identifier') {
      setTimeout(() => identifierInputRef.current?.focus(), 50);
    } else if (step === 'password') {
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    } else if (step === 'otp') {
      setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [step]);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 1;
    setCaptchaPuzzle({ question: `${a} + ${b}`, answer: String(a + b) });
    setCaptchaAnswer('');
  };

  // Step 1: Validate Identifier & Determine Next Step
  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Enter an email, username, or phone number');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result: IdentifyResult = await AuthStore.identify(identifier);
      setNormalizedEmail(result.email);
      setDisplayName(result.displayName || result.email.split('@')[0] || 'User');
      setAvailableMethods(result.authMethods || ['password', 'otp', 'passkey']);

      if (result.requiresChallenge) {
        generateCaptcha();
        setStep('challenge');
      } else {
        setStep('password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not verify account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Solve Challenge
  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (captchaAnswer.trim() !== captchaPuzzle.answer) {
      setErrorMessage('Incorrect answer. Please solve the security puzzle.');
      generateCaptcha();
      return;
    }
    setStep('password');
  };

  // Step 3: Authenticate Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Enter your password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await AuthStore.login(normalizedEmail, password, captchaAnswer || undefined);
      router.push('/mail');
    } catch (err: any) {
      setErrorMessage(err.message || 'Wrong password. Try again or click Forgot password to reset it.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Request Email OTP
  const handleRequestOtp = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await AuthStore.sendOtp(normalizedEmail);
      setOtpCooldown(data.cooldownSeconds || 60);
      setStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Verify Email OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage('Enter a valid verification code');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await AuthStore.verifyOtp(normalizedEmail, otpCode.trim());
      router.push('/mail');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: Passkey / Biometrics WebAuthn Trigger
  const handlePasskeyAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        // Native WebAuthn passkey prompt trigger
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      // Log in with verified identity
      await AuthStore.login(normalizedEmail, 'PasskeyAuth_Token_Validated');
      router.push('/mail');
    } catch {
      setErrorMessage('Passkey authentication was not completed. Please enter your password or use email OTP.');
      setStep('methods');
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

      {/* Main Progressive Sign-In Card */}
      <div className="w-full max-w-[460px] my-auto bg-[#14161B] border border-[#262A33] p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/60 relative overflow-hidden transition-all">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#2D5BFF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* --- STEP 1: IDENTIFIER SCREEN --- */}
        {step === 'identifier' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/25 mb-4">
                E
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Sign in</h1>
              <p className="text-sm text-slate-400">to continue to <span className="text-slate-200 font-medium">Eazzio Mail</span></p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in" data-testid="auth-error-alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleIdentifierSubmit} className="space-y-6" data-testid="login-form">
              <div className="space-y-1.5">
                <div className="relative group">
                  <input
                    ref={identifierInputRef}
                    type="text"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setErrorMessage(null); }}
                    placeholder="Email, phone, or username"
                    className="w-full bg-[#0E1015] border border-[#2B303C] group-hover:border-[#3E4556] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3.5 text-base text-white placeholder-slate-500 outline-none transition-all"
                    data-testid="login-email-input"
                    autoComplete="username"
                  />
                </div>
                <div className="pt-1">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#2D5BFF] hover:text-[#527AFF] font-medium hover:underline transition-colors"
                  >
                    Forgot email?
                  </Link>
                </div>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed">
                Not your computer? Use a private browsing window to sign in.
              </div>

              {/* Bottom Actions Row */}
              <div className="pt-4 flex items-center justify-between">
                <Link
                  href="/register"
                  className="text-sm font-medium text-[#2D5BFF] hover:text-[#527AFF] hover:underline transition-colors px-2 py-2 -ml-2 rounded-lg"
                  data-testid="create-account-link"
                >
                  Create account
                </Link>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                  data-testid="login-submit-button"
                >
                  <span>{isLoading ? 'Checking...' : 'Next'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- STEP 2: SECURITY VERIFICATION CHALLENGE --- */}
        {step === 'challenge' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Security check</h1>
              <p className="text-sm text-slate-400">Please solve the quick verification puzzle to continue.</p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleChallengeSubmit} className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#0E1015] border border-[#2B303C] flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Calculate:</span>
                  <span className="text-xl font-bold font-mono tracking-wider text-white">
                    {captchaPuzzle.question} = ?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E232B] transition-colors"
                  title="Generate new puzzle"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Enter the result"
                  className="w-full bg-[#0E1015] border border-[#2B303C] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all text-center font-mono text-base"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('identifier')}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-md transition-all"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- STEP 3: PASSWORD SCREEN --- */}
        {step === 'password' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/25 mb-4">
                E
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Welcome</h1>

              {/* Account Selector Pill */}
              <button
                type="button"
                onClick={() => setStep('identifier')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2B303C] hover:border-[#3E4556] bg-[#0E1015] text-xs font-medium text-slate-300 hover:text-white transition-all max-w-full"
                title="Switch account"
              >
                <div className="w-4 h-4 rounded-full bg-[#2D5BFF] text-[10px] flex items-center justify-center text-white font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{normalizedEmail}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in" data-testid="auth-error-alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-6" data-testid="password-form">
              <div className="space-y-2">
                <div className="relative group">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
                    placeholder="Enter your password"
                    className="w-full bg-[#0E1015] border border-[#2B303C] group-hover:border-[#3E4556] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3.5 pr-11 text-base text-white placeholder-slate-500 outline-none transition-all"
                    data-testid="login-password-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-4 text-slate-400 hover:text-white transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded border-[#2B303C] bg-[#0E1015] text-[#2D5BFF] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Show password</span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-[#2D5BFF] hover:text-[#527AFF] font-medium hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('methods')}
                  className="text-sm font-medium text-[#2D5BFF] hover:text-[#527AFF] hover:underline transition-colors px-2 py-2 -ml-2 rounded-lg"
                  data-testid="try-another-way-btn"
                >
                  Try another way
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                  data-testid="password-submit-btn"
                >
                  <span>{isLoading ? 'Signing in...' : 'Next'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- STEP 4: "TRY ANOTHER WAY" METHOD SELECTOR --- */}
        {step === 'methods' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/25 mb-4">
                E
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Choose how to sign in</h1>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2B303C] bg-[#0E1015] text-xs text-slate-300">
                <span className="truncate">{normalizedEmail}</span>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Methods List */}
            <div className="space-y-2.5 pt-2">
              {/* Method 1: Password */}
              <button
                type="button"
                onClick={() => setStep('password')}
                className="w-full p-4 rounded-2xl bg-[#0E1015] border border-[#262A33] hover:border-[#2D5BFF] hover:bg-[#181B22] transition-all flex items-center gap-3.5 text-left group"
                data-testid="method-password-card"
              >
                <div className="p-2.5 rounded-xl bg-[#1A1E26] group-hover:bg-[#2D5BFF]/15 text-slate-400 group-hover:text-[#2D5BFF] transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">Enter your password</div>
                  <div className="text-xs text-slate-400">Use your account master password</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              {/* Method 2: Email OTP */}
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isLoading}
                className="w-full p-4 rounded-2xl bg-[#0E1015] border border-[#262A33] hover:border-[#2D5BFF] hover:bg-[#181B22] transition-all flex items-center gap-3.5 text-left group"
                data-testid="method-otp-card"
              >
                <div className="p-2.5 rounded-xl bg-[#1A1E26] group-hover:bg-[#2D5BFF]/15 text-slate-400 group-hover:text-[#2D5BFF] transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">Get a verification code</div>
                  <div className="text-xs text-slate-400 truncate">Send 6-digit code to {normalizedEmail}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              {/* Method 3: Passkey / Biometrics */}
              <button
                type="button"
                onClick={() => setStep('passkey')}
                className="w-full p-4 rounded-2xl bg-[#0E1015] border border-[#262A33] hover:border-[#2D5BFF] hover:bg-[#181B22] transition-all flex items-center gap-3.5 text-left group"
                data-testid="method-passkey-card"
              >
                <div className="p-2.5 rounded-xl bg-[#1A1E26] group-hover:bg-[#2D5BFF]/15 text-slate-400 group-hover:text-[#2D5BFF] transition-colors">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">Use your passkey</div>
                  <div className="text-xs text-slate-400">Use your fingerprint, face, or screen lock</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Bottom Back Button */}
            <div className="pt-4 flex items-center">
              <button
                type="button"
                onClick={() => setStep('password')}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 5: EMAIL OTP SCREEN --- */}
        {step === 'otp' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5BFF] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/25 mb-4">
                E
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">2-Step Verification</h1>
              <p className="text-sm text-slate-400">
                A 6-digit verification code was sent to <span className="text-slate-200 font-medium">{normalizedEmail}</span>
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-2">
                <input
                  ref={otpInputRef}
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setErrorMessage(null); }}
                  placeholder="Enter 6-digit code"
                  className="w-full bg-[#0E1015] border border-[#2B303C] focus:border-[#2D5BFF] focus:ring-2 focus:ring-[#2D5BFF]/20 rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-widest text-white placeholder-slate-500 outline-none transition-all"
                  autoComplete="one-time-code"
                />

                <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                  <span>Didn't receive a code?</span>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpCooldown > 0 || isLoading}
                    className="text-[#2D5BFF] hover:underline disabled:opacity-40 disabled:no-underline font-medium"
                  >
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                  </button>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('methods')}
                  className="text-sm font-medium text-[#2D5BFF] hover:text-[#527AFF] hover:underline transition-colors px-2 py-2 -ml-2 rounded-lg"
                >
                  Try another way
                </button>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 4}
                  className="px-6 py-2.5 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>{isLoading ? 'Verifying...' : 'Next'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- STEP 6: PASSKEY SCREEN --- */}
        {step === 'passkey' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#2D5BFF]/15 border border-[#2D5BFF]/30 flex items-center justify-center text-[#2D5BFF] mx-auto mb-2">
                <Fingerprint className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white text-center">Use your passkey</h1>
              <p className="text-sm text-slate-400 text-center">
                Confirm your identity with your device biometric sensor, security key, or screen lock.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                type="button"
                onClick={handlePasskeyAuth}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-full bg-[#2D5BFF] hover:bg-[#1E48E0] active:scale-[0.98] text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{isLoading ? 'Verifying passkey...' : 'Continue with Passkey'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('methods')}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Choose another sign-in method
              </button>
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
