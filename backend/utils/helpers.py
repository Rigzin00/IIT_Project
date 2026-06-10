import math
from database import db

# Helper to check student login/registration eligibility based on batch year in roll number.
# Roll number format: YYYYDEPTnnnn (e.g. 2023EE1012 → batch year 2023)
def is_student_eligible(roll_number, settings):
    try:
        min_year = int(settings.get("min_eligible_year", 2020))
        max_year = int(settings.get("max_eligible_year", 2030))
        batch_year = int(str(roll_number)[:4])  # Extract first 4 digits
        return min_year <= batch_year <= max_year
    except (ValueError, TypeError):
        return True  # Default to True if roll number is malformed or config error

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
