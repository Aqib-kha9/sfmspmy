// OPERATIONS / Deposits.

import { Pagination } from '../../../components/ui/Pagination';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Download, FileText, Filter, Loader2, LockKeyhole, Pencil, Plus, RotateCcw, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { depositsRepository } from '../services/operations/depositsApiRepository';
import type { DepositInput as DepositRepoInput, DepositTransactionInput as DepositRepoTransactionInput, DepositRecord as DepositRecordView, DepositTransaction as DepositTransactionView, DepositStatement, DepositProduct, DepositUpdateInput, DepositStatementQuery } from '../services/operations/depositsApiRepository';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer } from '../../customers/types/customer.types';
import type { CustomerOption } from '../../customers/services/customerRepository';
import { messageFor } from '../services/operations/helpers';
import { Modal } from '../../../components/overlays/Modal';
import { Req, Opt, FormLegend } from '../../../components/ui/FieldIndicators';
import { formatCurrency } from '../../../lib/formatters/formatters';
import { useAuth } from '../../auth/AuthContext';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';
import { TransactionReceiptModal, type ReceiptData } from '../components/TransactionReceiptModal';
import { AccountStatementModal, type StatementEntry, type StatementAccountMeta } from '../components/AccountStatementModal';

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

export function DepositModal({ mode, record, accountKind = 'all', onClose, onSave }: { mode: 'account' | 'transaction'; record?: DepositRecord; accountKind?: 'savings' | 'daily' | 'all'; onClose: () => void; onSave: (input: DepositInput | DepositTransactionInput) => Promise<void> }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? '');
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerDetails, setCustomerDetails] = useState<ApiCustomer | undefined>();
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');
    const [products, setProducts] = useState<DepositProduct[]>([]);
    const [productCode, setProductCode] = useState(record?.productCode ?? '');
    const [openingAmount, setOpeningAmount] = useState('');
    const [openedOn, setOpenedOn] = useState(new Date().toISOString().slice(0, 10));
    const [maturityDate, setMaturityDate] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [description, setDescription] = useState('');
    const [transactionType, setTransactionType] = useState<DepositTransaction['type']>('Deposit entry');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [reference, setReference] = useState('');
    const [narration, setNarration] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    // Real scheme catalogue filtered by accountKind (savings vs daily)
    useEffect(() => {
        if (mode !== 'account') return undefined;
        let active = true;
        depositsRepository.products()
            .then((rows) => {
                if (active) {
                    const filtered = accountKind === 'savings'
                        ? rows.filter((p) => p.code !== 'DAILY-180')
                        : accountKind === 'daily'
                            ? rows.filter((p) => p.code === 'DAILY-180')
                            : rows;
                    setProducts(filtered);
                    if (!productCode && filtered.length > 0) {
                        const defaultProduct = accountKind === 'daily'
                            ? (filtered.find((p) => p.code === 'DAILY-180') || filtered[0])
                            : (filtered.find((p) => p.code === 'SAV-STD') || filtered[0]);
                        if (defaultProduct) {
                            setProductCode(defaultProduct.code);
                            setOpeningAmount((curr) => curr || String(defaultProduct.minOpeningAmount || (accountKind === 'daily' ? 50 : 100)));
                        }
                    }
                }
            })
            .catch(() => { if (active) setProducts([]); });
        return () => { active = false; };
    }, [mode, accountKind]);
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
    useEffect(() => {
        if (productCode === 'DAILY-180' && openedOn) {
            const d = new Date(openedOn);
            d.setDate(d.getDate() + 180);
            setMaturityDate(d.toISOString().slice(0, 10));
            setInterestRate((curr) => curr || '4.00');
        }
    }, [productCode, openedOn]);

    const selectProduct = (code: string) => {
        setProductCode(code);
        const product = products.find((p) => p.code === code);
        if (!product) return;
        setOpeningAmount((current) => {
            const val = Number(current);
            if (!Number.isFinite(val) || val <= 0) return String(product.minOpeningAmount);
            return current;
        });
        if (code === 'DAILY-180') {
            setInterestRate('4.00');
            if (openedOn) {
                const d = new Date(openedOn);
                d.setDate(d.getDate() + 180);
                setMaturityDate(d.toISOString().slice(0, 10));
            }
        } else {
            setInterestRate((current) => current || String(product.interestRate));
        }
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
                await onSave({ customerId: customerId.trim(), productCode: productCode.trim(), openingAmount: Number(openingAmount), openedOn: openedOn || undefined, maturityDate: maturityDate || undefined, interestRate: interestRate ? Number(interestRate) : undefined, paymentMethod, referenceNumber: referenceNumber.trim() || undefined, description: description.trim() || undefined });
                return;
            }
            if (!record || !amount || Number(amount) <= 0) { setError('Amount is required.'); return; }
            await onSave({ type: transactionType, amount: Number(amount), date: date || undefined, reference: reference.trim() || undefined, paymentMethod, narration: narration.trim() || undefined });
        } finally { setSaving(false); }
    };
    const modalTitle = mode === 'account'
        ? (accountKind === 'savings' ? 'Open savings account (बचत खाते)' : accountKind === 'daily' ? 'Open daily deposit account (दैनिक ठेव)' : 'Open deposit account')
        : `Record entry · ${record?.id ?? ''}`;
    const modalEyebrow = mode === 'account'
        ? (accountKind === 'savings' ? 'SAVINGS WORKFLOW' : accountKind === 'daily' ? 'DAILY DEPOSIT WORKFLOW' : 'DEPOSIT WORKFLOW')
        : 'DEPOSIT WORKFLOW';
    return <Modal title={modalTitle} eyebrow={modalEyebrow} onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            <FormLegend />
            {mode === 'account' ? <>
                <label className="full-field"><span>Search customer <Opt /></span><input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label>
                <label className="full-field"><span>Customer <Req /></span><select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.customerNumber}</option>)}</select></label>
                {customerError ? <p className="form-error full-field">{customerError}</p> : null}
                {customerDetails ? <p className="form-note full-field">Opening against {customerDetails.name} · {customerDetails.phone}{customerDetails.branch ? ` · ${customerDetails.branch}` : null}</p> : null}
                <label><span>Product / scheme <Req /></span><select value={productCode} onChange={(event) => selectProduct(event.target.value)} aria-label="Select deposit scheme"><option value="">{products.length ? 'Select a scheme' : 'No active schemes configured'}</option>{products.map((product) => <option key={product.id} value={product.code}>{product.name} · {product.code} · {product.interestRate}%</option>)}</select></label>
                <label><span>Opening deposit amount <Req /></span><input type="number" min="1" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="5000" /></label>
                <label><span>Opening date <Opt /></span><input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label>
                {accountKind !== 'savings' ? (
                    <label><span>Maturity date (मुदत समाप्ती) {productCode === 'DAILY-180' ? <Req /> : <Opt />}</span><input type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} />{productCode === 'DAILY-180' ? <small style={{ fontSize: '11px', color: 'var(--green)' }}>Auto-calculated (+180 days for DAILY-180)</small> : null}</label>
                ) : null}
                <label><span>Interest rate override (%) <Opt /></span><input type="number" min="0.01" max="25" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} placeholder={selectedProduct ? String(selectedProduct.interestRate) : '4.00'} /></label>
                <label><span>Payment method <Req /></span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{depositPaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
                <label><span>Instrument reference <Opt /></span><input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder="Receipt / UTR / cheque number" /></label>
                <label className="full-field"><span>Opening narration <Opt /></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note stored on the opening ledger entry" /></label>
                {selectedProduct ? <p className="form-note full-field">{selectedProduct.name} pays {selectedProduct.interestMethod} interest {selectedProduct.interestFrequency} at {selectedProduct.interestRate}% · minimum balance {formatCurrency(selectedProduct.minBalance)}{selectedProduct.maxBalance !== undefined ? ` · maximum balance ${formatCurrency(selectedProduct.maxBalance)}` : ''}</p> : null}
            </> : <>
                <label><span>Transaction type <Req /></span><select value={transactionType} onChange={(event) => setTransactionType(event.target.value as DepositTransaction['type'])}><option>Deposit entry</option><option>Withdrawal</option></select></label>
                <label><span>Amount <Req /></span><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="5000" /></label>
                <label><span>Value date <Opt /></span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
                <label><span>Payment method <Req /></span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{depositPaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
                <label><span>Instrument reference <Opt /></span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Receipt / UTR / cheque number" /></label>
                <label className="full-field"><span>Narration <Opt /></span><textarea value={narration} onChange={(event) => setNarration(event.target.value)} /></label>
            </>}
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? <Loader2 size={15} className="spin" /> : null}
                    {saving ? 'Saving…' : (mode === 'account' ? (accountKind === 'savings' ? 'Create savings account' : accountKind === 'daily' ? 'Create daily deposit account' : 'Create deposit account') : 'Save transaction')}
                </button>
            </div>
        </form>
    </Modal>;
}

