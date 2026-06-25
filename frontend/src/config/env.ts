const DEFAULT_BASE_URL = 'http://localhost:5007/api/v1'

/** API base URL from `VITE_BASE_URL` in `.env` (trailing slash removed). */
export const API_BASE_URL = (import.meta.env.VITE_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
