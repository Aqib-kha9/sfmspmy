// API contracts: Loans (mirrored from the backend service views).
// ===========================================================================
// Loans (/api/v1/loans)
// ===========================================================================

export type LoanCategory = 'business' | 'shg' | 'personal' | 'mortgage' | 'gold' | 'other';

export type LoanInterestMethod = 'flat' | 'reducing';

export type LoanRatePolicy = 'fixed' | 'variable';

export type LoanRepaymentFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type LoanPaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'upi' | 'neft' | 'rtgs';

export type LoanApplicationStatus = 'applied' | 'recommended' | 'approved' | 'rejected' | 'disbursed' | 'cancelled';

export type LoanStatus = 'active' | 'overdue' | 'rescheduled' | 'settled' | 'written_off' | 'closed';

export type LoanInstalmentStatus = 'due' | 'paid' | 'partial' | 'missed' | 'overdue' | 'waived';

export type SurplusEntryType = 'held' | 'released' | 'applied';

export type RestructureChangeType = 'reschedule' | 'refinance' | 'extend';

export type AllocationComponent = 'interest' | 'penalty' | 'fees' | 'principal';

export interface LoanProductView {
    id: string;
    code: string;
    name: string;
    category: LoanCategory;
    minAmount: string;
    maxAmount: string;
    minTenureMonths: number;
    maxTenureMonths: number;
    interestMethod: LoanInterestMethod;
    interestRate: string;
    ratePolicy: LoanRatePolicy;
    repaymentFrequency: LoanRepaymentFrequency;
    penaltyConfig: Record<string, unknown>;
    allocationOrder: AllocationComponent[];
    guarantorLimit: number;
    collateralRequired: boolean;
    maxLtvPercent: string;
    allowedPurposes: string[] | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LoanApplicationView {
    id: string;
    applicationNumber: string;
    customerId: string;
    customerName: string;
    customerNumber: string | null;
    productId: string;
    productCode: string;
    productName: string;
    branchId: string | null;
    purpose: string;
    requestedAmount: string;
    approvedAmount: string | null;
    tenureMonths: number;
    repaymentFrequency: LoanRepaymentFrequency;
    proposedInterestRate: string | null;
    finalInterestRate: string | null;
    approvedTenureMonths: number | null;
    status: LoanApplicationStatus;
    appliedOn: string;
    appliedBy: string | null;
    appliedByName: string | null;
    appliedByCode: string | null;
    recommendedBy: string | null;
    recommendedByName: string | null;
    recommendedOn: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    approvedOn: string | null;
    rejectionReason: string | null;
    guarantors: GuarantorInput[];
    collateral: CollateralInput[];
    documents: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface LoanView {
    id: string;
    loanNumber: string;
    applicationNumber: string;
    customerId: string;
    customerName: string;
    customerNumber: string | null;
    productId: string;
    productCode: string;
    productName: string;
    purpose: string;
    documents: Record<string, unknown>;
    branchId: string;
    branchName: string;
    status: LoanStatus;
    approvedAmount: string;
    disbursedAmount: string;
    disbursedOn: string | null;
    disbursedBy: string | null;
    disbursedByName: string | null;
    disbursedByCode: string | null;
    tenureMonths: number;
    repaymentFrequency: LoanRepaymentFrequency;
    interestMethod: LoanInterestMethod;
    interestRate: string;
    flatInterestTotal: string;
    totalPayable: string;
    totalPaid: string;
    outstandingAmount: string;
    nextDueDate: string | null;
    againstFdAccountId: string | null;
    closedOn: string | null;
    closureType: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Lightweight loan reference returned by lifecycle actions. */
export interface LoanRefView {
    id: string;
    loanNumber: string;
    applicationNumber: string;
    customerId: string;
    productId: string;
    amount: string;
    totalPayable: string;
    totalPaid: string;
    status: LoanStatus;
    instalmentCount: number;
    nextDueDate: string | null;
    createdAt: string;
}

export interface LoanInstalmentView {
    id: string;
    instalmentNumber: number;
    dueDate: string;
    expectedAmount: string;
    principalComponent: string;
    interestComponent: string;
    penaltyComponent: string;
    feesComponent: string;
    paidAmount: string;
    status: LoanInstalmentStatus;
    paidOn: string | null;
    allocation: AllocationEvent[] | null;
    createdAt: string;
    updatedAt: string;
}

export interface LoanScheduleChangeView {
    id: string;
    loanId: string;
    changeType: RestructureChangeType;
    oldTerms: Record<string, unknown>;
    newTerms: Record<string, unknown>;
    reason: string;
    approvedBy: string;
    approvedByName: string | null;
    approvedOn: string;
    effectiveFrom: string;
    createdAt: string;
}

/** One payment applied to one instalment, with the component split. */
export interface AllocationEvent {
    paidOn: string;
    amount: string;
    paymentMethod?: LoanPaymentMethod;
    referenceNumber?: string | null;
    sourceCollectionId?: string | null;
    corrected?: boolean;
    components: {
        interest: string;
        penalty: string;
        fees: string;
        principal: string;
    };
}

export interface AllocationEventView {
    instalmentId: string;
    instalmentNumber: number;
    amount: string;
    status: LoanInstalmentStatus;
    components: {
        interest: string;
        penalty: string;
        fees: string;
        principal: string;
    };
}

export interface LoanProductListResult {
    items: LoanProductView[];
    total: number;
}

export interface LoanApplicationListResult {
    items: LoanApplicationView[];
    total: number;
}

export interface LoanListResult {
    items: LoanView[];
    total: number;
}

export interface LoanDetailView {
    loan: LoanView;
    instalments: LoanInstalmentView[];
    instalmentCount: number;
}

export interface LoanScheduleView {
    loan: LoanRefView;
    items: LoanInstalmentView[];
    total: number;
}

export interface RepaymentResult {
    loan: LoanRefView;
    instalments: AllocationEventView[];
    surplusHeld: string | null;
    outstandingAmount: string;
}

export interface CorrectRepaymentResult {
    loan: LoanRefView;
    instalment: LoanInstalmentView;
}

export interface LoanRescheduleResult {
    loan: LoanRefView;
    scheduleChange: LoanScheduleChangeView;
}

export interface LoanSettleResult {
    loan: LoanRefView;
}

export interface LoanWriteOffResult {
    loan: LoanRefView;
    writeOffId: string;
    amount: string;
}

export interface LoanTransferResult {
    loan: LoanRefView;
}

export interface LoanWaiverResult {
    loan: LoanRefView;
    instalment: LoanInstalmentView | null;
    waivedAmount: string;
}

export interface SurplusReleaseResult {
    releasedAmount: string;
    heldBalance: string;
}

export interface LoanStatementEntryView {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorStaffId: string | null;
    actorStaffName: string | null;
    actorStaffCode: string | null;
    actorRole: string | null;
    source: string | null;
    createdAt: string;
    metadata: Record<string, unknown> | null;
}

export interface LoanStatementView {
    loan: LoanRefView;
    items: LoanStatementEntryView[];
    total: number;
}

export type GuarantorInput = {
    customerId?: string;
    name: string;
    relationship?: string;
    identityDocumentType?: string;
    identityDocumentNumber?: string;
    phone?: string;
    address?: string;
};

export type CollateralInput = {
    collateralType: string;
    description?: string;
    valuationAmount: string;
    valuationDate?: string;
    documentReference?: string;
};

export type CreateLoanProductInput = {
    code: string;
    name: string;
    category: LoanCategory;
    minAmount?: string;
    maxAmount?: string;
    minTenureMonths?: number;
    maxTenureMonths?: number;
    interestMethod?: LoanInterestMethod;
    interestRate?: string;
    ratePolicy?: LoanRatePolicy;
    repaymentFrequency?: LoanRepaymentFrequency;
    penaltyConfig?: Record<string, unknown>;
    allocationOrder?: AllocationComponent[];
    guarantorLimit?: number;
    collateralRequired?: boolean;
    maxLtvPercent?: string;
    allowedPurposes?: string[];
};

export type ListLoanProductsQuery = {
    search?: string;
    category?: LoanCategory;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
};

export type CreateLoanApplicationInput = {
    customerId: string;
    productId: string;
    branchId: string;
    purpose: string;
    requestedAmount: string;
    tenureMonths: number;
    repaymentFrequency: LoanRepaymentFrequency;
    proposedInterestRate?: string;
    guarantors?: GuarantorInput[];
    collateral?: CollateralInput[];
    documents?: Record<string, unknown>;
};

export type ListLoanApplicationsQuery = {
    search?: string;
    customerId?: string;
    productId?: string;
    status?: LoanApplicationStatus;
    limit?: number;
    offset?: number;
};

export type ListLoanQuery = {
    search?: string;
    customerId?: string;
    productId?: string;
    status?: LoanStatus;
    limit?: number;
    offset?: number;
};

export type RecommendInput = Record<string, never>;

export type ApproveLoanInput = {
    approvedAmount?: string;
    approvedTenureMonths?: number;
    finalInterestRate?: string;
    rejectionReason?: string;
};

export type DisburseInput = {
    disbursedOn?: string;
};

export type RecordRepaymentInput = {
    amount: string;
    paidOn?: string;
    paymentMethod: LoanPaymentMethod;
    referenceNumber?: string;
    collectionEntryId?: string;
};

export type CorrectRepaymentInput = {
    correctedAmount: string;
    reason: string;
};

export type RescheduleLoanInput = {
    effectiveFrom: string;
    newTenureMonths?: number;
    newInterestRate?: string;
    reason: string;
};

export type SettleLoanInput = {
    settledOn?: string;
    reason?: string;
};

export type WriteOffLoanInput = {
    reason: string;
};

export type TransferLoanInput = {
    toBranchId: string;
    reason: string;
};

export type WaiverInput = {
    instalmentId?: string;
    amount?: string;
    reason: string;
};

export type SurplusReleaseInput = {
    amount?: string;
    reason?: string;
};

export type LoanScheduleQuery = {
    limit?: number;
    offset?: number;
};

export type LoanStatementsQuery = {
    limit?: number;
    offset?: number;
};
