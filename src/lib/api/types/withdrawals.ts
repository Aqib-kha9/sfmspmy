// API contracts: Withdrawals (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

export type WithdrawalAccountKind = 'savings' | 'rd' | 'fd' | 'loan_surplus';

export type WithdrawalPaymentMethod =
    | 'cash'
    | 'bank_transfer'
    | 'cheque'
    | 'mobile_money';

export type WithdrawalStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'paid'
    | 'confirmed'
    | 'cancelled';

export type WithdrawalEventType =
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'paid'
    | 'confirmed'
    | 'changed'
    | 'cancelled';

export interface WithdrawalIdentityVerification {
    passbook: boolean;
    signature: boolean;
    aadhaar: boolean;
}

export interface WithdrawalView {
    id: string;
    requestNumber: string;
    customerId: string;
    customerNumber: string | null;
    customerMobile: string | null;
    customerName: string;
    customerStatus: string;
    branchId: string;
    branchName: string;
    accountKind: WithdrawalAccountKind;
    accountId: string | null;
    accountNumber: string | null;
    amount: string;
    balanceBefore: string | null;
    reason: string;
    freeTextReason: string | null;
    paymentMethod: WithdrawalPaymentMethod;
    status: WithdrawalStatus;
    isHighValue: boolean;
    identityVerified: WithdrawalIdentityVerification;
    requestedBy: string | null;
    requestedByName: string | null;
    requestedOn: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    approvedOn: string | null;
    rejectionReason: string | null;
    paidBy: string | null;
    paidByName: string | null;
    paidOn: string | null;
    payoutReference: string | null;
    confirmedBy: string | null;
    confirmedByName: string | null;
    confirmedOn: string | null;
    /** Free-form operator worksheet captured with the request. */
    documents: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
}

export interface WithdrawalHistoryEventView {
    id: string;
    withdrawalId: string;
    eventType: WithdrawalEventType;
    eventData: Record<string, unknown> | null;
    performedBy: string | null;
    performedByName: string | null;
    performedSource: string | null;
    createdAt: string;
}

export interface WithdrawalHistoryResult {
    withdrawalId: string;
    requestNumber: string;
    items: WithdrawalHistoryEventView[];
}

export type ListWithdrawalsQuery = {
    status?: WithdrawalStatus;
    accountKind?: WithdrawalAccountKind;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
};

export type RequestWithdrawalInput = {
    accountKind: WithdrawalAccountKind;
    accountId: string;
    amount: string;
    paymentMethod: WithdrawalPaymentMethod;
    identityVerified?: WithdrawalIdentityVerification;
    reason: string;
    freeTextReason?: string;
    /** Free-form operator worksheet (evidence references) stored as JSONB. */
    documents?: Record<string, unknown>;
};

export type ListWithdrawalsResult = {
    items: WithdrawalView[];
    total: number;
};

export type ApproveWithdrawalInput = { comment?: string };
export type RejectWithdrawalInput = { reason: string };
export type PayWithdrawalInput = {
    payoutReference?: string;
    identityVerified?: WithdrawalIdentityVerification;
};
export type ConfirmWithdrawalInput = Record<string, never>;
export type ChangeWithdrawalInput = {
    amount: string;
    reason: string;
    freeTextReason?: string;
};
