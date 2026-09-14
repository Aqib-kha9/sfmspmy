import { apiClient } from '../../../../lib/api/apiClient';
import type {
    AllocateCollectionInput,
    CollectionMode,
    CollectionProductType,
    CollectionSubmissionStatus,
    CollectionTotalsView,
    CollectionView,
    DeleteDuplicateInput,
    EmergencyApprovalInput,
    ListCollectionsResult,
    ReversalView,
    ListVisitsQuery,
    ListVisitsResult,
    ReviewCollectionInput,
    ReverseCollectionInput,
} from '../../../../lib/api/types';
import { formatTimestamp, querySuffix } from './helpers';

/**
 * Collections adapter.
 *
 * The doorstep mobile surface (POST /collections, /visits, /:id/status) is
 * reserved for `collection_agent` on `agent_mobile`, so the admin workspace uses
 * the office read model (GET /collections) and the managing-director office
 * actions (review / reverse / delete-duplicate / allocate / emergency-approval).
 */

// ---------------------------------------------------------------------------
// UI shapes (mirror the ones declared in AdminPages.tsx)
// ---------------------------------------------------------------------------

type Status =
    | 'Active'
    | 'Pending'
    | 'Approved'
    | 'Completed'
    | 'Review'
    | 'Overdue'
    | 'Inactive'
    | 'Rejected'
    | 'Matched';

export type CollectionEvent = {
    id: string;
    type: string;
    date: string;
    performedBy: string;
    note: string;
};

export type CollectionRecord = {
    /** Backend collection id (uuid) used for review / reverse / allocate. */
    collectionId: string;
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    accountId: string;
    collectionType: 'Daily collection' | 'RD installment' | 'Loan repayment' | 'Penalty' | 'Other collection';
    amount: number;
    collectedOn: string;
    agent: string;
    channel: 'Doorstep' | 'Branch counter' | 'Mobile app';
    reference: string;
    remarks: string;
    status: Status;
    syncStatus: 'Synced' | 'Pending sync' | 'Failed sync';
    paymentMethod?: string;
    externalReference?: string;
    receiptStatus?: string;
    location?: string;
    deviceReference?: string;
    offlineSyncReference?: string;
    principalAllocation?: string;
    interestAllocation?: string;
    penaltyAllocation?: string;
    collectionBatchReference?: string;
    routeEvidence?: string;
    supportingDocuments?: string;
    customerAcknowledgementReference?: string;
    events: CollectionEvent[];
};

export type CollectionsQuery = {
    search?: string;
    status?: Status | 'All';
    type?: CollectionRecord['collectionType'] | 'All';
    agentId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
};

export interface CollectionsRepository {
    list(query?: CollectionsQuery): Promise<CollectionRecord[]>;
    totals(query?: CollectionsQuery): Promise<CollectionTotalsView>;
    review(id: string, input: ReviewCollectionInput): Promise<CollectionRecord>;
    reverse(id: string, input: ReverseCollectionInput): Promise<CollectionRecord>;
    deleteDuplicate(id: string, input: DeleteDuplicateInput): Promise<CollectionRecord>;
    allocate(id: string, input: AllocateCollectionInput): Promise<CollectionRecord>;
    emergencyApprove(input: EmergencyApprovalInput): Promise<CollectionRecord>;
}

// ---------------------------------------------------------------------------
// Enum bridges: backend collections enums -> AdminPages display shapes
// ---------------------------------------------------------------------------

const STATUS_FROM_API: Record<CollectionSubmissionStatus, Status> = {
    waiting: 'Pending',
    accepted: 'Completed',
    rejected: 'Rejected',
    requiresReview: 'Review',
};

const TYPE_FROM_API: Record<CollectionProductType, CollectionRecord['collectionType']> = {
    savingsDeposit: 'Daily collection',
    recurringDeposit: 'RD installment',
    loan: 'Loan repayment',
    penalty: 'Penalty',
};

const MODE_LABEL: Record<CollectionMode, string> = {
    cash: 'Cash',
    UPI: 'UPI',
    NEFT: 'NEFT',
    RTGS: 'RTGS',
    cheque: 'Cheque',
};

function syncStatusOf(view: CollectionView): CollectionRecord['syncStatus'] {
    if (view.status === 'waiting') return 'Pending sync';
    if (view.status === 'rejected') return 'Failed sync';
    return 'Synced';
}

function accountOf(view: CollectionView): string {
    return (
        view.accountNumber ??
        view.savingsAccountId ??
        view.rdAccountId ??
        view.loanId ??
        'Not linked'
    );
}

function toEvents(view: CollectionView): CollectionEvent[] {
    const events: CollectionEvent[] = [
        {
            id: `${view.id}-submitted`,
            type: 'Collection recorded',
            date: formatTimestamp(view.submittedAt ?? view.collectedAt, 'Not recorded'),
            performedBy: view.agentName ?? view.agentCode ?? 'Field agent',
            note: `Receipt ${view.receiptNumber} issued on ${view.businessDate}.`,
        },
    ];
    if (view.review) {
        events.push({
            id: view.review.id,
            type: `Review ${view.review.decision}`,
            date: formatTimestamp(view.review.createdAt, 'Not recorded'),
            performedBy: view.review.reviewedByName ?? 'Office reviewer',
            note: view.review.remarks ?? 'No remarks recorded.',
        });
    }
    if (view.isDeleted) {
        events.push({
            id: `${view.id}-duplicate`,
            type: 'Duplicate entry removed',
            date: formatTimestamp(view.updatedAt, 'Not recorded'),
            performedBy: 'System',
            note: 'Entry soft-deleted as a duplicate; the receipt record was retained.',
        });
    }
    return events;
}

