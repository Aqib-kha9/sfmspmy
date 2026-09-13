// OPERATIONS / Recurring deposits.

import { FormEvent, useEffect, useState } from 'react';
import { ArrowDownToLine, CalendarDays, CheckCircle2, ChevronRight, Download, Filter, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { rdRepository } from '../services/operations/rdApiRepository';
import type { RDInput as RdRepoInput, RDCollectionInput as RdRepoCollectionInput, SchemeView as RdSchemeView } from '../services/operations/rdApiRepository';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer } from '../../customers/types/customer.types';
import type { CustomerOption } from '../../customers/services/customerRepository';
import { messageFor } from '../services/operations/helpers';
import { formatCurrency } from '../../../lib/formatters/formatters';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';
import { AgentOptions } from '../components/backendOptions';
import { toYmd, parseYmd, addMonthsYmd, addDaysYmd, monthsBetweenYmd } from '../components/adminDateUtils';

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
    frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
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

export type RDInput = Pick<RDRecord, 'customerId' | 'monthlyAmount' | 'frequency' | 'installmentDueDate' | 'openedOn' | 'maturityDate' | 'status'> & Partial<Omit<RDRecord, 'id' | 'customerId' | 'customerName' | 'customerPhone' | 'monthlyAmount' | 'frequency' | 'installmentDueDate' | 'openedOn' | 'maturityDate' | 'status' | 'installments'>>;

export type RDCollectionInput = Pick<RDInstallment, 'amount' | 'dueDate' | 'agent'> & { reference: string } & Partial<Omit<RDInstallment, 'id' | 'amount' | 'dueDate' | 'agent' | 'reference' | 'status' | 'paidDate'>>;

/** First RD due date: next occurrence of the due day on/after the opening date. */
export function firstRdDueDate(openedOn: string, dueDay: string): string {
    const base = parseYmd(openedOn) ?? new Date();
    const day = Number.parseInt(dueDay, 10);
    const safe = Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
    const candidate = new Date(base.getFullYear(), base.getMonth(), safe);
    if (candidate <= base) candidate.setMonth(candidate.getMonth() + 1);
    return toYmd(candidate);
}

/** Steps one instalment interval at the given frequency (backend parity). */
export function nextRdDueDate(value: string, frequency: RDRecord['frequency']): string {
    if (frequency === 'Daily') return addDaysYmd(value, 1);
    if (frequency === 'Weekly') return addDaysYmd(value, 7);
    if (frequency === 'Quarterly') return addMonthsYmd(value, 3);
    return addMonthsYmd(value, 1);
}

/**
 * Builds the instalment grid from the first due date up to and including the
 * maturity date. Sunday due dates shift to the next working day without moving
 * the underlying grid, exactly like the backend scheduler.
 */
export function rdInstalmentDates(firstDue: string, maturityDate: string, frequency: RDRecord['frequency']): string[] {
    const dates: string[] = [];
    let cursor = firstDue;
    while (cursor && maturityDate && cursor <= maturityDate && dates.length < 1000) {
        let working = parseYmd(cursor) ?? new Date();
        while (working.getDay() === 0) {
            working = new Date(working.getFullYear(), working.getMonth(), working.getDate() + 1);
        }
        dates.push(toYmd(working));
        cursor = nextRdDueDate(cursor, frequency);
    }
    return dates;
}

