// In development, Vite proxies /api/* to Flask at :5000 (see vite.config.ts).
// In production, Flask serves the built React app on the same origin.
// Either way, relative URLs work — no hardcoded port needed.
const BASE = '';

export default BASE;

