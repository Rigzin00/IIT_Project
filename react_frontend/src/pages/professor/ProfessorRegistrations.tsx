import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, CheckCircle, XCircle, Star, Download, RefreshCw, ChevronDown as ChevDown } from 'lucide-react';
import { getProfessorRegistrations, profAction, profGrade } from '../../api/professor';
import type { StudentRegistration } from '../../api/professor';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { ProfessorUser } from '../../api/auth';
import Pagination from '../../components/Pagination';
import BASE from '../../api/config';

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

/* ── tiny reusable style strings ── */
const ghost = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#555555] bg-white border border-[#E5E7EB] rounded hover:bg-[#F5F5F5] hover:border-[#D1D5DB] transition-colors duration-100 cursor-pointer whitespace-nowrap';

/* ── Status text helper (on-theme only) ── */
const statusLabel: Record<string, string> = {
  pending:  'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};
const statusStyle: Record<string, string> = {
  pending:  'text-[#555555]',
  approved: 'text-[#1F2937]',
  rejected: 'text-[#C41212]',
};

export default function ProfessorRegistrations() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const profUser = user as ProfessorUser;

  const [regs, setRegs] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [exportLoading, setExportLoading] = useState<'csv' | 'xlsx' | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = () => {
    if (!profUser?.id) return;
    setLoading(true);
    getProfessorRegistrations(profUser.id, page, limit, search, sortKey, sortDir)
      .then(res => {
        if (res.success) {
          setRegs(res.registrations);
          if (res.pagination) {
            setTotal(res.pagination.total);
            setTotalPages(res.pagination.total_pages);
            setPage(res.pagination.page);
          }
        }
        else showToast('error', res.message || 'Failed to load.');
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const delay = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(delay);
  }, [profUser?.id, page, limit, search, sortKey, sortDir]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k
      ? (sortDir === 'asc' ? <ChevronUp size={11} className="inline ml-1" /> : <ChevronDown size={11} className="inline ml-1" />)
      : <ChevronUp size={11} className="opacity-20 inline ml-1" />;

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

  const handleExport = async (fmt: 'csv' | 'xlsx') => {
    if (exportLoading) return;
    setExportLoading(fmt);
    try {
      const params = new URLSearchParams({ role: 'professor', professor_id: profUser.id, format: fmt });
      if (user?.email) params.set('email', user.email);

      const response = await fetch(`${BASE}/api/export?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to download data');

      const blob = await response.blob();
      let filename = `registrations.${fmt}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      showToast('success', `Export generated successfully!`);
    } catch (err: any) {
      showToast('error', err.message || 'An error occurred during export.');
    } finally {
      setExportLoading(null);
    }
  };

  if (loading && regs.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#F5F5F5' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#C41212', animation: 'spin 0.6s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', fontFamily: "'Open Sans','Helvetica Neue',Helvetica,Arial,sans-serif", color: '#555555' }}>

      {/* ══════════════════════════ PAGE HEADER ══════════════════════════ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 16px' }} className="md:!px-8">
        <div style={{ padding: '16px 0 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

          {/* Title block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 36, background: '#C41212', borderRadius: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', letterSpacing: '-0.1px', lineHeight: 1.3 }}>
                Student Registrations
              </div>
              <div style={{ width: 24, height: 2, background: '#C41212', borderRadius: 1, marginTop: 4 }} />
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                {total} total registrations
              </div>
            </div>
          </div>

          {/* Search + actions — wrap nicely on mobile */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name, roll, course..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="flex-1 sm:flex-none sm:w-[220px] md:w-[250px] px-3 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[4px] outline-none focus:border-[#C41212] transition-colors duration-150"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => fetchData()} className={ghost}>
                <RefreshCw size={12} /> Refresh
              </button>
              <button onClick={() => handleExport('csv')} className={ghost} disabled={!!exportLoading}>
                <Download size={12} /> CSV
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={!!exportLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#C41212', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: exportLoading ? 0.7 : 1, transition: 'opacity 0.15s' }}
              >
                <Download size={12} /> XLSX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════ BODY ══════════════════════════ */}
      <div className="p-4 md:p-8 md:!pt-6 md:!pb-10">
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' }}>

          {regs.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', fontSize: 13, color: '#9CA3AF' }}>
              No registrations found.
            </div>
          ) : (
            <>
              {/* ════════════════════════════════════════
                  MOBILE — Card list (hidden on md+)
              ════════════════════════════════════════ */}
              <div className={`md:hidden divide-y divide-[#F3F4F6] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                {regs.map(r => {
                  const isActing = actionLoading === r.registration_id + 'approved' || actionLoading === r.registration_id + 'rejected';
                  const isGrading = actionLoading === r.registration_id + 'grade';
                  const isExpanded = expandedStudentId === r.student_id;

                  return (
                    <div key={r.registration_id} className="p-4 border-b border-[#F3F4F6] last:border-b-0 transition-colors duration-150 hover:bg-[#FAFAFA]">

                      {/* ── Card top row: name + status ── */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#1F2937] truncate">{r.student_name}</div>
                          <div className="text-[11px] text-[#9CA3AF] mt-0.5">{r.roll_number}</div>
                        </div>
                        {/* Status — text only, no background color */}
                        <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wide ${statusStyle[r.status] || 'text-[#555555]'}`}>
                          {statusLabel[r.status] || r.status}
                        </span>
                      </div>

                      {/* ── Course info ── */}
                      <div className="mb-3">
                        <div className="text-[12px] font-semibold text-[#1F2937]">{r.course_name}</div>
                        <div className="text-[10px] font-bold text-[#C41212] mt-0.5">{r.course_id}</div>
                      </div>

                      {/* ── Meta row: year/dept · cgpa · grade ── */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11px] text-[#555555]">
                        <span>Yr {r.year_of_study} · {r.student_department}</span>
                        <span className="text-[#9CA3AF]">CGPA <span className="text-[#1F2937] font-bold">{r.cgpa?.toFixed(2)}</span></span>
                        {r.grade && (
                          <span className="text-[#9CA3AF]">Grade <span className="text-[#1F2937] font-bold">{r.grade}</span></span>
                        )}
                      </div>

                      {/* ── Prior courses toggle ── */}
                      {r.self_reported_courses?.length > 0 && (
                        <button
                          onClick={() => setExpandedStudentId(prev => prev === r.student_id ? null : r.student_id)}
                          className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border border-[#E5E7EB] rounded-[4px] bg-white text-[#555555] hover:border-[#C41212] hover:text-[#C41212] transition-colors duration-150"
                        >
                          <ChevDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          {r.self_reported_courses.length} Prior Course{r.self_reported_courses.length !== 1 ? 's' : ''}
                        </button>
                      )}

                      {/* ── Expanded prior courses (mobile) ── */}
                      {isExpanded && r.self_reported_courses?.length > 0 && (
                        <div className="mb-3 pl-3 border-l-2 border-[#C41212]">
                          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Prior Completed Courses</div>
                          <div className="space-y-2">
                            {r.self_reported_courses.map(c => (
                              <div key={c.id} className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[4px] p-2.5 text-[11px]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-[#C41212] tracking-wide">{c.course_code}</span>
                                  {c.grade && <span className="font-bold text-[#1F2937]">{c.grade}</span>}
                                </div>
                                <div className="font-semibold text-[#1F2937] mb-0.5">{c.course_name}</div>
                                <div className="text-[#9CA3AF]">
                                  {c.credits} cr · {[c.semester, c.year].filter(Boolean).join(', ')}
                                </div>
                                {c.proof_url && (
                                  <a href={c.proof_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[#C41212] font-semibold hover:underline mt-1 inline-block">
                                    View Proof →
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Grade input (mobile) ── */}
                      {!r.grade && r.status === 'approved' && (
                        <div className="flex items-center gap-2 mb-3">
                          <select
                            value={gradeInputs[r.registration_id] || ''}
                            onChange={e => setGradeInputs(prev => ({ ...prev, [r.registration_id]: e.target.value }))}
                            className="flex-1 text-[12px] border border-[#E5E7EB] rounded-[4px] px-2 py-1.5 bg-white outline-none focus:border-[#C41212] transition-colors duration-150"
                          >
                            <option value="">— Select grade —</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <button
                            onClick={() => handleGrade(r.registration_id)}
                            disabled={isGrading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-[#C41212] border-none rounded-[4px] cursor-pointer disabled:opacity-60 transition-opacity duration-150"
                          >
                            {isGrading
                              ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />
                              : <Star size={12} />
                            }
                            Save
                          </button>
                        </div>
                      )}

                      {/* ── Approve / Reject actions (mobile) ── */}
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold text-[#1F2937] bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] hover:border-[#D1D5DB] rounded-[4px] transition-colors duration-150 disabled:opacity-60"
                            onClick={() => handleAction(r.registration_id, 'approved')}
                            disabled={!!isActing}
                          >
                            <CheckCircle size={13} className="opacity-60" /> Approve
                          </button>
                          <button
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold text-[#C41212] hover:bg-[#FEF2F2] bg-white border border-[#E5E7EB] hover:border-[#C41212] rounded-[4px] transition-colors duration-150 disabled:opacity-60"
                            onClick={() => handleAction(r.registration_id, 'rejected')}
                            disabled={!!isActing}
                          >
                            <XCircle size={13} className="opacity-70" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ════════════════════════════════════════
                  DESKTOP — Original table (hidden on mobile)
              ════════════════════════════════════════ */}
              <div className={`hidden md:block overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Open Sans',sans-serif", fontSize: 13, whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      <th onClick={() => toggleSort('student_name')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Student <SortIcon k="student_name" /></th>
                      <th onClick={() => toggleSort('course_id')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Course <SortIcon k="course_id" /></th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Year / Dept</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>CGPA</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Prior Courses</th>
                      <th onClick={() => toggleSort('status')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Status <SortIcon k="status" /></th>
                      <th onClick={() => toggleSort('grade')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Grade <SortIcon k="grade" /></th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regs.map(r => {
                      const isActing = actionLoading === r.registration_id + 'approved' || actionLoading === r.registration_id + 'rejected';
                      const isGrading = actionLoading === r.registration_id + 'grade';
                      return (
                        <React.Fragment key={r.registration_id}>
                          <tr style={{ borderBottom: '1px solid #E5E7EB' }} onMouseOver={e => (e.currentTarget.style.background = '#FAFAFA')} onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{r.student_name}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.roll_number}</div>
                            </td>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{r.course_name}</div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#C41212' }}>{r.course_id}</div>
                            </td>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F9FAFB] border border-[#E5E7EB] text-[#4B5563]">Yr {r.year_of_study} · {r.student_department}</span>
                            </td>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{r.cgpa?.toFixed(2)}</span>
                            </td>
                            {/* ── Prior Courses pill button ── */}
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              {r.self_reported_courses?.length > 0 ? (
                                <button
                                  onClick={() => setExpandedStudentId(prev => prev === r.student_id ? null : r.student_id)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '3px 10px', fontSize: 11, fontWeight: 700,
                                    color: expandedStudentId === r.student_id ? '#fff' : '#C41212',
                                    background: expandedStudentId === r.student_id ? '#C41212' : '#FEF2F2',
                                    border: '1px solid #C41212', borderRadius: 20, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {expandedStudentId === r.student_id ? '▲' : '▼'}
                                  &nbsp;{r.self_reported_courses.length} Course{r.self_reported_courses.length !== 1 ? 's' : ''}
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: '#D1D5DB', fontStyle: 'italic' }}>None</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
                            </td>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              {r.grade ? (
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{r.grade}</span>
                              ) : r.status === 'approved' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <select value={gradeInputs[r.registration_id] || ''} onChange={e => setGradeInputs(prev => ({ ...prev, [r.registration_id]: e.target.value }))} style={{ width: 58, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 4, padding: '4px 6px', fontSize: 12 }}>
                                    <option value="">—</option>
                                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                  <button onClick={() => handleGrade(r.registration_id)} disabled={isGrading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 4 }}>
                                    {isGrading ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#C41212', animation: 'spin 0.6s linear infinite' }} /> : <Star size={12} />}
                                  </button>
                                </div>
                              ) : <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span>}
                            </td>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              {r.status === 'pending' ? (
                                <div className="flex gap-1.5 items-center">
                                  <button className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold text-[#1F2937] bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] rounded" onClick={() => handleAction(r.registration_id, 'approved')} disabled={!!isActing}>
                                    <CheckCircle size={12} className="mr-1 opacity-60" /> Approve
                                  </button>
                                  <button className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold text-[#6B7280] hover:bg-[#F3F4F6] rounded" onClick={() => handleAction(r.registration_id, 'rejected')} disabled={!!isActing}>
                                    <XCircle size={12} className="mr-1 opacity-60" /> Reject
                                  </button>
                                </div>
                              ) : <span className="text-[#9CA3AF] text-[11px]">—</span>}
                            </td>
                          </tr>
                          {/* ── Expanded: Self-Reported Prior Courses panel ── */}
                          {expandedStudentId === r.student_id && (
                            <tr style={{ background: '#FFFBFB', borderBottom: '2px solid #FECACA' }}>
                              <td colSpan={8} style={{ padding: '0' }}>
                                <div style={{ borderLeft: '3px solid #C41212', margin: '12px 16px 12px 24px', paddingLeft: 16 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#C41212', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                                    Prior Completed Courses (Self-Reported) — {r.student_name}
                                  </div>
                                  {!r.self_reported_courses?.length ? (
                                    <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No self-reported courses on record.</div>
                                  ) : (
                                    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', maxWidth: 720, background: '#fff', borderRadius: 6, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                      <thead>
                                        <tr style={{ background: '#F9FAFB' }}>
                                          {['Course Code', 'Course Name', 'Credits', 'Grade', 'Semester / Year', 'Proof'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '7px 14px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {r.self_reported_courses.map((c, idx) => (
                                          <tr key={c.id} style={{ borderBottom: idx < r.self_reported_courses.length - 1 ? '1px solid #F3F4F6' : 'none', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                                            <td style={{ padding: '7px 14px', fontWeight: 700, color: '#C41212', fontSize: 11, letterSpacing: '0.03em' }}>{c.course_code}</td>
                                            <td style={{ padding: '7px 14px', color: '#1F2937', fontWeight: 600 }}>{c.course_name}</td>
                                            <td style={{ padding: '7px 14px', color: '#555555' }}>{c.credits}</td>
                                            <td style={{ padding: '7px 14px', fontWeight: 700, color: '#1F2937' }}>{c.grade || '—'}</td>
                                            <td style={{ padding: '7px 14px', color: '#6B7280' }}>{[c.semester, c.year].filter(Boolean).join(', ')}</td>
                                            <td style={{ padding: '7px 14px' }}>
                                              {c.proof_url ? (
                                                <a href={c.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontSize: 11, fontWeight: 600, textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
                                                  View Proof
                                                </a>
                                              ) : (
                                                <span style={{ color: '#9CA3AF', fontSize: 11, fontStyle: 'italic' }}>None</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination — shared for both layouts */}
              <Pagination
                page={page}
                limit={limit}
                total={total}
                totalPages={totalPages}
                onPageChange={setPage}
                onLimitChange={setLimit}
                isLoading={loading}
              />
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}