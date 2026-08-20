export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export class AuthStore {
  private static state: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  private static listeners = new Set<(state: AuthState) => void>();

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

  public static setSession(user: AuthUser, token: string): void {
    this.setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('eazzio_token', token);
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
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('eazzio_token');
        localStorage.removeItem('eazzio_user');
      } catch {
        // ignore
      }
    }
  }

  public static initFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('eazzio_token');
      const userStr = localStorage.getItem('eazzio_user');
      if (token && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        this.setState({
          user,
          token,
          isAuthenticated: true,
        });
      }
    } catch {
      this.clearSession();
    }
  }
}
