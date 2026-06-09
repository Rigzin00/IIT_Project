import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Role, AdminUser, ProfessorUser, StudentUser } from '../api/auth';

type AnyUser = AdminUser | ProfessorUser | StudentUser;

interface AuthState {
  user: AnyUser | null;
  role: Role | null;
  isLoggedIn: boolean;
  login: (user: AnyUser, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null, role: null, isLoggedIn: false,
  login: () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AnyUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('ap_session');
      if (saved) {
        const { user, role } = JSON.parse(saved);
        setUser(user); setRole(role);
      }
    } catch { /* ignore */ }
  }, []);

  const login = (u: AnyUser, r: Role) => {
    setUser(u); setRole(r);
    sessionStorage.setItem('ap_session', JSON.stringify({ user: u, role: r }));
  };

  const logout = () => {
    setUser(null); setRole(null);
    sessionStorage.removeItem('ap_session');
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export type { AnyUser, Role };
