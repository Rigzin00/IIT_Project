import { useEffect, useState } from 'react';
import { Shield, Save } from 'lucide-react';
import { getPolicy, setPolicy } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

// Generate batch year options dynamically: current year ± 10
// This prevents future maintenance — no hardcoded year lists to update.
const currentYear = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

export default function AdminPolicy() {
  const { showToast } = useToast();
  useEffect(() => { document.title = 'Registration Policy — AcadPortal'; }, []);
  const [minYear, setMinYear] = useState<number>(2022);
  const [maxYear, setMaxYear] = useState<number>(2025);
  const [activeYear, setActiveYear] = useState<string>('2026');
  const [editMin, setEditMin] = useState('');
  const [editMax, setEditMax] = useState('');
  const [editActiveYear, setEditActiveYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPolicy()
      .then(res => {
        if (res.success) {
          setMinYear(res.min_eligible_year);
          setMaxYear(res.max_eligible_year);
          setActiveYear(res.active_year || '2026');
          setEditMin(String(res.min_eligible_year));
          setEditMax(String(res.max_eligible_year));
          setEditActiveYear(res.active_year || '2026');
        } else { showToast('error', 'Failed to load policy.'); }
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseInt(editMin);
    const max = parseInt(editMax);
    const active_y = editActiveYear.trim();
    if (isNaN(min) || isNaN(max) || min < 2000 || max > 2099 || min > max || !active_y) {
      showToast('error', 'Invalid input. Please check years and active term.');
      return;
    }
    setSaving(true);
    try {
      const res = await setPolicy(min, max, active_y);
      if (res.success) {
        setMinYear(min); setMaxYear(max); setActiveYear(active_y);
        showToast('success', `Policy and Active Term updated successfully!`);
      } else { showToast('error', res.message || 'Failed to update policy.'); }
    } catch { showToast('error', 'Cannot reach server.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center font-['Open_Sans']">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Open_Sans'] animate-fade-in">
      <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-8">
        <div className="py-4 md:py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 bg-[#C41212] rounded-sm flex-shrink-0" />
            <div>
              <div className="text-[16px] md:text-[17px] font-bold text-[#1F2937] leading-tight tracking-tight">
                Registration Policy
              </div>
              <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                Control which student batches can log in and register for courses
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6 space-y-4 md:space-y-5 animate-fade-up">

        {/* Current policy display */}
        <div className="bg-white border border-[#E5E7EB] rounded-md px-4 md:px-5 py-4 w-full max-w-[500px] shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-md bg-[#FEF2F2] border border-[#C41212]/25 flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-[#C41212]" />
            </div>
            <div>
              <div className="font-bold text-[#1F2937] text-[15px]">Current Eligibility Window</div>
              <div className="text-[12px] text-[#9CA3AF]">Students outside this batch range are denied access</div>
            </div>
          </div>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-md py-3 text-center">
              <div className="text-[24px] font-extrabold text-[#1F2937] leading-none mb-1">{minYear}</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-1.5">Minimum Eligible Batch</div>
            </div>
            <div className="flex items-center text-[#9CA3AF] text-[18px]">→</div>
            <div className="flex-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-md py-3 text-center">
              <div className="text-[24px] font-extrabold text-[#1F2937] leading-none mb-1">{maxYear}</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-1.5">Maximum Eligible Batch</div>
            </div>
          </div>
          
          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-md py-3 text-center">
              <div className="text-[20px] font-extrabold text-[#C41212] leading-none mb-1">{activeYear}</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-1.5">Currently Active Year (Stamping)</div>
            </div>
          </div>

          <div className="h-px bg-[#E5E7EB] my-4" />

          <form onSubmit={handleSave}>
            <div className="font-bold text-[13px] text-[#1F2937] mb-3">Update Policy</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="policy-min">
                  Minimum Eligible Batch
                </label>
                <select
                  id="policy-min"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all cursor-pointer"
                  value={editMin}
                  onChange={e => setEditMin(e.target.value)}
                >
                  {BATCH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="policy-max">
                  Maximum Eligible Batch
                </label>
                <select
                  id="policy-max"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all cursor-pointer"
                  value={editMax}
                  onChange={e => setEditMax(e.target.value)}
                >
                  {BATCH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="policy-active-year">
                Active Academic Year
              </label>
              <input
                id="policy-active-year"
                type="text"
                placeholder="e.g. 2026"
                className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all"
                value={editActiveYear}
                onChange={e => setEditActiveYear(e.target.value)}
              />
            </div>
            <button
              type="submit"
              id="save-policy"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#C41212] hover:bg-[#a01313] rounded-md transition-all duration-200 active:scale-95 shadow-sm hover:shadow disabled:opacity-50 disabled:active:scale-100"
              disabled={saving}
            >
              {saving ? <><Spinner /> Saving…</> : <><Save size={13} /> Save Policy</>}
            </button>
          </form>
        </div>

        {/* Info box */}
        <div className="w-full max-w-[500px] p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-md text-[12px] text-[#555555] leading-relaxed animate-fade-in delay-100">
          <strong className="text-[#1F2937]">ℹ How this works:</strong> Students whose <strong>batch year</strong> (first 4 digits of roll number, e.g. <em>2023</em>EE1012) falls outside the selected range will receive an <em>"Access Denied"</em> error when attempting to log in or register for courses. Changes take effect immediately.
        </div>
      </div>
    </div>
  );
}
