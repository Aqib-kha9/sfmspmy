import { apiClient } from '../../../../lib/api/apiClient';
import type {
    BranchListResult,
    RoleView,
    StaffListItem,
    StaffView,
} from '../../../../lib/api/types';
import type { StaffRole } from '../../../../lib/permissions/permissions';
import { querySuffix } from './helpers';

/**
 * Staff / team directory adapter repository.
 *
 * Bridges the AdminPages Staff workspace onto the live /api/v1/identity
 * surface. The backend identity module is the source of truth for every staff
 * login (staff code, role, branch, password, NDA gate, lockout state) and this
 * adapter is the single place the panel talks to it.
 *
 * Endpoints used:
 *  - GET   /identity/staff              (security.read)           -> { total, items }
 *  - POST  /identity/staff              (Managing Director)       -> StaffView (201)
 *  - PATCH /identity/staff/:id          (Managing Director)       -> StaffView
 *  - POST  /identity/staff/:id/unlock   (security.unlock_accounts)-> StaffView
 *  - POST  /identity/staff/:id/deactivate (Managing Director)     -> StaffView
 *  - GET   /identity/roles              (security.read)           -> RoleView[]
 *  - GET   /settings/branches           (settings.read)           -> BranchListResult
 *
 * Business rules enforced server-side (mirrored here as UI affordances):
 *  - Staff codes are unique and match `^[A-Za-z0-9._-]+$` (2-20 chars).
 *  - Passwords are hashed with Argon2id; a new password (min 8) is required to
 *    reactivate a disabled account, and that account must have the NDA signed.
 *  - A locked account can only be re-opened through the dedicated unlock route.
 *  - A deactivation requires a reason, cannot target your own session, and the
 *    last active Managing Director can never be demoted or deactivated.
 */

/** Raw backend lifecycle status for a staff account. */
export type StaffStatus = 'active' | 'locked' | 'disabled';

/** Display-oriented staff row consumed by the AdminPages Staff workspace. */
export type StaffRecord = {
    id: string;
    staffCode: string;
    fullName: string;
    roleCode: StaffRole;
    roleLabel: string;
    branchId: string | null;
    branchName: string | null;
    email: string | null;
    phone: string | null;
    status: StaffStatus;
    mfaEnabled: boolean;
    ndaSigned: boolean;
    exitDate: string | null;
    lockedUntil: string | null;
    failedLoginAttempts: number;
    lastLoginAt: string | null;
    createdAt: string;
    /** true for the immutable protected super-administrator account. */
    isProtected: boolean;
};

/** Directory query filters mapped onto `listStaffQuerySchema`. */
export type StaffQuery = {
    search?: string;
    role?: StaffRole | 'all';
    status?: StaffStatus | 'all';
    branchId?: string | null;
};

/** Create payload mirrored from `createStaffSchema`. */
export type CreateStaffInput = {
    staffCode: string;
    fullName: string;
    roleCode: StaffRole;
    branchId: string | null;
    email: string | null;
    phone: string | null;
    password: string;
    ndaSigned: boolean;
    mfaEnabled: boolean;
    exitDate: string | null;
};

/** Update payload mirrored from `updateStaffSchema` (all fields optional). */
export type UpdateStaffInput = {
    fullName?: string;
    roleCode?: StaffRole;
    branchId?: string | null;
    email?: string | null;
    phone?: string | null;
    password?: string;
    ndaSigned?: boolean;
    mfaEnabled?: boolean;
    exitDate?: string | null;
};

/** Role option (with its permission set) for the assign/roles panels. */
export type StaffRoleOption = {
    id: string;
    code: StaffRole;
    label: string;
    description: string | null;
    isSystem: boolean;
    permissions: string[];
};

/** Branch option for the branch assignment dropdown. */
export type StaffBranchOption = {
    id: string;
    name: string;
    code: string;
};

