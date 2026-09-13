import { apiClient } from '../../../../lib/api/apiClient';
import { ApiError } from '../../../../lib/api/client';
import type {
    AgentListResult,
    CountHandoverInput,
    DayCloseStatus,
    DayCloseSummaryView,
    DifferenceView,
    DigitalSettlementView,
    EscalateDifferenceInput,
    HandoverView,
    LockDayCloseInput,
    MarkDifferenceInput,
    RecordDigitalSettlementInput,
    ReconciliationDetailView,
    ReconciliationEventView,
    ReopenDayCloseInput,
} from '../../../../lib/api/types';
import { formatTimestamp, querySuffix } from './helpers';

// ---------------------------------------------------------------------------
// UI shapes (mirror the ones declared in AdminPages.tsx)
// ---------------------------------------------------------------------------

export type ReconciliationEvent = {
    id: string;
    type: string;
    date: string;
    performedBy: string;
    note: string;
};

export type ReconciliationStatus = 'Matched' | 'Review' | 'Pending' | 'Completed';

export type ReconciliationRecord = {
    id: string;
    agent: string;
    agentId: string;
    route: string;
    reconciliationDate: string;
    collectedAmount: number;
    submittedAmount: number;
    cashAmount: number;
    digitalAmount: number;
    submissionReference: string;
    submittedOn: string;
    status: ReconciliationStatus;
    remarks: string;
    cashDenominationReference?: string;
    handoverReceiptReference?: string;
    bankSettlementReference?: string;
    digitalSettlementDetails?: string;
    exceptionReason?: string;
    supportingDocuments?: string;
    supervisorReference?: string;
    secondReviewerReference?: string;
    submissionDevice?: string;
    offlineSyncReference?: string;
    reviewCorrelationReference?: string;
    reviewedBy?: string;
    reviewedOn?: string;
    resolutionNote?: string;
    events: ReconciliationEvent[];
};

export type ReconciliationQuery = {
    date?: string;
    branchId?: string;
    search?: string;
    status?: ReconciliationStatus | 'All';
};

export interface ReconciliationRepository {
    list(query?: ReconciliationQuery): Promise<ReconciliationRecord[]>;
    detail(id: string): Promise<ReconciliationRecord>;
    count(input: CountHandoverInput): Promise<ReconciliationRecord>;
    recordDigitalSettlement(input: RecordDigitalSettlementInput): Promise<ReconciliationRecord>;
    markDifference(input: MarkDifferenceInput): Promise<ReconciliationRecord>;
    lock(id: string, input: LockDayCloseInput): Promise<ReconciliationRecord>;
    reopen(id: string, input: ReopenDayCloseInput): Promise<ReconciliationRecord>;
    escalate(id: string, input: EscalateDifferenceInput): Promise<ReconciliationRecord>;
}

// ---------------------------------------------------------------------------
// Enum bridge: backend day-close lifecycle -> UI reconciliation status
// ---------------------------------------------------------------------------

const STATUS_FROM_API: Record<DayCloseStatus, ReconciliationStatus> = {
    open: 'Pending',
    submitted: 'Review',
    closed: 'Completed',
    reopened: 'Review',
    locked: 'Matched',
};

/** Renders an unknown JSON payload (event data / section report) as text. */
function describe(payload: unknown): string {
    if (payload === null || payload === undefined) return '';
    if (typeof payload === 'string') return payload;
    try {
        return JSON.stringify(payload);
    } catch {
        return String(payload);
    }
}

function toEvents(events: ReconciliationEventView[]): ReconciliationEvent[] {
    return events.map((event) => ({
        id: event.id,
        type: event.eventType.replace(/_/g, ' '),
        date: formatTimestamp(event.createdAt, 'Not recorded'),
        performedBy: event.performedByName ?? 'System',
        note: describe(event.eventData),
    }));
}

