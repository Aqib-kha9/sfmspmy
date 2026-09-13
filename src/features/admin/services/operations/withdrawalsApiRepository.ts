import { apiClient } from '../../../../lib/api/apiClient';
import type {
    ListWithdrawalsResult,
    RequestWithdrawalInput,
    WithdrawalAccountKind,
    WithdrawalEventType,
    WithdrawalHistoryEventView,
    WithdrawalHistoryResult,
    WithdrawalIdentityVerification,
    WithdrawalPaymentMethod,
    WithdrawalStatus,
    WithdrawalView,
} from '../../../../lib/api/types';
import { formatDate, querySuffix } from './helpers';

/**
 * Withdrawals adapter repository.
 *
 * Bridges the backend /api/v1/withdrawals surface (docs/backend-master-spec.md
 * §13) onto the display shapes the AdminPages withdrawals UI expects:
 *
 *  - GET    /withdrawals            -> list (status / accountKind / from / to)
 *  - POST   /withdrawals            -> create request (starts pending)
 *  - POST   /:id/approve            -> approval decision
 *  - POST   /:id/reject             -> rejection with a reason
 *  - POST   /:id/pay                -> record payout + debit source ledger
 *  - POST   /:id/confirm            -> terminal confirmation
 *  - POST   /:id/change             -> President-only change (re-enters queue)
 *  - GET    /:id/history            -> chronological event trail
 *
 * Gate notes (routes): reads need `withdrawals.read`, writes need
 * `withdrawals.create` / `withdrawals.approve`, and change requires the
 * President role. Amounts travel as strings; the UI renders them as numbers.
 */

/** Mirrors the AdminPages status union so the wiring step imports from here. */
export type Status = 'Active' | 'Pending' | 'Approved' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Matched';

export type WithdrawalEvent = {
    id: string;
    type: 'Requested' | 'Approved' | 'Rejected' | 'Marked for review' | 'Settled';
    date: string;
    performedBy: string;
    reference: string;
    note: string;
};

export type WithdrawalRecord = {
    /** Backend uuid used for approve / reject / pay / confirm / change calls. */
    withdrawalId: string;
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    sourceAccountType: 'Regular savings' | 'Recurring deposit' | 'Fixed deposit' | 'Loan surplus';
    sourceAccountId: string;
    amount: number;
    requestedOn: string;
    requestedBy: 'Customer' | 'Branch counter' | 'Collection agent';
    channel: 'Branch counter' | 'Doorstep agent' | 'Customer request';
    status: Status;
    identityVerificationReference?: string;
    purposeCode?: string;
    destinationAccountReference?: string;
    bankUtrOrExternalReference?: string;
    supportingDocuments?: string;
    consentReference?: string;
    cashHandoverReference?: string;
    makerReference?: string;
    checkerReference?: string;
    rejectionReason?: string;
    deviceReference?: string;
    location?: string;
    offlineSyncReference?: string;
    authorizedBy?: string;
    decisionDate?: string;
    payoutMethod?: 'Cash' | 'Bank transfer' | 'Cheque' | 'Mobile money';
    settlementDate?: string;
    settlementReference?: string;
    settlementOperator?: string;
    reference: string;
    note: string;
    events: WithdrawalEvent[];
};

export type WithdrawalInput = {
    sourceAccountType: WithdrawalRecord['sourceAccountType'];
    sourceAccountId: string;
    amount: number;
    requestedOn: string;
    requestedBy: WithdrawalRecord['requestedBy'];
    channel: WithdrawalRecord['channel'];
    reference: string;
    note: string;
    paymentMethod?: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money';
    identityVerified?: WithdrawalIdentityVerification;
    /** Controlled-transaction evidence references stored in the documents JSONB. */
    identityVerificationReference?: string;
    purposeCode?: string;
    destinationAccountReference?: string;
    bankUtrOrExternalReference?: string;
    supportingDocuments?: string;
    consentReference?: string;
    cashHandoverReference?: string;
    makerReference?: string;
    checkerReference?: string;
    deviceReference?: string;
    location?: string;
    offlineSyncReference?: string;
};

export type WithdrawalQuery = {
    search?: string;
    status?: Status;
    accountKind?: WithdrawalAccountKind;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
};

