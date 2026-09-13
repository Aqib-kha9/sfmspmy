import { apiClient } from '../../../../lib/api/apiClient';
import type {
    ApproveLoanInput,
    CreateLoanApplicationInput,
    GuarantorInput,
    CollateralInput,
    ListLoanApplicationsQuery,
    ListLoanQuery,
    LoanApplicationListResult,
    LoanApplicationStatus,
    LoanApplicationView,
    LoanCategory,
    LoanDetailView,
    LoanInstalmentStatus,
    LoanInstalmentView,
    LoanInterestMethod as ApiLoanInterestMethod,
    LoanListResult,
    LoanPaymentMethod,
    LoanProductListResult,
    LoanProductView,
    LoanRepaymentFrequency,
    LoanSettleResult,
    LoanWriteOffResult,
    LoanStatementView,
    LoanStatus,
    LoanView,
    RecordRepaymentInput,
    RepaymentResult,
    RescheduleLoanInput,
    SettleLoanInput,
    WriteOffLoanInput,
} from '../../../../lib/api/types';
import { branchId, formatDate, querySuffix } from './helpers';

/**
 * Loans adapter repository.
 *
 * Bridges the backend /api/v1/loans surface (docs/backend-master-spec.md §12)
 * onto the display shapes the AdminPages LoansPage expects. The backend models
 * the lifecycle as two tables — applications (applied / recommended / approved /
 * rejected / disbursed / cancelled) and disbursed loan accounts (active /
 * overdue / rescheduled / settled / written_off / closed) — so `list()` merges
 * both so the page shows the whole pipeline in one grid:
 *
 *  - GET    /loans                        -> disbursed loan accounts
 *  - GET    /loans/applications           -> pipeline applications
 *  - GET    /loans/products               -> product catalogue (category + code)
 *  - POST   /loans/applications           -> open an application
 *  - POST   /loans/applications/:id/recommend
 *  - POST   /loans/applications/:id/approve  (President / M.D.)
 *  - POST   /loans/:id/disburse           (:id is the application uuid)
 *  - GET    /loans/:id                    -> detail + instalment ledger
 *  - GET    /loans/:id/statements         -> audit trail
 *  - POST   /loans/:id/repayments         -> allocation engine
 *  - POST   /loans/:id/reschedule         (President)
 *  - POST   /loans/:id/settle             (President)
 *  - POST   /loans/:id/write-off          (President)
 *
 * Gate notes (routes): reads need `loans.read`; opening an application and
 * recording repayments need `loans.write`; recommendation needs `loans.approve`;
 * approval / reschedule / settle / write-off need the President (or M.D. for
 * approval). Amounts travel as strings; the UI renders them as numbers.
 */

/** Mirrors the AdminPages status union so the wiring step imports from here. */
export type Status = 'Active' | 'Pending' | 'Approved' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Matched';

export type LoanInstallment = {
    id: string;
    dueDate: string;
    paidDate?: string;
    amount: number;
    principal: number;
    interest: number;
    penalty?: number;
    fees?: number;
    paidAmount?: number;
    paidMethod?: string;
    agent: string;
    reference?: string;
    status: 'Paid' | 'Pending' | 'Overdue';
};

export type LoanLifecycle = 'Application' | 'Underwriting' | 'Approved' | 'Disbursed' | 'Active' | 'Overdue' | 'Rescheduled' | 'Settled' | 'Written off' | 'Completed';
export type LoanInterestMethod = 'Flat' | 'Reducing balance' | 'Daily reducing';
export type LoanFrequency = 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly';

