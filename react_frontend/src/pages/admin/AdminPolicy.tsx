import { useEffect, useState } from 'react';
import { Shield, Save } from 'lucide-react';
import { getPolicy, setPolicy } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

export default function AdminPolicy() {
  const { showToast } = useToast();
  const [minYear, setMinYear] = useState<number>(1);
  const [maxYear, setMaxYear] = useState<number>(4);
  const [editMin, setEditMin] = useState('');
  const [editMax, setEditMax] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPolicy()
      .then(res => {
        if (res.success) {
          setMinYear(res.min_eligible_year);
          setMaxYear(res.max_eligible_year);
          setEditMin(String(res.min_eligible_year));
          setEditMax(String(res.max_eligible_year));
        } else { showToast('error', 'Failed to load policy.'); }
      })
      .catch(() => showToast('error', 'Cannot reach server.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseInt(editMin);
    const max = parseInt(editMax);
    if (isNaN(min) || isNaN(max) || min < 1 || max > 4 || min > max) {
      showToast('error', 'Invalid year range. Min must be ≤ Max, both between 1–4.');
      return;
    }
    setSaving(true);
    try {
      const res = await setPolicy(min, max);
      if (res.success) {
        setMinYear(min); setMaxYear(max);
        showToast('success', 'Policy updated! Students outside this range cannot log in.');
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
      <div className="bg-white border-b border-[#E5E7EB] px-8">
        <div className="py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 bg-[#C41212] rounded-sm flex-shrink-0" />
            <div>
              <div className="text-[17px] font-bold text-[#1F2937] leading-tight tracking-tight">
                Registration Policy
              </div>
              <div className="w-6 h-0.5 bg-[#C41212] rounded-sm mt-1" />
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                Control which year groups can log in and register for courses
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-8 py-6 space-y-5 animate-fade-up">
        
        {/* Current policy display */}
        <div className="bg-white border border-[#E5E7EB] rounded-md px-5 py-4 max-w-[500px] shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-md bg-[#FEF2F2] border border-[#C41212]/25 flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-[#C41212]" />
            </div>
            <div>
              <div className="font-bold text-[#1F2937] text-[15px]">Current Eligibility Window</div>
              <div className="text-[12px] text-[#9CA3AF]">Students outside this window are denied access</div>
            </div>
          </div>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-md py-3 text-center">
              <div className="text-[24px] font-extrabold text-[#1F2937] leading-none mb-1">Year {minYear}</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-1.5">Minimum Eligible Year</div>
            </div>
            <div className="flex items-center text-[#9CA3AF] text-[18px]">→</div>
            <div className="flex-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-md py-3 text-center">
              <div className="text-[24px] font-extrabold text-[#1F2937] leading-none mb-1">Year {maxYear}</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-1.5">Maximum Eligible Year</div>
            </div>
          </div>

          <div className="h-px bg-[#E5E7EB] my-4" />

          <form onSubmit={handleSave}>
            <div className="font-bold text-[13px] text-[#1F2937] mb-3">Update Policy</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="policy-min">Min Eligible Year</label>
                <select
                  id="policy-min"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all cursor-pointer"
                  value={editMin}
                  onChange={e => setEditMin(e.target.value)}
                >
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#555555] mb-1" htmlFor="policy-max">Max Eligible Year</label>
                <select
                  id="policy-max"
                  className="w-full bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1F2937] px-3 py-2 outline-none focus:border-[#C41212] focus:ring-1 focus:ring-[#C41212] transition-all cursor-pointer"
                  value={editMax}
                  onChange={e => setEditMax(e.target.value)}
                >
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" id="save-policy" className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#C41212] hover:bg-[#a01313] rounded-md transition-all duration-200 active:scale-95 shadow-sm hover:shadow disabled:opacity-50 disabled:active:scale-100" disabled={saving}>
              {saving ? <><Spinner /> Saving…</> : <><Save size={13} /> Save Policy</>}
            </button>
          </form>
        </div>

        {/* Info box */}
        <div className="max-w-[500px] p-3 bg-[#E0F2FE] border border-[#bae6fd] rounded-md text-[12px] text-[#0284c7] leading-relaxed animate-fade-in delay-100">
          <strong>ℹ How this works:</strong> Students whose year of study falls outside the min–max window will receive an <em>"Access Denied"</em> error when attempting to log in or register for courses. Changes take effect immediately.
        </div>
      </div>
    </div>
  );
}
