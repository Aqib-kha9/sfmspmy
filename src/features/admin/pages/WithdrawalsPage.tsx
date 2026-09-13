// OPERATIONS / Withdrawals.

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, Download, Filter, Loader2, Plus, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { withdrawalsRepository } from '../services/operations/withdrawalsApiRepository';
import type { WithdrawalInput as RepoWithdrawalInput } from '../services/operations/withdrawalsApiRepository';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer } from '../../customers/types/customer.types';
import type { CustomerOption } from '../../customers/services/customerRepository';
import { messageFor } from '../services/operations/helpers';
import { useAuth } from '../../auth/AuthContext';
import { HIGH_VALUE_WITHDRAWAL_LIMIT } from '../../../lib/permissions/permissions';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';

export type WithdrawalEvent = {
    id: string;
    type: 'Requested' | 'Approved' | 'Rejected' | 'Marked for review' | 'Settled';
    date: string;
    performedBy: string;
    reference: string;
    note: string;
};

export type WithdrawalRecord = {
    id: string;
    withdrawalId?: string;
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

export type WithdrawalInput = Pick<WithdrawalRecord, 'customerId' | 'sourceAccountType' | 'sourceAccountId' | 'amount' | 'requestedOn' | 'requestedBy' | 'channel' | 'reference' | 'note'> & Partial<Pick<WithdrawalRecord, 'identityVerificationReference' | 'purposeCode' | 'destinationAccountReference' | 'bankUtrOrExternalReference' | 'supportingDocuments' | 'consentReference' | 'cashHandoverReference' | 'makerReference' | 'deviceReference' | 'location' | 'offlineSyncReference'>>;

export type WithdrawalActionInput = { decision: 'Approved' | 'Rejected' | 'Marked for review'; reviewer: string; decisionDate: string; reference: string; note: string; checkerReference?: string; rejectionReason?: string };

export type WithdrawalSettlementInput = { payoutMethod: NonNullable<WithdrawalRecord['payoutMethod']>; settlementDate: string; settlementReference: string; note: string; operator: string; settlementOperator?: string; cashHandoverReference?: string; bankUtrOrExternalReference?: string };

/** Minimum balance a savings account must retain after a withdrawal (society rule). */
export const MIN_SAVINGS_BALANCE = 100;

/** Maps a customer service row type onto the withdrawal source account type. */
export function withdrawalSourceType(serviceType: string): WithdrawalRecord['sourceAccountType'] {
    if (serviceType === 'Savings') return 'Regular savings';
    if (serviceType === 'Recurring deposit') return 'Recurring deposit';
    if (serviceType === 'Fixed deposit') return 'Fixed deposit';
    return 'Regular savings';
}

/**
 * Account lifecycle states a withdrawal may actually be drawn from. Mirrors the
 * backend resolveWithdrawalSource rules so an inactive account is rejected in the
 * form instead of coming back as a server-side ACCOUNT_NOT_ACTIVE error.
 * Savings and RD must be active; an FD may also be encashed once matured.
 */
export function withdrawalSourceEligible(serviceType: string, status: string): boolean {
    if (serviceType === 'Savings') return status === 'Active';
    if (serviceType === 'Recurring deposit') return status === 'Active';
    if (serviceType === 'Fixed deposit') return status === 'Active' || status === 'Matured';
    return false;
}

export function WithdrawalModal({ mode, record, onClose, onSave }: { mode: 'request' | 'action'; record?: WithdrawalRecord; onClose: () => void; onSave: (input: WithdrawalInput | WithdrawalActionInput) => Promise<void> }) {
    const { hasRole } = useAuth();
    const [customerId, setCustomerId] = useState(record?.customerId ?? '');
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerLabel, setCustomerLabel] = useState('');
    const [customerDetails, setCustomerDetails] = useState<ApiCustomer | undefined>();
    const [sourceAccounts, setSourceAccounts] = useState<ApiCustomer['services']>([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');
    const [accountType, setAccountType] = useState<WithdrawalRecord['sourceAccountType']>(record?.sourceAccountType ?? 'Regular savings');
    const [accountId, setAccountId] = useState(record?.sourceAccountId ?? '');
    const [amount, setAmount] = useState(String(record?.amount ?? ''));
    const [requestedOn, setRequestedOn] = useState(record?.requestedOn ?? '');
    const [requestedBy, setRequestedBy] = useState<WithdrawalRecord['requestedBy']>(record?.requestedBy ?? 'Customer');
    const [channel, setChannel] = useState<WithdrawalRecord['channel']>(record?.channel ?? 'Customer request');
    const [reference, setReference] = useState(record?.reference ?? '');
    // Stable audit reference for a new request, generated once so retrying the form
    // cannot create duplicated identifiers. Operators may override it via the field.
    const [draftReference] = useState(() => `WD-${Date.now().toString(36).toUpperCase()}`);
    const [note, setNote] = useState(record?.note ?? '');
    const [identityVerificationReference, setIdentityVerificationReference] = useState(record?.identityVerificationReference ?? '');
    const [purposeCode, setPurposeCode] = useState(record?.purposeCode ?? '');
    const [destinationAccountReference, setDestinationAccountReference] = useState(record?.destinationAccountReference ?? '');
    const [bankUtrOrExternalReference, setBankUtrOrExternalReference] = useState(record?.bankUtrOrExternalReference ?? '');
    const [supportingDocuments, setSupportingDocuments] = useState(record?.supportingDocuments ?? '');
    const [consentReference, setConsentReference] = useState(record?.consentReference ?? '');
    const [cashHandoverReference, setCashHandoverReference] = useState(record?.cashHandoverReference ?? '');
    const [makerReference, setMakerReference] = useState(record?.makerReference ?? '');
    const [deviceReference, setDeviceReference] = useState(record?.deviceReference ?? '');
    const [location, setLocation] = useState(record?.location ?? '');
    const [offlineSyncReference, setOfflineSyncReference] = useState(record?.offlineSyncReference ?? '');
    const [decision, setDecision] = useState<WithdrawalActionInput['decision']>('Approved');
    const [reviewer, setReviewer] = useState('');
    const [checkerReference, setCheckerReference] = useState(record?.checkerReference ?? '');
    const [rejectionReason, setRejectionReason] = useState(record?.rejectionReason ?? '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    // Loads the selectable customer list and re-queries the backend as the operator
    // types, so the dropdown stays accurate for large registries. Each option's
    // value is the raw customer UUID that the withdrawal API expects.
    useEffect(() => {
        if (mode !== 'request') return undefined;
        let active = true;
        setCustomerLoading(true);
        const handle = window.setTimeout(() => {
            customerRepository.options(customerSearch.trim(), 100)
                .then((rows) => { if (active) { setCustomers(rows); setCustomerError(''); } })
                .catch((reason: unknown) => { if (active) setCustomerError(messageFor(reason, 'Unable to load customers for selection.')); })
                .finally(() => { if (active) setCustomerLoading(false); });
        }, 300);
        return () => { active = false; window.clearTimeout(handle); };
    }, [customerSearch, mode]);
    // Selecting a customer pre-fills the withdrawal's source account from that
    // customer's live services (the service id is the raw account UUID the create
    // API requires). Loan accounts are skipped because a loan-surplus withdrawal
    // keys off the loan id, which is not the same record.
    const selectCustomer = (id: string) => {
        setCustomerId(id);
        setCustomerError('');
        if (!id) { setCustomerDetails(undefined); setSourceAccounts([]); setCustomerLabel(''); return; }
        setCustomerLoading(true);
        customerRepository.detail(id)
            .then((customer) => {
                setCustomerDetails(customer);
                setCustomerLabel(`${customer.name} · ${customer.phone}`.trim());
                // Loan accounts are excluded: a loan-surplus withdrawal keys off a held
                // surplus balance rather than the loan id, so those requests are raised
                // from the loan module. The operator can still switch between the
                // remaining savings / RD / FD accounts in the source account selector.
                const sources = customer.services.filter((service) => service.type !== 'Loan');
                setSourceAccounts(sources);
                // Prefill an account the backend will accept; fall back to the first
                // account so the operator still sees what the customer holds.
                const eligible = sources.filter((service) => withdrawalSourceEligible(service.type, service.status));
                const preferred = eligible.find((service) => service.type === 'Savings') ?? eligible[0] ?? sources[0];
                if (preferred) {
                    setAccountType(withdrawalSourceType(preferred.type));
                    setAccountId(preferred.id);
                }
            })
            .catch((reason: unknown) => setCustomerError(messageFor(reason, 'Unable to load the selected customer.')))
            .finally(() => setCustomerLoading(false));
    };
    // Updates the source account and keeps the derived account type in step with it.
    const selectSourceAccount = (serviceId: string) => {
        setAccountId(serviceId);
        const service = sourceAccounts.find((item) => item.id === serviceId);
        if (service) setAccountType(withdrawalSourceType(service.type));
    };
    // The chosen source account drives the live balance display and the same
    // insufficient-balance / minimum-balance guards the backend enforces, so an
    // operator cannot submit a request that is certain to be rejected.
    const selectedAccount = sourceAccounts.find((service) => service.id === accountId);
    const selectedAccountBalance = selectedAccount ? Number(selectedAccount.amount) : NaN;
    const hasAccountBalance = Number.isFinite(selectedAccountBalance);
    const withdrawalAmount = Number(amount);
    const hasWithdrawalAmount = amount.trim().length > 0 && Number.isFinite(withdrawalAmount) && withdrawalAmount > 0;
    const amountExceedsBalance = Boolean(selectedAccount && hasWithdrawalAmount && withdrawalAmount > selectedAccountBalance);
    const projectedBalance = hasAccountBalance && hasWithdrawalAmount ? selectedAccountBalance - withdrawalAmount : NaN;
    // A savings account must retain at least the minimum balance after withdrawal
    // unless it is being fully closed (mirrors the backend MIN_BALANCE_VIOLATION rule).
    const breachesMinimumBalance = Boolean(selectedAccount && selectedAccount.type === 'Savings' && hasWithdrawalAmount && !amountExceedsBalance && Number.isFinite(projectedBalance) && projectedBalance > 0 && projectedBalance < MIN_SAVINGS_BALANCE);
    const insufficientBalance = amountExceedsBalance || breachesMinimumBalance;
    // The backend only draws a withdrawal from an active account (an FD may also be
    // encashed once matured), so an inactive source is caught before submission.
    const selectedAccountEligible = selectedAccount ? withdrawalSourceEligible(selectedAccount.type, selectedAccount.status) : true;
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            if (mode === 'request') {
                if (!customerId.trim() || !accountId.trim() || !amount || Number(amount) <= 0 || !requestedOn || !note.trim()) { setError('Customer, source account, amount, date and reason are required.'); return; }
                if (sourceAccounts.length === 0) { setError('This customer has no savings, RD or FD account to withdraw from. Loan-surplus releases are raised from the loan module.'); return; }
                if (!selectedAccount) { setError('Select a customer so the source account can be verified against its live balance.'); return; }
                if (!selectedAccountEligible) { setError(`The selected ${selectedAccount.type} account is ${selectedAccount.status} and cannot fund a withdrawal. Choose an active account, or close it through its own module.`); return; }
                if (amountExceedsBalance) { setError(`Insufficient balance: the request exceeds the available balance of Rs ${selectedAccountBalance.toLocaleString('en-IN')} in this account.`); return; }
                if (breachesMinimumBalance) { setError(`A savings account must retain at least Rs ${MIN_SAVINGS_BALANCE} after withdrawal. Reduce the amount or withdraw the full balance to close the account.`); return; }
                await onSave({ customerId: customerId.trim(), sourceAccountType: accountType, sourceAccountId: accountId.trim(), amount: Number(amount), requestedOn, requestedBy, channel, reference: reference.trim() || draftReference, note: note.trim(), identityVerificationReference: identityVerificationReference.trim(), purposeCode: purposeCode.trim(), destinationAccountReference: destinationAccountReference.trim(), bankUtrOrExternalReference: bankUtrOrExternalReference.trim(), supportingDocuments: supportingDocuments.trim(), consentReference: consentReference.trim(), cashHandoverReference: cashHandoverReference.trim(), makerReference: makerReference.trim(), deviceReference: deviceReference.trim(), location: location.trim(), offlineSyncReference: offlineSyncReference.trim() });
                return;
            }
            if (!record || !reviewer.trim() || !requestedOn || !reference.trim() || !note.trim()) { setError('Reviewer, decision date, authorization reference and note are required.'); return; }
            if (decision === 'Approved' && record.amount > HIGH_VALUE_WITHDRAWAL_LIMIT && !hasRole('president')) { setError('Withdrawals above Rs 2,00,000 require approval by the President. Sign in with the President role to authorise this payout.'); return; }
            await onSave({ decision, reviewer: reviewer.trim(), decisionDate: requestedOn, reference: reference.trim(), note: note.trim(), checkerReference: checkerReference.trim(), rejectionReason: rejectionReason.trim() });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'request' ? 'Create withdrawal request' : 'Authorize withdrawal'}><div className="admin-modal-header"><div><div className="eyebrow">WITHDRAWAL WORKFLOW</div><h2>{mode === 'request' ? 'Create withdrawal request' : `Authorize · ${record?.id}`}</h2><p>{mode === 'request' ? 'Capture the customer, source account and controlled withdrawal request details.' : 'Record an approval, rejection or additional review decision with an audit reference.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>{mode === 'request' ? <><label className="full-field">Search customer<input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label><label className="full-field">Customer<select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customerLabel && !customers.some((option) => option.id === customerId) ? <option value={customerId}>{customerLabel}</option> : null}{customers.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.customerNumber}</option>)}</select></label>{customerError ? <p className="form-error full-field">{customerError}</p> : null}{customerDetails ? <p className="form-note full-field">Withdrawal for {customerDetails.name} · {customerDetails.phone}{customerDetails.branch ? ` · ${customerDetails.branch}` : null}</p> : null}{selectedAccount ? <p className={insufficientBalance || !selectedAccountEligible ? 'form-error full-field' : 'form-note full-field'}>Available balance in {selectedAccount.accountNumber} · {selectedAccount.label} ({selectedAccount.status}): ₹{selectedAccountBalance.toLocaleString('en-IN')}{hasWithdrawalAmount && !amountExceedsBalance && Number.isFinite(projectedBalance) ? ` · balance after withdrawal ₹${projectedBalance.toLocaleString('en-IN')}` : null}</p> : null}{sourceAccounts.length ? <label className="full-field">Source account<select value={accountId} onChange={(event) => selectSourceAccount(event.target.value)} aria-label="Select source account">{sourceAccounts.map((service) => <option key={service.id} value={service.id}>{service.type} · {service.accountNumber} · ₹{Number(service.amount).toLocaleString('en-IN')} · {service.status}</option>)}</select></label> : null}<label>Source account type<select disabled={sourceAccounts.length > 0} value={accountType} onChange={(event) => setAccountType(event.target.value as WithdrawalRecord['sourceAccountType'])}><option>Regular savings</option><option>Recurring deposit</option><option>Fixed deposit</option></select></label><label>Source account ID<input value={accountId} readOnly onChange={(event) => setAccountId(event.target.value)} placeholder="Account ID" /></label><label>Withdrawal amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="18000" aria-invalid={insufficientBalance} />{amountExceedsBalance ? <small className="form-error">Insufficient balance: available ₹{selectedAccountBalance.toLocaleString('en-IN')}.</small> : null}{breachesMinimumBalance ? <small className="form-error">Savings account must retain at least ₹{MIN_SAVINGS_BALANCE} after withdrawal.</small> : null}</label><label>Request reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={draftReference} /></label><label>Request date<input type="date" value={requestedOn} onChange={(event) => setRequestedOn(event.target.value)} /></label><label>Requested by<select value={requestedBy} onChange={(event) => setRequestedBy(event.target.value as WithdrawalRecord['requestedBy'])}><option>Customer</option><option>Branch counter</option><option>Collection agent</option></select></label><label>Request channel<select value={channel} onChange={(event) => setChannel(event.target.value as WithdrawalRecord['channel'])}><option>Branch counter</option><option>Doorstep agent</option><option>Customer request</option></select></label><label>Identity verification reference<input value={identityVerificationReference} onChange={(event) => setIdentityVerificationReference(event.target.value)} placeholder="KYC / verification reference" /></label><label>Purpose code<input value={purposeCode} onChange={(event) => setPurposeCode(event.target.value)} placeholder="Purpose or reason code" /></label><label>Destination account reference<input value={destinationAccountReference} onChange={(event) => setDestinationAccountReference(event.target.value)} placeholder="Destination account / beneficiary" /></label><label>Bank UTR / external reference<input value={bankUtrOrExternalReference} onChange={(event) => setBankUtrOrExternalReference(event.target.value)} placeholder="Bank or external reference" /></label><label>Consent reference<input value={consentReference} onChange={(event) => setConsentReference(event.target.value)} placeholder="Consent record reference" /></label><label>Cash handover reference<input value={cashHandoverReference} onChange={(event) => setCashHandoverReference(event.target.value)} placeholder="Cash handover reference" /></label><label>Maker reference<input value={makerReference} onChange={(event) => setMakerReference(event.target.value)} placeholder="Request maker reference" /></label><label>Device reference<input value={deviceReference} onChange={(event) => setDeviceReference(event.target.value)} placeholder="Capture device reference" /></label><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Branch or collection location" /></label><label>Offline sync reference<input value={offlineSyncReference} onChange={(event) => setOfflineSyncReference(event.target.value)} placeholder="Offline capture / sync reference" /></label><label className="full-field">Supporting documents<textarea value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} placeholder="Document references" /></label><label className="full-field">Request note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason and customer request details" /></label></> : <><label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value as WithdrawalActionInput['decision'])}><option>Approved</option><option>Rejected</option><option>Marked for review</option></select></label><label>Reviewer<input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label><label>Decision date<input type="date" value={requestedOn} onChange={(event) => setRequestedOn(event.target.value)} /></label><label>Authorization reference<input value={reference} onChange={(event) => setReference(event.target.value)} /></label><label>Checker reference<input value={checkerReference} onChange={(event) => setCheckerReference(event.target.value)} placeholder="Second reviewer / checker reference" /></label><label>Rejection reason<input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Capture when applicable" /></label><label className="full-field">Decision note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Approval, rejection or review details" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : 'Save locally'}</button></div></form></section></div>;
}

export function WithdrawalSettlementModal({ record, onClose, onSave }: { record: WithdrawalRecord; onClose: () => void; onSave: (input: WithdrawalSettlementInput) => Promise<void> }) {
    const [payoutMethod, setPayoutMethod] = useState<NonNullable<WithdrawalRecord['payoutMethod']>>(record.payoutMethod ?? 'Cash');
    const [settlementDate, setSettlementDate] = useState(record.settlementDate ?? '');
    const [settlementReference, setSettlementReference] = useState(record.settlementReference ?? '');
    const [operator, setOperator] = useState('');
    const [settlementOperator, setSettlementOperator] = useState(record.settlementOperator ?? '');
    const [cashHandoverReference, setCashHandoverReference] = useState(record.cashHandoverReference ?? '');
    const [bankUtrOrExternalReference, setBankUtrOrExternalReference] = useState(record.bankUtrOrExternalReference ?? '');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault(); if (record.status !== 'Approved') { setError('Only an approved withdrawal can be settled.'); return; } if (!settlementDate || !settlementReference.trim() || !operator.trim() || !note.trim()) { setError('Settlement date, payout reference, operator and settlement note are required.'); return; } await onSave({ payoutMethod, settlementDate, settlementReference: settlementReference.trim(), operator: operator.trim(), settlementOperator: settlementOperator.trim(), cashHandoverReference: cashHandoverReference.trim(), bankUtrOrExternalReference: bankUtrOrExternalReference.trim(), note: note.trim() });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Settle withdrawal ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">WITHDRAWAL WORKFLOW</div><h2>Settle · {record.id}</h2><p>Record the controlled payout after authorization. Settlement is the step that completes the withdrawal.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label>Payout method<select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value as NonNullable<WithdrawalRecord['payoutMethod']>)}><option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>Mobile money</option></select></label><label>Settlement date<input type="date" value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} /></label><label>Settlement reference<input value={settlementReference} onChange={(event) => setSettlementReference(event.target.value)} placeholder="CASH-00880 or bank UTR" /></label><label>Settled by<input value={operator} onChange={(event) => setOperator(event.target.value)} /></label><label>Settlement operator<input value={settlementOperator} onChange={(event) => setSettlementOperator(event.target.value)} placeholder="Operator or counterparty" /></label><label>Cash handover reference<input value={cashHandoverReference} onChange={(event) => setCashHandoverReference(event.target.value)} placeholder="Cash handover evidence" /></label><label>Bank UTR / external reference<input value={bankUtrOrExternalReference} onChange={(event) => setBankUtrOrExternalReference(event.target.value)} placeholder="Settlement bank reference" /></label><label className="full-field">Settlement note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record payout verification and handover details." /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : 'Complete settlement'}</button></div></form></section></div>;
}

export function WithdrawalDetail({ record, onClose, onAction, onSettle, onToast }: { record: WithdrawalRecord; onClose: () => void; onAction: () => void; onSettle: () => void; onToast: (message: string) => void }) {
    const [exporting, setExporting] = useState(false);
    // The backend returns a phone only when customer.mobile is on file; de-duplicate
    // the identity line so the header never repeats the same value twice.
    const identity = [record.customerId, record.customerPhone, 'Controlled account transaction'].filter((part, index, all) => part && part !== 'Not available' && all.indexOf(part) === index).join(' · ');
    // Exports exactly the event trail the backend returned from GET /:id/history.
    const exportTrail = () => {
        if (exporting) return;
        if (!record.events.length) { onToast('No audit events have been recorded for this withdrawal yet.'); return; }
        setExporting(true);
        try {
            const rows = [['Event', 'Date', 'Performed by', 'Reference', 'Note'], ...record.events.map((event) => [event.type, event.date, event.performedBy, event.reference, event.note])];
            const csv = rows.map((cells) => cells.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'withdrawal-' + record.id + '-audit-trail-' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            onToast('Exported ' + record.events.length + ' audit events from the backend.');
        } finally {
            setExporting(false);
        }
    };
    const metadata = [['Identity verification', record.identityVerificationReference], ['Purpose code', record.purposeCode], ['Destination account', record.destinationAccountReference], ['Bank UTR / external reference', record.bankUtrOrExternalReference], ['Supporting documents', record.supportingDocuments], ['Consent reference', record.consentReference], ['Cash handover reference', record.cashHandoverReference], ['Maker reference', record.makerReference], ['Checker reference', record.checkerReference], ['Rejection reason', record.rejectionReason], ['Device reference', record.deviceReference], ['Location', record.location], ['Offline sync reference', record.offlineSyncReference], ['Settlement operator', record.settlementOperator]] as const;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Withdrawal ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">WITHDRAWAL REQUEST / {record.id}</div><h2>{record.customerName}</h2><p>{identity}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.reference}</strong><span>{record.channel} · Requested {record.requestedOn}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>Withdrawal amount</span><strong className="withdrawal-amount">₹{record.amount.toLocaleString('en-IN')}</strong></div><div><span>Source account</span><strong>{record.sourceAccountId}</strong></div><div><span>Account type</span><strong>{record.sourceAccountType}</strong></div><div><span>Requested by</span><strong>{record.requestedBy}</strong></div><div><span>Authorized by</span><strong>{record.authorizedBy ?? 'Awaiting authorization'}</strong></div><div><span>Decision date</span><strong>{record.decisionDate ?? 'Pending'}</strong></div><div><span>Payout method</span><strong>{record.payoutMethod ?? 'Not settled'}</strong></div><div><span>Settlement date</span><strong>{record.settlementDate ?? 'Pending settlement'}</strong></div><div><span>Settlement reference</span><strong>{record.settlementReference ?? 'Not settled'}</strong></div>{metadata.filter(([, value]) => value).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not captured'}</strong></div>)}<div><span>Reason / notes</span><strong>{record.note}</strong></div><div><span>Audit events</span><strong>{record.events.length}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Withdrawal history</h3><p>Every request, authorization, settlement and confirmation recorded by the backend for this withdrawal.</p></div><span>{record.events.length} events</span></div><div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.performedBy}</span></div><div><b>{event.reference}</b><small>{event.note}</small></div></div>)}</div></section><div className="customer-detail-actions"><button className="secondary-button" onClick={exportTrail} disabled={exporting}>{exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />} Export audit trail (CSV)</button>{record.status !== 'Completed' && record.status !== 'Rejected' && <button className="primary-button" onClick={onAction}><ShieldCheck size={15} /> Review request</button>}{record.status === 'Approved' && <button className="primary-button" onClick={onSettle}><CheckCircle2 size={15} /> Settle payout</button>}</div></section></div>;
}

export function WithdrawalsPage() {
    const [withdrawalRows, setWithdrawalRows] = useState<WithdrawalRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [showRange, setShowRange] = useState(false);
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    const [exporting, setExporting] = useState(false);
    const [modal, setModal] = useState<'request' | 'action' | 'settlement' | 'detail' | null>(null);
    const [selected, setSelected] = useState<WithdrawalRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    useEffect(() => {
        let active = true;
        withdrawalsRepository
            .list()
            .then((rows) => { if (active) setWithdrawalRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load withdrawals from the backend.')); });
        return () => { active = false; };
    }, []);
    // Range filtering uses the real ISO request date the backend returns for each request.
    const withinRange = (row: WithdrawalRecord) => {
        if (!rangeFrom && !rangeTo) return true;
        const requested = row.requestedOn ? row.requestedOn.slice(0, 10) : '';
        if (!requested) return false;
        if (rangeFrom && requested < rangeFrom) return false;
        if (rangeTo && requested > rangeTo) return false;
        return true;
    };
    const filteredRows = withdrawalRows.filter((row) => withinRange(row) && `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.sourceAccountType} ${row.sourceAccountId} ${row.requestedBy} ${row.channel} ${row.reference} ${row.note}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const pendingCount = withdrawalRows.filter((row) => row.status === 'Pending').length;
    const reviewCount = withdrawalRows.filter((row) => row.status === 'Review').length;
    const approvedAmount = withdrawalRows.filter((row) => row.status === 'Approved' || row.status === 'Completed').reduce((total, row) => total + row.amount, 0);
    const monthAmount = withdrawalRows.filter((row) => row.requestedOn.startsWith(new Date().toISOString().slice(0, 7))).reduce((total, row) => total + row.amount, 0);
    // Exports exactly the backend-sourced requests currently on screen - no placeholder payload.
    const exportCsv = () => {
        if (exporting) return;
        setExporting(true);
        try {
            const header = ['Request', 'Customer', 'Customer ID', 'Phone', 'Amount', 'Source account', 'Account type', 'Requested on', 'Requested by', 'Channel', 'Status', 'Reference', 'Note'];
            const rows = filteredRows.map((row) => [row.id, row.customerName, row.customerId, row.customerPhone, String(row.amount), row.sourceAccountId, row.sourceAccountType, row.requestedOn, row.requestedBy, row.channel, row.status, row.reference, row.note].map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(','));
            const csv = [header.join(','), ...rows].join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'withdrawals-' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            notify(filteredRows.length + ' withdrawal requests exported.');
        } finally {
            setExporting(false);
        }
    };
    const saveRequest = async (input: WithdrawalInput) => {
        try {
            const payload: RepoWithdrawalInput = {
                sourceAccountType: input.sourceAccountType,
                sourceAccountId: input.sourceAccountId,
                amount: input.amount,
                requestedOn: input.requestedOn,
                requestedBy: input.requestedBy,
                channel: input.channel,
                reference: input.reference,
                note: input.note,
                identityVerificationReference: input.identityVerificationReference,
                purposeCode: input.purposeCode,
                destinationAccountReference: input.destinationAccountReference,
                bankUtrOrExternalReference: input.bankUtrOrExternalReference,
                supportingDocuments: input.supportingDocuments,
                consentReference: input.consentReference,
                cashHandoverReference: input.cashHandoverReference,
                makerReference: input.makerReference,
                deviceReference: input.deviceReference,
                location: input.location,
                offlineSyncReference: input.offlineSyncReference,
            };
            await withdrawalsRepository.create(payload);
            const refreshed = await withdrawalsRepository.list();
            setWithdrawalRows(refreshed);
            setPage(1);
            close();
            notify('Withdrawal request created.');
        } catch (reason) {
            notify(messageFor(reason, 'Unable to create withdrawal request.'));
        }
    };
    const saveAction = async (input: WithdrawalActionInput) => { if (!selected) return; try { const id = selected.withdrawalId ?? selected.id; if (input.decision === 'Approved') { await withdrawalsRepository.approve(id, input.note); } else if (input.decision === 'Rejected') { await withdrawalsRepository.reject(id, input.rejectionReason ?? input.note); } else { notify('Marked for review: the backend has no separate review action; the withdrawal remains pending for authorization.'); } const refreshed = await withdrawalsRepository.list(); setWithdrawalRows(refreshed); close(); notify(`Withdrawal ${input.decision.toLowerCase()}.`); } catch (reason) { notify(messageFor(reason, 'Unable to update withdrawal.')); } };
    const saveSettlement = async (input: WithdrawalSettlementInput) => { if (!selected || selected.status !== 'Approved') return; try { const id = selected.withdrawalId ?? selected.id; await withdrawalsRepository.pay(id, { payoutReference: input.settlementReference }); const refreshed = await withdrawalsRepository.list(); setWithdrawalRows(refreshed); close(); notify('Withdrawal settled and payout recorded.'); } catch (reason) { notify(messageFor(reason, 'Unable to settle withdrawal.')); } };
    const openDetail = async (record: WithdrawalRecord) => {
        setSelected(record);
        setModal('detail');
        try {
            // Re-reads the authoritative request (worksheet + decision evidence)
            // from GET /:id so the detail view never renders a stale list row.
            const full = await withdrawalsRepository.detail(record.withdrawalId ?? record.id);
            setSelected(full);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to load withdrawal details from the backend.'));
        }
    };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / WITHDRAWALS</div><h1>Withdrawals</h1><p>Review customer withdrawal requests, authorize payouts and maintain transaction history.</p></div><button className="primary-button" onClick={() => setModal('request')}><Plus size={16} /> New withdrawal</button></div><SummaryStrip items={[{ label: 'Pending approval', value: String(pendingCount), tone: 'orange' }, { label: 'Approved amount', value: `₹${approvedAmount.toLocaleString('en-IN')}`, tone: 'green' }, { label: 'This month', value: `₹${monthAmount.toLocaleString('en-IN')}` }, { label: 'Requires review', value: String(reviewCount), tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer, account, request or reference..." aria-label="Search withdrawals" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter withdrawals by status"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Approved">Approved</option><option value="Completed">Settled</option><option value="Rejected">Rejected</option></select><button className="filter-button" onClick={() => setShowRange((current) => !current)}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); notify('Showing withdrawal requests requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={exportCsv} disabled={exporting} aria-label="Export withdrawals">{exporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}</button></div>{showRange ? <div className="filter-bar"><label className="statement-field"><span>Requested from</span><input type="date" value={rangeFrom} onChange={(event) => { setRangeFrom(event.target.value); setPage(1); }} /></label><label className="statement-field"><span>Requested to</span><input type="date" value={rangeTo} onChange={(event) => { setRangeTo(event.target.value); setPage(1); }} /></label><button className="secondary-button" onClick={() => { setRangeFrom(''); setRangeTo(''); setPage(1); }} disabled={!rangeFrom && !rangeTo}>Clear range</button></div> : null}<div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer / Request</th><th>Amount</th><th>Source account</th><th>Request details</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.customerPhone}</span><small>{row.id} · {row.requestedBy}</small></td><td className="table-amount withdrawal-amount">₹{row.amount.toLocaleString('en-IN')}</td><td><strong>{row.sourceAccountId}</strong><span>{row.sourceAccountType}</span></td><td className="table-muted">{row.requestedOn} · {row.channel}<br />{row.reference}</td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={() => openDetail(row)} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} withdrawal requests</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button className={`pagination-button ${page === number ? 'selected' : ''}`} key={number} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'request' && <WithdrawalModal mode="request" onClose={close} onSave={(input) => saveRequest(input as WithdrawalInput)} />}{modal === 'action' && selected && <WithdrawalModal mode="action" record={selected} onClose={close} onSave={(input) => saveAction(input as WithdrawalActionInput)} />}{modal === 'settlement' && selected && <WithdrawalSettlementModal record={selected} onClose={close} onSave={saveSettlement} />}{modal === 'detail' && selected && <WithdrawalDetail record={selected} onClose={close} onAction={() => setModal('action')} onSettle={() => setModal('settlement')} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}
