import { useEffect, useState } from 'react';
import { BookOpen, Users } from 'lucide-react';
import { getProfessorDashboard } from '../../api/professor';
import type { ProfCourse } from '../../api/professor';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import type { ProfessorUser } from '../../api/auth';

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const profUser = user as ProfessorUser;

  const [professor, setProfessor] = useState<ProfessorUser | null>(null);
  const [courses, setCourses] = useState<ProfCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profUser?.id) return;
    setLoading(true);
    getProfessorDashboard(profUser.id)
      .then(res => {
        if (res.success) {
          setProfessor(res.professor as ProfessorUser);
          setCourses(res.courses);
        } else {
          setError(res.message || 'Failed to load dashboard.');
        }
      })
      .catch(() => setError('Cannot reach server.'))
      .finally(() => setLoading(false));
  }, [profUser?.id]);

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

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Professor overview and course assignments</div>
      </div>
      <div className="page-body">

        {/* Profile */}
        {professor && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{professor.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{professor.email}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <span className="badge badge-accent">{professor.department}</span>
                  <span className="badge badge-neutral">Faculty</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="stat-card" style={{ minWidth: 120, textAlign: 'center' }}>
                  <div className="stat-value">{courses.length}</div>
                  <div className="stat-label">Courses Assigned</div>
                </div>
                <div className="stat-card" style={{ minWidth: 120, textAlign: 'center' }}>
                  <div className="stat-value">{courses.filter(c => c.is_minor_eligible).length}</div>
                  <div className="stat-label">Minor Eligible</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses */}
        <div className="section-title">My Courses</div>
        {courses.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={36} />
            <p>No courses assigned yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {courses.map(c => (
              <div key={c.id} className="course-card">
                <div className="course-code">{c.id}</div>
                <div className="course-name">{c.name}</div>
                <div className="course-meta" style={{ marginBottom: 8 }}>
                  <span>{c.department}</span>
                  <span>·</span>
                  <span>{c.credits} credits</span>
                  {c.is_minor_eligible ? (
                    <span className="badge badge-approved" style={{ fontSize: 10 }}>Minor Eligible</span>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>Core Course</span>
                  )}
                </div>
                {c.description && (
                  <div className="course-desc">{c.description}</div>
                )}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> Students enrolled
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
