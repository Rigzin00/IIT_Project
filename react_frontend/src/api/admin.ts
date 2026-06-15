import type { PaginationMetadata } from './types';
import BASE from './config';
import getAuthHeaders from './headers';

// Auto-logout on 401: clears session and reloads to login page
async function safeJson(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('ap_session');
    window.location.reload();
    return { success: false, message: 'Session expired. Please log in again.' };
  }
  return res.json();
}

export interface Student {
  id: string; roll_number: string; name: string; email: string;
  department: string; year_of_study: number; cgpa: number;
  is_approved_for_login: number; created_at: string;
}
export interface StudentsResponse { success: boolean; students: Student[]; pagination?: PaginationMetadata; message?: string; }
export interface PolicyResponse { success: boolean; min_eligible_year: number; max_eligible_year: number; active_year: string; }

export async function getAdminStudents(page=1, limit=50, search='', sort='name', order='asc'): Promise<StudentsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search, sort, order });
  const res = await fetch(`${BASE}/api/admin/students?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function createStudent(data: {
  roll_number: string; name: string; email: string;
  department: string; year_of_study: number; cgpa?: number;
}) {
  const res = await fetch(`${BASE}/api/admin/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return safeJson(res);
}

export async function deleteStudent(student_id: string) {
  const res = await fetch(`${BASE}/api/admin/students/${encodeURIComponent(student_id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function getPolicy(): Promise<PolicyResponse> {
  const res = await fetch(`${BASE}/api/admin/policy`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function setPolicy(min_eligible_year: number, max_eligible_year: number, active_year: string) {
  const res = await fetch(`${BASE}/api/admin/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ min_eligible_year, max_eligible_year, active_year }),
  });
  return safeJson(res);
}

export async function createCourse(data: {
  course_code: string; course_name: string; credits: number; professor: string; description: string; is_minor_eligible: boolean;
}) {
  const res = await fetch(`${BASE}/api/admin/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return safeJson(res);
}

export async function createUpcomingCourse(data: {
  course_code: string; course_name: string; start_date: string; professor: string; description: string;
}) {
  const res = await fetch(`${BASE}/api/admin/upcoming-courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return safeJson(res);
}