export type LoanRecord = {
    /** Backend uuid of the disbursed loan account (repayments / lifecycle). */
    loanId?: string;
    /** Backend uuid of the originating application (approve / disburse). */
    applicationId?: string;
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    loanType: 'Daily Loan' | 'Weekly Loan' | 'Personal Loan' | 'Business Loan' | 'Mortgage Loan' | 'Gold Loan' | 'SHG Loan' | 'Other Loan';
    productCode?: string;
    purpose?: string;
    principal: number;
    processingFee?: number;
    documentationFee?: number;
    insuranceFee?: number;
    otherCharges?: number;
    netDisbursement?: number;
    disbursementMethod?: 'Cash' | 'Bank transfer' | 'Cheque' | 'Mobile money';
    disbursementReference?: string;
    loanDate: string;
    firstDueDate?: string;
    tenureMonths: number;
    repaymentFrequency?: LoanFrequency;
    interestMethod?: LoanInterestMethod;
    interestRate: number;
    gracePeriodDays?: number;
    moratoriumMonths?: number;
    lateFee?: number;
    penalInterestRate?: number;
    installmentAmount: number;
    outstandingAmount: number;
    paidAmount: number;
    pendingAmount: number;
    incomeSource?: string;
    monthlyIncome?: number;
    guarantorName?: string;
    guarantorPhone?: string;
    collateralDescription?: string;
    collateralValue?: number;
    collateralLtv?: number;
    collateralReference?: string;
    approvedBy?: string;
    approvedOn?: string;
    branchName?: string;
    nextDueDate?: string;
    totalPayable?: number;
    flatInterestTotal?: number;
    closedOn?: string;
    closureType?: string;
    status: Status;
    lifecycle: LoanLifecycle;
    installments: LoanInstallment[];
    events: Array<{ id: string; type: string; date: string; actor: string; reference: string; note: string }>;
};

export type LoanInput = Pick<LoanRecord, 'customerId' | 'loanType' | 'principal' | 'loanDate' | 'tenureMonths' | 'interestRate' | 'installmentAmount' | 'status'> & Partial<Pick<LoanRecord, 'productCode' | 'purpose' | 'processingFee' | 'documentationFee' | 'insuranceFee' | 'otherCharges' | 'disbursementMethod' | 'disbursementReference' | 'firstDueDate' | 'repaymentFrequency' | 'interestMethod' | 'gracePeriodDays' | 'moratoriumMonths' | 'lateFee' | 'penalInterestRate' | 'incomeSource' | 'monthlyIncome' | 'guarantorName' | 'guarantorPhone' | 'collateralDescription' | 'collateralValue' | 'collateralLtv' | 'collateralReference'>>;
/**
 * Payload for recording a loan repayment. The backend allocation engine derives
 * the principal / interest / penalty split, so the UI only sends what was
 * actually collected plus how it was collected. `referenceNumber` is mandatory
 * for every method other than cash / mobile money (see backend loans.schemas.ts).
 */
export type LoanRepaymentInput = {
    /** Receipt amount collected against the loan (allocation is computed server-side). */
    amount: number;
    /** Value date of the collection (YYYY-MM-DD). Defaults to today on the backend. */
    paidOn?: string;
    paymentMethod: LoanPaymentMethod;
    /** Mandatory for non-cash / non-mobile-money methods. */
    referenceNumber?: string;
};

export type LoanQuery = {
    search?: string;
    status?: Status;
    loanType?: LoanRecord['loanType'];
    customerId?: string;
    productId?: string;
    limit?: number;
    offset?: number;
};

export interface LoanRepository {
    list(query?: LoanQuery): Promise<LoanRecord[]>;
    detail(id: string): Promise<LoanRecord>;
    /** Product / scheme catalogue used to populate the loan booking form. */
    listProducts(): Promise<LoanProductView[]>;
    create(input: LoanInput): Promise<LoanRecord>;
    /** Records a repayment; the backend computes the principal/interest split. */
    recordRepayment(id: string, input: LoanRepaymentInput): Promise<LoanRecord>;
    approve(applicationId: string, input: ApproveLoanInput): Promise<void>;
    /** Officer recommendation step required before the President/M.D. can approve. */
    recommend(applicationId: string): Promise<void>;
    reject(applicationId: string, reason: string): Promise<void>;
    disburse(applicationId: string): Promise<void>;
    reschedule(loanId: string, input: RescheduleLoanInput): Promise<void>;
    settle(loanId: string, input?: SettleLoanInput): Promise<LoanSettleResult>;
    writeOff(loanId: string, input: WriteOffLoanInput): Promise<LoanWriteOffResult>;
    statement(loanId: string): Promise<LoanRecord['events']>;
}

