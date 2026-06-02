import { useEffect, useState } from 'react';
import { UserPlus, Trash2, AlertTriangle, Search } from 'lucide-react';
import { getAdminStudents, createStudent, deleteStudent } from '../../api/admin';
import type { Student } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';

const DEPTS = ['CSE', 'ECE', 'ME', 'EE', 'CE', 'CHE', 'AE'];

export default function AdminStudents() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    getAdminStudents()
      .then(res => {
        if (res.success) setStudents(res.students);
        else showToast('error', res.message || 'Failed to load students.');
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchStudents, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  );

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
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="page-title">Students</div>
            <div className="page-sub">{students.length} total students registered</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} id="add-student-btn">
            <UserPlus size={14} /> Add Student
          </button>
        </div>
      </div>
      <div className="page-body">

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="admin-search"
              type="text"
              className="form-input"
              placeholder="Search by name, roll, email, dept…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} shown</span>
        </div>

        {/* Table */}
        <div className="card card-sm" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>No students found.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>CGPA</th>
                    <th>Login</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.roll_number}</span></td>
                      <td><span className="badge badge-accent">{s.department}</span></td>
                      <td><span className="badge badge-neutral">Year {s.year_of_study}</span></td>
                      <td>
                        <span style={{ fontWeight: 700, color: s.cgpa >= 8.5 ? 'var(--success)' : s.cgpa >= 6 ? 'var(--warning)' : 'var(--danger)', fontSize: 13 }}>
                          {s.cgpa.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.is_approved_for_login ? 'badge-approved' : 'badge-rejected'}`}>
                          {s.is_approved_for_login ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => setDeleteTarget(s)}
                          id={`delete-${s.id}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setFormError(''); }} title="Add New Student">
        <form onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Full Name *</label>
              <input id="form-name" required className="form-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => F('name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Roll Number *</label>
              <input id="form-roll" required className="form-input" placeholder="e.g. 2024CSE1050" value={form.roll_number} onChange={e => F('roll_number', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Department *</label>
              <select id="form-dept" className="form-input form-select" value={form.department} onChange={e => F('department', e.target.value)}>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Email *</label>
              <input id="form-email" required type="email" className="form-input" placeholder="e.g. rahul.sharma@institute.edu" value={form.email} onChange={e => F('email', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Year of Study *</label>
              <select id="form-year" className="form-input form-select" value={form.year_of_study} onChange={e => F('year_of_study', e.target.value)}>
                {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">CGPA (optional)</label>
              <input id="form-cgpa" type="number" min="0" max="10" step="0.01" className="form-input" placeholder="0.0" value={form.cgpa} onChange={e => F('cgpa', e.target.value)} />
            </div>
          </div>
          {formError && <div className="form-error" style={{ marginBottom: 10 }}>{formError}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setFormError(''); }}>Cancel</button>
            <button type="submit" id="form-submit" className="btn btn-primary btn-sm" disabled={adding}>
              {adding ? <><Spinner /> Creating…</> : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Delete {deleteTarget?.name}?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              This will permanently delete the student and all their registration and course records. This action cannot be undone.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button id="confirm-delete" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <><Spinner /> Deleting…</> : 'Delete Student'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
