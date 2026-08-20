import { describe, it, expect, beforeEach } from 'vitest';
import { AuthStore, AuthUser } from '../src/lib/auth-store.js';

describe('Web App Auth Flow & Session Management (TASK-015)', () => {
  beforeEach(() => {
    AuthStore.clearSession();
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
});
