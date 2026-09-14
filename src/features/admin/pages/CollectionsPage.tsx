// OPERATIONS / Doorstep Collections.
//
// Office collections workspace. Every read and write now goes through the live
// /api/v1 surface via collectionsApiRepository:
//  - GET  /collections                            (collections.read) — office list
//  - GET  /collections/reports/collection-totals  (collections.read) — totals
//  - POST /collections/emergency-approval         (M.D.) — record an unassigned collection
//  - POST /collections/:id/review                 (M.D.) — accept / reject / escalate
//  - POST /collections/:id/allocate               (M.D.) — short-payment allocation
//  - POST /collections/:id/delete-duplicate       (M.D. | manager) — soft-delete duplicate
//  - POST /collections/:id/reverse                (M.D.) — dispute reversal + notify
//
// The doorstep submission surface (POST /collections, POST /visits) is reserved
// for `collection_agent` on `agent_mobile` and is intentionally NOT reachable
// from the admin workspace — recording an entry here is the M.D. emergency
// approval path (§14.1).

import { FormEvent, useEffect, useState } from 'react';
import { ArrowDownToLine, CalendarDays, CheckCircle2, ChevronRight, Download, Loader2, Search } from 'lucide-react';
import { collectionsRepository, type CollectionRecord } from '../services/operations/collectionsApiRepository';
import { formatAmount, formatTimestamp, messageFor, querySuffix } from '../services/operations/helpers';
import { StatusPill, SummaryStrip } from '../components/adminShared';
import { useAuth } from '../../auth/AuthContext';
import { apiClient } from '../../../lib/api/apiClient';
import type {
    AgentListResult,
    AllocateCollectionInput,
    CollectionMode,
    CollectionProductType,
    CustomerListResult,
    DeleteDuplicateInput,
    EmergencyApprovalInput,
    ReviewCollectionInput,
    ReviewDecision,
    ReverseCollectionInput,
} from '../../../lib/api/types';

// ---------------------------------------------------------------------------
// Action support directory (agents + customers) for the M.D. write paths.
// ---------------------------------------------------------------------------

type SupportOption = { id: string; label: string };

type ActionSupport = {
    agents: SupportOption[];
    customers: SupportOption[];
};

let supportCache: ActionSupport | null = null;
let supportRequest: Promise<ActionSupport> | null = null;

/** Loads the agent + customer identifiers required by the office write paths. */
function loadActionSupport(): Promise<ActionSupport> {
    if (supportCache) return Promise.resolve(supportCache);
    if (!supportRequest) {
        supportRequest = Promise.all([
            apiClient.request<AgentListResult>(`/agents${querySuffix({ limit: 200 })}`),
            apiClient.request<CustomerListResult>(`/customers${querySuffix({ limit: 200 })}`),
        ])
            .then(([agents, customers]) => {
                supportCache = {
                    agents: agents.items.map((item) => ({
                        id: item.id,
                        label: `${item.fullName ?? item.agentCode} · ${item.agentCode}`,
                    })),
                    customers: customers.items.map((item) => ({
                        id: item.id,
                        label: `${item.fullName} · ${item.customerNumber ?? item.mobile}`,
                    })),
                };
                return supportCache;
            })
            .catch((reason) => {
                supportRequest = null;
                throw reason;
            });
    }
    return supportRequest;
}

/** React hook wrapper around the shared action-support request. */
function useActionSupport(active: boolean): ActionSupport {
    const [support, setSupport] = useState<ActionSupport>(supportCache ?? { agents: [], customers: [] });
    useEffect(() => {
        if (!active) return;
        let live = true;
        loadActionSupport()
            .then((value) => { if (live) setSupport(value); })
            .catch(() => undefined);
        return () => { live = false; };
    }, [active]);
    return support;
}

// ---------------------------------------------------------------------------
// Product / mode vocabulary shared by the write modals
// ---------------------------------------------------------------------------

const PRODUCT_TYPES: Array<{ value: CollectionProductType; label: string }> = [
    { value: 'savingsDeposit', label: 'Daily collection' },
    { value: 'recurringDeposit', label: 'RD installment' },
    { value: 'loan', label: 'Loan repayment' },
    { value: 'penalty', label: 'Penalty' },
];

const MODES: Array<{ value: CollectionMode; label: string }> = [
    { value: 'cash', label: 'Cash' },
    { value: 'UPI', label: 'UPI' },
    { value: 'NEFT', label: 'NEFT' },
    { value: 'RTGS', label: 'RTGS' },
    { value: 'cheque', label: 'Cheque' },
];

