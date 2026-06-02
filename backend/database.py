import os
import sqlite3
import uuid
from dotenv import load_dotenv

# Load env variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

# Check if Supabase keys are provided and seem valid
USE_SUPABASE = False
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.startswith("https://") and not SUPABASE_URL.endswith("your_supabase_project_url"):
    try:
        from supabase import create_client, Client
        supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        USE_SUPABASE = True
        print(">>> Database Interface: Connected to Supabase Cloud Database! <<<")
    except Exception as e:
        print(f">>> Database Interface: Failed to connect to Supabase ({e}). Falling back to local SQLite... <<<")
else:
    print(">>> Database Interface: Supabase credentials missing or default placeholder. Using local SQLite Database! <<<")

class SQLiteAdapter:
    def __init__(self, db_path="portal.db"):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        conn = self._get_conn()
        cursor = conn.cursor()

        # 1. system_settings
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. professors
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS professors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            department TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 3. students
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            roll_number TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            department TEXT NOT NULL,
            year_of_study INTEGER NOT NULL,
            cgpa REAL NOT NULL DEFAULT 0.0,
            is_approved_for_login INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. courses
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            credits INTEGER NOT NULL,
            department TEXT NOT NULL DEFAULT 'CSE',
            professor_id TEXT,
            is_minor_eligible INTEGER NOT NULL DEFAULT 1,
            description TEXT,
            FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE SET NULL
        );
        """)

        # 5. completed_courses
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS completed_courses (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            grade TEXT NOT NULL,
            semester TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            UNIQUE(student_id, course_id)
        );
        """)

        # 6. registrations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS registrations (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            grade TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            UNIQUE(student_id, course_id)
        );
        """)

        conn.commit()

        # Seed data if tables are empty
        cursor.execute("SELECT COUNT(*) FROM system_settings;")
        if cursor.fetchone()[0] == 0:
            print(">>> Seeding database with initial academic portal data... <<<")
            
            # System Settings
            cursor.execute("INSERT INTO system_settings (key, value) VALUES ('min_eligible_year', '3');")
            cursor.execute("INSERT INTO system_settings (key, value) VALUES ('max_eligible_year', '4');")

            # Professors
            profs = [
                ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Dr. Arpan Sen', 'arpan.sen@institute.edu', 'CSE'),
                ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Prof. Sunita Sharma', 'sunita.sharma@institute.edu', 'CSE'),
                ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Dr. Ramesh Kumar', 'ramesh.kumar@institute.edu', 'ECE')
            ]
            cursor.executemany("INSERT INTO professors (id, name, email, department) VALUES (?, ?, ?, ?);", profs)

            # Students
            students = [
                ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', '2023CSE1021', 'Rigzin Angdu', 'rigzin.angdu@institute.edu', 'CSE', 3, 8.75, 1),
                ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '2023ECE1045', 'Siddharth Patel', 'siddharth.patel@institute.edu', 'ECE', 3, 9.10, 1),
                ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', '2022ME1082', 'Ananya Gupta', 'ananya.gupta@institute.edu', 'ME', 4, 7.80, 1),
                ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', '2024CSE1005', 'Rahul Varma', 'rahul.varma@institute.edu', 'CSE', 2, 8.20, 1),
                ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', '2023EE1012', 'Priya Nair', 'priya.nair@institute.edu', 'EE', 3, 6.45, 1)
            ]
            cursor.executemany("INSERT INTO students (id, roll_number, name, email, department, year_of_study, cgpa, is_approved_for_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?);", students)

            # Courses
            courses = [
                ('CS101', 'Introduction to Computer Programming', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, 'Basic concepts of programming using Python, algorithms, and simple data structures.'),
                ('CS201', 'Data Structures and Algorithms', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, 'Advanced data representations: trees, graphs, sorting, searching, and algorithmic analysis.'),
                ('CS202', 'Discrete Mathematical Structures', 3, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 1, 'Logic, sets, relations, functions, graph theory, combinatorics, and algebraic systems.'),
                ('CS301', 'Database Management Systems', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 1, 'Relational databases, SQL, database design, normalization, transactions, and indexing.'),
                ('CS302', 'Operating Systems', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 1, 'Processes, threads, CPU scheduling, synchronization, memory management, and file systems.'),
                ('CS401', 'Artificial Intelligence and ML', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 1, 'Introduction to neural networks, machine learning algorithms, deep learning, and state space search.')
            ]
            cursor.executemany("INSERT INTO courses (id, name, credits, department, professor_id, is_minor_eligible, description) VALUES (?, ?, ?, ?, ?, ?, ?);", courses)

            # Completed Courses
            completions = [
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS101', 'A', 'Fall 2024'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS201', 'B+', 'Spring 2025'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS101', 'A', 'Fall 2024'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS201', 'A', 'Spring 2025'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS202', 'A-', 'Spring 2025'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS101', 'B', 'Fall 2023'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS201', 'B-', 'Spring 2024'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'CS101', 'C+', 'Fall 2024')
            ]
            cursor.executemany("INSERT INTO completed_courses (id, student_id, course_id, grade, semester) VALUES (?, ?, ?, ?, ?);", completions)

            # Registrations
            regs = [
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS301', 'approved', None),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS302', 'pending', None),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS301', 'pending', None),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS301', 'approved', 'B'),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS401', 'pending', None),
                (str(uuid.uuid4()), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'CS201', 'rejected', None)
            ]
            cursor.executemany("INSERT INTO registrations (id, student_id, course_id, status, grade) VALUES (?, ?, ?, ?, ?);", regs)

            conn.commit()
            print(">>> SQLite database seeded successfully! <<<")

        conn.close()

    def get_student_by_email(self, email):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students WHERE email = ?;", (email.lower().strip(),))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def get_professor_by_email(self, email):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM professors WHERE email = ?;", (email.lower().strip(),))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def get_system_settings(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM system_settings;")
        rows = cursor.fetchall()
        conn.close()
        return {row['key']: row['value'] for row in rows}

    def update_system_settings(self, min_year, max_year):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('min_eligible_year', ?);", (str(min_year),))
        cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('max_eligible_year', ?);", (str(max_year),))
        conn.commit()
        conn.close()
        return True

    def get_student_profile(self, student_id):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students WHERE id = ?;", (student_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def get_student_completed_courses(self, student_id):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT cc.id, cc.course_id, c.name as course_name, c.credits, cc.grade, cc.semester
            FROM completed_courses cc
            JOIN courses c ON cc.course_id = c.id
            WHERE cc.student_id = ?;
        """, (student_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_student_registrations(self, student_id):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id, r.course_id, c.name as course_name, c.credits, r.status, r.grade, p.name as professor_name
            FROM registrations r
            JOIN courses c ON r.course_id = c.id
            LEFT JOIN professors p ON c.professor_id = p.id
            WHERE r.student_id = ?;
        """, (student_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_courses_for_pre_registration(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.id, c.name, c.credits, c.department, p.name as professor_name, c.description
            FROM courses c
            LEFT JOIN professors p ON c.professor_id = p.id
            WHERE c.is_minor_eligible = 1;
        """)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def register_course(self, student_id, course_id):
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            reg_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO registrations (id, student_id, course_id, status) VALUES (?, ?, ?, 'pending');",
                (reg_id, student_id, course_id)
            )
            conn.commit()
            return True, reg_id
        except sqlite3.IntegrityError:
            return False, "Already registered for this course!"
        finally:
            conn.close()

    def get_professor_dashboard(self, professor_id):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM professors WHERE id = ?;", (professor_id,))
        prof = cursor.fetchone()
        if not prof:
            conn.close()
            return None
        
        # Get courses taught by this prof
        cursor.execute("SELECT * FROM courses WHERE professor_id = ?;", (professor_id,))
        courses = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {
            "professor": dict(prof),
            "courses": courses
        }

    def get_professor_registrations(self, professor_id):
        conn = self._get_conn()
        cursor = conn.cursor()
        # Find all registrations for courses taught by this professor
        cursor.execute("""
            SELECT r.id as registration_id, r.status, r.grade,
                   c.id as course_id, c.name as course_name, c.credits,
                   s.id as student_id, s.name as student_name, s.roll_number, s.email as student_email, s.department as student_department, s.year_of_study, s.cgpa
            FROM registrations r
            JOIN courses c ON r.course_id = c.id
            JOIN students s ON r.student_id = s.id
            WHERE c.professor_id = ?;
        """, (professor_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_all_completed_courses_grouped(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        # Retrieve all completed courses for profiling completed course filters
        cursor.execute("""
            SELECT cc.student_id, cc.course_id, c.name as course_name, cc.grade, cc.semester
            FROM completed_courses cc
            JOIN courses c ON cc.course_id = c.id;
        """)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def approve_registration(self, registration_id, status):
        # status must be 'approved' or 'rejected'
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("UPDATE registrations SET status = ? WHERE id = ?;", (status, registration_id))
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        return rows_affected > 0

    def update_registration_grade(self, registration_id, grade):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("UPDATE registrations SET grade = ? WHERE id = ?;", (grade, registration_id))
        rows_affected = cursor.rowcount
        
        # If successfully updated, and grade is a passing/valid grade, also add to completed_courses
        if rows_affected > 0 and grade:
            # Let's fetch the registration details to know student and course
            cursor.execute("SELECT student_id, course_id FROM registrations WHERE id = ?;", (registration_id,))
            reg = cursor.fetchone()
            if reg:
                student_id = reg['student_id']
                course_id = reg['course_id']
                cursor.execute("""
                    INSERT INTO completed_courses (id, student_id, course_id, grade, semester)
                    VALUES (?, ?, ?, ?, 'Spring 2026')
                    ON CONFLICT(student_id, course_id) DO UPDATE SET grade = EXCLUDED.grade;
                """, (str(uuid.uuid4()), student_id, course_id, grade))
                
                # Recalculate CGPA (simulation)
                cursor.execute("""
                    SELECT grade FROM completed_courses WHERE student_id = ?;
                """, (student_id,))
                completed = cursor.fetchall()
                grade_points = {
                    'A+': 10.0, 'A': 10.0, 'A-': 9.0, 'B+': 8.0, 'B': 8.0, 'B-': 7.0, 'C+': 6.0, 'C': 6.0, 'C-': 5.0, 'D': 4.0, 'F': 0.0
                }
                total_pts = 0.0
                total_cnt = 0
                for row in completed:
                    g = row['grade'].strip().upper()
                    pts = grade_points.get(g, 7.0) # default if not matched
                    total_pts += pts
                    total_cnt += 1
                if total_cnt > 0:
                    new_cgpa = round(total_pts / total_cnt, 2)
                    cursor.execute("UPDATE students SET cgpa = ? WHERE id = ?;", (new_cgpa, student_id))
                    
        conn.commit()
        conn.close()
        return rows_affected > 0

    def get_all_students(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students ORDER BY name ASC;")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def add_student(self, roll_number, name, email, department, year_of_study, cgpa):
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            student_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO students (id, roll_number, name, email, department, year_of_study, cgpa, is_approved_for_login)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1);
            """, (student_id, roll_number, name, email.lower().strip(), department, int(year_of_study), float(cgpa)))
            conn.commit()
            return True, student_id
        except sqlite3.IntegrityError as e:
            return False, f"Duplicate roll number or email: {e}"
        finally:
            conn.close()

    def delete_student(self, student_id):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM students WHERE id = ?;", (student_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        return rows_affected > 0


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
        # We need to join completed_courses and courses
        # In Supabase REST API, we can do select("*, courses(*)") if the foreign keys are set
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
            # Check if already exists to prevent duplicate error thrown
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
        # We need registrations joined with courses taught by professor_id, and student info
        # Supabase select:
        # registrations(*, students(*), courses!inner(*)) where courses.professor_id = professor_id
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
            
            # Add to completed courses
            self.client.table("completed_courses").upsert({
                "student_id": student_id,
                "course_id": course_id,
                "grade": grade,
                "semester": "Spring 2026"
            }, on_conflict="student_id,course_id").execute()
            
            # Recalculate CGPA (Supabase side simulation)
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
        return len(res.data) > 0 or True # Supabase delete does not always return count depending on version, fallback to True


# Dynamic Adapter Instantiation
if USE_SUPABASE:
    db = SupabaseAdapter(supabase_client)
else:
    db = SQLiteAdapter(os.path.join(os.path.dirname(__file__), "portal.db"))
