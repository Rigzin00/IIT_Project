import io
import os
import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Import database adapter
from database import db

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)  # Enable Cross-Origin Resource Sharing

# Static File Routes
@app.route("/")
def serve_index():
    return app.send_static_file("index.html")

# Helper to check student login eligibility
def is_student_eligible(student_year, settings):
    try:
        min_year = int(settings.get("min_eligible_year", 3))
        max_year = int(settings.get("max_eligible_year", 4))
        return min_year <= int(student_year) <= max_year
    except ValueError:
        return True # Default to True if configuration error

# Helper to verify Admin credentials
def verify_admin(email):
    if email == "admin@institute.edu":
        return {
            "name": "Institute Administrator",
            "email": "admin@institute.edu",
            "department": "Administration"
        }
    return None

# --- AUTHENTICATION ENDPOINT ---
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    role = data.get("role", "").strip().lower()

    if not email or not role:
        return jsonify({"success": False, "message": "Email and Role are required!"}), 400

    # Admin Login Simulation
    if role == "admin":
        admin_user = verify_admin(email)
        if admin_user:
            return jsonify({
                "success": True,
                "role": "admin",
                "user": admin_user
            })
        else:
            return jsonify({"success": False, "message": "Invalid Administrator credentials!"}), 401

    # Professor Login Check
    elif role == "professor":
        prof = db.get_professor_by_email(email)
        if prof:
            return jsonify({
                "success": True,
                "role": "professor",
                "user": prof
            })
        else:
            return jsonify({"success": False, "message": "Professor email not registered with institute!"}), 401

    # Student Login Check
    elif role == "student":
        student = db.get_student_by_email(email)
        if not student:
            return jsonify({"success": False, "message": "Student email not registered with institute!"}), 401

        # Check: Is login allowed for this student?
        if not student.get("is_approved_for_login"):
            return jsonify({
                "success": False, 
                "message": "Access Denied: Your account login has been disabled by the Administrator."
            }), 403

        # Check Year policy
        settings = db.get_system_settings()
        student_year = student.get("year_of_study")
        if not is_student_eligible(student_year, settings):
            min_y = settings.get("min_eligible_year", "3")
            max_y = settings.get("max_eligible_year", "4")
            return jsonify({
                "success": False,
                "message": f"Access Denied: Registration and login is currently restricted to Years {min_y} through {max_y} (Your batch: Year {student_year})."
            }), 403

        return jsonify({
            "success": True,
            "role": "student",
            "user": student
        })

    return jsonify({"success": False, "message": "Invalid role selected!"}), 400


