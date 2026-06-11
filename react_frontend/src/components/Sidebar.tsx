import { useState } from 'react';
import { GraduationCap, Users, ShieldCheck, LayoutDashboard, BookOpen, ClipboardList, UserCog, Settings, Download, ChevronRight, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

const studentLinks = [
  { id: 'student-dashboard', label: 'My Profile', icon: LayoutDashboard },
  { id: 'student-courses', label: 'Course Registration', icon: BookOpen },
];

const professorLinks = [
  { id: 'prof-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'prof-registrations', label: 'Registrations', icon: ClipboardList },
];

const adminLinks = [
  { id: 'admin-students', label: 'Students', icon: Users },
  { id: 'admin-policy', label: 'Policy', icon: Settings },
  { id: 'admin-export', label: 'Export', icon: Download },
];

const roleInfo: Record<string, { label: string; icon: typeof GraduationCap; color: string }> = {
  student: { label: 'Student Portal', icon: GraduationCap, color: '#22c55e' },
  professor: { label: 'Professor Portal', icon: UserCog, color: '#f59e0b' },
  admin: { label: 'Admin Portal', icon: ShieldCheck, color: '#6366f1' },
};

export default function Sidebar({ activePage, onNavigate }: Props) {
  const { role, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!role) return null;

  const links = role === 'student' ? studentLinks : role === 'professor' ? professorLinks : adminLinks;
  const info = roleInfo[role];
  const Icon = info.icon;
  const userName = user && 'name' in user ? (user as { name: string }).name : 'User';

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false); // close drawer on mobile after navigation
  };

  /* ── Shared sidebar panel content ── */
  const SidebarContent = () => (
    <>
      {/* ── Red top accent bar ── */}
      <div className="sc-sidebar-topbar" />

      {/* ── Brand ── */}
      <div className="p-[16px_16px_32px] border-b border-[#E5E7EB]">
        <div className="flex items-center gap-[10px] mb-[10px]">
          <div className="w-[34px] h-[34px] border-l-[3px] border-[#C41212] flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="logo" className="w-[24px] h-[24px] object-contain ml-[2px] -mt-[5px]" />
          </div>
          <div>
            <div className="text-[24px] font-bold text-[#1F2937] leading-[1.25] tracking-[-0.1px]">AcadPortal</div>
            <div className="text-[10.5px] text-[#9CA3AF] mt-[1px] leading-[1.3]">Institute Management</div>
          </div>
        </div>

        {/* Role label */}
        <div className="inline-flex items-center gap-[5px] text-[10px] font-bold text-[#C41212] uppercase tracking-[0.8px]">
          <Icon size={11} color="#C41212" />
          <span>{info.label}</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 flex flex-col p-[8px_8px] gap-[1px]">
        <div className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-[1px] p-[8px_10px_5px]">Navigation</div>
        {links.map(({ id, label, icon: NavIcon }) => (
          <button
            key={id}
            className={`group relative flex items-center gap-[9px] w-full text-left p-[8px_10px] rounded-[4px] border-none text-[12.5px] font-semibold cursor-pointer transition-colors duration-[120ms] ${activePage === id
                ? 'bg-[#F5F5F5] text-[#C41212]'
                : 'bg-transparent text-[#555555] hover:bg-[#F5F5F5] hover:text-[#1F2937]'
              }`}
            onClick={() => handleNavigate(id)}
          >
            {activePage === id && (
              <div className="absolute left-0 top-[4px] bottom-[4px] w-[3px] bg-[#C41212] rounded-r-[2px]" />
            )}
            <NavIcon
              size={15}
              className={`shrink-0 transition-colors duration-[120ms] ${activePage === id ? 'text-[#C41212]' : 'text-[#9CA3AF] group-hover:text-[#555555]'
                }`}
            />
            <span>{label}</span>
            {activePage === id && (
              <ChevronRight size={12} className="ml-auto opacity-35" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="p-[12px_14px_16px] border-t border-[#E5E7EB]">
        <div className="text-[12px] font-semibold text-[#1F2937] mb-[8px] whitespace-nowrap overflow-hidden text-ellipsis">{userName}</div>
        <button
          className="w-full p-[6px_12px] border border-[#E5E7EB] rounded-[4px] bg-transparent text-[12px] font-bold text-[#555555] cursor-pointer tracking-[0.1px] transition-all duration-[150ms] text-center hover:border-[#C41212] hover:text-[#C41212] hover:bg-[#FEF2F2]"
          onClick={logout}
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ══════════════════════════════════════════
          MOBILE — Top bar + slide-in drawer
      ══════════════════════════════════════════ */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-[52px] bg-white border-b border-[#E5E7EB]"
        style={{ fontFamily: "'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        {/* Brand name on mobile top bar */}
        <div className="flex items-center gap-[8px]">
          <div className="w-[26px] h-[26px] border-l-[3px] border-[#C41212] flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="logo" className="w-[18px] h-[18px] object-contain ml-[2px] -mt-[4px]" />
          </div>
          <span className="text-[18px] font-bold text-[#1F2937] tracking-[-0.1px]">AcadPortal</span>
        </div>

        {/* Hamburger button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-[6px] rounded-[4px] text-[#555555] hover:bg-[#F5F5F5] hover:text-[#1F2937] transition-colors duration-[120ms] border-none bg-transparent cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-in drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-screen w-[260px] bg-white border-r border-[#E5E7EB] flex flex-col text-[#4B5563] transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ fontFamily: "'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-[12px] right-[12px] p-[5px] rounded-[4px] text-[#9CA3AF] hover:text-[#C41212] hover:bg-[#FEF2F2] transition-colors duration-[120ms] border-none bg-transparent cursor-pointer z-10"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>

        <SidebarContent />
      </aside>

      {/* ══════════════════════════════════════════
          DESKTOP — Static sidebar (unchanged)
      ══════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col sticky top-0 h-screen w-[220px] min-w-[220px] bg-white border-r border-[#E5E7EB] text-[#4B5563]"
        style={{ fontFamily: "'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}