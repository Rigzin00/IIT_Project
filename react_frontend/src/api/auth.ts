import BASE from './config';

export type Role = 'admin' | 'professor' | 'student';

export interface AdminUser    { name: string; email: string; department: string; }
export interface ProfessorUser { id: string; name: string; email: string; department: string; created_at: string; }
export interface StudentUser   {
  id: string; roll_number: string; name: string; email: string;
  department: string; year_of_study: number; cgpa: number;
  is_approved_for_login: number; created_at: string;
}

export interface SessionResponse {
  success: boolean;
  role?: Role;
  user?: AdminUser | ProfessorUser | StudentUser;
  message?: string;
}

/**
 * Validate the HttpOnly JWT cookie and return the authenticated user + role.
 * Must be called with credentials: 'include' so the browser sends the cookie.
 * Used by:
 *  - OAuthCallback page (after IIT Delhi redirects back)
 *  - AuthContext on app boot (to restore a live server-side session)
 */
export async function fetchSession(): Promise<SessionResponse> {
  const res = await fetch(`${BASE}/api/auth/session`, {
    method: 'GET',
    credentials: 'include',   // <-- sends the HttpOnly cookie automatically
  });
  if (!res.ok && res.status !== 401 && res.status !== 403) {
    throw new Error(`Session check failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Call the backend logout endpoint, which clears the HttpOnly JWT cookie.
 * The frontend AuthContext then clears its own in-memory + localStorage state.
 */
export async function logoutSession(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// ── Dev-only mock login (disabled in production by the backend) ────────────────
// Kept for local curl / Postman testing.  Not called from the UI in production.
export interface LoginResponse {
  success: boolean;
  role?: Role;
  user?: AdminUser | ProfessorUser | StudentUser;
  message?: string;
}

export async function login(email: string, role: Role): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  return res.json();
}
