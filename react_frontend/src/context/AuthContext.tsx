import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Role, AdminUser, ProfessorUser, StudentUser } from '../api/auth';
import { fetchSession, logoutSession } from '../api/auth';

type AnyUser = AdminUser | ProfessorUser | StudentUser;

interface AuthState {
  user:       AnyUser | null;
  role:       Role | null;
  isLoggedIn: boolean;
  /** True while the initial session check is in flight — prevents routing flicker. */
  isLoading:  boolean;
  login:      (user: AnyUser, role: Role) => void;
  logout:     () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, role: null, isLoggedIn: false, isLoading: true,
  login: () => {}, logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AnyUser | null>(null);
  const [role,      setRole]      = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: verify the session against the backend (reads the HttpOnly cookie).
  // localStorage is used only as a UI hint — the backend JWT is the source of truth.
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetchSession();
        if (res.success && res.user && res.role) {
          setUser(res.user);
          setRole(res.role);
          // Mirror to localStorage so pages that do a quick optimistic read
          // (e.g. getAuthHeaders) still work without an extra round-trip.
          localStorage.setItem('ap_session', JSON.stringify({ user: res.user, role: res.role }));
        } else {
          // Cookie is absent or expired — clear any stale localStorage data
          setUser(null);
          setRole(null);
          localStorage.removeItem('ap_session');
        }
      } catch {
        // Network error: treat as unauthenticated
        setUser(null);
        setRole(null);
        localStorage.removeItem('ap_session');
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  /** Called by OAuthCallback after /api/auth/session succeeds. */
  const login = useCallback((u: AnyUser, r: Role) => {
    setUser(u);
    setRole(r);
    localStorage.setItem('ap_session', JSON.stringify({ user: u, role: r }));
  }, []);

  /** Calls the backend logout endpoint (clears the HttpOnly cookie) then resets state. */
  const logout = useCallback(async () => {
    try { await logoutSession(); } catch { /* ignore network errors on logout */ }
    setUser(null);
    setRole(null);
    localStorage.removeItem('ap_session');
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isLoggedIn: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export type { AnyUser, Role };
