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
