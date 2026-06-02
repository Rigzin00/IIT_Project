import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000"

def run_tests():
    print("=== STARTING ACADEMIC PORTAL INTEGRATION TESTS ===")
    
    # 1. Test Admin Login
    print("\n1. Testing Administrator SSO Login...")
    payload = {"email": "admin@institute.edu", "role": "admin"}
    res = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 2. Test Professor Login
    print("\n2. Testing Professor SSO Login (Dr. Ramesh Kumar)...")
    payload = {"email": "ramesh.kumar@institute.edu", "role": "professor"}
    res = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True
    prof_id = res.json()["user"]["id"]

    # 3. Test Student Login (Eligible: Rigzin Angdu, Year 3)
    print("\n3. Testing Student SSO Login (Rigzin Angdu - Eligible)...")
    payload = {"email": "rigzin.angdu@institute.edu", "role": "student"}
    res = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True
    student_id = res.json()["user"]["id"]

    # 4. Test Student Login (Ineligible: Rahul Varma, Year 2)
    print("\n4. Testing Student SSO Login (Rahul Varma - Ineligible based on default policy)...")
    payload = {"email": "rahul.varma@institute.edu", "role": "student"}
    res = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    # Should be blocked by default registration policy (Years 3-4 allowed only)
    assert res.status_code == 403
    assert res.json()["success"] is False

    # 5. Fetch Student Profile (Rigzin)
    print("\n5. Fetching Student Academic Profile (Rigzin)...")
    res = requests.get(f"{BASE_URL}/api/student/profile?student_id={student_id}")
    print(f"Status: {res.status_code}")
    print(f"Stats: {res.json()['stats']}")
    assert res.status_code == 200
    assert "completed" in res.json()
    assert "registrations" in res.json()

    # 6. Student Pre-Registers for Artificial Intelligence (CS401)
    print("\n6. Submitting Course Pre-registration request (Rigzin -> CS401)...")
    payload = {"student_id": student_id, "course_id": "CS401"}
    res = requests.post(f"{BASE_URL}/api/student/register", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True
    reg_id = res.json()["registration_id"]

    # 7. Professor Retrieves Registrations List
    print(f"\n7. Retrieving Professor Registrations directory for Professor {prof_id}...")
    res = requests.get(f"{BASE_URL}/api/professor/registrations?professor_id={prof_id}")
    print(f"Status: {res.status_code}")
    registrations = res.json()["registrations"]
    # Find the registration we just created
    target_reg = [r for r in registrations if r["registration_id"] == reg_id]
    print(f"Found our pre-registration matching ID: {len(target_reg) > 0}")
    assert res.status_code == 200
    assert len(target_reg) > 0

    # 8. Professor Approves Student Registration
    print(f"\n8. Approving pre-registration request (Registration ID: {reg_id})...")
    payload = {"registration_id": reg_id, "status": "approved"}
    res = requests.post(f"{BASE_URL}/api/professor/action", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 9. Professor Updates/Submits Semester Grade
    print(f"\n9. Submitting End-of-Semester grade (Registration ID: {reg_id} -> Grade: A)...")
    payload = {"registration_id": reg_id, "grade": "A"}
    res = requests.post(f"{BASE_URL}/api/professor/grade", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 10. Verify Completed Courses updated and CGPA updated
    print("\n10. Fetching Student Profile to verify grade insertion and GPA recalculation...")
    res = requests.get(f"{BASE_URL}/api/student/profile?student_id={student_id}")
    profile = res.json()["profile"]
    completed = res.json()["completed"]
    print(f"Rigzin's Updated CGPA: {profile['cgpa']}")
    print(f"Completed Courses count (Should have increased): {len(completed)}")
    assert res.status_code == 200
    # CS401 should be in completed list now
    assert any(c["course_id"] == "CS401" and c["grade"] == "A" for c in completed)

    # 11. Administrator Modifies System Policies (Allow Years 2-4)
    print("\n11. Modifying Sign-up/Login Registration Policy (Allow Years 2 to 4)...")
    payload = {"min_eligible_year": 2, "max_eligible_year": 4}
    res = requests.post(f"{BASE_URL}/api/admin/policy", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 12. Retry Student Login (Ineligible before: Rahul Varma, Year 2)
    print("\n12. Re-trying Student SSO Login (Rahul Varma - Should be ELIGIBLE now!)...")
    payload = {"email": "rahul.varma@institute.edu", "role": "student"}
    res = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 13. Test CSV Data Export endpoint
    print("\n13. Testing dynamic CSV export for Year=3, Department=CSE...")
    res = requests.get(f"{BASE_URL}/api/export?role=admin&year=3&department=CSE&format=csv")
    print(f"Status: {res.status_code}, Content Length: {len(res.content)} bytes")
    print(f"Output Head:\n{res.content.decode('utf-8')[:200]}")
    assert res.status_code == 200
    assert b"Roll Number" in res.content

    print("\n=== ALL INTEGRATION TESTS PASSED TRIUMPHANTLY! ===")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\n❌ TEST RUN ENCOUNTERED AN ERROR: {e}")
        sys.exit(1)
