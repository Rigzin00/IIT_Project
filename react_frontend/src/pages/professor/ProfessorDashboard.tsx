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
    <div className="flex items-center justify-center min-h-[300px] bg-[#F5F5F5]">
      <Spinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans'] p-4 md:p-6">
      <div className="bg-white border border-[#E5E7EB] rounded-md p-5 text-[#C41212] font-bold text-[13px]">⚠ {error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans']">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-8 py-5">
        <div className="text-[22px] md:text-[24px] font-extrabold text-[#1F2937] leading-tight tracking-tight">Dashboard</div>
        <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
        <div className="text-[12px] text-[#9CA3AF] mt-0.5">Professor overview and course assignments</div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 md:px-8 py-5 md:py-6">

        {/* Profile card */}
        {professor && (
          <div className="bg-white border border-[#E5E7EB] rounded-md p-4 md:p-5 mb-4 md:mb-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">

              {/* Name / email / badges */}
              <div>
                <div className="text-[17px] md:text-[18px] font-bold text-[#1F2937] leading-tight">{professor.name}</div>
                <div className="text-[12px] text-[#9CA3AF] mt-0.5">{professor.email}</div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#FEF08A] text-[#854D0E] uppercase tracking-wide">{professor.department}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#F3F4F6] text-[#6B7280] uppercase tracking-wide">Faculty</span>
                </div>
              </div>

              {/* Stat cards — full width row on mobile, side-by-side on sm+ */}
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="flex flex-col gap-1 bg-white border border-[#E5E7EB] rounded-md p-3 flex-1 sm:flex-none sm:min-w-[120px] text-center shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <div className="text-[22px] md:text-[24px] font-bold text-[#1F2937] leading-none">{courses.length}</div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Courses Assigned</div>
                </div>
                <div className="flex flex-col gap-1 bg-white border border-[#E5E7EB] rounded-md p-3 flex-1 sm:flex-none sm:min-w-[120px] text-center shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <div className="text-[22px] md:text-[24px] font-bold text-[#1F2937] leading-none">{courses.filter(c => c.is_minor_eligible).length}</div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Minor Eligible</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses */}
        <div className="text-[11px] font-bold text-[#9CA3AF] tracking-wider uppercase mb-3 px-1">My Courses</div>
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-[#E5E7EB] rounded-md text-[#9CA3AF]">
            <BookOpen size={36} className="mb-3 opacity-40" />
            <p className="text-[13px] m-0 font-semibold">No courses assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {courses.map(c => (
              <div
                key={c.id}
                className="bg-white border border-[#E5E7EB] rounded-md p-4 md:p-5 flex flex-col hover:border-[#D1D5DB] hover:shadow-sm transition-all duration-200"
              >
                <div className="text-[10px] font-bold text-[#C41212] uppercase tracking-wider mb-1">{c.id}</div>
                <div className="text-[14px] md:text-[15px] font-bold text-[#1F2937] leading-snug mb-1.5">{c.name}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#6B7280] mb-2">
                  <span className="font-semibold">{c.department}</span>
                  <span className="text-[#D1D5DB] text-[10px]">·</span>
                  <span className="font-semibold">{c.credits} cr</span>
                  {c.is_minor_eligible ? (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#DEF7EC] text-[#03543F] uppercase tracking-wider">Minor Eligible</span>
                  ) : (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#F3F4F6] text-[#6B7280] uppercase tracking-wider">Core Course</span>
                  )}
                </div>
                {c.description && (
                  <div className="text-[12px] text-[#9CA3AF] leading-relaxed mt-1 mb-1 line-clamp-2">
                    {c.description}
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-[#E5E7EB] flex items-center gap-4 text-[11.5px] text-[#9CA3AF] font-semibold">
                  <span className="flex items-center gap-1.5 hover:text-[#1F2937] transition-colors cursor-default">
                    <Users size={13} className="text-[#6B7280]" />
                    <span>Students enrolled</span>
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
