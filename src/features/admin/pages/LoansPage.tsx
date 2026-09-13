// OPERATIONS / Loans.

import { FormEvent, useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, CheckCircle2, Download, Filter, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { loansRepository } from '../services/operations/loansApiRepository';
import type { LoanInput as LoanRepoInput, LoanRepaymentInput as LoanRepoRepaymentInput, LoanProductView } from '../services/operations/loansApiRepository';
import type { ApproveLoanInput, LoanPaymentMethod, RescheduleLoanInput, SettleLoanInput, WriteOffLoanInput } from '../../../lib/api/types';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer } from '../../customers/types/customer.types';
import type { CustomerOption } from '../../customers/services/customerRepository';
import { messageFor } from '../services/operations/helpers';
import { Modal } from '../../../components/overlays/Modal';
import { formatCurrency } from '../../../lib/formatters/formatters';
import { useAuth } from '../../auth/AuthContext';
import { BUSINESS_RULES } from '../../../lib/permissions/permissions';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';
import { addMonthsYmd, addDaysYmd } from '../components/adminDateUtils';

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
    loanId?: string;
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

export type LoanCollectionInput = { amount: number; paidOn?: string; paymentMethod: LoanPaymentMethod; referenceNumber?: string };

/** Payment methods accepted by the backend allocation engine (see loans.schemas.ts). */
export const LOAN_PAYMENT_METHODS: Array<{ value: LoanPaymentMethod; label: string }> = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'mobile_money', label: 'Mobile money' },
    { value: 'upi', label: 'UPI' },
    { value: 'neft', label: 'NEFT' },
    { value: 'rtgs', label: 'RTGS' },
];

/** Methods for which the backend does not require a receipt reference. */
export const LOAN_METHODS_WITHOUT_REFERENCE: LoanPaymentMethod[] = ['cash', 'mobile_money'];

/** One row of the read-only allocation projection shown in the collection modal. */
export type LoanAllocationProjectionRow = {
    id: string;
    label: string;
    dueDate: string;
    outstanding: number;
    interest: number;
    principal: number;
    remaining: number;
};

