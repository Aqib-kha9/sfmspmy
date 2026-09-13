// API contracts: Audit (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditEventView {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorStaffId: string | null;
    actorStaffCode: string | null;
    actorStaffName: string | null;
    actorRole: string | null;
    branchId: string | null;
    source: string | null;
    ipAddress: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface AuditEventsResult {
    items: AuditEventView[];
    total: number;
    page: number;
    pageSize: number;
}

export interface AuditSummaryByAction {
    action: string;
    count: number;
}

export interface AuditSummaryByActor {
    actorStaffId: string | null;
    actorStaffName: string | null;
    actorRole: string | null;
    count: number;
}

export interface AuditSummaryResult {
    total: number;
    byAction: AuditSummaryByAction[];
    byActor: AuditSummaryByActor[];
}

export type ListAuditEventsQuery = {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorStaffId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};
