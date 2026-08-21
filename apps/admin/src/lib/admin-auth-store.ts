import { AdminUser, AdminRole, AdminSession } from '../types/admin';

export interface AdminAuthState {
  session: AdminSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthListener = (state: AdminAuthState) => void;

class AdminAuthStoreManager {
  private state: AdminAuthState = {
    session: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: Set<AuthListener> = new Set();
  private readonly STORAGE_KEY = 'eazzio_admin_session';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initFromStorage();
    }
  }

  public initFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const session: AdminSession = JSON.parse(stored);
        if (session.expiresAt > Date.now()) {
          this.state = {
            session,
            isAuthenticated: true,
            isLoading: false,
          };
          this.notify();
          return;
        }
      }
    } catch {
      // Ignore parse error
    }

    this.state = {
      session: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notify();
  }

  public setSession(session: AdminSession): void {
    this.state = {
      session,
      isAuthenticated: true,
      isLoading: false,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    }
    this.notify();
  }

  public clearSession(): void {
    this.state = {
      session: null,
      isAuthenticated: false,
      isLoading: false,
    };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.notify();
  }

  public getState(): AdminAuthState {
    return this.state;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  public static isAuthorized(user: AdminUser | null, allowedRoles: AdminRole[]): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }

  public static hasPermission(role: AdminRole, permission: 'manage_all_orgs' | 'manage_org' | 'view_audit_logs' | 'manage_domains'): boolean {
    if (role === 'PlatformAdmin') return true;
    if (role === 'OrgAdmin') {
      return permission !== 'manage_all_orgs';
    }
    return false;
  }
}

export const AdminAuthStore = new AdminAuthStoreManager();
