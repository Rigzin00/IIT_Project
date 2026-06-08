import os
import uuid
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

    def get_courses_for_pre_registration(self):
        res = self.client.table("courses").select("id, name, credits, department, description, professors(name)").eq("is_minor_eligible", True).execute()
        
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
        return flat_list

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

    def get_professor_registrations(self, professor_id):
        res = self.client.table("registrations").select(
            "id, status, grade, course_id, courses!inner(name, credits, professor_id), students(id, name, roll_number, email, department, year_of_study, cgpa)"
        ).eq("courses.professor_id", professor_id).execute()
        
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

    def get_all_students(self):
        res = self.client.table("students").select("*").order("name", desc=False).execute()
        return res.data

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

db = SupabaseAdapter(supabase_client)