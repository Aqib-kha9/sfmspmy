// API contracts: Deposits (Savings) (mirrored from the backend service views).
import type { CustomerNominee } from './customers';

// ---------------------------------------------------------------------------
// Deposits (Savings)
// ---------------------------------------------------------------------------

export type DepositInterestMethod = 'simple' | 'compounding';

export type DepositInterestFrequency =
    | 'monthly'
    | 'quarterly'
    | 'half_yearly'
    | 'yearly';

export type RatePolicy = 'fixed' | 'variable';

export type SavingsAccountStatus =
    | 'pending'
    | 'active'
    | 'frozen'
    | 'closed';

export type TransactionType = 'deposit' | 'withdrawal' | 'interest' | 'adjustment';

export type Direction = 'credit' | 'debit';

export type AdjustmentType = 'credit' | 'debit';

export type DepositPaymentMethod =
    | 'cash'
    | 'bank_transfer'
    | 'cheque'
    | 'mobile_money'
    | 'upi'
    | 'neft'
    | 'rtgs';

export interface DepositProductView {
    id: string;
    code: string;
    name: string;
    description: string | null;
    minOpeningAmount: string;
    minBalance: string;
    maxBalance: string | null;
    interestMethod: DepositInterestMethod;
    interestFrequency: DepositInterestFrequency;
    interestRate: string;
    ratePolicy: RatePolicy;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DepositAccountView {
    id: string;
    accountNumber: string;
    customerId: string;
    customerNumber: string | null;
    customerName: string;
    productId: string;
    productCode: string;
    productName: string;
    productMinBalance: string;
    productMaxBalance: string | null;
    branchId: string;
    branchName: string | null;
    status: SavingsAccountStatus;
    currentBalance: string;
    interestRate: string | null;
    openedBy: string | null;
    openedByName: string | null;
    openedOn: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    approvedOn: string | null;
    freezeReason: string | null;
    closedOn: string | null;
    closureReason: string | null;
    reopenedOn: string | null;
    lastInterestPostedOn: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DepositTransactionView {
    id: string;
    accountId: string;
    accountNumber: string;
    transactionType: TransactionType;
    direction: Direction;
    amount: string;
    balanceAfter: string;
    valueDate: string;
    paymentMethod: DepositPaymentMethod | null;
    referenceNumber: string | null;
    description: string | null;
    performedBy: string | null;
    performedSource: string;
    reversalOf: string | null;
    adjustmentId: string | null;
    createdAt: string;
}

export interface DepositAdjustmentView {
    id: string;
    accountId: string;
    adjustmentType: AdjustmentType;
    originalTransactionId: string;
    adjustmentTransactionId: string;
    reason: string;
    evidenceReferences: string[] | null;
    customerConfirmed: boolean;
    approvedBy: string | null;
    approvedByName: string | null;
    createdAt: string;
}

export interface DepositStatementView {
    account: DepositAccountView;
    from: string;
    to: string;
    openingBalance: string;
    closingBalance: string;
    totalCredits: string;
    totalDebits: string;
    total: number;
    transactions: DepositTransactionView[];
}

export type CreateDepositProductInput = {
    code: string;
    name: string;
    description?: string;
    minOpeningAmount: string;
    minBalance: string;
    maxBalance?: string | null;
    interestMethod: DepositInterestMethod;
    interestFrequency: DepositInterestFrequency;
    interestRate: string;
    ratePolicy: RatePolicy;
};

export type ListDepositProductsQuery = {
    isActive?: 'true' | 'false';
    q?: string;
    limit?: number;
    offset?: number;
};

export type DepositProductListResult = {
    items: DepositProductView[];
    total: number;
};

export type CreateDepositAccountInput = {
    customerId: string;
    productId: string;
    branchId: string;
    openingDeposit: string;
    interestRate?: string;
    nominee?: CustomerNominee;
};

export type UpdateDepositAccountInput = {
    nominee?: CustomerNominee | null;
    interestRate?: string | null;
};

export type FreezeDepositAccountInput = {
    reason: string;
};

export type CloseDepositAccountInput = {
    reason: string;
};

export type ReopenDepositAccountInput = {
    reason: string;
};

export type ApproveDepositAccountInput = Record<string, never>;

export type ListDepositAccountsQuery = {
    status?: SavingsAccountStatus;
    customerId?: string;
    productId?: string;
    branchId?: string;
    q?: string;
    limit?: number;
    offset?: number;
};

export type DepositAccountListResult = {
    items: DepositAccountView[];
    total: number;
};

export type PostTransactionInput = {
    transactionType: 'deposit' | 'withdrawal';
    amount: string;
    paymentMethod: DepositPaymentMethod;
    referenceNumber?: string;
    description?: string;
};

export type ListTransactionsQuery = {
    from?: string;
    to?: string;
    type?: TransactionType;
    direction?: Direction;
    limit?: number;
    offset?: number;
};

export type TransactionListResult = {
    items: DepositTransactionView[];
    total: number;
};

export type CreateAdjustmentInput = {
    adjustmentType: AdjustmentType;
    amount: string;
    reason: string;
    evidenceReferences?: string[];
    customerConfirmed: boolean;
};
