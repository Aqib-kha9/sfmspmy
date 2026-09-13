/**
 * API configuration for the admin panel.
 *
 * The backend is mounted at /api/v1. The base URL is taken from the VITE_API_URL
 * environment variable (see .env.example) so no host is baked into the bundle:
 *   - configured: VITE_API_URL is used verbatim (trailing slashes trimmed);
 *   - development, unset: falls back to the local backend — its CORS policy
 *     allows the dev origin http://localhost:5173;
 *   - production, unset: falls back to a same-origin path (/api/v1) so the panel
 *     works behind a reverse proxy without hardcoding a hostname.
 */
const DEV_FALLBACK_API_BASE = 'http://localhost:4000/api/v1';
const SAME_ORIGIN_API_BASE = '/api/v1';

function stripTrailingSlashes(value: string): string {
  let result = value.trim();
  while (result.endsWith('/')) result = result.slice(0, -1);
  return result;
}

function resolveApiBase(): string {
  const configured = import.meta.env?.VITE_API_URL?.trim();
  if (configured) return stripTrailingSlashes(configured);
  return import.meta.env?.DEV ? DEV_FALLBACK_API_BASE : SAME_ORIGIN_API_BASE;
}

export const API_BASE: string = resolveApiBase();

export const API_SOURCE = 'admin_web' as const;

export const ACCESS_TOKEN_KEY = 'cfd.admin.accessToken';
export const REFRESH_TOKEN_KEY = 'cfd.admin.refreshToken';
export const STAFF_PROFILE_KEY = 'cfd.admin.staff';