export function LoanModal({ mode, record, onClose, onSave }: { mode: 'account' | 'collection'; record?: LoanRecord; onClose: () => void; onSave: (input: LoanInput | LoanCollectionInput) => Promise<void> }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? '');
    const [loanType, setLoanType] = useState<LoanRecord['loanType']>(record?.loanType ?? 'Gold Loan');
    const [productCode, setProductCode] = useState(record?.productCode ?? '');
    const [purpose, setPurpose] = useState(record?.purpose ?? '');
    const [principal, setPrincipal] = useState(String(record?.principal ?? ''));
    const [processingFee, setProcessingFee] = useState(String(record?.processingFee ?? 0));
    const [documentationFee, setDocumentationFee] = useState(String(record?.documentationFee ?? 0));
    const [insuranceFee, setInsuranceFee] = useState(String(record?.insuranceFee ?? 0));
    const [otherCharges, setOtherCharges] = useState(String(record?.otherCharges ?? 0));
    const [loanDate, setLoanDate] = useState(record?.loanDate ?? '');
    const [firstDueDate, setFirstDueDate] = useState(record?.firstDueDate ?? '');
    const [tenureMonths, setTenureMonths] = useState(String(record?.tenureMonths ?? 12));
    const [frequency, setFrequency] = useState<LoanFrequency>(record?.repaymentFrequency ?? 'Monthly');
    const [interestMethod, setInterestMethod] = useState<LoanInterestMethod>(record?.interestMethod ?? 'Reducing balance');
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? 14.5));
    const [installmentAmount, setInstallmentAmount] = useState(String(record?.installmentAmount ?? ''));
    const [gracePeriodDays, setGracePeriodDays] = useState(String(record?.gracePeriodDays ?? 0));
    const [moratoriumMonths, setMoratoriumMonths] = useState(String(record?.moratoriumMonths ?? 0));
    const [lateFee, setLateFee] = useState(String(record?.lateFee ?? 0));
    const [penalInterestRate, setPenalInterestRate] = useState(String(record?.penalInterestRate ?? 0));
    const [incomeSource, setIncomeSource] = useState(record?.incomeSource ?? '');
    const [monthlyIncome, setMonthlyIncome] = useState(String(record?.monthlyIncome ?? ''));
    const [guarantorName, setGuarantorName] = useState(record?.guarantorName ?? '');
    const [guarantorPhone, setGuarantorPhone] = useState(record?.guarantorPhone ?? '');
    const [collateralDescription, setCollateralDescription] = useState(record?.collateralDescription ?? '');
    const [collateralValue, setCollateralValue] = useState(String(record?.collateralValue ?? ''));
    const [collateralLtv, setCollateralLtv] = useState(String(record?.collateralLtv ?? ''));
    const [collateralReference, setCollateralReference] = useState(record?.collateralReference ?? '');
    const [disbursementMethod, setDisbursementMethod] = useState<NonNullable<LoanRecord['disbursementMethod']>>(record?.disbursementMethod ?? 'Bank transfer');
    const [disbursementReference, setDisbursementReference] = useState(record?.disbursementReference ?? '');
    const [status, setStatus] = useState<Status>(record?.status ?? 'Review');
    const [amount, setAmount] = useState(String(record?.installmentAmount ?? ''));
    // Repayments only carry what was collected and how; the backend allocation
    // engine derives the principal / interest split from the instalment ledger.
    const [paymentMethod, setPaymentMethod] = useState<LoanPaymentMethod>('cash');
    const [paidOn, setPaidOn] = useState('');
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerDetails, setCustomerDetails] = useState<ApiCustomer | undefined>();
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');
    const [products, setProducts] = useState<LoanProductView[]>([]);
    const [productLoading, setProductLoading] = useState(false);
    const [productError, setProductError] = useState('');
    // Loads the active loan product / scheme catalogue so the operator books against an
    // approved product definition instead of typing a free-form scheme code that the
    // backend would reject or misprice.
    useEffect(() => {
        if (mode !== 'account') return undefined;
        let active = true;
        setProductLoading(true);
        loansRepository
            .listProducts()
            .then((rows) => { if (active) { setProducts(rows.filter((item) => item.isActive)); setProductError(''); } })
            .catch((reason: unknown) => { if (active) setProductError(messageFor(reason, 'Unable to load the loan product catalogue.')); })
            .finally(() => { if (active) setProductLoading(false); });
        return () => { active = false; };
    }, [mode]);
    // Loads the selectable customer list and re-queries the backend as the operator
    // types, so the dropdown stays accurate for large registries. Each option's value
    // is the raw customer UUID that the loan API expects.
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
    // Selects a customer and prefills the underwriting fields from their real profile so
    // the operator confirms the loan is booked against the right member record.
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
                setIncomeSource((current) => current || customer.occupation);
                setGuarantorPhone((current) => current || customer.alternatePhone);
            })
            .catch((reason: unknown) => setCustomerError(messageFor(reason, 'Unable to load the selected customer.')))
            .finally(() => setCustomerLoading(false));
    };
    const frequencyFromApi = (value: string): LoanFrequency => {
        switch (value) {
            case 'daily': return 'Daily';
            case 'weekly': return 'Weekly';
            case 'quarterly': return 'Quarterly';
            default: return 'Monthly';
        }
    };
    const loanTypeFromCategory = (value: string): LoanRecord['loanType'] | undefined => {
        switch (value) {
            case 'gold': return 'Gold Loan';
            case 'mortgage': return 'Mortgage Loan';
            case 'personal': return 'Personal Loan';
            case 'business': return 'Business Loan';
            case 'shg': return 'SHG Loan';
            case 'other': return 'Other Loan';
            default: return undefined;
        }
    };
    // The debounced search replaces the option list, so the previously selected customer
    // can fall out of it and the bound <select> reverts to its placeholder. Re-seed the
    // chosen customer as an option so the selection is always represented.
    const selectedCustomerOption: CustomerOption | undefined = customerDetails && customerId
        ? { id: customerId, name: customerDetails.name, customerNumber: customerDetails.phone || customerId }
        : undefined;
    const customerOptions = selectedCustomerOption && !customers.some((option) => option.id === selectedCustomerOption.id)
        ? [selectedCustomerOption, ...customers]
        : customers;
    const selectedProduct = products.find((item) => item.code.toLowerCase() === productCode.trim().toLowerCase());
    const principalNumber = Number(principal);
    const tenureNumber = Number(tenureMonths);
    const rateNumber = Number(interestRate);
    const collateralValueNumber = Number(collateralValue);
    const ltvNumber = Number(collateralLtv);
    const principalBelowMin = Boolean(selectedProduct && principal && Number.isFinite(principalNumber) && principalNumber < Number(selectedProduct.minAmount));
    const principalAboveMax = Boolean(selectedProduct && principal && Number.isFinite(principalNumber) && principalNumber > Number(selectedProduct.maxAmount));
    const tenureBelowMin = Boolean(selectedProduct && tenureMonths && Number.isFinite(tenureNumber) && tenureNumber < selectedProduct.minTenureMonths);
    const tenureAboveMax = Boolean(selectedProduct && tenureMonths && Number.isFinite(tenureNumber) && tenureNumber > selectedProduct.maxTenureMonths);
    const rateBelowMin = Boolean(interestRate && Number.isFinite(rateNumber) && rateNumber < BUSINESS_RULES.MIN_INTEREST_RATE);
    const rateAboveMax = Boolean(interestRate && Number.isFinite(rateNumber) && rateNumber > BUSINESS_RULES.MAX_INTEREST_RATE);
    // Collateral must cover the loan at the society lending cap (loan <= 60% of value).
    const requiredCollateral = Number.isFinite(principalNumber) && principalNumber > 0 ? Math.round((principalNumber * 100) / BUSINESS_RULES.COLLATERAL_LENDING_PERCENT) : 0;
    const collateralRequired = loanType === 'Gold Loan' || Boolean(selectedProduct?.collateralRequired);
    const collateralBelowRequired = Boolean(collateralRequired && collateralValue && requiredCollateral > 0 && collateralValueNumber < requiredCollateral);
    const ltvAboveCap = Boolean(collateralLtv && Number.isFinite(ltvNumber) && ltvNumber > BUSINESS_RULES.COLLATERAL_LENDING_PERCENT);
    // Mirrors the backend repayment maths so the operator sees the projected installment.
    const projectedInstallment = (() => {
        if (!Number.isFinite(principalNumber) || principalNumber <= 0 || !Number.isFinite(tenureNumber) || tenureNumber <= 0) return 0;
        if (interestMethod === 'Flat') return Math.round((principalNumber + (principalNumber * rateNumber * tenureNumber) / 1200) / tenureNumber);
        const monthlyRate = rateNumber / 1200;
        if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) return Math.round(principalNumber / tenureNumber);
        const factor = Math.pow(1 + monthlyRate, tenureNumber);
        return Math.round((principalNumber * monthlyRate * factor) / (factor - 1));
    })();
    // Auto-fills the installment amount from the projected repayment maths whenever the
    // principal, rate, tenure or method change, so the operator is not blocked by an
    // empty field; they can still override the figure before submitting.
    useEffect(() => {
        if (mode !== 'account' || record) return;
        if (projectedInstallment <= 0) return;
        const derived = String(projectedInstallment);
        setInstallmentAmount((current) => (current === derived ? current : derived));
    }, [mode, record, projectedInstallment]);
    const productHint = selectedProduct
        ? `${selectedProduct.name} · ${formatCurrency(Number(selectedProduct.minAmount))} - ${formatCurrency(Number(selectedProduct.maxAmount))} · ${selectedProduct.minTenureMonths}-${selectedProduct.maxTenureMonths} months · ${selectedProduct.interestRate}% p.a. · ${selectedProduct.interestMethod === 'flat' ? 'Flat' : 'Reducing balance'} · ${selectedProduct.repaymentFrequency}${selectedProduct.collateralRequired ? ' · collateral required' : ''} (max LTV ${selectedProduct.maxLtvPercent}%).`
        : '';
    // Applies the selected product's approved rate, method, frequency and tenure band so
    // the booking matches the underwritten product definition.
    const selectProduct = (code: string) => {
        setProductCode(code);
        const product = products.find((item) => item.code.toLowerCase() === code.toLowerCase());
        if (!product) return;
        setInterestRate(String(Number(product.interestRate)));
        setInterestMethod(product.interestMethod === 'flat' ? 'Flat' : 'Reducing balance');
        setFrequency(frequencyFromApi(product.repaymentFrequency));
        const mappedType = loanTypeFromCategory(product.category);
        if (mappedType) setLoanType(mappedType);
        setTenureMonths((current) => {
            const value = Number(current);
            if (Number.isFinite(value) && value >= product.minTenureMonths && value <= product.maxTenureMonths) return current;
            return String(product.minTenureMonths);
        });
        const defaultPurpose = (product.allowedPurposes ?? [])[0];
        if (defaultPurpose) setPurpose((current) => current || defaultPurpose);
    };
    const deriveFirstDue = (date: string, freq: LoanFrequency): string => {
        if (!date) return '';
        if (freq === 'Daily') return addDaysYmd(date, 1);
        if (freq === 'Weekly') return addDaysYmd(date, 7);
        if (freq === 'Fortnightly') return addDaysYmd(date, 14);
        if (freq === 'Quarterly') return addMonthsYmd(date, 3);
        return addMonthsYmd(date, 1);
    };
    // Auto-derives the first due date whenever the application date or frequency changes,
    // so the operator never types a due date that drifts from the backend schedule.
    useEffect(() => {
        if (mode !== 'account') return;
        if (!loanDate) return;
        const derived = deriveFirstDue(loanDate, frequency);
        setFirstDueDate((current) => (current === derived ? current : derived));
    }, [mode, loanDate, frequency]);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            setError('');
            if (mode === 'account') {
                if (!customerId.trim()) { setError('Select the customer this loan is booked against.'); return; }
                if (!productCode.trim()) { setError('Select an approved product / scheme so the loan is booked against a real product.'); return; }
                if (!loanDate || !firstDueDate) { setError('Loan / application date and first due date are required.'); return; }
                if (!Number.isFinite(Number(principal)) || Number(principal) <= 0) { setError('Enter a positive gross principal.'); return; }
                if (!Number.isFinite(Number(tenureMonths)) || Number(tenureMonths) <= 0) { setError('Enter a positive tenure in months.'); return; }
                if (!Number.isFinite(Number(installmentAmount)) || Number(installmentAmount) <= 0) { setError('Enter a positive installment amount.'); return; }
                const values = [principal, tenureMonths, interestRate, installmentAmount, processingFee, documentationFee, insuranceFee, otherCharges, gracePeriodDays, moratoriumMonths, lateFee, penalInterestRate];
                if (values.some((value) => value === '' || Number(value) < 0)) { setError('Charges, grace, moratorium and penal terms must be non-negative.'); return; }
                if (!selectedProduct) { setError('Select an approved product / scheme so the loan is booked against a real product.'); return; }
                if (principalBelowMin || principalAboveMax) { setError(`Product principal must be between ${formatCurrency(Number(selectedProduct?.minAmount ?? 0))} and ${formatCurrency(Number(selectedProduct?.maxAmount ?? 0))}.`); return; }
                if (tenureBelowMin || tenureAboveMax) { setError(`Product tenure must be between ${selectedProduct?.minTenureMonths} and ${selectedProduct?.maxTenureMonths} months.`); return; }
                if (rateBelowMin || rateAboveMax) { setError(`Interest rate must be between ${BUSINESS_RULES.MIN_INTEREST_RATE}% and ${BUSINESS_RULES.MAX_INTEREST_RATE}% p.a. as per society rules.`); return; }
                if (collateralRequired && (!collateralDescription.trim() || Number(collateralValue) <= 0 || Number(collateralLtv) <= 0)) { setError('This loan requires a collateral description, valuation and LTV percentage.'); return; }
                if (ltvAboveCap) { setError(`Collateral LTV cannot exceed ${BUSINESS_RULES.COLLATERAL_LENDING_PERCENT}% as per society rules.`); return; }
                if (collateralBelowRequired) { setError(`Collateral value must be at least ${formatCurrency(requiredCollateral)} to cover ${formatCurrency(principalNumber)} at ${BUSINESS_RULES.COLLATERAL_LENDING_PERCENT}% LTV.`); return; }
                if (disbursementMethod !== 'Cash' && !disbursementReference.trim()) { setError('A bank or account disbursement reference is required.'); return; }
                await onSave({ customerId: customerId.trim(), loanType, productCode: productCode.trim(), purpose: purpose.trim(), principal: Number(principal), processingFee: Number(processingFee), documentationFee: Number(documentationFee), insuranceFee: Number(insuranceFee), otherCharges: Number(otherCharges), disbursementMethod, disbursementReference: disbursementReference.trim() || undefined, loanDate, firstDueDate, tenureMonths: Number(tenureMonths), repaymentFrequency: frequency, interestMethod, interestRate: Number(interestRate), gracePeriodDays: Number(gracePeriodDays), moratoriumMonths: Number(moratoriumMonths), lateFee: Number(lateFee), penalInterestRate: Number(penalInterestRate), installmentAmount: Number(installmentAmount), incomeSource: incomeSource.trim() || undefined, monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined, guarantorName: guarantorName.trim() || undefined, guarantorPhone: guarantorPhone.trim() || undefined, collateralDescription: collateralDescription.trim() || undefined, collateralValue: collateralValue ? Number(collateralValue) : undefined, collateralLtv: collateralLtv ? Number(collateralLtv) : undefined, collateralReference: collateralReference.trim() || undefined, status });
                return;
            }
            const total = Number(amount);
            if (!record) { setError('Loan account was not found for this repayment.'); return; }
            if (!Number.isFinite(total) || total <= 0) { setError('Enter a positive receipt amount collected from the borrower.'); return; }
            if (collectionReferenceRequired && !reference.trim()) { setError('A receipt reference is required for this payment method.'); return; }
            await onSave({ amount: total, paidOn: paidOn || undefined, paymentMethod, referenceNumber: reference.trim() || undefined });
        } finally { setSaving(false); }
    };
    // Read-only projection of how the backend allocation engine will spread the
    // entered receipt: oldest unpaid instalment first, interest settled before
    // principal (penalty / fees are '0.00' in the engine split). Display only —
    // the authoritative split is computed server-side on submit.
    const allocationProjection = (() => {
        const total = Number(amount);
        if (mode !== 'collection' || !record || !Number.isFinite(total) || total <= 0) return [] as LoanAllocationProjectionRow[];
        let remaining = total;
        const rows: LoanAllocationProjectionRow[] = [];
        for (const instalment of record.installments) {
            if (remaining <= 0) break;
            if (instalment.status === 'Paid') continue;
            const interestOutstanding = Math.max(0, instalment.interest);
            const principalOutstanding = Math.max(0, instalment.principal);
            const outstanding = interestOutstanding + principalOutstanding;
            if (outstanding <= 0) continue;
            const interestTake = Math.min(interestOutstanding, remaining);
            const principalTake = Math.min(principalOutstanding, Math.max(0, remaining - interestTake));
            remaining = Math.max(0, remaining - interestTake - principalTake);
            rows.push({ id: instalment.id, label: instalment.id, dueDate: instalment.dueDate, outstanding, interest: interestTake, principal: principalTake, remaining });
        }
        return rows;
    })();
    const collectionReferenceRequired = !LOAN_METHODS_WITHOUT_REFERENCE.includes(paymentMethod);
    const field = (label: string, value: string, setValue: (value: string) => void, type = 'text') => <label>{label}<input type={type} value={value} onChange={(event) => setValue(event.target.value)} /></label>;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Create production loan account' : 'Record loan installment'}>
            <div className="admin-modal-header">
                <div>
                    <div className="eyebrow">LOAN WORKFLOW</div>
                    <h2>{mode === 'account' ? 'Create production loan account' : `Record installment · ${record?.id}`}</h2>
                    <p>{mode === 'account' ? 'Capture underwriting, pricing, disbursement and security inputs.' : 'Capture the receipt and payment method; the backend allocates it across the instalment ledger.'}</p>
                </div>
                <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button>
            </div>
            <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
                {mode === 'account' ? <>
                    <div className="full-field form-section-heading">
                        <strong>Application and pricing</strong>
                        <span>These values drive the repayment schedule.</span>
                    </div>
                    <label className="full-field">Search customer<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label>
                    <label className="full-field">Customer<select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customerOptions.map((option) => <option key={option.id} value={option.id}>{option.name} | {option.customerNumber}</option>)}</select></label>
                    {customerError ? <p className="form-error full-field">{customerError}</p> : null}
                    {customerDetails ? <p className="form-note full-field">Booking against {customerDetails.name} - {customerDetails.phone}{customerDetails.branch ? ` - ${customerDetails.branch}` : null}</p> : null}
                    <label>Product / scheme<select value={productCode} onChange={(event) => selectProduct(event.target.value)} aria-label="Select loan product"><option value="">{productLoading ? 'Loading products...' : 'Select a product'}</option>{products.map((product) => <option key={product.id} value={product.code}>{`${product.name} | ${product.code} | ${Number(product.interestRate)}% p.a.`}</option>)}</select></label>
                    <label>Product / scheme code<input value={productCode} onChange={(event) => setProductCode(event.target.value)} /></label>
                    {productError ? <p className="form-error full-field">{productError}</p> : null}
                    {productHint ? <p className="form-note full-field">{productHint}</p> : null}
                    <label>Loan type<select value={loanType} onChange={(event) => setLoanType(event.target.value as LoanRecord['loanType'])}><option>Daily Loan</option><option>Weekly Loan</option><option>Personal Loan</option><option>Mortgage Loan</option><option>Business Loan</option><option>Gold Loan</option><option>SHG Loan</option><option>Other Loan</option></select></label>
                    {field('Loan purpose', purpose, setPurpose)}
                    <label>Gross principal<input type="number" value={principal} onChange={(event) => setPrincipal(event.target.value)} />{principalBelowMin ? <small className="form-error">Principal is below the product minimum {formatCurrency(Number(selectedProduct?.minAmount ?? 0))}.</small> : null}{principalAboveMax ? <small className="form-error">Principal exceeds the product maximum {formatCurrency(Number(selectedProduct?.maxAmount ?? 0))}.</small> : null}</label>
                    <label>Interest rate (% p.a.)<input type="number" min={BUSINESS_RULES.MIN_INTEREST_RATE} max={BUSINESS_RULES.MAX_INTEREST_RATE} step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} readOnly={Boolean(selectedProduct)} aria-readonly={Boolean(selectedProduct)} />{rateBelowMin ? <small className="form-error">Rate must be at least {BUSINESS_RULES.MIN_INTEREST_RATE}% as per society rules.</small> : null}{rateAboveMax ? <small className="form-error">Rate cannot exceed {BUSINESS_RULES.MAX_INTEREST_RATE}% as per society rules.</small> : null}{selectedProduct ? <small className="form-note">Set from the selected product; not editable.</small> : null}</label>
                    <label>Interest method<select value={interestMethod} onChange={(event) => setInterestMethod(event.target.value as LoanInterestMethod)}><option>Flat</option><option>Reducing balance</option><option>Daily reducing</option></select></label>
                    <label>Repayment frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as LoanFrequency)}><option>Daily</option><option>Weekly</option><option>Fortnightly</option><option>Monthly</option><option>Quarterly</option></select></label>
                    <label>Tenure (months)<input type="number" min="1" value={tenureMonths} onChange={(event) => setTenureMonths(event.target.value)} />{tenureBelowMin ? <small className="form-error">Product requires at least {selectedProduct?.minTenureMonths} months.</small> : null}{tenureAboveMax ? <small className="form-error">Product allows at most {selectedProduct?.maxTenureMonths} months.</small> : null}</label>
                    <label>Installment amount<input type="number" value={installmentAmount} onChange={(event) => setInstallmentAmount(event.target.value)} />{projectedInstallment > 0 ? <small className="form-note">Projected installment {formatCurrency(projectedInstallment)} using the selected method.</small> : null}</label>
                    {field('Loan / application date', loanDate, setLoanDate, 'date')}
                    <label>First due date<input type="date" value={firstDueDate} readOnly aria-readonly="true" />{loanDate ? <small className="form-note">Derived from the application date and repayment frequency.</small> : null}</label>
                    <div className="full-field form-section-heading">
                        <strong>Charges and repayment controls</strong>
                        <span>Charges are separated from principal for transparent net disbursement.</span>
                    </div>
                    {field('Processing fee', processingFee, setProcessingFee, 'number')}
                    {field('Documentation fee', documentationFee, setDocumentationFee, 'number')}
                    {field('Insurance fee', insuranceFee, setInsuranceFee, 'number')}
                    {field('Other charges', otherCharges, setOtherCharges, 'number')}
                    {field('Grace period (days)', gracePeriodDays, setGracePeriodDays, 'number')}
                    {field('Moratorium (months)', moratoriumMonths, setMoratoriumMonths, 'number')}
                    {field('Late fee per missed installment', lateFee, setLateFee, 'number')}
                    {field('Penal interest (% p.a.)', penalInterestRate, setPenalInterestRate, 'number')}
                    <div className="full-field form-section-heading">
                        <strong>Borrower, security and disbursement</strong>
                        <span>Conditional security fields are mandatory when the product requires collateral.</span>
                    </div>
                    {field('Income / employment source', incomeSource, setIncomeSource)}
                    {field('Monthly income', monthlyIncome, setMonthlyIncome, 'number')}
                    {field('Guarantor name', guarantorName, setGuarantorName)}
                    {field('Guarantor phone', guarantorPhone, setGuarantorPhone)}
                    {field('Collateral description', collateralDescription, setCollateralDescription)}
                    <label>Collateral value<input type="number" value={collateralValue} onChange={(event) => setCollateralValue(event.target.value)} />{collateralBelowRequired ? <small className="form-error">Collateral must be at least {formatCurrency(requiredCollateral)} to cover {formatCurrency(principalNumber)} at {BUSINESS_RULES.COLLATERAL_LENDING_PERCENT}% LTV.</small> : null}</label>
                    <label>Collateral LTV (%)<input type="number" min="1" max={BUSINESS_RULES.COLLATERAL_LENDING_PERCENT} value={collateralLtv} onChange={(event) => setCollateralLtv(event.target.value)} />{ltvAboveCap ? <small className="form-error">LTV cannot exceed {BUSINESS_RULES.COLLATERAL_LENDING_PERCENT}% as per society rules.</small> : null}</label>
                    {field('Collateral custody reference', collateralReference, setCollateralReference)}
                    <label>Disbursement method<select value={disbursementMethod} onChange={(event) => setDisbursementMethod(event.target.value as NonNullable<LoanRecord['disbursementMethod']>)}><option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>Mobile money</option></select></label>
                    {field('Disbursement reference', disbursementReference, setDisbursementReference)}
                    <label>Initial lifecycle status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Review</option><option>Pending</option><option>Active</option><option>Overdue</option></select></label>
                </> : <>
                    {field('Receipt amount', amount, setAmount, 'number')}
                    <label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as LoanPaymentMethod)} aria-label="Payment method">{LOAN_PAYMENT_METHODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label>Paid date<input type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />{!paidOn ? <small className="form-note">Leave blank to use today's date.</small> : null}</label>
                    <label>Receipt reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={collectionReferenceRequired ? 'Required for this payment method' : 'Optional'} /></label>
                    {collectionReferenceRequired ? <p className="form-note full-field">A reference number is mandatory for non-cash / non-mobile-money collections.</p> : null}
                    <div className="full-field form-section-heading">
                        <strong>Allocation preview (read-only)</strong>
                        <span>Computed by the backend across the oldest unpaid instalments; interest is settled before principal. This is a projection only.</span>
                    </div>
                    {allocationProjection.length ? <div className="full-field statement-table-wrap"><table className="statement-table"><thead><tr><th>Instalment</th><th>Due date</th><th>Outstanding</th><th>Interest first</th><th>Principal next</th><th>Receipt remaining</th></tr></thead><tbody>{allocationProjection.map((row) => <tr key={row.id}><td>{row.label}</td><td>{row.dueDate}</td><td>{formatCurrency(row.outstanding)}</td><td>{formatCurrency(row.interest)}</td><td>{formatCurrency(row.principal)}</td><td>{formatCurrency(row.remaining)}</td></tr>)}</tbody></table></div> : <p className="form-note full-field">Enter a positive receipt amount to preview how the backend will allocate it.</p>}
                </>}
                {error && <p className="form-error full-field">{error}</p>}
                <div className="admin-form-actions full-field">
                    <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                    <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : (mode === 'account' ? 'Create loan workflow' : 'Record repayment')}</button>
                </div>
            </form>
        </section>
    </div>;
}

