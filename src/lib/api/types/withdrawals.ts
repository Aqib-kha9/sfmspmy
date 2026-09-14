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
    | 'cancelled'
    | 'reversed';

export type WithdrawalEventType =
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'paid'
    | 'confirmed'
    | 'changed'
    | 'cancelled'
    | 'reversed';

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
    /** Cancellation metadata — populated only when status = 'cancelled'. */
    cancelledBy: string | null;
    cancelledByName: string | null;
    cancelledOn: string | null;
    cancellationReason: string | null;
    /** Reversal metadata — populated only when a paid payout was recalled. */
    reversedBy: string | null;
    reversedByName: string | null;
    reversedOn: string | null;
    reversalReason: string | null;
    reversalTransactionId: string | null;
    /** Client-supplied idempotency key that produced this request (null for legacy rows). */
    idempotencyKey: string | null;
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

/**
 * Result of POST /withdrawals. `created` is false when the request was replayed
 * from a previously committed Idempotency-Key (HTTP 200) rather than created
 * anew (HTTP 201) — the UI uses this to avoid a misleading "created" toast.
 */
export type RequestWithdrawalResult = {
    created: boolean;
    withdrawal: WithdrawalView;
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
export type CancelWithdrawalInput = { reason: string };
export type ReverseWithdrawalInput = { reason: string };
