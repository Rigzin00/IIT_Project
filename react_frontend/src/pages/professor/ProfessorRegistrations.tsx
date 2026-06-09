import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, CheckCircle, XCircle, Star, Download, RefreshCw } from 'lucide-react';
import { getProfessorRegistrations, profAction, profGrade } from '../../api/professor';
import type { StudentRegistration } from '../../api/professor';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { ProfessorUser } from '../../api/auth';
import Pagination from '../../components/Pagination';

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

/* ── tiny reusable style strings ── */
const ghost = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#555555] bg-white border border-[#E5E7EB] rounded hover:bg-[#F5F5F5] hover:border-[#D1D5DB] transition-colors duration-100 cursor-pointer whitespace-nowrap';

export default function ProfessorRegistrations() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const profUser = user as ProfessorUser;

  const [regs, setRegs] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [exportLoading, setExportLoading] = useState<'csv' | 'xlsx' | null>(null);

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
      
      const response = await fetch(`http://127.0.0.1:5000/api/export?${params.toString()}`);
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
                {total} total registrations
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
            <div style={{ marginRight: 16 }}>
              <input
                type="text"
                placeholder="Search by name, roll, course..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                style={{ width: 250, padding: '6px 12px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 4, outline: 'none' }}
              />
            </div>
            <button onClick={() => fetchData()} className={ghost}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button onClick={() => handleExport('csv')} className={ghost} disabled={!!exportLoading}>
              <Download size={12} /> CSV
            </button>
            <button onClick={() => handleExport('xlsx')} disabled={!!exportLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#C41212', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              <Download size={12} /> XLSX
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px 40px' }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' }}>
          {regs.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', fontSize: 13, color: '#9CA3AF' }}>
              No registrations found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Open Sans',sans-serif", fontSize: 13, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    <th onClick={() => toggleSort('student_name')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Student <SortIcon k="student_name" /></th>
                    <th onClick={() => toggleSort('course_id')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Course <SortIcon k="course_id" /></th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Year / Dept</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>CGPA</th>
                    <th onClick={() => toggleSort('status')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Status <SortIcon k="status" /></th>
                    <th onClick={() => toggleSort('grade')} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '1px solid #E5E7EB' }}>Grade <SortIcon k="grade" /></th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-50 pointer-events-none' : ''}>
                  {regs.map(r => {
                    const isActing = actionLoading === r.registration_id + 'approved' || actionLoading === r.registration_id + 'rejected';
                    const isGrading = actionLoading === r.registration_id + 'grade';
                    return (
                      <tr key={r.registration_id} style={{ borderBottom: '1px solid #E5E7EB' }} onMouseOver={e => (e.currentTarget.style.background = '#FAFAFA')} onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
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
                    );
                  })}
                </tbody>
              </table>
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
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}