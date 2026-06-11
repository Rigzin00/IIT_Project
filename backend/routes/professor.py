from flask import Blueprint, request, jsonify
from database import db
from utils.helpers import build_pagination_metadata, require_role

professor_bp = Blueprint('professor', __name__)

PROF_SORT_COLS = {'id', 'student_name', 'roll_number', 'course_name', 'status', 'cgpa', 'grade'}

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
    data = request.get_json() or {}
    reg_id = data.get("registration_id")
    status = data.get("status")  # 'approved' or 'rejected'

    if not reg_id or status not in ["approved", "rejected"]:
        return jsonify({"success": False, "message": "Registration ID and valid status ('approved'/'rejected') are required!"}), 400

    success = db.approve_registration(reg_id, status)
    if success:
        return jsonify({"success": True, "message": f"Pre-registration {status} successfully!"})
    else:
        return jsonify({"success": False, "message": "Failed to update registration or registration not found."}), 404

@professor_bp.route("/grade", methods=["POST"])
@require_role('professor')
def professor_grade():
    data = request.get_json() or {}
    reg_id = data.get("registration_id")
    grade = data.get("grade", "").strip().upper()  # A, A-, B, B-, etc.

    if not reg_id or not grade:
        return jsonify({"success": False, "message": "Registration ID and Grade are required!"}), 400

    success = db.update_registration_grade(reg_id, grade)
    if success:
        return jsonify({"success": True, "message": "Student grade updated successfully! Academic record synchronized."})
    else:
        return jsonify({"success": False, "message": "Failed to update grade or registration not found."}), 404
