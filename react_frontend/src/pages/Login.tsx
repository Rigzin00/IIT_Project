import { useState } from 'react';
import { GraduationCap, ShieldCheck, UserCog, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login } from '../api/auth';
import type { Role } from '../api/auth';
import { useAuth } from '../context/AuthContext';


const ROLES: { id: Role; label: string; icon: typeof GraduationCap; hint: string }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap, hint: 'e.g. rigzin.angdu@institute.edu' },
  { id: 'professor', label: 'Professor', icon: UserCog, hint: 'e.g. arpan.sen@institute.edu' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, hint: 'admin@institute.edu' },
];

const QUICK_CREDS = [
  { role: 'student' as Role, email: 'rigzin.angdu@institute.edu' },
  { role: 'professor' as Role, email: 'arpan.sen@institute.edu' },
  { role: 'admin' as Role, email: 'admin@institute.edu' },
];

export default function Login() {
  const { login: authLogin } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  const activeRole = ROLES.find(r => r.id === role)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const res = await login(email.trim().toLowerCase(), role);
      if (res.success && res.user && res.role) {
        authLogin(res.user, res.role);
      } else {
        setError(res.message || 'Login failed. Please try again.');
      }
    } catch {
      setError('Cannot reach server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] text-[14px] text-[#1F2937] font-['Open_Sans',sans-serif]">
      <div className="w-full max-w-[400px] px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="logo"
            className="w-[72px] h-[72px] object-contain mx-auto mb-4 opacity-90 grayscale-[20%]"
          />
          <div className="text-[20px] font-extrabold text-[#1F2937] tracking-tight">Academic Management System</div>
          <div className="text-[13.5px] text-[#6B7280] mt-1.5 font-semibold">Secure Authentication Portal</div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-md shadow-sm p-7">
          {/* Role Tabs */}
          <div className="flex border-b border-[#E5E7EB] mb-6">
            {ROLES.map(r => (
              <button
                key={r.id}
                className={`flex-1 pb-3 text-[13px] font-bold uppercase tracking-wider transition-colors outline-none border-b-[3px] ${
                  role === r.id
                    ? 'border-[#C41212] text-[#1F2937]'
                    : 'border-transparent text-[#9CA3AF] hover:text-[#4B5563]'
                }`}
                onClick={() => { setRole(r.id); setError(''); setEmail(''); setShowHint(false); }}
                type="button"
                id={`role-tab-${r.id}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="login-email" className="block text-[11.5px] font-bold text-[#4B5563] uppercase tracking-wider mb-2">
                Institute Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  className={`w-full block bg-white border rounded px-3.5 py-2.5 text-[14px] text-[#1F2937] outline-none transition-colors disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] ${
                    error ? 'border-[#C41212]' : 'border-[#D1D5DB] focus:border-[#C41212]'
                  }`}
                  placeholder={activeRole.hint}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 bg-transparent border-none cursor-pointer text-[#9CA3AF] hover:text-[#1F2937] transition-colors outline-none"
                  onClick={() => setShowHint(h => !h)}
                  title="Show hint"
                >
                  {showHint ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {showHint && (
                <div className="mt-2 text-[12px] text-[#4B5563] bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2 rounded flex items-center gap-2">
                  <div className="w-[3px] h-[12px] bg-[#C41212] rounded-sm" />
                  Format: <span className="font-semibold text-[#1F2937]">{activeRole.hint}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#F87171] text-[#B91C1C] rounded p-3 mb-5 text-[13px] leading-tight">
                <AlertCircle size={15} className="flex-shrink-0 mt-[1px]" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              className="w-full flex items-center justify-center gap-2 bg-[#C41212] hover:bg-[#9A0F0F] text-white font-bold text-[14px] py-2.5 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#C41212]"
              disabled={loading}
            >
              {loading 
                ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} /> 
                : `Sign in via SSO`
              }
            </button>
          </form>

          <div className="mt-7 pt-4 border-t border-[#E5E7EB]">
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Test Users (Dev)</div>
            <div className="flex flex-col gap-1">
              {QUICK_CREDS.map(c => (
                <button
                  key={c.role}
                  type="button"
                  className="text-left text-[11.5px] text-[#6B7280] hover:text-[#1F2937] hover:underline underline-offset-2 transition-all"
                  onClick={() => { setRole(c.role); setEmail(c.email); setError(''); }}
                >
                  <strong className="text-[#4B5563] capitalize">{c.role}</strong>: {c.email}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
          Managed by NIC • Govt of India
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