/** Maps the backend collection read model onto the AdminPages register row. */
export function toCollectionRecord(view: CollectionView): CollectionRecord {
    const amount = Number(view.amount);
    return {
        collectionId: view.id,
        id: view.receiptNumber || view.id,
        customerId: view.customerNumber ?? view.customerId,
        customerName: view.customerName,
        customerPhone: view.customerNumber ?? 'Not available',
        accountId: accountOf(view),
        collectionType: TYPE_FROM_API[view.productType],
        amount: Number.isFinite(amount) ? amount : 0,
        collectedOn: view.collectedAt,
        agent: view.agentName ?? view.agentCode ?? 'Unassigned agent',
        channel: 'Doorstep',
        reference: view.receiptNumber,
        remarks: view.remark ?? '',
        status: STATUS_FROM_API[view.status],
        syncStatus: syncStatusOf(view),
        paymentMethod: MODE_LABEL[view.mode],
        externalReference: view.instrumentRef ?? undefined,
        receiptStatus: view.status === 'accepted' ? 'Issued' : 'Pending review',
        offlineSyncReference: view.receiptKind === 'daily' ? 'Daily receipt' : 'Monthly receipt',
        principalAllocation: view.isPartial ? 'Partial payment - allocation pending' : undefined,
        interestAllocation: view.isAdvance ? 'Advance payment received' : undefined,
        supportingDocuments: view.review ? `Review ${view.review.decision}` : undefined,
        customerAcknowledgementReference: view.customerNumber ?? undefined,
        events: toEvents(view),
    };
}

function toQueryParams(query: CollectionsQuery): Record<string, string | number | undefined> {
    const params: Record<string, string | number | undefined> = {
        limit: query.limit ?? 100,
        offset: query.offset ?? 0,
    };
    if (query.agentId) params.agentId = query.agentId;
    if (query.dateFrom) params.dateFrom = query.dateFrom;
    if (query.dateTo) params.dateTo = query.dateTo;
    if (query.status && query.status !== 'All') {
        const entry = (Object.keys(STATUS_FROM_API) as CollectionSubmissionStatus[]).find(
            (key) => STATUS_FROM_API[key] === query.status,
        );
        if (entry) params.status = entry;
    }
    if (query.type && query.type !== 'All') {
        const entry = (Object.keys(TYPE_FROM_API) as CollectionProductType[]).find(
            (key) => TYPE_FROM_API[key] === query.type,
        );
        if (entry) params.productType = entry;
    }
    return params;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiCollectionsRepository implements CollectionsRepository {
    async list(query: CollectionsQuery = {}): Promise<CollectionRecord[]> {
        const result = await apiClient.request<ListCollectionsResult>(
            `/collections${querySuffix(toQueryParams(query))}`,
        );
        const records = result.items.map(toCollectionRecord);
        const search = query.search?.trim().toLowerCase();
        if (!search) return records;
        return records.filter((row) =>
            `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.accountId} ${row.collectionType} ${row.agent} ${row.reference} ${row.remarks}`
                .toLowerCase()
                .includes(search),
        );
    }

    async totals(query: CollectionsQuery = {}): Promise<CollectionTotalsView> {
        const params: Record<string, string | undefined> = {};
        if (query.agentId) params.agentId = query.agentId;
        if (query.dateFrom) params.dateFrom = query.dateFrom;
        if (query.dateTo) params.dateTo = query.dateTo;
        return apiClient.request<CollectionTotalsView>(
            `/collections/reports/collection-totals${querySuffix(params)}`,
        );
    }

    async listVisits(query: ListVisitsQuery = {}): Promise<ListVisitsResult> {
        const params: Record<string, string | undefined> = {};
        if (query.agentId) params.agentId = query.agentId;
        if (query.customerId) params.customerId = query.customerId;
        if (query.outcome) params.outcome = query.outcome;
        if (query.dateFrom) params.dateFrom = query.dateFrom;
        if (query.dateTo) params.dateTo = query.dateTo;
        if (query.limit !== undefined) params.limit = query.limit.toString();
        if (query.offset !== undefined) params.offset = query.offset.toString();
        
        return apiClient.request<ListVisitsResult>(
            `/collections/visits${querySuffix(params)}`,
        );
    }

    async review(id: string, input: ReviewCollectionInput): Promise<CollectionRecord> {
        const view = await apiClient.request<CollectionView>(`/collections/${id}/review`, {
            method: 'POST',
            body: input,
        });
        return toCollectionRecord(view);
    }

    async reverse(id: string, input: ReverseCollectionInput): Promise<CollectionRecord> {
        const reversal = await apiClient.request<ReversalView>(`/collections/${id}/reverse`, {
            method: 'POST',
            body: input,
        });
        return toCollectionRecord(reversal.original);
    }

    async deleteDuplicate(id: string, input: DeleteDuplicateInput): Promise<CollectionRecord> {
        const view = await apiClient.request<CollectionView>(`/collections/${id}/delete-duplicate`, {
            method: 'POST',
            body: input,
        });
        return toCollectionRecord(view);
    }

    async allocate(id: string, input: AllocateCollectionInput): Promise<CollectionRecord> {
        const view = await apiClient.request<CollectionView>(`/collections/${id}/allocate`, {
            method: 'POST',
            body: input,
        });
        return toCollectionRecord(view);
    }

    async emergencyApprove(input: EmergencyApprovalInput): Promise<CollectionRecord> {
        const view = await apiClient.request<CollectionView>('/collections/emergency-approval', {
            method: 'POST',
            body: input,
        });
        return toCollectionRecord(view);
    }
}

export const collectionsRepository: CollectionsRepository = new ApiCollectionsRepository();
