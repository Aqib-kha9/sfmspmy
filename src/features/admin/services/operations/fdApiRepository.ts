import { apiClient } from '../../../../lib/api/apiClient';
import { customerRepository } from '../../../customers/services/customerApiRepository';
import type { Customer } from '../../../customers/types/customer.types';
import { branchId, formatDate, querySuffix } from './helpers';

/**
 * Fixed deposits adapter (spec §11).
 *
 * Bridges the backend `/api/v1/fd` contract onto the AdminPages `FDRecord` /
 * `FDEvent` shapes. The backend exposes the account UUID plus a human account
 * number; the UI keys off the account number, so this adapter keeps an internal
 * id map and resolves the UUID transparently for mutations.
 *
 * Authority: browsing rate cards / accounts / history needs deposits.read;
 * every FD mutation (define rate card, open, lien, close early, maturity
 * action, loan against FD) needs managing_director.
 *
 * Money & time rules enforced by the backend: deposit ₹1,000 – ₹1,00,000 and
 * inside the rate card's amount band with an exact tenure match; simple
 * interest = deposit × rate/100 × tenureMonths/12; loan against FD capped at
 * 85% of the deposit; liened accounts are not settleable / closeable /
 * renewable until released.
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

export type FDPayoutInstruction = 'Renew principal' | 'Payout at maturity' | 'Renew principal + interest';

export type FDEvent = {
    id: string;
    type: 'Opened' | 'Renewed' | 'Interest credited' | 'Closed' | 'Payout' | 'Lien' | 'Lien released';
    date: string;
    amount: number;
    reference: string;
    performedBy: string;
    note: string;
    authorizationReference?: string;
    approvalReference?: string;
    paymentMethod?: string;
    destinationAccount?: string;
    externalReference?: string;
    supportingDocuments?: string;
    consentReference?: string;
};

export type FDRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    principal: number;
    tenureMonths: number;
    interestRate: number;
    openedOn: string;
    maturityDate: string;
    maturityAmount: number;
    nomineeName: string;
    nomineeRelation: string;
    payoutInstruction: FDPayoutInstruction;
    status: Status;
    events: FDEvent[];
    productCode?: string;
    branch?: string;
    openingChannel?: string;
    interestMethod?: string;
    compoundingFrequency?: string;
    specialRateReference?: string;
    taxIdentifier?: string;
    taxWithholdingInstruction?: string;
    nomineePhone?: string;
    nomineeAddress?: string;
    nomineeIdentityReference?: string;
    nomineeDocumentReferences?: string;
    payoutMethod?: string;
    payoutAccountReference?: string;
    lienDetails?: string;
    prematureClosureTerms?: string;
    renewalInstructions?: string;
    authorizationReference?: string;
    documentReferences?: string;
    consentReference?: string;
};

export type FDInput = Pick<
    FDRecord,
    'customerId' | 'principal' | 'tenureMonths' | 'interestRate' | 'openedOn' | 'maturityDate' | 'nomineeName' | 'nomineeRelation' | 'payoutInstruction' | 'status'
> &
    Partial<
        Omit<
            FDRecord,
            | 'id'
            | 'customerId'
            | 'customerName'
            | 'customerPhone'
            | 'principal'
            | 'tenureMonths'
            | 'interestRate'
            | 'openedOn'
            | 'maturityDate'
            | 'maturityAmount'
            | 'nomineeName'
            | 'nomineeRelation'
            | 'payoutInstruction'
            | 'status'
            | 'events'
        >
    >;

export type FdQuery = {
    search?: string;
    status?: Status;
    customerId?: string;
    limit?: number;
    offset?: number;
};

export type FdMaturityActionInput = {
    action: 'renew_principal_interest' | 'renew_principal' | 'transfer_to_savings' | 'pay_cash' | 'pay_bank';
    tenureMonths?: number;
    savingsAccountId?: string;
    paymentMethod?: string;
    referenceNumber?: string;
};

export type FdLoanAgainstInput = {
    loanProductId: string;
    amount: number;
    tenureMonths: number;
    interestRate: number;
    repaymentFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    purpose: string;
};

export type CreateFdRateCardInput = {
    minAmount: number;
    maxAmount: number;
    tenureMonths: number;
    interestRate: number;
    earlyClosurePenaltyPercent?: number;
    minHoldingMonths?: number;
    effectiveFrom?: string;
    isActive?: boolean;
};

/**
 * Editable FD account fields (spec §11.1). Principal, tenure, customer, branch,
 * start date and status are immutable once the account is booked; only the rate
 * card / rate / payout behaviour can be revised, and the backend re-validates
 * the rate-card amount band + tenure (managing_director only).
 */