export interface WithdrawalRepository {
    list(query?: WithdrawalQuery): Promise<WithdrawalRecord[]>;
    detail(id: string): Promise<WithdrawalRecord>;
    create(input: WithdrawalInput): Promise<WithdrawalRecord>;
    approve(id: string, comment?: string): Promise<WithdrawalRecord>;
    reject(id: string, reason: string): Promise<WithdrawalRecord>;
    pay(id: string, input: { payoutReference?: string }): Promise<WithdrawalRecord>;
    confirm(id: string): Promise<WithdrawalRecord>;
    change(id: string, input: { amount: number; reason: string }): Promise<WithdrawalRecord>;
    history(id: string): Promise<WithdrawalEvent[]>;
}

/** Backend status -> display status. paid/confirmed both read as settled. */
const STATUS_FROM_API: Record<WithdrawalStatus, Status> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Completed',
    confirmed: 'Completed',
    cancelled: 'Rejected',
};

/** Display statuses that map cleanly onto a backend filter value. */
const STATUS_TO_API: Record<Status, WithdrawalStatus | undefined> = {
    Active: undefined,
    Pending: 'pending',
    Approved: 'approved',
    Completed: undefined, // settled = paid|confirmed; filtered client-side
    Review: undefined, // backend has no review state
    Overdue: undefined,
    Inactive: undefined,
    Rejected: 'rejected',
    Matched: undefined,
};

const ACCOUNT_FROM_API: Record<WithdrawalAccountKind, WithdrawalRecord['sourceAccountType']> = {
    savings: 'Regular savings',
    rd: 'Recurring deposit',
    fd: 'Fixed deposit',
    loan_surplus: 'Loan surplus',
};

const ACCOUNT_TO_API: Record<WithdrawalRecord['sourceAccountType'], WithdrawalAccountKind> = {
    'Regular savings': 'savings',
    'Recurring deposit': 'rd',
    'Fixed deposit': 'fd',
    'Loan surplus': 'loan_surplus',
};

const PAYOUT_FROM_API: Record<WithdrawalPaymentMethod, NonNullable<WithdrawalRecord['payoutMethod']>> = {
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    cheque: 'Cheque',
    mobile_money: 'Mobile money',
};

const EVENT_FROM_API: Record<WithdrawalEventType, WithdrawalEvent['type']> = {
    requested: 'Requested',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Settled',
    confirmed: 'Settled',
    changed: 'Requested', // President change re-enters the queue
    cancelled: 'Rejected',
};

/** Human-readable note from the free-form event payload. */
function eventNote(data: Record<string, unknown> | null): string {
    if (!data) return '';
    const comment = data.comment;
    if (typeof comment === 'string' && comment.trim()) return comment;
    const reason = data.reason;
    if (typeof reason === 'string' && reason.trim()) return reason;
    const payout = data.payoutReference;
    if (typeof payout === 'string' && payout.trim()) return `Payout reference ${payout}`;
    return '';
}

function toEvents(items: WithdrawalHistoryEventView[], requestNumber: string): WithdrawalEvent[] {
    return items.map((item) => {
        const note = eventNote(item.eventData);
        return {
            id: item.id,
            type: EVENT_FROM_API[item.eventType] ?? 'Requested',
            date: formatDate(item.createdAt),
            performedBy: item.performedByName ?? 'System',
            reference: item.eventType === 'requested' ? requestNumber : note || requestNumber,
            note,
        };
    });
}

const REQUESTED_BY_VALUES: WithdrawalRecord['requestedBy'][] = ['Customer', 'Branch counter', 'Collection agent'];
const CHANNEL_VALUES: WithdrawalRecord['channel'][] = ['Branch counter', 'Doorstep agent', 'Customer request'];

/**
 * Resolves who raised the request. The captured operator value (evidence in the
 * documents payload) wins because `withdrawal_request.requested_by` is only the
 * acting staff id and is null for customer/mobile-originated requests.
 */
function requestedByOf(view: WithdrawalView): WithdrawalRecord['requestedBy'] {
    const captured = docString(view.documents, 'requestedBy');
    if (captured && (REQUESTED_BY_VALUES as string[]).includes(captured)) {
        return captured as WithdrawalRecord['requestedBy'];
    }
    return view.requestedBy === null ? 'Customer' : 'Branch counter';
}

/** Resolves the intake channel, preferring the captured operator value. */
function channelOf(view: WithdrawalView): WithdrawalRecord['channel'] {
    const captured = docString(view.documents, 'channel');
    if (captured && (CHANNEL_VALUES as string[]).includes(captured)) {
        return captured as WithdrawalRecord['channel'];
    }
    return view.requestedBy === null ? 'Customer request' : 'Branch counter';
}

