import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import { getStudentCourses, getStudentProfile, registerCourse } from '../../api/student';
import type { Course, Registration } from '../../api/student';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';
import type { StudentUser } from '../../api/auth';
import Pagination from '../../components/Pagination';

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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchCourses = () => {
    setLoading(true);
    getStudentCourses(page, limit, search, sortKey, sortDir)
      .then(res => {
        if (res.success) {
          setCourses(res.courses);
          if (res.pagination) {
            setTotal(res.pagination.total);
            setTotalPages(res.pagination.total_pages);
            setPage(res.pagination.page);
          }
        }
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const delay = setTimeout(() => fetchCourses(), 300);
    return () => clearTimeout(delay);
  }, [page, limit, search, sortKey, sortDir]);

  useEffect(() => {
    if (studentUser?.id) {
      getStudentProfile(studentUser.id).then(res => {
        if (res.success) setMyRegs(res.registrations);
      });
    }
  }, [studentUser?.id]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

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

  if (loading && courses.length === 0) return (
    <div className="flex items-center justify-center min-h-[300px] bg-[#F5F5F5]">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans']">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-8">
        <div className="py-5 flex items-center gap-3">
          <div className="flex-shrink-0">
            <img
              src="/image.png"
              alt="CSE Icon"
              width={64}
              height={64}
              className="w-20 h-20 object-contain"
            />
          </div>
          <div>
            <div className="text-[24px] font-extrabold text-[#1F2937] leading-tight tracking-tight">
              Minor Course Registration
            </div>
            <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
            <div className="text-[12px] text-[#9CA3AF] mt-0.5">
              Browse and register for open minor-eligible courses
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 md:px-8 py-6">

        {/* Search + count + sort */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="relative flex-1 min-w-[280px] max-w-[320px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
            />
            <input
              id="course-search"
              type="text"
              className="w-full bg-white border border-[#E5E7EB] rounded px-3 py-2 pl-9 text-[13px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors"
              placeholder="Search by name, code, or department…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">Sort by:</span>
            <select 
              value={`${sortKey}-${sortDir}`}
              onChange={e => {
                const [k, d] = e.target.value.split('-');
                setSortKey(k);
                setSortDir(d as 'asc' | 'desc');
              }}
              className="bg-white border border-[#E5E7EB] rounded px-2 py-1.5 text-[12.5px] text-[#1F2937] outline-none focus:border-[#C41212] cursor-pointer"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="id-asc">Course Code</option>
              <option value="credits-desc">Credits (High-Low)</option>
              <option value="department-asc">Department</option>
            </select>
          </div>

          <div className="text-[12px] text-[#9CA3AF] flex items-center gap-1 ml-auto">
            <span className="text-[#1F2937] font-semibold">{total}</span>
            {total !== 1 ? 'courses' : 'course'} available
          </div>
        </div>

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white border border-[#E5E7EB] rounded-md">
            <div className="flex items-center justify-center w-11 h-11 mx-auto mb-2 text-[#9CA3AF]">
              <BookOpen size={24} />
            </div>
            <p className="text-[13px] text-[#9CA3AF] m-0">No courses available for registration right now.</p>
          </div>
        ) : (
          <div className={`transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-px bg-[#E5E7EB] border border-[#E5E7EB] rounded-t-md overflow-hidden">
              {courses.map((course, idx) => {
                const reg = getRegStatus(course.id);
                const isRegistering = registering === course.id;
                const statusInfo = reg ? STATUS_CFG[reg.status] : null;
                const StatusIcon = statusInfo?.icon;

                return (
                  <div
                    key={course.id}
                    className="bg-white p-5 flex flex-col hover:bg-[#FAFAFA] transition-colors duration-150"
                    style={{ animation: 'fadeUp 0.25s ease both', animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-[#C41212] uppercase tracking-wider mb-1">{course.id}</div>
                        <div className="text-[14px] font-bold text-[#1F2937] leading-snug mb-1.5">{course.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#9CA3AF]">
                          <span className="text-[#555555]">{course.department}</span>
                          <span className="text-[#D1D5DB] text-[10px]">·</span>
                          <span className="text-[#555555]">{course.professor_name}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5">
                        {reg ? (
                          <>
                            <div className={`inline-flex items-center gap-1 text-[11.5px] font-semibold whitespace-nowrap tracking-wide ${statusInfo?.pill === 'pending' ? 'text-[#9CA3AF]' : statusInfo?.pill === 'approved' ? 'text-[#374151]' : 'text-[#C41212]'}`}>
                              {StatusIcon && <StatusIcon size={12} />}
                              {statusInfo?.label}
                            </div>
                            {reg.grade && (
                              <span className="text-[11px] text-[#9CA3AF]">
                                Grade: <strong className="text-[#1F2937] font-bold">{reg.grade}</strong>
                              </span>
                            )}
                          </>
                        ) : (
                          <button
                            id={`register-${course.id}`}
                            className="inline-flex items-center justify-center px-3.5 py-1.5 text-[12px] font-bold text-white bg-[#C41212] hover:bg-[#9A0F0F] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[76px] whitespace-nowrap"
                            onClick={() => handleRegister(course.id)}
                            disabled={isRegistering}
                          >
                            {isRegistering ? <Spinner /> : 'Register'}
                          </button>
                        )}
                      </div>
                    </div>

                    {course.description && (
                      <div className="text-[12px] text-[#9CA3AF] leading-relaxed border-t border-[#E5E7EB] mt-3.5 pt-3">
                        {course.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="border border-t-0 border-[#E5E7EB] rounded-b-md overflow-hidden">
              <Pagination 
                page={page} 
                limit={limit} 
                total={total} 
                totalPages={totalPages} 
                onPageChange={setPage} 
                onLimitChange={setLimit} 
                isLoading={loading} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}