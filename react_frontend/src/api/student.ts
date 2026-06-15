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

export interface CompletedCourse {
  id: string; course_id: string; course_name: string;
  credits: number; grade: string; semester: string;
}
export interface Registration {
  id: string; course_id: string; course_name: string;
  credits: number; status: 'pending' | 'approved' | 'rejected';
  grade: string | null; professor_name: string;
}
export interface StudentProfile {
  id: string; roll_number: string; name: string; email: string;
  department: string; year_of_study: number; cgpa: number;
  is_approved_for_login: number; created_at: string;
}
export interface ProfileResponse {
  success: boolean; message?: string;
  profile: StudentProfile;
  completed: CompletedCourse[];
  registrations: Registration[];
  stats: { completed_credits: number; minor_gpa: number };
}
export interface Course {
  id: string; name: string; credits: number; department: string;
  professor_name: string; description: string;
}
export interface CoursesResponse { success: boolean; courses: Course[]; pagination?: PaginationMetadata; }

export interface SelfReportedCourse {
  id: string;
  student_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  grade: string;
  year: string;
  semester: string;
  proof_url?: string;
  created_at?: string;
  updated_at?: string;
}
export interface SelfReportedResponse { success: boolean; courses?: SelfReportedCourse[]; course?: SelfReportedCourse; message?: string; }

export interface CatalogCourse {
  id: string;
  name: string;
  credits: number;
}
export async function getStudentCatalog(): Promise<{success: boolean, catalog?: CatalogCourse[], message?: string}> {
  const res = await fetch(`${BASE}/api/student/catalog`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function getStudentProfile(student_id: string): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/api/student/profile?student_id=${encodeURIComponent(student_id)}`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function getStudentCourses(page=1, limit=50, search='', sort='name', order='asc'): Promise<CoursesResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search, sort, order });
  const res = await fetch(`${BASE}/api/student/courses?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function registerCourse(student_id: string, course_id: string) {
  const res = await fetch(`${BASE}/api/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ student_id, course_id }),
  });
  return safeJson(res);
}

// ── Self-Reported Courses ──────────────────────────────────────────────────────

export async function getSelfReportedCourses(student_id: string): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported?student_id=${encodeURIComponent(student_id)}`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}

export async function addSelfReportedCourse(data: Omit<SelfReportedCourse, 'id' | 'created_at' | 'updated_at'>): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return safeJson(res);
}

export async function updateSelfReportedCourse(id: string, student_id: string, data: Omit<SelfReportedCourse, 'id' | 'student_id' | 'created_at' | 'updated_at'>): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ student_id, ...data }),
  });
  return safeJson(res);
}

export async function deleteSelfReportedCourse(id: string, student_id: string): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ student_id }),
  });
  return safeJson(res);
}

export async function updateStudentCgpa(student_id: string, cgpa: number): Promise<{success: boolean, message?: string}> {
  const res = await fetch(`${BASE}/api/student/update-cgpa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ student_id, cgpa }),
  });
  return safeJson(res);
}

export interface UpcomingCourse {
  id: string;
  course_code: string;
  course_name: string;
  expected_start_date: string;
  description: string;
  professor_name: string;
}

export async function getUpcomingCourses(): Promise<{ success: boolean; courses: UpcomingCourse[] }> {
  const res = await fetch(`${BASE}/api/student/upcoming-courses`, {
    headers: getAuthHeaders(),
  });
  return safeJson(res);
}
