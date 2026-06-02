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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Spinner size="lg" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="page-title">Student Registrations</div>
            <div className="page-sub">{filtered.length} of {regs.length} students shown</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchData} id="refresh-regs">
              <RefreshCw size={13} /> Refresh
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('csv')} id="export-csv">
              <Download size={13} /> CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => handleExport('xlsx')} id="export-xlsx">
              <Download size={13} /> XLSX
            </button>
          </div>
        </div>
      </div>
      <div className="page-body">

        {/* Filter Bar */}
        <div className="filter-bar">
          <select className="form-input form-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)} id="filter-year">
            <option value="all">All Years</option>
            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select className="form-input form-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} id="filter-dept">
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="form-input form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} id="filter-status">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="form-input form-select" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} id="filter-course">
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-input form-select" value={doneCourseFilter} onChange={e => setDoneCourseFilter(e.target.value)} id="filter-done-course">
            <option value="all">Has Done: Any</option>
            {doneCourses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number" min="0" max="10" step="0.1"
            className="form-input"
            placeholder="Min CGPA"
            value={cgpaCutoff}
            onChange={e => setCgpaCutoff(e.target.value)}
            style={{ width: 100 }}
            id="filter-cgpa"
          />
          <button className="btn btn-ghost btn-xs" onClick={resetFilters} id="clear-filters">Clear</button>
        </div>

        {/* Sort by */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SORT BY</span>
          {(['student_name', 'cgpa', 'year_of_study'] as SortKey[]).map(k => (
            <button key={k} className={`btn btn-xs ${sortKey === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleSort(k)}>
              {k === 'student_name' ? 'Name' : k === 'cgpa' ? 'CGPA' : 'Year'} <SortIcon k={k} />
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card card-sm" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><p>No registrations match current filters.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Year / Dept</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('cgpa')}>
                      CGPA <SortIcon k="cgpa" />
                    </th>
                    <th>Done Courses</th>
                    <th>Status</th>
                    <th>Grade</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const isActing = actionLoading === r.registration_id + 'approved' || actionLoading === r.registration_id + 'rejected';
                    const isGrading = actionLoading === r.registration_id + 'grade';
                    return (
                      <tr key={r.registration_id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.student_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.roll_number}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.student_email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.course_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.course_id} · {r.credits} cr</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral">Yr {r.year_of_study}</span>
                          <span className="badge badge-accent" style={{ marginLeft: 4 }}>{r.student_department}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: r.cgpa >= 8.5 ? 'var(--success)' : r.cgpa >= 6 ? 'var(--warning)' : 'var(--danger)' }}>
                            {r.cgpa.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ maxWidth: 160 }}>
                          {r.completed_courses_list.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>None</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {r.completed_courses_list.map((c, i) => (
                                <span key={i} className="badge badge-neutral" style={{ fontSize: 10 }}>{c}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${STATUS_CLASS[r.status] || 'badge-neutral'}`}>{r.status}</span>
                        </td>
                        <td>
                          {r.grade ? (
                            <span style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: 13 }}>{r.grade}</span>
                          ) : r.status === 'approved' ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <select
                                className="form-input form-select"
                                style={{ padding: '3px 6px', fontSize: 12, width: 70 }}
                                value={gradeInputs[r.registration_id] || ''}
                                onChange={e => setGradeInputs(prev => ({ ...prev, [r.registration_id]: e.target.value }))}
                                id={`grade-select-${r.registration_id}`}
                              >
                                <option value="">—</option>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                              <button
                                className="btn btn-primary btn-xs"
                                onClick={() => handleGrade(r.registration_id)}
                                disabled={isGrading}
                                id={`grade-save-${r.registration_id}`}
                              >
                                {isGrading ? <Spinner /> : <Star size={11} />}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td>
                          {r.status === 'pending' ? (
                            <div className="actions">
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => handleAction(r.registration_id, 'approved')}
                                disabled={!!isActing}
                                id={`approve-${r.registration_id}`}
                              >
                                {isActing ? <Spinner /> : <><CheckCircle size={11} /> Approve</>}
                              </button>
                              <button
                                className="btn btn-danger btn-xs"
                                onClick={() => handleAction(r.registration_id, 'rejected')}
                                disabled={!!isActing}
                                id={`reject-${r.registration_id}`}
                              >
                                <XCircle size={11} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
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