function identityOf(view: WithdrawalView): string | undefined {
    const parts: string[] = [];
    if (view.identityVerified.passbook) parts.push('Passbook');
    if (view.identityVerified.signature) parts.push('Signature');
    if (view.identityVerified.aadhaar) parts.push('Aadhaar');
    return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** Read an evidence reference stored in the free-form documents JSONB payload. */
function docString(documents: Record<string, unknown> | null | undefined, key: string): string | undefined {
    const value = documents?.[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toRecord(view: WithdrawalView, events: WithdrawalEvent[] = []): WithdrawalRecord {
    const settled = view.status === 'paid' || view.status === 'confirmed';
    return {
        withdrawalId: view.id,
        id: view.requestNumber,
        customerId: view.customerNumber ?? view.customerId,
        customerName: view.customerName,
        // `customerNumber` is the CIF/account number (also the eyebrow's first
        // segment); the phone must come from the real customer.mobile column so
        // the header does not repeat the customer id twice.
        customerPhone: view.customerMobile ?? 'Not available',
        sourceAccountType: ACCOUNT_FROM_API[view.accountKind],
        sourceAccountId: view.accountNumber ?? view.accountId ?? 'Not linked',
        amount: Number(view.amount),
        requestedOn: view.requestedOn ?? view.createdAt,
        requestedBy: requestedByOf(view),
        channel: channelOf(view),
        status: STATUS_FROM_API[view.status] ?? 'Pending',
        identityVerificationReference: docString(view.documents, 'identityVerificationReference') ?? identityOf(view),
        purposeCode: docString(view.documents, 'purposeCode'),
        destinationAccountReference: docString(view.documents, 'destinationAccountReference'),
        bankUtrOrExternalReference: docString(view.documents, 'bankUtrOrExternalReference'),
        supportingDocuments: docString(view.documents, 'supportingDocuments'),
        consentReference: docString(view.documents, 'consentReference'),
        cashHandoverReference: docString(view.documents, 'cashHandoverReference'),
        makerReference: docString(view.documents, 'makerReference'),
        checkerReference: docString(view.documents, 'checkerReference'),
        rejectionReason: view.rejectionReason ?? undefined,
        deviceReference: docString(view.documents, 'deviceReference'),
        location: docString(view.documents, 'location'),
        offlineSyncReference: docString(view.documents, 'offlineSyncReference'),
        authorizedBy: view.approvedByName ?? undefined,
        decisionDate: view.approvedOn ? formatDate(view.approvedOn) : undefined,
        payoutMethod: settled ? PAYOUT_FROM_API[view.paymentMethod] : undefined,
        settlementDate: view.paidOn ? formatDate(view.paidOn) : undefined,
        settlementReference: view.payoutReference ?? undefined,
        settlementOperator: view.paidByName ?? undefined,
        // Prefer the operator's own request reference (preserved as evidence) and
        // fall back to the server-generated request number.
        reference: docString(view.documents, 'operatorReference') ?? view.requestNumber,
        note: view.freeTextReason && view.freeTextReason.includes(view.reason)
            ? view.freeTextReason
            : view.reason + (view.freeTextReason ? ` — ${view.freeTextReason}` : ''),
        events,
    };
}

export class ApiWithdrawalRepository implements WithdrawalRepository {
    async list(query: WithdrawalQuery = {}): Promise<WithdrawalRecord[]> {
        const status = query.status ? STATUS_TO_API[query.status] : undefined;
        const result = await apiClient.request<ListWithdrawalsResult>(
            `/withdrawals${querySuffix({
                status,
                accountKind: query.accountKind,
                from: query.from,
                to: query.to,
                limit: query.limit ?? 100,
                offset: query.offset ?? 0,
            })}`,
        );
        const rows = result.items.map((view) => toRecord(view));
        return rows.filter((row) => this.matches(row, query));
    }

    /** Loads the full request from GET /:id (with its worksheet) plus the event trail. */
    async detail(id: string): Promise<WithdrawalRecord> {
        const view = await apiClient.request<WithdrawalView>(`/withdrawals/${id}`);
        const history = await apiClient.request<WithdrawalHistoryResult>(`/withdrawals/${id}/history`);
        return toRecord(view, toEvents(history.items, history.requestNumber));
    }

    async create(input: WithdrawalInput): Promise<WithdrawalRecord> {
        // Controlled-transaction evidence references are not columns on
        // withdrawal_request, so they travel inside the free-form `documents`
        // payload (mirrors the loans application worksheet). Empty strings are
        // dropped so the stored JSONB stays compact.
        const documents: Record<string, unknown> = {};
        const capture = (key: string, value: string | undefined) => {
            const trimmed = value?.trim();
            if (trimmed) documents[key] = trimmed;
        };
        capture('identityVerificationReference', input.identityVerificationReference);
        capture('purposeCode', input.purposeCode);
        capture('destinationAccountReference', input.destinationAccountReference);
        capture('bankUtrOrExternalReference', input.bankUtrOrExternalReference);
        capture('supportingDocuments', input.supportingDocuments);
        capture('consentReference', input.consentReference);
        capture('cashHandoverReference', input.cashHandoverReference);
        capture('makerReference', input.makerReference);
        capture('checkerReference', input.checkerReference);
        capture('deviceReference', input.deviceReference);
        capture('location', input.location);
        capture('offlineSyncReference', input.offlineSyncReference);
        // The operator-facing request reference, requester and channel have no
        // dedicated columns on withdrawal_request (the interchange reference is
        // generated server-side), so they are preserved here as evidence rather
        // than being silently discarded from the submitted form.
        capture('operatorReference', input.reference);
        capture('requestedBy', input.requestedBy);
        capture('channel', input.channel);
        // `reason` is a short selectable label (DB column caps at 200 characters)
        // while the operator's typed explanation travels in `freeTextReason`
        // (1000-character column). Sending the full note as both would let a long
        // reason be rejected at the API boundary, so the two are split here.
        const reasonLabel = (input.note || 'Withdrawal request').trim().slice(0, 200);
        const payload: RequestWithdrawalInput = {
            accountKind: ACCOUNT_TO_API[input.sourceAccountType],
            accountId: input.sourceAccountId,
            amount: String(input.amount),
            paymentMethod: input.paymentMethod ?? 'cash',
            identityVerified: input.identityVerified,
            reason: reasonLabel,
            freeTextReason: input.note.trim() || undefined,
            ...(Object.keys(documents).length > 0 ? { documents } : {}),
        };
        const view = await apiClient.request<WithdrawalView>('/withdrawals', {
            method: 'POST',
            body: payload,
        });
        return toRecord(view);
    }

    async approve(id: string, comment?: string): Promise<WithdrawalRecord> {
        const view = await apiClient.request<WithdrawalView>(`/withdrawals/${id}/approve`, {
            method: 'POST',
            body: { comment },
        });
        return toRecord(view);
    }

    async reject(id: string, reason: string): Promise<WithdrawalRecord> {
        const view = await apiClient.request<WithdrawalView>(`/withdrawals/${id}/reject`, {
            method: 'POST',
            body: { reason },
        });
        return toRecord(view);
    }

    async pay(id: string, input: { payoutReference?: string }): Promise<WithdrawalRecord> {
        const view = await apiClient.request<WithdrawalView>(`/withdrawals/${id}/pay`, {
            method: 'POST',
            body: {
                payoutReference: input.payoutReference,
                identityVerified: { passbook: true, signature: true, aadhaar: true },
            },
        });
        return toRecord(view);
    }

    async confirm(id: string): Promise<WithdrawalRecord> {
        const view = await apiClient.request<WithdrawalView>(`/withdrawals/${id}/confirm`, {
            method: 'POST',
            body: {},
        });
        return toRecord(view);
    }

    async change(id: string, input: { amount: number; reason: string }): Promise<WithdrawalRecord> {
        const view = await apiClient.request<WithdrawalView>(`/withdrawals/${id}/change`, {
            method: 'POST',
            body: { amount: String(input.amount), reason: input.reason },
        });
        return toRecord(view);
    }

    async history(id: string): Promise<WithdrawalEvent[]> {
        const result = await apiClient.request<WithdrawalHistoryResult>(`/withdrawals/${id}/history`);
        return toEvents(result.items, result.requestNumber);
    }

    private matches(row: WithdrawalRecord, query: WithdrawalQuery): boolean {
        if (query.status === 'Completed' && row.status !== 'Completed') return false;
        if (query.search) {
            const needle = query.search.toLowerCase();
            const haystack = `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.sourceAccountType} ${row.sourceAccountId} ${row.requestedBy} ${row.channel} ${row.reference} ${row.note}`.toLowerCase();
            if (!haystack.includes(needle)) return false;
        }
        return true;
    }
}

export const withdrawalsRepository: WithdrawalRepository = new ApiWithdrawalRepository();
