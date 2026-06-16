from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import verify_admin, is_student_eligible
from utils.limiter import limiter

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
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
        if not prof:
            return jsonify({"success": False, "message": "Professor email not registered with institute!"}), 401

        # Check: Is this professor still active at the institute?
        if not prof.get("is_active", True):
            return jsonify({
                "success": False,
                "message": "Access Denied: Your account has been deactivated by the Administrator."
            }), 403

        return jsonify({
            "success": True,
            "role": "professor",
            "user": prof
        })

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

        # Check Year policy — based on batch year in roll number (e.g. 2023EE1012 → 2023)
        settings = db.get_system_settings()
        roll_number = student.get("roll_number", "")
        if not is_student_eligible(roll_number, settings):
            min_y = settings.get("min_eligible_year", "2020")
            max_y = settings.get("max_eligible_year", "2030")
            batch_year = str(roll_number)[:4] if roll_number else "Unknown"
            return jsonify({
                "success": False,
                "message": f"Access Denied: Registration and login is currently restricted to Batch {min_y}–{max_y} (Your batch: {batch_year})."
            }), 403

        return jsonify({
            "success": True,
            "role": "student",
            "user": student
        })

    return jsonify({"success": False, "message": "Invalid role selected!"}), 400
