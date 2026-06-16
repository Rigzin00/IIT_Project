import math
from functools import wraps
from flask import request, jsonify
from database import db

# Extract the batch year from a student's roll number.
# Roll number format: YYYYDEPTnnnn (e.g. 2023EE1012 → 2023)
# Returns None if the roll number is missing, too short, or non-numeric prefix.
def get_batch_year(roll_number):
    try:
        if not roll_number or len(str(roll_number)) < 4:
            return None
        prefix = str(roll_number)[:4]
        if not prefix.isdigit():
            return None
        return int(prefix)
    except (ValueError, TypeError):
        return None

# Check eligibility: student's batch year must fall within the admin-set policy window.
# Denies access if roll number is malformed — never crashes on bad data.
def is_student_eligible(roll_number, settings):
    batch_year = get_batch_year(roll_number)
    if batch_year is None:
        return False  # Malformed roll number → deny (fail-secure)
    try:
        min_year = int(settings.get("min_eligible_year", 2020))
        max_year = int(settings.get("max_eligible_year", 2030))
        return min_year <= batch_year <= max_year
    except (ValueError, TypeError):
        return False  # Malformed settings → deny (fail-secure)

def build_pagination_metadata(total_count, page, limit):
    total_pages = math.ceil(total_count / limit) if total_count > 0 else 0
    return {
        "page": page,
        "limit": limit,
        "total": total_count,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }

# Helper to verify Admin credentials
# Fetches the admin email list dynamically from system_settings.
# No longer hardcoded — admins can be added or revoked via the Admin Policy panel.
def verify_admin(email):
    from database import db
    settings = db.get_system_settings()
    raw = settings.get("admin_emails", "")
    allowed = [e.strip().lower() for e in raw.split(",") if e.strip()]
    if email.lower().strip() in allowed:
        return {
            "name": "Institute Administrator",
            "email": email.lower().strip(),
            "department": "Administration"
        }
    return None

# ── Simple role-based access control ──────────────────────────────────────────
# Reads the X-Role header sent by the frontend and rejects requests whose
# declared role is not in the allowed list.  This is a lightweight guard;
# the export route additionally re-validates the email against the database.
def require_role(*roles):
    """Decorator: only allow requests whose X-Role header is in `roles`."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            role = request.headers.get('X-Role', '').lower()
            if role not in [r.lower() for r in roles]:
                return jsonify({"success": False, "message": "Unauthorized."}), 401
            return f(*args, **kwargs)
        return wrapper
    return decorator
