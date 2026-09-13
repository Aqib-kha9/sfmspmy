/**
 * API configuration for the admin panel.
 *
 * The backend is mounted at /api/v1 and its CORS policy allows the dev origin
 * (http://localhost:5173), so the panel talks to it directly. The base URL can
 * be overridden at build/dev time with VITE_API_URL.
 */
const DEFAULT_API_BASE = 'http://localhost:4000/api/v1';

export const API_BASE: string =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? DEFAULT_API_BASE;

export const API_SOURCE = 'admin_web' as const;

export const ACCESS_TOKEN_KEY = 'cfd.admin.accessToken';
export const REFRESH_TOKEN_KEY = 'cfd.admin.refreshToken';
export const STAFF_PROFILE_KEY = 'cfd.admin.staff';
