// OPERATIONS / Deposits.

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, Download, Filter, Loader2, LockKeyhole, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { depositsRepository } from '../services/operations/depositsApiRepository';
import type { DepositInput as DepositRepoInput, DepositTransactionInput as DepositRepoTransactionInput, DepositRecord as DepositRecordView, DepositTransaction as DepositTransactionView, DepositStatement, DepositProduct, DepositUpdateInput, DepositStatementQuery } from '../services/operations/depositsApiRepository';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer } from '../../customers/types/customer.types';
import type { CustomerOption } from '../../customers/services/customerRepository';
import { messageFor } from '../services/operations/helpers';
import { Modal } from '../../../components/overlays/Modal';
import { formatCurrency } from '../../../lib/formatters/formatters';
import { useAuth } from '../../auth/AuthContext';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';

/**
 * The deposit record/transaction shapes are owned by the deposits adapter so
 * every displayed field traces back to a real backend response. The AdminPages
 * components consume the adapter types directly instead of redeclaring them.
 */
export type DepositTransaction = DepositTransactionView;

export type DepositRecord = DepositRecordView;

export type DepositInput = DepositRepoInput;

export type DepositTransactionInput = DepositRepoTransactionInput;

/** Ordered payment methods, mirroring the backend `paymentMethodSchema` enum. */
export const depositPaymentMethods: Array<{ value: string; label: string }> = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'mobile_money', label: 'Mobile money' },
    { value: 'upi', label: 'UPI' },
    { value: 'neft', label: 'NEFT' },
    { value: 'rtgs', label: 'RTGS' },
];

/** Labels a statement period, tolerating the backend's `0001-01-01` open start. */
export function depositStatementPeriod(from: string, to: string): string {
    const blank = (value: string) => !value || value.includes('0001') || value.toLowerCase().includes('not recorded');
    if (blank(from) && blank(to)) return 'All recorded entries';
    if (blank(from)) return `Up to ${to}`;
    if (blank(to)) return `From ${from}`;
    return `${from} to ${to}`;
}

