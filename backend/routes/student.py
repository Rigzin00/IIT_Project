from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import is_student_eligible

student_bp = Blueprint('student', __name__)

@student_bp.route("/profile", methods=["GET"])
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

@student_bp.route("/courses", methods=["GET"])
def student_courses():
    courses = db.get_courses_for_pre_registration()
    return jsonify({
        "success": True,
        "courses": courses
    })

@student_bp.route("/register", methods=["POST"])
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