// Captures the sanctioning terms required by the backend approveSchema: an
// application cannot be approved with an empty body, it needs a positive
// approvedAmount (plus optional tenure / final rate). The recommendation step
// is chained by the caller so applied -> recommended -> approved succeeds.
export type LoanLifecycleInput = { reason?: string; settledOn?: string; effectiveFrom?: string; newTenureMonths?: number; newInterestRate?: string };

/**
 * Confirms a terminal loan action and captures the operator's own narrative.
 * Settle is only accepted by the backend when nothing is outstanding, so the
 * dialog makes that precondition explicit; a write-off demands a real reason
 * (the backend requires at least 3 characters) before the balance is waived.
 */
export function LoanLifecycleModal({ record, kind, onClose, onSave }: { record: LoanRecord; kind: 'Settled' | 'Written off'; onClose: () => void; onSave: (input: LoanLifecycleInput) => Promise<void> }) {
    const isWriteOff = kind === 'Written off';
    const [reason, setReason] = useState('');
    const [settledOn, setSettledOn] = useState(new Date().toISOString().slice(0, 10));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        setError('');
        const trimmed = reason.trim();
        if (isWriteOff && trimmed.length < 3) { setError('Enter a write-off reason of at least 3 characters.'); return; }
        if (trimmed.length > 500) { setError('The reason must be 500 characters or fewer.'); return; }
        if (!isWriteOff && !/^\d{4}-\d{2}-\d{2}$/.test(settledOn)) { setError('Enter the settlement date as YYYY-MM-DD.'); return; }
        const input: LoanLifecycleInput = isWriteOff
            ? { reason: trimmed }
            : { settledOn, ...(trimmed ? { reason: trimmed } : {}) };
        setSaving(true);
        try {
            await onSave(input);
        } catch (reason2) {
            setError(messageFor(reason2, isWriteOff ? 'Unable to write off the loan.' : 'Unable to settle the loan.'));
        } finally {
            setSaving(false);
        }
    };
    return <Modal title={`${isWriteOff ? 'Write off' : 'Settle'} loan · ${record.id}`} eyebrow={`${isWriteOff ? 'LOAN WRITE-OFF' : 'LOAN SETTLEMENT'} / ${record.customerName}`} onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            <p className="form-note full-field">{isWriteOff
                ? <>Writing off {record.customerName} ({record.customerId}) waives the entire outstanding balance of ₹{record.outstandingAmount.toLocaleString('en-IN')} and closes the loan. The backend records the write-off amount, reason and approver as an irreversible terminal action.</>
                : <>Settling {record.customerName} ({record.customerId}) closes the loan once nothing remains outstanding. The backend rejects the request while any instalment is unpaid, so record the final receipts first.</>}</p>
            {isWriteOff
                ? <label className="full-field">Write-off reason (minimum 3 characters)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} aria-label="Write-off reason" /></label>
                : <>
                    <label>Settlement date<input type="date" value={settledOn} onChange={(event) => setSettledOn(event.target.value)} aria-label="Settlement date" /></label>
                    <label>Settlement note (optional)<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} aria-label="Settlement note" /></label>
                    <p className="form-note full-field">Outstanding balance on the ledger: ₹{record.outstandingAmount.toLocaleString('en-IN')}. Settle is only accepted while this reads zero.</p>
                </>}
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? (isWriteOff ? 'Writing off…' : 'Settling…') : (isWriteOff ? 'Write off loan' : 'Settle loan')}</button>
            </div>
        </form>
    </Modal>;
}