# --- STUDENT PORTAL ENDPOINTS ---
@app.route("/api/student/profile", methods=["GET"])
def student_profile():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"success": False, "message": "Student ID is required!"}), 400

    student = db.get_student_profile(student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found!"}), 404

    completed = db.get_student_completed_courses(student_id)
    registrations = db.get_student_registrations(student_id)

    # Simple calculations
    total_credits = sum(item["credits"] for item in completed)
    minor_gpa = student.get("cgpa", 0.0) # Using CGPA for demonstration

    return jsonify({
        "success": True,
        "profile": student,
        "completed": completed,
        "registrations": registrations,
        "stats": {
            "completed_credits": total_credits,
            "minor_gpa": minor_gpa
        }
    })

@app.route("/api/student/courses", methods=["GET"])
def student_courses():
    courses = db.get_courses_for_pre_registration()
    return jsonify({
        "success": True,
        "courses": courses
    })

@app.route("/api/student/register", methods=["POST"])
def student_register():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    course_id = data.get("course_id")

    if not student_id or not course_id:
        return jsonify({"success": False, "message": "Student ID and Course ID are required!"}), 400

    # Enforce Admin Registration Policy
    student = db.get_student_profile(student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found!"}), 404

    settings = db.get_system_settings()
    if not is_student_eligible(student.get("year_of_study"), settings):
        return jsonify({
            "success": False,
            "message": "Registration is locked for your academic year under current administration policies."
        }), 403

    success, message_or_id = db.register_course(student_id, course_id)
    if success:
        return jsonify({"success": True, "message": "Pre-registration request submitted successfully!", "registration_id": message_or_id})
    else:
        return jsonify({"success": False, "message": message_or_id}), 400


# --- PROFESSOR PORTAL ENDPOINTS ---
@app.route("/api/professor/dashboard", methods=["GET"])
def professor_dashboard():
    prof_id = request.args.get("professor_id")
    if not prof_id:
        return jsonify({"success": False, "message": "Professor ID is required!"}), 400

    dash_data = db.get_professor_dashboard(prof_id)
    if not dash_data:
        return jsonify({"success": False, "message": "Professor profile not found!"}), 404

    return jsonify({
        "success": True,
        **dash_data
    })

@app.route("/api/professor/registrations", methods=["GET"])
def professor_registrations():
    prof_id = request.args.get("professor_id")
    if not prof_id:
        return jsonify({"success": False, "message": "Professor ID is required!"}), 400

    regs = db.get_professor_registrations(prof_id)
    
    # We will also pull all historical completed courses to let professor check "has done course C"
    all_completions = db.get_all_completed_courses_grouped()
    
    # Map completions to student registrations to provide high-fidelity dashboard metrics
    for reg in regs:
        student_id = reg["student_id"]
        # Find which courses this student completed
        completed = [c["course_id"] for c in all_completions if c["student_id"] == student_id]
        reg["completed_courses_ids"] = completed
        
        # Build nice text array for frontend display
        completed_full = [f"{c['course_id']} ({c['grade']})" for c in all_completions if c["student_id"] == student_id]
        reg["completed_courses_list"] = completed_full

    return jsonify({
        "success": True,
        "registrations": regs
    })

@app.route("/api/professor/action", methods=["POST"])
def professor_action():
    data = request.get_json() or {}
    reg_id = data.get("registration_id")
    status = data.get("status")  # 'approved' or 'rejected'

    if not reg_id or status not in ["approved", "rejected"]:
        return jsonify({"success": False, "message": "Registration ID and valid status ('approved'/'rejected') are required!"}), 400

    success = db.approve_registration(reg_id, status)
    if success:
        return jsonify({"success": True, "message": f"Pre-registration {status} successfully!"})
    else:
        return jsonify({"success": False, "message": "Failed to update registration or registration not found."}), 404

@app.route("/api/professor/grade", methods=["POST"])
def professor_grade():
    data = request.get_json() or {}
    reg_id = data.get("registration_id")
    grade = data.get("grade", "").strip().upper()  # A, A-, B, B-, etc.

    if not reg_id or not grade:
        return jsonify({"success": False, "message": "Registration ID and Grade are required!"}), 400

    success = db.update_registration_grade(reg_id, grade)
    if success:
        return jsonify({"success": True, "message": "Student grade updated successfully! Academic record synchronized."})
    else:
        return jsonify({"success": False, "message": "Failed to update grade or registration not found."}), 404


# --- ADMIN PORTAL ENDPOINTS ---
@app.route("/api/admin/students", methods=["GET", "POST"])
def admin_students():
    if request.method == "GET":
        students = db.get_all_students()
        return jsonify({"success": True, "students": students})

    elif request.method == "POST":
        data = request.get_json() or {}
        roll = data.get("roll_number", "").strip().upper()
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        dept = data.get("department", "").strip().upper()
        year = data.get("year_of_study")
        cgpa = data.get("cgpa", 0.0)

        if not roll or not name or not email or not dept or not year:
            return jsonify({"success": False, "message": "All fields (Roll, Name, Email, Department, Year) are required!"}), 400

        success, message_or_id = db.add_student(roll, name, email, dept, year, cgpa)
        if success:
            return jsonify({"success": True, "message": "Student created successfully!", "student_id": message_or_id})
        else:
            return jsonify({"success": False, "message": message_or_id}), 400

@app.route("/api/admin/students/<student_id>", methods=["DELETE"])
def admin_delete_student(student_id):
    success = db.delete_student(student_id)
    if success:
        return jsonify({"success": True, "message": "Student deleted successfully!"})
    else:
        return jsonify({"success": False, "message": "Student not found or deletion failed."}), 404

@app.route("/api/admin/policy", methods=["GET", "POST"])
def admin_policy():
    if request.method == "GET":
        settings = db.get_system_settings()
        return jsonify({
            "success": True,
            "min_eligible_year": int(settings.get("min_eligible_year", 3)),
            "max_eligible_year": int(settings.get("max_eligible_year", 4))
        })
    elif request.method == "POST":
        data = request.get_json() or {}
        min_y = data.get("min_eligible_year")
        max_y = data.get("max_eligible_year")

        if min_y is None or max_y is None:
            return jsonify({"success": False, "message": "Min Eligible Year and Max Eligible Year are required!"}), 400

        db.update_system_settings(min_y, max_y)
        return jsonify({"success": True, "message": "Registration eligibility policy updated successfully!"})


# --- DATA SPREADSHEET EXPORT ENGINE ---
@app.route("/api/export", methods=["GET"])
def export_students():
    # Accessible by Professors and Administrators
    role = request.args.get("role", "admin").lower()
    email = request.args.get("email", "").strip().lower()

    if role == "admin":
        if not verify_admin(email):
            return jsonify({"success": False, "message": "Unauthorized access. Invalid admin credentials."}), 401
    elif role == "professor":
        prof = db.get_professor_by_email(email)
        if not prof:
            return jsonify({"success": False, "message": "Unauthorized access. Invalid professor credentials."}), 401
        prof_id = prof["id"] # Override requested prof_id for security
    else:
        return jsonify({"success": False, "message": "Unauthorized access."}), 401

    # Filters
    year_filter = request.args.get("year")
    dept_filter = request.args.get("department")
    cgpa_cutoff = request.args.get("cgpa_cutoff")
    wants_course = request.args.get("wants_course")
    has_done_course = request.args.get("has_done_course")
    export_format = request.args.get("format", "csv").lower() # csv or xlsx

    # Get data pool
    if role == "professor" and prof_id:
        # Fetch registrations of this professor
        raw_data = db.get_professor_registrations(prof_id)
        all_completions = db.get_all_completed_courses_grouped()
        
        # Build records
        students_pool = []
        seen_students = set()
        for r in raw_data:
            s_id = r["student_id"]
            if s_id in seen_students:
                continue
            seen_students.add(s_id)
            
            # completed course IDs
            completed = [c["course_id"] for c in all_completions if c["student_id"] == s_id]
            completed_str = ", ".join([f"{c['course_id']}({c['grade']})" for c in all_completions if c["student_id"] == s_id])
            
            # registrations under this prof
            registered_under_prof = [reg["course_id"] for reg in raw_data if reg["student_id"] == s_id]
            registered_str = ", ".join(registered_under_prof)
            
            students_pool.append({
                "Student ID": r["student_id"],
                "Roll Number": r["roll_number"],
                "Student Name": r["student_name"],
                "Email": r["student_email"],
                "Department": r["student_department"],
                "Year of Study": r["year_of_study"],
                "CGPA": r["cgpa"],
                "Completed Courses": completed_str,
                "Pre-registered Courses": registered_str,
                "_completed_list": completed,
                "_registered_list": registered_under_prof
            })
    else:
        # Administrator: Get all students
        students = db.get_all_students()
        all_completions = db.get_all_completed_courses_grouped()
        
        students_pool = []
        for s in students:
            # Completed
            completed_str = ", ".join([f"{c['course_id']}({c['grade']})" for c in all_completions if c["student_id"] == s["id"]])
            completed_list = [c["course_id"] for c in all_completions if c["student_id"] == s["id"]]
            
            # Registrations status
            regs = db.get_student_registrations(s["id"])
            registered_str = ", ".join([f"{r['course_id']}({r['status']})" for r in regs])
            registered_list = [r["course_id"] for r in regs]
            
            students_pool.append({
                "Student ID": s["id"],
                "Roll Number": s["roll_number"],
                "Student Name": s["name"],
                "Email": s["email"],
                "Department": s["department"],
                "Year of Study": s["year_of_study"],
                "CGPA": s["cgpa"],
                "Completed Courses": completed_str,
                "Pre-registered Courses": registered_str,
                "_completed_list": completed_list,
                "_registered_list": registered_list
            })

    # Apply Filters in Pandas Dataframe
    df = pd.DataFrame(students_pool)
    if df.empty:
        # Create empty template
        df = pd.DataFrame(columns=["Roll Number", "Student Name", "Email", "Department", "Year of Study", "CGPA", "Completed Courses", "Pre-registered Courses"])
    
    # Filter Year
    if year_filter and year_filter != "all":
        try:
            df = df[df["Year of Study"] == int(year_filter)]
        except ValueError:
            pass

    # Filter Department
    if dept_filter and dept_filter != "all":
        df = df[df["Department"].str.upper() == dept_filter.upper()]

    # Filter CGPA Cutoff
    if cgpa_cutoff:
        try:
            df = df[df["CGPA"] >= float(cgpa_cutoff)]
        except ValueError:
            pass

    # Filter wants to do Course C
    if wants_course and wants_course != "all" and "_registered_list" in df.columns:
        df = df[df["_registered_list"].apply(lambda lst: wants_course in lst if isinstance(lst, list) else False)]

    # Filter has completed Course C
    if has_done_course and has_done_course != "all" and "_completed_list" in df.columns:
        df = df[df["_completed_list"].apply(lambda lst: has_done_course in lst if isinstance(lst, list) else False)]

    # Drop hidden columns used for filtering
    cols_to_drop = [c for c in ["_completed_list", "_registered_list", "Student ID"] if c in df.columns]
    df = df.drop(columns=cols_to_drop, errors="ignore")

    # Render File and Send
    if export_format == "xlsx":
        # Render Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Students_List")
        output.seek(0)
        
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="academic_portal_students.xlsx"
        )
    else:
        # Render CSV
        output = io.BytesIO()
        df.to_csv(output, index=False, encoding="utf-8")
        output.seek(0)
        
        return send_file(
            output,
            mimetype="text/csv",
            as_attachment=True,
            download_name="academic_portal_students.csv"
        )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_ENV", "development") == "development"
    print(f">>> Running Academic Portal on http://127.0.0.1:{port} (serving both GUI & API) <<<")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
