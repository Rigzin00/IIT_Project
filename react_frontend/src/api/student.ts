import type { PaginationMetadata } from './types';
const BASE = 'http://127.0.0.1:5000';

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

export async function getStudentProfile(student_id: string): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/api/student/profile?student_id=${encodeURIComponent(student_id)}`);
  return res.json();
}

export async function getStudentCourses(page=1, limit=50, search='', sort='name', order='asc'): Promise<CoursesResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search, sort, order });
  const res = await fetch(`${BASE}/api/student/courses?${params.toString()}`);
  return res.json();
}

export async function registerCourse(student_id: string, course_id: string) {
  const res = await fetch(`${BASE}/api/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, course_id }),
  });
  return res.json();
}

// ── Self-Reported Courses ──────────────────────────────────────────────────────

export async function getSelfReportedCourses(student_id: string): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported?student_id=${encodeURIComponent(student_id)}`);
  return res.json();
}

export async function addSelfReportedCourse(data: Omit<SelfReportedCourse, 'id' | 'created_at' | 'updated_at'>): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSelfReportedCourse(id: string, student_id: string, data: Omit<SelfReportedCourse, 'id' | 'student_id' | 'created_at' | 'updated_at'>): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, ...data }),
  });
  return res.json();
}

export async function deleteSelfReportedCourse(id: string, student_id: string): Promise<SelfReportedResponse> {
  const res = await fetch(`${BASE}/api/student/self-reported/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id }),
  });
  return res.json();
}