export function DepositModal({ mode, record, onClose, onSave }: { mode: 'account' | 'transaction'; record?: DepositRecord; onClose: () => void; onSave: (input: DepositInput | DepositTransactionInput) => Promise<void> }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? '');
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerDetails, setCustomerDetails] = useState<ApiCustomer | undefined>();
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');
    const [products, setProducts] = useState<DepositProduct[]>([]);
    const [productCode, setProductCode] = useState(record?.productCode ?? '');
    const [openingAmount, setOpeningAmount] = useState('');
    const [openedOn, setOpenedOn] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [description, setDescription] = useState('');
    const [transactionType, setTransactionType] = useState<DepositTransaction['type']>('Deposit entry');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [reference, setReference] = useState('');
    const [narration, setNarration] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    // Real scheme catalogue so the operator can only book a product the backend accepts.
    useEffect(() => {
        if (mode !== 'account') return undefined;
        let active = true;
        depositsRepository.products()
            .then((rows) => { if (active) setProducts(rows); })
            .catch(() => { if (active) setProducts([]); });
        return () => { active = false; };
    }, [mode]);
    // Loads the selectable customer list and re-queries the backend as the operator
    // types, so the dropdown stays accurate for large registries. Each option's
    // value is the raw customer UUID that the deposit API expects.
    useEffect(() => {
        if (mode !== 'account') return undefined;
        let active = true;
        setCustomerLoading(true);
        const handle = window.setTimeout(() => {
            customerRepository.options(customerQuery.trim(), 100)
                .then((rows) => { if (active) { setCustomers(rows); setCustomerError(''); } })
                .catch((reason: unknown) => { if (active) setCustomerError(messageFor(reason, 'Unable to load customers for selection.')); })
                .finally(() => { if (active) setCustomerLoading(false); });
        }, 300);
        return () => { active = false; window.clearTimeout(handle); };
    }, [customerQuery, mode]);
    // Surfaces the linked customer's real profile so the operator confirms the
    // account is opened against the right member record.
    const selectCustomer = (id: string) => {
        setCustomerId(id);
        setCustomerError('');
        if (!id) { setCustomerDetails(undefined); return; }
        setCustomerLoading(true);
        customerRepository.detail(id)
            .then((customer) => setCustomerDetails(customer))
            .catch((reason: unknown) => setCustomerError(messageFor(reason, 'Unable to load the selected customer.')))
            .finally(() => setCustomerLoading(false));
    };
    const selectedProduct = products.find((product) => product.code === productCode);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            setError('');
            if (mode === 'account') {
                if (!customerId.trim() || !productCode.trim() || !openingAmount || Number(openingAmount) <= 0) { setError('Customer, scheme and opening deposit amount are required.'); return; }
                if (selectedProduct && Number(openingAmount) < selectedProduct.minOpeningAmount) { setError(`Minimum opening amount for ${selectedProduct.name} is ${formatCurrency(selectedProduct.minOpeningAmount)}.`); return; }
                await onSave({ customerId: customerId.trim(), productCode: productCode.trim(), openingAmount: Number(openingAmount), openedOn: openedOn || undefined, interestRate: interestRate ? Number(interestRate) : undefined, paymentMethod, referenceNumber: referenceNumber.trim() || undefined, description: description.trim() || undefined });
                return;
            }
            if (!record || !amount || Number(amount) <= 0) { setError('Amount is required.'); return; }
            await onSave({ type: transactionType, amount: Number(amount), date: date || undefined, reference: reference.trim() || undefined, paymentMethod, narration: narration.trim() || undefined });
        } finally { setSaving(false); }
    };
    return <Modal title={mode === 'account' ? 'Open deposit account' : `Record entry · ${record?.id ?? ''}`} eyebrow="DEPOSIT WORKFLOW" onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            {mode === 'account' ? <>
                <label className="full-field">Search customer<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label>
                <label className="full-field">Customer<select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.customerNumber}</option>)}</select></label>
                {customerError ? <p className="form-error full-field">{customerError}</p> : null}
                {customerDetails ? <p className="form-note full-field">Opening against {customerDetails.name} · {customerDetails.phone}{customerDetails.branch ? ` · ${customerDetails.branch}` : null}</p> : null}
                <label>Product / scheme<select value={productCode} onChange={(event) => setProductCode(event.target.value)} aria-label="Select deposit scheme"><option value="">{products.length ? 'Select a scheme' : 'No active schemes configured'}</option>{products.map((product) => <option key={product.id} value={product.code}>{product.name} · {product.code} · {product.interestRate}%</option>)}</select></label>
                <label>Opening deposit amount<input type="number" min="1" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="5000" /></label>
                <label>Opening date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label>
                <label>Interest rate override (%)<input type="number" min="0.01" max="25" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} placeholder={selectedProduct ? String(selectedProduct.interestRate) : 'Product default'} /></label>
                <label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{depositPaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
                <label>Instrument reference<input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder="Receipt / UTR / cheque number" /></label>
                <label className="full-field">Opening narration<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note stored on the opening ledger entry" /></label>
                {selectedProduct ? <p className="form-note full-field">{selectedProduct.name} pays {selectedProduct.interestMethod} interest {selectedProduct.interestFrequency} at {selectedProduct.interestRate}% · minimum balance {formatCurrency(selectedProduct.minBalance)}{selectedProduct.maxBalance !== undefined ? ` · maximum balance ${formatCurrency(selectedProduct.maxBalance)}` : ''}</p> : null}
            </> : <>
                <label>Transaction type<select value={transactionType} onChange={(event) => setTransactionType(event.target.value as DepositTransaction['type'])}><option>Deposit entry</option><option>Withdrawal</option></select></label>
                <label>Amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="5000" /></label>
                <label>Value date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
                <label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{depositPaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
                <label>Instrument reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Receipt / UTR / cheque number" /></label>
                <label className="full-field">Narration<textarea value={narration} onChange={(event) => setNarration(event.target.value)} /></label>
            </>}
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : (mode === 'account' ? 'Create deposit account' : 'Save transaction')}</button>
            </div>
        </form>
    </Modal>;
}

