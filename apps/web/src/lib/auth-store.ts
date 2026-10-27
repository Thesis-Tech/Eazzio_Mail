export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  phone?: string;
  isPhoneVerified?: boolean;
  role?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface IdentifyResult {
  exists: boolean;
  email: string;
  displayName: string;
  authMethods: string[];
  requiresChallenge: boolean;
  challengeType?: string | null;
}

export class AuthStore {
  private static state: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  private static listeners = new Set<(state: AuthState) => void>();
  private static isRefreshing = false;
  private static refreshSubscribers: Array<(token: string | null) => void> = [];

  public static getState(): AuthState {
    return this.state;
  }

  public static subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static setState(partial: Partial<AuthState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public static setSession(user: AuthUser, token: string, refreshToken?: string | null): void {
    this.setState({
      user,
      token,
      refreshToken: refreshToken || this.state.refreshToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('eazzio_token', token);
        if (refreshToken) {
          localStorage.setItem('eazzio_refresh_token', refreshToken);
        }
        localStorage.setItem('eazzio_user', JSON.stringify(user));
      } catch {
        // ignore localStorage errors in non-browser environments
      }
    }
  }

  public static clearSession(): void {
    this.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('eazzio_token');
        localStorage.removeItem('eazzio_refresh_token');
        localStorage.removeItem('eazzio_user');
      } catch {
        // ignore
      }
    }
  }

  public static initFromStorage(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const token = localStorage.getItem('eazzio_token');
      const refreshToken = localStorage.getItem('eazzio_refresh_token');
      const userStr = localStorage.getItem('eazzio_user');
      if (token && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        this.setState({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }
    } catch {
      this.clearSession();
    }
    return false;
  }

  public static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.state.refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('eazzio_refresh_token') : null);
    if (!refreshToken) {
      this.clearSession();
      return null;
    }

    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token) => resolve(token));
      });
    }

    this.isRefreshing = true;

    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        this.clearSession();
        this.refreshSubscribers.forEach((cb) => cb(null));
        this.refreshSubscribers = [];
        this.isRefreshing = false;
        return null;
      }

      const { token, refreshToken: newRefreshToken } = json.data;
      if (this.state.user) {
        this.setSession(this.state.user, token, newRefreshToken);
      }

      this.refreshSubscribers.forEach((cb) => cb(token));
      this.refreshSubscribers = [];
      this.isRefreshing = false;
      return token;
    } catch (err) {
      this.clearSession();
      this.refreshSubscribers.forEach((cb) => cb(null));
      this.refreshSubscribers = [];
      this.isRefreshing = false;
      return null;
    }
  }

  public static async fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    let token = this.state.token;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('eazzio_token');
    }

    const headers = new Headers(init.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (this.state.user?.email && !headers.has('x-user-email')) {
      headers.set('x-user-email', this.state.user.email);
    }

    const response = await fetch(input, { ...init, headers });

    // Handle 401 token expiry by refreshing transparently
    if (response.status === 401) {
      const clone = response.clone();
      const body = await clone.json().catch(() => ({}));
      if (body?.error?.code === 'TOKEN_EXPIRED' || body?.message?.includes('expired')) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
          return fetch(input, { ...init, headers });
        }
      }
    }

    return response;
  }

  // --- Backend API Integration Methods ---

  public static async identify(identifier: string): Promise<IdentifyResult> {
    const res = await fetch('/api/v1/auth/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to identify user');
    }

    return json.data;
  }

  public static async login(
    identifier: string,
    password: string,
    challengeResponse?: string
  ): Promise<AuthUser> {
    this.setState({ isLoading: true, error: null });
    const trimmed = identifier.trim().toLowerCase();
    const normalized = trimmed.includes('@') ? trimmed : `${trimmed.replace(/[^a-z0-9.]/g, '')}@eazzio.com`;

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: normalized, password, challengeResponse }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const message = json.error?.message || json.message || 'Invalid email or password';
        this.setState({ isLoading: false, error: message });
        throw new Error(message);
      }

      const { user, token, refreshToken } = json.data;
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role || 'user',
      };

      this.setSession(authUser, token, refreshToken);
      return authUser;
    } catch (err: any) {
      this.setState({ isLoading: false, error: err.message });
      throw err;
    }
  }

  public static async sendOtp(identifier: string): Promise<{ message: string; cooldownSeconds: number; devCode?: string }> {
    const res = await fetch('/api/v1/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to send verification code');
    }
    return json.data;
  }

  public static async verifyOtp(identifier: string, code: string): Promise<AuthUser> {
    this.setState({ isLoading: true, error: null });
    const res = await fetch('/api/v1/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, code }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const message = json.error?.message || 'Invalid verification code';
      this.setState({ isLoading: false, error: message });
      throw new Error(message);
    }

    const { user, token, refreshToken } = json.data;
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role || 'user',
    };

    this.setSession(authUser, token, refreshToken);
    return authUser;
  }

  public static async forgotPassword(
    identifier: string,
    channel?: 'email' | 'telegram' | 'whatsapp',
    recoveryTarget?: string,
  ): Promise<{ message: string; devToken?: string }> {
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, channel, recoveryTarget }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to initiate password recovery');
    }
    return json.data;
  }

  public static async resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to reset password');
    }
    return json.data;
  }

  public static async register(email: string, password: string, displayName?: string): Promise<AuthUser> {
    this.setState({ isLoading: true, error: null });
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const message = json.error?.message || 'Registration failed';
      this.setState({ isLoading: false, error: message });
      throw new Error(message);
    }

    const { user, token, refreshToken } = json.data;
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role || 'user',
    };

    this.setSession(authUser, token, refreshToken);
    return authUser;
  }

  public static async logout(): Promise<void> {
    const token = this.state.token;
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore network failure during logout
      }
    }
    this.clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