export function DepositEditModal({ record, onClose, onSave }: { record: DepositRecord; onClose: () => void; onSave: (input: DepositUpdateInput) => Promise<void> }) {
    const [products, setProducts] = useState<DepositProduct[]>([]);
    const [productCode, setProductCode] = useState(record.productCode ?? '');
    const [interestRate, setInterestRate] = useState(record.interestRate !== undefined ? String(record.interestRate) : '');
    const [maturityDate, setMaturityDate] = useState(record.maturityDateIso ?? '');
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
            const mat = maturityDate.trim();
            const codeChanged = code !== (record.productCode ?? '');
            const rateChanged = rate !== (record.interestRate !== undefined ? String(record.interestRate) : '');
            const matChanged = mat !== (record.maturityDateIso ?? '');
            if (!codeChanged && !rateChanged && !matChanged) { setError('Change the scheme, interest rate, or maturity date before saving.'); return; }
            await onSave({
                productCode: codeChanged && code ? code : undefined,
                interestRate: rateChanged && rate ? Number(rate) : undefined,
                maturityDate: matChanged ? (mat || null) : undefined,
            });
        } finally { setSaving(false); }
    };
    return <Modal title={`Edit account · ${record.id}`} eyebrow="DEPOSIT WORKFLOW" onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            <FormLegend />
            <p className="form-note full-field">Only the booked scheme, account-level interest rate and maturity date can change — the backend rejects any other account field.</p>
            <label><span>Product / scheme <Opt /></span><select value={productCode} onChange={(event) => setProductCode(event.target.value)} aria-label="Select deposit scheme"><option value={record.productCode ?? ''}>{record.productCode ? `Keep current · ${record.productCode}` : 'Select a scheme'}</option>{products.filter((product) => product.code !== record.productCode).map((product) => <option key={product.id} value={product.code}>{product.name} · {product.code} · {product.interestRate}%</option>)}</select></label>
            <label><span>Interest rate override (%) <Opt /></span><input type="number" min="0.01" max="25" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} placeholder="Product default" /></label>
            <label><span>Maturity date (मुदत समाप्ती) <Opt /></span><input type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} /></label>
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : 'Save account changes'}</button>
            </div>
        </form>
    </Modal>;
}

