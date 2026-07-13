from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import build_pagination_metadata, require_role, get_professor_from_request

professor_bp = Blueprint('professor', __name__)

PROF_SORT_COLS = {'id', 'student_name', 'roll_number', 'course_name', 'status', 'cgpa', 'grade'}

# ── Identity guard ─────────────────────────────────────────────────────────────
def _get_professor_or_401():
    """Resolve the authenticated professor from the JWT cookie."""
    prof = get_professor_from_request(request)
    if not prof:
        return None, (jsonify({"success": False, "message": "Not authenticated."}), 401)
    return prof, None

@professor_bp.route("/dashboard", methods=["GET"])
@require_role('professor')
def professor_dashboard():
    prof_id = request.args.get("professor_id")
    if not prof_id:
        return jsonify({"success": False, "message": "Professor ID is required!"}), 400

    dash_data = db.get_professor_dashboard(prof_id)
    if not dash_data:
        return jsonify({"success": False, "message": "Professor profile not found!"}), 404

    return jsonify({
        "success": True,
        **dash_data
    })

@professor_bp.route("/registrations", methods=["GET"])
@require_role('professor')
def professor_registrations():
    prof_id = request.args.get("professor_id")
    if not prof_id:
        return jsonify({"success": False, "message": "Professor ID is required!"}), 400

    try:
        page = max(int(request.args.get('page', 1)), 1)
        limit = min(max(int(request.args.get('limit', 50)), 1), 100)
    except ValueError:
        page, limit = 1, 50
        
    search = request.args.get('search', '').strip()
    sort = request.args.get('sort', 'id').strip()
    order = request.args.get('order', 'asc').strip()
    sort = sort if sort in PROF_SORT_COLS else 'id'
    order = 'desc' if order == 'desc' else 'asc'

    regs, total = db.get_professor_registrations(prof_id, page, limit, search, sort, order)
    
    # We will also pull all historical completed courses to let professor check "has done course C"
    all_completions = db.get_all_completed_courses_grouped()
    
    # Fetch self-reported courses for all students in one batch query
    student_ids = list({r["student_id"] for r in regs if r.get("student_id")})
    self_reported_map = db.get_self_reported_courses_for_students(student_ids)
    
    # Map completions to student registrations to provide high-fidelity dashboard metrics
    for reg in regs:
        student_id = reg["student_id"]
        # Find which courses this student completed
        completed = [c["course_id"] for c in all_completions if c["student_id"] == student_id]
        reg["completed_courses_ids"] = completed
        
        # Build nice text array for frontend display
        completed_full = [f"{c['course_id']} ({c['grade']})" for c in all_completions if c["student_id"] == student_id]
        reg["completed_courses_list"] = completed_full

        # Attach self-reported prior courses for this student
        reg["self_reported_courses"] = self_reported_map.get(student_id, [])

    return jsonify({
        "success": True,
        "registrations": regs,
        "pagination": build_pagination_metadata(total, page, limit)
    })

@professor_bp.route("/action", methods=["POST"])
@require_role('professor')
def professor_action():
    # Resolve professor from JWT — do not trust prof_id from the request body
    prof, err = _get_professor_or_401()
    if err:
        return err

    data = request.get_json() or {}
    reg_id = data.get("registration_id")
    status = data.get("status")  # 'approved' or 'rejected'

    if not reg_id or status not in ["approved", "rejected"]:
        return jsonify({"success": False, "message": "Registration ID and valid status ('approved'/'rejected') are required!"}), 400

    # Pass professor_id to DB so it can enforce course ownership
    success = db.approve_registration(reg_id, status, professor_id=prof["id"])
    if success:
        return jsonify({"success": True, "message": f"Pre-registration {status} successfully!"})
    else:
        return jsonify({"success": False, "message": "Registration not found or you do not have permission to update it."}), 403

@professor_bp.route("/grade", methods=["POST"])
@require_role('professor')
def professor_grade():
    # Resolve professor from JWT — do not trust prof_id from the request body
    prof, err = _get_professor_or_401()
    if err:
        return err

    data = request.get_json() or {}
    reg_id = data.get("registration_id")
    grade = data.get("grade", "").strip().upper()  # A, A-, B, B-, etc.

    if not reg_id or not grade:
        return jsonify({"success": False, "message": "Registration ID and Grade are required!"}), 400

    # Pass professor_id to DB so it can enforce course ownership
    success = db.update_registration_grade(reg_id, grade, professor_id=prof["id"])
    if success:
        return jsonify({"success": True, "message": "Student grade updated successfully! Academic record synchronized."})
    else:
        return jsonify({"success": False, "message": "Registration not found or you do not have permission to grade it."}), 403

@professor_bp.route("/courses/<course_id>", methods=["PUT"])
@require_role('professor')
def professor_update_course(course_id):
    # Resolve professor from JWT — do not trust prof_id from the request body
    prof, err = _get_professor_or_401()
    if err:
        return err

    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description", "")
    credits = data.get("credits")
    department = data.get("department")
    is_minor_eligible = data.get("is_minor_eligible", False)

    if not name or not credits or not department:
        return jsonify({"success": False, "message": "Missing required fields!"}), 400

    # DB layer enforces professor_id ownership (course must belong to this prof)
    success, message = db.update_course_by_prof(course_id, prof["id"], name, description, credits, department, is_minor_eligible)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "message": message}), 400
