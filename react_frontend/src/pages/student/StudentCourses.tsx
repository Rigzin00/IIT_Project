import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getStudentCourses, getStudentProfile, registerCourse } from '../../api/student';
import type { Course, Registration } from '../../api/student';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';
import type { StudentUser } from '../../api/auth';

const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending:  { icon: Clock,          color: 'var(--warning)', label: 'Pending' },
  approved: { icon: CheckCircle2,   color: 'var(--success)', label: 'Approved' },
  rejected: { icon: XCircle,        color: 'var(--danger)',  label: 'Rejected' },
};

export default function StudentCourses() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const studentUser = user as StudentUser;

  const [courses, setCourses] = useState<Course[]>([]);
  const [myRegs, setMyRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [courseRes, profileRes] = await Promise.all([
          getStudentCourses(),
          studentUser?.id ? getStudentProfile(studentUser.id) : Promise.resolve(null),
        ]);
        if (courseRes.success) setCourses(courseRes.courses);
        if (profileRes && profileRes.success) setMyRegs(profileRes.registrations);
      } catch {
        showToast('error', 'Cannot reach server.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [studentUser?.id]);

  const getRegStatus = (courseId: string): Registration | undefined =>
    myRegs.find(r => r.course_id === courseId);

  const handleRegister = async (courseId: string) => {
    if (!studentUser?.id) return;
    setRegistering(courseId);
    try {
      const res = await registerCourse(studentUser.id, courseId);
      if (res.success) {
        showToast('success', 'Pre-registration submitted!');
        // Refresh registrations
        const profileRes = await getStudentProfile(studentUser.id);
        if (profileRes.success) setMyRegs(profileRes.registrations);
      } else {
        showToast('error', res.message || 'Registration failed.');
      }
    } catch {
      showToast('error', 'Cannot reach server.');
    } finally {
      setRegistering(null);
    }
  };

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.department.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Spinner size="lg" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Minor Course Registration</div>
        <div className="page-sub">Browse and register for open minor-eligible courses</div>
      </div>
      <div className="page-body">

        {/* Search */}
        <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            id="course-search"
            type="text"
            className="form-input"
            placeholder="Search by course name, code, or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} course{filtered.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={36} />
            <p>No courses available for registration right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {filtered.map(course => {
              const reg = getRegStatus(course.id);
              const isRegistering = registering === course.id;
              const statusInfo = reg ? STATUS_ICON[reg.status] : null;
              const StatusIcon = statusInfo?.icon;

              return (
                <div key={course.id} className="course-card">
                  <div className="course-card-header">
                    <div style={{ flex: 1 }}>
                      <div className="course-code">{course.id}</div>
                      <div className="course-name">{course.name}</div>
                      <div className="course-meta">
                        <span>{course.department}</span>
                        <span>·</span>
                        <span>{course.credits} credits</span>
                        <span>·</span>
                        <span>{course.professor_name}</span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {reg ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {StatusIcon && <StatusIcon size={14} color={statusInfo?.color} />}
                            <span style={{ fontSize: 12, fontWeight: 600, color: statusInfo?.color }}>
                              {statusInfo?.label}
                            </span>
                          </div>
                          {reg.grade && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Grade: <strong style={{ color: 'var(--text-primary)' }}>{reg.grade}</strong></span>
                          )}
                        </div>
                      ) : (
                        <button
                          id={`register-${course.id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => handleRegister(course.id)}
                          disabled={isRegistering}
                        >
                          {isRegistering ? <Spinner /> : 'Register'}
                        </button>
                      )}
                    </div>
                  </div>
                  {course.description && (
                    <div className="course-desc">{course.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
