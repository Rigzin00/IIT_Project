import type { PaginationMetadata } from './types';
const BASE = 'http://127.0.0.1:5000';

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
  const res = await fetch(`${BASE}/api/professor/dashboard?professor_id=${encodeURIComponent(professor_id)}`);
  return res.json();
}

export async function getProfessorRegistrations(professor_id: string, page=1, limit=50, search='', sort='id', order='desc'): Promise<RegistrationsResponse> {
  const params = new URLSearchParams({ professor_id, page: String(page), limit: String(limit), search, sort, order });
  const res = await fetch(`${BASE}/api/professor/registrations?${params.toString()}`);
  return res.json();
}

export async function profAction(registration_id: string, status: 'approved' | 'rejected') {
  const res = await fetch(`${BASE}/api/professor/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registration_id, status }),
  });
  return res.json();
}

export async function profGrade(registration_id: string, grade: string) {
  const res = await fetch(`${BASE}/api/professor/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registration_id, grade }),
  });
  return res.json();
}
