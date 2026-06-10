from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import build_pagination_metadata
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route("/students", methods=["GET", "POST"])
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
def admin_delete_student(student_id):
    success = db.delete_student(student_id)
    if success:
        return jsonify({"success": True, "message": "Student deleted successfully!"})
    else:
        return jsonify({"success": False, "message": "Student not found or deletion failed."}), 404

@admin_bp.route("/policy", methods=["GET", "POST"])
def admin_policy():
    if request.method == "GET":
        settings = db.get_system_settings()
        return jsonify({
            "success": True,
            "min_eligible_year": int(settings.get("min_eligible_year", 2022)),
            "max_eligible_year": int(settings.get("max_eligible_year", 2025))
        })
    elif request.method == "POST":
        data = request.get_json() or {}
        min_y = data.get("min_eligible_year")
        max_y = data.get("max_eligible_year")

        if min_y is None or max_y is None:
            return jsonify({"success": False, "message": "Min and Max batch year are required!"}), 400

        try:
            min_y, max_y = int(min_y), int(max_y)
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Batch years must be valid numbers!"}), 400

        current_year = datetime.now().year
        allowed_min = current_year - 20
        allowed_max = current_year + 20
        if not (allowed_min <= min_y <= allowed_max) or not (allowed_min <= max_y <= allowed_max) or min_y > max_y:
            return jsonify({"success": False, "message": f"Invalid batch year range. Both must be between {allowed_min}–{allowed_max} and Min ≤ Max."}), 400

        db.update_system_settings(min_y, max_y)
        return jsonify({"success": True, "message": "Registration eligibility policy updated successfully!"})