export function DepositEditModal({ record, onClose, onSave }: { record: DepositRecord; onClose: () => void; onSave: (input: DepositUpdateInput) => Promise<void> }) {
    const [products, setProducts] = useState<DepositProduct[]>([]);
    const [productCode, setProductCode] = useState(record.productCode ?? '');
    const [interestRate, setInterestRate] = useState(record.interestRate !== undefined ? String(record.interestRate) : '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        let active = true;
        depositsRepository.products()
            .then((rows) => { if (active) setProducts(rows); })
            .catch(() => { if (active) setProducts([]); });
        return () => { active = false; };
    }, []);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            setError('');
            const code = productCode.trim();
            const rate = interestRate.trim();
            const codeChanged = code !== (record.productCode ?? '');
            const rateChanged = rate !== (record.interestRate !== undefined ? String(record.interestRate) : '');
            if (!codeChanged && !rateChanged) { setError('Change the scheme or the interest rate before saving.'); return; }
            await onSave({ productCode: codeChanged && code ? code : undefined, interestRate: rateChanged && rate ? Number(rate) : undefined });
        } finally { setSaving(false); }
    };
    return <Modal title={`Edit account · ${record.id}`} eyebrow="DEPOSIT WORKFLOW" onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            <p className="form-note full-field">Only the booked scheme and the account-level interest rate can change — the backend rejects any other account field. Customer, branch and product limits stay owned by their own records.</p>
            <label>Product / scheme<select value={productCode} onChange={(event) => setProductCode(event.target.value)} aria-label="Select deposit scheme"><option value={record.productCode ?? ''}>{record.productCode ? `Keep current · ${record.productCode}` : 'Select a scheme'}</option>{products.filter((product) => product.code !== record.productCode).map((product) => <option key={product.id} value={product.code}>{product.name} · {product.code} · {product.interestRate}%</option>)}</select></label>
            <label>Interest rate override (%)<input type="number" min="0.01" max="25" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} placeholder="Product default" /></label>
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : 'Save account changes'}</button>
            </div>
        </form>
    </Modal>;
}

