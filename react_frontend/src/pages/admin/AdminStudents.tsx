import { useEffect, useState } from 'react';
import { UserPlus, Trash2, AlertTriangle, Search } from 'lucide-react';
import { getAdminStudents, createStudent, deleteStudent } from '../../api/admin';
import type { Student } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import Pagination from '../../components/Pagination';
import { ArrowUp, ArrowDown } from 'lucide-react';

const DEPTS = ['CSE', 'ECE', 'ME', 'EE', 'CE', 'CHE', 'AE'];

export default function AdminStudents() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Update page title
  useEffect(() => { document.title = 'Students — AcadPortal'; }, []);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{
    roll_number: string; name: string; email: string;
    department: string; year_of_study: string; cgpa: string;
  }>({ roll_number: '', name: '', email: '', department: 'CSE', year_of_study: '1', cgpa: '0.0' });
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudents = () => {
    setLoading(true);
    getAdminStudents(page, limit, search, sort, order)
      .then(res => {
        if (res.success) {
          setStudents(res.students);
          if (res.pagination) {
            setTotal(res.pagination.total);
            setTotalPages(res.pagination.total_pages);
            setPage(res.pagination.page); // ensure sync
          }
        }
        else showToast('error', res.message || 'Failed to load students.');
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const delay = setTimeout(() => fetchStudents(), 300);
    return () => clearTimeout(delay);
  }, [page, limit, sort, order, search]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1); // reset to page 1 on new search
  };

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null;
    return order === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.roll_number || !form.name || !form.email || !form.department) {
      setFormError('All fields except CGPA are required.');
      return;
    }
    setAdding(true);
    try {
      const res = await createStudent({
        roll_number: form.roll_number.trim().toUpperCase(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim().toUpperCase(),
        year_of_study: Number(form.year_of_study),
        cgpa: form.cgpa ? parseFloat(form.cgpa) : 0,
      });
      if (res.success) {
        showToast('success', 'Student created successfully!');
        setShowAdd(false);
        setForm({ roll_number: '', name: '', email: '', department: 'CSE', year_of_study: '1', cgpa: '0.0' });
        fetchStudents();
      } else {
        setFormError(res.message || 'Failed to create student.');
      }
    } catch { setFormError('Cannot reach server.'); }
    finally { setAdding(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteStudent(deleteTarget.id);
      if (res.success) {
        showToast('success', `${deleteTarget.name} deleted.`);
        setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        showToast('error', res.message || 'Delete failed.');
      }
    } catch { showToast('error', 'Cannot reach server.'); }
    finally { setDeleting(false); }
  };

  const F = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans'] animate-fade-in">
      <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-8">
        <div className="py-4 md:py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 bg-[#C41212] rounded-sm flex-shrink-0" />
            <div>
              <div className="text-[16px] md:text-[17px] font-bold text-[#1F2937] leading-tight tracking-tight">
                Students
              </div>
              <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                {total} total students registered
              </div>
            </div>
          </div>
          <button className="flex items-center gap-1.5 bg-[#C41212] hover:bg-[#a01313] text-white px-3 py-1.5 rounded text-[13px] font-semibold transition-all duration-200 active:scale-95 shadow-sm hover:shadow" onClick={() => setShowAdd(true)} id="add-student-btn">
            <UserPlus size={14} /> Add Student
          </button>
        </div>
      </div>
      
      <div className="px-4 md:px-8 py-4 md:py-6 space-y-4 md:space-y-5 animate-fade-up">
        {/* Search */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 md:max-w-[380px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              id="admin-search"
              type="text"
              className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 pl-9 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
              placeholder="Search by name, roll, email, dept…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Students list */}
        <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 text-[#9CA3AF]">
              <Search size={32} className="mb-3 opacity-40" />
              <div className="text-[13px] font-semibold text-[#555555] mb-1">
                {search ? 'No students match your search' : 'No students found'}
              </div>
              {search && (
                <div className="text-[12px]">Try a different name, roll number, or department.</div>
              )}
            </div>
          ) : (
            <>
              {/* ════ MOBILE — Card list ════ */}
              <div className="md:hidden divide-y divide-[#F3F4F6]">
                {students.map(s => (
                  <div key={s.id} className="p-4 hover:bg-[#FAFAFA] transition-colors duration-150">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#1F2937] truncate">{s.name}</div>
                        <div className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">{s.email}</div>
                      </div>
                      <button
                        className="shrink-0 flex items-center justify-center p-1.5 text-[#C41212] hover:bg-[#FEF2F2] rounded transition-colors"
                        onClick={() => setDeleteTarget(s)}
                        id={`delete-${s.id}`}
                        title="Delete Student"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-[#555555] mb-2">{s.roll_number}</div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="font-semibold text-[#C41212] bg-[#FEF2F2] border border-[#C41212]/25 rounded px-2 py-0.5">
                        {s.department}
                      </span>
                      <span className="font-semibold text-[#555555] bg-[#F5F5F5] border border-[#E5E7EB] rounded px-2 py-0.5">
                        Year {s.year_of_study}
                      </span>
                      <span className="font-bold text-[#1F2937] bg-[#F5F5F5] border border-[#E5E7EB] rounded px-2 py-0.5">
                        CGPA {s.cgpa.toFixed(2)}
                      </span>
                      <span className={`font-semibold rounded px-2 py-0.5 border ${
                        s.is_approved_for_login
                          ? 'text-[#374151] border-[#D1D5DB] bg-[#F9FAFB]'
                          : 'text-[#C41212] border-[#C41212]/25 bg-[#FEF2F2]'
                      }`}>
                        {s.is_approved_for_login ? 'Login On' : 'Login Off'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ════ DESKTOP — Table ════ */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFA]">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6]" onClick={() => handleSort('name')}>
                        Student <SortIcon col="name" />
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6]" onClick={() => handleSort('roll_number')}>
                        Roll No. <SortIcon col="roll_number" />
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6]" onClick={() => handleSort('department')}>
                        Department <SortIcon col="department" />
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6]" onClick={() => handleSort('year_of_study')}>
                        Year <SortIcon col="year_of_study" />
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6]" onClick={() => handleSort('cgpa')}>
                        CGPA <SortIcon col="cgpa" />
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6]" onClick={() => handleSort('is_approved_for_login')}>
                        Login <SortIcon col="is_approved_for_login" />
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#E5E7EB]"></th>
                    </tr>
                  </thead>
                  <tbody className={loading ? 'opacity-50 pointer-events-none' : ''}>
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-[#FAFAFA] transition-colors duration-200">
                        <td className="px-4 py-3 border-b border-[#E5E7EB]">
                          <div className="text-[13px] font-semibold text-[#1F2937]">{s.name}</div>
                          <div className="text-[11px] text-[#9CA3AF] mt-0.5">{s.email}</div>
                        </td>
                        <td className="px-4 py-3 border-b border-[#E5E7EB]">
                          <span className="font-mono text-[12px] text-[#555555]">{s.roll_number}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-[#E5E7EB]">
                          <span className="text-[11px] font-semibold text-[#C41212] bg-[#FEF2F2] border border-[#C41212]/25 rounded px-2 py-0.5">
                            {s.department}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-[#E5E7EB]">
                          <span className="text-[11px] font-semibold text-[#555555] bg-[#F5F5F5] border border-[#E5E7EB] rounded px-2 py-0.5">
                            Year {s.year_of_study}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-[#E5E7EB]">
                          <span className="text-[13px] font-bold text-[#1F2937]">
                            {s.cgpa.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-[#E5E7EB]">
                          <span className={`text-[11px] font-semibold rounded px-2 py-0.5 border ${
                            s.is_approved_for_login
                              ? 'text-[#374151] border-[#D1D5DB] bg-[#F9FAFB]'
                              : 'text-[#C41212] border-[#C41212]/25 bg-[#FEF2F2]'
                          }`}>
                            {s.is_approved_for_login ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-[#E5E7EB] text-right">
                          <button
                            className="flex items-center justify-center p-1.5 text-[#C41212] hover:bg-[#FEF2F2] rounded transition-colors ml-auto"
                            onClick={() => setDeleteTarget(s)}
                            id={`delete-${s.id}`}
                            title="Delete Student"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination shared */}
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

      {/* Add Student Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setFormError(''); }} title="Add New Student">
        <form onSubmit={handleAdd} className="font-['Open_Sans']">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="col-span-2">
              <label className="block text-[12px] font-bold text-[#555555] mb-1">Full Name *</label>
              <input id="form-name" required className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => F('name', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#555555] mb-1">Roll Number *</label>
              <input id="form-roll" required className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" placeholder="e.g. 2024CSE1050" value={form.roll_number} onChange={e => F('roll_number', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#555555] mb-1">Department *</label>
              <select id="form-dept" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" value={form.department} onChange={e => F('department', e.target.value)}>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-bold text-[#555555] mb-1">Email *</label>
              <input id="form-email" required type="email" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" placeholder="e.g. rahul.sharma@institute.edu" value={form.email} onChange={e => F('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#555555] mb-1">Year of Study *</label>
              <select id="form-year" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" value={form.year_of_study} onChange={e => F('year_of_study', e.target.value)}>
                {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#555555] mb-1">CGPA (optional)</label>
              <input id="form-cgpa" type="number" min="0" max="10" step="0.01" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" placeholder="0.0" value={form.cgpa} onChange={e => F('cgpa', e.target.value)} />
            </div>
          </div>
          {formError && <div className="text-[13px] text-[#C41212] mb-3">{formError}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="px-4 py-2 text-[13px] font-semibold text-[#555555] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md transition-all duration-200 active:scale-95" onClick={() => { setShowAdd(false); setFormError(''); }}>Cancel</button>
            <button type="submit" id="form-submit" className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#C41212] hover:bg-[#a01313] rounded-md transition-all duration-200 active:scale-95 shadow-sm hover:shadow disabled:opacity-50 disabled:active:scale-100" disabled={adding}>
              {adding ? <><Spinner /> Creating…</> : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="flex gap-3 items-start mb-5 font-['Open_Sans']">
          <AlertTriangle size={20} className="text-[#C41212] flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-[#1F2937] mb-1">Delete {deleteTarget?.name}?</div>
            <div className="text-[13px] text-[#555555] leading-relaxed">
              This will permanently delete the student and all their registration and course records. This action cannot be undone.
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end font-['Open_Sans']">
          <button className="px-4 py-2 text-[13px] font-semibold text-[#555555] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md transition-all duration-200 active:scale-95" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button id="confirm-delete" className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#C41212] hover:bg-[#a01313] rounded-md transition-all duration-200 active:scale-95 shadow-sm hover:shadow disabled:opacity-50 disabled:active:scale-100" onClick={handleDelete} disabled={deleting}>
            {deleting ? <><Spinner /> Deleting…</> : 'Delete Student'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
