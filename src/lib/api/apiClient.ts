import { ApiClient, TokenStore, UnauthorizedReason } from './client';
import { API_BASE, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, STAFF_PROFILE_KEY } from './config';

/**
 * localStorage-backed token store for the admin web panel.
 */
export const tokenStore: TokenStore = {
    getAccessToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },
    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },
    setTokens(accessToken: string, refreshToken: string): void {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },
    clear(): void {
        // Clear the cached profile too so a reload never restores a dead session.
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(STAFF_PROFILE_KEY);
    },
};

/**
 * Shared singleton client for the whole panel. The onUnauthorized hook clears
 * the cached profile and drops the user on the login screen; it is installed by
 * the auth provider at startup.
 */
export const apiClient = new ApiClient({
    baseUrl: API_BASE,
    tokenStore,
    onUnauthorized: (reason) => {
        // Installed by AuthProvider via setUnauthorizedHandler to avoid a
        // circular import between this module and the auth feature.
        unauthorizedHandler?.(reason);
    },
});

export type { UnauthorizedReason } from './client';

type UnauthorizedHandler = (reason: UnauthorizedReason) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
    unauthorizedHandler = handler;
}
