import { apiClient } from '../../../../lib/api/apiClient';
import type {
    AuditEventsResult,
    DeviceView,
    RoleView,
    SettingListResult,
    SettingView,
    StaffListItem,
    UpdateSettingsResult,
} from '../../../../lib/api/types';
import { formatTimestamp, querySuffix } from './helpers';

/**
 * Security Center adapter repository.
 *
 * Bridges the governance surfaces the AdminPages SecurityPage presents onto the
 * live /api/v1 endpoints. There is no single "security" backend module — the
 * page is a composed governance view, so this adapter stitches four real
 * modules together:
 *
 *  - Authentication controls (policies) <- GET/PATCH /settings filtered to the
 *    `security` + `compliance` categories (session.idle_minutes,
 *    security.max_login_attempts, security.lockout_minutes, privacy.*).
 *  - Role permissions                    <- GET /identity/roles, with the
 *    member count derived from GET /identity/staff (no member column exists).
 *  - Active sessions                     <- GET /auth/devices (the device
 *    registry is the backend's connected-client inventory; disabling a device
 *    also revokes every live session bound to it).
 *  - Security audit log                  <- GET /audit/events (read-only,
 *    append-only trail; actor names are resolved through the staff directory).
 *
 * Gate notes (routes): settings read needs `settings.read` and write needs
 * `settings.write`; GET /identity/roles + /staff need `security.read`;
 * DELETE /auth/devices/:id needs the Managing Director; GET /audit/events needs
 * the Managing Director plus `security.audit.read`. Amounts and settings values
 * are JSONB/strings server-side; the UI renders them as display strings.
 */

/** Mirrors the AdminPages status union so the wiring step imports from here. */
export type Status = 'Active' | 'Pending' | 'Approved' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Matched';

export type SecurityPolicy = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    value: string;
    mfaMethod?: string;
    recoveryReference?: string;
    policyOwner?: string;
    secondApproverReference?: string;
};

export type SecurityRole = {
    id: string;
    name: string;
    members: number;
    scope: string;
    permissions: string[];
    status: Status;
};

export type SecuritySession = {
    id: string;
    user: string;
    role: string;
    device: string;
    location: string;
    lastActive: string;
    status: 'Active' | 'Inactive';
    ipAddress?: string;
    userAgent?: string;
    deviceReference?: string;
    loginFailureCount?: string;
    lockoutReference?: string;
};

export type SecurityAuditEvent = {
    id: string;
    action: string;
    actor: string;
    target: string;
    date: string;
    requestId: string;
    status: Status;
    approvalReference?: string;
    secondApprover?: string;
    ipAddress?: string;
    userAgent?: string;
    evidenceReference?: string;
};

export type SecurityAuditQuery = {
    search?: string;
    page?: number;
    pageSize?: number;
};

