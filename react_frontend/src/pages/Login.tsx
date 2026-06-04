import { useState } from 'react';
import { GraduationCap, ShieldCheck, UserCog, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login } from '../api/auth';
import type { Role } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

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
    <div
      className="min-h-screen flex items-center justify-center bg-[#F2F2F2] text-[15px] text-[#1F2937] leading-[1.5]"
      style={{
        fontFamily: "'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        backgroundImage: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,18,18,0.06) 0%, transparent 70%), linear-gradient(180deg, #F2F2F2 0%, #F7EEEE 100%)"
      }}
    >
      {/* Decorative top stripe */}
      <div
        className="fixed top-0 left-0 right-0 h-1 z-[100]"
        style={{ background: 'linear-gradient(90deg, #C41212 0%, #F0A020 50%, #C41212 100%)' }}
      />

      <div className="w-full max-w-[460px] px-4">
        {/* ── Header ── */}
        <div className="text-center mb-7">
          <div className="flex-shrink-0 inline-block mb-4 mt-6">
            <img
              src="/logo.png"
              alt="logo"
              width={64}
              height={64}
              className="w-20 h-20 object-contain"
            />
          </div>
          <div className="text-[20px] font-bold text-[#1F2937] tracking-tight leading-snug mb-1">Integrated Academic Portal</div>

          {/* Gold accent divider under title */}
          <div className="w-10 h-[3px] rounded-sm mx-auto mt-2 mb-2.5" style={{ background: 'linear-gradient(90deg, #C41212 0%, #F0A020 100%)' }} />

          <div className="text-[13.5px] font-normal text-[#555555] leading-relaxed mb-6">Sign in with your institute credentials</div>
        </div>

        {/* ── Card ── */}
        <div
          className="bg-white border border-[#E5E7EB] rounded-2xl p-[2.25rem_2.0rem] mx-auto w-full max-w-[420px] relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(196,18,18,0.14),0_2px_8px_rgba(0,0,0,0.08)] shadow-[0_2px_16px_rgba(196,18,18,0.08),0_1px_4px_rgba(0,0,0,0.05)]"
          style={{ animation: 'loginCardIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #C41212 0%, #F0A020 100%)' }} />

          {/* Role Tabs */}
          <div className="flex bg-[#F7EEEE] rounded-[10px] p-1 mb-6 gap-[3px] border border-[#E5E7EB]">
            {ROLES.map(r => (
              <button
                key={r.id}
                className={`flex-1 text-center py-2 px-1.5 rounded-[7px] text-[12.5px] font-semibold transition-all duration-300 leading-[1.4] tracking-[0.1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C41212] ${role === r.id
                  ? 'bg-[#C41212] text-white shadow-[0_2px_8px_rgba(196,18,18,0.30)]'
                  : 'bg-transparent text-[#9CA3AF] hover:text-[#C41212] hover:bg-[rgba(196,18,18,0.06)]'
                  }`}
                onClick={() => { setRole(r.id); setError(''); setEmail(''); }}
                type="button"
                id={`role-tab-${r.id}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-[1.125rem]">
              <label htmlFor="login-email" className="block text-[12.5px] font-semibold text-[#555555] leading-[1.4] uppercase tracking-[0.2px] select-none mb-1.5">
                Institute Email
              </label>
              <div className="relative block">
                <input
                  id="login-email"
                  type="email"
                  className={`w-full block text-[14px] font-normal text-[#1F2937] leading-[1.5] bg-[#FAFAFA] border-[1.5px] rounded-lg py-[10px] pl-[14px] pr-[42px] outline-none transition-all duration-300 hover:bg-white hover:border-[#D1D5DB] focus:bg-white focus:border-[#C41212] focus:shadow-[0_0_0_3px_rgba(196,18,18,0.10)] disabled:bg-[#F3F4F6] disabled:border-[#E5E7EB] disabled:text-[#9CA3AF] disabled:opacity-70 disabled:cursor-not-allowed placeholder:opacity-100 placeholder-[#9CA3AF] ${error ? 'border-[#C41212] shadow-[0_0_0_3px_rgba(196,18,18,0.10)] focus:shadow-[0_0_0_3px_rgba(196,18,18,0.18)]' : 'border-[#E5E7EB]'
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center p-1 bg-transparent border-none cursor-pointer text-[#9CA3AF] rounded-md transition-colors duration-300 hover:text-[#C41212] hover:bg-[rgba(196,18,18,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C41212]"
                  onClick={() => setShowHint(h => !h)}
                  title="Show hint"
                >
                  {showHint ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {showHint && (
                <div className="flex items-start gap-1.5 text-[12px] text-[#555555] leading-[1.5] mt-1.5 bg-[#FFF8EC] border border-[rgba(240,160,32,0.35)] rounded-md px-2.5 py-1.5">
                  💡 Hint: <span className="text-[#F0A020] font-bold">{activeRole.hint}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-[rgba(196,18,18,0.06)] border border-[rgba(196,18,18,0.20)] border-l-[3px] border-l-[#C41212] rounded-lg px-3.5 py-2.5 mb-4 text-[13px] text-[#C41212] leading-[1.5] animate-[fadeUp_0.22s_cubic-bezier(0.22,1,0.36,1)]">
                <AlertCircle size={14} className="flex-shrink-0 mt-[1px]" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              className={`inline-flex items-center justify-center gap-2 w-full py-[11px] px-5 text-[14.5px] font-bold tracking-[0.3px] leading-none whitespace-nowrap rounded-lg border-2 select-none overflow-hidden transition-all duration-300 focus:outline-none focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_#C41212] ${loading
                ? 'bg-[#E88080] border-[#E88080] text-white opacity-100 cursor-not-allowed pointer-events-none shadow-none'
                : 'bg-[#C41212] border-[#C41212] text-white shadow-[0_2px_8px_rgba(196,18,18,0.30)] hover:bg-[#9A0F0F] hover:border-[#9A0F0F] hover:shadow-[0_6px_20px_rgba(196,18,18,0.40)] hover:-translate-y-[1px] active:bg-[#7A0C0C] active:shadow-[0_1px_4px_rgba(196,18,18,0.25)] active:translate-y-0 disabled:bg-[#E88080] disabled:border-[#E88080] disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none'
                }`}
              disabled={loading}
            >
              {loading ? <span className="[&_.spinner]:!border-[#ffffff40] [&_.spinner]:!border-t-white inline-flex items-center gap-2"><Spinner /> Signing in…</span> : `Sign in as ${activeRole.label}`}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-2.5 mt-5 mb-4 text-[11px] font-semibold text-[#9CA3AF] tracking-[0.4px]">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            Quick Test Credentials
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* Quick Credentials Panel */}
          <div className="p-[12px_14px] bg-[#F7EEEE] rounded-[10px] border border-[#E5E7EB] transition-all duration-300 hover:border-[rgba(196,18,18,0.25)] hover:shadow-[0_2px_8px_rgba(196,18,18,0.06)]">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#9CA3AF] uppercase tracking-[0.8px] mb-2 leading-[1.0]">
              <div className="w-[10px] h-[2px] bg-[#F0A020] rounded-[2px]" />
              Test Accounts
            </div>
            <div className="flex flex-col gap-[1px]">
              {QUICK_CREDS.map(c => (
                <button
                  key={c.role}
                  type="button"
                  className="block w-full text-left bg-transparent border-none py-[3px] px-0 text-[12px] text-[#555555] leading-[1.6] cursor-pointer transition-colors duration-300 hover:text-[#C41212]"
                  onClick={() => { setRole(c.role); setEmail(c.email); setError(''); }}
                >
                  <span className="text-[#C41212] font-bold">{c.role}</span>
                  {': '}
                  {c.email}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center mt-5 text-[11.5px] text-[#9CA3AF] leading-[1.6]">
          IIT Delhi — Academic Management System
        </div>
      </div>
    </div>
  );
}
