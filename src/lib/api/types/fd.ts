// API contracts: Fixed Deposits (FD) (mirrored from the backend service views).
import type { CustomerNominee } from './customers';

// ---------------------------------------------------------------------------
// Fixed Deposits (FD)
// ---------------------------------------------------------------------------

export type FdPayoutFrequency = 'monthly' | 'quarterly' | 'yearly' | 'at_maturity';

export type FdPayoutMode = 'payout' | 'reinvest';

export type FdMaturityAction =
    | 'pending'
    | 'renew_principal_interest'
    | 'renew_principal'
    | 'transfer_to_savings'
    | 'pay_cash'
    | 'pay_bank';

export type FdAccountStatus =
    | 'active'
    | 'matured'
    | 'closed_early'
    | 'under_lien'
    | 'closed'
    | 'renewed';

export type FdLienStatus = 'active' | 'released';

export type FdMaturityEventType =
    | 'pre_maturity_notice'
    | 'matured'
    | 'action_taken'
    | 'renewed'
    | 'transferred'
    | 'closed_early';

export type FdHistoryEventKind = 'maturity_event' | 'lien' | 'interest_payout';

export interface FdRateCardView {
    id: string;
    minAmount: string;
    maxAmount: string;
    tenureMonths: number;
    interestRate: string;
    earlyClosurePenaltyPercent: string;
    minHoldingMonths: number;
    effectiveFrom: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FdAccountView {
    id: string;
    accountNumber: string;
    customerId: string;
    customerNumber: string | null;
    customerName: string;
    rateCardId: string;
    rateCardMinAmount: string;
    rateCardMaxAmount: string;
    rateCardTenureMonths: number;
    branchId: string;
    branchName: string | null;
    depositAmount: string;
    tenureMonths: number;
    interestRate: string;
    rateIsFixed: boolean;
    startDate: string;
    maturityDate: string;
    payoutFrequency: FdPayoutFrequency;
    payoutMode: FdPayoutMode;
    maturityAction: FdMaturityAction;
    status: FdAccountStatus;
    lienAmount: string;
    closedOn: string | null;
    closurePenalty: string | null;
    openedBy: string | null;
    openedByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FdLienView {
    id: string;
    fdAccountId: string;
    lienAmount: string;
    reason: string;
    status: string;
    requestedBy: string;
    requestedByName: string | null;
    requestedOn: string;
    releasedOn: string | null;
    releasedBy: string | null;
    releasedByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FdMaturityEventView {
    id: string;
    fdAccountId: string;
    eventType: string;
    eventDate: string;
    details: Record<string, unknown> | null;
    createdAt: string;
}

export interface FdInterestPayoutView {
    id: string;
    fdAccountId: string;
    payoutDate: string;
    periodStart: string;
    periodEnd: string;
    amount: string;
    payoutMode: string;
    referenceNumber: string | null;
    savingsTransactionId: string | null;
    createdAt: string;
}

export interface FdHistoryEventView {
    kind: FdHistoryEventKind;
    entityId: string;
    eventDate: string;
    status: string | null;
    amount: string | null;
    referenceNumber: string | null;
    reason: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
}

export interface FdHistoryView {
    total: number;
    items: FdHistoryEventView[];
}

export interface FdCloseEarlyResult {
    account: FdAccountView;
    closurePenalty: string;
}

export interface FdMaturityActionResult {
    account: FdAccountView;
    action: FdMaturityAction;
    depositAmount: string;
    interestAmount: string;
}

export interface FdLoanRefView {
    id: string;
    loanNumber: string;
    applicationNumber: string;
    customerId: string;
    productId: string;
    amount: string;
    totalPayable: string;
    status: string;
    instalmentCount: number;
    nextDueDate: string | null;
    createdAt: string;
}

export interface FdLoanResult {
    loan: FdLoanRefView;
}

export type CreateFdRateCardInput = {
    minAmount: string;
    maxAmount: string;
    tenureMonths: number;
    interestRate: string;
    earlyClosurePenaltyPercent: string;
    minHoldingMonths: number;
    effectiveFrom: string;
};

export type ListFdRateCardsQuery = {
    isActive?: 'true' | 'false';
    amount?: string;
    tenureMonths?: number;
    limit?: number;
    offset?: number;
};

export type FdRateCardListResult = {
    items: FdRateCardView[];
    total: number;
};

export type CreateFdAccountInput = {
    customerId: string;
    rateCardId: string;
    branchId: string;
    depositAmount: string;
    tenureMonths: number;
    startDate: string;
    payoutFrequency: FdPayoutFrequency;
    payoutMode: FdPayoutMode;
    maturityAction?: FdMaturityAction;
    nominee?: CustomerNominee;
};

export type ListFdAccountsQuery = {
    status?: FdAccountStatus;
    customerId?: string;
    branchId?: string;
    q?: string;
    limit?: number;
    offset?: number;
};

export type FdAccountListResult = {
    items: FdAccountView[];
    total: number;
};

export type FdLienInput = {
    lienAmount: string;
    reason: string;
};

export type FdCloseEarlyInput = {
    reason: string;
};

export type FdMaturityActionInput = {
    action: FdMaturityAction;
    reason?: string;
};

export type FdLoanAgainstInput = {
    amount: string;
    tenureMonths: number;
    productId: string;
};

export type FdHistoryQuery = {
    limit?: number;
    offset?: number;
};
