# Academic Minor Course Registration System

A robust, full-stack web application designed to streamline the administration, teaching, and student enrollment processes for Minor academic programs. Built with a modern architecture ensuring scalability, security, and a seamless user experience.

## 🚀 Tech Stack

### Frontend
* **Framework:** React 18 with TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (with Lucide React icons)
* **Routing:** React Router DOM
* **State Management:** React Context API (Auth Context, Toast Context)
* **Session Persistence:** `sessionStorage` (Ensures secure auto-logout on tab close)

### Backend
* **Framework:** Flask (Python)
* **Database:** Supabase (PostgreSQL) via `supabase-py`
* **Security:** `Flask-Limiter` for Rate Limiting (Memory Storage), Global Error Handlers
* **Architecture:** Modular Blueprint routing (`routes/admin.py`, `routes/auth.py`, etc.)

---

## ✨ Key Features & Portals

### 1. 🛡️ Administrator Portal
* **Policy Management:** Dynamically configure eligible year groups (e.g., allow only Year 3 and Year 4 students to register).
* **Student Directory:** View all registered students with full-stack **pagination, server-side search, and sorting**.
* **Data Export:** Export student and registration records on the fly to **CSV** or **XLSX** formats.
* **Security Oversight:** Monitor login policies and enforce secure session boundaries.

### 2. 👨‍🏫 Professor Portal
* **Dashboard:** High-level metrics tracking total course capacities and pending pre-registration approvals.
* **Pre-Registration Handling:** Accept or Reject student minor registration requests.
* **Grading System:** Input and commit end-of-semester grades.
* **Advanced Filtering:** View student applications with details on their current CGPA and previously completed courses.

### 3. 🎓 Student Portal
* **Academic Profile:** Live tracking of completed credits, Minor GPA, and current registration statuses.
* **Course Catalog:** Browse available minor courses with full pagination and keyword search.
* **One-Click Registration:** Effortlessly send pre-registration requests to course professors.

---

## 🛠️ System Architecture & Workflow

### Authentication Flow (SSO Simulation)
1. User enters their academic email (`@institute.edu`) and selects their Role (Admin, Professor, Student).
2. The `auth_login` endpoint intercepts the request.
3. A strict Rate Limiter (10 requests/min) prevents brute-force abuse.
4. The backend verifies the user in the respective Supabase tables.
5. If eligible (based on global Admin Policies), a session is instantiated and stored securely in the frontend `sessionStorage`.

### Pagination & Search Workflow
To accommodate thousands of students and registrations without performance degradation:
* **Frontend:** Components pass `page`, `limit`, `search`, `sort`, and `order` parameters via URL query strings.
* **Backend:** Supabase `.range(start, end)` is utilized to fetch only the requested subset of data.
* **Metadata:** The backend returns a precise `pagination` block (`total`, `total_pages`, etc.) using Supabase's `count="exact"` functionality.
* **Search:** Handled entirely server-side utilizing complex `.or_()` clauses across relational tables.

---

## ⚙️ Local Development Setup

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* Supabase Account & Project

### 1. Database Configuration
Ensure your Supabase project contains the required schemas (`students`, `professors`, `courses`, `registrations`, `completed_courses`, `settings`). 

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create environment variables file
# Add: SUPABASE_URL=your_url, SUPABASE_KEY=your_key
touch .env

# Run the Flask development server (runs on Port 5000)
python app.py
```

### 3. Frontend Setup
Navigate to the `react_frontend` directory:
```bash
cd react_frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

---

## 🧪 Testing

The backend includes a comprehensive integration test suite.
To verify core pathways (SSO constraints, database insertions, grade recalculations, pagination endpoints), run:
```bash
cd backend
python test_api.py
```

---
*Built with ❤️ for Institute Academics.*