export type FdUpdateInput = {
    rateCardId?: string;
    interestRate?: number;
    rateIsFixed?: boolean;
    payoutFrequency?: FdPayoutFrequency;
    payoutMode?: FdPayoutMode;
    maturityAction?: FdMaturityAction;
};

export interface FdRepository {
    list(query?: FdQuery): Promise<FDRecord[]>;
    detail(id: string): Promise<FDRecord>;
    open(input: FDInput, rateCards?: RateCardView[]): Promise<FDRecord>;
    update(id: string, input: FdUpdateInput): Promise<FDRecord>;
    history(id: string): Promise<HistoryView>;
    listRateCards(search?: string): Promise<RateCardView[]>;
    createRateCard(input: CreateFdRateCardInput): Promise<RateCardView>;
    lien(id: string, action: 'request' | 'release', lienAmount?: number, reason?: string): Promise<FDRecord>;
    closeEarly(id: string, reason: string): Promise<FDRecord>;
    maturityAction(id: string, input: FdMaturityActionInput): Promise<FDRecord>;
    loanAgainstFd(id: string, input: FdLoanAgainstInput): Promise<LoanRefView>;
}

// ---------------------------------------------------------------------------
// Backend view contracts (snake→camel already applied by the service layer)
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

export type FdAccountStatus = 'active' | 'matured' | 'closed_early' | 'under_lien' | 'closed' | 'renewed';

export type LoanRepaymentFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/** Vocabulary the backend `paymentMethodSchema` accepts (fd.schemas.ts §11). */
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'upi' | 'neft' | 'rtgs';

/** Free-text operator label → backend enum, so a typed/spelled method is never rejected. */
const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
    cash: 'cash',
    'bank transfer': 'bank_transfer',
    bank_transfer: 'bank_transfer',
    banktransfer: 'bank_transfer',
    cheque: 'cheque',
    check: 'cheque',
    'mobile money': 'mobile_money',
    mobile_money: 'mobile_money',
    mobilemoney: 'mobile_money',
    upi: 'upi',
    neft: 'neft',
    rtgs: 'rtgs',
};

/** Backend enum → operator label (used to prefill edit forms). */
const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    cheque: 'Cheque',
    mobile_money: 'Mobile money',
    upi: 'UPI',
    neft: 'NEFT',
    rtgs: 'RTGS',
};

/**
 * Converts a UI payout method (label or enum value) to the strict backend enum.
 * Returns undefined for blank input so the schema default applies instead. Throws
 * a readable error for an unrecognised value rather than letting Zod 400 the request.
 */
export function normalisePaymentMethod(value: string | null | undefined): PaymentMethod | undefined {
    if (value === null || value === undefined) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const mapped = PAYMENT_METHOD_MAP[trimmed.toLowerCase()];
    if (mapped) return mapped;
    throw new Error(`Unsupported payment method "${trimmed}". Choose cash, bank transfer, cheque, mobile money, UPI, NEFT or RTGS.`);
}

/** Backend enum → human label (falls back to the raw value for unknown vocabularies). */
export function paymentMethodLabel(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    return PAYMENT_METHOD_LABEL[value as PaymentMethod] ?? value;
}

/** Narrow untrusted input to a UUID without a permissive length guard. */
function isUuid(value: string | null | undefined): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

/** Deep-clone a catalogue snapshot so later reads share the same rate-card view shape. */
function cloneRateCard(card: RateCardView): RateCardView {
    return { ...card };
}

export type RateCardView = {
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
};

export type FdAccountView = {
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
};

export type LienView = {
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
};

