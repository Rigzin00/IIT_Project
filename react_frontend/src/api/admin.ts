import type { PaginationMetadata } from './types';
const BASE = 'http://127.0.0.1:5000';

export interface Student {
  id: string; roll_number: string; name: string; email: string;
  department: string; year_of_study: number; cgpa: number;
  is_approved_for_login: number; created_at: string;
}
export interface StudentsResponse { success: boolean; students: Student[]; pagination?: PaginationMetadata; message?: string; }
export interface PolicyResponse { success: boolean; min_eligible_year: number; max_eligible_year: number; }

export async function getAdminStudents(page=1, limit=50, search='', sort='name', order='asc'): Promise<StudentsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search, sort, order });
  const res = await fetch(`${BASE}/api/admin/students?${params.toString()}`);
  return res.json();
}

export async function createStudent(data: {
  roll_number: string; name: string; email: string;
  department: string; year_of_study: number; cgpa?: number;
}) {
  const res = await fetch(`${BASE}/api/admin/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteStudent(student_id: string) {
  const res = await fetch(`${BASE}/api/admin/students/${encodeURIComponent(student_id)}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function getPolicy(): Promise<PolicyResponse> {
  const res = await fetch(`${BASE}/api/admin/policy`);
  return res.json();
}

export async function setPolicy(min_eligible_year: number, max_eligible_year: number) {
  const res = await fetch(`${BASE}/api/admin/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ min_eligible_year, max_eligible_year }),
  });
  return res.json();
}
