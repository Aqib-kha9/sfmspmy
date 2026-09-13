// API contracts: Recurring Deposits (RD) (mirrored from the backend service views).
import type { CustomerNominee } from './customers';
import type { DepositPaymentMethod } from './deposits';

// ---------------------------------------------------------------------------
// Recurring Deposits (RD)
// ---------------------------------------------------------------------------

export type RdFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type RdAccountStatus =
    | 'active'
    | 'overdue'
    | 'completed'
    | 'matured'
    | 'closed_early'
    | 'suspended'
    | 'cancelled';

export type RdInstalmentStatus =
    | 'due'
    | 'paid'
    | 'partial'
    | 'missed'
    | 'overdue'
    | 'waived';

export type RdPenaltyStatus = 'due' | 'paid' | 'waived';

export type RdInterestCreditFrequency = 'yearly' | 'half_yearly';

export type RdScheduleChangeType =
    | 'due_date_change'
    | 'instalment_amount_change'
    | 'both';

export interface RdSchemeView {
    id: string;
    code: string;
    name: string;
    description: string | null;
    frequency: RdFrequency;
    minInstalmentAmount: string;
    maxInstalmentAmount: string | null;
    minDurationMonths: number;
    maxDurationMonths: number;
    gracePeriodMonths: number;
    interestRate: string;
    interestCreditFrequency: string;
    earlyClosureFeePercent: string;
    penaltyConfig: Record<string, unknown> | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RdAccountView {
    id: string;
    accountNumber: string;
    customerId: string;
    customerNumber: string | null;
    customerName: string;
    schemeId: string;
    schemeCode: string;
    schemeName: string;
    branchId: string;
    branchName: string | null;
    instalmentAmount: string;
    frequency: RdFrequency;
    startDate: string | null;
    firstDueDate: string | null;
    maturityDate: string | null;
    status: RdAccountStatus;
    totalExpected: string;
    totalPaid: string;
    pendingAmount: string;
    gracePeriodMonths: number;
    openedBy: string | null;
    openedByName: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    closedOn: string | null;
    closureFee: string | null;
    linkedLoanId: string | null;
    linkedLoanNumber: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RdInstalmentView {
    id: string;
    instalmentNumber: number;
    dueDate: string | null;
    expectedAmount: string;
    paidAmount: string;
    status: RdInstalmentStatus;
    paidOn: string | null;
    paymentMethod: DepositPaymentMethod | null;
    referenceNumber: string | null;
    collectionEntryId: string | null;
    allocation: unknown[] | null;
    createdAt: string;
    updatedAt: string;
}

export interface RdPenaltyView {
    id: string;
    rdAccountId: string;
    instalmentId: string | null;
    instalmentNumber: number | null;
    dueDate: string | null;
    penaltyAmount: string;
    reason: string;
    status: RdPenaltyStatus;
    waivedBy: string | null;
    waivedByName: string | null;
    waivedOn: string | null;
    createdAt: string;
}

export interface RdWaiverView {
    id: string;
    rdAccountId: string;
    penaltyId: string | null;
    amount: string;
    reason: string;
    approvedBy: string;
    approvedByName: string | null;
    createdAt: string;
}

export interface RdScheduleChangeView {
    id: string;
    rdAccountId: string;
    changeType: RdScheduleChangeType;
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
    reason: string;
    approvedBy: string;
    approvedByName: string | null;
    effectiveFrom: string | null;
    createdAt: string;
}

export interface RdScheduleView {
    account: RdAccountView;
    status?: string;
    from?: string;
    to?: string;
    total: number;
    items: RdInstalmentView[];
    penalties: RdPenaltyView[];
}

export interface RdInstalmentPaymentResult {
    account: RdAccountView;
    appliedTo: RdInstalmentView[];
}

export interface RdWaiverResult {
    account: RdAccountView;
    waiver: RdWaiverView;
}

export interface RdRescheduleResult {
    account: RdAccountView;
    change: RdScheduleChangeView;
}

export interface RdCloseEarlyResult {
    account: RdAccountView;
    closureFee: string;
}

export interface RdSurplusTransferResult {
    account: RdAccountView;
    held: { loanId: string; amount: string; entryType: 'held' };
}

export type CreateRdSchemeInput = {
    code: string;
    name: string;
    description?: string;
    frequency: RdFrequency;
    minInstalmentAmount: string;
    maxInstalmentAmount?: string | null;
    minDurationMonths: number;
    maxDurationMonths: number;
    gracePeriodMonths?: number;
    interestRate: string;
    interestCreditFrequency: RdInterestCreditFrequency;
    earlyClosureFeePercent: string;
    penaltyConfig?: Record<string, unknown> | null;
};

export type ListRdSchemesQuery = {
    isActive?: 'true' | 'false';
    frequency?: RdFrequency;
    q?: string;
    limit?: number;
    offset?: number;
};

export type RdSchemeListResult = {
    items: RdSchemeView[];
    total: number;
};

export type CreateRdAccountInput = {
    customerId: string;
    schemeId: string;
    branchId: string;
    instalmentAmount: string;
    startDate: string;
    nominee?: CustomerNominee;
};

export type ListRdAccountsQuery = {
    status?: RdAccountStatus;
    customerId?: string;
    schemeId?: string;
    branchId?: string;
    q?: string;
    limit?: number;
    offset?: number;
};

export type RdAccountListResult = {
    items: RdAccountView[];
    total: number;
};

export type RdInstalmentPaymentInput = {
    amount: string;
    paymentMethod: DepositPaymentMethod;
    referenceNumber?: string;
};

export type RdScheduleQuery = {
    from?: string;
    to?: string;
};

export type RdPenaltyWaiverInput = {
    penaltyId: string;
    reason: string;
};

export type RdRescheduleInput = {
    changeType: RdScheduleChangeType;
    newDueDate?: string;
    newInstalmentAmount?: string;
    reason: string;
    effectiveFrom?: string;
};

export type RdCloseEarlyInput = {
    reason: string;
};

export type RdSurplusTransferInput = {
    loanId: string;
    amount: string;
    reason: string;
};

export type RdApprovalInput = {
    approve: boolean;
    reason?: string;
};
