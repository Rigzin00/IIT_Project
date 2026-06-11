import io
import logging
import pandas as pd
from flask import Blueprint, request, jsonify, send_file
from database import db
from utils.helpers import verify_admin
from utils.limiter import limiter

export_bp = Blueprint('export', __name__)
logger = logging.getLogger(__name__)

@export_bp.route("/", methods=["GET"])
@limiter.limit("10 per minute")
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
    valid_student_ids = None

    # Evaluate explicit course restrictions first
    if has_done_course and has_done_course != "all":
        valid_student_ids = db.get_student_ids_by_completed_course(has_done_course)

    if wants_course and wants_course != "all":
        wanted_ids = db.get_student_ids_by_wanted_course(wants_course)
        if valid_student_ids is not None:
            valid_student_ids = list(set(valid_student_ids) & set(wanted_ids))
        else:
            valid_student_ids = wanted_ids

    # Fast short-circuit if restricted lists yield zero matching students
    if valid_student_ids is not None and len(valid_student_ids) == 0:
        df = pd.DataFrame(columns=["Roll Number", "Student Name", "Email", "Department", "Year of Study", "CGPA", "Completed Courses", "Pre-registered Courses"])
    else:
        students_pool = []
        if role == "professor" and prof_id:
            # Fetch strictly matching registrations for this professor
            raw_data = db.get_filtered_professor_registrations(prof_id, year_filter, dept_filter, cgpa_cutoff, valid_student_ids)
            filtered_student_ids = list(set(r["student_id"] for r in raw_data))
            all_completions = db.get_completed_courses_for_students(filtered_student_ids)
            
            seen_students = set()
            for r in raw_data:
                s_id = r["student_id"]
                if s_id in seen_students:
                    continue
                seen_students.add(s_id)
                
                c_data = [c for c in all_completions if c["student_id"] == s_id]
                completed_str = ", ".join([f"{c['course_id']}({c['grade']})" for c in c_data])
                
                registered_under_prof = [reg["course_id"] for reg in raw_data if reg["student_id"] == s_id]
                registered_str = ", ".join(registered_under_prof)
                
                students_pool.append({
                    "Roll Number": r["roll_number"],
                    "Student Name": r["student_name"],
                    "Email": r["student_email"],
                    "Department": r["student_department"],
                    "Year of Study": r["year_of_study"],
                    "CGPA": r["cgpa"],
                    "Completed Courses": completed_str,
                    "Pre-registered Courses": registered_str
                })
        else:
            # Administrator: Get directly filtered students
            students = db.get_filtered_students(year_filter, dept_filter, cgpa_cutoff, valid_student_ids)
            filtered_student_ids = [s["id"] for s in students]
            all_completions = db.get_completed_courses_for_students(filtered_student_ids)
            all_regs = db.get_registrations_for_students(filtered_student_ids)
            
            for s in students:
                c_data = [c for c in all_completions if c["student_id"] == s["id"]]
                completed_str = ", ".join([f"{c['course_id']}({c['grade']})" for c in c_data])
                
                r_data = [r for r in all_regs if r["student_id"] == s["id"]]
                registered_str = ", ".join([f"{r['course_id']}({r['status']})" for r in r_data])
                
                students_pool.append({
                    "Roll Number": s["roll_number"],
                    "Student Name": s["name"],
                    "Email": s["email"],
                    "Department": s["department"],
                    "Year of Study": s["year_of_study"],
                    "CGPA": s["cgpa"],
                    "Completed Courses": completed_str,
                    "Pre-registered Courses": registered_str
                })

        df = pd.DataFrame(students_pool)
        if df.empty:
            df = pd.DataFrame(columns=["Roll Number", "Student Name", "Email", "Department", "Year of Study", "CGPA", "Completed Courses", "Pre-registered Courses"])

    # Audit Logging setup
    try:
        filters_used = {
            "year": year_filter,
            "department": dept_filter,
            "cgpa_cutoff": cgpa_cutoff,
            "wants_course": wants_course,
            "has_done_course": has_done_course
        }
        db.log_export(email, role, export_format, filters_used, len(df))
    except Exception as e:
        # Failsafe wrapper so exporting never breaks
        logger.error("Audit log wrapper failed: %s", e, exc_info=True)

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
