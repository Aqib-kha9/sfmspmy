import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isSuperAdmin, type Permission } from '../../lib/permissions/permissions';
import type { StaffProfile } from '../../lib/api/types';
import { setUnauthorizedHandler, tokenStore } from '../../lib/api/apiClient';
import {
    changePassword as changePasswordRequest,
    getStoredProfile,
    login as loginRequest,
    logout as logoutRequest,
    refreshProfile,
} from './auth.service';

interface AuthContextValue {
    profile: StaffProfile | null;
    /** True until the initial session probe finishes. */
    bootstrapping: boolean;
    /** Set when the session ended (expiry/revocation) so the login page can explain why. */
    sessionNotice: string | null;
    clearSessionNotice: () => void;
    login: (staffCode: string, password: string) => Promise<StaffProfile>;
    logout: () => Promise<void>;
    /** Rotate the signed-in user's own password (verifies the current one). */
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    can: (permission: Permission) => boolean;
    hasRole: (...roles: StaffProfile['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<StaffProfile | null>(() => getStoredProfile());
    const [bootstrapping, setBootstrapping] = useState(true);
    const [sessionNotice, setSessionNotice] = useState<string | null>(null);

    useEffect(() => {
        setUnauthorizedHandler((reason) => {
            // tokenStore.clear() also drops the cached profile from storage.
            tokenStore.clear();
            setProfile(null);
            setSessionNotice(
                reason === 'forbidden'
                    ? 'Your access was revoked. Please sign in again.'
                    : 'Your session expired. Please sign in again.'
            );
        });
        return () => setUnauthorizedHandler(null);
    }, []);

    const clearSessionNotice = useCallback(() => setSessionNotice(null), []);

    useEffect(() => {
        let active = true;
        async function bootstrap() {
            if (tokenStore.getAccessToken() || tokenStore.getRefreshToken()) {
                const restored = await refreshProfile();
                if (active && restored) setProfile(restored);
            }
            if (active) setBootstrapping(false);
        }
        void bootstrap();
        return () => {
            active = false;
        };
    }, []);

    const login = useCallback(async (staffCode: string, password: string) => {
        const next = await loginRequest({ staffCode, password });
        setSessionNotice(null);
        setProfile(next);
        return next;
    }, []);

    const logout = useCallback(async () => {
        await logoutRequest();
        setSessionNotice(null);
        setProfile(null);
    }, []);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
        await changePasswordRequest(currentPassword, newPassword);
    }, []);

    const can = useCallback(
        (permission: Permission) => {
            if (!profile) return false;
            if (isSuperAdmin(profile.role)) return true;
            return profile.permissions.includes(permission);
        },
        [profile]
    );

    const hasRole = useCallback(
        (...roles: StaffProfile['role'][]) => {
            if (!profile) return false;
            if (isSuperAdmin(profile.role)) return true;
            return roles.includes(profile.role);
        },
        [profile]
    );

    const value = useMemo<AuthContextValue>(
        () => ({ profile, bootstrapping, sessionNotice, clearSessionNotice, login, logout, changePassword, can, hasRole }),
        [profile, bootstrapping, sessionNotice, clearSessionNotice, login, logout, changePassword, can, hasRole]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
