import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, FlaskConical } from 'lucide-react';
import BASE from '../api/config';
import { login as devLogin, type Role } from '../api/auth';

/**
 * Login page — always rendered at /login regardless of auth state.
 * Contains a single button that redirects the browser to the backend
 * OAuth initiation endpoint, which in turn redirects to IIT Delhi SSO.
 * No form, no email input, no auto-redirect.
 *
 * In development (import.meta.env.DEV), also shows a dev-login panel
 * that calls POST /api/auth/login (bypasses IIT Delhi OAuth for testing).
 */
export default function Login() {
  const navigate = useNavigate();

  // Dev panel state
  const [devEmail, setDevEmail]   = useState('');
  const [devRole,  setDevRole]    = useState<Role>('student');
  const [devError, setDevError]   = useState('');
  const [devLoading, setDevLoading] = useState(false);

  const handleIITDLogin = () => {
    // Full-page redirect: backend will set the HttpOnly cookie and redirect
    // back to /auth/callback after IIT Delhi authenticates the user.
    window.location.href = `${BASE}/api/auth/iitd-login`;
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevError('');
    setDevLoading(true);
    try {
      const res = await devLogin(devEmail.trim().toLowerCase(), devRole);
      if (res.success) {
        // Cookie has been set by the backend — run the same session hydration
        // flow used after real OAuth by navigating to /auth/callback.
        navigate('/auth/callback', { replace: true });
      } else {
        setDevError(res.message || 'Dev login failed.');
      }
    } catch {
      setDevError('Could not reach the backend server.');
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] text-[14px] text-[#1F2937] font-['Open_Sans',sans-serif] px-4 py-8">
      <div className="w-full max-w-[400px]">

        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="IIT Delhi logo"
            className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] object-contain mx-auto mb-4 opacity-90 grayscale-[20%]"
          />
          <div className="text-[20px] sm:text-[22px] font-extrabold text-[#1F2937] tracking-tight leading-snug">
            Academic Management System
          </div>
          <div className="text-[13px] text-[#6B7280] mt-1.5 font-semibold">
            IIT Delhi — Secure Authentication Portal
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-md shadow-sm p-6 sm:p-8">

          {/* Description */}
          <p className="text-center text-[13px] text-[#6B7280] mb-8 leading-relaxed">
            Sign in using your IIT Delhi institute credentials.
            <br />
            You will be redirected to the IIT Delhi OAuth portal.
          </p>

          {/* Single OAuth Button */}
          <button
            id="iitd-login-btn"
            type="button"
            onClick={handleIITDLogin}
            className="w-full flex items-center justify-center gap-2.5 bg-[#C41212] hover:bg-[#9A0F0F] active:bg-[#7A0C0C] text-white font-bold text-[15px] py-3 rounded-md transition-colors outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C41212] shadow-sm"
          >
            <ExternalLink size={17} className="shrink-0" />
            Login with IIT Delhi
          </button>

          {/* Institution note */}
          <p className="text-center text-[11px] text-[#9CA3AF] mt-6 leading-relaxed">
            Only IIT Delhi faculty, staff, and students with an active portal
            account can access this system.
          </p>
        </div>

        {/* ── Dev-only login panel ─────────────────────────────────────────────
            Rendered only in Vite development mode (import.meta.env.DEV).
            Completely absent from production builds.
        ──────────────────────────────────────────────────────────────────────── */}
        {import.meta.env.DEV && (
          <div className="mt-6 bg-amber-50 border border-amber-300 rounded-md p-5">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={15} className="text-amber-600 shrink-0" />
              <span className="text-[12px] font-bold text-amber-700 uppercase tracking-wide">
                Dev Login — bypasses IIT Delhi OAuth
              </span>
            </div>

            <form onSubmit={handleDevLogin} className="flex flex-col gap-3">
              {/* Email input */}
              <div>
                <label className="block text-[11px] font-semibold text-amber-700 mb-1">
                  Email (must exist in database)
                </label>
                <input
                  id="dev-email"
                  type="email"
                  required
                  value={devEmail}
                  onChange={e => setDevEmail(e.target.value)}
                  placeholder="e.g. you@iitd.ac.in"
                  className="w-full border border-amber-300 rounded px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-400"
                />
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-[11px] font-semibold text-amber-700 mb-1">
                  Role
                </label>
                <select
                  id="dev-role"
                  value={devRole}
                  onChange={e => setDevRole(e.target.value as Role)}
                  className="w-full border border-amber-300 rounded px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="student">student</option>
                  <option value="professor">professor</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              {/* Error */}
              {devError && (
                <p className="text-[12px] text-red-600 font-semibold">{devError}</p>
              )}

              {/* Submit */}
              <button
                id="dev-login-btn"
                type="submit"
                disabled={devLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-[13px] py-2 rounded transition-colors"
              >
                {devLoading ? 'Signing in…' : 'Dev Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
          Managed by NIC • Govt of India
        </div>
      </div>
    </div>
  );
}