/**
 * Re-amortises the remaining balance over a fresh term. The backend reschedule
 * contract requires an effective date plus a reason of at least 3 characters
 * (and optionally a new term / rate), so the operator supplies all of them here
 * instead of the UI shipping a canned placeholder reason.
 */
export function LoanRescheduleModal({ record, onClose, onSave }: { record: LoanRecord; onClose: () => void; onSave: (input: LoanLifecycleInput) => Promise<void> }) {
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
    const [newTenureMonths, setNewTenureMonths] = useState(String(record.tenureMonths));
    const [newInterestRate, setNewInterestRate] = useState(String(record.interestRate));
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        setError('');
        const trimmed = reason.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) { setError('Enter the effective date as YYYY-MM-DD.'); return; }
        if (trimmed.length < 3) { setError('Enter a reschedule reason of at least 3 characters.'); return; }
        if (trimmed.length > 500) { setError('The reason must be 500 characters or fewer.'); return; }
        const tenure = Number(newTenureMonths);
        if (!Number.isInteger(tenure) || tenure < 1 || tenure > 240) { setError('The new tenure must be between 1 and 240 months.'); return; }
        const rate = Number(newInterestRate);
        if (!(rate > 0) || rate > BUSINESS_RULES.MAX_INTEREST_RATE) { setError(`The new interest rate must be greater than 0 and at most ${BUSINESS_RULES.MAX_INTEREST_RATE}% p.a.`); return; }
        setSaving(true);
        try {
            await onSave({ effectiveFrom, newTenureMonths: tenure, newInterestRate: String(Math.round(rate * 10000) / 10000), reason: trimmed });
        } catch (reason2) {
            setError(messageFor(reason2, 'Unable to reschedule the loan.'));
        } finally {
            setSaving(false);
        }
    };
    return <Modal title={`Reschedule loan · ${record.id}`} eyebrow={`LOAN RESCHEDULE / ${record.customerName}`} onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            <p className="form-note full-field">Re-amortises the remaining balance of {record.customerName} ({record.customerId}) over a new term. The backend keeps the previous schedule and records the change, the new terms and the reason as a restructure event.</p>
            <label>Effective from<input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} aria-label="Effective from" /></label>
            <label>New tenure (months)<input type="number" min={1} max={240} value={newTenureMonths} onChange={(event) => setNewTenureMonths(event.target.value)} aria-label="New tenure in months" /></label>
            <label>New interest rate (% p.a.)<input type="number" min={BUSINESS_RULES.MIN_INTEREST_RATE} max={BUSINESS_RULES.MAX_INTEREST_RATE} step="0.01" value={newInterestRate} onChange={(event) => setNewInterestRate(event.target.value)} aria-label="New interest rate" /></label>
            <label>Reschedule reason (minimum 3 characters)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} aria-label="Reschedule reason" /></label>
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Rescheduling…' : 'Reschedule loan'}</button>
            </div>
        </form>
    </Modal>;
}

