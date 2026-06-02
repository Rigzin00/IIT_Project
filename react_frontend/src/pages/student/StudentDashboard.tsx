import { useEffect, useState } from 'react';
import { getStudentProfile } from '../../api/student';
import type { StudentProfile, CompletedCourse, Registration } from '../../api/student';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import type { StudentUser } from '../../api/auth';

const STATUS_CLASS: Record<string, string> = {
  pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected',
};

const GRADE_COLOR: Record<string, string> = {
  'A+': '#22c55e', 'A': '#22c55e', 'A-': '#86efac',
  'B+': '#60a5fa', 'B': '#60a5fa', 'B-': '#93c5fd',
  'C+': '#f59e0b', 'C': '#f59e0b', 'C-': '#fcd34d',
  'D': '#f97316', 'F': '#ef4444',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const studentUser = user as StudentUser;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [completed, setCompleted] = useState<CompletedCourse[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<{ completed_credits: number; minor_gpa: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentUser?.id) return;
    setLoading(true);
    getStudentProfile(studentUser.id)
      .then(res => {
        if (res.success) {
          setProfile(res.profile);
          setCompleted(res.completed);
          setRegistrations(res.registrations);
          setStats(res.stats);
        } else {
          setError(res.message || 'Failed to load profile.');
        }
      })
      .catch(() => setError('Cannot reach server.'))
      .finally(() => setLoading(false));
  }, [studentUser?.id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Spinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="page-body">
      <div className="card" style={{ color: 'var(--danger)', fontSize: 13 }}>⚠ {error}</div>
    </div>
  );

  if (!profile) return null;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">My Profile</div>
        <div className="page-sub">Academic overview and registration status</div>
      </div>
      <div className="page-body">

        {/* Profile card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {profile.roll_number} &nbsp;·&nbsp; {profile.email}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-accent">{profile.department}</span>
                <span className="badge badge-neutral">Year {profile.year_of_study}</span>
                <span className={`badge ${profile.is_approved_for_login ? 'badge-approved' : 'badge-rejected'}`}>
                  {profile.is_approved_for_login ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-light)' }}>{profile.cgpa.toFixed(2)}</div>
              <div className="stat-label">CGPA</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div className="stat-card">
              <div className="stat-value">{stats.completed_credits}</div>
              <div className="stat-label">Credits Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.minor_gpa.toFixed(2)}</div>
              <div className="stat-label">Minor GPA</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{completed.length}</div>
              <div className="stat-label">Courses Done</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{registrations.length}</div>
              <div className="stat-label">Pre-Registrations</div>
            </div>
          </div>
        )}

        {/* Active Registrations */}
        <div style={{ marginBottom: 14 }}>
          <div className="section-title">Active Pre-Registrations</div>
          <div className="card card-sm">
            {registrations.length === 0 ? (
              <div className="empty-state"><p>No active pre-registrations yet.</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Credits</th>
                    <th>Professor</th>
                    <th>Status</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{r.course_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.course_id}</div>
                      </td>
                      <td>{r.credits}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.professor_name}</td>
                      <td><span className={`badge ${STATUS_CLASS[r.status] || 'badge-neutral'}`}>{r.status}</span></td>
                      <td>
                        {r.grade
                          ? <span style={{ fontWeight: 700, color: GRADE_COLOR[r.grade] || 'var(--text-primary)', fontSize: 13 }}>{r.grade}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Completed Courses */}
        <div>
          <div className="section-title">Completed Courses</div>
          <div className="card card-sm">
            {completed.length === 0 ? (
              <div className="empty-state"><p>No completed courses on record.</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Credits</th>
                    <th>Semester</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{c.course_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.course_id}</div>
                      </td>
                      <td>{c.credits}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.semester}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: GRADE_COLOR[c.grade] || 'var(--text-primary)', fontSize: 13 }}>{c.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
