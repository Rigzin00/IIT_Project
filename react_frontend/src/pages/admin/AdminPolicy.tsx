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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Spinner size="lg" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Registration Policy</div>
        <div className="page-sub">Control which year groups can log in and register for courses</div>
      </div>
      <div className="page-body">

        {/* Current policy display */}
        <div className="card" style={{ marginBottom: 14, maxWidth: 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={18} color="var(--accent-light)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Current Eligibility Window</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Students outside this window are denied access</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
              <div className="stat-value">Year {minYear}</div>
              <div className="stat-label">Minimum Eligible Year</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 18 }}>→</div>
            <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
              <div className="stat-value">Year {maxYear}</div>
              <div className="stat-label">Maximum Eligible Year</div>
            </div>
          </div>

          <div className="divider" />

          <form onSubmit={handleSave}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Update Policy</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label className="form-label" htmlFor="policy-min">Min Eligible Year</label>
                <select
                  id="policy-min"
                  className="form-input form-select"
                  value={editMin}
                  onChange={e => setEditMin(e.target.value)}
                >
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="policy-max">Max Eligible Year</label>
                <select
                  id="policy-max"
                  className="form-input form-select"
                  value={editMax}
                  onChange={e => setEditMax(e.target.value)}
                >
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" id="save-policy" className="btn btn-primary btn-sm" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? <><Spinner /> Saving…</> : <><Save size={13} /> Save Policy</>}
            </button>
          </form>
        </div>

        {/* Info box */}
        <div style={{ maxWidth: 500, padding: '10px 14px', background: 'var(--info-dim)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--info)' }}>
          <strong>ℹ How this works:</strong> Students whose year of study falls outside the min–max window will receive an <em>"Access Denied"</em> error when attempting to log in or register for courses. Changes take effect immediately.
        </div>
      </div>
    </div>
  );
}
