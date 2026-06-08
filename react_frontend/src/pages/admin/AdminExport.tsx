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
    if (user?.email) {
      params.set('email', user.email);
    }
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
  console.log("USER:", user);
  console.log("EMAIL:", user?.email);
  console.log("URL:", buildUrl(format));

  const handleDownload = async () => {
    try {
      const response = await fetch(buildUrl(format));

      if (!response.ok) {
        // Handle server errors gracefully without exposing a raw JSON page to user
        let errMsg = 'Failed to download data';
        try {
          const errData = await response.json();
          if (errData.message) errMsg = errData.message;
        } catch (e) {
          errMsg = `Export failed: ${response.statusText}`;
        }
        throw new Error(errMsg);
      }

      const blob = await response.blob();

      // Extract original filename provided by backend in Content-Disposition if available
      let filename = `academic_portal_students.${format}`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Programmatically trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error: any) {
      console.error("Export download error:", error);
      alert(error.message || "An error occurred while downloading the export file.");
    }
  };

  const filters = [
    { label: 'Year', active: year !== 'all', value: year !== 'all' ? `Year ${year}` : null },
    { label: 'Dept', active: department !== 'all', value: department !== 'all' ? department : null },
    { label: 'Min CGPA', active: !!cgpaCutoff, value: cgpaCutoff || null },
    { label: 'Wants Course', active: !!wantsCourse, value: wantsCourse || null },
    { label: 'Done Course', active: !!hasDoneCourse, value: hasDoneCourse || null },
  ].filter(f => f.active);

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans'] animate-fade-in">
      <div className="bg-white border-b border-[#E5E7EB] px-8">
        <div className="py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 bg-[#C41212] rounded-sm flex-shrink-0" />
            <div>
              <div className="text-[17px] font-bold text-[#1F2937] leading-tight tracking-tight">
                Export Student Data
              </div>
              <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                Download filtered student records as CSV or Excel
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5 animate-fade-up">
        <div className="max-w-[540px]">

          {/* Format selector */}
          <div className="font-bold text-[13px] text-[#1F2937] mb-3">Output Format</div>
          <div className="flex gap-3 mb-5">
            {(['xlsx', 'csv'] as const).map(f => (
              <button
                key={f}
                id={`format-${f}`}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold transition-all duration-200 active:scale-95 ${format === f
                    ? 'bg-[#C41212] text-white border border-[#C41212] shadow-sm'
                    : 'bg-white text-[#555555] border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:shadow-sm'
                  }`}
                onClick={() => setFormat(f)}
              >
                {f === 'xlsx' ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                {f.toUpperCase()}
                {f === 'xlsx' && <span className="text-[10px] opacity-80 font-bold ml-1 tracking-wide">· RECOMMENDED</span>}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="font-bold text-[13px] text-[#1F2937] mb-3">
            Filters <span className="text-[#9CA3AF] font-normal text-[12px]">(all optional)</span>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="exp-year">Year of Study</label>
                <select id="exp-year" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all cursor-pointer" value={year} onChange={e => setYear(e.target.value)}>
                  <option value="all">All Years</option>
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="exp-dept">Department</label>
                <select id="exp-dept" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all cursor-pointer" value={department} onChange={e => setDepartment(e.target.value)}>
                  {DEPTS.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="exp-cgpa">Minimum CGPA</label>
                <input id="exp-cgpa" type="number" min="0" max="10" step="0.1" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" placeholder="e.g. 7.5" value={cgpaCutoff} onChange={e => setCgpaCutoff(e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="exp-wants">Wants Course (ID)</label>
                <input id="exp-wants" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" placeholder="e.g. CS301" value={wantsCourse} onChange={e => setWantsCourse(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="exp-done">Has Completed Course (ID)</label>
                <input id="exp-done" className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all" placeholder="e.g. CS101" value={hasDoneCourse} onChange={e => setHasDoneCourse(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Active filters preview */}
          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-[11px] text-[#9CA3AF] mr-1">Active filters:</span>
              {filters.map(f => (
                <span key={f.label} className="text-[11px] font-semibold text-[#C41212] bg-[#FEF2F2] border border-[#C41212]/25 rounded px-2 py-0.5">
                  {f.label}: {f.value}
                </span>
              ))}
            </div>
          )}

          {/* Columns info */}
          <div className="p-3 bg-white border border-[#E5E7EB] rounded-md mb-5 text-[12px] text-[#555555] leading-relaxed">
            <strong className="text-[#1F2937]">Output columns:</strong>{' '}
            Roll Number, Student Name, Email, Department, Year of Study, CGPA, Completed Courses, Pre-registered Courses
          </div>

          {/* Download button */}
          <button
            id="download-export"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-white bg-[#C41212] hover:bg-[#a01313] rounded-md transition-all duration-200 active:scale-95 shadow-sm hover:shadow"
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