export type MaturityEventView = {
    id: string;
    fdAccountId: string;
    eventType: string;
    eventDate: string;
    details: Record<string, unknown> | null;
    createdAt: string;
};

export type InterestPayoutView = {
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
};

export type HistoryEventView = {
    kind: 'maturity_event' | 'lien' | 'interest_payout';
    entityId: string;
    eventDate: string;
    status: string | null;
    amount: string | null;
    referenceNumber: string | null;
    reason: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
};

export type HistoryView = {
    total: number;
    items: HistoryEventView[];
};

export type CloseEarlyResult = {
    account: FdAccountView;
    closurePenalty: string;
};

export type MaturityActionResult = {
    account: FdAccountView;
    action: FdMaturityAction;
    depositAmount: string;
    interestAmount: string;
};

export type LoanRefView = {
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
};

export type LoanResult = {
    loan: LoanRefView;
};

type RateCardListResult = { total: number; items: RateCardView[] };
type FdAccountListResult = { total: number; items: FdAccountView[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Bridges
// ---------------------------------------------------------------------------

function toNumber(value: string | null | undefined): number {
    if (!value) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function statusOf(value: FdAccountStatus): Status {
    switch (value) {
        case 'active':
        case 'renewed':
            return 'Active';
        case 'matured':
        case 'under_lien':
            return 'Review';
        case 'closed_early':
        case 'closed':
            return 'Inactive';
        default:
            return 'Pending';
    }
}

function payoutInstructionOf(action: FdMaturityAction, mode: FdPayoutMode): FDPayoutInstruction {
    if (action === 'renew_principal') return 'Renew principal';
    if (action === 'renew_principal_interest') return 'Renew principal + interest';
    if (mode === 'payout') return 'Payout at maturity';
    return 'Renew principal + interest';
}

function eventTypeOf(item: HistoryEventView): FDEvent['type'] {
    if (item.kind === 'lien') return item.status === 'released' ? 'Lien released' : 'Lien';
    if (item.kind === 'interest_payout') return 'Interest credited';
    switch (item.status) {
        case 'renewed':
            return 'Renewed';
        case 'closed_early':
            return 'Closed';
        case 'action_taken':
        case 'transferred':
        case 'matured':
            return 'Payout';
        default:
            return 'Interest credited';
    }
}

/**
 * The backend records the acting staff id inside each event's `details` jsonb
 * (closedBy / renewedBy / transferredBy / settledBy / requestedBy / releasedBy),
 * so surface the real actor instead of a placeholder.
 */
function performedByOf(item: HistoryEventView): string {
    const details = item.details ?? {};
    const candidates = ['closedBy', 'renewedBy', 'transferredBy', 'settledBy', 'requestedBy', 'releasedBy', 'recordedBy', 'actedBy', 'viewedBy'];
    for (const key of candidates) {
        const value = details[key];
        if (typeof value === 'string' && value.trim()) return value;
    }
    const name = details.actorName ?? details.performedByName;
    if (typeof name === 'string' && name.trim()) return name;
    return 'Not recorded';
}

function toEvent(item: HistoryEventView): FDEvent {
    const details = item.details ?? {};
    return {
        id: item.entityId,
        type: eventTypeOf(item),
        date: formatDate(item.eventDate),
        amount: toNumber(item.amount),
        reference: item.referenceNumber ?? item.entityId,
        performedBy: performedByOf(item),
        note: item.reason ?? item.status ?? '',
        paymentMethod: typeof details.paymentMethod === 'string' ? details.paymentMethod : undefined,
        destinationAccount:
            typeof details.savingsAccountNumber === 'string'
                ? details.savingsAccountNumber
                : typeof details.renewedAccountNumber === 'string'
                  ? details.renewedAccountNumber
                  : undefined,
    };
}

/** Simple interest projection: deposit × rate/100 × tenure/12 (spec §11.1). */
function maturityAmountOf(principal: number, rate: number, tenureMonths: number): number {
    return Math.round(principal + (principal * rate * tenureMonths) / 1200);
}

/**
 * `fd_account` stores no nominee columns — nominees live on the customer record,
 * so the adapter joins the customer to populate them (mirrors the deposits
 * adapter). Fields the backend genuinely does not hold are left `undefined` and
 * rendered "Not captured" by the UI instead of a fabricated placeholder.
 */
function toRecord(view: FdAccountView, events: FDEvent[], customer?: Customer): FDRecord {
    const principal = toNumber(view.depositAmount);
    const interestRate = toNumber(view.interestRate);
    const lienAmount = toNumber(view.lienAmount);
    const opened: FDEvent = {
        id: `${view.id}-opened`,
        type: 'Opened',
        date: formatDate(view.startDate ?? view.createdAt),
        amount: principal,
        reference: view.accountNumber,
        performedBy: view.openedByName ?? view.openedBy ?? 'Not recorded',
        note: `Fixed deposit booked for ${view.tenureMonths} month(s).`,
    };
    const nomineeName = customer?.nomineeName?.trim();
    const nomineeRelation = customer?.nomineeRelation?.trim();
    const documents = customer?.documentReferences?.trim();
    return {
        id: view.accountNumber,
        customerId: view.customerId,
        customerName: view.customerName,
        customerPhone: customer?.phone ?? view.customerNumber ?? '',
        principal,
        tenureMonths: view.tenureMonths,
        interestRate,
        openedOn: view.startDate ?? view.createdAt,
        maturityDate: view.maturityDate,
        maturityAmount: maturityAmountOf(principal, interestRate, view.tenureMonths),
        nomineeName: nomineeName || 'Not captured',
        nomineeRelation: nomineeRelation || 'Not captured',
        payoutInstruction: payoutInstructionOf(view.maturityAction, view.payoutMode),
        status: statusOf(view.status),
        events: [opened, ...events],
        branch: view.branchName ?? customer?.branch ?? undefined,
        interestMethod: view.rateIsFixed ? 'Fixed rate' : 'Scheme rate',
        compoundingFrequency: view.payoutFrequency === 'monthly' ? 'Monthly' : view.payoutFrequency === 'quarterly' ? 'Quarterly' : view.payoutFrequency === 'yearly' ? 'Annual' : 'At maturity',
        taxIdentifier: customer?.taxIdentifier || undefined,
        nomineePhone: customer?.nomineePhone || undefined,
        nomineeAddress: customer?.address || undefined,
        nomineeIdentityReference: customer?.identityReference || undefined,
        nomineeDocumentReferences: documents || undefined,
        documentReferences: documents || undefined,
        lienDetails: lienAmount > 0 ? `Lien of ₹${lienAmount.toLocaleString('en-IN')} active` : undefined,
        prematureClosureTerms: toNumber(view.closurePenalty) > 0 ? `Early closure penalty ₹${toNumber(view.closurePenalty).toLocaleString('en-IN')}` : undefined,
    };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiFdRepository implements FdRepository {
    /** display id / uuid → uuid */
    private readonly ids = new Map<string, string>();
    private readonly cards = new Map<string, RateCardView>();

    private remember(view: FdAccountView): void {
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
        throw new Error(`Unknown fixed deposit account ${id}`);
    }

    private async historyOf(uuid: string): Promise<FDEvent[]> {
        const result = await apiClient.request<HistoryView>(`/fd/accounts/${uuid}/history?limit=200`, {
            method: 'GET',
        });
        return result.items.map(toEvent);
    }

    /** Fetch the linked customer so nominee / KYC fields come from the backend. */
    private async customerOf(customerId: string): Promise<Customer | undefined> {
        if (!customerId) return undefined;
        try {
            return await customerRepository.detail(customerId);
        } catch {
            return undefined;
        }
    }

    private async present(view: FdAccountView, events: FDEvent[]): Promise<FDRecord> {
        const customer = await this.customerOf(view.customerId);
        return toRecord(view, events, customer);
    }

    async listRateCards(search?: string): Promise<RateCardView[]> {
        const suffix = querySuffix({ search, limit: 100 });
        const result = await apiClient.request<RateCardListResult>(`/fd/rate-card${suffix}`, { method: 'GET' });
        result.items.forEach((card) => this.cards.set(card.id, card));
        return result.items;
    }

    async createRateCard(input: CreateFdRateCardInput): Promise<RateCardView> {
        const body: Record<string, unknown> = {
            minAmount: input.minAmount.toFixed(2),
            maxAmount: input.maxAmount.toFixed(2),
            tenureMonths: input.tenureMonths,
            interestRate: input.interestRate.toFixed(4),
        };
        if (input.earlyClosurePenaltyPercent !== undefined) body.earlyClosurePenaltyPercent = input.earlyClosurePenaltyPercent.toFixed(2);
        if (input.minHoldingMonths !== undefined) body.minHoldingMonths = input.minHoldingMonths;
        if (input.effectiveFrom) body.effectiveFrom = input.effectiveFrom;
        if (input.isActive !== undefined) body.isActive = input.isActive;
        const card = await apiClient.request<RateCardView>('/fd/rate-card', { method: 'POST', body });
        this.cards.set(card.id, card);
        return card;
    }

    async list(query: FdQuery = {}): Promise<FDRecord[]> {
        const suffix = querySuffix({
            search: query.search,
            customerId: query.customerId,
            limit: query.limit ?? 50,
            offset: query.offset ?? 0,
        });
        const result = await apiClient.request<FdAccountListResult>(`/fd/accounts${suffix}`, { method: 'GET' });
        result.items.forEach((view) => this.remember(view));
        const records = await Promise.all(
            result.items.map(async (view) => this.present(view, await this.historyOf(view.id))),
        );
        return query.status ? records.filter((row) => row.status === query.status) : records;
    }

    async detail(id: string): Promise<FDRecord> {
        const uuid = await this.uuidOf(id);
        const view = await apiClient.request<FdAccountView>(`/fd/accounts/${uuid}`, { method: 'GET' });
        this.remember(view);
        const events = await this.historyOf(uuid);
        return this.present(view, events);
    }

    async history(id: string): Promise<HistoryView> {
        const uuid = await this.uuidOf(id);
        return apiClient.request<HistoryView>(`/fd/accounts/${uuid}/history?limit=200`, { method: 'GET' });
    }

    /**
     * Pick the live rate card whose amount band contains the deposit and whose
     * tenure matches exactly (spec §11.1). The UI carries tenure + rate, not the
     * rate-card id, so this resolves it before opening.
     */
    private async resolveRateCardId(depositAmount: number, tenureMonths: number): Promise<string> {
        const result = await apiClient.request<RateCardListResult>('/fd/rate-card?limit=100', { method: 'GET' });
        result.items.forEach((card) => this.cards.set(card.id, card));
        const active = result.items.filter((card) => card.isActive);
        const match = active.find(
            (card) =>
                card.tenureMonths === tenureMonths &&
                toNumber(card.minAmount) <= depositAmount &&
                depositAmount <= toNumber(card.maxAmount),
        );
        if (match) return match.id;
        const fallback = active.find((card) => card.tenureMonths === tenureMonths);
        if (fallback) return fallback.id;
        throw new Error(`No active FD rate card covers ₹${depositAmount} for ${tenureMonths} months`);
    }

    async open(input: FDInput, rateCards?: RateCardView[]): Promise<FDRecord> {
        // Prefer the rate card the operator explicitly booked; only fall back to
        // resolving by amount + tenure when the caller did not pass a catalogue.
        const selected = isUuid(input.productCode) ? rateCards?.find((card) => card.id === input.productCode) : undefined;
        if (selected) this.cards.set(selected.id, cloneRateCard(selected));
        const rateCardId = selected ? selected.id : await this.resolveRateCardId(input.principal, input.tenureMonths);
        const payoutMode: FdPayoutMode = input.payoutInstruction === 'Payout at maturity' ? 'payout' : 'reinvest';
        const payoutFrequency: FdPayoutFrequency =
            input.compoundingFrequency === 'Monthly'
                ? 'monthly'
                : input.compoundingFrequency === 'Quarterly'
                  ? 'quarterly'
                  : input.compoundingFrequency === 'Annual'
                    ? 'yearly'
                    : 'at_maturity';
        const body: Record<string, unknown> = {
            customerId: input.customerId,
            rateCardId,
            branchId: branchId(),
            depositAmount: input.principal.toFixed(2),
            tenureMonths: input.tenureMonths,
            payoutFrequency,
            payoutMode,
            maturityAction: 'pending',
        };
        if (input.openedOn) body.startDate = input.openedOn;
        if (input.interestRate) body.rateIsFixed = true;
        // The backend enum is strict (cash | bank_transfer | cheque | mobile_money |
        // upi | neft | rtgs); map the operator label so a typed value cannot 400.
        const paymentMethod = normalisePaymentMethod(input.payoutMethod);
        if (paymentMethod) body.paymentMethod = paymentMethod;
        if (input.authorizationReference) body.referenceNumber = input.authorizationReference;
        const view = await apiClient.request<FdAccountView>('/fd/accounts', { method: 'POST', body });
        this.remember(view);
        const events = await this.historyOf(view.id);
        return this.present(view, events);
    }

    async update(id: string, input: FdUpdateInput): Promise<FDRecord> {
        const uuid = await this.uuidOf(id);
        const body: Record<string, unknown> = {};
        if (input.rateCardId) body.rateCardId = input.rateCardId;
        if (input.interestRate !== undefined) body.interestRate = input.interestRate.toFixed(4);
        if (input.rateIsFixed !== undefined) body.rateIsFixed = input.rateIsFixed;
        if (input.payoutFrequency) body.payoutFrequency = input.payoutFrequency;
        if (input.payoutMode) body.payoutMode = input.payoutMode;
        if (input.maturityAction) body.maturityAction = input.maturityAction;
        const view = await apiClient.request<FdAccountView>(`/fd/accounts/${uuid}`, { method: 'PATCH', body });
        this.remember(view);
        const events = await this.historyOf(uuid);
        return this.present(view, events);
    }

    async lien(id: string, action: 'request' | 'release', lienAmount?: number, reason?: string): Promise<FDRecord> {
        const uuid = await this.uuidOf(id);
        const body: Record<string, unknown> = { action };
        if (action === 'request') {
            body.lienAmount = (lienAmount ?? 0).toFixed(2);
            body.reason = reason ?? 'Lien recorded at branch';
        }
        const view = await apiClient.request<FdAccountView>(`/fd/accounts/${uuid}/lien`, { method: 'POST', body });
        this.remember(view);
        const events = await this.historyOf(uuid);
        return this.present(view, events);
    }

    async closeEarly(id: string, reason: string): Promise<FDRecord> {
        const uuid = await this.uuidOf(id);
        const result = await apiClient.request<CloseEarlyResult>(`/fd/accounts/${uuid}/close-early`, {
            method: 'POST',
            body: { reason, paymentMethod: 'cash' },
        });
        this.remember(result.account);
        const events = await this.historyOf(uuid);
        return this.present(result.account, events);
    }

    async maturityAction(id: string, input: FdMaturityActionInput): Promise<FDRecord> {
        const uuid = await this.uuidOf(id);
        const body: Record<string, unknown> = { action: input.action };
        if (input.tenureMonths !== undefined) body.tenureMonths = input.tenureMonths;
        if (input.savingsAccountId) body.savingsAccountId = input.savingsAccountId;
        if (input.paymentMethod) body.paymentMethod = input.paymentMethod;
        if (input.referenceNumber) body.referenceNumber = input.referenceNumber;
        const result = await apiClient.request<MaturityActionResult>(`/fd/accounts/${uuid}/maturity-action`, {
            method: 'POST',
            body,
        });
        this.remember(result.account);
        const events = await this.historyOf(uuid);
        return this.present(result.account, events);
    }

    async loanAgainstFd(id: string, input: FdLoanAgainstInput): Promise<LoanRefView> {
        const uuid = await this.uuidOf(id);
        const body = {
            loanProductId: input.loanProductId,
            amount: input.amount.toFixed(2),
            tenureMonths: input.tenureMonths,
            interestRate: input.interestRate.toFixed(4),
            repaymentFrequency: input.repaymentFrequency,
            purpose: input.purpose,
        };
        const result = await apiClient.request<LoanResult>(`/fd/accounts/${uuid}/loan`, { method: 'POST', body });
        return result.loan;
    }
}

export const fdRepository: FdRepository = new ApiFdRepository();