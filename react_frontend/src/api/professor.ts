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

export interface ProfCourse {
  id: string; name: string; credits: number; department: string;
  professor_id: string; is_minor_eligible: number; description: string;
}
export interface ProfDashboardResponse {
  success: boolean; message?: string;
  professor: { id: string; name: string; email: string; department: string; created_at: string; };
  courses: ProfCourse[];
}
export interface SelfReportedItem {
  id: string; student_id: string;
  course_code: string; course_name: string;
  credits: number; grade: string; year: string; semester: string;
  proof_url?: string;
}
export interface StudentRegistration {
  registration_id: string; status: 'pending' | 'approved' | 'rejected';
  grade: string | null; course_id: string; course_name: string; credits: number;
  student_id: string; student_name: string; roll_number: string;
  student_email: string; student_department: string; year_of_study: number;
  cgpa: number; completed_courses_ids: string[]; completed_courses_list: string[];
  self_reported_courses: SelfReportedItem[];
}
export interface RegistrationsResponse {
  success: boolean; message?: string; registrations: StudentRegistration[]; pagination?: PaginationMetadata;
}

export async function getProfessorDashboard(professor_id: string): Promise<ProfDashboardResponse> {
  const res = await fetch(`${BASE}/api/professor/dashboard?professor_id=${encodeURIComponent(professor_id)}`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function getProfessorRegistrations(professor_id: string, page=1, limit=50, search='', sort='id', order='desc'): Promise<RegistrationsResponse> {
  const params = new URLSearchParams({ professor_id, page: String(page), limit: String(limit), search, sort, order });
  const res = await fetch(`${BASE}/api/professor/registrations?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function profAction(registration_id: string, status: 'approved' | 'rejected') {
  const res = await fetch(`${BASE}/api/professor/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ registration_id, status }),
  });
  return safeJson(res);
}

export async function profGrade(registration_id: string, grade: string) {
  const res = await fetch(`${BASE}/api/professor/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ registration_id, grade }),
  });
  return safeJson(res);
}

export async function updateCourse(course_id: string, data: {
  professor_id: string; name: string; description: string; credits: number; department: string; is_minor_eligible: boolean;
}) {
  const res = await fetch(`${BASE}/api/professor/courses/${encodeURIComponent(course_id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return safeJson(res);
}
