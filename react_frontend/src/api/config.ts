// In development (npm run dev), Vite runs on a different port than Flask,
// so we need the full URL to avoid CORS issues.
// In production, Flask serves the built React app on the same origin,
// so we use an empty string (relative URLs work fine).
const BASE = import.meta.env.DEV ? 'http://127.0.0.1:5000' : '';

export default BASE;