export function DepositStatementModal({ record, onClose }: { record: DepositRecord; onClose: () => void }) {
    const [statement, setStatement] = useState<DepositStatement | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [periodError, setPeriodError] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const load = (query: DepositStatementQuery) => {
        setLoading(true);
        depositsRepository.statement(record.id, query)
            .then((view) => { setStatement(view); setError(''); })
            .catch((reason: unknown) => setError(messageFor(reason, 'Unable to load the deposit statement from the backend.')))
            .finally(() => setLoading(false));
    };
    useEffect(() => {
        setStatement(undefined);
        load({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record.id]);
    const applyPeriod = () => {
        if (from && to && from > to) { setPeriodError('The start date cannot be after the end date.'); return; }
        setPeriodError('');
        load({ from: from || undefined, to: to || undefined });
    };
    const resetPeriod = () => { setFrom(''); setTo(''); setPeriodError(''); load({}); };
    return <Modal title={`Statement · ${record.id}`} eyebrow={`DEPOSIT STATEMENT / ${record.customerName}`} onClose={onClose} wide>
        <p className="customer-modal-intro">Every figure below is served by the backend statement service for account {record.id}.</p>
        <div className="statement-filter">
            <label className="statement-field"><span>From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="statement-field"><span>To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
            <div className="statement-filter-actions">
                <button className="primary-button" onClick={applyPeriod} disabled={loading}>{loading ? <Loader2 size={15} className="spin" /> : null}Apply period</button>
                <button className="secondary-button" onClick={resetPeriod} disabled={loading}>Reset</button>
            </div>
        </div>
        {periodError ? <p className="statement-error">{periodError}</p> : null}
        {error ? <p className="statement-error">{error}</p> : null}
        {loading ? <div className="customer-empty"><Loader2 className="spin" size={16} /> Loading statement…</div>
            : statement ? <>
                <div className="statement-summary">
                    <div className="statement-stat"><span>Opening balance</span><strong>{formatCurrency(statement.openingBalance)}</strong></div>
                    <div className="statement-stat"><span>Closing balance</span><strong>{formatCurrency(statement.closingBalance)}</strong></div>
                    <div className="statement-stat"><span>Total credits</span><strong>{formatCurrency(statement.totalCredits)}</strong></div>
                    <div className="statement-stat"><span>Total debits</span><strong>{formatCurrency(statement.totalDebits)}</strong></div>
                    <div className="statement-stat"><span>Entries</span><strong>{statement.total}</strong></div>
                </div>
                <p className="statement-period">{statement.productName} · {statement.productCode}{statement.branch ? ` · ${statement.branch}` : ''} · {depositStatementPeriod(statement.from, statement.to)}</p>
                <section className="customer-subsection">
                    <div className="customer-section-heading">
                        <div><h3>Ledger entries</h3><p>Newest first, exactly as posted by the backend.</p></div>
                        <span>{statement.entries.length} rows</span>
                    </div>
                    {statement.entries.length ? <div className="statement-table-wrap"><table className="statement-table">
                        <thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                        <tbody>{statement.entries.map((entry) => <tr key={entry.id}>
                            <td>{entry.date}</td>
                            <td><strong>{entry.description}</strong>{entry.reference || entry.paymentMethod || entry.recordedBy ? <small>{[entry.reference, entry.paymentMethod, entry.recordedBy].filter(Boolean).join(' · ')}</small> : null}</td>
                            <td className="statement-debit">{entry.direction === 'debit' ? formatCurrency(entry.amount) : '—'}</td>
                            <td className="statement-credit">{entry.direction === 'credit' ? formatCurrency(entry.amount) : '—'}</td>
                            <td>{formatCurrency(entry.balanceAfter)}</td>
                        </tr>)}</tbody>
                    </table></div> : <div className="customer-empty">No ledger entries were posted in this period.</div>}
                </section>
            </> : null}
    </Modal>;
}

export function DepositDetail({ record, onClose, onEdit, onTransaction, onStatement, onApprove, approving, canApprove }: { record: DepositRecord; onClose: () => void; onEdit: () => void; onTransaction: () => void; onStatement: () => void; onApprove: () => void; approving: boolean; canApprove: boolean }) {
    const interest = [record.interestMethod, record.interestFrequency, record.interestRate !== undefined ? `${record.interestRate}%` : undefined].filter(Boolean).join(' · ');
    const identity = [record.identityType, record.identityReference].filter(Boolean).join(' · ');
    const nominee = record.nomineeName ? `${record.nomineeName}${record.nomineeRelation ? ` · ${record.nomineeRelation}` : ''}${record.nomineePhone ? ` · ${record.nomineePhone}` : ''}` : 'Not captured';
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Deposit ${record.id}`}>
            <div className="admin-modal-header">
                <div>
                    <div className="eyebrow">DEPOSIT ACCOUNT / {record.id}</div>
                    <h2>{record.customerName}</h2>
                    <p>{record.accountType} · {record.customerId} · {record.customerPhone}</p>
                </div>
                <button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button>
            </div>
            <div className="customer-profile-summary">
                <div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div>
                <div><strong>{record.id}</strong><span>Opened {record.openedOn} · Last entry {record.lastEntry}</span></div>
                <StatusPill status={record.status} />
            </div>
            <div className="customer-detail-grid">
                <div><span>Current balance</span><strong>{formatCurrency(record.balance)}</strong></div>
                <div><span>Opening amount</span><strong>{formatCurrency(record.openingAmount)}</strong></div>
                <div><span>Scheme</span><strong>{record.productName ?? record.productCode ?? 'Not captured'}{record.productName && record.productCode ? ` · ${record.productCode}` : ''}</strong></div>
                <div><span>Branch</span><strong>{record.branch ?? 'Not captured'}</strong></div>
                <div><span>Interest</span><strong>{interest || 'Not captured'}</strong></div>
                <div><span>Minimum balance</span><strong>{record.minimumBalance !== undefined ? formatCurrency(record.minimumBalance) : 'Not captured'}</strong></div>
                <div><span>Maximum balance</span><strong>{record.maxBalance !== undefined ? formatCurrency(record.maxBalance) : 'No cap'}</strong></div>
                <div><span>Opened by</span><strong>{record.openedBy ?? 'Not captured'}</strong></div>
                <div><span>Nominee</span><strong>{nominee}</strong></div>
                <div><span>KYC method</span><strong>{record.kycMethod ?? 'Not captured'}</strong></div>
                <div><span>Identity</span><strong>{identity || 'Not captured'}</strong></div>
                <div><span>Document references</span><strong>{record.documentReferences ?? 'Not captured'}</strong></div>
                <div><span>Transaction records</span><strong>{record.transactions.length}</strong></div>
            </div>
            <section className="customer-subsection">
                <div className="customer-section-heading">
                    <div><h3>Deposit transaction history</h3><p>Customer-wise entries recorded against this deposit account.</p></div>
                    <span>{record.transactions.length} records</span>
                </div>
                {record.transactions.length ? <div className="customer-transaction-list">{record.transactions.map((transaction) => <div className="deposit-entry-row" key={transaction.id}>
                    <div className="deposit-entry-main">
                        <div className="deposit-entry-head"><strong>{transaction.type}</strong><StatusPill status={transaction.status} /></div>
                        <span className="deposit-entry-narration">{transaction.narration?.trim() || 'No narration recorded for this entry.'}</span>
                        <div className="deposit-entry-meta">
                            <div><em>Entry</em><span title={transaction.id}>{transaction.id}</span></div>
                            <div><em>Date</em><span>{transaction.date}</span></div>
                            {transaction.reference ? <div><em>Reference</em><span title={transaction.reference}>{transaction.reference}</span></div> : null}
                            {transaction.paymentMethod ? <div><em>Mode</em><span>{transaction.paymentMethod}</span></div> : null}
                            {transaction.agent ? <div><em>Agent</em><span title={transaction.agent}>{transaction.agent}</span></div> : null}
                            {transaction.recordedBy ? <div><em>Recorded by</em><span title={transaction.recordedBy}>{transaction.recordedBy}</span></div> : null}
                        </div>
                    </div>
                    <div className={`deposit-entry-side ${transaction.type === 'Withdrawal' ? 'is-debit' : 'is-credit'}`}>
                        <b>{formatCurrency(transaction.amount)}</b>
                        {transaction.balanceAfter !== undefined ? <small>Balance {formatCurrency(transaction.balanceAfter)}</small> : null}
                    </div>
                </div>)}</div> : <div className="customer-empty">No deposit transactions recorded for this account.</div>}
            </section>
            <div className="customer-detail-actions">
                <button className="secondary-button" onClick={onStatement}><Download size={15} /> View / export statement</button>
                <button className="secondary-button" onClick={onEdit}>Edit account</button>
                {record.status === 'Pending' && (canApprove
                    ? <button className="primary-button" onClick={onApprove} disabled={approving}>{approving ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} Approve account</button>
                    : <button className="primary-button" disabled title="Only the President, Managing Director or Super Admin can approve an account opening"><LockKeyhole size={15} /> Awaiting approval</button>)}
                {record.status === 'Pending'
                    ? <button className="secondary-button" disabled title="Approve this account before recording transactions."><Plus size={15} /> Record transaction</button>
                    : <button className="primary-button" onClick={onTransaction}><Plus size={15} /> Record transaction</button>}
            </div>
            {record.status === 'Pending' ? <div style={{ padding: '0 24px 20px' }}>
                <p className="form-note">Maker-checker (spec §9.1): this account stays pending until approved. {canApprove ? 'Approve it to activate the account — transactions are allowed only after activation.' : 'Only the President, Managing Director or Super Admin can approve the opening.'}</p>
            </div> : null}
        </section>
    </div>;
}

export function DepositsPage() {
    const [depositRows, setDepositRows] = useState<DepositRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [modal, setModal] = useState<'account' | 'transaction' | 'edit' | 'statement' | 'detail' | null>(null);
    const [selected, setSelected] = useState<DepositRecord | undefined>();
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [showRange, setShowRange] = useState(false);
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    const [page, setPage] = useState(1);
    const [toast, setToast] = useState('');
    const { hasRole } = useAuth();
    const canApproveDeposit = hasRole('president', 'managing_director', 'super_admin');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    useEffect(() => {
        let active = true;
        setLoading(true);
        depositsRepository
            .list()
            .then((rows) => { if (active) setDepositRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load deposit accounts from the backend.')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    // The backend formats ledger dates with the same locale helper as this page, so a
    // string comparison against today's formatted date is an exact same-day match.
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    // Range filtering uses the real ISO opening date the backend returns for each account.
    const withinRange = (row: DepositRecord) => {
        if (!rangeFrom && !rangeTo) return true;
        const opened = row.openedOnIso ? row.openedOnIso.slice(0, 10) : undefined;
        if (!opened) return false;
        if (rangeFrom && opened < rangeFrom) return false;
        if (rangeTo && opened > rangeTo) return false;
        return true;
    };
    const filteredRows = depositRows.filter((row) => withinRange(row) && `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.accountType} ${row.productCode ?? ''} ${row.branch ?? ''} ${row.transactions.map((transaction) => `${transaction.id} ${transaction.agent} ${transaction.reference}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalBalance = depositRows.reduce((total, row) => total + row.balance, 0);
    const entriesToday = depositRows.flatMap((row) => row.transactions).filter((transaction) => transaction.date === today).length;
    const reviewCount = depositRows.filter((row) => row.status === 'Review' || row.status === 'Pending').length;
    // Exports exactly the backend-sourced rows currently on screen — no placeholder payload.
    const exportCsv = () => {
        if (exporting) return;
        setExporting(true);
        try {
            const header = ['Account', 'Customer', 'Customer ID', 'Phone', 'Type', 'Scheme', 'Branch', 'Balance', 'Opening amount', 'Status', 'Opened', 'Last entry'];
            const rows = filteredRows.map((row) => [row.id, row.customerName, row.customerId, row.customerPhone, row.accountType, row.productCode ?? '', row.branch ?? '', String(row.balance), String(row.openingAmount), row.status, row.openedOn, row.lastEntry].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
            const csv = [header.join(','), ...rows].join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `deposit-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            notify(`${filteredRows.length} deposit account records exported.`);
        } finally {
            setExporting(false);
        }
    };
    const saveAccount = async (input: DepositInput) => {
        try {
            const record = await depositsRepository.create(input as DepositRepoInput);
            setDepositRows((current) => [record, ...current]);
            close();
            notify(`Deposit account ${record.id} opened on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to open the deposit account on the backend.'));
        }
    };
    const saveTransaction = async (input: DepositTransactionInput) => {
        if (!selected) return;
        try {
            const record = await depositsRepository.postTransaction(selected.id, input as DepositRepoTransactionInput);
            setDepositRows((current) => current.map((row) => (row.id === selected.id ? record : row)));
            close();
            notify('Deposit transaction recorded on the backend.');
        } catch (reason) {
            notify(messageFor(reason, 'Unable to record the deposit transaction on the backend.'));
        }
    };
    const saveEdit = async (input: DepositUpdateInput) => {
        if (!selected) return;
        try {
            const updated = await depositsRepository.update(selected.id, input);
            setDepositRows((current) => current.map((row) => (row.id === selected.id ? updated : row)));
            setSelected(updated);
            setModal('detail');
            notify(`Deposit account ${updated.id} updated on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to update the deposit account on the backend.'));
        }
    };
    const approveAccount = async (record: DepositRecord) => {
        if (approvingId) return;
        setApprovingId(record.id);
        try {
            const updated = await depositsRepository.approve(record.id);
            setDepositRows((current) => current.map((row) => (row.id === record.id ? updated : row)));
            setSelected((current) => (current && current.id === record.id ? updated : current));
            notify(`Deposit account ${updated.id} approved and activated.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to approve the deposit account on the backend.'));
        } finally {
            setApprovingId(null);
        }
    };
    return <div className="admin-page">
        <div className="page-heading">
            <div>
                <div className="eyebrow">OPERATIONS / DEPOSITS</div>
                <h1>Deposits</h1>
                <p>Manage deposit accounts, customer-linked entries, balances and statements.</p>
            </div>
            <button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Open deposit account</button>
        </div>
        <SummaryStrip items={[{ label: 'Active deposit accounts', value: String(depositRows.filter((row) => row.status === 'Active').length), tone: 'green' }, { label: 'Total deposit balance', value: formatCurrency(totalBalance) }, { label: 'Entries today', value: String(entriesToday), tone: 'orange' }, { label: 'Needs review', value: String(reviewCount), tone: 'red' }]} />
        <section className="panel table-panel">
            <div className="filter-bar">
                <div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer, account, agent or reference..." aria-label="Search deposits" /></div>
                <select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter deposits by status">
                    <option value="All">All statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Review">Review</option>
                    <option value="Inactive">Inactive</option>
                </select>
                <button className="filter-button" onClick={() => setShowRange((current) => !current)} aria-expanded={showRange}><CalendarDays size={15} /> Date range</button>
                <button className="filter-button" onClick={() => { setStatusFilter('Review'); setSearch(''); setPage(1); }}><SlidersHorizontal size={15} /> Filters</button>
                <button className="icon-button export-button" onClick={exportCsv} disabled={exporting} aria-label="Export deposits">{exporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}</button>
            </div>
            {showRange ? <div className="filter-bar">
                <label className="statement-field"><span>Opened from</span><input type="date" value={rangeFrom} onChange={(event) => { setRangeFrom(event.target.value); setPage(1); }} /></label>
                <label className="statement-field"><span>Opened to</span><input type="date" value={rangeTo} onChange={(event) => { setRangeTo(event.target.value); setPage(1); }} /></label>
                <button className="secondary-button" onClick={() => { setRangeFrom(''); setRangeTo(''); setPage(1); }} disabled={!rangeFrom && !rangeTo}>Clear range</button>
            </div> : null}
            <div className="data-table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Deposit account</th>
                            <th>Balance</th>
                            <th>Details</th>
                            <th>Status</th>
                            <th aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody>{loading ? <tr>
                        <td colSpan={5} className="empty-state"><Loader2 className="spin" size={16} /> Loading deposit accounts…</td>
                    </tr> : visibleRows.length ? visibleRows.map((row) => <tr key={row.id} onClick={() => { setSelected(row); setModal('detail'); }}>
                        <td>
                            <strong>{row.customerName}</strong>
                            <span>{row.accountType} · {row.customerId}</span>
                            <small>{row.id} · {row.customerPhone}</small>
                        </td>
                        <td className="table-amount">{formatCurrency(row.balance)}</td>
                        <td className="table-muted">Opened {row.openedOn}<br />Last entry {row.lastEntry}</td>
                        <td>
                            <StatusPill status={row.status} />
                        </td>
                        <td>
                            <button className="row-action" onClick={(event) => { event.stopPropagation(); setSelected(row); setModal('detail'); }} aria-label={`Open ${row.id}`}>
                                <ChevronRight size={16} />
                            </button>
                        </td>
                    </tr>) : <tr>
                        <td colSpan={5} className="empty-state">No deposit accounts match the current search or filter.</td>
                    </tr>}</tbody>
                </table>
            </div>
            <div className="table-footer">
                <span>Showing {visibleRows.length} of {filteredRows.length} deposit accounts</span>
                <div>
                    <button className="pagination-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1}>Prev</button>
                    <button className="pagination-button selected">{currentPage}</button>
                    <button className="pagination-button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage >= totalPages}>Next</button>
                </div>
            </div>
        </section>
        {modal === 'account' && <DepositModal mode="account" onClose={close} onSave={(input) => saveAccount(input as DepositInput)} />}
        {modal === 'transaction' && selected && <DepositModal mode="transaction" record={selected} onClose={close} onSave={(input) => saveTransaction(input as DepositTransactionInput)} />}
        {modal === 'edit' && selected && <DepositEditModal record={selected} onClose={close} onSave={saveEdit} />}
        {modal === 'statement' && selected && <DepositStatementModal record={selected} onClose={close} />}
        {modal === 'detail' && selected && <DepositDetail record={selected} onClose={close} onEdit={() => setModal('edit')} onTransaction={() => setModal('transaction')} onStatement={() => setModal('statement')} onApprove={() => void approveAccount(selected)} approving={approvingId === selected.id} canApprove={canApproveDeposit} />}
        {toast && <div className="admin-toast">
            <CheckCircle2 size={16} />{toast}</div>}
    </div>;
}
