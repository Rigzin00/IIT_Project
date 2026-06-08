import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, CheckCircle, XCircle, Star, Download, RefreshCw } from 'lucide-react';
import { getProfessorRegistrations, profAction, profGrade } from '../../api/professor';
import type { StudentRegistration } from '../../api/professor';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { ProfessorUser } from '../../api/auth';

type SortKey = 'student_name' | 'cgpa' | 'year_of_study';
type SortDir = 'asc' | 'desc';

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

/* ── tiny reusable style strings ── */
const ghost = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#555555] bg-white border border-[#E5E7EB] rounded hover:bg-[#F5F5F5] hover:border-[#D1D5DB] transition-colors duration-100 cursor-pointer whitespace-nowrap';
const selectCls = 'bg-white border border-[#E5E7EB] rounded px-2.5 py-1.5 text-[12.5px] text-[#1F2937] outline-none focus:border-[#C41212] transition-colors appearance-none cursor-pointer';

export default function ProfessorRegistrations() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const profUser = user as ProfessorUser;

  const [regs, setRegs] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});

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
        else showToast('error', res.message || 'Failed to load.');
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [profUser?.id]);

  const departments = useMemo(() => [...new Set(regs.map(r => r.student_department))].sort(), [regs]);
  const courses = useMemo(() => [...new Set(regs.map(r => r.course_id))].sort(), [regs]);
  const doneCourses = useMemo(() => [...new Set(regs.flatMap(r => r.completed_courses_ids))].sort(), [regs]);

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

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
      : <ChevronUp size={11} className="opacity-20" />;

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

  const handleExport = (fmt: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ role: 'professor', professor_id: profUser.id, format: fmt });
    if (user?.email) params.set('email', user.email);
    
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#F5F5F5' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#C41212', animation: 'spin 0.6s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', fontFamily: "'Open Sans','Helvetica Neue',Helvetica,Arial,sans-serif", color: '#555555' }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ padding: '20px 0 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 36, background: '#C41212', borderRadius: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', letterSpacing: '-0.1px', lineHeight: 1.3 }}>
                Student Registrations
              </div>
              <div style={{ width: 24, height: 2, background: '#C41212', borderRadius: 1, marginTop: 4 }} />
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                {filtered.length} of {regs.length} students shown
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
            <button id="refresh-regs" onClick={fetchData} className={ghost}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button id="export-csv" onClick={() => handleExport('csv')} className={ghost}>
              <Download size={12} /> CSV
            </button>
            <button
              id="export-xlsx"
              onClick={() => handleExport('xlsx')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#C41212', border: 'none', borderRadius: 4, cursor: 'pointer', transition: 'background 150ms' }}
              onMouseOver={e => (e.currentTarget.style.background = '#9A0F0F')}
              onMouseOut={e => (e.currentTarget.style.background = '#C41212')}
            >
              <Download size={12} /> XLSX
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px 40px' }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
          <select id="filter-year" className={selectCls} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="all">All Years</option>
            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select id="filter-dept" className={selectCls} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select id="filter-status" className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select id="filter-course" className={selectCls} value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select id="filter-done-course" className={selectCls} value={doneCourseFilter} onChange={e => setDoneCourseFilter(e.target.value)}>
            <option value="all">Has Done: Any</option>
            {doneCourses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            id="filter-cgpa"
            type="number" min="0" max="10" step="0.1"
            placeholder="Min CGPA"
            value={cgpaCutoff}
            onChange={e => setCgpaCutoff(e.target.value)}
            style={{ width: 90, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 4, padding: '6px 10px', fontSize: 12.5, color: '#1F2937', outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#C41212')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
          />
          <button
            id="clear-filters"
            onClick={resetFilters}
            style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', transition: 'color 150ms' }}
            onMouseOver={e => (e.currentTarget.style.color = '#C41212')}
            onMouseOut={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            Clear filters
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.9px' }}>Sort by</span>
          {(['student_name', 'cgpa', 'year_of_study'] as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4,
                border: sortKey === k ? 'none' : '1px solid #E5E7EB',
                background: sortKey === k ? '#C41212' : '#fff',
                color: sortKey === k ? '#fff' : '#555555',
                cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              {k === 'student_name' ? 'Name' : k === 'cgpa' ? 'CGPA' : 'Year'}
              <SortIcon k={k} />
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', fontSize: 13, color: '#9CA3AF' }}>
              No registrations match current filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Open Sans',sans-serif", fontSize: 13, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['Student', 'Course', 'Year / Dept', 'CGPA', 'Done Courses', 'Status', 'Grade', 'Actions'].map(h => (
                      <th
                        key={h}
                        onClick={h === 'CGPA' ? () => toggleSort('cgpa') : undefined}
                        style={{
                          textAlign: 'left', padding: '10px 16px',
                          fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                          textTransform: 'uppercase', letterSpacing: '0.7px',
                          borderBottom: '1px solid #E5E7EB',
                          cursor: h === 'CGPA' ? 'pointer' : 'default',
                        }}
                      >
                        {h === 'CGPA'
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>CGPA <SortIcon k="cgpa" /></span>
                          : h
                        }
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const isActing = actionLoading === r.registration_id + 'approved' || actionLoading === r.registration_id + 'rejected';
                    const isGrading = actionLoading === r.registration_id + 'grade';
                    return (
                      <tr
                        key={r.registration_id}
                        style={{ borderBottom: '1px solid #E5E7EB' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#FAFAFA')}
                        onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', lineHeight: 1.3 }}>{r.student_name}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{r.roll_number}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.student_email}</div>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{r.course_name}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#C41212', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>
                            {r.course_id} · {r.credits} cr
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F9FAFB] border border-[#E5E7EB] text-[#4B5563]">Yr {r.year_of_study}</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F9FAFB] border border-[#E5E7EB] text-[#4B5563]">{r.student_department}</span>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{r.cgpa.toFixed(2)}</span>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          {r.completed_courses_list.length === 0 ? (
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>—</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 160 }}>
                              {r.completed_courses_list.map((c, i) => (
                                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#555555', background: '#F5F5F5', border: '1px solid #E5E7EB', borderRadius: 3, padding: '1px 6px' }}>
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="p-3 align-middle">
                          <span className="text-[12px] font-semibold text-[#4B5563]">
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          {r.grade ? (
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{r.grade}</span>
                          ) : r.status === 'approved' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <select
                                id={`grade-select-${r.registration_id}`}
                                value={gradeInputs[r.registration_id] || ''}
                                onChange={e => setGradeInputs(prev => ({ ...prev, [r.registration_id]: e.target.value }))}
                                style={{ width: 58, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 4, padding: '4px 6px', fontSize: 12, fontWeight: 600, color: '#1F2937', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                                onFocus={e => (e.currentTarget.style.borderColor = '#C41212')}
                                onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                              >
                                <option value="">—</option>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                              <button
                                id={`grade-save-${r.registration_id}`}
                                title="Save Grade"
                                onClick={() => handleGrade(r.registration_id)}
                                disabled={isGrading}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 4, background: '#fff', color: '#9CA3AF', cursor: 'pointer', transition: 'all 150ms' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = '#C41212'; e.currentTarget.style.color = '#C41212'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#9CA3AF'; }}
                              >
                                {isGrading
                                  ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#C41212', animation: 'spin 0.6s linear infinite' }} />
                                  : <Star size={12} />
                                }
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span>
                          )}
                        </td>

                        <td className="p-3 align-middle">
                          {r.status === 'pending' ? (
                            <div className="flex gap-1.5 items-center">
                              <button
                                className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold text-[#1F2937] bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] hover:border-[#D1D5DB] rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => handleAction(r.registration_id, 'approved')}
                                disabled={!!isActing}
                                id={`approve-${r.registration_id}`}
                              >
                                {isActing ? <div className="mr-1" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#9CA3AF', animation: 'spin 0.6s linear infinite' }} /> : <><CheckCircle size={12} className="mr-1 opacity-60" /> Approve</>}
                              </button>
                              <button
                                className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold text-[#6B7280] bg-transparent hover:bg-[#F3F4F6] hover:text-[#1F2937] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => handleAction(r.registration_id, 'rejected')}
                                disabled={!!isActing}
                                id={`reject-${r.registration_id}`}
                              >
                                <XCircle size={12} className="mr-1 opacity-60" /> Reject
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

      {/* spin keyframe injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}