from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import build_pagination_metadata
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
    try:
        page = max(int(request.args.get('page', 1)), 1)
        limit = min(max(int(request.args.get('limit', 50)), 1), 100)
    except ValueError:
        page, limit = 1, 50
        
    search = request.args.get('search', '').strip()
    sort = request.args.get('sort', 'name').strip()
    order = request.args.get('order', 'asc').strip()

    courses, total = db.get_courses_for_pre_registration(page, limit, search, sort, order)
    return jsonify({
        "success": True, 
        "courses": courses,
        "pagination": build_pagination_metadata(total, page, limit)
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
    if not is_student_eligible(student.get("roll_number", ""), settings):
        return jsonify({
            "success": False,
            "message": "Registration is locked for your batch under current administration policies."
        }), 403

    success, message_or_id = db.register_course(student_id, course_id)
    if success:
        return jsonify({"success": True, "message": "Pre-registration request submitted successfully!", "registration_id": message_or_id})
    else:
        return jsonify({"success": False, "message": message_or_id}), 400


# ── Self-Reported Prior Courses ────────────────────────────────────────────────

@student_bp.route("/self-reported", methods=["GET", "POST"])
def self_reported_courses():
    if request.method == "GET":
        student_id = request.args.get("student_id")
        if not student_id:
            return jsonify({"success": False, "message": "Student ID is required!"}), 400
        courses = db.get_self_reported_courses(student_id)
        return jsonify({"success": True, "courses": courses})

    elif request.method == "POST":
        data = request.get_json() or {}
        student_id   = data.get("student_id", "").strip()
        course_code  = data.get("course_code", "").strip()
        course_name  = data.get("course_name", "").strip()
        credits      = data.get("credits")
        grade        = data.get("grade") or ""
        year         = data.get("year") or ""
        semester     = data.get("semester") or ""
        proof_url    = data.get("proof_url") or ""
        
        grade        = grade.strip()
        year         = year.strip()
        semester     = semester.strip()
        proof_url    = proof_url.strip()

        if not student_id or not course_code or not course_name or credits is None:
            return jsonify({"success": False, "message": "student_id, course_code, course_name and credits are required!"}), 400

        try:
            credits = float(credits)
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "credits must be a number!"}), 400

        success, result = db.add_self_reported_course(student_id, course_code, course_name, credits, grade, year, semester, proof_url)
        if success:
            return jsonify({"success": True, "course": result})
        else:
            return jsonify({"success": False, "message": result}), 400


@student_bp.route("/self-reported/<record_id>", methods=["PUT", "DELETE"])
def self_reported_course_detail(record_id):
    student_id = (request.args.get("student_id") or (request.get_json() or {}).get("student_id", "")).strip()
    if not student_id:
        return jsonify({"success": False, "message": "Student ID is required!"}), 400

    if request.method == "DELETE":
        ok = db.delete_self_reported_course(record_id, student_id)
        if ok:
            return jsonify({"success": True, "message": "Course deleted."})
        else:
            return jsonify({"success": False, "message": "Delete failed."}), 400

    elif request.method == "PUT":
        data = request.get_json() or {}
        course_code  = data.get("course_code", "").strip()
        course_name  = data.get("course_name", "").strip()
        credits      = data.get("credits")
        grade        = data.get("grade") or ""
        year         = data.get("year") or ""
        semester     = data.get("semester") or ""
        proof_url    = data.get("proof_url") or ""

        grade        = grade.strip()
        year         = year.strip()
        semester     = semester.strip()
        proof_url    = proof_url.strip()

        if not course_code or not course_name or credits is None:
            return jsonify({"success": False, "message": "course_code, course_name and credits are required!"}), 400

        try:
            credits = float(credits)
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "credits must be a number!"}), 400

        success, result = db.update_self_reported_course(record_id, student_id, course_code, course_name, credits, grade, year, semester, proof_url)
        if success:
            return jsonify({"success": True, "course": result})
        else:
            return jsonify({"success": False, "message": result}), 400

