// Reads the stored role from localStorage and returns the standard auth headers
// that every protected API call must include (X-Role for backend require_role check).
function getAuthHeaders(): Record<string, string> {
  try {
    const saved = localStorage.getItem('ap_session');
    if (saved) {
      const { role } = JSON.parse(saved);
      if (role) return { 'X-Role': role };
    }
  } catch { /* ignore */ }
  return {};
}

export default getAuthHeaders;
