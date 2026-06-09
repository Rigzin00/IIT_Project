# Helper to check student login eligibility
def is_student_eligible(student_year, settings):
    try:
        min_year = int(settings.get("min_eligible_year", 3))
        max_year = int(settings.get("max_eligible_year", 4))
        return min_year <= int(student_year) <= max_year
    except ValueError:
        return True # Default to True if configuration error

# Helper to verify Admin credentials
def verify_admin(email):
    if email == "admin@institute.edu":
        return {
            "name": "Institute Administrator",
            "email": "admin@institute.edu",
            "department": "Administration"
        }
    return None
