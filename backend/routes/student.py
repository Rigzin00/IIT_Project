from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import build_pagination_metadata, require_role
from utils.helpers import is_student_eligible, get_student_from_request

student_bp = Blueprint('student', __name__)

STUDENT_SORT_COLS = {'name', 'credits', 'department', 'professor_name'}

# ── Identity guard ─────────────────────────────────────────────────────────────
# All student routes call this to get the authenticated student from the JWT
# cookie. The client-supplied student_id in the request body/params is IGNORED
# — we always use the identity proven by the JWT to prevent IDOR attacks.

def _get_student_or_401():
    """Resolve the authenticated student from the JWT cookie.
    Returns (student_dict, None) on success or (None, error_response) on failure."""
    student = get_student_from_request(request)
    if not student:
        return None, (jsonify({"success": False, "message": "Not authenticated."}), 401)
    return student, None


@student_bp.route("/profile", methods=["GET"])
@require_role('student')
def student_profile():
    # Get identity from JWT — ignore any student_id param from client
    student, err = _get_student_or_401()
    if err:
        return err

    student_id = student["id"]
    completed = db.get_student_completed_courses(student_id)
    registrations = db.get_student_registrations(student_id)

    # Credit-weighted Minor GPA calculation
    total_credits = 0
    total_grade_points = 0.0
    grade_scale = {
        'A+': 10.0, 'A': 10.0, 'A-': 9.0, 'B+': 8.0, 'B': 8.0, 'B-': 7.0, 'C+': 6.0, 'C': 6.0, 'C-': 5.0, 'D': 4.0, 'F': 0.0
    }
    
    for item in completed:
        creds = float(item.get("credits", 0))
        total_credits += creds
        raw_grade = item.get("grade")
        if raw_grade:
            grade_val = grade_scale.get(raw_grade.strip().upper(), 7.0)
            total_grade_points += (grade_val * creds)

    minor_gpa = round(total_grade_points / total_credits, 2) if total_credits > 0 else 0.0

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

@student_bp.route("/update-cgpa", methods=["POST"])
@require_role('student')
def update_cgpa():
    # Get identity from JWT — ignore student_id from request body
    student, err = _get_student_or_401()
    if err:
        return err

    data = request.get_json() or {}
    new_cgpa = data.get("cgpa")
    
    if new_cgpa is None:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
        
    try:
        new_cgpa_float = float(new_cgpa)
        if new_cgpa_float < 0 or new_cgpa_float > 10:
            return jsonify({"success": False, "message": "CGPA must be between 0 and 10"}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Invalid CGPA format"}), 400
        
    if db.update_student_cgpa(student["id"], new_cgpa_float):
        return jsonify({"success": True, "message": "CGPA updated successfully"})
    return jsonify({"success": False, "message": "Failed to update CGPA"}), 500

@student_bp.route("/catalog", methods=["GET"])
@require_role('student')
def get_course_catalog():
    courses = db.get_all_course_codes()
    return jsonify({"success": True, "catalog": courses})

@student_bp.route("/courses", methods=["GET"])
@require_role('student')
def student_courses():
    try:
        page = max(int(request.args.get('page', 1)), 1)
        limit = min(max(int(request.args.get('limit', 50)), 1), 100)
    except ValueError:
        page, limit = 1, 50
        
    search = request.args.get('search', '').strip()
    sort = request.args.get('sort', 'name').strip()
    order = request.args.get('order', 'asc').strip()
    sort = sort if sort in STUDENT_SORT_COLS else 'name'
    order = 'desc' if order == 'desc' else 'asc'

    courses, total = db.get_courses_for_pre_registration(page, limit, search, sort, order)
    return jsonify({
        "success": True, 
        "courses": courses,
        "pagination": build_pagination_metadata(total, page, limit)
    })

@student_bp.route("/upcoming-courses", methods=["GET"])
@require_role('student')
def student_upcoming_courses():
    courses = db.get_upcoming_courses()
    return jsonify({
        "success": True,
        "courses": courses
    })

@student_bp.route("/register", methods=["POST"])
@require_role('student')
def student_register():
    # Get identity from JWT — ignore student_id from request body
    student, err = _get_student_or_401()
    if err:
        return err

    data = request.get_json() or {}
    course_id = data.get("course_id")

    if not course_id:
        return jsonify({"success": False, "message": "Course ID is required!"}), 400

    # Enforce Admin Registration Policy using the DB-verified student record
    settings = db.get_system_settings()
    if not is_student_eligible(student.get("roll_number", ""), settings):
        return jsonify({
            "success": False,
            "message": "Registration is locked for your batch under current administration policies."
        }), 403

    success, message_or_id = db.register_course(student["id"], course_id)
    if success:
        return jsonify({"success": True, "message": "Pre-registration request submitted successfully!", "registration_id": message_or_id})
    else:
        return jsonify({"success": False, "message": message_or_id}), 400


# ── Self-Reported Prior Courses ────────────────────────────────────────────────

@student_bp.route("/self-reported", methods=["GET", "POST"])
@require_role('student')
def self_reported_courses():
    # Get identity from JWT — ignore student_id from request params/body
    student, err = _get_student_or_401()
    if err:
        return err

    student_id = student["id"]

    if request.method == "GET":
        courses = db.get_self_reported_courses(student_id)
        return jsonify({"success": True, "courses": courses})

    elif request.method == "POST":
        data = request.get_json() or {}
        course_code  = data.get("course_code", "").strip()
        course_name  = data.get("course_name", "").strip()
        credits      = data.get("credits")
        grade        = (data.get("grade") or "").strip()
        year         = (data.get("year") or "").strip()
        semester     = (data.get("semester") or "").strip()
        proof_url    = (data.get("proof_url") or "").strip()

        if not course_code or not course_name or credits is None:
            return jsonify({"success": False, "message": "course_code, course_name and credits are required!"}), 400

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
@require_role('student')
def self_reported_course_detail(record_id):
    # Get identity from JWT — ignore student_id from request params/body
    student, err = _get_student_or_401()
    if err:
        return err

    student_id = student["id"]

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
        grade        = (data.get("grade") or "").strip()
        year         = (data.get("year") or "").strip()
        semester     = (data.get("semester") or "").strip()
        proof_url    = (data.get("proof_url") or "").strip()

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
