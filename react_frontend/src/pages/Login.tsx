import { ExternalLink } from 'lucide-react';
import BASE from '../api/config';

/**
 * Login page — always rendered at /login regardless of auth state.
 * Contains a single button that redirects the browser to the backend
 * OAuth initiation endpoint, which in turn redirects to IIT Delhi SSO.
 * No form, no email input, no auto-redirect.
 */
export default function Login() {
  const handleIITDLogin = () => {
    // Full-page redirect: backend will set the HttpOnly cookie and redirect
    // back to /auth/callback after IIT Delhi authenticates the user.
    window.location.href = `${BASE}/api/auth/iitd-login`;
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

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
          Managed by NIC • Govt of India
        </div>
      </div>
    </div>
  );
}
