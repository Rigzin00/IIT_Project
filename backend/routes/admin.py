from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import build_pagination_metadata, require_role
from datetime import datetime

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
