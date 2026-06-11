import os
import uuid
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(">>> Database Interface: SUPABASE_URL or SUPABASE_KEY is missing in .env <<<")

try:
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(">>> Database Interface: Connected to Supabase Cloud Database! <<<")
except Exception as e:
    raise Exception(f">>> Database Interface: Failed to connect to Supabase ({e}) <<<")


class SupabaseAdapter:
    def __init__(self, client):
        self.client = client

    def get_student_by_email(self, email):
        res = self.client.table("students").select("*").eq("email", email.lower().strip()).execute()
        return res.data[0] if res.data else None

    def get_professor_by_email(self, email):
        res = self.client.table("professors").select("*").eq("email", email.lower().strip()).execute()
        return res.data[0] if res.data else None

    def get_system_settings(self):
        res = self.client.table("system_settings").select("key, value").execute()
        return {row['key']: row['value'] for row in res.data}

    def update_system_settings(self, min_year, max_year):
        self.client.table("system_settings").upsert({"key": "min_eligible_year", "value": str(min_year)}).execute()
        self.client.table("system_settings").upsert({"key": "max_eligible_year", "value": str(max_year)}).execute()
        return True

    def get_student_profile(self, student_id):
        res = self.client.table("students").select("*").eq("id", student_id).execute()
        return res.data[0] if res.data else None

    def get_student_completed_courses(self, student_id):
        res = self.client.table("completed_courses").select("id, course_id, grade, semester, courses(name, credits)").eq("student_id", student_id).execute()
        
        flat_list = []
        for row in res.data:
            course_info = row.get("courses", {}) or {}
            flat_list.append({
                "id": row["id"],
                "course_id": row["course_id"],
                "course_name": course_info.get("name", "Unknown Course"),
                "credits": course_info.get("credits", 3),
                "grade": row["grade"],
                "semester": row["semester"]
            })
        return flat_list

    def get_student_registrations(self, student_id):
        res = self.client.table("registrations").select("id, course_id, status, grade, courses(name, credits, professors(name))").eq("student_id", student_id).execute()
        
        flat_list = []
        for row in res.data:
            course_info = row.get("courses", {}) or {}
            prof_info = course_info.get("professors", {}) or {}
            flat_list.append({
                "id": row["id"],
                "course_id": row["course_id"],
                "course_name": course_info.get("name", "Unknown Course"),
                "credits": course_info.get("credits", 3),
                "status": row["status"],
                "grade": row["grade"],
                "professor_name": prof_info.get("name", "TBA")
            })
        return flat_list

    def get_courses_for_pre_registration(self, page=1, limit=50, search="", sort="name", order="asc"):
        query = self.client.table("courses").select("id, name, credits, department, description, professors(name)", count="exact").eq("is_minor_eligible", True)
        
        if search:
            p_res = self.client.table("professors").select("id").ilike("name", f"%{search}%").execute()
            matched_p_ids = [r['id'] for r in p_res.data]
            
            or_conds = [f"name.ilike.%{search}%", f"department.ilike.%{search}%", f"description.ilike.%{search}%"]
            if matched_p_ids:
                or_conds.append(f"professor_id.in.({','.join(matched_p_ids)})")
            query = query.or_(",".join(or_conds))
            
        desc = (order == "desc")
        query = query.order(sort, desc=desc)
        
        start = (page - 1) * limit
        end = start + limit - 1
        query = query.range(start, end)
        
        res = query.execute()
        
        flat_list = []
        for row in res.data:
            prof_info = row.get("professors", {}) or {}
            flat_list.append({
                "id": row["id"],
                "name": row["name"],
                "credits": row["credits"],
                "department": row["department"],
                "description": row["description"],
                "professor_name": prof_info.get("name", "TBA")
            })
        return flat_list, res.count

    def register_course(self, student_id, course_id):
        try:
            check = self.client.table("registrations").select("id").eq("student_id", student_id).eq("course_id", course_id).execute()
            if check.data:
                return False, "Already registered for this course!"
                
            res = self.client.table("registrations").insert({
                "student_id": student_id,
                "course_id": course_id,
                "status": "pending"
            }).execute()
            
            reg_id = res.data[0]["id"] if res.data else str(uuid.uuid4())
            return True, reg_id
        except Exception as e:
            return False, f"Failed registration: {str(e)}"

    def get_professor_dashboard(self, professor_id):
        prof_res = self.client.table("professors").select("*").eq("id", professor_id).execute()
        if not prof_res.data:
            return None
            
        courses_res = self.client.table("courses").select("*").eq("professor_id", professor_id).execute()
        return {
            "professor": prof_res.data[0],
            "courses": courses_res.data
        }

    def get_professor_registrations(self, professor_id, page=1, limit=50, search="", sort="id", order="asc"):
        query = self.client.table("registrations").select(
            "id, status, grade, course_id, courses!inner(name, credits, professor_id), students!inner(id, name, roll_number, email, department, year_of_study, cgpa)",
            count="exact"
        ).eq("courses.professor_id", professor_id)
        
        if search:
            s_res = self.client.table("students").select("id").or_(f"name.ilike.%{search}%,roll_number.ilike.%{search}%,department.ilike.%{search}%").execute()
            c_res = self.client.table("courses").select("id").ilike("name", f"%{search}%").execute()
            matched_s_ids = [r['id'] for r in s_res.data]
            matched_c_ids = [r['id'] for r in c_res.data]
            
            or_conds = [f"status.ilike.%{search}%", f"course_id.ilike.%{search}%"]
            if matched_s_ids:
                or_conds.append(f"student_id.in.({','.join(matched_s_ids)})")
            if matched_c_ids:
                or_conds.append(f"course_id.in.({','.join(matched_c_ids)})")
                
            query = query.or_(",".join(or_conds))
            
        # Due to embedded resources, sorting by foreign columns in Supabase requires special handling,
        # but for simplicity, if sort is on foreign tables we might fallback or map it.
        # E.g., sort="name" -> "students.name" not directly supported via .order in some versions.
        # We will map standard sorts to primary table where possible, else we will sort locally after fetch.
        # Let's fetch all and sort locally if it's a foreign column, OR just sort by primary table fields (status, id, course_id).
        # Actually, Supabase supports: `.order('students(name)', desc=True)`. Let's assume frontend passes local keys or we sort locally.
        
        start = (page - 1) * limit
        end = start + limit - 1
        query = query.range(start, end)
        
        # Primary table sorting
        if sort in ["id", "status", "grade", "course_id"]:
            query = query.order(sort, desc=(order == "desc"))
        else:
            query = query.order("id", desc=True)
            
        res = query.execute()
        
        flat_list = []
        for row in res.data:
            student = row.get("students") or {}
            course = row.get("courses") or {}
            flat_list.append({
                "registration_id": row["id"],
                "status": row["status"],
                "grade": row["grade"],
                "course_id": row["course_id"],
                "course_name": course.get("name"),
                "credits": course.get("credits"),
                "student_id": student.get("id"),
                "student_name": student.get("name"),
                "roll_number": student.get("roll_number"),
                "student_email": student.get("email"),
                "student_department": student.get("department"),
                "year_of_study": student.get("year_of_study"),
                "cgpa": student.get("cgpa")
            })
            
        # If sort was foreign, do it in-memory for the current page (good enough for typical use case, or we do full local sort if limit is high)
        if sort not in ["id", "status", "grade", "course_id"]:
            rev = (order == "desc")
            if sort == "name" or sort == "student_name": flat_list.sort(key=lambda x: x.get("student_name", ""), reverse=rev)
            elif sort == "roll_number": flat_list.sort(key=lambda x: x.get("roll_number", ""), reverse=rev)
            elif sort == "department": flat_list.sort(key=lambda x: x.get("student_department", ""), reverse=rev)
            elif sort == "course_name": flat_list.sort(key=lambda x: x.get("course_name", ""), reverse=rev)
            elif sort == "cgpa": flat_list.sort(key=lambda x: x.get("cgpa") or 0.0, reverse=rev)
            
        return flat_list, res.count

    def get_all_completed_courses_grouped(self):
        res = self.client.table("completed_courses").select("student_id, course_id, grade, semester, courses(name)").execute()
        flat_list = []
        for row in res.data:
            course = row.get("courses") or {}
            flat_list.append({
                "student_id": row["student_id"],
                "course_id": row["course_id"],
                "course_name": course.get("name"),
                "grade": row["grade"],
                "semester": row["semester"]
            })
        return flat_list

    def approve_registration(self, registration_id, status):
        res = self.client.table("registrations").update({"status": status}).eq("id", registration_id).execute()
        return len(res.data) > 0

    def update_registration_grade(self, registration_id, grade):
        res = self.client.table("registrations").update({"grade": grade}).eq("id", registration_id).execute()
        if len(res.data) > 0 and grade:
            reg = res.data[0]
            student_id = reg["student_id"]
            course_id = reg["course_id"]
            
            self.client.table("completed_courses").upsert({
                "student_id": student_id,
                "course_id": course_id,
                "grade": grade,
                "semester": "Spring 2026"
            }, on_conflict="student_id,course_id").execute()
            
            comp_res = self.client.table("completed_courses").select("grade").eq("student_id", student_id).execute()
            if comp_res.data:
                grade_points = {
                    'A+': 10.0, 'A': 10.0, 'A-': 9.0, 'B+': 8.0, 'B': 8.0, 'B-': 7.0, 'C+': 6.0, 'C': 6.0, 'C-': 5.0, 'D': 4.0, 'F': 0.0
                }
                total_pts = sum(grade_points.get(row['grade'].strip().upper(), 7.0) for row in comp_res.data)
                new_cgpa = round(total_pts / len(comp_res.data), 2)
                self.client.table("students").update({"cgpa": new_cgpa}).eq("id", student_id).execute()
                
        return len(res.data) > 0

    def get_all_students(self, page=1, limit=50, search="", sort="name", order="asc"):
        query = self.client.table("students").select("*", count="exact")
        
        if search:
            query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%,roll_number.ilike.%{search}%,department.ilike.%{search}%")
            
        desc = (order == "desc")
        query = query.order(sort, desc=desc)
        
        start = (page - 1) * limit
        end = start + limit - 1
        query = query.range(start, end)
        
        res = query.execute()
        return res.data, res.count

    def add_student(self, roll_number, name, email, department, year_of_study, cgpa):
        try:
            res = self.client.table("students").insert({
                "roll_number": roll_number,
                "name": name,
                "email": email.lower().strip(),
                "department": department,
                "year_of_study": int(year_of_study),
                "cgpa": float(cgpa),
                "is_approved_for_login": True
            }).execute()
            return True, res.data[0]["id"] if res.data else str(uuid.uuid4())
        except Exception as e:
            return False, f"Failed to insert student: {str(e)}"

    def delete_student(self, student_id):
        res = self.client.table("students").delete().eq("id", student_id).execute()
        return len(res.data) > 0 or True

    # --- Export Filtering Helpers ---
    
    def get_student_ids_by_wanted_course(self, course_id):
        res = self.client.table("registrations").select("student_id").eq("course_id", course_id).execute()
        return list(set(row["student_id"] for row in res.data))

    def get_student_ids_by_completed_course(self, course_id):
        res = self.client.table("completed_courses").select("student_id").eq("course_id", course_id).execute()
        return list(set(row["student_id"] for row in res.data))

    def get_filtered_students(self, year, dept, cgpa, student_ids):
        query = self.client.table("students").select("*")
        if year and year != "all":
            query = query.eq("year_of_study", int(year))
        if dept and dept != "all":
            # the frontend passes raw department strings, match exactly but case insensitive ideally.
            # but previously it was exact match df[df["Department"].str.upper() == dept_filter.upper()]
            # So I will use ilike for robustness if upper casing differs.
            query = query.ilike("department", dept)
        if cgpa:
            query = query.gte("cgpa", float(cgpa))
        if student_ids is not None:
            if not student_ids:
                return [] # empty intersection
            # Supabase in_ query takes max string list.
            query = query.in_("id", student_ids)
            
        res = query.order("name", desc=False).execute()
        return res.data

    def get_filtered_professor_registrations(self, prof_id, year, dept, cgpa, student_ids):
        query = self.client.table("registrations").select(
            "id, status, grade, course_id, courses!inner(name, credits, professor_id), students!inner(id, name, roll_number, email, department, year_of_study, cgpa)"
        ).eq("courses.professor_id", prof_id)
        
        if year and year != "all":
            query = query.eq("students.year_of_study", int(year))
        if dept and dept != "all":
            query = query.ilike("students.department", dept)
        if cgpa:
            query = query.gte("students.cgpa", float(cgpa))
        if student_ids is not None:
            if not student_ids:
                return []
            query = query.in_("students.id", student_ids)
            
        res = query.execute()
        
        flat_list = []
        for row in res.data:
            student = row.get("students") or {}
            course = row.get("courses") or {}
            flat_list.append({
                "registration_id": row["id"],
                "status": row["status"],
                "grade": row["grade"],
                "course_id": row["course_id"],
                "course_name": course.get("name"),
                "credits": course.get("credits"),
                "student_id": student.get("id"),
                "student_name": student.get("name"),
                "roll_number": student.get("roll_number"),
                "student_email": student.get("email"),
                "student_department": student.get("department"),
                "year_of_study": student.get("year_of_study"),
                "cgpa": student.get("cgpa")
            })
        return flat_list

    def get_completed_courses_for_students(self, student_ids):
        if not student_ids:
            return []
        res = self.client.table("completed_courses").select("student_id, course_id, grade, semester, courses(name)").in_("student_id", student_ids).execute()
        flat_list = []
        for row in res.data:
            course = row.get("courses") or {}
            flat_list.append({
                "student_id": row["student_id"],
                "course_id": row["course_id"],
                "course_name": course.get("name"),
                "grade": row["grade"],
                "semester": row["semester"]
            })
        return flat_list

    def get_registrations_for_students(self, student_ids):
        if not student_ids:
            return []
        res = self.client.table("registrations").select("student_id, course_id, status").in_("student_id", student_ids).execute()
        return res.data

    # ── Self-Reported Courses ──────────────────────────────────────────────────

    def get_self_reported_courses(self, student_id):
        res = self.client.table("self_reported_courses").select("*").eq("student_id", student_id).order("created_at", desc=False).execute()
        return res.data

    def get_self_reported_courses_for_students(self, student_ids):
        """Fetch all self-reported courses for a list of student IDs in one query."""
        if not student_ids:
            return {}
        res = self.client.table("self_reported_courses").select("*").in_("student_id", student_ids).order("created_at", desc=False).execute()
        # Group by student_id for fast lookup: { student_id: [course, ...] }
        grouped = {}
        for row in res.data:
            sid = row["student_id"]
            grouped.setdefault(sid, []).append(row)
        return grouped

    def add_self_reported_course(self, student_id, course_code, course_name, credits, grade, year, semester, proof_url=None):
        try:
            res = self.client.table("self_reported_courses").insert({
                "student_id": student_id,
                "course_code": course_code.strip().upper(),
                "course_name": course_name.strip(),
                "credits": float(credits),
                "grade": grade.strip().upper() if grade else None,
                "year": year.strip() if year else None,
                "semester": semester.strip() if semester else None,
                "proof_url": proof_url.strip() if proof_url else None,
            }).execute()
            return True, res.data[0] if res.data else {}
        except Exception as e:
            return False, str(e)

    def update_self_reported_course(self, record_id, student_id, course_code, course_name, credits, grade, year, semester, proof_url=None):
        try:
            res = self.client.table("self_reported_courses").update({
                "course_code": course_code.strip().upper(),
                "course_name": course_name.strip(),
                "credits": float(credits),
                "grade": grade.strip().upper() if grade else None,
                "year": year.strip() if year else None,
                "semester": semester.strip() if semester else None,
                "proof_url": proof_url.strip() if proof_url else None,
            }).eq("id", record_id).eq("student_id", student_id).execute()
            return len(res.data) > 0, res.data[0] if res.data else {}
        except Exception as e:
            return False, str(e)

    def delete_self_reported_course(self, record_id, student_id):
        try:
            res = self.client.table("self_reported_courses").delete().eq("id", record_id).eq("student_id", student_id).execute()
            return True
        except Exception as e:
            return False

    # ── Export / Audit ─────────────────────────────────────────────────────────

    def log_export(self, user_email, user_role, export_format, filters_used, rows_exported):
        try:
            self.client.table("export_logs").insert({
                "user_email": user_email,
                "user_role": user_role,
                "export_format": export_format,
                "filters_used": filters_used,
                "rows_exported": rows_exported
            }).execute()
        except Exception as e:
            # Silently fail so that logging errors NEVER block the export download
            print(f"Audit log failed: {e}")
            pass

db = SupabaseAdapter(supabase_client)