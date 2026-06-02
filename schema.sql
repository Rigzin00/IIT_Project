-- Academic Portal - Supabase & PostgreSQL Schema

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed System Settings
INSERT INTO system_settings (key, value) VALUES
('min_eligible_year', '3'),
('max_eligible_year', '4')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- 2. Professors Table
CREATE TABLE IF NOT EXISTS professors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Professors
INSERT INTO professors (id, name, email, department) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Dr. Arpan Sen', 'arpan.sen@institute.edu', 'CSE'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Prof. Sunita Sharma', 'sunita.sharma@institute.edu', 'CSE'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Dr. Ramesh Kumar', 'ramesh.kumar@institute.edu', 'ECE')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department;


-- 3. Students Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    year_of_study INTEGER NOT NULL,
    cgpa NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    is_approved_for_login BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Students
INSERT INTO students (id, roll_number, name, email, department, year_of_study, cgpa, is_approved_for_login) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', '2023CSE1021', 'Rigzin Angdu', 'rigzin.angdu@institute.edu', 'CSE', 3, 8.75, TRUE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '2023ECE1045', 'Siddharth Patel', 'siddharth.patel@institute.edu', 'ECE', 3, 9.10, TRUE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', '2022ME1082', 'Ananya Gupta', 'ananya.gupta@institute.edu', 'ME', 4, 7.80, TRUE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', '2024CSE1005', 'Rahul Varma', 'rahul.varma@institute.edu', 'CSE', 2, 8.20, TRUE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', '2023EE1012', 'Priya Nair', 'priya.nair@institute.edu', 'EE', 3, 6.45, TRUE)
ON CONFLICT (email) DO UPDATE SET roll_number = EXCLUDED.roll_number, name = EXCLUDED.name, department = EXCLUDED.department, year_of_study = EXCLUDED.year_of_study, cgpa = EXCLUDED.cgpa, is_approved_for_login = EXCLUDED.is_approved_for_login;


-- 4. Courses Table (specifically CSE courses available for minor)
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY, -- Course Code e.g. 'CS301'
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    department TEXT NOT NULL DEFAULT 'CSE',
    professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
    is_minor_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT
);

-- Seed CSE Courses
INSERT INTO courses (id, name, credits, department, professor_id, is_minor_eligible, description) VALUES
('CS101', 'Introduction to Computer Programming', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', TRUE, 'Basic concepts of programming using Python, algorithms, and simple data structures.'),
('CS201', 'Data Structures and Algorithms', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', TRUE, 'Advanced data representations: trees, graphs, sorting, searching, and algorithmic analysis.'),
('CS202', 'Discrete Mathematical Structures', 3, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', TRUE, 'Logic, sets, relations, functions, graph theory, combinatorics, and algebraic systems.'),
('CS301', 'Database Management Systems', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', TRUE, 'Relational databases, SQL, database design, normalization, transactions, and indexing.'),
('CS302', 'Operating Systems', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', TRUE, 'Processes, threads, CPU scheduling, synchronization, memory management, and file systems.'),
('CS401', 'Artificial Intelligence and ML', 4, 'CSE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', TRUE, 'Introduction to neural networks, machine learning algorithms, deep learning, and state space search.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, professor_id = EXCLUDED.professor_id, description = EXCLUDED.description;


-- 5. Completed Courses Table (Historical grades of CSE courses already completed)
CREATE TABLE IF NOT EXISTS completed_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    grade TEXT NOT NULL, -- A, A-, B, B-, C, C-, D, F
    semester TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Seed Completed Courses
INSERT INTO completed_courses (student_id, course_id, grade, semester) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS101', 'A', 'Fall 2024'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS201', 'B+', 'Spring 2025'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS101', 'A', 'Fall 2024'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS201', 'A', 'Spring 2025'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS202', 'A-', 'Spring 2025'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS101', 'B', 'Fall 2023'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS201', 'B-', 'Spring 2024'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'CS101', 'C+', 'Fall 2024')
ON CONFLICT (student_id, course_id) DO NOTHING;


-- 6. Registrations Table (Pre-registration and active courses)
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    grade TEXT, -- Nullable, filled at end of semester
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Seed Registrations (Simulating pending/approved pre-registrations)
INSERT INTO registrations (student_id, course_id, status, grade) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS301', 'approved', NULL),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'CS302', 'pending', NULL),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CS301', 'pending', NULL),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS301', 'approved', 'B'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'CS401', 'pending', NULL),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'CS201', 'rejected', NULL)
ON CONFLICT (student_id, course_id) DO NOTHING;
