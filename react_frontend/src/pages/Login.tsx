import { useState } from 'react';
import { GraduationCap, ShieldCheck, UserCog, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login } from '../api/auth';
import type { Role } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const ROLES: { id: Role; label: string; icon: typeof GraduationCap; hint: string }[] = [
  { id: 'student',   label: 'Student',   icon: GraduationCap, hint: 'e.g. rigzin.angdu@institute.edu' },
  { id: 'professor', label: 'Professor', icon: UserCog,       hint: 'e.g. arpan.sen@institute.edu' },
  { id: 'admin',     label: 'Admin',     icon: ShieldCheck,   hint: 'admin@institute.edu' },
];

const QUICK_CREDS = [
  { role: 'student'   as Role, email: 'rigzin.angdu@institute.edu' },
  { role: 'professor' as Role, email: 'arpan.sen@institute.edu' },
  { role: 'admin'     as Role, email: 'admin@institute.edu' },
];

export default function Login() {
  const { login: authLogin } = useAuth();
  const [role, setRole]         = useState<Role>('student');
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
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
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: 460, padding: '0 16px' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            className="login-icon-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              marginBottom: 16,
            }}
          >
            <GraduationCap size={28} color="var(--iit-primary)" />
          </div>

          <div className="login-logo">Integrated Academic Portal</div>

          {/* Gold accent divider under title */}
          <div style={{
            width: 40, height: 3,
            background: 'linear-gradient(90deg, var(--iit-primary) 0%, var(--iit-gold) 100%)',
            borderRadius: 2,
            margin: '8px auto 10px',
          }} />

          <div className="login-sub">Sign in with your institute credentials</div>
        </div>

        {/* ── Card ── */}
        <div className="login-card">

          {/* Role Tabs */}
          <div className="role-tabs">
            {ROLES.map(r => (
              <button
                key={r.id}
                className={`role-tab ${role === r.id ? 'active' : ''}`}
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
            <div style={{ marginBottom: '1.125rem' }}>
              <label className="form-label" htmlFor="login-email" style={{ marginBottom: 6, display: 'block' }}>
                Institute Email
              </label>
              <div className="iit-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  className={`form-input${error ? ' iit-error' : ''}`}
                  placeholder={activeRole.hint}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                />
                <button
                  type="button"
                  className="iit-input-icon"
                  onClick={() => setShowHint(h => !h)}
                  title="Show hint"
                >
                  {showHint ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {showHint && (
                <div className="iit-msg-hint">
                  💡 Hint: <span>{activeRole.hint}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="iit-form-error-banner">
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              className={`btn btn-primary${loading ? ' loading' : ''}`}
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? <><Spinner /> Signing in…</> : `Sign in as ${activeRole.label}`}
            </button>
          </form>

          {/* Divider */}
          <div className="iit-divider">Quick Test Credentials</div>

          {/* Quick Credentials Panel */}
          <div className="iit-creds-panel">
            <div className="iit-creds-title">Test Accounts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {QUICK_CREDS.map(c => (
                <button
                  key={c.role}
                  type="button"
                  className="iit-creds-btn"
                  onClick={() => { setRole(c.role); setEmail(c.email); setError(''); }}
                >
                  <span className="iit-creds-role">{c.role}</span>
                  {': '}
                  {c.email}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.25rem',
          fontSize: 11.5,
          color: 'var(--iit-text-muted)',
          fontFamily: 'var(--iit-font)',
          lineHeight: 1.6,
        }}>
          IIT Delhi — Academic Management System
        </div>
      </div>
    </div>
  );
}
