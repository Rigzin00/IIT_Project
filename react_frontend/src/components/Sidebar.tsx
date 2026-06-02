import { GraduationCap, Users, ShieldCheck, LayoutDashboard, BookOpen, ClipboardList, UserCog, Settings, Download, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

const studentLinks = [
  { id: 'student-dashboard', label: 'My Profile', icon: LayoutDashboard },
  { id: 'student-courses',   label: 'Course Registration', icon: BookOpen },
];

const professorLinks = [
  { id: 'prof-dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'prof-registrations',  label: 'Registrations', icon: ClipboardList },
];

const adminLinks = [
  { id: 'admin-students', label: 'Students',  icon: Users },
  { id: 'admin-policy',   label: 'Policy',    icon: Settings },
  { id: 'admin-export',   label: 'Export',    icon: Download },
];

const roleInfo: Record<string, { label: string; icon: typeof GraduationCap; color: string }> = {
  student:   { label: 'Student Portal',     icon: GraduationCap, color: '#22c55e' },
  professor: { label: 'Professor Portal',   icon: UserCog,       color: '#f59e0b' },
  admin:     { label: 'Admin Portal',       icon: ShieldCheck,   color: '#6366f1' },
};

export default function Sidebar({ activePage, onNavigate }: Props) {
  const { role, user, logout } = useAuth();
  if (!role) return null;

  const links = role === 'student' ? studentLinks : role === 'professor' ? professorLinks : adminLinks;
  const info = roleInfo[role];
  const Icon = info.icon;
  const userName = user && 'name' in user ? (user as { name: string }).name : 'User';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={16} color="var(--accent-light)" />
          </div>
          <div>
            <div className="sidebar-logo-title">AcadPortal</div>
            <div className="sidebar-logo-sub">Institute Management</div>
          </div>
        </div>
        {/* Role badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bg-base)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <Icon size={12} color={info.color} />
          <span style={{ fontSize: 11, fontWeight: 600, color: info.color }}>{info.label}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">Navigation</div>
        {links.map(({ id, label, icon: NavIcon }) => (
          <button
            key={id}
            className={`sidebar-link ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <NavIcon size={15} />
            <span>{label}</span>
            {activePage === id && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userName}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
