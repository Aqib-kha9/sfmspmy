import { apiClient } from '../../../../lib/api/apiClient';
import type {
    AgentAssignmentInput,
    AgentListResult,
    AgentPerformanceResult,
    AgentStatus as ApiAgentStatus,
    AgentView,
    OnboardAgentInput,
    StaffListItem,
    UpdateAgentInput,
} from '../../../../lib/api/types';
import { formatDate, formatTimestamp, messageFor, querySuffix } from './helpers';

/**
 * Collection agent registry adapter repository.
 *
 * Bridges the AdminPages Collection Agents workspace onto the live
 * /api/v1/agents surface. The admin UI was authored against a rich,
 * display-oriented `AgentRecord` (Title-case statuses, embedded daily totals,
 * route + sync metadata, an event timeline). The backend serves a normalised
 * `AgentView` (lowercase lifecycle statuses, linked staff + document
 * references, no daily roll-up). This adapter maps the two so the existing
 * pages/components stay unchanged while every read and write now hits the
 * backend.
 *
 * Endpoints used:
 *  - GET   /agents                     (agents.read)      -> AgentListResult
 *  - GET   /agents/:id                 (agents.read)      -> AgentView
 *  - POST  /agents                     (M.D.)             -> AgentView (201)
 *  - PATCH /agents/:id                 (M.D.)             -> AgentView
 *  - POST  /agents/:id/activate        (M.D.)             -> AgentView
 *  - POST  /agents/:id/deactivate      (M.D.)             -> AgentView
 *  - POST  /agents/:id/assignments     (M.D.)             -> assignment result
 *  - GET   /agents/:id/performance     (agents.read)      -> AgentPerformanceResult
 *
 * Onboarding gate: `POST /agents` requires an existing staff member
 * (`staffId`) holding the collection_agent role — agents do NOT create logins.
 * This adapter resolves the staff record from the identity directory by
 * employee code / name / email / phone before onboarding, and surfaces a clear
 * message when no matching staff login exists yet.
 */

/** Mirrors the AdminPages status union so the wiring step imports from here. */
export type Status = 'Active' | 'Pending' | 'Approved' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Cancelled' | 'Reversed' | 'Matched';

export type AgentEvent = {
    id: string;
    type: string;
    date: string;
    performedBy: string;
    note: string;
};

export type AgentRecord = {
    id: string;
    name: string;
    phone: string;
    email: string;
    employeeCode: string;
    role: 'Collection Agent' | 'Senior Collection Agent';
    status: Status;
    accessStatus: 'Enabled' | 'Locked' | 'Pending invitation';
    route: string;
    joinedOn: string;
    assignedCustomerIds: string[];
    branch?: string;
    supervisor?: string;
    identityReference?: string;
    employmentDocumentReferences?: string;
    emergencyContact?: string;
    registeredDevice?: string;
    appVersion?: string;
    lastKnownLocation?: string;
    routeEffectiveFrom?: string;
    routeEffectiveTo?: string;
    assignmentEffectiveFrom?: string;
    assignmentEffectiveTo?: string;
    collectionLimit?: string;
    cashHoldingLimit?: string;
    invitationReference?: string;
    mfaPinStatus?: string;
    deactivationReason?: string;
    todayCollected: number;
    pendingAmount: number;
    transactionCount: number;
    syncStatus: 'Synced' | 'Pending sync' | 'Failed sync';
    lastSync: string;
    events: AgentEvent[];
};

export type AgentInput = Omit<AgentRecord, 'id' | 'todayCollected' | 'pendingAmount' | 'transactionCount' | 'syncStatus' | 'lastSync' | 'events'>;

export type AgentQuery = {
    search?: string;
    status?: Status | 'All';
    accessStatus?: AgentRecord['accessStatus'] | 'All';
};

