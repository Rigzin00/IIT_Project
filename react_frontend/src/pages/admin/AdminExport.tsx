import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ProfessorUser } from '../../api/auth';

const DEPTS = ['all', 'CSE', 'ECE', 'ME', 'EE', 'CE', 'CHE', 'AE'];

export default function AdminExport() {
  const { user, role } = useAuth();
  const profUser = user as ProfessorUser;

  const [year, setYear] = useState('all');
  const [department, setDepartment] = useState('all');
  const [cgpaCutoff, setCgpaCutoff] = useState('');
  const [wantsCourse, setWantsCourse] = useState('');
  const [hasDoneCourse, setHasDoneCourse] = useState('');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx');

  const buildUrl = (fmt: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ format: fmt });
    if (role === 'professor' && profUser?.id) {
      params.set('role', 'professor');
      params.set('professor_id', profUser.id);
    } else {
      params.set('role', 'admin');
    }
    if (year !== 'all') params.set('year', year);
    if (department !== 'all') params.set('department', department);
    if (cgpaCutoff) params.set('cgpa_cutoff', cgpaCutoff);
    if (wantsCourse.trim()) params.set('wants_course', wantsCourse.trim().toUpperCase());
    if (hasDoneCourse.trim()) params.set('has_done_course', hasDoneCourse.trim().toUpperCase());
    return `http://127.0.0.1:5000/api/export?${params.toString()}`;
  };

  const handleDownload = () => {
    window.open(buildUrl(format), '_blank');
  };

  const filters = [
    { label: 'Year', active: year !== 'all', value: year !== 'all' ? `Year ${year}` : null },
    { label: 'Dept', active: department !== 'all', value: department !== 'all' ? department : null },
    { label: 'Min CGPA', active: !!cgpaCutoff, value: cgpaCutoff || null },
    { label: 'Wants Course', active: !!wantsCourse, value: wantsCourse || null },
    { label: 'Done Course', active: !!hasDoneCourse, value: hasDoneCourse || null },
  ].filter(f => f.active);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Export Student Data</div>
        <div className="page-sub">Download filtered student records as CSV or Excel</div>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 540 }}>

          {/* Format selector */}
          <div className="section-title" style={{ marginBottom: 10 }}>Output Format</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {(['xlsx', 'csv'] as const).map(f => (
              <button
                key={f}
                id={`format-${f}`}
                className={`btn ${format === f ? 'btn-primary' : 'btn-ghost'}`}
                style={{ gap: 8, flex: 1, justifyContent: 'center' }}
                onClick={() => setFormat(f)}
              >
                {f === 'xlsx' ? <FileSpreadsheet size={15} /> : <FileText size={15} />}
                {f.toUpperCase()}
                {f === 'xlsx' && <span style={{ fontSize: 10, opacity: 0.7 }}>· Recommended</span>}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="section-title" style={{ marginBottom: 10 }}>Filters <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(all optional)</span></div>
          <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label" htmlFor="exp-year">Year of Study</label>
                <select id="exp-year" className="form-input form-select" value={year} onChange={e => setYear(e.target.value)}>
                  <option value="all">All Years</option>
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="exp-dept">Department</label>
                <select id="exp-dept" className="form-input form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                  {DEPTS.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="exp-cgpa">Minimum CGPA</label>
                <input id="exp-cgpa" type="number" min="0" max="10" step="0.1" className="form-input" placeholder="e.g. 7.5" value={cgpaCutoff} onChange={e => setCgpaCutoff(e.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor="exp-wants">Wants Course (ID)</label>
                <input id="exp-wants" className="form-input" placeholder="e.g. CS301" value={wantsCourse} onChange={e => setWantsCourse(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label" htmlFor="exp-done">Has Completed Course (ID)</label>
                <input id="exp-done" className="form-input" placeholder="e.g. CS101" value={hasDoneCourse} onChange={e => setHasDoneCourse(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Active filters preview */}
          {filters.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active filters:</span>
              {filters.map(f => (
                <span key={f.label} className="badge badge-accent">{f.label}: {f.value}</span>
              ))}
            </div>
          )}

          {/* Columns info */}
          <div style={{ padding: '10px 14px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Output columns:</strong>{' '}
            Roll Number, Student Name, Email, Department, Year of Study, CGPA, Completed Courses, Pre-registered Courses
          </div>

          {/* Download button */}
          <button
            id="download-export"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 14, gap: 8 }}
            onClick={handleDownload}
          >
            <Download size={16} />
            Download {format.toUpperCase()}
            {filters.length > 0 && ` (${filters.length} filter${filters.length > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
}