export function LoanApprovalModal({ record, onClose, onSave }: { record: LoanRecord; onClose: () => void; onSave: (input: ApproveLoanInput) => Promise<void> }) {
    const [approvedAmount, setApprovedAmount] = useState(String(record.principal));
    const [approvedTenure, setApprovedTenure] = useState(String(record.tenureMonths));
    const [finalRate, setFinalRate] = useState(String(record.interestRate));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        setError('');
        const amount = approvedAmount.trim();
        if (!/^\d{1,12}(\.\d{1,2})?$/.test(amount) || !(Number(amount) > 0)) {
            setError('Enter the sanctioned amount as a positive number with at most 2 decimal places.');
            return;
        }
        const tenure = Number(approvedTenure);
        if (!Number.isInteger(tenure) || tenure < 1 || tenure > 240) { setError('Approved tenure must be between 1 and 240 months.'); return; }
        const rate = Number(finalRate);
        if (!(rate > 0) || rate > BUSINESS_RULES.MAX_INTEREST_RATE) { setError(`Final interest rate must be greater than 0 and at most ${BUSINESS_RULES.MAX_INTEREST_RATE}% p.a.`); return; }
        const input: ApproveLoanInput = { approvedAmount: amount, approvedTenureMonths: tenure, finalInterestRate: String(Math.round(rate * 10000) / 10000) };
        setSaving(true);
        try {
            await onSave(input);
        } catch (reason) {
            setError(messageFor(reason, 'Unable to approve the loan application.'));
        } finally {
            setSaving(false);
        }
    };
    return <Modal title={`Approve application · ${record.id}`} eyebrow={`LOAN APPROVAL / ${record.customerName}`} onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            <p className="form-note full-field">Recommend and sanction {record.customerName} ({record.customerId}) for the {record.loanType}. The officer recommendation and the President / M.D. approval are both recorded on the backend.</p>
            <label>Requested amount<input value={formatCurrency(record.principal)} readOnly aria-readonly="true" /></label>
            <label>Approved amount<input value={approvedAmount} onChange={(event) => setApprovedAmount(event.target.value)} inputMode="decimal" aria-label="Approved amount" /></label>
            <label>Approved tenure (months)<input type="number" min={1} max={240} value={approvedTenure} onChange={(event) => setApprovedTenure(event.target.value)} aria-label="Approved tenure in months" /></label>
            <label>Final interest rate (% p.a.)<input type="number" min={BUSINESS_RULES.MIN_INTEREST_RATE} max={BUSINESS_RULES.MAX_INTEREST_RATE} step="0.01" value={finalRate} onChange={(event) => setFinalRate(event.target.value)} aria-label="Final interest rate" /></label>
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Approving…' : 'Recommend and approve'}</button>
            </div>
        </form>
    </Modal>;
}

