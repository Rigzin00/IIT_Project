import math
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
def verify_admin(email):
    if email == "admin@institute.edu":
        return {
            "name": "Institute Administrator",
            "email": "admin@institute.edu",
            "department": "Administration"
        }
    return None
