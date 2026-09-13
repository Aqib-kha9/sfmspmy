import { apiClient } from '../../../../lib/api/apiClient';
import { branchId, formatDate, querySuffix } from './helpers';

/**
 * Recurring deposits adapter (spec §10).
 *
 * Bridges the backend `/api/v1/rd` contract onto the AdminPages `RDRecord` /
 * `RDInstallment` shapes. The backend exposes the account UUID plus a human
 * account number; the UI keys off the account number, so this adapter keeps an
 * internal id map and resolves the UUID transparently for mutations.
 *
 * Authority: browsing schemes/accounts/schedule needs deposits.read; opening an
 * account / closing early / surplus transfer needs managing_director; recording
 * instalments needs deposits.write; penalty waiver + reschedule need president;
 * approvals need president or managing_director.
 */

export type Status =
    | 'Active'
    | 'Pending'
    | 'Approved'
    | 'Completed'
    | 'Review'
    | 'Overdue'
    | 'Inactive'
    | 'Rejected'
    | 'Matched';

export type RDFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

export type RDInstallment = {
    id: string;
    dueDate: string;
    paidDate?: string;
    amount: number;
    agent: string;
    reference?: string;
    status: 'Paid' | 'Pending' | 'Overdue';
    paymentMethod?: string;
    externalReference?: string;
    receiptStatus?: string;
    location?: string;
    deviceReference?: string;
    offlineSyncReference?: string;
    supportingDocuments?: string;
    acknowledgmentReference?: string;
    recordedBy?: string;
};

export type RDRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    monthlyAmount: number;
    frequency: RDFrequency;
    installmentDueDate: string;
    openedOn: string;
    maturityDate: string;
    status: Status;
    installments: RDInstallment[];
    productCode?: string;
    branch?: string;
    tenureMonths?: number;
    installmentCount?: number;
    gracePeriodDays?: number;
    penaltyTerms?: string;
    interestMethod?: string;
    interestRate?: number;
    maturityInstructions?: string;
    nomineeName?: string;
    nomineePhone?: string;
    nomineeRelation?: string;
    autoDebitInstruction?: string;
    openingChannel?: string;
    assignedRoute?: string;
    assignedAgent?: string;
    documentReferences?: string;
    consentReference?: string;
};

export type RDInput = Pick<
    RDRecord,
    'customerId' | 'monthlyAmount' | 'frequency' | 'installmentDueDate' | 'openedOn' | 'maturityDate' | 'status'
> &
    Partial<
        Omit<
            RDRecord,
            | 'id'
            | 'customerId'
            | 'customerName'
            | 'customerPhone'
            | 'monthlyAmount'
            | 'frequency'
            | 'installmentDueDate'
            | 'openedOn'
            | 'maturityDate'
            | 'status'
            | 'installments'
        >
    >;

export type RDCollectionInput = Pick<RDInstallment, 'amount' | 'dueDate' | 'agent'> & { reference: string } &
    Partial<Omit<RDInstallment, 'id' | 'amount' | 'dueDate' | 'agent' | 'reference' | 'status' | 'paidDate'>>;

export type RdQuery = {
    search?: string;
    status?: Status;
    customerId?: string;
    limit?: number;
    offset?: number;
};

export type RdRescheduleInput = {
    changeType: 'due_date_change' | 'instalment_amount_change' | 'both';
    effectiveFrom: string;
    newInstalmentAmount?: number;
    reason: string;
};

export interface RdRepository {
    list(query?: RdQuery): Promise<RDRecord[]>;
    detail(id: string): Promise<RDRecord>;
    open(input: RDInput): Promise<RDRecord>;
    recordInstalment(id: string, input: RDCollectionInput): Promise<RDRecord>;
    schedule(id: string): Promise<ScheduleView>;
    listSchemes(search?: string): Promise<SchemeView[]>;
    approve(id: string, note?: string): Promise<RDRecord>;
    waivePenalty(id: string, penaltyId: string, reason: string, amount?: number): Promise<RDRecord>;
    reschedule(id: string, input: RdRescheduleInput): Promise<RDRecord>;
    closeEarly(id: string, reason: string): Promise<RDRecord>;
    surplusTransfer(id: string, loanId: string, amount: number, reason?: string): Promise<RDRecord>;
}

// ---------------------------------------------------------------------------
// Backend view contracts (snake→camel already applied by the service layer)
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

export type RdInstalmentStatus = 'due' | 'paid' | 'partial' | 'missed' | 'overdue' | 'waived';

export type RdPenaltyStatus = 'due' | 'paid' | 'waived';

export type RdScheduleChangeType = 'due_date_change' | 'instalment_amount_change' | 'both';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'upi' | 'neft' | 'rtgs';

export type SchemeView = {
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
};

