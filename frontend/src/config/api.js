// Normalized backend origin. VITE_API_URL may be a full URL or a bare host
// (Render's fromService exposes only the hostname), so prepend https:// when needed.
const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
export const API_ORIGIN = raw
  ? (raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`)
  : 'http://localhost:5000';

export const API_BASE_URL = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;