export function RDModal({ mode, record, onClose, onSave }: { mode: 'account' | 'collection'; record?: RDRecord; onClose: () => void; onSave: (input: RDInput | RDCollectionInput) => Promise<void> }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? '');
    const [amount, setAmount] = useState(String(record?.monthlyAmount ?? ''));
    const [frequency, setFrequency] = useState<RDRecord['frequency']>(record?.frequency ?? 'Monthly');
    const [dueDay, setDueDay] = useState(record?.installmentDueDate ?? '');
    const [openedOn, setOpenedOn] = useState(record?.openedOn ?? '');
    const [maturityDate, setMaturityDate] = useState(record?.maturityDate ?? '');
    const [status, setStatus] = useState<Status>(record?.status ?? 'Active');
    const [agent, setAgent] = useState('');
    const [reference, setReference] = useState('');
    const [productCode, setProductCode] = useState(record?.productCode ?? '');
    const [branch, setBranch] = useState(record?.branch ?? '');
    const [tenureMonths, setTenureMonths] = useState(String(record?.tenureMonths ?? ''));
    const [installmentCount, setInstallmentCount] = useState(String(record?.installmentCount ?? ''));
    const [interestMethod, setInterestMethod] = useState(record?.interestMethod ?? 'Scheme rate');
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? ''));
    const [penaltyTerms, setPenaltyTerms] = useState(record?.penaltyTerms ?? '');
    const [maturityInstructions, setMaturityInstructions] = useState(record?.maturityInstructions ?? 'Payout at maturity');
    const [nomineeName, setNomineeName] = useState(record?.nomineeName ?? '');
    const [nomineePhone, setNomineePhone] = useState(record?.nomineePhone ?? '');
    const [openingChannel, setOpeningChannel] = useState(record?.openingChannel ?? 'Branch counter');
    const [documentReferences, setDocumentReferences] = useState(record?.documentReferences ?? '');
    const [nomineeRelation, setNomineeRelation] = useState(record?.nomineeRelation ?? '');
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerDetails, setCustomerDetails] = useState<ApiCustomer | undefined>();
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');
    const [schemes, setSchemes] = useState<RdSchemeView[]>([]);
    const [schemeLoading, setSchemeLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [externalReference, setExternalReference] = useState('');
    const [location, setLocation] = useState('');
    const [deviceReference, setDeviceReference] = useState('');
    const [offlineSyncReference, setOfflineSyncReference] = useState('');
    const [collectionDocuments, setCollectionDocuments] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    // Loads the selectable RD scheme catalogue so the operator books a real scheme.
    useEffect(() => {
        if (mode !== 'account') return undefined;
        let active = true;
        setSchemeLoading(true);
        rdRepository
            .listSchemes()
            .then((rows) => { if (active) setSchemes(rows.filter((scheme) => scheme.isActive)); })
            .catch(() => { if (active) setSchemes([]); })
            .finally(() => { if (active) setSchemeLoading(false); });
        return () => { active = false; };
    }, [mode]);
    // Loads the selectable customer list and re-queries the backend as the operator
    // types, so the dropdown stays accurate for large registries. Each option's
    // value is the raw customer UUID that the RD API expects.
    useEffect(() => {
        if (mode !== 'account') return undefined;
        let active = true;
        setCustomerLoading(true);
        const handle = window.setTimeout(() => {
            customerRepository
                .options(customerQuery.trim(), 100)
                .then((rows) => { if (active) { setCustomers(rows); setCustomerError(''); } })
                .catch((reason: unknown) => { if (active) setCustomerError(messageFor(reason, 'Unable to load customers for selection.')); })
                .finally(() => { if (active) setCustomerLoading(false); });
        }, 300);
        return () => { active = false; window.clearTimeout(handle); };
    }, [customerQuery, mode]);
    // Selects a customer and prefills the RD form from their real profile so the
    // operator confirms the account is opened against the right member record.
    const selectCustomer = (id: string) => {
        setCustomerId(id);
        setCustomerError('');
        if (!id) { setCustomerDetails(undefined); return; }
        setCustomerLoading(true);
        customerRepository
            .detail(id)
            .then((customer) => {
                setCustomerDetails(customer);
                setCustomerQuery(`${customer.name} · ${customer.phone}`.trim());
                setNomineeName((current) => current || customer.nomineeName);
                setNomineePhone((current) => current || customer.nomineePhone);
                setNomineeRelation((current) => current || customer.nomineeRelation);
                setBranch((current) => current || customer.branch);
                setDocumentReferences((current) => current || customer.documentReferences);
            })
            .catch((reason: unknown) => setCustomerError(messageFor(reason, 'Unable to load the selected customer.')))
            .finally(() => setCustomerLoading(false));
    };
    const selectedScheme = schemes.find((scheme) => scheme.code === productCode);
    // Human-readable scheme summary shown under the dropdown. It also states which
    // fields the form fills automatically, so the operator knows what is derived.
    const schemeHint = selectedScheme
        ? `${selectedScheme.name} collects ${selectedScheme.frequency} instalments from ${formatCurrency(Number(selectedScheme.minInstalmentAmount))}${selectedScheme.maxInstalmentAmount ? ` to ${formatCurrency(Number(selectedScheme.maxInstalmentAmount))}` : ''} at ${selectedScheme.interestRate}% · term ${selectedScheme.minDurationMonths}-${selectedScheme.maxDurationMonths} months · grace ${selectedScheme.gracePeriodMonths} month(s). Maturity date, tenure and instalment count are filled in automatically.`
        : '';
    // Applies the booked scheme's frequency and rate so the RD schedule matches it.
    // The scheme also seeds a default term that is inside its duration window; the
    // auto-calculation effect below then derives the concrete schedule from it.
    const selectScheme = (code: string) => {
        setProductCode(code);
        const scheme = schemes.find((item) => item.code === code);
        if (!scheme) return;
        setFrequency(scheme.frequency === 'daily' ? 'Daily' : scheme.frequency === 'weekly' ? 'Weekly' : scheme.frequency === 'quarterly' ? 'Quarterly' : 'Monthly');
        setInterestRate(scheme.interestRate ? String(Number(scheme.interestRate)) : '');
        setTenureMonths((current) => {
            const value = Number(current);
            const inRange = Number.isFinite(value) && value >= scheme.minDurationMonths && value <= scheme.maxDurationMonths;
            return inRange ? current : String(scheme.minDurationMonths);
        });
    };
    const schemeMinInstalment = selectedScheme && Number.isFinite(Number(selectedScheme.minInstalmentAmount))
        ? Number(selectedScheme.minInstalmentAmount)
        : undefined;
    const schemeMaxInstalment = selectedScheme?.maxInstalmentAmount && Number.isFinite(Number(selectedScheme.maxInstalmentAmount))
        ? Number(selectedScheme.maxInstalmentAmount)
        : undefined;
    const amountNumber = Number(amount);
    const amountBelowMin = Boolean(selectedScheme && amount && Number.isFinite(amountNumber) && amountNumber < (schemeMinInstalment ?? 0));
    const amountAboveMax = Boolean(
        selectedScheme && amount && Number.isFinite(amountNumber) && schemeMaxInstalment !== undefined && amountNumber > schemeMaxInstalment,
    );
    const effectiveDueDay = mode === 'account' ? dueDay || '1' : dueDay;
    const firstDuePreview = mode === 'account' ? firstRdDueDate(openedOn, effectiveDueDay) : '';
    const schedulePreview = mode === 'account' && firstDuePreview && maturityDate && openedOn
        ? rdInstalmentDates(firstDuePreview, maturityDate, frequency)
        : [];
    const tenurePreview = mode === 'account' && firstDuePreview && maturityDate ? monthsBetweenYmd(firstDuePreview, maturityDate) : 0;
    const termOutOfRange = Boolean(
        selectedScheme && tenurePreview > 0 && (tenurePreview < selectedScheme.minDurationMonths || tenurePreview > selectedScheme.maxDurationMonths),
    );
    // Auto-derives the maturity date, tenure and instalment count whenever the
    // opening date, due day, frequency, term or scheme changes. The operator only
    // chooses the inputs that matter, so the schedule mathematics is never typed
    // by hand and cannot drift from what the backend materialises on save.
    useEffect(() => {
        if (mode !== 'account') return;
        if (!openedOn) return;
        const scheme = schemes.find((item) => item.code === productCode);
        const derivedFirstDue = firstRdDueDate(openedOn, effectiveDueDay);
        let term = Number(tenureMonths);
        if (scheme && (!Number.isFinite(term) || term < scheme.minDurationMonths || term > scheme.maxDurationMonths)) {
            term = scheme.minDurationMonths;
            setTenureMonths(String(term));
        }
        if (!Number.isFinite(term) || term <= 0) return;
        const derivedMaturity = addMonthsYmd(derivedFirstDue, term);
        const dates = rdInstalmentDates(derivedFirstDue, derivedMaturity, frequency);
        setMaturityDate((current) => (current === derivedMaturity ? current : derivedMaturity));
        setInstallmentCount((current) => (String(dates.length) === current ? current : String(dates.length)));
    }, [mode, openedOn, effectiveDueDay, frequency, tenureMonths, productCode, schemes]);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            if (!amount || Number(amount) <= 0 || (mode === 'collection' && !dueDay)) { setError('Installment amount is required.'); return; }
            if (mode === 'account' && selectedScheme) {
                if (amountBelowMin) { setError(`Installment amount is below the scheme minimum of ${formatCurrency(schemeMinInstalment ?? 0)}.`); return; }
                if (amountAboveMax) { setError(`Installment amount exceeds the scheme maximum of ${formatCurrency(schemeMaxInstalment ?? 0)}.`); return; }
                if (termOutOfRange) { setError(`Selected term (${tenurePreview} months) falls outside the scheme window of ${selectedScheme.minDurationMonths}-${selectedScheme.maxDurationMonths} months.`); return; }
            }
            if (mode === 'account') { if (!customerId.trim() || !openedOn || !maturityDate) { setError('Customer mapping and account dates are required.'); return; } const scheduleDates = rdInstalmentDates(firstDuePreview, maturityDate, frequency); await onSave({ customerId: customerId.trim(), monthlyAmount: Number(amount), frequency, installmentDueDate: effectiveDueDay, openedOn, maturityDate, status, productCode: productCode || undefined, branch: branch || undefined, tenureMonths: tenureMonths ? Number(tenureMonths) : undefined, installmentCount: scheduleDates.length || (installmentCount ? Number(installmentCount) : undefined), interestMethod, interestRate: interestRate ? Number(interestRate) : undefined, penaltyTerms: penaltyTerms || undefined, maturityInstructions, nomineeName: nomineeName || undefined, nomineePhone: nomineePhone || undefined, nomineeRelation: nomineeRelation || undefined, openingChannel, documentReferences: documentReferences || undefined }); return; }
            if (!record || !reference.trim()) { setError('Receipt reference is required for collection entry.'); return; }
            await onSave({ amount: Number(amount), dueDate: dueDay, agent, reference: reference.trim(), paymentMethod, externalReference, location, deviceReference, offlineSyncReference, supportingDocuments: collectionDocuments, recordedBy: agent });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Open recurring deposit' : 'Record RD installment'}><div className="admin-modal-header"><div><div className="eyebrow">RD WORKFLOW</div><h2>{mode === 'account' ? 'Open recurring deposit account' : `Record installment · ${record?.id}`}</h2><p>{mode === 'account' ? 'Map the RD to a customer and define its collection schedule.' : 'Capture a paid installment collected by branch or doorstep agent.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>{mode === 'account' ? <><label className="full-field">Search customer<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label><label className="full-field">Customer<select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name} - {option.customerNumber}</option>)}</select></label>{customerError ? <p className="form-error full-field">{customerError}</p> : null}{customerDetails ? <p className="form-note full-field">Opening against {customerDetails.name} - {customerDetails.phone}{customerDetails.branch ? ` - ${customerDetails.branch}` : null}</p> : null}<label>Installment amount<input type="number" min={schemeMinInstalment ?? 1} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={schemeMinInstalment ? String(schemeMinInstalment) : '3000'} /></label><label>Installment frequency<select value={frequency} disabled={mode === 'account'} title={mode === 'account' ? 'Set automatically by the selected scheme' : undefined} onChange={(event) => setFrequency(event.target.value as RDRecord['frequency'])}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option></select></label><label>Installment due day<input value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="10" /></label><label>Account opening date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label>Maturity date<input type="date" value={maturityDate} readOnly aria-readonly="true" title="Auto-calculated from the opening date, due day and scheme term" onChange={(event) => setMaturityDate(event.target.value)} /></label><label>Product / scheme<select value={productCode} onChange={(event) => selectScheme(event.target.value)} aria-label="Select recurring deposit scheme"><option value="">{schemeLoading ? 'Loading schemes...' : schemes.length ? 'Select a scheme' : 'No active schemes configured'}</option>{schemes.map((scheme) => <option key={scheme.id} value={scheme.code}>{scheme.name} - {scheme.code} - {scheme.interestRate}%</option>)}</select></label>{schemeHint ? <p className="form-note full-field">{schemeHint}</p> : null}{amountBelowMin ? <p className="form-error full-field">Installment amount is below the scheme minimum of {formatCurrency(schemeMinInstalment ?? 0)}.</p> : null}{amountAboveMax ? <p className="form-error full-field">Installment amount exceeds the scheme maximum of {formatCurrency(schemeMaxInstalment ?? 0)}.</p> : null}{termOutOfRange ? <p className="form-error full-field">Selected term ({tenurePreview} months) falls outside the scheme window of {selectedScheme?.minDurationMonths}-{selectedScheme?.maxDurationMonths} months.</p> : null}{schedulePreview.length ? <p className="form-note full-field">Auto schedule: first instalment due {firstDuePreview} - {schedulePreview.length} instalments through {schedulePreview[schedulePreview.length - 1]}.</p> : null}<label>Branch<input value={branch} disabled placeholder="Loaded from the customer record" /></label><label>Tenure months<input type="number" min="1" value={tenureMonths} readOnly aria-readonly="true" title="Auto-calculated from the opening date and maturity date" onChange={(event) => setTenureMonths(event.target.value)} /></label><label>Number of installments<input type="number" min="1" value={installmentCount} readOnly aria-readonly="true" title="Auto-calculated from the term and instalment frequency" onChange={(event) => setInstallmentCount(event.target.value)} /></label><label>Interest method<input value={interestMethod} onChange={(event) => setInterestMethod(event.target.value)} /></label><label>Interest rate<input type="number" min="0" step="0.01" value={interestRate} readOnly aria-readonly="true" title="Set from the selected scheme" onChange={(event) => setInterestRate(event.target.value)} /></label><label>Penalty / late-fee terms<input value={penaltyTerms} onChange={(event) => setPenaltyTerms(event.target.value)} /></label><label>Maturity instructions<input value={maturityInstructions} onChange={(event) => setMaturityInstructions(event.target.value)} /></label><label>Nominee name<input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} /></label><label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label>Nominee relation<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} /></label><label>Opening channel<select value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)}><option>Branch counter</option><option>Doorstep collection</option><option>Mobile app</option><option>Agent assisted</option></select></label><label>Document references<input value={documentReferences} onChange={(event) => setDocumentReferences(event.target.value)} /></label><label>RD account status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Active</option><option>Pending</option><option>Review</option><option>Inactive</option></select></label></> : <><label>Installment amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Installment due date<input value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="12 Aug 2026" /></label><label>Collection agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><AgentOptions /><option>Branch counter</option></select></label><label>Payment method / channel<input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /></label><label>External reference / UTR<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label><label>Collection location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label><label>Device reference<input value={deviceReference} onChange={(event) => setDeviceReference(event.target.value)} /></label><label>Offline sync reference<input value={offlineSyncReference} onChange={(event) => setOfflineSyncReference(event.target.value)} /></label><label>Supporting documents<input value={collectionDocuments} onChange={(event) => setCollectionDocuments(event.target.value)} /></label><label>Receipt / transaction reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="RCT-88210" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : (mode === 'account' ? 'Create RD account' : 'Record installment')}</button></div></form></section></div>;
}

