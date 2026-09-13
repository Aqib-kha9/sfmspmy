import { apiClient, tokenStore } from '../../lib/api/apiClient';
import type { LoginResult, RoleView, SessionInfo, StaffProfile } from '../../lib/api/types';
import { API_SOURCE, STAFF_PROFILE_KEY } from '../../lib/api/config';
import { rolePermissions, StaffRole } from '../../lib/permissions/permissions';

function readStoredProfile(): StaffProfile | null {
    const raw = localStorage.getItem(STAFF_PROFILE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StaffProfile;
    } catch {
        localStorage.removeItem(STAFF_PROFILE_KEY);
        return null;
    }
}

function writeStoredProfile(profile: StaffProfile): void {
    localStorage.setItem(STAFF_PROFILE_KEY, JSON.stringify(profile));
}

function roleDisplayLabel(role: StaffRole): string {
    const labels: Record<string, string> = {
        super_admin: 'Super Administrator',
        managing_director: 'Managing Director',
        president: 'President',
        vice_president: 'Vice President',
        manager: 'Manager',
        cashier: 'Cashier',
        clerk: 'Clerk',
        collection_agent: 'Collection Agent',
    };
    return labels[role] ?? role;
}

function normalizeRole(raw: string): StaffRole {
    return (Object.keys(rolePermissions) as StaffRole[]).includes(raw as StaffRole)
        ? (raw as StaffRole)
        : 'clerk';
}

function permissionsForRole(role: StaffRole, roles: RoleView[] | null): StaffProfile['permissions'] {
    if (roles && roles.length > 0) {
        const serverRole = roles.find((r) => r.code === role);
        if (serverRole && serverRole.permissions.length > 0) {
            return serverRole.permissions as StaffProfile['permissions'];
        }
    }
    return rolePermissions[role] ?? [];
}

async function fetchRolePermissions(): Promise<RoleView[] | null> {
    try {
        return await apiClient.request<RoleView[]>('/identity/roles');
    } catch {
        return null;
    }
}

export interface LoginCredentials {
    staffCode: string;
    password: string;
    deviceName?: string;
    appVersion?: string;
}

export async function login(credentials: LoginCredentials): Promise<StaffProfile> {
    const result = await apiClient.request<LoginResult>('/auth/login', {
        method: 'POST',
        auth: false,
        body: {
            staffCode: credentials.staffCode.trim(),
            password: credentials.password,
            source: API_SOURCE,
            deviceName: credentials.deviceName ?? navigator.userAgent,
            appVersion: credentials.appVersion,
        },
    });
    tokenStore.setTokens(result.accessToken, result.refreshToken, result.expiresIn);

    const role = normalizeRole(result.staff.role);
    const roles = await fetchRolePermissions();
    const profile: StaffProfile = {
        id: result.staff.id,
        staffCode: result.staff.staffCode,
        fullName: result.staff.fullName,
        role,
        roleLabel: roleDisplayLabel(role),
        branchId: result.staff.branchId,
        branchName: null,
        permissions: permissionsForRole(role, roles),
    };
    writeStoredProfile(profile);
    return profile;
}

export async function refreshProfile(): Promise<StaffProfile | null> {
    try {
        const session = await apiClient.request<SessionInfo>('/auth/session');
        const role = normalizeRole(session.staff.role);
        const roles = await fetchRolePermissions();
        const profile: StaffProfile = {
            id: session.staff.id,
            staffCode: session.staff.staffCode,
            fullName: session.staff.fullName,
            role,
            roleLabel: roleDisplayLabel(role),
            branchId: session.staff.branchId,
            branchName: null,
            permissions: permissionsForRole(role, roles),
        };
        writeStoredProfile(profile);
        return profile;
    } catch {
        return readStoredProfile();
    }
}

export async function logout(): Promise<void> {
    try {
        await apiClient.request('/auth/logout', { method: 'POST' });
    } catch {
        // Best-effort server revocation; always clear the local session.
    } finally {
        tokenStore.clear();
        localStorage.removeItem(STAFF_PROFILE_KEY);
    }
}

export interface ChangePasswordResult {
    success: true;
    /** Number of other signed-in sessions revoked by the rotation. */
    revokedOtherSessions: number;
}

/**
 * Self-service credential rotation for the signed-in principal. The backend
 * verifies the current password and revokes every other session on success; the
 * calling session stays valid so the user is not signed out here.
 */
export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<ChangePasswordResult> {
    return apiClient.request<ChangePasswordResult>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
    });
}

export { readStoredProfile as getStoredProfile };
