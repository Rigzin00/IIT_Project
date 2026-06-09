from flask import Blueprint, request, jsonify
from database import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route("/students", methods=["GET", "POST"])
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