export type RdAccountView = {
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
};

export type InstalmentView = {
    id: string;
    instalmentNumber: number;
    dueDate: string | null;
    expectedAmount: string;
    paidAmount: string;
    status: RdInstalmentStatus;
    paidOn: string | null;
    paymentMethod: PaymentMethod | null;
    referenceNumber: string | null;
    collectionEntryId: string | null;
    allocation: unknown[] | null;
    createdAt: string;
    updatedAt: string;
};

export type PenaltyView = {
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
};

export type WaiverView = {
    id: string;
    rdAccountId: string;
    penaltyId: string | null;
    amount: string;
    reason: string;
    approvedBy: string;
    approvedByName: string | null;
    createdAt: string;
};

export type ScheduleChangeView = {
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
};

export type ScheduleView = {
    account: RdAccountView;
    status?: string;
    from?: string;
    to?: string;
    total: number;
    items: InstalmentView[];
    penalties: PenaltyView[];
};

export type InstalmentPaymentResult = {
    account: RdAccountView;
    appliedTo: InstalmentView[];
};

export type WaiverResult = {
    account: RdAccountView;
    waiver: WaiverView;
};

export type RescheduleResult = {
    account: RdAccountView;
    change: ScheduleChangeView;
};

export type CloseEarlyResult = {
    account: RdAccountView;
    closureFee: string;
};

export type SurplusTransferResult = {
    account: RdAccountView;
    held: {
        loanId: string;
        amount: string;
        entryType: 'held';
    };
};