export interface SecurityRepository {
    listPolicies(): Promise<SecurityPolicy[]>;
    togglePolicy(key: string, enabled: boolean): Promise<SecurityPolicy[]>;
    listRoles(): Promise<SecurityRole[]>;
    listSessions(): Promise<SecuritySession[]>;
    listAuditEvents(query?: SecurityAuditQuery): Promise<SecurityAuditEvent[]>;
    revokeSession(deviceId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** The setting categories that make up the authentication posture. */
const POLICY_CATEGORIES = new Set(['security', 'compliance']);

/** Reads a value that may arrive as string | number | boolean | object. */
type SettingValue = SettingView['value'];

/**
 * The backend audit view carries `occurredAt`; the shared type also mentions
 * `createdAt`, so both are read defensively.
 */
type AuditEventRow = {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorStaffId: string | null;
    actorStaffCode: string | null;
    actorRole: string | null;
    source: string | null;
    requestId: string | null;
    metadata: Record<string, unknown> | null;
    occurredAt?: string;
    createdAt?: string;
};

/** `security.max_login_attempts` -> `Max login attempts`. */
function humaniseKey(key: string): string {
    const tail = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key;
    const spaced = tail.replace(/_/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** `security.read` -> `Security read` for the role permission chip list. */
function humanisePermission(permission: string): string {
    const spaced = permission.replace(/[._]/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Renders any JSONB setting value as the single line the policy card shows. */
function describeValue(value: SettingValue): string {
    if (value === null || value === undefined) return 'Not configured';
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map((entry) => String(entry)).join(', ') || 'None';
    return JSON.stringify(value);
}

/** A setting counts as active unless it is explicitly off/zero/empty. */
function isActive(value: SettingValue): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.trim() !== '' && value !== '0';
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

function toPolicy(setting: SettingView): SecurityPolicy {
    return {
        id: setting.key,
        name: humaniseKey(setting.key),
        description: setting.description ?? `Configured under the ${setting.category} category.`,
        enabled: isActive(setting.value),
        value: describeValue(setting.value),
    };
}

function roleScope(role: RoleView): string {
    return role.description ?? (role.isSystem ? 'System role' : 'Configured role');
}

function toAuditEvent(row: AuditEventRow, names: Map<string, string>): SecurityAuditEvent {
    const actor =
        (row.actorStaffCode ? names.get(row.actorStaffCode) : undefined) ??
        (row.actorStaffId ? names.get(row.actorStaffId) : undefined) ??
        row.actorStaffCode ??
        row.actorStaffId ??
        (row.source === 'system' ? 'System' : 'Unknown actor');
    const target = row.entityId ? `${row.entityType} · ${row.entityId}` : row.entityType;
    const metadata = row.metadata ?? {};
    const ipAddress = typeof metadata.ipAddress === 'string' ? metadata.ipAddress : undefined;
    const userAgent = typeof metadata.userAgent === 'string' ? metadata.userAgent : undefined;
    return {
        id: row.id,
        action: row.action,
        actor,
        target,
        date: formatTimestamp(row.occurredAt ?? row.createdAt),
        requestId: row.requestId ?? '—',
        // Audit rows are immutable records of completed activity.
        status: 'Completed',
        ipAddress,
        userAgent,
    };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiSecurityRepository implements SecurityRepository {
    /** Last known "on" value per setting key so a toggle can be reverted. */
    private readonly remembered = new Map<string, SettingValue>();

    private async settings(): Promise<SettingView[]> {
        const result = await apiClient.request<SettingListResult>('/settings');
        return result.items;
    }

    async listPolicies(): Promise<SecurityPolicy[]> {
        const items = await this.settings();
        return items
            .filter((setting) => POLICY_CATEGORIES.has(setting.category))
            .map((setting) => {
                if (!this.remembered.has(setting.key) && isActive(setting.value)) {
                    this.remembered.set(setting.key, setting.value);
                }
                return toPolicy(setting);
            });
    }

    async togglePolicy(key: string, enabled: boolean): Promise<SecurityPolicy[]> {
        const original = this.remembered.get(key);
        const value: SettingValue = enabled
            ? original ?? true
            : typeof original === 'number'
                ? 0
                : false;
        await apiClient.request<UpdateSettingsResult>('/settings', {
            method: 'PATCH',
            body: { changes: [{ key, value, reason: 'Security Center policy update' }] },
        });
        return this.listPolicies();
    }

    async listRoles(): Promise<SecurityRole[]> {
        const [roles, staff] = await Promise.all([
            apiClient.request<RoleView[]>('/identity/roles'),
            apiClient.request<{ total: number; items: StaffListItem[] }>(`/identity/staff${querySuffix({ limit: 100 })}`),
        ]);
        const membersByRole = new Map<string, number>();
        for (const member of staff.items) {
            membersByRole.set(member.roleCode, (membersByRole.get(member.roleCode) ?? 0) + 1);
        }
        return roles.map((role) => ({
            id: role.code,
            name: role.label,
            members: membersByRole.get(role.code) ?? 0,
            scope: roleScope(role),
            permissions: role.permissions.map(humanisePermission),
            status: 'Active' as Status,
        }));
    }

    async listSessions(): Promise<SecuritySession[]> {
        const result = await apiClient.request<{ total: number; items: DeviceView[] }>(
            `/auth/devices${querySuffix({ limit: 100 })}`,
        );
        return result.items.map((device) => ({
            id: device.id,
            user: device.deviceName ?? (device.deviceType === 'agent_mobile' ? 'Field device' : 'Admin workspace'),
            role: device.deviceType === 'agent_mobile' ? 'Collection Agent device' : 'Admin workspace device',
            device: device.deviceName ?? device.deviceType,
            location: device.status === 'pending' ? 'Awaiting confirmation' : 'Registered device',
            lastActive: formatTimestamp(device.lastUsedAt ?? device.createdAt),
            status: device.status === 'disabled' ? 'Inactive' : 'Active',
            deviceReference: device.id,
            userAgent: device.appVersion ? `App ${device.appVersion}` : undefined,
        }));
    }

    async listAuditEvents(query: SecurityAuditQuery = {}): Promise<SecurityAuditEvent[]> {
        const [events, staff] = await Promise.all([
            apiClient.request<AuditEventsResult>(
                `/audit/events${querySuffix({ page: query.page ?? 1, pageSize: query.pageSize ?? 100 })}`,
            ).catch(() => ({ items: [], total: 0, page: 1, pageSize: query.pageSize ?? 100 }) as AuditEventsResult),
            apiClient
                .request<{ total: number; items: StaffListItem[] }>(`/identity/staff${querySuffix({ limit: 100 })}`)
                .catch(() => ({ total: 0, items: [] as StaffListItem[] })),
        ]);
        const names = new Map<string, string>();
        for (const member of staff.items) {
            names.set(member.staffCode, member.fullName);
            names.set(member.id, member.fullName);
        }
        const rows = (events.items as unknown as AuditEventRow[]).map((row) => toAuditEvent(row, names));
        if (!query.search) return rows;
        const needle = query.search.toLowerCase();
        return rows.filter((row) => `${row.action} ${row.actor} ${row.target} ${row.requestId}`.toLowerCase().includes(needle));
    }

    async revokeSession(deviceId: string): Promise<void> {
        await apiClient.request(`/auth/devices/${deviceId}`, {
            method: 'DELETE',
            body: { reason: 'Revoked from the Security Center' },
        });
    }
}

export const securityRepository: SecurityRepository = new ApiSecurityRepository();
