import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSession } from '../api/auth';
import { useAuth } from '../context/AuthContext';

/**
 * OAuthCallback — mounted at /auth/callback.
 *
 * The backend redirects here after IIT Delhi authentication:
 *   1. It has already set the HttpOnly JWT cookie on the browser.
 *   2. This page calls GET /api/auth/session (with credentials: 'include')
 *      so the browser automatically forwards the cookie.
 *   3. On success → authLogin(user, role) → navigate to dashboard.
 *   4. On failure → navigate to /login with an error message.
 *
 * The JWT never appears in JavaScript — it lives exclusively in the cookie.
 */
export default function OAuthCallback() {
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const { login }        = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const attempted = useRef(false);  // guard against React StrictMode double-invoke

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    // If the backend sent an error query param (e.g. access denied), surface it.
    const backendError = searchParams.get('error');
    if (backendError) {
      setErrorMsg(decodeURIComponent(backendError));
      setStatus('error');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    async function hydrateSession() {
      try {
        const res = await fetchSession();   // credentials: 'include' → cookie is sent
        if (res.success && res.user && res.role) {
          login(res.user, res.role);
          navigate('/', { replace: true });
        } else {
          const msg = res.message || 'Authentication failed. Please try again.';
          setErrorMsg(msg);
          setStatus('error');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        }
      } catch {
        setErrorMsg('Could not reach the server. Please try again.');
        setStatus('error');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    }

    hydrateSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] font-['Open_Sans',sans-serif]">
      <div className="text-center">
        {status === 'loading' ? (
          <>
            <div className="w-10 h-10 rounded-full border-4 border-[#E5E7EB] border-t-[#C41212] animate-spin mx-auto mb-4" />
            <p className="text-[#4B5563] font-semibold text-[15px]">Completing sign-in…</p>
            <p className="text-[#9CA3AF] text-[13px] mt-1">Please wait while we verify your IIT Delhi session.</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
              <span className="text-[#C41212] text-xl font-bold">!</span>
            </div>
            <p className="text-[#1F2937] font-semibold text-[15px]">Authentication failed</p>
            <p className="text-[#9CA3AF] text-[13px] mt-1 max-w-[280px] mx-auto">{errorMsg}</p>
            <p className="text-[#9CA3AF] text-[12px] mt-3">Redirecting to login…</p>
          </>
        )}
      </div>
    </div>
  );
}
