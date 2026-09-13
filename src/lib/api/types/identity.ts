// API contracts: Identity & auth (mirrored from the backend service views).
import type { StaffRole } from '../../permissions/permissions';

// ---------------------------------------------------------------------------
// Identity & auth (backend/src/modules/identity/identity.service.ts)
// ---------------------------------------------------------------------------

export interface LoginStaff {
    id: string;
    staffCode: string;
    fullName: string;
    role: StaffRole;
    branchId: string | null;
    source: 'admin_web' | 'agent_mobile';
}

export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    staff: LoginStaff;
}

export interface TokenResult {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    session: { id: string; expiresAt: string };
}

export interface DeviceView {
    id: string;
    deviceType: 'admin_web' | 'agent_mobile';
    deviceName: string | null;
    appVersion: string | null;
    status: 'pending' | 'confirmed' | 'disabled';
    confirmedAt: string | null;
    disabledAt: string | null;
    disabledReason: string | null;
    lastUsedAt: string | null;
    createdAt: string;
}

export interface StaffView {
    id: string;
    staffCode: string;
    fullName: string;
    roleCode: StaffRole;
    branchId: string | null;
    email: string | null;
    phone: string | null;
    status: 'active' | 'locked' | 'disabled';
    mfaEnabled: boolean;
    ndaSigned: boolean;
    exitDate: string | null;
    lockedUntil: string | null;
    failedLoginAttempts: number;
    lastLoginAt: string | null;
    createdAt: string;
    /** true for the immutable protected super-administrator account. */
    isProtected: boolean;
}

export interface StaffListItem extends StaffView {
    roleLabel: string;
    branchName: string | null;
}

export interface RoleView {
    id: string;
    code: string;
    label: string;
    description: string | null;
    isSystem: boolean;
    permissions: string[];
}

export interface SessionInfo {
    id: string;
    staff: {
        id: string;
        staffCode: string;
        fullName: string;
        role: StaffRole;
        branchId: string | null;
    };
    source: 'admin_web' | 'agent_mobile';
    ipAddress: string | null;
    userAgent: string | null;
    issuedAt: string;
    lastSeenAt: string;
    expiresAt: string;
    revokedAt: string | null;
    revokedReason: string | null;
    idleTimeoutMinutes: number;
    device: { id: string; deviceName: string | null; status: 'pending' | 'confirmed' | 'disabled' } | null;
}