function amount(value: string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

/** Maps a day-close summary (list row) into the reconciliation register row. */
function fromSummary(summary: DayCloseSummaryView, route: string): ReconciliationRecord {
    const cash = amount(summary.cashAmount);
    const digital = amount(summary.digitalAmount);
    return {
        id: summary.id,
        agent: summary.agentName ?? summary.agentCode ?? 'Unassigned agent',
        agentId: summary.agentId,
        route: route || summary.branchName || 'Branch route',
        reconciliationDate: summary.businessDate,
        collectedAmount: amount(summary.totalAmount),
        submittedAmount: cash + digital,
        cashAmount: cash,
        digitalAmount: digital,
        submissionReference: `CASH-${summary.id.slice(0, 8).toUpperCase()}`,
        submittedOn: summary.submittedAt ?? summary.createdAt,
        status: STATUS_FROM_API[summary.status],
        remarks: summary.reopenReason ?? '',
        reviewedBy: summary.lockedByName ?? undefined,
        reviewedOn: summary.lockedAt ?? undefined,
        reviewCorrelationReference: summary.id,
        events: [],
    };
}

/** Maps the full reconciliation detail read-model into the register row. */
function fromDetail(detail: ReconciliationDetailView): ReconciliationRecord {
    const summary = detail.dayClose;
    const base = fromSummary(summary, '');
    const handover: HandoverView | undefined = detail.handovers[0];
    const settlement: DigitalSettlementView | undefined = detail.digitalSettlements[0];
    const difference: DifferenceView | undefined = detail.differences[0];

    const collected = amount(summary.totalAmount);
    const handedOver = detail.handovers.reduce((total, item) => total + amount(item.amount), 0);
    const settled = detail.digitalSettlements.reduce((total, item) => total + amount(item.amount), 0);

    return {
        ...base,
        collectedAmount: collected,
        cashAmount: handedOver,
        digitalAmount: settled,
        submittedAmount: handedOver + settled,
        submissionReference: handover?.id ? `CASH-${handover.id.slice(0, 8).toUpperCase()}` : base.submissionReference,
        reviewedBy: handover?.countedByName ?? summary.lockedByName ?? undefined,
        reviewedOn: handover?.countedAt ?? summary.lockedAt ?? undefined,
        cashDenominationReference: handover ? `${handover.denominations.length} denomination entries` : undefined,
        handoverReceiptReference: handover?.id,
        bankSettlementReference: settlement?.settlementReference,
        digitalSettlementDetails: settlement
            ? `${settlement.method} · ${settlement.bankName ?? 'Bank'} · ${settlement.settlementDate}`
            : undefined,
        exceptionReason: difference?.reason ?? summary.reopenReason ?? undefined,
        supportingDocuments: difference ? describe(difference.differenceType) : undefined,
        supervisorReference: handover?.countedByName ?? undefined,
        secondReviewerReference: summary.lockedByName ?? summary.reopenedByName ?? undefined,
        reviewCorrelationReference: summary.id,
        resolutionNote: difference?.resolutionNote ?? undefined,
        events: toEvents(detail.events),
    };
}

function isNotFound(error: unknown): boolean {
    return error instanceof ApiError && error.status === 404;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiReconciliationRepository implements ReconciliationRepository {
    async list(query: ReconciliationQuery = {}): Promise<ReconciliationRecord[]> {
        const agents = await apiClient.request<AgentListResult>(
            `/agents${querySuffix({ branchId: query.branchId, limit: 100 })}`,
        );
        const date = query.date;
        if (!date) return [];

        const rows = await Promise.all(
            agents.items.map(async (agent) => {
                try {
                    const summary = await apiClient.request<DayCloseSummaryView>(
                        `/reconciliation/day-close/${agent.id}/${date}`,
                    );
                    return fromSummary(summary, agent.branchName ?? '');
                } catch (error) {
                    // A 404 means the agent has no day-close for the date yet.
                    if (isNotFound(error)) return null;
                    throw error;
                }
            }),
        );

        const records = rows.filter((row): row is ReconciliationRecord => row !== null);
        return records.filter((row) => this.matches(row, query));
    }

    async detail(id: string): Promise<ReconciliationRecord> {
        const detail = await apiClient.request<ReconciliationDetailView>(`/reconciliation/${id}`);
        return fromDetail(detail);
    }

    async count(input: CountHandoverInput): Promise<ReconciliationRecord> {
        const handover = await apiClient.request<HandoverView>('/reconciliation/count', {
            method: 'POST',
            body: input,
        });
        return this.detail(handover.dayCloseId);
    }

    async recordDigitalSettlement(input: RecordDigitalSettlementInput): Promise<ReconciliationRecord> {
        const settlement = await apiClient.request<DigitalSettlementView>('/reconciliation/digital-settlement', {
            method: 'POST',
            body: input,
        });
        return this.detail(settlement.dayCloseId);
    }

    async markDifference(input: MarkDifferenceInput): Promise<ReconciliationRecord> {
        const difference = await apiClient.request<DifferenceView>('/reconciliation/difference', {
            method: 'POST',
            body: input,
        });
        return this.detail(difference.dayCloseId);
    }

    async lock(id: string, input: LockDayCloseInput): Promise<ReconciliationRecord> {
        await apiClient.request<DayCloseSummaryView>(`/reconciliation/${id}/lock`, {
            method: 'POST',
            body: input,
        });
        return this.detail(id);
    }

    async reopen(id: string, input: ReopenDayCloseInput): Promise<ReconciliationRecord> {
        await apiClient.request<DayCloseSummaryView>(`/reconciliation/${id}/reopen`, {
            method: 'POST',
            body: input,
        });
        return this.detail(id);
    }

    async escalate(id: string, input: EscalateDifferenceInput): Promise<ReconciliationRecord> {
        await apiClient.request<{ dayCloseId: string }>(`/reconciliation/${id}/escalate`, {
            method: 'POST',
            body: input,
        });
        return this.detail(id);
    }

    private matches(row: ReconciliationRecord, query: ReconciliationQuery): boolean {
        if (query.status && query.status !== 'All' && row.status !== query.status) return false;
        const search = query.search?.trim().toLowerCase();
        if (!search) return true;
        const haystack = `${row.id} ${row.agent} ${row.agentId} ${row.route} ${row.submissionReference} ${row.remarks}`.toLowerCase();
        return haystack.includes(search);
    }
}

export const reconciliationRepository: ReconciliationRepository = new ApiReconciliationRepository();
