// API contracts: Collections (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export type CollectionProductType =
    | 'savingsDeposit'
    | 'recurringDeposit'
    | 'loan'
    | 'penalty';

export type CollectionMode = 'cash' | 'UPI' | 'NEFT' | 'RTGS' | 'cheque';

export type CollectionSubmissionStatus =
    | 'waiting'
    | 'accepted'
    | 'rejected'
    | 'requiresReview';

export type VisitOutcome =
    | 'collected'
    | 'notAvailable'
    | 'promised'
    | 'refused';

export type ReceiptKind = 'daily' | 'monthly';

export type ReviewDecision = 'accepted' | 'rejected' | 'requiresReview';

export interface SubmissionView {
    id: string;
    receiptNumber: string;
    customerId: string;
    customerName: string;
    customerNumber: string | null;
    productType: CollectionProductType;
    savingsAccountId: string | null;
    rdAccountId: string | null;
    loanId: string | null;
    accountNumber: string | null;
    amount: string;
    mode: CollectionMode;
    isPartial: boolean;
    isAdvance: boolean;
    status: CollectionSubmissionStatus;
    businessDate: string;
    collectedAt: string;
    submittedAt: string;
    agentId: string;
    agentCode: string | null;
    agentName: string | null;
    branchId: string | null;
    receiptKind: ReceiptKind;
    remark: string | null;
    instrumentRef: string | null;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SubmissionResultView {
    entry: SubmissionView;
    replayed: boolean;
}

export interface VisitView {
    id: string;
    customerId: string;
    customerName: string;
    visitDate: string;
    visitedAt: string;
    outcome: VisitOutcome;
    remark: string | null;
    photos: string[] | null;
    agentId: string;
    agentCode: string | null;
    agentName: string | null;
    createdAt: string;
}

export interface VisitResultView {
    visit: VisitView;
    replayed: boolean;
}

export interface ReviewView {
    id: string;
    collectionId: string;
    decision: ReviewDecision;
    remarks: string | null;
    reviewedBy: string;
    reviewedByName: string | null;
    createdAt: string;
}

export interface CollectionView extends SubmissionView {
    review: ReviewView | null;
}

export interface ListCollectionsResult {
    items: CollectionView[];
    total: number;
}

export type ListVisitsQuery = {
    agentId?: string;
    customerId?: string;
    outcome?: VisitOutcome;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
};

export interface ListVisitsResult {
    items: VisitView[];
    total: number;
}

export interface ReversalView {
    original: CollectionView;
    reversalId: string;
    replacement: CollectionView | null;
    reason: string;
    customerNotified: boolean;
    createdAt: string;
}

export interface CollectionTotalsBreakdown {
    key: string;
    count: number;
    amount: string;
}

export interface CollectionTotalsView {
    total: string;
    count: number;
    byProductType: CollectionTotalsBreakdown[];
    byMode: CollectionTotalsBreakdown[];
    byAgent: CollectionTotalsBreakdown[];
}

export type SubmitCollectionInput = {
    productType: CollectionProductType;
    customerId: string;
    savingsAccountId?: string;
    rdAccountId?: string;
    loanId?: string;
    amount: string;
    mode: CollectionMode;
    isPartial?: boolean;
    isAdvance?: boolean;
    instrumentRef?: string;
    instrumentDate?: string;
    businessDate?: string;
    collectedAt?: string;
    submittedFromOffline?: boolean;
    offlineLate?: boolean;
    visitLogId?: string;
    acknowledged: boolean;
    receiptKind?: ReceiptKind;
};

export type VisitInput = {
    customerId: string;
    visitDate: string;
    visitedAt?: string;
    outcome: VisitOutcome;
    remark?: string;
    photos?: string[];
};

export type ListCollectionsQuery = {
    status?: CollectionSubmissionStatus;
    agentId?: string;
    customerId?: string;
    productType?: CollectionProductType;
    mode?: CollectionMode;
    dateFrom?: string;
    dateTo?: string;
    isDeleted?: 'true' | 'false';
    limit?: number;
    offset?: number;
};

export type ReviewCollectionInput = {
    decision: ReviewDecision;
    remarks?: string;
};

export type ReverseCollectionInput = {
    reason: string;
    proofOfRecord?: Record<string, unknown>[];
    replacement?: SubmitCollectionInput;
    customerNotified: boolean;
};

export type DeleteDuplicateInput = {
    reason: string;
};

export type AllocationEntry = {
    bucket: string;
    amount: string;
};

export type AllocateCollectionInput = {
    allocation: AllocationEntry[];
    note?: string;
};

export type EmergencyApprovalInput = {
    agentId: string;
    customerId: string;
    productType: CollectionProductType;
    savingsAccountId?: string;
    rdAccountId?: string;
    loanId?: string;
    amount: string;
    mode: CollectionMode;
    isPartial?: boolean;
    isAdvance?: boolean;
    instrumentRef?: string;
    instrumentDate?: string;
    businessDate?: string;
    collectedAt?: string;
    receiptKind?: ReceiptKind;
    acknowledged?: boolean;
    remark?: string;
};

export type CollectionTotalsQuery = {
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
    customerId?: string;
    productType?: CollectionProductType;
    mode?: CollectionMode;
};