export function LoanDetail({ record, onClose, onCollection, onLifecycle, onApprove }: { record: LoanRecord; onClose: () => void; onCollection: () => void; onLifecycle: (lifecycle: LoanLifecycle, status: Status, input?: LoanLifecycleInput) => void; onApprove: (input: ApproveLoanInput) => Promise<void>; onToast: (message: string) => void }) {
    const { can, hasRole } = useAuth();
    const [statementOpen, setStatementOpen] = useState(false);
    const [approvalOpen, setApprovalOpen] = useState(false);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [lifecycleDialog, setLifecycleDialog] = useState<'Settled' | 'Written off' | null>(null);
    const pending = record.installments.filter((item) => item.status !== 'Paid').length;
    const charges = (record.processingFee ?? 0) + (record.documentationFee ?? 0) + (record.insuranceFee ?? 0) + (record.otherCharges ?? 0);
    const canApproveStage = record.lifecycle === 'Application' || record.lifecycle === 'Underwriting';
    const canDisburseStage = record.lifecycle === 'Approved';
    // The backend gates each lifecycle action by role / permission (see
    // loans.routes.ts), so the UI mirrors the same authority instead of showing
    // buttons that would always fail with a 403.
    const roleCanApprove = hasRole('president', 'managing_director');
    const roleCanComplete = hasRole('president');
    const roleCanWriteLoan = can('loans.write');
    const isOpenLoan = record.lifecycle !== 'Settled' && record.lifecycle !== 'Written off' && record.lifecycle !== 'Completed';

    return <>
        <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Loan ${record.id}`}>
                <div className="admin-modal-header"><div><div className="eyebrow">LOAN ACCOUNT / {record.id}</div><h2>{record.customerName}</h2><p>{record.loanType} · {record.customerId} · {record.customerPhone}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>
                <div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>{record.lifecycle} · {record.tenureMonths} months · {record.interestRate}% p.a.</span></div><StatusPill status={record.status} /></div>
                <div className="customer-detail-grid">
                    <div><span>Gross principal</span><strong>₹{record.principal.toLocaleString('en-IN')}</strong></div><div><span>Net disbursement</span><strong>₹{(record.netDisbursement ?? record.principal - charges).toLocaleString('en-IN')}</strong></div><div><span>Outstanding principal</span><strong className="orange-text">₹{record.outstandingAmount.toLocaleString('en-IN')}</strong></div><div><span>Paid to date</span><strong className="green-text">₹{record.paidAmount.toLocaleString('en-IN')}</strong></div><div><span>Installment</span><strong>₹{record.installmentAmount.toLocaleString('en-IN')}</strong></div><div><span>Pending installments</span><strong>{pending}</strong></div><div><span>Total payable</span><strong>₹{(record.totalPayable ?? record.principal).toLocaleString('en-IN')}</strong></div><div><span>Flat interest total</span><strong>₹{(record.flatInterestTotal ?? 0).toLocaleString('en-IN')}</strong></div><div><span>Interest method</span><strong>{record.interestMethod ?? 'Reducing balance'}</strong></div><div><span>Repayment frequency</span><strong>{record.repaymentFrequency ?? 'Monthly'}</strong></div><div><span>Branch</span><strong>{record.branchName ?? 'Not captured'}</strong></div><div><span>Next due date</span><strong>{record.nextDueDate ?? record.firstDueDate ?? 'Not scheduled'}</strong></div><div><span>Disbursed on</span><strong>{record.loanDate}</strong></div><div><span>Closure</span><strong>{record.closedOn ? `${record.closedOn} · ${record.closureType ?? 'Closed'}` : 'Open account'}</strong></div>
                </div>
                <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Pricing, controls and disbursement</h3><p>Terms persisted with the loan contract and schedule.</p></div></div><div className="customer-detail-grid loan-detail-grid"><div><span>Product / purpose</span><strong>{record.productCode ?? 'Not configured'} · {record.purpose || 'Not captured'}</strong></div><div><span>Fees and charges</span><strong>₹{charges.toLocaleString('en-IN')}</strong></div><div><span>Processing / documentation</span><strong>₹{(record.processingFee ?? 0).toLocaleString('en-IN')} · ₹{(record.documentationFee ?? 0).toLocaleString('en-IN')}</strong></div><div><span>Insurance / other charges</span><strong>₹{(record.insuranceFee ?? 0).toLocaleString('en-IN')} · ₹{(record.otherCharges ?? 0).toLocaleString('en-IN')}</strong></div><div><span>First due date</span><strong>{record.firstDueDate ?? record.nextDueDate ?? record.loanDate}</strong></div><div><span>Grace / moratorium</span><strong>{record.gracePeriodDays ?? 0} days · {record.moratoriumMonths ?? 0} months</strong></div><div><span>Late fee / penal interest</span><strong>₹{(record.lateFee ?? 0).toLocaleString('en-IN')} · {record.penalInterestRate ?? 0}%</strong></div><div><span>Disbursement</span><strong>{record.disbursementMethod ?? 'Bank transfer'}{record.disbursementReference ? ` · ${record.disbursementReference}` : ''}</strong></div></div></section>
                <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Borrower and security</h3><p>Underwriting evidence, guarantor details and collateral custody fields.</p></div></div><div className="customer-detail-grid loan-detail-grid"><div><span>Income source</span><strong>{record.incomeSource || 'Not captured'}{record.monthlyIncome ? ` · ₹${record.monthlyIncome.toLocaleString('en-IN')} / month` : ''}</strong></div><div><span>Guarantor</span><strong>{record.guarantorName || 'Not captured'}{record.guarantorPhone ? ` · ${record.guarantorPhone}` : ''}</strong></div><div><span>Collateral</span><strong>{record.collateralDescription || 'Not captured'}</strong></div><div><span>Collateral value / LTV</span><strong>{record.collateralValue ? `₹${record.collateralValue.toLocaleString('en-IN')}` : 'Not captured'} · {record.collateralLtv ?? 0}%</strong></div></div></section>
                <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Repayment schedule and allocation history</h3><p>Each receipt is allocated across principal, interest, penalty and fees.</p></div><span>{record.installments.length} entries</span></div>{record.installments.length ? <div className="customer-transaction-list">{record.installments.map((item) => <div className="customer-transaction-row" key={item.id}><div><strong>{item.id} · {item.status}</strong><span>Due {item.dueDate}{item.paidDate ? ` · Paid ${item.paidDate}` : ''}</span></div><div><b>₹{item.amount.toLocaleString('en-IN')}</b><small>Principal ₹{item.principal.toLocaleString('en-IN')} · Interest ₹{item.interest.toLocaleString('en-IN')} · Penalty ₹{(item.penalty ?? 0).toLocaleString('en-IN')}{item.fees ? ` · Fees ₹${item.fees.toLocaleString('en-IN')}` : ''} · Paid ₹{(item.paidAmount ?? 0).toLocaleString('en-IN')}{item.paidMethod ? ` · ${item.paidMethod}` : ''}{item.reference ? ` · ${item.reference}` : ''}{item.agent ? ` · ${item.agent}` : ''}</small></div><StatusPill status={item.status === 'Paid' ? 'Completed' : item.status === 'Overdue' ? 'Overdue' : 'Pending'} /></div>)}</div> : <p className="empty-state">No schedule entries recorded on the backend yet.</p>}</section>
                <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Lifecycle and audit trail</h3><p>Approval, disbursement, delinquency, restructuring and closure events.</p></div><span>{record.events.length} events</span></div>{record.events.length ? <div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.actor}</span></div><div><b>{event.reference}</b><small>{event.note}</small></div></div>)}</div> : <p className="empty-state">No lifecycle or audit events recorded on the backend yet.</p>}</section>
                <div className="loan-detail-actions customer-detail-actions"><button className="secondary-button" onClick={() => setStatementOpen(true)}>View statement</button>{canApproveStage && roleCanApprove && <button className="secondary-button" onClick={() => setApprovalOpen(true)}>Approve</button>}{canDisburseStage && roleCanWriteLoan && <button className="secondary-button" onClick={() => onLifecycle('Active', 'Active')}>Disburse</button>}{record.loanId && isOpenLoan && roleCanComplete && <button className="secondary-button" onClick={() => setRescheduleOpen(true)}>Reschedule</button>}{record.outstandingAmount === 0 && roleCanComplete && <button className="secondary-button" onClick={() => setLifecycleDialog('Settled')}>Settle</button>}{record.outstandingAmount > 0 && roleCanComplete && <button className="secondary-button" onClick={() => setLifecycleDialog('Written off')}>Write off</button>}{roleCanWriteLoan && <button className="primary-button" onClick={onCollection}><Plus size={15} /> Record installment</button>}</div>
            </section>
        </div>
        {statementOpen && <LoanStatementModal record={record} onClose={() => setStatementOpen(false)} />}
        {approvalOpen && <LoanApprovalModal record={record} onClose={() => setApprovalOpen(false)} onSave={async (input) => { await onApprove(input); setApprovalOpen(false); }} />}
        {rescheduleOpen && <LoanRescheduleModal record={record} onClose={() => setRescheduleOpen(false)} onSave={async (input) => { await onLifecycle('Rescheduled', 'Review', input); setRescheduleOpen(false); }} />}
        {lifecycleDialog && <LoanLifecycleModal record={record} kind={lifecycleDialog} onClose={() => setLifecycleDialog(null)} onSave={async (input) => { await onLifecycle(lifecycleDialog, lifecycleDialog === 'Written off' ? 'Inactive' : 'Completed', input); setLifecycleDialog(null); }} />}
    </>;
}

export function LoanStatementModal({ record, onClose }: { record: LoanRecord; onClose: () => void }) {
    const [events, setEvents] = useState(record.events);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);
    // Re-reads the loan statement from the backend so the ledger always reflects the
    // latest allocation and lifecycle events rather than a cached list row.
    useEffect(() => {
        const loanId = record.loanId;
        if (!loanId) { setEvents(record.events); return; }
        let active = true;
        setLoading(true);
        loansRepository
            .statement(loanId)
            .then((fresh) => { if (active) { setEvents(fresh); setError(''); } })
            .catch((reason: unknown) => { if (active) setError(messageFor(reason, 'Unable to load the loan statement from the backend.')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [record.loanId]);
    const exportCsv = () => {
        if (exporting) return;
        setExporting(true);
        try {
            const header = ['Loan account', 'Customer', 'Event', 'Date', 'Reference', 'Actor', 'Note'];
            const rows = events.map((event) => [record.id, record.customerName, event.type, event.date, event.reference, event.actor, event.note].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
            const csv = [header.join(','), ...rows].join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `loan-statement-${record.id}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };
    return <Modal title={`Statement · ${record.id}`} eyebrow={`LOAN STATEMENT / ${record.customerName}`} onClose={onClose} wide>
        <div className="customer-detail-grid">
            <div><span>Customer</span><strong>{record.customerName}</strong></div>
            <div><span>Loan type</span><strong>{record.loanType}</strong></div>
            <div><span>Product</span><strong>{record.productCode ?? 'Not captured'}</strong></div>
            <div><span>Branch</span><strong>{record.branchName ?? 'Not captured'}</strong></div>
            <div><span>Gross principal</span><strong>₹{record.principal.toLocaleString('en-IN')}</strong></div>
            <div><span>Outstanding principal</span><strong className="orange-text">₹{record.outstandingAmount.toLocaleString('en-IN')}</strong></div>
            <div><span>Paid to date</span><strong className="green-text">₹{record.paidAmount.toLocaleString('en-IN')}</strong></div>
            <div><span>Total payable</span><strong>₹{(record.totalPayable ?? record.principal).toLocaleString('en-IN')}</strong></div>
            <div><span>Tenure</span><strong>{record.tenureMonths} months</strong></div>
            <div><span>Interest rate</span><strong>{record.interestRate}% p.a.</strong></div>
            <div><span>Installment</span><strong>₹{record.installmentAmount.toLocaleString('en-IN')}</strong></div>
            <div><span>Next due date</span><strong>{record.nextDueDate ?? record.firstDueDate ?? 'Not scheduled'}</strong></div>
        </div>
        <section className="customer-subsection">
            <div className="customer-section-heading">
                <div><h3>Statement entries</h3><p>Allocation and lifecycle events recorded on the backend.</p></div>
                <span>{loading ? 'Loading…' : `${events.length} entries`}</span>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            {events.length ? <div className="customer-transaction-list">{events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.actor}</span></div><div><b>{event.reference}</b><small>{event.note}</small></div></div>)}</div> : <p className="empty-state">No statement entries recorded on the backend yet.</p>}
        </section>
        <div className="admin-form-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Close</button>
            <button type="button" className="primary-button" onClick={exportCsv} disabled={exporting}><Download size={15} /> {exporting ? 'Exporting…' : 'Export statement'}</button>
        </div>
    </Modal>;
}

