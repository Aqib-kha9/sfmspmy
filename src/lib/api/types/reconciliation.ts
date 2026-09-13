// API contracts: Reconciliation (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Reconciliation (Day close / Handover)
// ---------------------------------------------------------------------------

export type DayCloseStatus =
    | 'open'
    | 'submitted'
    | 'closed'
    | 'reopened'
    | 'locked';

export type HandoverStatus =
    | 'pending'
    | 'counted'
    | 'confirmed'
    | 'difference';

export type SettlementMethod =
    | 'bank_transfer'
    | 'cheque'
    | 'UPI'
    | 'NEFT'
    | 'RTGS';

export type DifferenceStatus =
    | 'unresolved'
    | 'explained'
    | 'accepted'
    | 'recovered'
    | 'waived';

export interface DenominationEntry {
    denomination: number;
    count: number;
}

export type DayCloseParams = {
    agentId: string;
    date: string;
};

export type SubmitDayCloseInput = {
    businessDate?: string;
};

export type RecordHandoverInput = {
    businessDate?: string;
    amount: string;
    sectionReport?: Record<string, unknown>;
};

export type RecordDenominationsInput = {
    handoverId: string;
    entries: DenominationEntry[];
};

export type CountHandoverInput = {
    handoverId: string;
    countedAmount: string;
    notes?: string;
};

export type RecordDigitalSettlementInput = {
    dayCloseId: string;
    businessDate?: string;
    settlementReference: string;
    bankName?: string;
    settlementDate?: string;
    method: SettlementMethod;
    amount: string;
    nameWiseDetails?: string;
    receiptReference?: string;
};

export type MarkDifferenceInput = {
    differenceId: string;
    status: DifferenceStatus;
    resolutionNote?: string;
};

export type ReopenDayCloseInput = {
    reopenReason: string;
};

export type LockDayCloseInput = {
    reason?: string;
};

export type EscalateDifferenceInput = {
    note?: string;
};

// ---------------------------------------------------------------------------
// Reconciliation views (read models returned by the backend)
// ---------------------------------------------------------------------------

export interface DayCloseSummaryView {
    id: string;
    agentId: string;
    agentCode: string;
    agentName: string;
    branchId: string | null;
    branchName: string | null;
    businessDate: string;
    status: DayCloseStatus;
    totalAmount: string;
    entryCount: number;
    cashAmount: string;
    digitalAmount: string;
    queuedCount: number;
    waitingCount: number;
    rejectedCount: number;
    submittedAt: string | null;
    closedAt: string | null;
    lockedAt: string | null;
    lockedByName: string | null;
    reopenedAt: string | null;
    reopenedByName: string | null;
    reopenReason: string | null;
    handoverCount: number;
    digitalSettlementCount: number;
    differenceCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface ReconciliationTotalsView {
    businessDate: string;
    totalAmount: string;
    entryCount: number;
    cashAmount: string;
    digitalAmount: string;
    queuedCount: number;
    waitingCount: number;
    rejectedCount: number;
}

export interface DenominationView {
    denomination: number;
    noteCount: number;
    amount: string;
}

export interface HandoverView {
    id: string;
    dayCloseId: string;
    agentId: string;
    handedOverAt: string | null;
    amount: string;
    sectionReport: unknown;
    status: HandoverStatus;
    countedBy: string | null;
    countedByName: string | null;
    countedAt: string | null;
    confirmedAmount: string | null;
    differenceAmount: string | null;
    createdAt: string;
    updatedAt: string;
    denominations: DenominationView[];
}

export interface DigitalSettlementView {
    id: string;
    dayCloseId: string;
    settlementReference: string;
    bankName: string | null;
    settlementDate: string;
    method: SettlementMethod;
    amount: string;
    nameWiseDetails: unknown;
    receiptReference: string | null;
    createdAt: string;
}

export interface DifferenceView {
    id: string;
    dayCloseId: string;
    differenceType: string;
    amount: string;
    reason: string | null;
    status: DifferenceStatus;
    markedBy: string | null;
    markedByName: string | null;
    markedAt: string | null;
    resolutionNote: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReconciliationEventView {
    id: string;
    dayCloseId: string;
    eventType: string;
    eventData: unknown;
    performedBy: string | null;
    performedByName: string | null;
    performedSource: string | null;
    createdAt: string;
}

export interface ReconciliationDetailView {
    dayClose: DayCloseSummaryView;
    handovers: HandoverView[];
    digitalSettlements: DigitalSettlementView[];
    differences: DifferenceView[];
    events: ReconciliationEventView[];
}

export interface DayCloseSubmissionView {
    dayCloseId: string;
    businessDate: string;
    status: 'submitted';
    submittedAt: string;
    totals: ReconciliationTotalsView;
}
