import { GraduationCap, Users, ShieldCheck, LayoutDashboard, BookOpen, ClipboardList, UserCog, Settings, Download, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

const studentLinks = [
  { id: 'student-dashboard', label: 'My Profile',          icon: LayoutDashboard },
  { id: 'student-courses',   label: 'Course Registration', icon: BookOpen },
];

const professorLinks = [
  { id: 'prof-dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'prof-registrations', label: 'Registrations', icon: ClipboardList },
];

const adminLinks = [
  { id: 'admin-students', label: 'Students', icon: Users },
  { id: 'admin-policy',   label: 'Policy',   icon: Settings },
  { id: 'admin-export',   label: 'Export',   icon: Download },
];

const roleInfo: Record<string, { label: string; icon: typeof GraduationCap; color: string }> = {
  student:   { label: 'Student Portal',   icon: GraduationCap, color: '#22c55e' },
  professor: { label: 'Professor Portal', icon: UserCog,       color: '#f59e0b' },
  admin:     { label: 'Admin Portal',     icon: ShieldCheck,   color: '#6366f1' },
};

export default function Sidebar({ activePage, onNavigate }: Props) {
  const { role, user, logout } = useAuth();
  if (!role) return null;

  const links    = role === 'student' ? studentLinks : role === 'professor' ? professorLinks : adminLinks;
  const info     = roleInfo[role];
  const Icon     = info.icon;
  const userName = user && 'name' in user ? (user as { name: string }).name : 'User';

  return (
    <aside className="sc-sidebar">

      {/* ── Red top accent bar ── */}
      <div className="sc-sidebar-topbar" />

      {/* ── Brand ── */}
      <div className="sc-sidebar-logo">
        <div className="sc-sidebar-brand">
          <div className="sc-sidebar-brand-icon">
            <GraduationCap size={17} color="#C41212" />
          </div>
          <div>
            <div className="sc-sidebar-brand-name">AcadPortal</div>
            <div className="sc-sidebar-brand-sub">Institute Management</div>
          </div>
        </div>

        {/* Role label — same color for all roles to stay on-theme */}
        <div className="sc-sidebar-role">
          <Icon size={11} color="#C41212" />
          <span>{info.label}</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sc-sidebar-nav">
        <div className="sc-sidebar-section">Navigation</div>
        {links.map(({ id, label, icon: NavIcon }) => (
          <button
            key={id}
            className={`sc-sidebar-link${activePage === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <NavIcon size={15} />
            <span>{label}</span>
            {activePage === id && (
              <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.35 }} />
            )}
          </button>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="sc-sidebar-footer">
        <div className="sc-sidebar-username">{userName}</div>
        <button className="sc-sidebar-signout" onClick={logout}>
          Sign out
        </button>
      </div>

    </aside>
  );
}