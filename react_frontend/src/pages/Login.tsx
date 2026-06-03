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
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="login-icon-badge" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, marginBottom: 14 }}>
            <GraduationCap size={26} color="var(--iit-accent)" />
          </div>
          <div className="login-logo">Integrated Academic Portal</div>
          <div className="login-sub">Sign in with your institute credentials</div>
        </div>

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

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" htmlFor="login-email">
                Institute Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder={activeRole.hint}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowHint(h => !h)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--iit-text-muted)', display: 'flex' }}
                  title="Show hint"
                >
                  {showHint ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {showHint && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--iit-text-secondary)', background: 'var(--iit-bg-surface)', borderRadius: 6, padding: '6px 10px', border: '1px solid var(--iit-border)' }}>
                  💡 Hint: <span style={{ color: 'var(--iit-accent)' }}>{activeRole.hint}</span>
                </div>
              )}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '8px 10px', marginBottom: '1rem' }}>
                <AlertCircle size={14} color="var(--danger)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" id="login-submit" style={{ width: '100%', justifyContent: 'center', padding: '9px 14px', fontSize: 14 }} disabled={loading}>
              {loading ? <><Spinner /> Signing in…</> : `Sign in as ${activeRole.label}`}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', padding: '10px', background: 'var(--iit-bg-surface)', borderRadius: 6, border: '1px solid var(--iit-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--iit-text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Test Credentials</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[
                { role: 'student',   email: 'rigzin.angdu@institute.edu' },
                { role: 'professor', email: 'arpan.sen@institute.edu' },
                { role: 'admin',     email: 'admin@institute.edu' },
              ].map(c => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => { setRole(c.role as Role); setEmail(c.email); setError(''); }}
                  style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', textAlign: 'left', fontSize: 11, color: 'var(--iit-text-secondary)' }}
                >
                  <span style={{ color: 'var(--iit-primary)' }}>{c.role}</span>: {c.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
