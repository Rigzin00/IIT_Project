import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses from './pages/student/StudentCourses';
import ProfessorDashboard from './pages/professor/ProfessorDashboard';
import ProfessorRegistrations from './pages/professor/ProfessorRegistrations';
import AdminStudents from './pages/admin/AdminStudents';
import AdminPolicy from './pages/admin/AdminPolicy';
import AdminExport from './pages/admin/AdminExport';

// Default page per role
const DEFAULT_PAGE: Record<string, string> = {
  student:   'student-dashboard',
  professor: 'prof-dashboard',
  admin:     'admin-students',
};

function PortalApp() {
  const { isLoggedIn, role } = useAuth();
  const [page, setPage] = useState('');

  // When role changes (login/logout), reset to default page
  useEffect(() => {
    if (role) setPage(DEFAULT_PAGE[role] || '');
    else setPage('');
  }, [role]);

  if (!isLoggedIn) return <Login />;

  const renderPage = () => {
    switch (page) {
      case 'student-dashboard':   return <StudentDashboard />;
      case 'student-courses':     return <StudentCourses />;
      case 'prof-dashboard':      return <ProfessorDashboard />;
      case 'prof-registrations':  return <ProfessorRegistrations />;
      case 'admin-students':      return <AdminStudents />;
      case 'admin-policy':        return <AdminPolicy />;
      case 'admin-export':        return <AdminExport />;
      default:                    return <div className="page-body" style={{ color: 'var(--text-muted)', padding: '3rem', textAlign: 'center' }}>Select a section from the sidebar.</div>;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default PortalApp;
