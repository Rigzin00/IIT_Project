from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import build_pagination_metadata, require_role
from datetime import datetime
import csv
import io
from flask import Response

admin_bp = Blueprint('admin', __name__)

# Allowed sort column whitelist — prevents SQL injection via sort param
ADMIN_SORT_COLS = {'name', 'roll_number', 'department', 'year_of_study', 'cgpa', 'is_approved_for_login'}

@admin_bp.route("/students", methods=["GET", "POST"])
@require_role('admin')
def admin_students():
    if request.method == "GET":
        try:
            page = max(int(request.args.get('page', 1)), 1)
            limit = min(max(int(request.args.get('limit', 50)), 1), 100)
        except ValueError:
            page, limit = 1, 50
            
        search = request.args.get('search', '').strip()
        sort = request.args.get('sort', 'name').strip()
        order = request.args.get('order', 'asc').strip()
        # Whitelist sort/order — reject unknown values to prevent injection
        sort = sort if sort in ADMIN_SORT_COLS else 'name'
        order = 'desc' if order == 'desc' else 'asc'

        students, total = db.get_all_students(page, limit, search, sort, order)
        return jsonify({
            "success": True,
            "students": students,
            "pagination": build_pagination_metadata(total, page, limit)
        })

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

@admin_bp.route("/students/<student_id>", methods=["DELETE"])
@require_role('admin')
def admin_delete_student(student_id):
    success = db.delete_student(student_id)
    if success:
        return jsonify({"success": True, "message": "Student deleted successfully!"})
    else:
        return jsonify({"success": False, "message": "Student not found or deletion failed."}), 404

@admin_bp.route("/policy", methods=["GET", "POST"])
@require_role('admin')
def admin_policy():
    if request.method == "GET":
        settings = db.get_system_settings()
        return jsonify({
            "success": True,
            "min_eligible_year": int(settings.get("min_eligible_year", 2022)),
            "max_eligible_year": int(settings.get("max_eligible_year", 2025)),
            "active_year": str(settings.get("active_year", "2026")),
            "admin_emails": str(settings.get("admin_emails", "admin@institute.edu"))
        })
    elif request.method == "POST":
        data = request.get_json() or {}
        min_y = data.get("min_eligible_year")
        max_y = data.get("max_eligible_year")
        active_y = data.get("active_year", "2026")
        admin_emails_raw = data.get("admin_emails", None)

        if min_y is None or max_y is None or not active_y:
            return jsonify({"success": False, "message": "Min, Max batch year, and Active Year are required!"}), 400

        try:
            min_y, max_y = int(min_y), int(max_y)
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Batch years must be valid numbers!"}), 400

        current_year = datetime.now().year
        allowed_min = current_year - 20
        allowed_max = current_year + 20
        if not (allowed_min <= min_y <= allowed_max) or not (allowed_min <= max_y <= allowed_max) or min_y > max_y:
            return jsonify({"success": False, "message": f"Invalid batch year range. Both must be between {allowed_min}\u2013{allowed_max} and Min \u2264 Max."}), 400

        # Validate and normalise admin emails if provided
        admin_emails_to_save = None
        if admin_emails_raw is not None:
            emails = [e.strip().lower() for e in str(admin_emails_raw).split(",") if e.strip()]
            if not emails:
                return jsonify({"success": False, "message": "At least one admin email is required!"}), 400
            admin_emails_to_save = ",".join(emails)

        db.update_system_settings(min_y, max_y, str(active_y).strip(), admin_emails_to_save)
        return jsonify({"success": True, "message": "Policy mapped and updated successfully!"})

@admin_bp.route("/courses", methods=["POST"])
@require_role('admin')
def admin_add_course():
    data = request.get_json() or {}
    course_code = data.get("course_code")
    course_name = data.get("course_name")
    credits = data.get("credits")
    professor = data.get("professor")
    description = data.get("description", "")
    is_minor_eligible = data.get("is_minor_eligible", False)

    if not course_code or not course_name or not credits or not professor:
        return jsonify({"success": False, "message": "All fields are required!"}), 400

    success, message = db.add_course(course_code, course_name, credits, 'CSE', professor, description, is_minor_eligible)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "message": message}), 400

@admin_bp.route("/upcoming-courses", methods=["POST"])
@require_role('admin')
def admin_add_upcoming_course():
    data = request.get_json() or {}
    course_code = data.get("course_code")
    course_name = data.get("course_name")
    start_date = data.get("start_date")
    professor = data.get("professor")
    description = data.get("description", "")

    if not course_code or not course_name or not start_date or not professor:
        return jsonify({"success": False, "message": "All fields are required!"}), 400

    success, message = db.add_upcoming_course(course_code, course_name, start_date, professor, description)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "message": message}), 400