export function DepositDeleteModal({
    record,
    onClose,
    onConfirm,
}: {
    record: DepositRecord;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
}) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Please provide a reason for closing/deleting this account.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await onConfirm(reason.trim());
        } catch (err: unknown) {
            setError(messageFor(err, 'Failed to close/delete account.'));
            setSubmitting(false);
        }
    };

    return (
        <Modal title={`Close / Delete Account · ${record.id}`} eyebrow="ACCOUNT ACTION" onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px 14px', background: 'var(--bg-muted, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.875rem' }}>
                        <div><strong>Customer:</strong> {record.customerName} ({record.customerId})</div>
                        <div><strong>Account:</strong> {record.id} · {record.productName || record.accountType}</div>
                        <div><strong>Current Balance:</strong> <span style={{ fontWeight: 600, color: record.balance > 0 ? 'var(--color-warning, #d97706)' : 'inherit' }}>{formatCurrency(record.balance)}</span></div>
                    </div>

                    {record.balance > 0 && (
                        <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', color: '#92400e', fontSize: '0.825rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <strong>Active balance ({formatCurrency(record.balance)}):</strong> This account currently has an active balance. Deleting/closing this account will automatically zero-out the balance through a closure payout entry to ensure database and ledger consistency.
                            </div>
                        </div>
                    )}

                    <label className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            Reason for closure / deletion <Req />
                        </span>
                        <textarea
                            className="text-input"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Customer deleted, customer requested closure, wrong entry"
                            required
                        />
                    </label>

                    {error && (
                        <div style={{ color: 'var(--color-danger, #dc2626)', fontSize: '0.85rem' }}>{error}</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                        <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="danger-button" disabled={submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                            {submitting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />} Confirm Delete / Close
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

export function DepositTxReverseModal({
    record,
    transaction,
    onClose,
    onConfirm,
}: {
    record: DepositRecord;
    transaction: DepositTransaction;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
}) {
    const [reason, setReason] = useState('');
    const [customerConfirmed, setCustomerConfirmed] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Please provide a reason for reversing this transaction.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await onConfirm(reason.trim());
        } catch (err: unknown) {
            setError(messageFor(err, 'Failed to reverse transaction.'));
            setSubmitting(false);
        }
    };

    return (
        <Modal title={`Reverse Transaction · ${transaction.id.slice(0, 8)}...`} eyebrow="FINANCIAL ADJUSTMENT" onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px 14px', background: 'var(--bg-muted, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.875rem' }}>
                        <div><strong>Account:</strong> {record.id} ({record.customerName})</div>
                        <div><strong>Transaction:</strong> {transaction.type}</div>
                        <div><strong>Amount:</strong> <span style={{ fontWeight: 600 }}>{formatCurrency(transaction.amount)}</span></div>
                        <div><strong>Date:</strong> {transaction.date} · <strong>Mode:</strong> {transaction.paymentMethod || 'Cash'}</div>
                        {transaction.narration ? <div><strong>Narration:</strong> {transaction.narration}</div> : null}
                    </div>

                    <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '6px', color: '#1e40af', fontSize: '0.825rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <RotateCcw size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong>Financial Audit Compliance:</strong> Ledger rows are immutable and cannot be deleted directly. Reversing this transaction will post a compensating reversing entry and recalculate the current account balance according to banking standards.
                        </div>
                    </div>

                    <label className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            Reason for reversal <Req />
                        </span>
                        <textarea
                            className="text-input"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Wrong amount entered / duplicate entry / customer cancellation"
                            required
                        />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={customerConfirmed}
                            onChange={(e) => setCustomerConfirmed(e.target.checked)}
                        />
                        <span>Customer informed and confirmed adjustment</span>
                    </label>

                    {error && (
                        <div style={{ color: 'var(--color-danger, #dc2626)', fontSize: '0.85rem' }}>{error}</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                        <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-button" disabled={submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {submitting ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />} Confirm Reversal
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

export function DepositStatementModal({
    record,
    onClose,
    onViewReceipt,
}: {
    record: DepositRecord;
    onClose: () => void;
    onViewReceipt: (receipt: ReceiptData) => void;
}) {
    const [statement, setStatement] = useState<DepositStatement | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        depositsRepository.statement(record.id, {})
            .then((view) => { if (active) { setStatement(view); setError(''); } })
            .catch((reason: unknown) => { if (active) setError(messageFor(reason, 'Unable to load deposit statement.')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [record.id]);

    const statementEntries: StatementEntry[] = useMemo(() => {
        if (statement?.entries?.length) {
            return statement.entries.map((entry) => ({
                id: entry.id,
                date: entry.date,
                description: entry.description || 'Ledger entry',
                reference: entry.reference,
                receiptNumber: entry.reference || `DEP-${entry.id}`,
                debit: entry.direction === 'debit' ? entry.amount : undefined,
                credit: entry.direction === 'credit' ? entry.amount : undefined,
                balance: entry.balanceAfter,
                paymentMethod: entry.paymentMethod || 'Cash',
                agentOrCashier: entry.recordedBy || 'Branch Counter',
                status: 'Completed',
            }));
        }
        return record.transactions.map((tx) => ({
            id: tx.id,
            date: tx.date,
            description: `${tx.type} · ${tx.narration || ''}`,
            reference: tx.reference,
            receiptNumber: tx.reference || `TXN-${tx.id}`,
            debit: tx.type === 'Withdrawal' ? tx.amount : undefined,
            credit: tx.type !== 'Withdrawal' ? tx.amount : undefined,
            balance: tx.balanceAfter,
            paymentMethod: tx.paymentMethod || 'Cash',
            agentOrCashier: tx.agent || tx.recordedBy || 'Branch Counter',
            status: tx.status,
        }));
    }, [statement, record]);

    const accountMeta: StatementAccountMeta = {
        accountNumber: record.id,
        customerName: record.customerName,
        customerId: record.customerId,
        customerPhone: record.customerPhone,
        productName: record.productName || record.accountType,
        productType: (record.accountType as string) === 'Daily Deposit' ? 'Daily' : 'Deposit',
        branch: record.branch,
        currentBalance: record.balance,
        openedOn: record.openedOn,
    };

    return (
        <AccountStatementModal
            account={accountMeta}
            entries={statementEntries}
            onClose={onClose}
            onViewReceipt={onViewReceipt}
        />
    );
}

export function DepositDetail({
    record,
    onClose,
    onEdit,
    onDelete,
    onReverseTx,
    onTransaction,
    onStatement,
    onApprove,
    approving,
    canApprove,
    onViewReceipt,
}: {
    record: DepositRecord;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onReverseTx: (transaction: DepositTransaction) => void;
    onTransaction: () => void;
    onStatement: () => void;
    onApprove: () => void;
    approving: boolean;
    canApprove: boolean;
    onViewReceipt: (receipt: ReceiptData) => void;
}) {
    const interest = [record.interestMethod, record.interestFrequency, record.interestRate !== undefined ? `${record.interestRate}%` : undefined].filter(Boolean).join(' · ');
    const identity = [record.identityType, record.identityReference].filter(Boolean).join(' · ');
    const nominee = record.nomineeName ? `${record.nomineeName}${record.nomineeRelation ? ` · ${record.nomineeRelation}` : ''}${record.nomineePhone ? ` · ${record.nomineePhone}` : ''}` : 'Not captured';

    const buildTxReceipt = (transaction: DepositTransaction): ReceiptData => ({
        receiptNumber: transaction.reference || `TXN-${transaction.id}`,
        date: transaction.date,
        time: '11:30 AM',
        customerName: record.customerName,
        customerId: record.customerId,
        customerPhone: record.customerPhone,
        accountNumber: record.id,
        productName: `${record.productName || record.accountType} (${transaction.type})`,
        productType: (record.accountType as string) === 'Daily Deposit' ? 'Daily' : 'Deposit',
        amount: transaction.amount,
        paymentMethod: transaction.paymentMethod || 'Cash',
        agentOrCashier: transaction.agent || transaction.recordedBy || 'Branch Counter',
        reference: transaction.reference,
        balanceAfter: transaction.balanceAfter,
        narration: transaction.narration || `${transaction.type} transaction for account ${record.id}`,
        branch: record.branch,
    });

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Deposit ${record.id}`}>
            <div className="admin-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                        aria-label="Back / Return"
                        title="Go back / close"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                    >
                        <ArrowLeft size={15} /> <span>Back</span>
                    </button>
                    <div>
                        <div className="eyebrow">{record.productCode === 'DAILY-180' || record.id.startsWith('DDA') ? 'DAILY DEPOSIT ACCOUNT' : 'SAVINGS ACCOUNT'} / {record.id}</div>
                        <h2>{record.customerName}</h2>
                        <p>{record.productName || record.accountType}{record.customerPhone ? ` · ${record.customerPhone}` : ''}</p>
                    </div>
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
                <div><span>Maturity date (मुदत समाप्ती)</span><strong>{record.maturityDate || 'Not applicable / Open'}</strong></div>
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
                {record.transactions.length ? <div className="customer-transaction-list">{record.transactions.map((transaction) => <div className="deposit-entry-row" key={transaction.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div className="deposit-entry-main" style={{ flex: 1 }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <div className={`deposit-entry-side ${transaction.type === 'Withdrawal' ? 'is-debit' : 'is-credit'}`}>
                            <b>{formatCurrency(transaction.amount)}</b>
                            {transaction.balanceAfter !== undefined ? <small>Balance {formatCurrency(transaction.balanceAfter)}</small> : null}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                type="button"
                                className="secondary-button"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewReceipt(buildTxReceipt(transaction));
                                }}
                                title="View / print official receipt"
                            >
                                <FileText size={13} /> Receipt
                            </button>
                            <button
                                type="button"
                                className="secondary-button"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReverseTx(transaction);
                                }}
                                title="Reverse / correct mistaken transaction entry"
                            >
                                <RotateCcw size={13} /> Reverse
                            </button>
                        </div>
                    </div>
                </div>)}</div> : <div className="customer-empty">No deposit transactions recorded for this account.</div>}
            </section>
            <div className="customer-detail-actions">
                <button className="secondary-button" onClick={onStatement}><FileText size={15} /> View / export statement</button>
                <button className="secondary-button" onClick={onEdit}>Edit account</button>
                <button className="secondary-button" style={{ color: '#dc2626' }} onClick={onDelete}><Trash2 size={15} /> Close / Delete account</button>
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

export function DepositsPage({ accountKind = 'all' }: { accountKind?: 'savings' | 'daily' | 'all' } = {}) {
    const [depositRows, setDepositRows] = useState<DepositRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [modal, setModal] = useState<'account' | 'transaction' | 'edit' | 'statement' | 'detail' | null>(null);
    const [selected, setSelected] = useState<DepositRecord | undefined>();
    const [deleteTarget, setDeleteTarget] = useState<DepositRecord | null>(null);
    const [reverseTxTarget, setReverseTxTarget] = useState<DepositTransaction | null>(null);
    const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
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
            .list({ limit: 500 })
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

    const isDaily = (row: DepositRecord) =>
        row.productCode === 'DAILY-180' || row.id.startsWith('DDA');

    const matchesKind = (row: DepositRecord) => {
        if (accountKind === 'savings') return !isDaily(row);
        if (accountKind === 'daily') return isDaily(row);
        return true;
    };

    const kindRows = useMemo(() => depositRows.filter(matchesKind), [depositRows, accountKind]);
    const filteredRows = kindRows.filter((row) => withinRange(row) && `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.productName ?? ''} ${row.accountType} ${row.productCode ?? ''} ${row.branch ?? ''} ${row.transactions.map((transaction) => `${transaction.id} ${transaction.agent} ${transaction.reference}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalBalance = Math.round(kindRows.reduce((total, row) => total + row.balance, 0) * 100) / 100;
    const todayTransactions = kindRows.flatMap((row) => row.transactions).filter((transaction) => transaction.date === today);
    const entriesToday = todayTransactions.length;
    const todayCollected = todayTransactions
        .filter((t) => t.type === 'Deposit entry')
        .reduce((sum, t) => sum + t.amount, 0);
    const reviewCount = kindRows.filter((row) => row.status === 'Review' || row.status === 'Pending').length;
    const activeCount = kindRows.filter((row) => row.status === 'Active').length;
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
            setSelected(record);
            setModal('detail');

            const receiptNum = input.reference?.trim() || `DEP-TXN-${Date.now().toString().slice(-6)}`;
            const receiptData: ReceiptData = {
                receiptNumber: receiptNum,
                date: input.date || new Date().toISOString().slice(0, 10),
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                customerName: selected.customerName,
                customerId: selected.customerId,
                customerPhone: selected.customerPhone,
                accountNumber: selected.id,
                productName: `${selected.productName || selected.accountType} (${input.type})`,
                productType: (selected.accountType as string) === 'Daily Deposit' ? 'Daily' : 'Deposit',
                amount: Number(input.amount),
                paymentMethod: input.paymentMethod || 'Cash',
                agentOrCashier: 'Branch Counter',
                reference: input.reference,
                balanceAfter: record.balance,
                narration: input.narration || `${input.type} entry for account ${selected.id}`,
                branch: selected.branch,
            };
            setActiveReceipt(receiptData);
            notify('Deposit transaction recorded on backend! Receipt generated.');
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
    const confirmDeleteAccount = async (reason: string) => {
        if (!deleteTarget) return;
        try {
            await depositsRepository.delete(deleteTarget.id, reason);
            setDepositRows((current) => current.filter((row) => row.id !== deleteTarget.id));
            if (selected?.id === deleteTarget.id) {
                close();
            }
            setDeleteTarget(null);
            notify(`Deposit account ${deleteTarget.id} closed and removed.`);
        } catch (reasonErr) {
            notify(messageFor(reasonErr, 'Unable to close/delete deposit account.'));
        }
    };
    const confirmReverseTx = async (reason: string) => {
        if (!selected || !reverseTxTarget) return;
        try {
            const updated = await depositsRepository.reverseTransaction(selected.id, reverseTxTarget.id, reason);
            setDepositRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
            setSelected(updated);
            setReverseTxTarget(null);
            notify(`Transaction entry reversed. Reversing ledger entry recorded.`);
        } catch (reasonErr) {
            notify(messageFor(reasonErr, 'Unable to reverse deposit transaction.'));
        }
    };
    const isSavingsOnly = accountKind === 'savings';
    const isDailyOnly = accountKind === 'daily';
    const pageEyebrow = isSavingsOnly ? 'OPERATIONS / SAVINGS' : isDailyOnly ? 'OPERATIONS / DAILY DEPOSITS' : 'OPERATIONS / DEPOSITS';
    const pageTitle = isSavingsOnly ? 'Savings accounts' : isDailyOnly ? 'Daily deposits' : 'Deposits';
    const pageSubtitle = isSavingsOnly
        ? 'Manage member savings (बचत खाती), balances, passbooks and ledger entries.'
        : isDailyOnly
            ? 'Manage daily deposit (दैनिक ठेव - DD) collections, 180-day accounts and statements.'
            : 'Manage deposit accounts, customer-linked entries, balances and statements.';
    const openButtonLabel = isSavingsOnly ? 'Open savings account' : isDailyOnly ? 'Open daily deposit account' : 'Open deposit account';
    const activeLabel = isSavingsOnly ? 'Active savings accounts (सक्रिय खाती)' : isDailyOnly ? 'Active DD accounts (सक्रिय खाती)' : 'Active accounts';
    const balanceLabel = isSavingsOnly ? 'Total savings balance (एकूण ठेव शिल्लक)' : isDailyOnly ? 'Total daily deposit balance (एकूण ठेव शिल्लक)' : 'Total deposit balance';
    const todayLabel = isSavingsOnly ? 'Savings deposited today (आजची जमा)' : isDailyOnly ? "Today's DD collection (आजची दैनिक जमा)" : "Today's deposits";

    return <div className="admin-page">
        <div className="page-heading">
            <div>
                <div className="eyebrow">{pageEyebrow}</div>
                <h1>{pageTitle}</h1>
                <p>{pageSubtitle}</p>
            </div>
            <button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> {openButtonLabel}</button>
        </div>
        <SummaryStrip items={[
            { label: activeLabel, value: `${activeCount} accounts`, tone: 'green' },
            { label: balanceLabel, value: formatCurrency(totalBalance) },
            { label: todayLabel, value: `${formatCurrency(todayCollected)} (${entriesToday} ${entriesToday === 1 ? 'entry' : 'entries'})`, tone: 'orange' },
            { label: 'Needs review', value: String(reviewCount), tone: reviewCount > 0 ? 'red' : undefined },
        ]} />
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
                            <th>{isSavingsOnly ? 'Savings account' : isDailyOnly ? 'Daily deposit account' : 'Deposit account'}</th>
                            <th>Balance</th>
                            <th>Details</th>
                            <th>Status</th>
                            <th aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody>{loading ? <tr>
                        <td colSpan={5} className="empty-state"><Loader2 className="spin" size={16} /> Loading accounts…</td>
                    </tr> : visibleRows.length ? visibleRows.map((row) => <tr key={row.id} onClick={() => { setSelected(row); setModal('detail'); }}>
                        <td>
                            <strong>{row.customerName}</strong>
                            <span>{row.productName || row.accountType}</span>
                            <small>{row.id}{row.customerPhone ? ` · ${row.customerPhone}` : ''}</small>
                        </td>
                        <td className="table-amount">{formatCurrency(row.balance)}</td>
                        <td className="table-muted">
                            Opened {row.openedOn}
                            {row.maturityDate ? <><br />Matures {row.maturityDate}</> : null}
                            <br />Last entry {row.lastEntry}
                        </td>
                        <td>
                            <StatusPill status={row.status} />
                        </td>
                        <td>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                    className="row-action"
                                    title="Edit account"
                                    onClick={(event) => { event.stopPropagation(); setSelected(row); setModal('edit'); }}
                                    aria-label={`Edit ${row.id}`}
                                >
                                    <Pencil size={15} />
                                </button>
                                <button
                                    className="row-action"
                                    title="Close / Delete account"
                                    onClick={(event) => { event.stopPropagation(); setDeleteTarget(row); }}
                                    aria-label={`Delete ${row.id}`}
                                    style={{ color: '#dc2626' }}
                                >
                                    <Trash2 size={15} />
                                </button>
                                <button className="row-action" onClick={(event) => { event.stopPropagation(); setSelected(row); setModal('detail'); }} aria-label={`Open ${row.id}`} title="View details">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>) : <tr>
                        <td colSpan={5} className="empty-state">No {isSavingsOnly ? 'savings' : isDailyOnly ? 'daily deposit' : 'deposit'} accounts match the current search or filter.</td>
                    </tr>}</tbody>
                </table>
            </div>
            <Pagination page={page} pageSize={10} totalItems={filteredRows.length} itemName={isSavingsOnly ? 'savings accounts' : isDailyOnly ? 'daily deposits' : 'deposits'} setPage={setPage} />
</section>
        {modal === 'account' && <DepositModal mode="account" accountKind={accountKind} onClose={close} onSave={(input) => saveAccount(input as DepositInput)} />}
        {modal === 'transaction' && selected && <DepositModal mode="transaction" record={selected} onClose={close} onSave={(input) => saveTransaction(input as DepositTransactionInput)} />}
        {modal === 'edit' && selected && <DepositEditModal record={selected} onClose={close} onSave={saveEdit} />}
        {modal === 'statement' && selected && <DepositStatementModal record={selected} onClose={close} onViewReceipt={(receipt) => setActiveReceipt(receipt)} />}
        {modal === 'detail' && selected && <DepositDetail record={selected} onClose={close} onEdit={() => setModal('edit')} onDelete={() => setDeleteTarget(selected)} onReverseTx={(tx) => setReverseTxTarget(tx)} onTransaction={() => setModal('transaction')} onStatement={() => setModal('statement')} onApprove={() => void approveAccount(selected)} approving={approvingId === selected.id} canApprove={canApproveDeposit} onViewReceipt={(receipt) => setActiveReceipt(receipt)} />}
        {deleteTarget && <DepositDeleteModal record={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDeleteAccount} />}
        {reverseTxTarget && selected && <DepositTxReverseModal record={selected} transaction={reverseTxTarget} onClose={() => setReverseTxTarget(null)} onConfirm={confirmReverseTx} />}
        {activeReceipt && <TransactionReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />}
        {toast && <div className="admin-toast">
            <CheckCircle2 size={16} />{toast}</div>}
    </div>;
}
