import { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Upload, Download, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { createCourse, uploadCoursesCSV } from '../../api/admin';
import BASE from '../../api/config';

export default function AdminCSECourses() {
  const { showToast } = useToast();
  useEffect(() => { document.title = 'CSE Courses — AcadPortal'; }, []);

  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [credits, setCredits] = useState('');
  const [professor, setProfessor] = useState('');
  const [description, setDescription] = useState('');
  const [isMinorEligible, setIsMinorEligible] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseName || !credits || !professor) {
      showToast('error', 'Please fill in all fields.');
      return;
    }
    
    try {
      const res = await createCourse({ course_code: courseCode, course_name: courseName, credits: Number(credits), professor, description, is_minor_eligible: isMinorEligible });
      if (res.success) {
        showToast('success', res.message || `Course ${courseCode} has been added with Professor ${professor}!`);
        setCourseCode('');
        setCourseName('');
        setCredits('');
        setProfessor('');
        setDescription('');
        setIsMinorEligible(false);
      } else {
        showToast('error', res.message || 'Failed to add course.');
      }
    } catch (err) {
      showToast('error', 'Server error. Please try again later.');
    }
  };

  const handleUploadCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      showToast('error', 'Please select a CSV file to upload.');
      return;
    }
    
    setIsUploading(true);
    setUploadErrors([]);
    
    try {
      const res = await uploadCoursesCSV(csvFile);
      if (res.success) {
        const { success_count, failure_count, errors } = res;
        if (failure_count > 0) {
          showToast('error', `Uploaded ${success_count} courses, but ${failure_count} failed.`);
          setUploadErrors(errors || []);
        } else {
          showToast('success', `Successfully uploaded all ${success_count} courses!`);
        }
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        showToast('error', res.error || 'Failed to process CSV file.');
      }
    } catch (err) {
      showToast('error', 'Server error during upload.');
    } finally {
      setIsUploading(false);
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
                CSE Courses
              </div>
              <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                Manage and enter all Computer Science Engineering courses
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6 space-y-4 md:space-y-5 animate-fade-up">
        {/* Main Grid for Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 items-start">
          
          {/* Individual Add Form */}
          <div className="bg-white border border-[#E5E7EB] rounded-md px-4 md:px-5 py-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-[#FEF2F2] border border-[#C41212]/25 flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-[#C41212]" />
              </div>
              <div>
                <div className="font-bold text-[#1F2937] text-[15px]">Add Single Course</div>
                <div className="text-[12px] text-[#9CA3AF]">Enter the details for a new CSE course</div>
              </div>
            </div>

            <form onSubmit={handleSave}>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#555555] mb-1">Course Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE101"
                    className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                    value={courseCode}
                    onChange={e => setCourseCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#555555] mb-1">Course Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to Programming"
                    className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#555555] mb-1">Credits</label>
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                    value={credits}
                    onChange={e => setCredits(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#555555] mb-1">Professor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Smith"
                    className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                    value={professor}
                    onChange={e => setProfessor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#555555] mb-1">Short Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. An introductory course to programming..."
                    className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all resize-none"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-6 mt-4">
                <input
                  type="checkbox"
                  id="isMinorEligible"
                  className="w-4 h-4 text-[#C41212] bg-white border-[#E5E7EB] rounded focus:ring-[#C41212] focus:ring-2 cursor-pointer"
                  checked={isMinorEligible}
                  onChange={e => setIsMinorEligible(e.target.checked)}
                />
                <label htmlFor="isMinorEligible" className="text-[13px] font-semibold text-[#1F2937] cursor-pointer">
                  Make this course Minor Eligible
                </label>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#C41212] hover:bg-[#a01313] rounded-md transition-all duration-200 active:scale-95 shadow-sm"
              >
                <Plus size={13} /> Add Single Course
              </button>
            </form>
          </div>

          {/* Bulk Upload Form */}
          <div className="bg-white border border-[#E5E7EB] rounded-md px-4 md:px-5 py-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-[#4B5563]" />
                </div>
                <div>
                  <div className="font-bold text-[#1F2937] text-[15px]">Bulk Upload CSV</div>
                  <div className="text-[12px] text-[#9CA3AF]">Upload multiple courses instantly</div>
                </div>
              </div>
              
              <a 
                href={`${BASE}/api/admin/courses/template`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#4B5563] bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-md transition-colors"
                title="Download Sample CSV"
              >
                <Download size={13} /> Template
              </a>
            </div>

            <form onSubmit={handleUploadCSV}>
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-[#555555] mb-2">Select CSV File</label>
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-md p-4 bg-[#F9FAFB] hover:border-[#C41212]/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    className="block w-full text-[13px] text-[#4B5563] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-[#FEF2F2] file:text-[#C41212] hover:file:bg-[#FEE2E2] cursor-pointer"
                    onChange={e => setCsvFile(e.target.files ? e.target.files[0] : null)}
                    ref={fileInputRef}
                    disabled={isUploading}
                  />
                  <p className="mt-2 text-[11px] text-[#9CA3AF]">Headers required: Course Code, Course Name, Credits, Professor, Description, Minor Eligible</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading || !csvFile}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#1F2937] hover:bg-[#374151] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed rounded-md transition-all duration-200 active:scale-95 shadow-sm"
              >
                {isUploading ? (
                  <><Loader2 size={13} className="animate-spin" /> Uploading & Processing...</>
                ) : (
                  <><Upload size={13} /> Upload Courses</>
                )}
              </button>
            </form>
            
            {uploadErrors.length > 0 && (
              <div className="mt-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md p-3 max-h-[150px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-1.5 text-[#B91C1C] text-[12px] font-bold mb-2">
                  <AlertCircle size={14} /> Upload Failures ({uploadErrors.length})
                </div>
                <ul className="list-disc list-inside text-[11px] text-[#7F1D1D] space-y-1">
                  {uploadErrors.map((err, i) => (
                    <li key={i}>Row {err.row}: {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