export function RDDetail({ record, onClose, onEdit, onCollection, onToast }: { record: RDRecord; onClose: () => void; onEdit: () => void; onCollection: () => void; onToast: (message: string) => void }) {
    const paid = record.installments.filter((item) => item.status === 'Paid').length;
    const pending = record.installments.filter((item) => item.status !== 'Paid').length;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`RD ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">RECURRING DEPOSIT / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} · {record.customerPhone} · Customer-wise RD history</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>{record.frequency} collection · due day {record.installmentDueDate}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>RD installment amount</span><strong>₹{record.monthlyAmount.toLocaleString('en-IN')}</strong></div><div><span>Paid installments</span><strong className="green-text">{paid}</strong></div><div><span>Pending installments</span><strong className="orange-text">{pending}</strong></div><div><span>Account status</span><strong>{record.status}</strong></div><div><span>Opened on</span><strong>{record.openedOn}</strong></div><div><span>Maturity date</span><strong>{record.maturityDate}</strong></div><div><span>Product / branch</span><strong>{record.productCode ?? 'Not captured'} · {record.branch ?? 'Not captured'}</strong></div><div><span>Tenure / installments</span><strong>{record.tenureMonths ?? 'Not captured'} months · {record.installmentCount ?? 'Not captured'} installments</strong></div><div><span>Interest terms</span><strong>{record.interestMethod ?? 'Not captured'}{record.interestRate !== undefined ? ` · ${record.interestRate}%` : ''}</strong></div><div><span>Nominee</span><strong>{record.nomineeName ?? 'Not captured'}{record.nomineePhone ? ` · ${record.nomineePhone}` : ''}</strong></div><div><span>Maturity / penalty terms</span><strong>{record.maturityInstructions ?? 'Not captured'} · {record.penaltyTerms ?? 'Not captured'}</strong></div><div><span>Channel / documents</span><strong>{record.openingChannel ?? 'Not captured'} · {record.documentReferences ?? 'Not captured'}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Installment collection history</h3><p>Paid and pending entries with agent and receipt audit fields.</p></div><span>{record.installments.length} installments</span></div><div className="customer-transaction-list">{record.installments.map((item) => <div className="customer-transaction-row" key={item.id}><div><strong>{item.id}</strong><span>Due {item.dueDate}{item.paidDate ? ` · Paid ${item.paidDate}` : ''}</span></div><div><b>₹{item.amount.toLocaleString('en-IN')}</b><small>{item.agent}{item.reference ? ` · ${item.reference}` : ''} · {item.paymentMethod ?? 'Method not captured'} · {item.externalReference ?? 'No external reference'} · {item.location ?? 'Location not captured'} · {item.deviceReference ?? 'Device not captured'}{item.offlineSyncReference ? ` · ${item.offlineSyncReference}` : ''}{item.supportingDocuments ? ` · Docs: ${item.supportingDocuments}` : ''}</small></div><StatusPill status={item.status === 'Paid' ? 'Completed' : item.status === 'Overdue' ? 'Overdue' : 'Pending'} /></div>)}</div></section><div className="customer-detail-actions rd-detail-actions"><button className="secondary-button" onClick={() => onToast('RD statement prepared locally for export.')}>View / export statement</button><button className="secondary-button" onClick={onEdit}>Edit RD account</button><button className="primary-button" onClick={onCollection}><ArrowDownToLine size={15} /> Record installment</button></div></section></div>;
}

export function RecurringDepositsPage() {
    const [rdRows, setRdRows] = useState<RDRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'account' | 'collection' | 'detail' | null>(null);
    const [selected, setSelected] = useState<RDRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    useEffect(() => {
        let active = true;
        rdRepository
            .list()
            .then((rows) => { if (active) setRdRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load recurring deposit accounts from the backend.')); });
        return () => { active = false; };
    }, []);
    const filteredRows = rdRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.frequency} ${row.installmentDueDate} ${row.installments.map((item) => `${item.id} ${item.agent} ${item.reference ?? ''} ${item.dueDate}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const paidCount = rdRows.reduce((total, row) => total + row.installments.filter((item) => item.status === 'Paid').length, 0);
    const pendingItems = rdRows.flatMap((row) => row.installments).filter((item) => item.status !== 'Paid');
    const saveAccount = async (input: RDInput) => {
        try {
            const record = await rdRepository.open(input as RdRepoInput);
            setRdRows((current) => [record, ...current]);
            setPage(1);
            close();
            notify(`RD account ${record.id} opened on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to open the RD account on the backend.'));
        }
    };
    const saveCollection = async (input: RDCollectionInput) => {
        if (!selected) return;
        try {
            const record = await rdRepository.recordInstalment(selected.id, input as RdRepoCollectionInput);
            setRdRows((current) => current.map((row) => (row.id === selected.id ? record : row)));
            close();
            notify('RD installment recorded on the backend.');
        } catch (reason) {
            notify(messageFor(reason, 'Unable to record the RD installment on the backend.'));
        }
    };
    const openDetail = (record: RDRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / RECURRING DEPOSITS</div><h1>Recurring Deposits</h1><p>Manage RD accounts, installment schedules, doorstep collections and customer history.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Open RD account</button></div><SummaryStrip items={[{ label: 'Active RD accounts', value: String(rdRows.filter((row) => row.status === 'Active').length), tone: 'green' }, { label: 'Paid installments', value: String(paidCount) }, { label: 'Pending installments', value: String(pendingItems.length), tone: 'orange' }, { label: 'Collection due', value: `₹${pendingItems.reduce((total, item) => total + item.amount, 0).toLocaleString('en-IN')}`, tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search RD, customer, agent or receipt..." aria-label="Search recurring deposits" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter RD accounts by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Completed">Completed</option><option value="Review">Review</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Date range selector is ready for local RD data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Pending'); setPage(1); notify('Showing RD accounts with pending installments.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} RD account records prepared for export.`)} aria-label="Export RD data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>RD account / customer</th><th>Installment</th><th>Schedule</th><th>Paid / pending</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => { const paid = row.installments.filter((item) => item.status === 'Paid').length; const pending = row.installments.filter((item) => item.status !== 'Paid').length; return <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.customerPhone}</span><small>{row.id}</small></td><td className="table-amount">₹{row.monthlyAmount.toLocaleString('en-IN')}</td><td className="table-muted">{row.frequency} · due {row.installmentDueDate}<br />Matures {row.maturityDate}</td><td className="rd-counts"><span className="green-text">{paid} paid</span><span className="orange-text">{pending} pending</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>; }) : <tr><td className="empty-state" colSpan={6}>No RD accounts match the current search and status filter.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {visibleRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} RD accounts</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={`pagination-button ${page === item ? 'selected' : ''}`} key={item} onClick={() => setPage(item)}>{item}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'account' && <RDModal mode="account" onClose={close} onSave={(input) => saveAccount(input as RDInput)} />}{modal === 'collection' && selected && <RDModal mode="collection" record={selected} onClose={close} onSave={(input) => saveCollection(input as RDCollectionInput)} />}{modal === 'detail' && selected && <RDDetail record={rdRows.find((row) => row.id === selected.id) ?? selected} onClose={close} onEdit={() => setModal('account')} onCollection={() => setModal('collection')} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={15} />{toast}</div>}</div>;
}