export interface AgentRepository {
    list(query?: AgentQuery): Promise<AgentRecord[]>;
    create(input: AgentInput): Promise<AgentRecord>;
    update(id: string, input: AgentInput): Promise<AgentRecord>;
    setActive(id: string, active: boolean): Promise<AgentRecord>;
    performance(id: string): Promise<AgentRecord>;
    assignCustomers(id: string, customerIds: string[]): Promise<void>;
    /** Resolves an agent display id to its backend UUID for related reads. */
    resolveAgentUuid(id: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Enum bridges
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Backend lifecycle status -> admin UI status pill. */
const STATUS_FROM_API: Record<ApiAgentStatus, Status> = {
    pending: 'Pending',
    active: 'Active',
    suspended: 'Review',
    deactivated: 'Inactive',
    locked: 'Review',
};

/** Admin UI status filter -> backend lifecycle status. */
const STATUS_TO_API: Partial<Record<Status, ApiAgentStatus>> = {
    Active: 'active',
    Inactive: 'deactivated',
    Pending: 'pending',
    Review: 'suspended',
};

/** Backend lifecycle status -> mobile-application access state. */
const ACCESS_FROM_API: Record<ApiAgentStatus, AgentRecord['accessStatus']> = {
    pending: 'Pending invitation',
    active: 'Enabled',
    suspended: 'Locked',
    deactivated: 'Locked',
    locked: 'Locked',
};

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Stable display id for an agent row (agent code preferred, then staff code). */
function displayIdOf(view: AgentView): string {
    return view.agentCode || view.staffCode || view.id;
}

/** Coerces a display value to a positive amount string accepted by the API. */
function amountString(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
    return numeric.toFixed(2);
}

/** Maps a backend `AgentView` onto the UI `AgentRecord` shape. */
function toRecord(view: AgentView): AgentRecord {
    const status = STATUS_FROM_API[view.status] ?? 'Inactive';
    const accessStatus = ACCESS_FROM_API[view.status] ?? 'Locked';
    const emergencyContact = [view.emergencyContactName, view.emergencyContactPhone]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(' · ');
    return {
        id: displayIdOf(view),
        name: view.fullName ?? view.staffCode ?? view.agentCode,
        phone: view.phone ?? '',
        email: view.email ?? '',
        employeeCode: view.staffCode ?? view.agentCode,
        role: 'Collection Agent',
        status,
        accessStatus,
        route: view.branchName ?? '',
        joinedOn: formatDate(view.startDate ?? view.createdAt),
        assignedCustomerIds: [],
        branch: view.branchName ?? '',
        supervisor: '',
        identityReference: view.idProofReference ?? '',
        employmentDocumentReferences: view.resumeReference ?? view.verificationReference ?? '',
        emergencyContact,
        registeredDevice: '',
        appVersion: '',
        lastKnownLocation: '',
        routeEffectiveFrom: '',
        routeEffectiveTo: '',
        assignmentEffectiveFrom: '',
        assignmentEffectiveTo: '',
        collectionLimit: view.dailyCashLimit ?? '',
        cashHoldingLimit: view.dailyCashLimit ?? '',
        invitationReference: view.verificationReference ?? '',
        mfaPinStatus: '',
        deactivationReason: '',
        todayCollected: 0,
        pendingAmount: 0,
        transactionCount: 0,
        syncStatus: 'Synced',
        lastSync: formatTimestamp(view.updatedAt),
        events: [
            {
                id: `${view.id}-lifecycle`,
                type: `Agent ${view.status}`,
                date: formatTimestamp(view.updatedAt),
                performedBy: 'System',
                note: `Agent ${view.agentCode} is ${view.status}.`,
            },
        ],
    };
}

/** Builds the onboarding payload, resolving the linked staff login separately. */
function toOnboardPayload(input: AgentInput, staffId: string, branch: string | null): OnboardAgentInput {
    const employeeCode = input.employeeCode.trim();
    const identityReference = input.identityReference?.trim() || `Agent onboarding reference ${employeeCode}`;
    const addressReference = input.employmentDocumentReferences?.trim() || identityReference;
    const payload: OnboardAgentInput = {
        staffId,
        agentCode: employeeCode,
        idProofType: 'Aadhaar',
        idProofReference: identityReference,
        addressProofType: 'Address proof',
        addressProofReference: addressReference,
    };
    if (branch) payload.branchId = branch;
    if (input.phone.trim()) payload.phone = input.phone.trim();
    if (input.email.trim()) payload.email = input.email.trim();
    if (input.employmentDocumentReferences?.trim()) payload.resumeReference = input.employmentDocumentReferences.trim();
    if (input.invitationReference?.trim()) payload.verificationReference = input.invitationReference.trim();
    if (input.emergencyContact?.trim()) payload.emergencyContactName = input.emergencyContact.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(input.joinedOn)) payload.startDate = input.joinedOn;
    const cashLimit = amountString(input.collectionLimit);
    if (cashLimit) payload.dailyCashLimit = cashLimit;
    return payload;
}

/** Builds the profile-update payload (lifecycle moves go through dedicated routes). */
function toUpdatePayload(input: AgentInput): UpdateAgentInput {
    const payload: UpdateAgentInput = {
        phone: input.phone.trim() || null,
        email: input.email.trim() || null,
        resumeReference: input.employmentDocumentReferences?.trim() || null,
        verificationReference: input.invitationReference?.trim() || null,
        idProofReference: input.identityReference?.trim() || null,
        addressProofReference: input.employmentDocumentReferences?.trim() || input.identityReference?.trim() || null,
    };
    if (/^\d{4}-\d{2}-\d{2}$/.test(input.joinedOn)) payload.startDate = input.joinedOn;
    const cashLimit = amountString(input.collectionLimit);
    if (cashLimit) payload.dailyCashLimit = cashLimit;
    return payload;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiAgentRepository implements AgentRepository {
    /** Maps the display agent code back to the backend UUID. */
    private readonly cache = new Map<string, string>();

    /** Maps the display customer number back to the backend customer UUID. */
    private readonly customerCache = new Map<string, string>();

    /** Resolves the raw agent UUID from the display id shown in the UI. */
    private async resolveAgentId(displayId: string): Promise<string> {
        if (UUID_PATTERN.test(displayId)) return displayId;
        const cached = this.cache.get(displayId);
        if (cached) return cached;
        const result = await apiClient.request<AgentListResult>(`/agents${querySuffix({ q: displayId, limit: 100 })}`);
        for (const view of result.items) this.cache.set(displayIdOf(view), view.id);
        const match = result.items.find(
            (view) => displayIdOf(view) === displayId || view.id === displayId || view.staffCode === displayId,
        );
        if (!match) throw new Error('Collection agent record was not found.');
        return match.id;
    }

    /** Resolves a customer display number to the backend customer UUID. */
    private async resolveCustomerId(displayId: string): Promise<string | null> {
        if (UUID_PATTERN.test(displayId)) return displayId;
        const cached = this.customerCache.get(displayId);
        if (cached) return cached;
        try {
            const result = await apiClient.request<{ items: Array<{ id: string; customerNumber: string | null }> }>(
                `/customers${querySuffix({ search: displayId, limit: 1 })}`,
            );
            const match = result.items[0];
            if (!match) return null;
            this.customerCache.set(displayId, match.id);
            return match.id;
        } catch {
            return null;
        }
    }

    /** Looks up the linked collection-agent staff login for an onboarding request. */
    private async resolveStaffId(input: AgentInput): Promise<string> {
        const directory = await apiClient.request<{ total: number; items: StaffListItem[] }>(
            `/identity/staff${querySuffix({ role: 'collection_agent', limit: 100 })}`,
        );
        const employeeCode = input.employeeCode.trim().toLowerCase();
        const email = input.email.trim().toLowerCase();
        const phone = input.phone.trim();
        const name = input.name.trim().toLowerCase();
        const match = directory.items.find((member) => {
            if (employeeCode && member.staffCode.toLowerCase() === employeeCode) return true;
            if (email && member.email?.toLowerCase() === email) return true;
            if (phone && member.phone?.trim() === phone) return true;
            if (name && member.fullName.toLowerCase() === name) return true;
            return false;
        });
        if (!match) {
            throw new Error(
                `No collection-agent staff login matches "${input.employeeCode || input.name}". Create the staff account first, then onboard the agent.`,
            );
        }
        return match.id;
    }

    async list(query: AgentQuery = {}): Promise<AgentRecord[]> {
        const apiStatus = query.status && query.status !== 'All' ? STATUS_TO_API[query.status] : undefined;
        const suffix = querySuffix({
            status: apiStatus,
            q: query.search?.trim() || undefined,
            limit: 100,
            offset: 0,
        });
        try {
            const result = await apiClient.request<AgentListResult>(`/agents${suffix}`);
            for (const view of result.items) this.cache.set(displayIdOf(view), view.id);
            return result.items.map(toRecord);
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to load collection agents.'));
        }
    }

    async create(input: AgentInput): Promise<AgentRecord> {
        try {
            const staffId = await this.resolveStaffId(input);
            const payload = toOnboardPayload(input, staffId, null);
            const created = await apiClient.request<AgentView>('/agents', { method: 'POST', body: payload });
            this.cache.set(displayIdOf(created), created.id);
            if (input.assignedCustomerIds.length > 0) {
                await this.assignCustomers(created.id, input.assignedCustomerIds).catch(() => undefined);
            }
            return toRecord(created);
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to onboard the collection agent.'));
        }
    }

    async update(id: string, input: AgentInput): Promise<AgentRecord> {
        const agentId = await this.resolveAgentId(id);
        try {
            const updated = await apiClient.request<AgentView>(`/agents/${agentId}`, {
                method: 'PATCH',
                body: toUpdatePayload(input),
            });
            this.cache.set(displayIdOf(updated), updated.id);
            if (input.assignedCustomerIds.length > 0) {
                await this.assignCustomers(agentId, input.assignedCustomerIds).catch(() => undefined);
            }
            return toRecord(updated);
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to update the collection agent.'));
        }
    }

    async setActive(id: string, active: boolean): Promise<AgentRecord> {
        const agentId = await this.resolveAgentId(id);
        try {
            const view = await apiClient.request<AgentView>(`/agents/${agentId}/${active ? 'activate' : 'deactivate'}`, {
                method: 'POST',
            });
            this.cache.set(displayIdOf(view), view.id);
            return toRecord(view);
        } catch (error) {
            throw new Error(messageFor(error, active ? 'Unable to activate the agent.' : 'Unable to deactivate the agent.'));
        }
    }

    async performance(id: string): Promise<AgentRecord> {
        const agentId = await this.resolveAgentId(id);
        const [view, perf] = await Promise.all([
            apiClient.request<AgentView>(`/agents/${agentId}`),
            apiClient
                .request<AgentPerformanceResult>(`/agents/${agentId}/performance${querySuffix({ limit: 1 })}`)
                .catch(() => ({ items: [], total: 0 }) as AgentPerformanceResult),
        ]);
        const record = toRecord(view);
        const latest = perf.items[perf.items.length - 1];
        if (!latest) return record;
        return {
            ...record,
            todayCollected: latest.collectionAmount,
            transactionCount: latest.collectionCount,
            pendingAmount: Number(record.collectionLimit ?? 0) > latest.collectionAmount
                ? Number(record.collectionLimit) - latest.collectionAmount
                : record.pendingAmount,
        };
    }

    /** Public resolver so the UI can scope related reads (e.g. assigned customers). */
    resolveAgentUuid(id: string): Promise<string> {
        return this.resolveAgentId(id);
    }

    async assignCustomers(id: string, customerIds: string[]): Promise<void> {
        if (customerIds.length === 0) return;
        const agentId = await this.resolveAgentId(id);
        const resolved = await Promise.all(customerIds.map((customerId) => this.resolveCustomerId(customerId)));
        const uuids = resolved.filter((value): value is string => Boolean(value));
        if (uuids.length === 0) return;
        const payload: AgentAssignmentInput = { customerIds: uuids, reason: 'Admin agent assignment' };
        try {
            await apiClient.request(`/agents/${agentId}/assignments`, { method: 'POST', body: payload });
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to update agent customer assignments.'));
        }
    }
}

export const agentsRepository: AgentRepository = new ApiAgentRepository();