export function LoansPage() {
    const [loanRows, setLoanRows] = useState<LoanRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [loanTypeFilter, setLoanTypeFilter] = useState<'All' | LoanRecord['loanType']>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'account' | 'collection' | 'detail' | null>(null);
    const [selected, setSelected] = useState<LoanRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    useEffect(() => {
        let active = true;
        loansRepository
            .list()
            .then((rows) => { if (active) setLoanRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load loans from the backend.')); });
        return () => { active = false; };
    }, []);
    const filteredRows = loanRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.loanType} ${row.installments.map((item) => `${item.id} ${item.agent} ${item.reference ?? ''}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter) && (loanTypeFilter === 'All' || row.loanType === loanTypeFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const outstanding = loanRows.reduce((total, row) => total + row.outstandingAmount, 0);
    const dueAmount = loanRows.flatMap((row) => row.installments).filter((item) => item.status !== 'Paid').reduce((total, item) => total + item.amount, 0);
    const saveAccount = async (input: LoanInput) => {
        try {
            const record = await loansRepository.create(input as LoanRepoInput);
            setLoanRows((current) => [record, ...current]);
            setPage(1);
            close();
            notify(`Loan application ${record.id} opened on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to open the loan application on the backend.'));
        }
    };
    const saveCollection = async (input: LoanCollectionInput) => {
        if (!selected) return;
        try {
            const loanId = selected.loanId ?? selected.id;
            const updated = await loansRepository.recordRepayment(loanId, input as LoanRepoRepaymentInput);
            setLoanRows((current) => current.map((row) => ((row.loanId ?? row.id) === loanId ? updated : row)));
            setSelected(updated);
            close();
            notify('Loan repayment recorded and allocated on the backend.');
        } catch (reason) {
            notify(messageFor(reason, 'Unable to record the loan repayment.'));
        }
    };
    const updateLifecycle = async (lifecycle: LoanLifecycle, status: Status, input?: LoanLifecycleInput) => {
        if (!selected) return;
        try {
            const applicationId = selected.applicationId;
            const loanId = selected.loanId;
            if (lifecycle === 'Active') {
                if (!applicationId) throw new Error('This record has no backend application to disburse.');
                await loansRepository.disburse(applicationId);
            } else if (lifecycle === 'Rescheduled') {
                if (!loanId) throw new Error('This record has no backend loan account.');
                if (!input?.reason) throw new Error('A reschedule reason is required.');
                const rescheduleInput: RescheduleLoanInput = { effectiveFrom: input.effectiveFrom ?? new Date().toISOString().slice(0, 10), reason: input.reason };
                if (input.newTenureMonths !== undefined) rescheduleInput.newTenureMonths = input.newTenureMonths;
                if (input.newInterestRate) rescheduleInput.newInterestRate = input.newInterestRate;
                await loansRepository.reschedule(loanId, rescheduleInput);
            } else if (lifecycle === 'Settled') {
                if (!loanId) throw new Error('This record has no backend loan account.');
                const settleInput: SettleLoanInput = {};
                if (input?.settledOn) settleInput.settledOn = input.settledOn;
                if (input?.reason) settleInput.reason = input.reason;
                await loansRepository.settle(loanId, settleInput);
            } else if (lifecycle === 'Written off') {
                if (!loanId) throw new Error('This record has no backend loan account.');
                if (!input?.reason) throw new Error('A write-off reason is required.');
                const writeOffInput: WriteOffLoanInput = { reason: input.reason };
                await loansRepository.writeOff(loanId, writeOffInput);
            } else {
                notify(`The backend has no direct action for the ${lifecycle.toLowerCase()} state.`);
                return;
            }
            void status;
            const refreshed = await loansRepository.list();
            setLoanRows(refreshed);
            const match = refreshed.find((row) => (loanId && row.loanId === loanId) || (applicationId && row.applicationId === applicationId) || row.id === selected.id);
            setSelected(match);
            if (!match) close();
            notify(`Loan moved to ${lifecycle.toLowerCase()} on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to update the loan lifecycle.'));
        }
    };
    // Recommends an applied application (officer step) then approves it with the
    // sanctioned amount; both transitions are required by the backend.
    const approveApplication = async (input: ApproveLoanInput) => {
        if (!selected) return;
        const applicationId = selected.applicationId;
        if (!applicationId) throw new Error('This record has no backend application to approve.');
        if (selected.lifecycle === 'Application') {
            await loansRepository.recommend(applicationId);
        }
        await loansRepository.approve(applicationId, input);
        const refreshed = await loansRepository.list();
        setLoanRows(refreshed);
        const match = refreshed.find((row) => row.applicationId === applicationId || row.id === selected.id);
        setSelected(match);
        if (!match) close();
        notify(`Loan application approved for ${formatCurrency(Number(input.approvedAmount))} on the backend.`);
    };
    const openDetail = (record: LoanRecord) => {
        setSelected(record);
        setModal('detail');
        if (record.loanId) {
            loansRepository.detail(record.loanId)
                .then((full) => { setSelected(full); })
                .catch((reason) => { notify(messageFor(reason, 'Unable to load the loan ledger.')); });
        }
    };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / LOANS</div><h1>Loans</h1><p>Manage loan accounts, repayment schedules, collections and customer history.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Create loan account</button></div><SummaryStrip items={[{ label: 'Active loans', value: String(loanRows.filter((row) => row.status === 'Active').length), tone: 'green' }, { label: 'Outstanding amount', value: `₹${(outstanding / 100000).toFixed(2)}L` }, { label: 'Due amount', value: `₹${dueAmount.toLocaleString('en-IN')}`, tone: 'orange' }, { label: 'Overdue accounts', value: String(loanRows.filter((row) => row.status === 'Overdue').length), tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search loan, customer, agent or reference..." aria-label="Search loans" /></div><div role="tablist" aria-label="Loan scheme tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 4px' }}>{(['All', 'Daily Loan', 'Weekly Loan', 'Personal Loan', 'Business Loan', 'Mortgage Loan', 'Gold Loan', 'SHG Loan', 'Other Loan'] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={loanTypeFilter === tab} onClick={() => { setLoanTypeFilter(tab); setPage(1); }} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border, #d7dbe0)', background: loanTypeFilter === tab ? 'var(--primary, #1f6feb)' : 'transparent', color: loanTypeFilter === tab ? '#fff' : 'inherit', cursor: 'pointer', fontSize: 13 }}>{tab === 'All' ? 'All loans' : tab.replace(' Loan', '')}{tab !== 'All' ? ` (${loanRows.filter((row) => row.loanType === tab).length})` : ''}</button>)}</div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter loans by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Overdue">Overdue</option><option value="Completed">Completed</option><option value="Review">Review</option></select><button className="filter-button" onClick={() => notify('Loan due-date range selector is ready for local data.')}><CalendarDays size={15} /> Due range</button><button className="filter-button" onClick={() => { setStatusFilter('Overdue'); setPage(1); notify('Showing overdue loan accounts.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} loan account records prepared for export.`)} aria-label="Export loans"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Loan account</th><th>Loan amount</th><th>Installment</th><th>Outstanding</th><th>Schedule</th><th>Status</th><th /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.customerName}</strong><span>{row.id} · {row.customerId}</span><small>{row.loanType} · {row.interestRate}% p.a. · {row.tenureMonths} months · {row.lifecycle}</small></td><td><strong className="table-amount">₹{row.principal.toLocaleString('en-IN')}</strong><span>{row.loanDate}</span></td><td><strong className="table-amount">₹{row.installmentAmount.toLocaleString('en-IN')}</strong><span>{row.installments.length} entries</span></td><td><strong className="loan-outstanding-amount">₹{row.outstandingAmount.toLocaleString('en-IN')}</strong><span>Paid ₹{row.paidAmount.toLocaleString('en-IN')}</span></td><td><strong>{row.installments.filter((item) => item.status === 'Paid').length} paid</strong><span>{row.installments.filter((item) => item.status !== 'Paid').length} pending</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table>{!visibleRows.length && <div className="empty-state">No loan accounts match the current search and status filter.</div>}<div className="table-footer"><span>Showing {visibleRows.length} of {filteredRows.length} loan accounts</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={`pagination-button ${page === item ? 'selected' : ''}`} key={item} onClick={() => setPage(item)}>{item}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></div></section>{modal === 'account' && <LoanModal mode="account" onClose={close} onSave={(input) => saveAccount(input as LoanInput)} />}{modal === 'collection' && selected && <LoanModal mode="collection" record={selected} onClose={close} onSave={(input) => saveCollection(input as LoanCollectionInput)} />}{modal === 'detail' && selected && <LoanDetail record={selected} onClose={close} onCollection={() => setModal('collection')} onLifecycle={updateLifecycle} onApprove={approveApplication} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}