/** Maps a product type onto the account id field the submit contract requires. */
const ACCOUNT_FIELD: Record<CollectionProductType, 'savingsAccountId' | 'rdAccountId' | 'loanId' | null> = {
    savingsDeposit: 'savingsAccountId',
    recurringDeposit: 'rdAccountId',
    loan: 'loanId',
    penalty: null,
};

const ALLOCATION_BUCKETS = ['Principal', 'Interest', 'Penalty', 'Fees', 'Product'];

/** Coerces a free-text amount into the decimal string the API expects. */
function amountString(value: string): string {
    return Number(value.replace(/[^0-9.]/g, '')).toFixed(2);
}

function escapeCsv(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// ---------------------------------------------------------------------------
// Record / emergency-approval modal (M.D.)
// ---------------------------------------------------------------------------

export function EmergencyApprovalModal({ onClose, onSave }: { onClose: () => void; onSave: (input: EmergencyApprovalInput) => Promise<void> }) {
    const support = useActionSupport(true);
    const [agentId, setAgentId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [productType, setProductType] = useState<CollectionProductType>('savingsDeposit');
    const [accountId, setAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<CollectionMode>('cash');
    const [instrumentRef, setInstrumentRef] = useState('');
    const [remark, setRemark] = useState('');
    const [isPartial, setIsPartial] = useState(false);
    const [isAdvance, setIsAdvance] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const accountField = ACCOUNT_FIELD[productType];

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        const numericAmount = Number(amount);
        if (!agentId) { setError('Select the collecting agent.'); return; }
        if (!customerId) { setError('Select the customer.'); return; }
        if (accountField && !accountId.trim()) { setError('Enter the linked account / loan id.'); return; }
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setError('Enter a collection amount greater than zero.'); return; }
        const payload: EmergencyApprovalInput = {
            agentId,
            customerId,
            productType,
            amount: amountString(amount),
            mode,
            receiptKind: 'daily',
            acknowledged,
        };
        if (accountField) payload[accountField] = accountId.trim();
        if (instrumentRef.trim()) payload.instrumentRef = instrumentRef.trim();
        if (remark.trim()) payload.remark = remark.trim();
        if (isPartial) payload.isPartial = true;
        if (isAdvance) payload.isAdvance = true;
        setSaving(true);
        try {
            await onSave(payload);
        } finally {
            setSaving(false);
        }
    };

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label="Record emergency collection"><div className="admin-modal-header"><div><div className="eyebrow">COLLECTION WORKFLOW / M.D. EMERGENCY APPROVAL</div><h2>Record doorstep collection</h2><p>Approves and records a collection from an unassigned customer in a single step. The entry is created directly in accepted state, so it is not queued for review.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label>Collecting agent<select value={agentId} onChange={(event) => setAgentId(event.target.value)} required><option value="">Select collecting agent</option>{support.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.label}</option>)}</select></label><label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Select customer</option>{support.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}</select></label><label>Transaction type<select value={productType} onChange={(event) => setProductType(event.target.value as CollectionProductType)}>{PRODUCT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label>{accountField === 'loanId' ? 'Loan ID' : 'Account ID'}<input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder={accountField ? 'Linked account / loan UUID' : 'Not required for penalty'} disabled={!accountField} /></label><label>Amount collected<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="3000" /></label><label>Payment mode<select value={mode} onChange={(event) => setMode(event.target.value as CollectionMode)}>{MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Instrument reference<input value={instrumentRef} onChange={(event) => setInstrumentRef(event.target.value)} placeholder="Cheque / UTR reference" /></label><label>Remark<input value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Optional note for the audit trail" /></label><label className="full-field"><span>Flags</span><span className="form-note">Partial marks a short payment that needs an allocation decision; advance marks a payment recorded ahead of schedule.</span></label><label><span>Partial payment</span><input type="checkbox" checked={isPartial} onChange={(event) => setIsPartial(event.target.checked)} /></label><label><span>Advance payment</span><input type="checkbox" checked={isAdvance} onChange={(event) => setIsAdvance(event.target.checked)} /></label><label className="full-field"><span>Customer acknowledgement</span><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} {saving ? 'Recording…' : 'Record & approve'}</button></div></form></section></div>;
}

// ---------------------------------------------------------------------------
// M.D. review modal
// ---------------------------------------------------------------------------

export function ReviewActionModal({ record, onClose, onSave }: { record: CollectionRecord; onClose: () => void; onSave: (input: ReviewCollectionInput) => Promise<void> }) {
    const [decision, setDecision] = useState<ReviewDecision>('accepted');
    const [remarks, setRemarks] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        if (decision !== 'accepted' && !remarks.trim()) { setError('A remark is required when rejecting or sending an entry for review.'); return; }
        setSaving(true);
        try {
            await onSave({ decision, ...(remarks.trim() ? { remarks: remarks.trim() } : {}) });
        } finally {
            setSaving(false);
        }
    };

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label={`Review collection ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">COLLECTION REVIEW</div><h2>Review · {record.id}</h2><p>{record.customerName} · {formatAmount(record.amount)} · submitted by {record.agent}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label className="full-field">Decision<select value={decision} onChange={(event) => setDecision(event.target.value as ReviewDecision)}><option value="accepted">Accept — record the collection</option><option value="rejected">Reject — invalid collection</option><option value="requiresReview">Send for further review</option></select></label><label className="full-field">Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Evidence reviewed, correction requested or reason for rejection" /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} {saving ? 'Saving…' : 'Record decision'}</button></div></form></section></div>;
}

// ---------------------------------------------------------------------------
// M.D. short-payment allocation modal
// ---------------------------------------------------------------------------

type AllocationRow = { bucket: string; amount: string };

export function AllocateActionModal({ record, onClose, onSave }: { record: CollectionRecord; onClose: () => void; onSave: (input: AllocateCollectionInput) => Promise<void> }) {
    const [rows, setRows] = useState<AllocationRow[]>([{ bucket: 'Principal', amount: '' }]);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const updateRow = (index: number, patch: Partial<AllocationRow>) => {
        setRows((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        const cleaned = rows.map((row) => ({ bucket: row.bucket.trim(), amount: Number(row.amount) })).filter((row) => row.bucket || Number.isFinite(row.amount));
        if (!cleaned.length) { setError('Add at least one allocation bucket.'); return; }
        if (cleaned.some((row) => !row.bucket || !Number.isFinite(row.amount) || row.amount <= 0)) { setError('Every allocation row needs a bucket and an amount greater than zero.'); return; }
        const allocated = cleaned.reduce((total, row) => total + row.amount, 0);
        if (allocated - record.amount > 0.01) { setError(`Allocated ${formatAmount(allocated)} exceeds the collected ${formatAmount(record.amount)}.`); return; }
        setSaving(true);
        try {
            await onSave({ allocation: cleaned.map((row) => ({ bucket: row.bucket, amount: row.amount.toFixed(2) })), ...(note.trim() ? { note: note.trim() } : {}) });
        } finally {
            setSaving(false);
        }
    };

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Allocate collection ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">SHORT-PAYMENT ALLOCATION</div><h2>Allocate · {record.id}</h2><p>Split {formatAmount(record.amount)} across principal, interest, penalty, fees and product buckets. The decision is stored verbatim on the collection.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><div className="full-field"><span className="form-note">Bucket amounts must not exceed the collected total of {formatAmount(record.amount)}.</span></div>{rows.map((row, index) => <div className="form-grid full-field" key={index}><label>Bucket<select value={row.bucket} onChange={(event) => updateRow(index, { bucket: event.target.value })}>{ALLOCATION_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}</select></label><label>Amount<input type="number" min="1" value={row.amount} onChange={(event) => updateRow(index, { amount: event.target.value })} placeholder="0" /></label>{rows.length > 1 && <button type="button" className="text-button" onClick={() => setRows((current) => current.filter((_, position) => position !== index))}>Remove</button>}</div>)}<div className="full-field"><button type="button" className="secondary-button" onClick={() => setRows((current) => [...current, { bucket: 'Interest', amount: '' }])}>Add bucket</button></div><label className="full-field">Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reasoning behind the allocation split" /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} {saving ? 'Saving…' : 'Save allocation'}</button></div></form></section></div>;
}

// ---------------------------------------------------------------------------
// Delete-duplicate modal (M.D. | manager)
// ---------------------------------------------------------------------------

export function DeleteDuplicateActionModal({ record, onClose, onSave }: { record: CollectionRecord; onClose: () => void; onSave: (input: DeleteDuplicateInput) => Promise<void> }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        if (!reason.trim()) { setError('A reason is required to remove a duplicate entry.'); return; }
        setSaving(true);
        try {
            await onSave({ reason: reason.trim() });
        } finally {
            setSaving(false);
        }
    };

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label={`Delete duplicate ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">DUPLICATE ENTRY</div><h2>Remove duplicate · {record.id}</h2><p>Soft-deletes the duplicate entry only. The receipt record is retained and the entry stays recoverable on the audit trail.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label className="full-field">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why this entry is a duplicate (original receipt reference, double sync, etc.)" /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} {saving ? 'Removing…' : 'Remove duplicate'}</button></div></form></section></div>;
}

