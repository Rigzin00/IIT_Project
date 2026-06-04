import { useEffect, useState } from 'react';
import { getStudentProfile } from '../../api/student';
import type { StudentProfile, CompletedCourse, Registration } from '../../api/student';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import type { StudentUser } from '../../api/auth';

const STATUS_STYLE: Record<string, string> = {
  pending:  'text-[#9CA3AF]',
  approved: 'text-[#374151]',
  rejected: 'text-[#C41212]',
};

const GRADE_COLOR: Record<string, string> = {
  'A+': '#16a34a', 'A': '#16a34a', 'A-': '#22c55e',
  'B+': '#2563eb', 'B': '#2563eb', 'B-': '#3b82f6',
  'C+': '#d97706', 'C': '#d97706', 'C-': '#f59e0b',
  'D':  '#ea580c', 'F': '#C41212',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const studentUser = user as StudentUser;
  const [profile,       setProfile]       = useState<StudentProfile | null>(null);
  const [completed,     setCompleted]     = useState<CompletedCourse[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats,         setStats]         = useState<{ completed_credits: number; minor_gpa: number } | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

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
    <div className="flex items-center justify-center min-h-[300px] bg-[#F5F5F5]">
      <Spinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F5F5F5] p-8">
      <div className="bg-white border border-[#E5E7EB] rounded-md px-4 py-3 text-[13px] text-[#C41212] font-['Open_Sans']">
        ⚠ {error}
      </div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans']">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-[#E5E7EB] px-8">
        <div className="py-5 flex items-center gap-3">
          {/* Left red accent bar */}
          <div className="w-1 h-9 bg-[#C41212] rounded-sm flex-shrink-0" />
          <div>
            <div className="text-[17px] font-bold text-[#1F2937] leading-tight tracking-tight">
              My Profile
            </div>
            <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
            <div className="text-[12px] text-[#9CA3AF] mt-0.5">
              Academic overview and registration status
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-8 py-6 space-y-5">

        {/* ── Profile card ── */}
        <div className="bg-white border border-[#E5E7EB] rounded-md px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-[#1F2937] mb-1">{profile.name}</div>
            <div className="text-[12px] text-[#9CA3AF] mb-3">
              {profile.roll_number}&nbsp;·&nbsp;{profile.email}
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Department */}
              <span className="text-[11px] font-semibold text-[#555555] bg-[#F5F5F5] border border-[#E5E7EB] rounded px-2 py-0.5">
                {profile.department}
              </span>
              {/* Year */}
              <span className="text-[11px] font-semibold text-[#555555] bg-[#F5F5F5] border border-[#E5E7EB] rounded px-2 py-0.5">
                Year {profile.year_of_study}
              </span>
              {/* Status */}
              <span className={`text-[11px] font-semibold rounded px-2 py-0.5 border ${
                profile.is_approved_for_login
                  ? 'text-[#374151] border-[#D1D5DB] bg-[#F9FAFB]'
                  : 'text-[#C41212] border-[#C41212]/25 bg-[#FEF2F2]'
              }`}>
                {profile.is_approved_for_login ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
          {/* CGPA */}
          <div className="text-right flex-shrink-0 pt-0.5">
            <div className="text-[34px] font-extrabold text-[#C41212] leading-none">
              {profile.cgpa.toFixed(2)}
            </div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-1">
              CGPA
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E5E7EB] border border-[#E5E7EB] rounded-md overflow-hidden">
            {[
              { value: stats.completed_credits,        label: 'Credits Completed' },
              { value: stats.minor_gpa.toFixed(2),     label: 'Minor GPA'         },
              { value: completed.length,               label: 'Courses Done'      },
              { value: registrations.length,           label: 'Pre-Registrations' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white px-5 py-4 hover:bg-[#FAFAFA] transition-colors duration-100">
                <div className="text-[26px] font-extrabold text-[#1F2937] leading-none">{value}</div>
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-1.5">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Active Registrations ── */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            Active Pre-Registrations
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
            {registrations.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-[#9CA3AF]">
                No active pre-registrations yet.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFA]">
                    {['Course', 'Credits', 'Professor', 'Status', 'Grade'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(r => (
                    <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors duration-75">
                      <td className="px-4 py-3 border-b border-[#E5E7EB]">
                        <div className="text-[13px] font-semibold text-[#1F2937]">{r.course_name}</div>
                        <div className="text-[10px] font-bold text-[#C41212] uppercase tracking-wider mt-0.5">{r.course_id}</div>
                      </td>
                      <td className="px-4 py-3 border-b border-[#E5E7EB] text-[13px] text-[#555555]">
                        {r.credits}
                      </td>
                      <td className="px-4 py-3 border-b border-[#E5E7EB] text-[12px] text-[#9CA3AF]">
                        {r.professor_name}
                      </td>
                      <td className="px-4 py-3 border-b border-[#E5E7EB]">
                        <span className={`text-[12px] font-semibold ${STATUS_STYLE[r.status] || 'text-[#9CA3AF]'}`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-[#E5E7EB]">
                        {r.grade
                          ? <span className="text-[13px] font-bold" style={{ color: GRADE_COLOR[r.grade] || '#1F2937' }}>{r.grade}</span>
                          : <span className="text-[13px] text-[#D1D5DB]">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Completed Courses ── */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            Completed Courses
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
            {completed.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-[#9CA3AF]">
                No completed courses on record.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFA]">
                    {['Course', 'Credits', 'Semester', 'Grade'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completed.map(c => (
                    <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors duration-75">
                      <td className="px-4 py-3 border-b border-[#E5E7EB]">
                        <div className="text-[13px] font-semibold text-[#1F2937]">{c.course_name}</div>
                        <div className="text-[10px] font-bold text-[#C41212] uppercase tracking-wider mt-0.5">{c.course_id}</div>
                      </td>
                      <td className="px-4 py-3 border-b border-[#E5E7EB] text-[13px] text-[#555555]">
                        {c.credits}
                      </td>
                      <td className="px-4 py-3 border-b border-[#E5E7EB] text-[12px] text-[#9CA3AF]">
                        {c.semester}
                      </td>
                      <td className="px-4 py-3 border-b border-[#E5E7EB]">
                        <span className="text-[13px] font-bold" style={{ color: GRADE_COLOR[c.grade] || '#1F2937' }}>
                          {c.grade}
                        </span>
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