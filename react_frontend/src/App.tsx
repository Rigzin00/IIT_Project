import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';

// Lazy-load dashboard pages to keep the initial bundle small
const StudentDashboard      = React.lazy(() => import('./pages/student/StudentDashboard'));
const StudentCourses        = React.lazy(() => import('./pages/student/StudentCourses'));
const ProfessorDashboard    = React.lazy(() => import('./pages/professor/ProfessorDashboard'));
const ProfessorRegistrations = React.lazy(() => import('./pages/professor/ProfessorRegistrations'));
const AdminStudents         = React.lazy(() => import('./pages/admin/AdminStudents'));
const AdminPolicy           = React.lazy(() => import('./pages/admin/AdminPolicy'));
const AdminExport           = React.lazy(() => import('./pages/admin/AdminExport'));
const AdminCSECourses       = React.lazy(() => import('./pages/admin/AdminCSECourses'));
const AdminUpcomingCourses  = React.lazy(() => import('./pages/admin/AdminUpcomingCourses'));

// Default landing page per role
const DEFAULT_PAGE: Record<string, string> = {
  student:   'student-dashboard',
  professor: 'prof-dashboard',
  admin:     'admin-students',
};

// ── ProtectedRoute ──────────────────────────────────────────────────────────────
// Waits for the AuthContext session check to finish, then either renders the
// child content or redirects to /login.  The `isLoading` guard prevents a flash
// of the login page while the backend session check is in flight.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="w-10 h-10 rounded-full border-4 border-[#E5E7EB] border-t-[#C41212] animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── Portal (authenticated shell) ───────────────────────────────────────────────
function PortalApp() {
  const { role } = useAuth();
  const [page, setPage] = useState('');

  // Reset to the role's default page whenever the user logs in/switches role
  useEffect(() => {
    if (role) setPage(DEFAULT_PAGE[role] || '');
    else setPage('');
  }, [role]);

  const renderPage = () => {
    switch (page) {
      case 'student-dashboard':      return <StudentDashboard />;
      case 'student-courses':        return <StudentCourses />;
      case 'prof-dashboard':         return <ProfessorDashboard />;
      case 'prof-registrations':     return <ProfessorRegistrations />;
      case 'admin-students':         return <AdminStudents />;
      case 'admin-cse-courses':      return <AdminCSECourses />;
      case 'admin-upcoming-courses': return <AdminUpcomingCourses />;
      case 'admin-policy':           return <AdminPolicy />;
      case 'admin-export':           return <AdminExport />;
      default:
        return <div className="p-12 text-center text-[#9CA3AF]">Select a section from the sidebar.</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main key={page} className="flex-1 overflow-x-hidden animate-[fadeIn_0.35s_ease-out] pt-[52px] md:pt-0">
        <Suspense fallback={<div className="p-12 text-center text-[#9CA3AF]">Loading module…</div>}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
}

// ── Root with router ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*
          /login — always renders the login page.
          No auth guard: even an authenticated user can visit /login without
          being automatically redirected (they just see the login button again).
        */}
        <Route path="/login" element={<Login />} />

        {/*
          /auth/callback — renders the OAuthCallback page.
          The backend redirects here after IIT Delhi authentication.
          No auth guard: the session has not been hydrated into React yet.
        */}
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/*
          / — protected dashboard shell.
          ProtectedRoute waits for the backend session check before routing.
        */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <PortalApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
