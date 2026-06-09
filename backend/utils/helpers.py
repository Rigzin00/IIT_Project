import math
from database import db

# Helper to check student login eligibility
def is_student_eligible(student_year, settings):
    try:
        min_year = int(settings.get("min_eligible_year", 3))
        max_year = int(settings.get("max_eligible_year", 4))
        return min_year <= int(student_year) <= max_year
    except ValueError:
        return True # Default to True if configuration error

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