// ---------------------------------------------------------------------------
// Reversal modal (M.D.)
// ---------------------------------------------------------------------------

export function ReverseActionModal({ record, onClose, onSave }: { record: CollectionRecord; onClose: () => void; onSave: (input: ReverseCollectionInput) => Promise<void> }) {
    const [reason, setReason] = useState('');
    const [customerNotified, setCustomerNotified] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        if (!reason.trim()) { setError('A reason is required to reverse a disputed collection.'); return; }
        if (!customerNotified) { setError('Confirm the customer has been notified of the reversal.'); return; }
        setSaving(true);
        try {
            await onSave({ reason: reason.trim(), customerNotified: true });
        } finally {
            setSaving(false);
        }
    };

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label={`Reverse collection ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">DISPUTE RESOLUTION</div><h2>Reverse · {record.id}</h2><p>Reverses {formatAmount(record.amount)} collected from {record.customerName}. Reversal is implemented as a compensating entry — the original is never edited. A corrected entry, if needed, is recorded separately.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label className="full-field">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Dispute details and the proof of record backing this resolution" /></label><label className="full-field"><span>Customer notified</span><input type="checkbox" checked={customerNotified} onChange={(event) => setCustomerNotified(event.target.checked)} /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} {saving ? 'Reversing…' : 'Reverse collection'}</button></div></form></section></div>;
}

// ---------------------------------------------------------------------------
// Detail drawer with the office actions
// ---------------------------------------------------------------------------

export function CollectionDetail({ record, onClose, onToast, onReview, onAllocate, onDeleteDuplicate, onReverse }: { record: CollectionRecord; onClose: () => void; onToast: (message: string) => void; onReview: () => void; onAllocate: () => void; onDeleteDuplicate: () => void; onReverse: () => void }) {
    const { hasRole } = useAuth();
    const isMd = hasRole('managing_director');
    const canDeleteDuplicate = isMd || hasRole('manager');
    const metadata = [
        ['Receipt number', record.id],
        ['Collection id', record.collectionId],
        ['Customer reference', record.customerId],
        ['Account / loan', record.accountId],
        ['Collection agent', record.agent],
        ['Payment mode', record.paymentMethod],
        ['Receipt status', record.receiptStatus],
        ['Instrument reference', record.externalReference],
        ['Receipt kind', record.offlineSyncReference],
        ['Principal allocation', record.principalAllocation],
        ['Interest allocation', record.interestAllocation],
        ['Penalty allocation', record.penaltyAllocation],
        ['Collection batch', record.collectionBatchReference],
        ['Route evidence', record.routeEvidence],
        ['Supporting documents', record.supportingDocuments],
        ['Customer acknowledgement', record.customerAcknowledgementReference],
        ['Remarks', record.remarks || 'No remarks recorded'],
        ['Recorded', formatTimestamp(record.collectedOn)],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));

    const exportHistory = () => {
        if (!record.events.length) { onToast('No audit events have been recorded for this collection yet.'); return; }
        const header = 'Event,Date,Performed by,Note';
        const lines = record.events.map((event) => [event.type, event.date, event.performedBy, event.note].map(escapeCsv).join(','));
        const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `collection-${record.id}-history.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        onToast(`Exported ${record.events.length} audit events.`);
    };

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Collection ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">COLLECTION ENTRY / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} · {record.customerPhone} · {record.collectionType} · {formatAmount(record.amount)}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-modal-content"><div className="customer-section"><div className="customer-section-heading"><h3>Receipt & entry details</h3><StatusPill status={record.status} /></div><div className="customer-metadata-grid">{metadata.map(([label, value]) => <div className="customer-metadata-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div><div className="customer-section"><div className="customer-section-heading"><h3>Audit trail</h3><span>{record.events.length} events</span></div><div className="customer-timeline">{record.events.map((event) => <div className="customer-timeline-item" key={event.id}><div><strong>{event.type}</strong><span>{event.performedBy} · {event.date}</span></div><p>{event.note}</p></div>)}</div></div></div><div className="customer-detail-actions">{isMd && <button className="secondary-button" onClick={onReview}>Review collection</button>}{isMd && <button className="secondary-button" onClick={onAllocate}>Allocate short payment</button>}{canDeleteDuplicate && record.status !== 'Completed' && <button className="secondary-button" onClick={onDeleteDuplicate}>Remove duplicate</button>}{isMd && record.status === 'Completed' && <button className="secondary-button" onClick={onReverse}>Reverse collection</button>}<button className="secondary-button" onClick={exportHistory}>Export history</button><button className="secondary-button" onClick={onClose}>Close</button></div></section></div>;
}

// ---------------------------------------------------------------------------
// List page
// ---------------------------------------------------------------------------

export function ScopedCollectionsPage() {
    const { hasRole } = useAuth();
    const isMd = hasRole('managing_director');
    const [collectionRows, setCollectionRows] = useState<CollectionRecord[]>([]);
    const [totalAmount, setTotalAmount] = useState<string>('0');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'All' | CollectionRecord['collectionType']>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | CollectionRecord['status']>('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [modal, setModal] = useState<'entry' | 'review' | 'allocate' | 'delete-duplicate' | 'reverse' | 'detail' | null>(null);
    const [selected, setSelected] = useState<CollectionRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };

    useEffect(() => {
        let active = true;
        setLoading(true);
        collectionsRepository.list({ search, status: statusFilter, type: typeFilter, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
            .then((rows) => { if (active) setCollectionRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load collections.')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [search, statusFilter, typeFilter, dateFrom, dateTo, refreshKey]);

    useEffect(() => {
        let active = true;
        collectionsRepository.totals({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
            .then((totals) => { if (active) setTotalAmount(totals.total); })
            .catch(() => undefined);
        return () => { active = false; };
    }, [dateFrom, dateTo, refreshKey]);

    const pageCount = Math.max(1, Math.ceil(collectionRows.length / pageSize));
    const visibleRows = collectionRows.slice((page - 1) * pageSize, page * pageSize);
    const pendingAmount = collectionRows.filter((row) => row.status !== 'Completed').reduce((total, row) => total + row.amount, 0);

    const refresh = () => setRefreshKey((key) => key + 1);

    const openDetail = (record: CollectionRecord) => { setSelected(record); setModal('detail'); };

    const submitEmergency = async (input: EmergencyApprovalInput) => {
        try {
            await collectionsRepository.emergencyApprove(input);
            close();
            notify('Emergency collection recorded and approved.');
            refresh();
        } catch (reason) {
            notify(messageFor(reason, 'Unable to record the collection.'));
        }
    };

    const submitReview = async (input: ReviewCollectionInput) => {
        if (!selected) return;
        try {
            await collectionsRepository.review(selected.collectionId, input);
            close();
            notify(`Collection ${selected.id} marked ${input.decision}.`);
            refresh();
        } catch (reason) {
            notify(messageFor(reason, 'Unable to record the review decision.'));
        }
    };

    const submitAllocation = async (input: AllocateCollectionInput) => {
        if (!selected) return;
        try {
            await collectionsRepository.allocate(selected.collectionId, input);
            close();
            notify(`Allocation saved for ${selected.id}.`);
            refresh();
        } catch (reason) {
            notify(messageFor(reason, 'Unable to save the allocation.'));
        }
    };

    const submitDeleteDuplicate = async (input: DeleteDuplicateInput) => {
        if (!selected) return;
        try {
            await collectionsRepository.deleteDuplicate(selected.collectionId, input);
            close();
            notify(`Duplicate ${selected.id} removed.`);
            refresh();
        } catch (reason) {
            notify(messageFor(reason, 'Unable to remove the duplicate entry.'));
        }
    };

    const submitReverse = async (input: ReverseCollectionInput) => {
        if (!selected) return;
        try {
            await collectionsRepository.reverse(selected.collectionId, input);
            close();
            notify(`Collection ${selected.id} reversed and the customer notified.`);
            refresh();
        } catch (reason) {
            notify(messageFor(reason, 'Unable to reverse the collection.'));
        }
    };

    const exportRows = () => {
        if (!collectionRows.length) { notify('No collections to export for the current filters.'); return; }
        const header = 'Receipt,Customer,Type,Amount,Agent,Collected,Status,Mode';
        const lines = collectionRows.map((row) => [row.id, row.customerName, row.collectionType, String(row.amount), row.agent, row.collectedOn, row.status, row.paymentMethod ?? ''].map(escapeCsv).join(','));
        const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'collections.csv';
        anchor.click();
        URL.revokeObjectURL(url);
        notify(`Exported ${collectionRows.length} collections.`);
    };

    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / DOORSTEP COLLECTIONS</div><h1>Collections</h1><p>Review synced doorstep collections, record emergency entries and resolve disputes against the audit trail.</p></div>{isMd && <button className="primary-button" onClick={() => setModal('entry')}><ArrowDownToLine size={16} /> Record collection</button>}</div>
        <SummaryStrip items={[{ label: 'Total collected', value: formatAmount(totalAmount), tone: 'green' }, { label: 'Entries in view', value: String(collectionRows.length) }, { label: 'Pending review', value: String(collectionRows.filter((row) => row.status === 'Pending' || row.status === 'Review').length), tone: 'orange' }, { label: 'Value awaiting review', value: formatAmount(pendingAmount), tone: 'orange' }]} />
        <section className="panel table-panel">
            <div className="filter-bar">
                <div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search receipt, customer, agent or reference..." aria-label="Search collections" /></div>
                <select className="filter-button customer-status-filter" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as typeof typeFilter); setPage(1); }} aria-label="Filter collections by type"><option value="All">All collection types</option><option>Daily collection</option><option>RD installment</option><option>Loan repayment</option><option>Penalty</option></select>
                <select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | CollectionRecord['status']); setPage(1); }} aria-label="Filter collections by status"><option value="All">All statuses</option><option>Completed</option><option>Pending</option><option>Review</option><option>Rejected</option></select>
                <label className="filter-button"><CalendarDays size={15} /> From<input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} aria-label="Filter collections from date" /></label>
                <label className="filter-button"><CalendarDays size={15} /> To<input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} aria-label="Filter collections to date" /></label>
                <button className="filter-button" onClick={exportRows}><Download size={15} /> Export</button>
            </div>
            <div className="data-table-wrap">
                <table className="data-table">
                    <thead><tr><th>Customer</th><th>Receipt</th><th>Type</th><th>Amount</th><th>Agent</th><th>Status</th><th>Sync</th><th aria-label="Actions" /></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={8} className="empty-state"><Loader2 className="spin" size={16} /> Loading collections…</td></tr> : visibleRows.length ? visibleRows.map((record) => <tr key={record.collectionId}><td><strong>{record.customerName}</strong><span>{record.customerId} · {record.customerPhone}</span></td><td><strong>{record.id}</strong><span>{formatTimestamp(record.collectedOn)}</span></td><td>{record.collectionType}</td><td className="collection-amount">{formatAmount(record.amount)}</td><td>{record.agent}</td><td><StatusPill status={record.status} /></td><td><span className="table-muted">{record.syncStatus}</span></td><td><div className="customer-table-actions"><button className="icon-button" onClick={() => openDetail(record)} aria-label={`Open collection ${record.id}`}><ChevronRight size={16} /></button></div></td></tr>) : <tr><td colSpan={8} className="empty-state"><strong>No collections found</strong><span>Adjust the search or filters to see recorded doorstep collections.</span></td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="pagination">
                <span>Showing {collectionRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, collectionRows.length)} of {collectionRows.length}</span>
                <div>
                    <button className="pagination-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Prev</button>
                    <button className="pagination-button selected">{page}</button>
                    <button className="pagination-button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>Next</button>
                </div>
            </div>
        </section>
        {modal === 'entry' && isMd && <EmergencyApprovalModal onClose={close} onSave={submitEmergency} />}
        {modal === 'review' && selected && <ReviewActionModal record={selected} onClose={close} onSave={submitReview} />}
        {modal === 'allocate' && selected && <AllocateActionModal record={selected} onClose={close} onSave={submitAllocation} />}
        {modal === 'delete-duplicate' && selected && <DeleteDuplicateActionModal record={selected} onClose={close} onSave={submitDeleteDuplicate} />}
        {modal === 'reverse' && selected && <ReverseActionModal record={selected} onClose={close} onSave={submitReverse} />}
        {modal === 'detail' && selected && <CollectionDetail record={selected} onClose={close} onToast={notify} onReview={() => setModal('review')} onAllocate={() => setModal('allocate')} onDeleteDuplicate={() => setModal('delete-duplicate')} onReverse={() => setModal('reverse')} />}
        {toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}
    </div>;
}