type SchemeListResult = { total: number; items: SchemeView[] };
type RdAccountListResult = { total: number; items: RdAccountView[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Bridges
// ---------------------------------------------------------------------------

function toNumber(value: string | null | undefined): number {
    if (!value) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function statusOf(value: RdAccountStatus): Status {
    switch (value) {
        case 'active':
            return 'Active';
        case 'overdue':
            return 'Overdue';
        case 'completed':
        case 'matured':
            return 'Completed';
        case 'closed_early':
        case 'cancelled':
            return 'Inactive';
        case 'suspended':
            return 'Review';
        default:
            return 'Pending';
    }
}

function instalmentStatusOf(value: RdInstalmentStatus): RDInstallment['status'] {
    switch (value) {
        case 'paid':
        case 'partial':
            return 'Paid';
        case 'missed':
        case 'overdue':
            return 'Overdue';
        default:
            return 'Pending';
    }
}

function frequencyLabel(value: RdFrequency): RDFrequency {
    switch (value) {
        case 'daily':
            return 'Daily';
        case 'weekly':
            return 'Weekly';
        case 'quarterly':
            return 'Quarterly';
        default:
            return 'Monthly';
    }
}

function paymentMethodLabel(value: PaymentMethod | null): string | undefined {
    if (!value) return undefined;
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Derives the first instalment due date from the opening date and due day. */
function firstDueDateOf(openedOn: string, dueDay: string): string {
    const day = Number.parseInt(dueDay, 10);
    const safe = Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
    const base = openedOn ? new Date(`${openedOn}T00:00:00`) : new Date();
    if (Number.isNaN(base.getTime())) return formatYmd(new Date());
    const candidate = new Date(base.getFullYear(), base.getMonth(), safe);
    if (candidate <= base) candidate.setMonth(candidate.getMonth() + 1);
    return formatYmd(candidate);
}

function monthsBetween(from: string, to: string | null): number | undefined {
    if (!from || !to) return undefined;
    const start = new Date(`${from.slice(0, 10)}T00:00:00`);
    const end = new Date(`${to.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function toInstallment(view: InstalmentView): RDInstallment {
    return {
        id: view.id,
        dueDate: formatDate(view.dueDate),
        paidDate: view.paidOn ? formatDate(view.paidOn) : undefined,
        amount: toNumber(view.expectedAmount),
        agent: 'Branch counter',
        reference: view.referenceNumber ?? undefined,
        status: instalmentStatusOf(view.status),
        paymentMethod: paymentMethodLabel(view.paymentMethod),
        externalReference: view.referenceNumber ?? undefined,
    };
}

function toRecord(view: RdAccountView, installments: RDInstallment[], scheme?: SchemeView): RDRecord {
    const firstDue = view.firstDueDate ? Number.parseInt(view.firstDueDate.slice(8, 10), 10) : NaN;
    return {
        id: view.accountNumber,
        customerId: view.customerId,
        customerName: view.customerName,
        customerPhone: view.customerNumber ?? 'Not available',
        monthlyAmount: toNumber(view.instalmentAmount),
        frequency: frequencyLabel(view.frequency),
        installmentDueDate: Number.isFinite(firstDue) ? String(firstDue) : '01',
        openedOn: formatDate(view.startDate ?? view.createdAt),
        maturityDate: formatDate(view.maturityDate),
        status: statusOf(view.status),
        installments,
        productCode: view.schemeCode,
        branch: view.branchName ?? undefined,
        tenureMonths: monthsBetween(view.startDate ?? view.createdAt, view.maturityDate),
        installmentCount: installments.length > 0 ? installments.length : undefined,
        interestMethod: scheme ? 'Scheme rate' : undefined,
        interestRate: scheme ? toNumber(scheme.interestRate) : undefined,
        openingChannel: 'Branch counter',
    };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiRdRepository implements RdRepository {
    /** display id / uuid → uuid */
    private readonly ids = new Map<string, string>();
    private readonly schemes = new Map<string, SchemeView>();

    private remember(view: RdAccountView): void {
        this.ids.set(view.id, view.id);
        this.ids.set(view.accountNumber, view.id);
    }

    private async uuidOf(id: string): Promise<string> {
        const cached = this.ids.get(id);
        if (cached) return cached;
        if (UUID_RE.test(id)) {
            this.ids.set(id, id);
            return id;
        }
        await this.list({ limit: 100 });
        const resolved = this.ids.get(id);
        if (resolved) return resolved;
        throw new Error(`Unknown recurring deposit account ${id}`);
    }

    private async schemeOf(schemeId: string): Promise<SchemeView | undefined> {
        const cached = this.schemes.get(schemeId);
        if (cached) return cached;
        try {
            const result = await apiClient.request<SchemeListResult>('/rd/schemes?limit=100', { method: 'GET' });
            result.items.forEach((scheme) => this.schemes.set(scheme.id, scheme));
            return this.schemes.get(schemeId);
        } catch {
            return undefined;
        }
    }

    private async scheduleOf(uuid: string): Promise<RDInstallment[]> {
        const result = await apiClient.request<ScheduleView>(`/rd/accounts/${uuid}/schedule?limit=500`, {
            method: 'GET',
        });
        return result.items.map(toInstallment);
    }

    async listSchemes(search?: string): Promise<SchemeView[]> {
        const suffix = querySuffix({ search, limit: 100 });
        const result = await apiClient.request<SchemeListResult>(`/rd/schemes${suffix}`, { method: 'GET' });
        result.items.forEach((scheme) => this.schemes.set(scheme.id, scheme));
        return result.items;
    }

    async list(query: RdQuery = {}): Promise<RDRecord[]> {
        const suffix = querySuffix({
            search: query.search,
            customerId: query.customerId,
            limit: query.limit ?? 50,
            offset: query.offset ?? 0,
        });
        const result = await apiClient.request<RdAccountListResult>(`/rd/accounts${suffix}`, { method: 'GET' });
        result.items.forEach((view) => this.remember(view));
        const records = await Promise.all(
            result.items.map(async (view) => toRecord(view, await this.scheduleOf(view.id))),
        );
        return query.status ? records.filter((row) => row.status === query.status) : records;
    }
async detail(id: string): Promise<RDRecord> {
    const uuid = await this.uuidOf(id);
    const view = await apiClient.request<RdAccountView>(`/rd/accounts/${uuid}`, { method: 'GET' });
    this.remember(view);
    const [installments, scheme] = await Promise.all([this.scheduleOf(uuid), this.schemeOf(view.schemeId)]);
    return toRecord(view, installments, scheme);
}

async schedule(id: string): Promise<ScheduleView> {
    const uuid = await this.uuidOf(id);
    return apiClient.request<ScheduleView>(`/rd/accounts/${uuid}/schedule?limit=500`, { method: 'GET' });
}

private async resolveSchemeId(code: string | undefined, frequency: RDFrequency): Promise<string> {
    const result = await apiClient.request<SchemeListResult>('/rd/schemes?limit=100', { method: 'GET' });
    result.items.forEach((scheme) => this.schemes.set(scheme.id, scheme));
    const needle = (code ?? '').trim().toLowerCase();
    const byCode = needle ? result.items.find((scheme) => scheme.code.toLowerCase() === needle) : undefined;
    if (byCode) return byCode.id;
    const hint: RdFrequency = frequency === 'Daily' ? 'daily' : frequency === 'Weekly' ? 'weekly' : frequency === 'Quarterly' ? 'quarterly' : 'monthly';
    const byHint = result.items.find((scheme) => scheme.frequency === hint);
    const fallback = byHint ?? result.items.find((scheme) => scheme.isActive) ?? result.items[0];
    if (!fallback) throw new Error('No recurring deposit scheme is configured for this branch.');
    return fallback.id;
}

async open(input: RDInput): Promise<RDRecord> {
    const schemeId = await this.resolveSchemeId(input.productCode, input.frequency);
    const dueDay = input.installmentDueDate || '01';
    const firstDueDate = firstDueDateOf(input.openedOn, dueDay);
    const body: Record<string, unknown> = {
        customerId: input.customerId,
        schemeId,
        branchId: branchId(),
        instalmentAmount: input.monthlyAmount.toFixed(2),
        frequency:
            input.frequency === 'Daily' ? 'daily' : input.frequency === 'Weekly' ? 'weekly' : input.frequency === 'Quarterly' ? 'quarterly' : 'monthly',
        startDate: input.openedOn,
        firstDueDate,
        maturityDate: input.maturityDate,
        paymentMethod: 'cash',
    };
    if (input.tenureMonths !== undefined) body.durationMonths = input.tenureMonths;
    const view = await apiClient.request<RdAccountView>('/rd/accounts', { method: 'POST', body });
    this.remember(view);
    const [installments, scheme] = await Promise.all([this.scheduleOf(view.id), this.schemeOf(view.schemeId)]);
    return toRecord(view, installments, scheme);
}

async recordInstalment(id: string, input: RDCollectionInput): Promise<RDRecord> {
    const uuid = await this.uuidOf(id);
    const body: Record<string, unknown> = {
        amount: input.amount.toFixed(2),
        paymentMethod: 'cash',
    };
    if (input.reference) body.referenceNumber = input.reference;
    await apiClient.request<InstalmentPaymentResult>(`/rd/accounts/${uuid}/instalments`, {
        method: 'POST',
        body,
    });
    return this.detail(uuid);
}

async approve(id: string, note?: string): Promise<RDRecord> {
    const uuid = await this.uuidOf(id);
    const body = note ? { note } : {};
    const view = await apiClient.request<RdAccountView>(`/rd/accounts/${uuid}/approvals`, {
        method: 'POST',
        body,
    });
    this.remember(view);
    const [installments, scheme] = await Promise.all([this.scheduleOf(uuid), this.schemeOf(view.schemeId)]);
    return toRecord(view, installments, scheme);
}

async waivePenalty(id: string, penaltyId: string, reason: string, amount?: number): Promise<RDRecord> {
    const uuid = await this.uuidOf(id);
    const body: Record<string, unknown> = { penaltyId, reason };
    if (amount !== undefined) body.amount = amount.toFixed(2);
    const result = await apiClient.request<WaiverResult>(`/rd/accounts/${uuid}/penalty-waiver`, {
        method: 'POST',
        body,
    });
    this.remember(result.account);
    const [installments, scheme] = await Promise.all([
        this.scheduleOf(result.account.id),
        this.schemeOf(result.account.schemeId),
    ]);
    return toRecord(result.account, installments, scheme);
}

async reschedule(id: string, input: RdRescheduleInput): Promise<RDRecord> {
    const uuid = await this.uuidOf(id);
    const body: Record<string, unknown> = {
        changeType: input.changeType,
        effectiveFrom: input.effectiveFrom,
        reason: input.reason,
    };
    if (input.newInstalmentAmount !== undefined) body.newInstalmentAmount = input.newInstalmentAmount.toFixed(2);
    const result = await apiClient.request<RescheduleResult>(`/rd/accounts/${uuid}/reschedule`, {
        method: 'POST',
        body,
    });
    this.remember(result.account);
    const [installments, scheme] = await Promise.all([
        this.scheduleOf(result.account.id),
        this.schemeOf(result.account.schemeId),
    ]);
    return toRecord(result.account, installments, scheme);
}

async closeEarly(id: string, reason: string): Promise<RDRecord> {
    const uuid = await this.uuidOf(id);
    const result = await apiClient.request<CloseEarlyResult>(`/rd/accounts/${uuid}/close-early`, {
        method: 'POST',
        body: { reason, paymentMethod: 'cash' },
    });
    this.remember(result.account);
    const [installments, scheme] = await Promise.all([
        this.scheduleOf(result.account.id),
        this.schemeOf(result.account.schemeId),
    ]);
    return toRecord(result.account, installments, scheme);
}

async surplusTransfer(id: string, loanId: string, amount: number, reason?: string): Promise<RDRecord> {
    const uuid = await this.uuidOf(id);
    const body: Record<string, unknown> = { loanId, amount: amount.toFixed(2) };
    if (reason) body.reason = reason;
    const result = await apiClient.request<SurplusTransferResult>(`/rd/accounts/${uuid}/surplus-transfer`, {
        method: 'POST',
        body,
    });
    this.remember(result.account);
    const [installments, scheme] = await Promise.all([
        this.scheduleOf(result.account.id),
        this.schemeOf(result.account.schemeId),
    ]);
    return toRecord(result.account, installments, scheme);
}
}

export const rdRepository: RdRepository = new ApiRdRepository();