// ---------------------------------------------------------------------------
// Enum bridges
// ---------------------------------------------------------------------------

/** Backend loan-account status -> display status. */
const LOAN_STATUS_FROM_API: Record<LoanStatus, Status> = {
    active: 'Active',
    overdue: 'Overdue',
    rescheduled: 'Review',
    settled: 'Completed',
    written_off: 'Inactive',
    closed: 'Completed',
};

/** Backend loan-account status -> lifecycle stage. */
const LOAN_LIFECYCLE_FROM_API: Record<LoanStatus, LoanLifecycle> = {
    active: 'Active',
    overdue: 'Overdue',
    rescheduled: 'Rescheduled',
    settled: 'Settled',
    written_off: 'Written off',
    closed: 'Completed',
};

/** Backend application status -> display status. */
const APPLICATION_STATUS_FROM_API: Record<LoanApplicationStatus, Status> = {
    applied: 'Review',
    recommended: 'Review',
    approved: 'Approved',
    rejected: 'Rejected',
    disbursed: 'Active',
    cancelled: 'Inactive',
};

/** Backend application status -> lifecycle stage. */
const APPLICATION_LIFECYCLE_FROM_API: Record<LoanApplicationStatus, LoanLifecycle> = {
    applied: 'Application',
    recommended: 'Underwriting',
    approved: 'Approved',
    rejected: 'Application',
    disbursed: 'Disbursed',
    cancelled: 'Application',
};

/** Display filter status -> backend loan-account status (undefined = unfiltered). */
const LOAN_STATUS_TO_API: Partial<Record<Status, LoanStatus>> = {
    Active: 'active',
    Overdue: 'overdue',
    Completed: 'closed',
    Inactive: 'written_off',
};

const FREQUENCY_FROM_API: Record<LoanRepaymentFrequency, LoanFrequency> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
};

const FREQUENCY_TO_API: Record<LoanFrequency, LoanRepaymentFrequency> = {
    Daily: 'daily',
    Weekly: 'weekly',
    Fortnightly: 'weekly',
    Monthly: 'monthly',
    Quarterly: 'quarterly',
};

const INTEREST_FROM_API: Record<ApiLoanInterestMethod, LoanInterestMethod> = {
    flat: 'Flat',
    reducing: 'Reducing balance',
};

const INSTALMENT_FROM_API: Record<LoanInstalmentStatus, LoanInstallment['status']> = {
    due: 'Pending',
    partial: 'Pending',
    paid: 'Paid',
    waived: 'Paid',
    missed: 'Overdue',
    overdue: 'Overdue',
};

/** Derives the display loan type from product category + repayment frequency. */
function loanTypeOf(frequency: LoanRepaymentFrequency, category: LoanCategory | undefined): LoanRecord['loanType'] {
    if (frequency === 'daily') return 'Daily Loan';
    if (frequency === 'weekly') return 'Weekly Loan';
    switch (category) {
        case 'business':
            return 'Business Loan';
        case 'shg':
            return 'SHG Loan';
        case 'personal':
            return 'Personal Loan';
        case 'mortgage':
            return 'Mortgage Loan';
        case 'gold':
            return 'Gold Loan';
        default:
            return 'Other Loan';
    }
}

