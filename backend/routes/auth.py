from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import verify_admin, is_student_eligible

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/login", methods=["POST"])
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
