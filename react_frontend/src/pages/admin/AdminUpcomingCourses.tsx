import { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { createUpcomingCourse } from '../../api/admin';

export default function AdminUpcomingCourses() {
  const { showToast } = useToast();
  useEffect(() => { document.title = 'Upcoming Courses — AcadPortal'; }, []);

  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [professor, setProfessor] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseName || !startDate || !professor) {
      showToast('error', 'Please fill in all fields.');
      return;
    }
    
    try {
      const res = await createUpcomingCourse({ course_code: courseCode, course_name: courseName, start_date: startDate, professor });
      if (res.success) {
        showToast('success', res.message || `Upcoming Course ${courseCode} has been scheduled for ${startDate} with Professor ${professor}!`);
        setCourseCode('');
        setCourseName('');
        setStartDate('');
        setProfessor('');
      } else {
        showToast('error', res.message || 'Failed to add upcoming course.');
      }
    } catch (err) {
      showToast('error', 'Server error. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans'] animate-fade-in">
      <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-8">
        <div className="py-4 md:py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 bg-[#C41212] rounded-sm flex-shrink-0" />
            <div>
              <div className="text-[16px] md:text-[17px] font-bold text-[#1F2937] leading-tight tracking-tight">
                Upcoming Courses
              </div>
              <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                Manage and schedule new upcoming courses
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6 space-y-4 md:space-y-5 animate-fade-up">
        <div className="bg-white border border-[#E5E7EB] rounded-md px-4 md:px-5 py-4 w-full max-w-[500px] shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-md bg-[#FEF2F2] border border-[#C41212]/25 flex items-center justify-center flex-shrink-0">
              <Calendar size={18} className="text-[#C41212]" />
            </div>
            <div>
              <div className="font-bold text-[#1F2937] text-[15px]">Add Upcoming Course</div>
              <div className="text-[12px] text-[#9CA3AF]">Schedule a course for future semesters</div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="course-code">
                  Course Code
                </label>
                <input
                  id="course-code"
                  type="text"
                  placeholder="e.g. CSE201"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="course-name">
                  Course Name
                </label>
                <input
                  id="course-name"
                  type="text"
                  placeholder="e.g. Data Structures"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="start-date">
                  Expected Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="professor">
                  Professor
                </label>
                <input
                  id="professor"
                  type="text"
                  placeholder="e.g. Dr. Smith"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                  value={professor}
                  onChange={e => setProfessor(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#C41212] hover:bg-[#a01313] rounded-md transition-all duration-200 active:scale-95 shadow-sm hover:shadow"
            >
              <Plus size={13} /> Schedule Course
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
