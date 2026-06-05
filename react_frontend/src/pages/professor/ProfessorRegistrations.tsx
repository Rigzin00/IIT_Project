import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, CheckCircle, XCircle, Star, Download, RefreshCw } from 'lucide-react';
import { getProfessorRegistrations, profAction, profGrade } from '../../api/professor';
import type { StudentRegistration } from '../../api/professor';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { ProfessorUser } from '../../api/auth';
import Spinner from '../../components/Spinner';

type SortKey = 'student_name' | 'cgpa' | 'year_of_study';
type SortDir = 'asc' | 'desc';

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

const STATUS_CLASS: Record<string, string> = {
  pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected',
};

export default function ProfessorRegistrations() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const profUser = user as ProfessorUser;

  const [regs, setRegs] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});

  // Filters
  const [yearFilter, setYearFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [doneCourseFilter, setDoneCourseFilter] = useState('all');
  const [cgpaCutoff, setCgpaCutoff] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('student_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchData = () => {
    if (!profUser?.id) return;
    setLoading(true);
    getProfessorRegistrations(profUser.id)
      .then(res => {
        if (res.success) setRegs(res.registrations);
        else showToast('error', res.message || 'Failed to load registrations.');
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [profUser?.id]);

  // Derived filter options
  const departments = useMemo(() => [...new Set(regs.map(r => r.student_department))].sort(), [regs]);
  const courses     = useMemo(() => [...new Set(regs.map(r => r.course_id))].sort(), [regs]);
  const doneCourses = useMemo(() => [...new Set(regs.flatMap(r => r.completed_courses_ids))].sort(), [regs]);

  // Filter + Sort
  const filtered = useMemo(() => {
    let out = [...regs];
    if (yearFilter !== 'all') out = out.filter(r => r.year_of_study === Number(yearFilter));
    if (deptFilter !== 'all') out = out.filter(r => r.student_department === deptFilter);
    if (statusFilter !== 'all') out = out.filter(r => r.status === statusFilter);
    if (courseFilter !== 'all') out = out.filter(r => r.course_id === courseFilter);
    if (doneCourseFilter !== 'all') out = out.filter(r => r.completed_courses_ids.includes(doneCourseFilter));
    if (cgpaCutoff) out = out.filter(r => r.cgpa >= parseFloat(cgpaCutoff));
    out.sort((a, b) => {
      const av = sortKey === 'student_name' ? a.student_name : sortKey === 'cgpa' ? a.cgpa : a.year_of_study;
      const bv = sortKey === 'student_name' ? b.student_name : sortKey === 'cgpa' ? b.cgpa : b.year_of_study;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return out;
  }, [regs, yearFilter, deptFilter, statusFilter, courseFilter, doneCourseFilter, cgpaCutoff, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    sortKey === k
      ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : <ChevronUp size={12} style={{ opacity: 0.2 }} />
  );

  const handleAction = async (regId: string, status: 'approved' | 'rejected') => {
    setActionLoading(regId + status);
    try {
      const res = await profAction(regId, status);
      if (res.success) {
        showToast('success', res.message);
        setRegs(prev => prev.map(r => r.registration_id === regId ? { ...r, status } : r));
      } else showToast('error', res.message || 'Action failed.');
    } catch { showToast('error', 'Cannot reach server.'); }
    finally { setActionLoading(null); }
  };

  const handleGrade = async (regId: string) => {
    const grade = gradeInputs[regId]?.trim();
    if (!grade) { showToast('error', 'Please select a grade first.'); return; }
    setActionLoading(regId + 'grade');
    try {
      const res = await profGrade(regId, grade);
      if (res.success) {
        showToast('success', 'Grade saved & CGPA recalculated!');
        setRegs(prev => prev.map(r => r.registration_id === regId ? { ...r, grade } : r));
        setGradeInputs(prev => { const n = { ...prev }; delete n[regId]; return n; });
      } else showToast('error', res.message || 'Grading failed.');
    } catch { showToast('error', 'Cannot reach server.'); }
    finally { setActionLoading(null); }
  };

  // Export handler
  const handleExport = (fmt: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ role: 'professor', professor_id: profUser.id, format: fmt });
    if (yearFilter !== 'all') params.set('year', yearFilter);
    if (deptFilter !== 'all') params.set('department', deptFilter);
    if (cgpaCutoff) params.set('cgpa_cutoff', cgpaCutoff);
    if (courseFilter !== 'all') params.set('wants_course', courseFilter);
    if (doneCourseFilter !== 'all') params.set('has_done_course', doneCourseFilter);
    window.open(`http://127.0.0.1:5000/api/export?${params.toString()}`, '_blank');
  };

  const resetFilters = () => {
    setYearFilter('all'); setDeptFilter('all'); setStatusFilter('all');
    setCourseFilter('all'); setDoneCourseFilter('all'); setCgpaCutoff('');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px] bg-[#F5F5F5]">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans']">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-8">
        <div className="py-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[24px] font-extrabold text-[#1F2937] leading-tight tracking-tight">Student Registrations</div>
            <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
            <div className="text-[12px] text-[#9CA3AF] mt-0.5">{filtered.length} of {regs.length} students shown</div>
          </div>
          <div className="flex gap-2">
            <button 
              className="inline-flex items-center justify-center px-3.5 py-1.5 text-[12px] font-bold text-[#9CA3AF] bg-transparent border border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#1F2937] rounded transition-colors whitespace-nowrap" 
              onClick={fetchData} 
              id="refresh-regs"
            >
              <RefreshCw size={13} className="mr-1.5" /> Refresh
            </button>
            <button 
              className="inline-flex items-center justify-center px-3.5 py-1.5 text-[12px] font-bold text-[#9CA3AF] bg-transparent border border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#1F2937] rounded transition-colors whitespace-nowrap" 
              onClick={() => handleExport('csv')} 
              id="export-csv"
            >
              <Download size={13} className="mr-1.5" /> CSV
            </button>
            <button 
              className="inline-flex items-center justify-center px-3.5 py-1.5 text-[12px] font-bold text-white bg-[#C41212] hover:bg-[#9A0F0F] rounded transition-colors whitespace-nowrap" 
              onClick={() => handleExport('xlsx')} 
              id="export-xlsx"
            >
              <Download size={13} className="mr-1.5" /> XLSX
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 md:px-8 py-6">

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2 items-center bg-white border border-[#E5E7EB] rounded-md mb-4 p-3 pr-4">
          <select 
            className="w-auto min-w-[140px] bg-white border border-[#E5E7EB] rounded px-3 py-1.5 text-[13px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors appearance-none cursor-pointer" 
            value={yearFilter} 
            onChange={e => setYearFilter(e.target.value)} 
            id="filter-year"
          >
            <option value="all">All Years</option>
            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select 
            className="w-auto min-w-[140px] bg-white border border-[#E5E7EB] rounded px-3 py-1.5 text-[13px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors appearance-none cursor-pointer" 
            value={deptFilter} 
            onChange={e => setDeptFilter(e.target.value)} 
            id="filter-dept"
          >
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            className="w-auto min-w-[140px] bg-white border border-[#E5E7EB] rounded px-3 py-1.5 text-[13px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors appearance-none cursor-pointer" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            id="filter-status"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select 
            className="w-auto min-w-[140px] bg-white border border-[#E5E7EB] rounded px-3 py-1.5 text-[13px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors appearance-none cursor-pointer" 
            value={courseFilter} 
            onChange={e => setCourseFilter(e.target.value)} 
            id="filter-course"
          >
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="w-auto min-w-[140px] bg-white border border-[#E5E7EB] rounded px-3 py-1.5 text-[13px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors appearance-none cursor-pointer" 
            value={doneCourseFilter} 
            onChange={e => setDoneCourseFilter(e.target.value)} 
            id="filter-done-course"
          >
            <option value="all">Has Done: Any</option>
            {doneCourses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number" min="0" max="10" step="0.1"
            className="w-[100px] bg-white border border-[#E5E7EB] rounded px-3 py-1.5 text-[13px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors"
            placeholder="Min CGPA"
            value={cgpaCutoff}
            onChange={e => setCgpaCutoff(e.target.value)}
            id="filter-cgpa"
          />
          <button 
            className="inline-flex items-center justify-center px-2.5 py-1.5 text-[11px] font-bold text-[#9CA3AF] bg-transparent border border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#1F2937] rounded transition-colors whitespace-nowrap ml-auto" 
            onClick={resetFilters} 
            id="clear-filters"
          >
            Clear
          </button>
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          <span className="text-[11px] text-[#9CA3AF] font-bold tracking-wider mr-1">SORT BY</span>
          {(['student_name', 'cgpa', 'year_of_study'] as SortKey[]).map(k => (
            <button 
              key={k} 
              className={`inline-flex items-center justify-center px-2 py-1 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${sortKey === k ? 'text-white bg-[#C41212]' : 'text-[#9CA3AF] bg-transparent border border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#1F2937]'}`} 
              onClick={() => toggleSort(k)}
            >
              {k === 'student_name' ? 'Name' : k === 'cgpa' ? 'CGPA' : 'Year'} <span className="ml-1"><SortIcon k={k} /></span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4 text-[#9CA3AF]">
              <p className="text-[13px] m-0">No registrations match current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] text-[#1F2937] font-['Open_Sans'] whitespace-nowrap">
                <thead>
                  <tr className="bg-[#FAFAFA]">
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB]">Student</th>
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB]">Course</th>
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB]">Year / Dept</th>
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB] cursor-pointer hover:text-[#1F2937] transition-colors" onClick={() => toggleSort('cgpa')}>
                      <div className="flex items-center gap-1">CGPA <SortIcon k="cgpa" /></div>
                    </th>
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB]">Done Courses</th>
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB]">Status</th>
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB]">Grade</th>
                    <th className="text-left uppercase p-3 text-[10px] font-bold tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const isActing = actionLoading === r.registration_id + 'approved' || actionLoading === r.registration_id + 'rejected';
                    const isGrading = actionLoading === r.registration_id + 'grade';
                    return (
                      <tr key={r.registration_id} className="hover:bg-[#F9FAFB] transition-colors duration-150 border-b border-[#E5E7EB] last:border-0">
                        <td className="p-3 align-middle">
                          <div className="font-bold text-[#1F2937] text-[13px] leading-tight mb-0.5">{r.student_name}</div>
                          <div className="text-[11px] text-[#6B7280]">{r.roll_number}</div>
                          <div className="text-[11px] text-[#9CA3AF]">{r.student_email}</div>
                        </td>
                        <td className="p-3 align-middle">
                          <div className="font-bold text-[#1F2937] text-[13px] leading-tight mb-0.5">{r.course_name}</div>
                          <div className="text-[11px] text-[#6B7280]">{r.course_id} · <span className="font-semibold">{r.credits} cr</span></div>
                        </td>
                        <td className="p-3 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F3F4F6] text-[#4B5563]">Yr {r.year_of_study}</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF08A] text-[#854D0E]">{r.student_department}</span>
                          </div>
                        </td>
                        <td className="p-3 align-middle">
                          <span className={`font-bold ${r.cgpa >= 8.5 ? 'text-[#15803d]' : r.cgpa >= 6 ? 'text-[#b45309]' : 'text-[#C41212]'}`}>
                            {r.cgpa.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3 align-middle">
                          {r.completed_courses_list.length === 0 ? (
                            <span className="text-[#9CA3AF] text-[11px] italic">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {r.completed_courses_list.map((c, i) => (
                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">{c}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 align-middle">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-[#F3F4F6] text-[#6B7280]' : r.status === 'approved' ? 'bg-[#DEF7EC] text-[#03543F]' : 'bg-[#FDE8E8] text-[#C41212]'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 align-middle">
                          {r.grade ? (
                            <span className="font-bold text-[#C41212] text-[13px]">{r.grade}</span>
                          ) : r.status === 'approved' ? (
                            <div className="flex gap-1.5 items-center">
                              <select
                                className="w-[60px] bg-white border border-[#E5E7EB] rounded px-1.5 py-1 text-[12px] font-semibold text-[#1F2937] outline-none focus:border-[#C41212] transition-colors appearance-none cursor-pointer"
                                value={gradeInputs[r.registration_id] || ''}
                                onChange={e => setGradeInputs(prev => ({ ...prev, [r.registration_id]: e.target.value }))}
                                id={`grade-select-${r.registration_id}`}
                              >
                                <option value="">—</option>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                              <button
                                className="inline-flex items-center justify-center w-[26px] h-[26px] text-[#9CA3AF] bg-white border border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#C41212] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => handleGrade(r.registration_id)}
                                disabled={isGrading}
                                id={`grade-save-${r.registration_id}`}
                                title="Save Grade"
                              >
                                {isGrading ? <Spinner /> : <Star size={13} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#9CA3AF] text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3 align-middle">
                          {r.status === 'pending' ? (
                            <div className="flex gap-1.5 items-center">
                              <button
                                className="inline-flex items-center justify-center px-2 py-1 text-[11px] font-bold text-white bg-[#15803d] hover:bg-[#166534] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => handleAction(r.registration_id, 'approved')}
                                disabled={!!isActing}
                                id={`approve-${r.registration_id}`}
                              >
                                {isActing ? <Spinner /> : <><CheckCircle size={12} className="mr-1" /> Approve</>}
                              </button>
                              <button
                                className="inline-flex items-center justify-center px-2 py-1 text-[11px] font-bold text-[#C41212] bg-[#FDE8E8] hover:bg-[#FEE2E2] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => handleAction(r.registration_id, 'rejected')}
                                disabled={!!isActing}
                                id={`reject-${r.registration_id}`}
                              >
                                <XCircle size={12} className="mr-1" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#9CA3AF] text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