/** Humanises an audit action code into a readable lifecycle event label. */
function humaniseAction(action: string): string {
    if (!action) return 'Activity';
    return action
        .replace(/[._]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Reads a human note out of a free-form statement metadata payload. */
function statementNote(metadata: Record<string, unknown> | null): string {
    if (!metadata) return '';
    for (const key of ['reason', 'note', 'comment', 'message', 'description']) {
        const value = metadata[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

/** Reads a string field out of the free-form application documents payload. */
function docString(documents: Record<string, unknown>, key: string): string | undefined {
    const value = documents[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Reads a numeric field out of the free-form application documents payload. */
function docNumber(documents: Record<string, unknown>, key: string): number | undefined {
    const value = documents[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return undefined;
}

function toInstalments(items: LoanInstalmentView[]): LoanInstallment[] {
    return items.map((view) => {
        const allocation = view.allocation?.[view.allocation.length - 1];
        const reference = allocation?.referenceNumber ?? allocation?.sourceCollectionId ?? undefined;
        // The allocation event carries the real settlement method recorded by the
        // backend allocation engine; never invent a counter agent.
        const method = allocation?.paymentMethod ? allocation.paymentMethod.replace(/_/g, ' ') : undefined;
        return {
            id: `LNI-${view.instalmentNumber}`,
            dueDate: formatDate(view.dueDate),
            paidDate: view.paidOn ? formatDate(view.paidOn) : undefined,
            amount: Number(view.expectedAmount),
            principal: Number(view.principalComponent),
            interest: Number(view.interestComponent),
            penalty: Number(view.penaltyComponent) || undefined,
            fees: Number(view.feesComponent) || undefined,
            paidAmount: Number(view.paidAmount),
            paidMethod: method,
            agent: method ?? 'Backend allocation',
            reference,
            status: INSTALMENT_FROM_API[view.status] ?? 'Pending',
        };
    });
}

function toEvents(statement: LoanStatementView | null): LoanRecord['events'] {
    if (!statement) return [];
    return statement.items.map((item) => ({
        id: item.id,
        type: humaniseAction(item.action),
        date: formatDate(item.createdAt),
        actor: item.actorStaffName ?? 'System',
        reference: item.entityId ?? item.entityType,
        note: statementNote(item.metadata),
    }));
}

/** Resolves the product catalogue into id/code lookup maps. */
function productMaps(products: LoanProductView[]): { byId: Map<string, LoanProductView>; byCode: Map<string, LoanProductView> } {
    const byId = new Map<string, LoanProductView>();
    const byCode = new Map<string, LoanProductView>();
    for (const product of products) {
        byId.set(product.id, product);
        byCode.set(product.code.toLowerCase(), product);
    }
    return { byId, byCode };
}

/**
 * Maps a backend disbursed loan onto the display record. Every monetary and
 * underwriting field is sourced from the backend `loan` row or the originating
 * application `documents` payload surfaced by the loans API.
 */
function loanToRecord(view: LoanView, products: Map<string, LoanProductView>, instalments: LoanInstallment[] = [], events: LoanRecord['events'] = []): LoanRecord {
    const product = products.get(view.productId);
    const principal = Number(view.approvedAmount);
    const disbursed = Number(view.disbursedAmount);
    const totalPayable = Number(view.totalPayable);
    const documents = view.documents ?? {};
    const firstInstalment = instalments[0];
    const fallbackInstalment = view.tenureMonths > 0 ? Math.round((totalPayable / view.tenureMonths) * 100) / 100 : totalPayable;
    const guarantors = Array.isArray(documents['guarantors']) ? (documents['guarantors'] as GuarantorInput[]) : [];
    const collateral = Array.isArray(documents['collateral']) ? (documents['collateral'] as CollateralInput[]) : [];
    const primaryGuarantor = guarantors[0];
    const primaryCollateral = collateral[0];
    return {
        loanId: view.id,
        id: view.loanNumber,
        customerId: view.customerNumber ?? view.customerId,
        customerName: view.customerName,
        customerPhone: view.customerNumber ?? 'Not available',
        loanType: loanTypeOf(view.repaymentFrequency, product?.category),
        productCode: view.productCode,
        purpose: view.purpose || undefined,
        branchName: view.branchName,
        principal,
        processingFee: docNumber(documents, 'processingFee'),
        documentationFee: docNumber(documents, 'documentationFee'),
        insuranceFee: docNumber(documents, 'insuranceFee'),
        otherCharges: docNumber(documents, 'otherCharges'),
        netDisbursement: disbursed || principal,
        disbursementMethod: (docString(documents, 'disbursementMethod') as LoanRecord['disbursementMethod']) ?? undefined,
        disbursementReference: docString(documents, 'disbursementReference'),
        loanDate: view.disbursedOn ?? view.createdAt,
        firstDueDate: firstInstalment?.dueDate ?? docString(documents, 'firstDueDate') ?? view.nextDueDate ?? undefined,
        nextDueDate: view.nextDueDate ?? undefined,
        totalPayable,
        flatInterestTotal: Number(view.flatInterestTotal),
        closedOn: view.closedOn ? formatDate(view.closedOn) : undefined,
        closureType: view.closureType ?? undefined,
        tenureMonths: view.tenureMonths,
        repaymentFrequency: FREQUENCY_FROM_API[view.repaymentFrequency],
        interestMethod: INTEREST_FROM_API[view.interestMethod],
        interestRate: Number(view.interestRate),
        gracePeriodDays: docNumber(documents, 'gracePeriodDays'),
        moratoriumMonths: docNumber(documents, 'moratoriumMonths'),
        lateFee: docNumber(documents, 'lateFee'),
        penalInterestRate: docNumber(documents, 'penalInterestRate'),
        installmentAmount: firstInstalment?.amount ?? fallbackInstalment,
        outstandingAmount: Number(view.outstandingAmount),
        paidAmount: Number(view.totalPaid),
        pendingAmount: Number(view.outstandingAmount),
        incomeSource: docString(documents, 'incomeSource'),
        monthlyIncome: docNumber(documents, 'monthlyIncome'),
        guarantorName: primaryGuarantor?.name,
        guarantorPhone: primaryGuarantor?.phone ?? undefined,
        collateralDescription: primaryCollateral?.description ?? primaryCollateral?.collateralType,
        collateralValue: primaryCollateral ? Number(primaryCollateral.valuationAmount) : undefined,
        collateralLtv: docNumber(documents, 'collateralLtv'),
        collateralReference: primaryCollateral?.documentReference ?? undefined,
        approvedBy: view.disbursedByName ?? undefined,
        approvedOn: view.disbursedOn ? formatDate(view.disbursedOn) : undefined,
        status: LOAN_STATUS_FROM_API[view.status] ?? 'Active',
        lifecycle: LOAN_LIFECYCLE_FROM_API[view.status] ?? 'Active',
        installments: instalments,
        events,
    };
}

/** Maps a backend application onto the display record (pipeline rows). */
function applicationToRecord(view: LoanApplicationView, products: Map<string, LoanProductView>): LoanRecord {
    const product = products.get(view.productId);
    const amount = Number(view.approvedAmount ?? view.requestedAmount);
    const rate = Number(view.finalInterestRate ?? view.proposedInterestRate ?? 0);
    const tenure = view.approvedTenureMonths ?? view.tenureMonths;
    const documents = view.documents ?? {};
    const primaryGuarantor = view.guarantors[0];
    const primaryCollateral = view.collateral[0];
    return {
        applicationId: view.id,
        id: view.applicationNumber,
        customerId: view.customerNumber ?? view.customerId,
        customerName: view.customerName,
        customerPhone: view.customerNumber ?? 'Not available',
        loanType: loanTypeOf(view.repaymentFrequency, product?.category),
        productCode: view.productCode,
        purpose: view.purpose,
        principal: amount,
        processingFee: docNumber(documents, 'processingFee'),
        documentationFee: docNumber(documents, 'documentationFee'),
        insuranceFee: docNumber(documents, 'insuranceFee'),
        otherCharges: docNumber(documents, 'otherCharges'),
        netDisbursement: amount,
        disbursementMethod: (docString(documents, 'disbursementMethod') as LoanRecord['disbursementMethod']) ?? undefined,
        disbursementReference: docString(documents, 'disbursementReference'),
        loanDate: view.appliedOn,
        firstDueDate: docString(documents, 'firstDueDate'),
        nextDueDate: docString(documents, 'firstDueDate'),
        tenureMonths: tenure,
        repaymentFrequency: FREQUENCY_FROM_API[view.repaymentFrequency],
        interestMethod: product?.interestMethod ? INTEREST_FROM_API[product.interestMethod] : 'Reducing balance',
        interestRate: rate,
        gracePeriodDays: docNumber(documents, 'gracePeriodDays'),
        moratoriumMonths: docNumber(documents, 'moratoriumMonths'),
        lateFee: docNumber(documents, 'lateFee'),
        penalInterestRate: docNumber(documents, 'penalInterestRate'),
        installmentAmount: tenure > 0 ? Math.round((amount / tenure) * 100) / 100 : amount,
        outstandingAmount: amount,
        paidAmount: 0,
        pendingAmount: amount,
        incomeSource: docString(documents, 'incomeSource'),
        monthlyIncome: docNumber(documents, 'monthlyIncome'),
        guarantorName: primaryGuarantor?.name,
        guarantorPhone: primaryGuarantor?.phone ?? undefined,
        collateralDescription: primaryCollateral?.description ?? primaryCollateral?.collateralType,
        collateralValue: primaryCollateral ? Number(primaryCollateral.valuationAmount) : undefined,
        collateralLtv: docNumber(documents, 'collateralLtv'),
        collateralReference: primaryCollateral?.documentReference ?? undefined,
        approvedBy: view.approvedByName ?? undefined,
        approvedOn: view.approvedOn ? formatDate(view.approvedOn) : undefined,
        status: APPLICATION_STATUS_FROM_API[view.status] ?? 'Review',
        lifecycle: APPLICATION_LIFECYCLE_FROM_API[view.status] ?? 'Application',
        installments: [],
        events: [],
    };
}

export class ApiLoanRepository implements LoanRepository {
    /** Fetch the product catalogue for category/code resolution (best effort). */
    private async products(): Promise<LoanProductView[]> {
        try {
            const result = await apiClient.request<LoanProductListResult>(`/loans/products${querySuffix({ includeInactive: true, limit: 100 })}`);
            return result.items;
        } catch {
            return [];
        }
    }

    async list(query: LoanQuery = {}): Promise<LoanRecord[]> {
        const status = query.status ? LOAN_STATUS_TO_API[query.status] : undefined;
        const [loanResult, applicationResult, products] = await Promise.all([
            apiClient.request<LoanListResult>(
                `/loans${querySuffix({
                    search: query.search,
                    customerId: query.customerId,
                    productId: query.productId,
                    status,
                    limit: query.limit ?? 100,
                    offset: query.offset ?? 0,
                })}`,
            ),
            apiClient.request<LoanApplicationListResult>(
                `/loans/applications${querySuffix({
                    search: query.search,
                    customerId: query.customerId,
                    productId: query.productId,
                    limit: query.limit ?? 100,
                    offset: query.offset ?? 0,
                })}`,
            ),
            this.products(),
        ]);
        const { byId } = productMaps(products);
        const loans = loanResult.items.map((view) => loanToRecord(view, byId));
        // Applications that have not yet become loan accounts feed the pipeline;
        // disbursed applications already appear as loans, so they are skipped.
        const applications = applicationResult.items
            .filter((view) => view.status !== 'disbursed')
            .map((view) => applicationToRecord(view, byId));
        const rows = [...loans, ...applications];
        return rows.filter((row) => this.matches(row, query));
    }

    async detail(id: string): Promise<LoanRecord> {
        const [detail, products] = await Promise.all([
            apiClient.request<LoanDetailView>(`/loans/${id}`),
            this.products(),
        ]);
        const { byId } = productMaps(products);
        let statement: LoanStatementView | null = null;
        try {
            statement = await apiClient.request<LoanStatementView>(`/loans/${id}/statements${querySuffix({ limit: 100 })}`);
        } catch {
            statement = null;
        }
        const instalments = toInstalments(detail.instalments);
        return loanToRecord(detail.loan, byId, instalments, toEvents(statement));
    }

    /**
     * Exposes the active loan product catalogue so the booking form can offer a
     * scheme dropdown instead of a free-form product code the backend would
     * reject. Mirrors `fdRepository.listRateCards()`.
     */
    async listProducts(): Promise<LoanProductView[]> {
        return this.products();
    }

    async create(input: LoanInput): Promise<LoanRecord> {
        const products = await this.products();
        const { byCode } = productMaps(products);
        const requestedCode = input.productCode?.trim().toLowerCase();
        const product = requestedCode ? byCode.get(requestedCode) : undefined;
        const matched = product ?? products.find((candidate) => candidate.isActive) ?? products[0];
        if (!matched) {
            throw new Error('No loan product is configured. Ask the Managing Director to define a scheme before opening an application.');
        }
        const customerId = await this.resolveCustomerId(input.customerId);
        const guarantors: GuarantorInput[] = input.guarantorName?.trim()
            ? [{ name: input.guarantorName.trim(), phone: input.guarantorPhone?.trim() || undefined }]
            : [];
        const collateral: CollateralInput[] = input.collateralDescription?.trim()
            ? [{
                collateralType: input.loanType === 'Gold Loan' ? 'Gold' : 'Asset',
                description: input.collateralDescription.trim(),
                valuationAmount: String(input.collateralValue ?? 0),
                documentReference: input.collateralReference?.trim() || undefined,
            }]
            : [];
        // Charges, repayment controls and disbursement evidence are not columns on
        // the application table, so they travel inside the free-form `documents`
        // payload. This keeps the operator's underwriting worksheet with the
        // application without widening the accepted request schema.
        const documents: Record<string, unknown> = {
            processingFee: input.processingFee ?? 0,
            documentationFee: input.documentationFee ?? 0,
            insuranceFee: input.insuranceFee ?? 0,
            otherCharges: input.otherCharges ?? 0,
            disbursementMethod: input.disbursementMethod,
            disbursementReference: input.disbursementReference,
            firstDueDate: input.firstDueDate,
            interestMethod: input.interestMethod,
            gracePeriodDays: input.gracePeriodDays,
            moratoriumMonths: input.moratoriumMonths,
            lateFee: input.lateFee,
            penalInterestRate: input.penalInterestRate,
            incomeSource: input.incomeSource,
            monthlyIncome: input.monthlyIncome,
            collateralLtv: input.collateralLtv,
            initialLifecycleStatus: input.status,
        };
        const payload: CreateLoanApplicationInput = {
            customerId,
            productId: matched.id,
            branchId: branchId(),
            purpose: input.purpose?.trim() || input.loanType,
            requestedAmount: String(input.principal),
            tenureMonths: input.tenureMonths,
            repaymentFrequency: FREQUENCY_TO_API[input.repaymentFrequency ?? 'Monthly'],
            proposedInterestRate: String(input.interestRate),
            ...(guarantors.length > 0 ? { guarantors } : {}),
            ...(collateral.length > 0 ? { collateral } : {}),
            documents,
        };
        const view = await apiClient.request<LoanApplicationView>('/loans/applications', { method: 'POST', body: payload });
        return applicationToRecord(view, new Map([[matched.id, matched]]));
    }

    async recordRepayment(id: string, input: LoanRepaymentInput): Promise<LoanRecord> {
        // Only the fields the backend allocation engine accepts travel on the wire.
        // The principal / interest / penalty split is derived server-side from the
        // amount + the outstanding instalment ledger, so it is never sent from here.
        const payload: RecordRepaymentInput = {
            amount: String(input.amount),
            paymentMethod: input.paymentMethod,
        };
        if (input.paidOn) payload.paidOn = input.paidOn;
        const reference = input.referenceNumber?.trim();
        if (reference) payload.referenceNumber = reference;
        await apiClient.request<RepaymentResult>(`/loans/${id}/repayments`, { method: 'POST', body: payload });
        // RepaymentResult only returns the loan reference (no full ledger); refresh
        // the authoritative detail so the grid and allocation ledger reflect the
        // engine outcome.
        try {
            return await this.detail(id);
        } catch {
            throw new Error('Repayment recorded, but the refreshed loan detail could not be loaded.');
        }
    }

    async approve(applicationId: string, input: ApproveLoanInput): Promise<void> {
        await apiClient.request(`/loans/applications/${applicationId}/approve`, { method: 'POST', body: input });
    }

    async recommend(applicationId: string): Promise<void> {
        await apiClient.request(`/loans/applications/${applicationId}/recommend`, { method: 'POST', body: {} });
    }

    async reject(applicationId: string, reason: string): Promise<void> {
        const payload: ApproveLoanInput = { rejectionReason: reason };
        await apiClient.request(`/loans/applications/${applicationId}/approve`, { method: 'POST', body: payload });
    }

    async disburse(applicationId: string): Promise<void> {
        await apiClient.request(`/loans/${applicationId}/disburse`, { method: 'POST', body: {} });
    }

    async reschedule(loanId: string, input: RescheduleLoanInput): Promise<void> {
        await apiClient.request(`/loans/${loanId}/reschedule`, { method: 'POST', body: input });
    }

    async settle(loanId: string, input: SettleLoanInput = {}): Promise<LoanSettleResult> {
        return apiClient.request<LoanSettleResult>(`/loans/${loanId}/settle`, { method: 'POST', body: input });
    }

    async writeOff(loanId: string, input: WriteOffLoanInput): Promise<LoanWriteOffResult> {
        return apiClient.request<LoanWriteOffResult>(`/loans/${loanId}/write-off`, { method: 'POST', body: input });
    }

    async statement(loanId: string): Promise<LoanRecord['events']> {
        const statement = await apiClient.request<LoanStatementView>(`/loans/${loanId}/statements${querySuffix({ limit: 100 })}`);
        return toEvents(statement);
    }

    /** Resolves a display customer number (or uuid) to the raw customer uuid. */
    private async resolveCustomerId(displayId: string): Promise<string> {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(displayId)) return displayId;
        const result = await apiClient.request<{ items: Array<{ id: string }> }>(`/customers${querySuffix({ search: displayId, limit: 1 })}`);
        const match = result.items[0];
        if (!match) throw new Error('Customer record was not found.');
        return match.id;
    }

    private matches(row: LoanRecord, query: LoanQuery): boolean {
        if (query.loanType && (query.loanType as string) !== 'All' && row.loanType !== query.loanType) return false;
        if (query.status) {
            if (query.status !== 'Review' && row.status !== query.status) return false;
            if (query.status === 'Review' && row.status !== 'Review') return false;
        }
        if (query.search) {
            const needle = query.search.toLowerCase();
            const haystack = `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.loanType} ${row.lifecycle} ${row.productCode ?? ''} ${row.purpose ?? ''}`.toLowerCase();
            if (!haystack.includes(needle)) return false;
        }
        return true;
    }
}

export const loansRepository: LoanRepository = new ApiLoanRepository();

// Keep the interface import contract explicit for the wiring step.
export type { LoanApplicationStatus, ListLoanApplicationsQuery, ListLoanQuery, LoanProductView };