@admin_bp.route("/courses/template", methods=["GET"])
@require_role('admin')
def admin_courses_template():
    csv_content = "Course Code,Course Name,Credits,Professor,Description,Minor Eligible\nCS301,Machine Learning,4,Dr Sharma,Intro to ML,True\nCS302,Cloud Computing,3,Dr Singh,Cloud basics,False\n"
    response = Response(csv_content, mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=cse_courses_template.csv"
    return response

@admin_bp.route("/upcoming-courses/template", methods=["GET"])
@require_role('admin')
def admin_upcoming_courses_template():
    csv_content = "Course Code,Course Name,Start Date,Professor,Description\nCS401,Advanced AI,2026-08-01,Dr Sharma,Next level AI course\n"
    response = Response(csv_content, mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=upcoming_courses_template.csv"
    return response

@admin_bp.route("/courses/upload", methods=["POST"])
@require_role('admin')
def admin_upload_courses():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({"success": False, "error": "Only CSV allowed"}), 400
        
    try:
        stream = io.StringIO(file.stream.read().decode("utf8"), newline=None)
        reader = csv.DictReader(stream)
        
        required_headers = {"Course Code", "Course Name", "Credits", "Professor", "Description", "Minor Eligible"}
        if not reader.fieldnames or set(reader.fieldnames) != required_headers:
            return jsonify({"success": False, "error": "Invalid CSV format or missing columns"}), 400
            
        existing_courses = {c["id"].upper() for c in db.get_all_course_codes()}
        
        valid_rows = []
        errors = []
        total = 0
        
        for idx, row in enumerate(reader, start=2): # Start 2 because line 1 is header
            total += 1
            ccode = row.get("Course Code", "").strip().upper()
            cname = row.get("Course Name", "").strip()
            credits = row.get("Credits", "").strip()
            prof_identifier = row.get("Professor", "").strip()
            
            if not ccode or not cname or not credits or not prof_identifier:
                errors.append({"row": idx, "message": "Missing required fields"})
                continue
                
            if ccode in existing_courses:
                errors.append({"row": idx, "message": "Course code already exists"})
                continue
                
            try:
                credits_int = int(credits)
            except ValueError:
                errors.append({"row": idx, "message": "Credits must be a number"})
                continue
                
            prof_id = db.get_professor_id_by_identifier(prof_identifier)
            if not prof_id:
                errors.append({"row": idx, "message": f"Professor '{prof_identifier}' not found"})
                continue
                
            minor_elig = str(row.get("Minor Eligible", "")).strip().lower() in ['true', '1', 'yes', 'y']
            
            valid_rows.append({
                "id": ccode,
                "name": cname,
                "credits": credits_int,
                "department": "CSE",  # Always CSE for this endpoint
                "professor_id": prof_id,
                "is_minor_eligible": minor_elig,
                "description": row.get("Description", "").strip()
            })
            existing_courses.add(ccode) # avoid duplicates in same file
            
        if valid_rows:
            db.bulk_add_courses(valid_rows)
            
        return jsonify({
            "success": True,
            "total_rows": total,
            "success_count": len(valid_rows),
            "failure_count": len(errors),
            "errors": errors
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to process CSV: {str(e)}"}), 500

@admin_bp.route("/upcoming-courses/upload", methods=["POST"])
@require_role('admin')
def admin_upload_upcoming_courses():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({"success": False, "error": "Only CSV allowed"}), 400
        
    try:
        raw_bytes = file.stream.read()
        # Handle UTF-8 BOM that Excel adds when saving CSVs
        content = raw_bytes.decode("utf-8-sig")
        stream = io.StringIO(content, newline=None)
        reader = csv.DictReader(stream)

        # Normalise header names: strip whitespace and BOM artifacts
        if not reader.fieldnames:
            return jsonify({"success": False, "error": "CSV file is empty or has no headers"}), 400

        normalised_headers = {h.strip() for h in reader.fieldnames}
        required_headers = {"Course Code", "Course Name", "Start Date", "Professor", "Description"}
        missing = required_headers - normalised_headers
        if missing:
            return jsonify({"success": False, "error": f"Missing required columns: {', '.join(sorted(missing))}"}), 400

        def normalise_date(raw):
            """Accept YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY and return YYYY-MM-DD."""
            from datetime import datetime
            raw = raw.strip()
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y"):
                try:
                    return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                except ValueError:
                    continue
            return None  # unrecognised format

        existing_upcoming = {c["course_code"].upper() for c in (db.get_all_upcoming_course_codes() or [])}
        existing_active = {c["id"].upper() for c in db.get_all_course_codes()}
        existing_all = existing_upcoming.union(existing_active)

        valid_rows = []
        errors = []
        total = 0

        for idx, row in enumerate(reader, start=2):
            total += 1
            # Strip keys too in case of whitespace around header names
            row = {k.strip(): v for k, v in row.items() if k}
            ccode = row.get("Course Code", "").strip().upper()
            cname = row.get("Course Name", "").strip()
            sdate_raw = row.get("Start Date", "").strip()
            prof_identifier = row.get("Professor", "").strip()

            if not ccode or not cname or not sdate_raw or not prof_identifier:
                errors.append({"row": idx, "message": "Missing required fields"})
                continue

            # Normalise date format
            sdate = normalise_date(sdate_raw)
            if not sdate:
                errors.append({"row": idx, "message": f"Unrecognised date format '{sdate_raw}'. Use YYYY-MM-DD or DD-MM-YYYY"})
                continue

            if ccode in existing_all:
                errors.append({"row": idx, "message": "Course code already exists (active or upcoming)"})
                continue

            prof_id = db.get_professor_id_by_identifier(prof_identifier)
            if not prof_id:
                errors.append({"row": idx, "message": f"Professor '{prof_identifier}' not found"})
                continue

            valid_rows.append({
                "course_code": ccode,
                "course_name": cname,
                "expected_start_date": sdate,
                "professor_id": prof_id,
                "description": row.get("Description", "").strip()
            })
            existing_all.add(ccode)

        if valid_rows:
            db.bulk_add_upcoming_courses(valid_rows)

        return jsonify({
            "success": True,
            "total_rows": total,
            "success_count": len(valid_rows),
            "failure_count": len(errors),
            "errors": errors
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to process CSV: {str(e)}"}), 500
