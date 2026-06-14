import { useEffect, useState } from 'react';
import { BookOpen, Edit2, Check, X as XIcon } from 'lucide-react';
import { getProfessorDashboard, updateCourse } from '../../api/professor';
import type { ProfCourse } from '../../api/professor';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';
import type { ProfessorUser } from '../../api/auth';

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const profUser = user as ProfessorUser;
  const { showToast } = useToast();
  useEffect(() => { document.title = 'Dashboard — AcadPortal'; }, []);

  const [professor, setProfessor] = useState<ProfessorUser | null>(null);
  const [courses, setCourses] = useState<ProfCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', credits: 0, department: '' });
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => {
    if (!profUser?.id) return;
    setLoading(true);
    getProfessorDashboard(profUser.id)
      .then(res => {
        if (res.success) {
          setProfessor(res.professor as ProfessorUser);
          setCourses(res.courses);
        } else {
          setError(res.message || 'Failed to load dashboard.');
        }
      })
      .catch(() => setError('Cannot reach server.'))
      .finally(() => setLoading(false));
  }, [profUser?.id]);

  const handleEditClick = (c: ProfCourse) => {
    setEditingCourseId(c.id);
    setEditForm({ name: c.name, description: c.description || '', credits: c.credits, department: c.department });
  };

  const handleCancelEdit = () => {
    setEditingCourseId(null);
  };

  const handleSaveCourse = async (courseId: string) => {
    if (!profUser?.id) return;
    if (!editForm.name || !editForm.department || !editForm.credits) {
      showToast('error', 'Name, Department, and Credits are required!');
      return;
    }
    setSavingCourse(true);
    try {
      const res = await updateCourse(courseId, {
        professor_id: profUser.id,
        name: editForm.name,
        description: editForm.description,
        credits: editForm.credits,
        department: editForm.department
      });
      if (res.success) {
        showToast('success', res.message || 'Course updated successfully!');
        setCourses(courses.map(c => c.id === courseId ? { ...c, ...editForm } : c));
        setEditingCourseId(null);
      } else {
        showToast('error', res.message || 'Failed to update course.');
      }
    } catch (err) {
      showToast('error', 'Server error while updating course.');
    } finally {
      setSavingCourse(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px] bg-[#F5F5F5]">
      <Spinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans'] p-4 md:p-6">
      <div className="bg-white border border-[#E5E7EB] rounded-md p-5 text-[#C41212] font-bold text-[13px]">⚠ {error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans']">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-8 py-5">
        <div className="text-[22px] md:text-[24px] font-extrabold text-[#1F2937] leading-tight tracking-tight">Dashboard</div>
        <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
        <div className="text-[12px] text-[#9CA3AF] mt-0.5">Professor overview and course assignments</div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 md:px-8 py-5 md:py-6">

        {/* Profile card */}
        {professor && (
          <div className="bg-white border border-[#E5E7EB] rounded-md p-4 md:p-5 mb-4 md:mb-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">

              {/* Name / email / badges */}
              <div>
                <div className="text-[17px] md:text-[18px] font-bold text-[#1F2937] leading-tight">{professor.name}</div>
                <div className="text-[12px] text-[#9CA3AF] mt-0.5">{professor.email}</div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#FEF2F2] text-[#C41212] border border-[#C41212]/25 uppercase tracking-wide">{professor.department}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#F5F5F5] text-[#555555] border border-[#E5E7EB] uppercase tracking-wide">Faculty</span>
                </div>
              </div>

              {/* Stat cards — full width row on mobile, side-by-side on sm+ */}
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="flex flex-col gap-1 bg-white border border-[#E5E7EB] rounded-md p-3 flex-1 sm:flex-none sm:min-w-[120px] text-center shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <div className="text-[22px] md:text-[24px] font-bold text-[#1F2937] leading-none">{courses.length}</div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Courses Assigned</div>
                </div>
                <div className="flex flex-col gap-1 bg-white border border-[#E5E7EB] rounded-md p-3 flex-1 sm:flex-none sm:min-w-[120px] text-center shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <div className="text-[22px] md:text-[24px] font-bold text-[#1F2937] leading-none">{courses.filter(c => c.is_minor_eligible).length}</div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Minor Eligible</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses */}
        <div className="text-[11px] font-bold text-[#9CA3AF] tracking-wider uppercase mb-3 px-1">My Courses</div>
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-[#E5E7EB] rounded-md text-[#9CA3AF]">
            <BookOpen size={36} className="mb-3 opacity-40" />
            <p className="text-[13px] m-0 font-semibold">No courses assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {courses.map(c => {
              const isEditing = editingCourseId === c.id;

              return (
              <div
                key={c.id}
                className="bg-white border border-[#E5E7EB] rounded-md p-4 md:p-5 flex flex-col hover:border-[#D1D5DB] hover:shadow-sm transition-all duration-200"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-[#C41212] uppercase tracking-wider">{c.id}</div>
                      <div className="flex gap-1">
                        <button disabled={savingCourse} onClick={() => handleSaveCourse(c.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={14} /></button>
                        <button disabled={savingCourse} onClick={handleCancelEdit} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Cancel"><XIcon size={14} /></button>
                      </div>
                    </div>
                    <input type="text" className="w-full text-[14px] md:text-[15px] font-bold text-[#1F2937] leading-snug border border-[#E5E7EB] rounded px-2 py-1 outline-none focus:border-[#C41212]" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Course Name" />
                    <div className="flex gap-2">
                      <input type="text" className="w-1/2 text-[11.5px] font-semibold text-[#6B7280] border border-[#E5E7EB] rounded px-2 py-1 outline-none focus:border-[#C41212]" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} placeholder="Department" />
                      <input type="number" className="w-1/2 text-[11.5px] font-semibold text-[#6B7280] border border-[#E5E7EB] rounded px-2 py-1 outline-none focus:border-[#C41212]" value={editForm.credits} onChange={e => setEditForm({...editForm, credits: Number(e.target.value)})} placeholder="Credits" />
                    </div>
                    <textarea rows={2} className="w-full text-[12px] text-[#9CA3AF] leading-relaxed border border-[#E5E7EB] rounded px-2 py-1 outline-none focus:border-[#C41212] resize-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Short Description..." />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] font-bold text-[#C41212] uppercase tracking-wider">{c.id}</div>
                      <button onClick={() => handleEditClick(c)} className="p-1 text-[#9CA3AF] hover:text-[#C41212] transition-colors rounded cursor-pointer border-none bg-transparent" title="Edit Course"><Edit2 size={13} /></button>
                    </div>
                    <div className="text-[14px] md:text-[15px] font-bold text-[#1F2937] leading-snug mb-1.5">{c.name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#6B7280] mb-2">
                      <span className="font-semibold">{c.department}</span>
                      <span className="text-[#D1D5DB] text-[10px]">·</span>
                      <span className="font-semibold">{c.credits} cr</span>
                      {c.is_minor_eligible ? (
                        <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#FEF2F2] text-[#C41212] border border-[#C41212]/25 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C41212] shrink-0" />
                          Minor Eligible
                        </span>
                      ) : (
                        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#F5F5F5] text-[#555555] border border-[#E5E7EB] uppercase tracking-wider">Core Course</span>
                      )}
                    </div>
                    {c.description && (
                      <div className="text-[12px] text-[#9CA3AF] leading-relaxed mt-1 mb-1 line-clamp-2">
                        {c.description}
                      </div>
                    )}
                  </>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
