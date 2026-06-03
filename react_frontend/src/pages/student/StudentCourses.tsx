import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import { getStudentCourses, getStudentProfile, registerCourse } from '../../api/student';
import type { Course, Registration } from '../../api/student';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';
import type { StudentUser } from '../../api/auth';

const STATUS_CFG: Record<string, { icon: typeof CheckCircle2; label: string; pill: string }> = {
  pending: { icon: Clock, label: 'Pending', pill: 'pending' },
  approved: { icon: CheckCircle2, label: 'Approved', pill: 'approved' },
  rejected: { icon: XCircle, label: 'Rejected', pill: 'rejected' },
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
    <div className="sc-page">
      <div className="sc-loading">
        <Spinner size="lg" />
      </div>
    </div>
  );

  return (
    <div className="sc-page">

      {/* ── Page Header ── */}
      <div className="sc-header">
        <div className="sc-header-inner">
          <div className="sc-title-group">
            {/* <div className="sc-icon-wrap">
              <BookOpen size={20} color="#C41212" />
            </div> */}

            <div className="sc-icon-wrap">
            <img
              src="/image.png"
              alt="CSE Icon"
               width={64}
               height={64}
              className="w-5 h-5 object-contain"
            />
          </div>
            <div>
              <div className="sc-page-title">Minor Course Registration</div>
              <div className="sc-page-sub">Browse and register for open minor-eligible courses</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="sc-body">

        {/* Search + count */}
        <div className="sc-search-wrap">
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search
              size={16}
              style={{
                position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--sc-text-muted)', pointerEvents: 'none',
              }}
            />
            <input
              id="course-search"
              type="text"
              className="sc-search"
              placeholder="Search by name, code, or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div className="sc-count-badge">
            <span>{filtered.length}</span>
            {filtered.length !== 1 ? 'courses' : 'course'} available
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="sc-empty">
            <div className="sc-empty-icon">
              <BookOpen size={24} />
            </div>
            <p>No courses available for registration right now.</p>
          </div>
        ) : (
          <div className="sc-grid">
            {filtered.map((course, idx) => {
              const reg = getRegStatus(course.id);
              const isRegistering = registering === course.id;
              const statusInfo = reg ? STATUS_CFG[reg.status] : null;
              const StatusIcon = statusInfo?.icon;

              return (
                <div
                  key={course.id}
                  className="sc-card"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="sc-card-top">
                    <div className="sc-card-info">
                      <div className="sc-code">{course.id}</div>
                      <div className="sc-name">{course.name}</div>
                      <div className="sc-meta">
                        <span className="sc-meta-item">{course.department}</span>
                        <span className="sc-meta-sep">·</span>
                        {/* <span className="sc-credits-pill">★ {course.credits} credit</span> */}
                        <span className="sc-meta-sep">·</span>
                        <span className="sc-meta-item">{course.professor_name}</span>
                      </div>
                    </div>

                    <div className="sc-status">
                      {reg ? (
                        <>
                          <div className={`sc-status-pill ${statusInfo?.pill}`}>
                            {StatusIcon && <StatusIcon size={12} />}
                            {statusInfo?.label}
                          </div>
                          {reg.grade && (
                            <span className="sc-grade-tag">
                              Grade: <strong>{reg.grade}</strong>
                            </span>
                          )}
                        </>
                      ) : (
                        <button
                          id={`register-${course.id}`}
                          className="sc-register-btn"
                          onClick={() => handleRegister(course.id)}
                          disabled={isRegistering}
                        >
                          {isRegistering ? <Spinner /> : 'Register'}
                        </button>
                      )}
                    </div>
                  </div>

                  {course.description && (
                    <div className="sc-desc">{course.description}</div>
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