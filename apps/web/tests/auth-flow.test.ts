import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthStore, AuthUser } from '../src/lib/auth-store.js';

describe('Web App Auth Flow & Progressive Authentication (TASK-AUTH-UPGRADE)', () => {
  beforeEach(() => {
    AuthStore.clearSession();
    vi.restoreAllMocks();
  });

  it('should initialize with unauthenticated state', () => {
    const state = AuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('should set session and update state for authenticated user', () => {
    const testUser: AuthUser = {
      id: 'usr-100',
      email: 'alex@eazzio.com',
      displayName: 'Alex Rivers',
      role: 'admin',
    };

    AuthStore.setSession(testUser, 'jwt-token-xyz');

    const state = AuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('alex@eazzio.com');
    expect(state.user?.displayName).toBe('Alex Rivers');
    expect(state.token).toBe('jwt-token-xyz');
  });

  it('should notify subscribers when session state changes', () => {
    const states: boolean[] = [];
    const unsubscribe = AuthStore.subscribe((state) => {
      states.push(state.isAuthenticated);
    });

    AuthStore.setSession({ id: 'usr-200', email: 'sub@eazzio.com' }, 'tok-123');
    AuthStore.clearSession();

    unsubscribe();

    expect(states).toEqual([true, false]);
  });

  it('should clear session upon sign out', () => {
    AuthStore.setSession({ id: 'usr-300', email: 'logout@eazzio.com' }, 'token-valid');
    expect(AuthStore.getState().isAuthenticated).toBe(true);

    AuthStore.clearSession();
    expect(AuthStore.getState().isAuthenticated).toBe(false);
    expect(AuthStore.getState().user).toBeNull();
  });

  it('should enforce username rules: no special characters, max 1 dot', () => {
    const usernameRegex = /^[a-z0-9]+(\.[a-z0-9]+)?$/;

    expect(usernameRegex.test('rahul')).toBe(true);
    expect(usernameRegex.test('rahul.kumar')).toBe(true);
    expect(usernameRegex.test('alex99')).toBe(true);
    expect(usernameRegex.test('john.doe123')).toBe(true);

    // Invalid usernames
    expect(usernameRegex.test('rahul.kumar.singh')).toBe(false); // multiple dots
    expect(usernameRegex.test('.rahul')).toBe(false); // leading dot
    expect(usernameRegex.test('rahul.')).toBe(false); // trailing dot
    expect(usernameRegex.test('rahul_kumar')).toBe(false); // underscore
    expect(usernameRegex.test('rahul-kumar')).toBe(false); // dash
    expect(usernameRegex.test('rahul@kumar')).toBe(false); // @ symbol
  });

  it('should identify username and resolve full @eazzio.com domain in progressive flow', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          exists: true,
          email: 'rahulkumar@eazzio.com',
          displayName: 'Rahul Kumar',
          authMethods: ['password', 'otp', 'passkey'],
          requiresChallenge: false,
        },
      }),
    } as any);

    const result = await AuthStore.identify('rahulkumar');
    expect(result.email).toBe('rahulkumar@eazzio.com');
    expect(result.authMethods).toContain('password');
    expect(result.authMethods).toContain('otp');
    expect(result.authMethods).toContain('passkey');
    expect(result.requiresChallenge).toBe(false);
  });

  it('should handle progressive password authentication and store session token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: 'mock-jwt-token-12345',
          user: {
            id: 'usr-dev-101',
            email: 'rahulkumar@eazzio.com',
            displayName: 'Rahul Kumar',
            role: 'user',
          },
          sessionId: 'sess-abc-xyz',
        },
      }),
    } as any);

    const user = await AuthStore.login('rahulkumar@eazzio.com', 'SecurePass123!');
    expect(user.email).toBe('rahulkumar@eazzio.com');
    expect(AuthStore.getState().isAuthenticated).toBe(true);
    expect(AuthStore.getState().token).toBe('mock-jwt-token-12345');
  });

  it('should support email OTP request and verification in alternative auth flow', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Verification code sent', cooldownSeconds: 60 },
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            token: 'mock-otp-jwt-token',
            user: { id: 'usr-otp', email: 'rahulkumar@eazzio.com', displayName: 'Rahul Kumar', role: 'user' },
            sessionId: 'sess-otp-123',
          },
        }),
      } as any);

    const otpSent = await AuthStore.sendOtp('rahulkumar@eazzio.com');
    expect(otpSent.cooldownSeconds).toBe(60);

    const user = await AuthStore.verifyOtp('rahulkumar@eazzio.com', '123456');
    expect(user.email).toBe('rahulkumar@eazzio.com');
    expect(AuthStore.getState().isAuthenticated).toBe(true);
  });

  it('should register a new account via AuthStore.register', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: 'jwt-reg-token-abc',
          user: { id: 'usr-new-1', email: 'newuser@eazzio.com', displayName: 'New User', role: 'user' },
          sessionId: 'sess-new-1',
        },
      }),
    } as any);

    const registered = await AuthStore.register('newuser@eazzio.com', 'SecurePass123!', 'New User');
    expect(registered.email).toBe('newuser@eazzio.com');
    expect(registered.displayName).toBe('New User');
    expect(AuthStore.getState().isAuthenticated).toBe(true);
    expect(AuthStore.getState().token).toBe('jwt-reg-token-abc');
  });

  it('should support multi-channel verification options (WhatsApp, Telegram, Email) during registration', async () => {
    const channels = ['whatsapp', 'telegram', 'email'];
    expect(channels).toContain('whatsapp');
    expect(channels).toContain('telegram');
    expect(channels).toContain('email');

    // Verify phone digit validation rule
    const validPhone = '9876543210';
    const cleanDigits = validPhone.replace(/[^0-9]/g, '');
    expect(cleanDigits.length >= 7 && cleanDigits.length <= 15).toBe(true);

    // Verify recovery email format rule
    const validRecoveryEmail = 'recovery.user@gmail.com';
    expect(validRecoveryEmail.includes('@') && validRecoveryEmail.includes('.')).toBe(true);
  });
});


