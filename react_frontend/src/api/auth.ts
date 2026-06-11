import BASE from './config';

export type Role = 'admin' | 'professor' | 'student';

export interface AdminUser  { name: string; email: string; department: string; }
export interface ProfessorUser { id: string; name: string; email: string; department: string; created_at: string; }
export interface StudentUser   {
  id: string; roll_number: string; name: string; email: string;
  department: string; year_of_study: number; cgpa: number;
  is_approved_for_login: number; created_at: string;
}

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
