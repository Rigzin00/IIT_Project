import requests

print("Testing CSE Courses Upload:")
with open(r"C:\Users\Rigzin Angtak\OneDrive\Desktop\TODO\test_upload.csv", "rb") as f:
    res = requests.post("http://127.0.0.1:5000/courses/upload", headers={"X-Role": "admin"}, files={"file": f})
    print(res.status_code)
    print(res.json())

print("\nTesting Upcoming Courses Upload:")
with open(r"C:\Users\Rigzin Angtak\OneDrive\Desktop\TODO\test_upcoming_upload.csv", "rb") as f:
    res = requests.post("http://127.0.0.1:5000/upcoming-courses/upload", headers={"X-Role": "admin"}, files={"file": f})
    print(res.status_code)
    print(res.json())