export interface StaffRepository {
    list(query?: StaffQuery): Promise<StaffRecord[]>;
    roles(): Promise<StaffRoleOption[]>;
    branches(): Promise<StaffBranchOption[]>;
    create(input: CreateStaffInput): Promise<StaffRecord>;
    update(id: string, input: UpdateStaffInput): Promise<StaffRecord>;
    unlock(id: string): Promise<StaffRecord>;
    deactivate(id: string, reason?: string): Promise<StaffRecord>;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Only a real `YYYY-MM-DD` date is accepted by the backend date schema. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A staff view plus the joined role/branch the list endpoint adds. */
type StaffRow = StaffView & Partial<Pick<StaffListItem, 'roleLabel' | 'branchName'>>;

/** Humanises a role code (`vice_president` -> `Vice President`) as a fallback. */
function humaniseRole(code: string): string {
    return code
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/** Maps a backend staff view onto the display-oriented `StaffRecord`. */
function toRecord(view: StaffRow): StaffRecord {
    return {
        id: view.id,
        staffCode: view.staffCode,
        fullName: view.fullName,
        roleCode: view.roleCode,
        roleLabel: view.roleLabel ?? humaniseRole(view.roleCode),
        branchId: view.branchId,
        branchName: view.branchName ?? null,
        email: view.email,
        phone: view.phone,
        status: view.status,
        mfaEnabled: view.mfaEnabled,
        ndaSigned: view.ndaSigned,
        exitDate: view.exitDate,
        lockedUntil: view.lockedUntil,
        failedLoginAttempts: view.failedLoginAttempts,
        lastLoginAt: view.lastLoginAt,
        createdAt: view.createdAt,
        isProtected: view.isProtected ?? false,
    };
}

/** Normalises an optional text field to a trimmed value or null. */
function textOrNull(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed === '' ? null : trimmed;
}

/** Normalises an optional date field, dropping anything malformed. */
function dateOrNull(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    return DATE_PATTERN.test(trimmed) ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiStaffRepository implements StaffRepository {
    /** Cache of joined role labels so a write response keeps its label. */
    private readonly roleLabels = new Map<string, string>();

    private readonly branchNames = new Map<string, string>();

    async list(query: StaffQuery = {}): Promise<StaffRecord[]> {
        const suffix = querySuffix({
            search: query.search?.trim() || undefined,
            role: query.role && query.role !== 'all' ? query.role : undefined,
            status: query.status && query.status !== 'all' ? query.status : undefined,
            branchId: query.branchId || undefined,
            limit: 100,
            offset: 0,
        });
        const result = await apiClient.request<{ total: number; items: StaffListItem[] }>(
            `/identity/staff${suffix}`,
        );
        for (const member of result.items) {
            this.roleLabels.set(member.roleCode, member.roleLabel);
            if (member.branchId && member.branchName) this.branchNames.set(member.branchId, member.branchName);
        }
        return result.items.map(toRecord);
    }

    async roles(): Promise<StaffRoleOption[]> {
        const roles = await apiClient.request<RoleView[]>('/identity/roles');
        for (const role of roles) this.roleLabels.set(role.code, role.label);
        return roles.map((role) => ({
            id: role.id,
            code: role.code as StaffRole,
            label: role.label,
            description: role.description,
            isSystem: role.isSystem,
            permissions: role.permissions,
        }));
    }

    async branches(): Promise<StaffBranchOption[]> {
        const result = await apiClient.request<BranchListResult>(
            `/settings/branches${querySuffix({ pageSize: 100 })}`,
        );
        for (const branch of result.items) this.branchNames.set(branch.id, branch.name);
        return result.items
            .filter((branch) => branch.isActive)
            .map((branch) => ({ id: branch.id, name: branch.name, code: branch.code }));
    }

    /** Re-attaches the joined role label + branch name a write response omits. */
    private withJoined(view: StaffView): StaffRecord {
        return toRecord({
            ...view,
            roleLabel: this.roleLabels.get(view.roleCode),
            branchName: view.branchId ? this.branchNames.get(view.branchId) ?? null : null,
        });
    }

    async create(input: CreateStaffInput): Promise<StaffRecord> {
        const body: Record<string, unknown> = {
            staffCode: input.staffCode.trim(),
            fullName: input.fullName.trim(),
            roleCode: input.roleCode,
            password: input.password,
            ndaSigned: input.ndaSigned,
            mfaEnabled: input.mfaEnabled,
        };
        const branchId = textOrNull(input.branchId);
        if (branchId) body.branchId = branchId;
        const email = textOrNull(input.email);
        if (email) body.email = email;
        const phone = textOrNull(input.phone);
        if (phone) body.phone = phone;
        const exitDate = dateOrNull(input.exitDate);
        if (exitDate) body.exitDate = exitDate;
        const created = await apiClient.request<StaffView>('/identity/staff', { method: 'POST', body });
        return this.withJoined(created);
    }

    async update(id: string, input: UpdateStaffInput): Promise<StaffRecord> {
        const body: Record<string, unknown> = {};
        if (input.fullName !== undefined) body.fullName = input.fullName.trim();
        if (input.roleCode !== undefined) body.roleCode = input.roleCode;
        if (input.branchId !== undefined) body.branchId = textOrNull(input.branchId);
        if (input.email !== undefined) body.email = textOrNull(input.email);
        if (input.phone !== undefined) body.phone = textOrNull(input.phone);
        if (input.password !== undefined && input.password !== '') body.password = input.password;
        if (input.ndaSigned !== undefined) body.ndaSigned = input.ndaSigned;
        if (input.mfaEnabled !== undefined) body.mfaEnabled = input.mfaEnabled;
        if (input.exitDate !== undefined) body.exitDate = dateOrNull(input.exitDate);
        const updated = await apiClient.request<StaffView>(`/identity/staff/${id}`, { method: 'PATCH', body });
        return this.withJoined(updated);
    }

    async unlock(id: string): Promise<StaffRecord> {
        const view = await apiClient.request<StaffView>(`/identity/staff/${id}/unlock`, { method: 'POST' });
        return this.withJoined(view);
    }

    async deactivate(id: string, reason?: string): Promise<StaffRecord> {
        const body: Record<string, unknown> = {};
        const trimmed = (reason ?? '').trim();
        if (trimmed) body.reason = trimmed;
        const view = await apiClient.request<StaffView>(`/identity/staff/${id}/deactivate`, {
            method: 'POST',
            body,
        });
        return this.withJoined(view);
    }
}

export const staffRepository: StaffRepository = new ApiStaffRepository();
