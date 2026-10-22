// OPERATIONS / Fixed deposits.

import { Pagination } from '../../../components/ui/Pagination';
import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Download, FileCheck2, Filter, Loader2, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { fdRepository } from '../services/operations/fdApiRepository';
import type { FDInput as FdRepoInput, FdMaturityActionInput, RateCardView, FdUpdateInput, FdPayoutFrequency, FdPayoutMode, FdMaturityAction } from '../services/operations/fdApiRepository';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer } from '../../customers/types/customer.types';
import type { CustomerOption } from '../../customers/services/customerRepository';
import { messageFor } from '../services/operations/helpers';
import { Modal } from '../../../components/overlays/Modal';
import { Req, Opt, FormLegend } from '../../../components/ui/FieldIndicators';
import { formatCurrency } from '../../../lib/formatters/formatters';
import { BUSINESS_RULES } from '../../../lib/permissions/permissions';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';
import { addMonthsYmd } from '../components/adminDateUtils';

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
    payoutInstruction: 'Renew principal' | 'Payout at maturity' | 'Renew principal + interest';
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

export type FDInput = Pick<FDRecord, 'customerId' | 'principal' | 'tenureMonths' | 'interestRate' | 'openedOn' | 'maturityDate' | 'nomineeName' | 'nomineeRelation' | 'payoutInstruction' | 'status'> & Partial<Omit<FDRecord, 'id' | 'customerId' | 'customerName' | 'customerPhone' | 'principal' | 'tenureMonths' | 'interestRate' | 'openedOn' | 'maturityDate' | 'maturityAmount' | 'nomineeName' | 'nomineeRelation' | 'payoutInstruction' | 'status' | 'events'>>;

export type FDActionInput = { action: 'Renew' | 'Close' | 'Payout'; reference: string; date: string; note: string } & Partial<Pick<FDEvent, 'authorizationReference' | 'approvalReference' | 'paymentMethod' | 'destinationAccount' | 'externalReference' | 'supportingDocuments' | 'consentReference'>>;

export interface OfficialFdScheme {
    id: string;
    marathiTitle: string;
    englishTitle: string;
    tenureDaysLabel: string;
    tenureMonths: number;
    ratePercent: number;
    badge: string;
    isDamduppat?: boolean;
    description: string;
}

export const OFFICIAL_FD_SCHEMES: OfficialFdScheme[] = [
    {
        id: 'FD_30_45',
        marathiTitle: '३० ते ४५ दिवस',
        englishTitle: '30 to 45 Days',
        tenureDaysLabel: '30–45 Days',
        tenureMonths: 1,
        ratePercent: 7.0,
        badge: '७% दर',
        description: 'अल्प मुदत ठेव योजना (Short term 1 month)',
    },
    {
        id: 'FD_46_180',
        marathiTitle: '४६ ते १८० दिवस',
        englishTitle: '46 to 180 Days',
        tenureDaysLabel: '46–180 Days',
        tenureMonths: 6,
        ratePercent: 8.0,
        badge: '८% दर',
        description: 'मध्यम मुदत ठेव योजना (6 months term)',
    },
    {
        id: 'FD_181_365',
        marathiTitle: '१८१ ते ३६५ दिवस',
        englishTitle: '181 to 365 Days',
        tenureDaysLabel: '181–365 Days',
        tenureMonths: 12,
        ratePercent: 10.0,
        badge: '१०% दर',
        description: 'वार्षिक मुदत ठेव योजना (1 year term)',
    },
    {
        id: 'FD_366_ABOVE',
        marathiTitle: '३६६ व वरिल दिवसाकरिता',
        englishTitle: '366 & Above Days',
        tenureDaysLabel: '366+ Days',
        tenureMonths: 24,
        ratePercent: 12.0,
        badge: '१२% दर',
        description: 'दीर्घ मुदत ठेव योजना (2 to 3 years term)',
    },
    {
        id: 'FD_DAMDUPPAT',
        marathiTitle: 'दामदुप्पट योजना (Damduppat)',
        englishTitle: 'Damduppat Double Return',
        tenureDaysLabel: '७२ महिने (72 Months)',
        tenureMonths: 72,
        ratePercent: 16.6667,
        badge: '⭐ रक्कम दुप्पट (Double Return)',
        isDamduppat: true,
        description: '७२ महिने पूर्ण झाल्यावर ठेव रक्कम थेट दुप्पट (Double Principal in 6 years)',
    },
];

export function getSchemeLabel(card: RateCardView): string {
    const tenure = Number(card.tenureMonths);
    const rate = Number(card.interestRate);
    if (tenure === 72 || (rate >= 16.66 && rate <= 16.67)) {
        return `दामदुप्पट योजना (Damduppat) · ७२ महिने · रक्कम थेट दुप्पट (${rate.toFixed(2)}% p.a.)`;
    }
    if (tenure === 1) {
        return `३० ते ४५ दिवस (30–45 Days) · १ महिना · ${rate.toFixed(2)}% p.a.`;
    }
    if (tenure === 6) {
        return `४६ ते १८० दिवस (46–180 Days) · ६ महिने · ${rate.toFixed(2)}% p.a.`;
    }
    if (tenure === 12) {
        return `१८१ ते ३६५ दिवस (181–365 Days) · १२ महिने · ${rate.toFixed(2)}% p.a.`;
    }
    if (tenure >= 24) {
        return `३६६ व वरिल दिवस (366+ Days) · ${tenure} महिने · ${rate.toFixed(2)}% p.a.`;
    }
    return `${tenure} mo · ${rate}% p.a.`;
}

export function FDModal({ mode, record, onClose, onSave }: { mode: 'account' | 'action'; record?: FDRecord; onClose: () => void; onSave: (input: FDInput | FDActionInput) => Promise<void> }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? '');
    const [principal, setPrincipal] = useState(String(record?.principal ?? ''));
    const [tenureMonths, setTenureMonths] = useState(String(record?.tenureMonths ?? 12));
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? 7.5));
    const [openedOn, setOpenedOn] = useState(record?.openedOn ?? new Date().toISOString().slice(0, 10));
    const [maturityDate, setMaturityDate] = useState(record?.maturityDate ?? '');
    const [nomineeName, setNomineeName] = useState(record?.nomineeName ?? '');
    const [nomineeRelation, setNomineeRelation] = useState(record?.nomineeRelation ?? '');
    const [payoutInstruction, setPayoutInstruction] = useState<FDRecord['payoutInstruction']>(record?.payoutInstruction ?? 'Payout at maturity');
    const [status, setStatus] = useState<Status>(record?.status ?? 'Active');
    const [productCode, setProductCode] = useState(record?.productCode ?? '');
    const [branch, setBranch] = useState(record?.branch ?? '');
    const [openingChannel, setOpeningChannel] = useState(record?.openingChannel ?? 'Branch counter');
    const [interestMethod, setInterestMethod] = useState(record?.interestMethod ?? 'Scheme rate');
    const [compoundingFrequency, setCompoundingFrequency] = useState(record?.compoundingFrequency ?? 'Annual');
    const [specialRateReference, setSpecialRateReference] = useState(record?.specialRateReference ?? '');
    const [taxIdentifier, setTaxIdentifier] = useState(record?.taxIdentifier ?? '');
    const [taxWithholdingInstruction, setTaxWithholdingInstruction] = useState(record?.taxWithholdingInstruction ?? 'Apply statutory withholding');
    const [nomineePhone, setNomineePhone] = useState(record?.nomineePhone ?? '');
    const [nomineeAddress, setNomineeAddress] = useState(record?.nomineeAddress ?? '');
    const [nomineeIdentityReference, setNomineeIdentityReference] = useState(record?.nomineeIdentityReference ?? '');
    const [nomineeDocumentReferences, setNomineeDocumentReferences] = useState(record?.nomineeDocumentReferences ?? '');
    const [payoutMethod, setPayoutMethod] = useState(record?.payoutMethod ?? 'Bank transfer');
    const [payoutAccountReference, setPayoutAccountReference] = useState(record?.payoutAccountReference ?? '');
    const [lienDetails, setLienDetails] = useState(record?.lienDetails ?? '');
    const [prematureClosureTerms, setPrematureClosureTerms] = useState(record?.prematureClosureTerms ?? '');
    const [renewalInstructions, setRenewalInstructions] = useState(record?.renewalInstructions ?? '');
    const [authorizationReference, setAuthorizationReference] = useState(record?.authorizationReference ?? '');
    const [documentReferences, setDocumentReferences] = useState(record?.documentReferences ?? '');
    const [consentReference, setConsentReference] = useState(record?.consentReference ?? '');
    const [action, setAction] = useState<FDActionInput['action']>('Renew');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [approvalReference, setApprovalReference] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Bank transfer');
    const [destinationAccount, setDestinationAccount] = useState('');
    const [externalReference, setExternalReference] = useState('');
    const [supportingDocuments, setSupportingDocuments] = useState('');
    const [actionConsentReference, setActionConsentReference] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerDetails, setCustomerDetails] = useState<ApiCustomer | undefined>();
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');
    const [rateCards, setRateCards] = useState<RateCardView[]>([]);
    const [rateCardLoading, setRateCardLoading] = useState(false);
    const [rateCardError, setRateCardError] = useState('');
    // Loads the active FD rate-card catalogue so the operator books an approved rate
    // instead of typing a free-form interest rate that the backend would reject.
    useEffect(() => {
        if (mode !== 'account') return undefined;
        let active = true;
        setRateCardLoading(true);
        fdRepository
            .listRateCards()
            .then((rows) => { if (active) { setRateCards(rows.filter((card) => card.isActive)); setRateCardError(''); } })
            .catch((reason: unknown) => { if (active) setRateCardError(messageFor(reason, 'Unable to load FD rate cards.')); })
            .finally(() => { if (active) setRateCardLoading(false); });
        return () => { active = false; };
    }, [mode]);
    // Loads the selectable customer list and re-queries the backend as the operator
    // types, so the dropdown stays accurate for large registries. Each option's value
    // is the raw customer UUID that the FD API expects.
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
    // Selects a customer and prefills the FD form from their real profile so the
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
                setNomineeAddress((current) => current || customer.address);
                setNomineeIdentityReference((current) => current || customer.identityReference);
                setBranch((current) => current || customer.branch);
                setTaxIdentifier((current) => current || customer.taxIdentifier);
                setDocumentReferences((current) => current || customer.documentReferences);
            })
            .catch((reason: unknown) => setCustomerError(messageFor(reason, 'Unable to load the selected customer.')))
            .finally(() => setCustomerLoading(false));
    };
    const principalNumber = Number(principal);
    const selectedRateCard = rateCards.find((card) => card.id === productCode);
    // Rate cards that already cover the current principal and tenure. When none match,
    // the backend would reject the opening, so the form flags it before submission.
    const matchingRateCards = rateCards.filter(
        (card) => (!principal || !Number.isFinite(principalNumber) || (principalNumber >= Number(card.minAmount) && principalNumber <= Number(card.maxAmount)))
            && (!tenureMonths || Number(card.tenureMonths) === Number(tenureMonths)),
    );
    const principalBelowMin = Boolean(principal && Number.isFinite(principalNumber) && principalNumber < BUSINESS_RULES.FD_MIN_AMOUNT);
    const principalAboveMax = Boolean(principal && Number.isFinite(principalNumber) && principalNumber > BUSINESS_RULES.FD_MAX_AMOUNT);
    const rateCardMismatch = Boolean(principal && tenureMonths && !rateCardLoading && matchingRateCards.length === 0);
    const lienCapAmount = Number.isFinite(principalNumber) && principalNumber > 0 ? Math.round(principalNumber * (BUSINESS_RULES.FD_LIEN_LOAN_PERCENT / 100)) : 0;
    const lienAmountEntered = Number((lienDetails.match(/\d+(?:\.\d+)?/) ?? ['0'])[0]);
    const lienAboveCap = Boolean(lienDetails.trim() && Number.isFinite(lienAmountEntered) && lienAmountEntered > lienCapAmount);
    const isDamduppat = Number(tenureMonths) === 72 || (selectedRateCard && Number(selectedRateCard.tenureMonths) === 72) || (Number(interestRate) >= 16.66 && Number(interestRate) <= 16.67);
    // Simple-interest projection mirrors the backend: principal + principal x rate x months / 1200.
    // For Damduppat (दामदुप्पट) 72-month scheme, returns exact double principal (100% interest return).
    const projectedMaturityAmount = principal && Number.isFinite(principalNumber) && Number.isFinite(Number(interestRate)) && Number(tenureMonths)
        ? isDamduppat
            ? principalNumber * 2
            : Math.round(principalNumber + (principalNumber * Number(interestRate) * Number(tenureMonths)) / 1200)
        : 0;
    const rateCardHint = selectedRateCard
        ? `${formatCurrency(Number(selectedRateCard.minAmount))} - ${formatCurrency(Number(selectedRateCard.maxAmount))} band · ${selectedRateCard.tenureMonths}-month term · ${selectedRateCard.interestRate}% p.a. · ${selectedRateCard.earlyClosurePenaltyPercent}% early-closure penalty · minimum holding ${selectedRateCard.minHoldingMonths} months. Maturity date and amount are filled in automatically.`
        : '';
    // Applies the booked rate card's rate, term and early-closure terms so the booking
    // matches the approved product; the auto-calculation effect then derives maturity.
    const selectRateCard = (id: string) => {
        setProductCode(id);
        const card = rateCards.find((item) => item.id === id);
        if (!card) return;
        setInterestRate(String(Number(card.interestRate)));
        setTenureMonths(String(card.tenureMonths));
        setPrematureClosureTerms((current) => current || `Early closure penalty ${card.earlyClosurePenaltyPercent}% · minimum holding ${card.minHoldingMonths} months.`);
        setPrincipal((current) => {
            const value = Number(current);
            if (!Number.isFinite(value) || value <= 0 || value < Number(card.minAmount) || value > Number(card.maxAmount)) {
                return String(card.minAmount);
            }
            return current;
        });
    };
    const applyOfficialScheme = (scheme: OfficialFdScheme) => {
        const matchingCard = rateCards.find((c) => Number(c.tenureMonths) === scheme.tenureMonths);
        if (matchingCard) {
            selectRateCard(matchingCard.id);
        } else {
            setTenureMonths(String(scheme.tenureMonths));
            setInterestRate(String(scheme.ratePercent));
        }
    };
    // Auto-derives the maturity date whenever the opening date or tenure changes, so the
    // operator never types a maturity date that drifts from the backend materialisation.
    useEffect(() => {
        if (mode !== 'account') return;
        if (!openedOn) return;
        const term = Number(tenureMonths);
        if (!Number.isFinite(term) || term <= 0) return;
        const derivedMaturity = addMonthsYmd(openedOn, term);
        setMaturityDate((current) => (current === derivedMaturity ? current : derivedMaturity));
    }, [mode, openedOn, tenureMonths]);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            if (mode === 'account') {
                if (!customerId.trim() || !principal || Number(principal) <= 0 || !openedOn || !maturityDate || !nomineeName.trim() || !nomineeRelation.trim()) { setError('Customer, principal, dates and complete nominee details are required.'); return; }
                if (Number(principal) < BUSINESS_RULES.FD_MIN_AMOUNT) { setError('Fixed deposit principal must be at least Rs 1,000 as per society rules.'); return; }
                if (Number(principal) > BUSINESS_RULES.FD_MAX_AMOUNT) { setError('Fixed deposit principal cannot exceed Rs 1,00,000 as per society rules.'); return; }
                if (!productCode.trim()) { setError('Select a product / rate card so the booking uses an approved rate.'); return; }
                if (rateCardMismatch) { setError('No active FD rate card covers this principal and tenure. Adjust the amount or tenure.'); return; }
                const lienAmount = Number((lienDetails.match(/\d+/) ?? ['0'])[0]);
                if (lienAmount > Number(principal) * (BUSINESS_RULES.FD_LIEN_LOAN_PERCENT / 100)) { setError('Loan against FD cannot exceed 85% of the FD amount as per society rules.'); return; }
                await onSave({ customerId: customerId.trim(), principal: Number(principal), tenureMonths: Number(tenureMonths), interestRate: Number(interestRate), openedOn, maturityDate, nomineeName: nomineeName.trim(), nomineeRelation: nomineeRelation.trim(), payoutInstruction, status, productCode, branch, openingChannel, interestMethod, compoundingFrequency, specialRateReference, taxIdentifier, taxWithholdingInstruction, nomineePhone, nomineeAddress, nomineeIdentityReference, nomineeDocumentReferences, payoutMethod, payoutAccountReference, lienDetails, prematureClosureTerms, renewalInstructions, authorizationReference, documentReferences, consentReference });
                return;
            }
            if (!record || !reference.trim() || !note.trim()) { setError('Reference and action note are required for an audited FD action.'); return; }
            await onSave({ action, reference: reference.trim(), date: openedOn, note: note.trim(), authorizationReference, approvalReference, paymentMethod, destinationAccount, externalReference, supportingDocuments, consentReference: actionConsentReference });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Open fixed deposit' : 'Fixed deposit lifecycle action'}><div className="admin-modal-header"><div><div className="eyebrow">FD WORKFLOW</div><h2>{mode === 'account' ? 'Open fixed deposit account' : `${action} · ${record?.id}`}</h2><p>{mode === 'account' ? 'Capture principal, rate, maturity and beneficiary information.' : 'Record a controlled renewal, closure or maturity payout action.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><FormLegend />{mode === 'account' ? <><label className="full-field"><span>Search customer <Opt /></span><input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label><label className="full-field"><span>Customer <Req /></span><select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name} | {option.customerNumber}</option>)}</select></label>{customerError ? <p className="form-error full-field">{customerError}</p> : null}{customerDetails ? <p className="form-note full-field">Opening against {customerDetails.name} - {customerDetails.phone}{customerDetails.branch ? ` - ${customerDetails.branch}` : null}</p> : null}<div className="full-field" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '6px' }}><div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}><span>📋 अधिकृत मुदत ठेव (FD) योजना निवडा / QUICK SCHEME SELECTION:</span><span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>क्लिक केल्यावर व्याजदर व कालावधी आपोआप सेट होईल</span></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{OFFICIAL_FD_SCHEMES.map((scheme) => { const isSelected = Number(tenureMonths) === scheme.tenureMonths; return <button key={scheme.id} type="button" onClick={() => applyOfficialScheme(scheme)} style={{ padding: '6px 12px', borderRadius: '20px', border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1', background: isSelected ? '#eff6ff' : '#ffffff', color: isSelected ? '#1e40af' : '#334155', fontWeight: isSelected ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease' }}><span>{scheme.marathiTitle}</span><span style={{ background: scheme.isDamduppat ? '#fef3c7' : '#e0e7ff', color: scheme.isDamduppat ? '#92400e' : '#3730a3', padding: '2px 6px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700 }}>{scheme.badge}</span></button>; })}</div>{isDamduppat ? <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.82rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '1.1rem' }}>⭐</span><span><strong>दामदुप्पट योजना निवडली आहे:</strong> ७२ महिने पूर्ण झाल्यावर ठेव रक्कम थेट <strong>दुप्पट (२x Principal)</strong> परतावा मिळेल. उदा. ₹10,000 ठेवल्यास ₹20,000 मिळतील.</span></div> : null}</div><label><span>Product / rate card <Req /></span><select value={productCode} onChange={(event) => selectRateCard(event.target.value)} aria-label="Select FD rate card"><option value="">{rateCardLoading ? 'Loading rate cards...' : 'Select a rate card / scheme'}</option>{rateCards.map((card) => <option key={card.id} value={card.id}>{`${getSchemeLabel(card)} · [₹${Number(card.minAmount).toLocaleString('en-IN')} - ₹${Number(card.maxAmount).toLocaleString('en-IN')}]`}</option>)}</select></label>{rateCardError ? <p className="form-error full-field">{rateCardError}</p> : null}{rateCardHint ? <p className="form-note full-field">{rateCardHint}</p> : null}<label><span>Principal amount <Req /></span><input type="number" min={BUSINESS_RULES.FD_MIN_AMOUNT} max={BUSINESS_RULES.FD_MAX_AMOUNT} value={principal} onChange={(event) => setPrincipal(event.target.value)} placeholder="100000" />{principalBelowMin ? <small className="form-error">Principal must be at least {formatCurrency(BUSINESS_RULES.FD_MIN_AMOUNT)}.</small> : null}{principalAboveMax ? <small className="form-error">Principal cannot exceed {formatCurrency(BUSINESS_RULES.FD_MAX_AMOUNT)} per society rules.</small> : null}</label><label><span>Tenure (months) <Req /></span><input type="number" min="1" value={tenureMonths} onChange={(event) => setTenureMonths(event.target.value)} />{rateCardMismatch ? <small className="form-error">No active rate card covers this principal and tenure.</small> : null}</label><label><span>Interest rate (% p.a.) <Req /></span><input type="number" min="0" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} readOnly={Boolean(selectedRateCard)} aria-readonly={Boolean(selectedRateCard)} />{selectedRateCard ? <small className="form-note">Set from the selected rate card; not editable.</small> : null}</label><label><span>Opening date <Req /></span><input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label><span>Maturity date <Req /></span><input type="date" value={maturityDate} readOnly aria-readonly="true" />{projectedMaturityAmount > 0 ? <small className="form-note" style={{ color: isDamduppat ? '#b45309' : undefined, fontWeight: isDamduppat ? 700 : undefined }}>Projected maturity value: {formatCurrency(projectedMaturityAmount)}{isDamduppat ? ' (दामदुप्पट: ठेव रक्कम थेट दुप्पट 2x Return)' : ` at ${interestRate}% p.a.`}</small> : null}</label><label><span>Product / scheme code <Opt /></span><input value={productCode} onChange={(event) => setProductCode(event.target.value)} /></label><label><span>Branch <Opt /></span><input value={branch} onChange={(event) => setBranch(event.target.value)} /></label><label><span>Opening channel <Opt /></span><input value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)} /></label><label><span>Interest method <Opt /></span><input value={interestMethod} onChange={(event) => setInterestMethod(event.target.value)} /></label><label><span>Compounding frequency <Opt /></span><input value={compoundingFrequency} onChange={(event) => setCompoundingFrequency(event.target.value)} /></label><label><span>Special-rate reference <Opt /></span><input value={specialRateReference} onChange={(event) => setSpecialRateReference(event.target.value)} /></label><label><span>Tax identifier / PAN <Opt /></span><input value={taxIdentifier} onChange={(event) => setTaxIdentifier(event.target.value)} /></label><label><span>Tax withholding instruction <Opt /></span><input value={taxWithholdingInstruction} onChange={(event) => setTaxWithholdingInstruction(event.target.value)} /></label><label><span>Nominee / beneficiary name <Req /></span><input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} placeholder="Nominee name" /></label><label><span>Nominee relationship <Req /></span><input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} placeholder="Spouse, parent..." /></label><label><span>Nominee phone <Opt /></span><input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label><span>Nominee address <Opt /></span><input value={nomineeAddress} onChange={(event) => setNomineeAddress(event.target.value)} /></label><label><span>Nominee identity reference <Opt /></span><input value={nomineeIdentityReference} onChange={(event) => setNomineeIdentityReference(event.target.value)} /></label><label><span>Nominee document references <Opt /></span><input value={nomineeDocumentReferences} onChange={(event) => setNomineeDocumentReferences(event.target.value)} /></label><label><span>Payout method <Opt /></span><select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)} aria-label="Select payout method"><option value="Cash">Cash</option><option value="Bank transfer">Bank transfer</option><option value="Cheque">Cheque</option><option value="Mobile money">Mobile money</option><option value="UPI">UPI</option><option value="NEFT">NEFT</option><option value="RTGS">RTGS</option></select></label><label><span>Payout account reference <Opt /></span><input value={payoutAccountReference} onChange={(event) => setPayoutAccountReference(event.target.value)} /></label><label><span>Lien details <Opt /></span><textarea value={lienDetails} onChange={(event) => setLienDetails(event.target.value)} />{lienAboveCap ? <small className="form-error">Loan against FD cannot exceed {formatCurrency(lienCapAmount)} (85% of the FD amount) per society rules.</small> : null}</label><label><span>Premature closure terms <Opt /></span><textarea value={prematureClosureTerms} onChange={(event) => setPrematureClosureTerms(event.target.value)} /></label><label><span>Renewal instructions <Opt /></span><textarea value={renewalInstructions} onChange={(event) => setRenewalInstructions(event.target.value)} /></label><label><span>Authorization reference <Opt /></span><input value={authorizationReference} onChange={(event) => setAuthorizationReference(event.target.value)} /></label><label><span>Document references <Opt /></span><input value={documentReferences} onChange={(event) => setDocumentReferences(event.target.value)} /></label><label><span>Consent reference <Opt /></span><input value={consentReference} onChange={(event) => setConsentReference(event.target.value)} /></label><label><span>Payout instruction <Opt /></span><select value={payoutInstruction} onChange={(event) => setPayoutInstruction(event.target.value as FDRecord['payoutInstruction'])}><option>Renew principal</option><option>Payout at maturity</option><option>Renew principal + interest</option></select></label><label><span>Account status <Opt /></span><select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Active</option><option>Pending</option><option>Review</option><option>Inactive</option></select></label></> : <><label><span>Lifecycle action <Req /></span><select value={action} onChange={(event) => setAction(event.target.value as FDActionInput['action'])}><option>Renew</option><option>Close</option><option>Payout</option></select></label><label><span>Action date <Req /></span><input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label><span>Reference / authorization ID <Req /></span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="AUTH-FD-88210" /></label><label><span>Approval reference <Opt /></span><input value={approvalReference} onChange={(event) => setApprovalReference(event.target.value)} /></label><label><span>Payment / payout method <Opt /></span><input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /></label><label><span>Destination account <Opt /></span><input value={destinationAccount} onChange={(event) => setDestinationAccount(event.target.value)} /></label><label><span>External transfer reference <Opt /></span><input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label><label><span>Supporting documents <Opt /></span><input value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} /></label><label><span>Consent / acknowledgment reference <Opt /></span><input value={actionConsentReference} onChange={(event) => setActionConsentReference(event.target.value)} /></label><label className="full-field"><span>Action note <Req /></span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record authorization, payout destination or renewal instruction" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : (mode === 'account' ? 'Create FD account' : `Save ${action.toLowerCase()} action`)}</button></div></form></section></div>;
}

export function FDEditModal({ record, onClose, onSave }: { record: FDRecord; onClose: () => void; onSave: (input: FdUpdateInput) => Promise<void> }) {
    const [rateCards, setRateCards] = useState<RateCardView[]>([]);
    const [rateCardId, setRateCardId] = useState('');
    const [rateCardTouched, setRateCardTouched] = useState(false);
    const [interestRate, setInterestRate] = useState(String(record.interestRate));
    const [rateIsFixed, setRateIsFixed] = useState(record.interestMethod === 'Fixed rate');
    const [payoutFrequency, setPayoutFrequency] = useState<FdPayoutFrequency>('at_maturity');
    const [frequencyTouched, setFrequencyTouched] = useState(false);
    const [payoutMode, setPayoutMode] = useState<FdPayoutMode>(record.payoutInstruction === 'Payout at maturity' ? 'payout' : 'reinvest');
    const [modeTouched, setModeTouched] = useState(false);
    const [maturityAction, setMaturityAction] = useState<FdMaturityAction>('pending');
    const [actionTouched, setActionTouched] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    // Loads the active rate-card catalogue so the revised booking uses an approved rate.
    useEffect(() => {
        let active = true;
        setLoading(true);
        fdRepository
            .listRateCards()
            .then((rows) => { if (active) { setRateCards(rows.filter((card) => card.isActive)); setError(''); } })
            .catch((reason: unknown) => { if (active) setError(messageFor(reason, 'Unable to load FD rate cards.')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            setError('');
            const rate = Number(interestRate);
            if (!Number.isFinite(rate) || rate <= 0) { setError('Enter a valid interest rate before saving.'); return; }
            // Only the fields the operator actually revised are sent, so an untouched
            // select never silently overwrites the booked payout / maturity behaviour.
            const input: FdUpdateInput = {};
            if (rateCardTouched && rateCardId) input.rateCardId = rateCardId;
            if (rate !== record.interestRate) input.interestRate = rate;
            if (rateIsFixed !== (record.interestMethod === 'Fixed rate')) input.rateIsFixed = rateIsFixed;
            if (frequencyTouched) input.payoutFrequency = payoutFrequency;
            if (modeTouched) input.payoutMode = payoutMode;
            if (actionTouched) input.maturityAction = maturityAction;
            if (!Object.keys(input).length) { setError('Change at least one editable field before saving.'); return; }
            await onSave(input);
        } finally {
            setSaving(false);
        }
    };
    return <Modal title={`Edit FD account · ${record.id}`} eyebrow="FD WORKFLOW" onClose={onClose} wide>
        <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
            <FormLegend />
            <p className="form-note full-field">Principal, tenure, customer, branch, opening date and status are fixed once the deposit is booked — the backend revises only the rate card / rate, the payout behaviour and the maturity action.</p>
            <label><span>Rate card <Opt /></span><select value={rateCardId} onChange={(event) => { const next = event.target.value; setRateCardTouched(true); setRateCardId(next); const card = rateCards.find((item) => item.id === next); if (card) setInterestRate(String(Number(card.interestRate))); }} aria-label="Select FD rate card" disabled={loading}><option value="">{loading ? 'Loading rate cards…' : 'Keep current rate card'}</option>{rateCards.map((card) => <option key={card.id} value={card.id}>{`${getSchemeLabel(card)} · [₹${Number(card.minAmount).toLocaleString('en-IN')} - ₹${Number(card.maxAmount).toLocaleString('en-IN')}]`}</option>)}</select></label>
            <label><span>Interest rate (% p.a.) <Req /></span><input value={interestRate} onChange={(event) => setInterestRate(event.target.value)} inputMode="decimal" aria-label="Interest rate" /></label>
            <label><span>Rate basis <Opt /></span><select value={rateIsFixed ? 'fixed' : 'scheme'} onChange={(event) => setRateIsFixed(event.target.value === 'fixed')} aria-label="Rate basis"><option value="scheme">Scheme rate</option><option value="fixed">Fixed rate</option></select></label>
            <label><span>Interest payout frequency <Opt /></span><select value={payoutFrequency} onChange={(event) => { setFrequencyTouched(true); setPayoutFrequency(event.target.value as FdPayoutFrequency); }} aria-label="Payout frequency"><option value="at_maturity">At maturity</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label>
            <label><span>Payout mode <Opt /></span><select value={payoutMode} onChange={(event) => { setModeTouched(true); setPayoutMode(event.target.value as FdPayoutMode); }} aria-label="Payout mode"><option value="payout">Payout</option><option value="reinvest">Reinvest</option></select></label>
            <label><span>Maturity action <Opt /></span><select value={maturityAction} onChange={(event) => { setActionTouched(true); setMaturityAction(event.target.value as FdMaturityAction); }} aria-label="Maturity action"><option value="pending">Pending decision</option><option value="renew_principal_interest">Renew principal + interest</option><option value="renew_principal">Renew principal</option><option value="transfer_to_savings">Transfer to savings</option><option value="pay_cash">Pay by cash</option><option value="pay_bank">Pay by bank</option></select></label>
            {error && <p className="form-error full-field">{error}</p>}
            <div className="admin-form-actions full-field">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
        </form>
    </Modal>;
}

export function FDStatementModal({ record, onClose }: { record: FDRecord; onClose: () => void }) {
    const [events, setEvents] = useState<FDEvent[]>(record.events);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);
    // Re-reads the account from the backend so the statement always reflects the latest
    // lifecycle events rather than a cached list row.
    useEffect(() => {
        let active = true;
        setLoading(true);
        fdRepository
            .detail(record.id)
            .then((fresh) => { if (active) { setEvents(fresh.events); setError(''); } })
            .catch((reason: unknown) => { if (active) setError(messageFor(reason, 'Unable to load the FD statement from the backend.')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [record.id]);
    const exportCsv = () => {
        if (exporting) return;
        setExporting(true);
        try {
            const header = ['FD account', 'Customer', 'Event', 'Date', 'Amount', 'Reference', 'Performed by', 'Note'];
            const rows = events.map((event) => [record.id, record.customerName, event.type, event.date, String(event.amount), event.reference, event.performedBy, event.note].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
            const csv = [header.join(','), ...rows].join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `fd-statement-${record.id}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };
    return <Modal title={`Statement · ${record.id}`} eyebrow={`FD STATEMENT / ${record.customerName}`} onClose={onClose} wide>
        <div className="customer-detail-grid">
            <div><span>Principal amount</span><strong>₹{record.principal.toLocaleString('en-IN')}</strong></div>
            <div><span>Maturity amount</span><strong className="green-text">₹{record.maturityAmount.toLocaleString('en-IN')}</strong></div>
            <div><span>Interest rate</span><strong>{record.interestRate}% p.a.</strong></div>
            <div><span>Tenure</span><strong>{record.tenureMonths} months</strong></div>
            <div><span>Opened on</span><strong>{record.openedOn}</strong></div>
            <div><span>Maturity date</span><strong>{record.maturityDate}</strong></div>
            <div><span>Nominee</span><strong>{record.nomineeName} · {record.nomineeRelation}</strong></div>
            <div><span>Payout instruction</span><strong>{record.payoutInstruction}</strong></div>
        </div>
        <section className="customer-subsection">
            <div className="customer-section-heading">
                <div><h3>Statement entries</h3><p>Lifecycle events and interest entries recorded on the backend.</p></div>
                <span>{loading ? 'Loading…' : `${events.length} entries`}</span>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="customer-transaction-list">{events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.note}</span></div><div><b>₹{event.amount.toLocaleString('en-IN')}</b><small>{event.reference} · {event.performedBy}</small></div></div>)}</div>
        </section>
        <div className="admin-form-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Close</button>
            <button type="button" className="primary-button" onClick={exportCsv} disabled={exporting}><Download size={15} /> {exporting ? 'Exporting…' : 'Export statement'}</button>
        </div>
    </Modal>;
}

export function FDDetail({ record, onClose, onEdit, onAction, onStatement, onDelete }: { record: FDRecord; onClose: () => void; onEdit: () => void; onAction: () => void; onStatement: () => void; onDelete?: () => void }) {
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`FD ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">FIXED DEPOSIT / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} · {record.customerPhone} · Principal and maturity lifecycle</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>{record.tenureMonths} months · {record.interestRate}% p.a. · Matures {record.maturityDate}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>Principal amount</span><strong>₹{record.principal.toLocaleString('en-IN')}</strong></div><div><span>Maturity amount</span><strong className="green-text">₹{record.maturityAmount.toLocaleString('en-IN')}</strong></div><div><span>Interest rate</span><strong>{record.interestRate}% p.a.</strong></div><div><span>Tenure</span><strong>{record.tenureMonths} months</strong></div><div><span>Nominee / beneficiary</span><strong>{record.nomineeName} · {record.nomineeRelation}</strong></div><div><span>Payout instruction</span><strong>{record.payoutInstruction}</strong></div><div><span>Opened on</span><strong>{record.openedOn}</strong></div><div><span>Maturity date</span><strong>{record.maturityDate}</strong></div><div><span>Product / branch</span><strong>{record.productCode ?? 'Not captured'} · {record.branch ?? 'Not captured'}</strong></div><div><span>Opening channel</span><strong>{record.openingChannel ?? 'Not captured'}</strong></div><div><span>Interest terms</span><strong>{record.interestMethod ?? 'Not captured'} · {record.compoundingFrequency ?? 'Not captured'}</strong></div><div><span>Tax / special rate</span><strong>{record.taxIdentifier ?? 'Not captured'} · {record.specialRateReference ?? 'Not captured'}</strong></div><div><span>Nominee contact</span><strong>{record.nomineePhone ?? 'Not captured'} · {record.nomineeAddress ?? 'Not captured'}</strong></div><div><span>Nominee identity / documents</span><strong>{record.nomineeIdentityReference ?? 'Not captured'} · {record.nomineeDocumentReferences ?? 'Not captured'}</strong></div><div><span>Payout details</span><strong>{record.payoutMethod ?? 'Not captured'} · {record.payoutAccountReference ?? 'Not captured'}</strong></div><div><span>Closure / renewal terms</span><strong>{record.prematureClosureTerms ?? 'Not captured'} · {record.renewalInstructions ?? 'Not captured'}</strong></div><div><span>Lien / authorization</span><strong>{record.lienDetails ?? 'Not captured'} · {record.authorizationReference ?? 'Not captured'}</strong></div><div><span>Documents / consent</span><strong>{record.documentReferences ?? 'Not captured'} · {record.consentReference ?? 'Not captured'}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>FD account history</h3><p>Lifecycle events, interest entries and authorization references.</p></div><span>{record.events.length} events</span></div><div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.note}</span></div><div><b>₹{event.amount.toLocaleString('en-IN')}</b><small>{event.reference} · {event.performedBy}{event.authorizationReference ? ` · Auth: ${event.authorizationReference}` : ''}{event.approvalReference ? ` · Approval: ${event.approvalReference}` : ''}{event.paymentMethod ? ` · ${event.paymentMethod}` : ''}{event.destinationAccount ? ` · Destination: ${event.destinationAccount}` : ''}{event.externalReference ? ` · ${event.externalReference}` : ''}{event.supportingDocuments ? ` · Docs: ${event.supportingDocuments}` : ''}{event.consentReference ? ` · Consent: ${event.consentReference}` : ''}</small></div><StatusPill status={event.type === 'Closed' || event.type === 'Payout' ? 'Completed' : 'Active'} /></div>)}</div></section><div className="customer-detail-actions fd-detail-actions"><button className="secondary-button" onClick={onStatement}>View / export statement</button>{onDelete && <button className="secondary-button" style={{ color: '#dc2626' }} onClick={onDelete}><Trash2 size={15} /> Close / Delete FD</button>}<button className="secondary-button" onClick={onEdit}>Edit FD account</button><button className="primary-button" onClick={onAction}><FileCheck2 size={15} /> Renewal / closure / payout</button></div></section></div>;
}

function FDDeleteModal({
    record,
    onClose,
    onConfirm,
}: {
    record: FDRecord;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
}) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Please enter a closure / cancellation reason.');
            return;
        }
        setSubmitting(true);
        try {
            await onConfirm(reason.trim());
        } catch (err: any) {
            setError(err.message || 'Failed to close fixed deposit');
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="admin-modal" style={{ maxWidth: '480px' }} role="dialog">
                <div className="admin-modal-header">
                    <div>
                        <div className="eyebrow" style={{ color: '#dc2626' }}>CLOSE / DELETE FIXED DEPOSIT</div>
                        <h2>Close FD Account</h2>
                        <p>{record.id} · {record.customerName}</p>
                    </div>
                    <button className="icon-button" onClick={onClose} disabled={submitting}>×</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', gap: '10px' }}>
                        <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.85rem', color: '#991b1b', lineHeight: 1.4 }}>
                            <strong>Warning:</strong> Closing this fixed deposit will terminate the certificate, release any active lien against this deposit, mark status as closed, and record the closure event on the backend audit log.
                        </div>
                    </div>
                    {error && (
                        <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '12px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>
                            {error}
                        </div>
                    )}
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                        Closure / Cancellation Reason <Req />
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(''); }}
                        placeholder="e.g. Customer requested early premature closure, certificate cancelled, customer profile deleted..."
                        rows={3}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                        required
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="primary-button" style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }} disabled={submitting}>
                            {submitting ? 'Closing...' : 'Confirm FD Closure'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function FixedDepositsPage() {
    const [fdRows, setFdRows] = useState<FDRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    const [showRange, setShowRange] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'account' | 'action' | 'detail' | 'edit' | 'statement' | null>(null);
    const [selected, setSelected] = useState<FDRecord | undefined>();
    const [deleteTarget, setDeleteTarget] = useState<FDRecord | null>(null);
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };

    const confirmDeleteFD = async (reason: string) => {
        if (!deleteTarget) return;
        try {
            await fdRepository.close(deleteTarget.id, reason);
            setFdRows((current) => current.filter((r) => r.id !== deleteTarget.id));
            if (selected?.id === deleteTarget.id) {
                close();
            }
            setDeleteTarget(null);
            notify(`FD account ${deleteTarget.id} has been closed.`);
        } catch (err) {
            notify(messageFor(err, 'Unable to close the FD account on the backend.'));
            throw err;
        }
    };
    useEffect(() => {
        let active = true;
        fdRepository
            .list()
            .then((rows) => { if (active) setFdRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load fixed deposit records from the backend.')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    // Maturity-range filtering compares the real backend maturity date (ISO) when set.
    const withinRange = (row: FDRecord) => {
        if (!rangeFrom && !rangeTo) return true;
        const maturity = row.maturityDate ? row.maturityDate.slice(0, 10) : '';
        if (!maturity) return false;
        if (rangeFrom && maturity < rangeFrom) return false;
        if (rangeTo && maturity > rangeTo) return false;
        return true;
    };
    const filteredRows = fdRows.filter((row) => withinRange(row) && `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.nomineeName} ${row.payoutInstruction} ${row.events.map((event) => `${event.reference} ${event.performedBy} ${event.type}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const activeCount = fdRows.filter((row) => row.status === 'Active').length;
    const maturityReviewCount = fdRows.filter((row) => row.status === 'Review' || row.status === 'Pending').length;
    const totalPrincipal = fdRows.reduce((total, row) => total + row.principal, 0);
    const maturityValue = fdRows.filter((row) => row.status !== 'Completed').reduce((total, row) => total + row.maturityAmount, 0);
    const saveAccount = async (input: FDInput) => {
        try {
            // The catalogue is passed through so `open()` books the exact rate card the
            // operator selected instead of re-resolving one by amount and tenure.
            const rateCards = await fdRepository.listRateCards();
            const record = await fdRepository.open(input as FdRepoInput, rateCards);
            setFdRows((current) => [record, ...current]);
            setPage(1);
            close();
            notify(`FD account ${record.id} opened on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to open the FD account on the backend.'));
        }
    };
    const saveAction = async (input: FDActionInput) => {
        if (!selected) return;
        try {
            let record: FDRecord;
            if (input.action === 'Close') {
                record = await fdRepository.closeEarly(selected.id, input.note || 'FD closed early at branch request.');
            } else if (input.action === 'Payout') {
                const maturity: FdMaturityActionInput = input.destinationAccount
                    ? { action: 'pay_bank', paymentMethod: 'bank_transfer' }
                    : { action: 'pay_cash', paymentMethod: 'cash' };
                record = await fdRepository.maturityAction(selected.id, maturity);
            } else {
                record = await fdRepository.maturityAction(selected.id, { action: 'renew_principal_interest', tenureMonths: selected.tenureMonths });
            }
            setFdRows((current) => current.map((row) => (row.id === selected.id ? record : row)));
            close();
            notify(`FD ${input.action.toLowerCase()} action recorded on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to record the FD action on the backend.'));
        }
    };
    const saveEdit = async (input: FdUpdateInput) => {
        if (!selected) return;
        try {
            // PATCH /fd/accounts/:id — the backend re-validates the rate-card band and tenure.
            const record = await fdRepository.update(selected.id, input);
            setFdRows((current) => current.map((row) => (row.id === selected.id ? record : row)));
            setSelected(record);
            setModal('detail');
            notify(`FD account ${record.id} updated on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to update the FD account on the backend.'));
        }
    };
    // Exports the backend-sourced rows currently in view as a real CSV download.
    const exportCsv = () => {
        if (exporting) return;
        setExporting(true);
        try {
            const header = ['FD account', 'Customer', 'Customer ID', 'Phone', 'Principal', 'Rate %', 'Tenure (months)', 'Maturity amount', 'Opened on', 'Maturity date', 'Nominee', 'Payout instruction', 'Status', 'Branch'];
            const rows = filteredRows.map((row) => [row.id, row.customerName, row.customerId, row.customerPhone, String(row.principal), String(row.interestRate), String(row.tenureMonths), String(row.maturityAmount), row.openedOn, row.maturityDate, row.nomineeName, row.payoutInstruction, row.status, row.branch ?? ''].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
            const csv = [header.join(','), ...rows].join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `fd-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            notify(`${filteredRows.length} FD account records exported.`);
        } finally {
            setExporting(false);
        }
    };
    const openDetail = (record: FDRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / FIXED DEPOSITS</div><h1>Fixed Deposits</h1><p>Manage principal, interest, maturity, nominee, payout and FD lifecycle controls.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Open FD account</button></div><SummaryStrip items={[{ label: 'Active FD accounts', value: String(activeCount), tone: 'green' }, { label: 'Total principal', value: `₹${(totalPrincipal / 100000).toFixed(2)}L` }, { label: 'Maturity / review', value: String(maturityReviewCount), tone: 'orange' }, { label: 'Maturity value', value: `₹${(maturityValue / 100000).toFixed(2)}L`, tone: 'green' }]} /><div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)', borderRadius: '12px', padding: '16px 20px', color: '#ffffff', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '1.25rem' }}>📢</span><div><h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.02em', color: '#ffffff' }}>आकर्षक मुदत ठेव (FD) योजना · PUBLISHED RATE CARD</h3><p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#bfdbfe' }}>संस्थेचे अधिकृत व्याजदर तक्ता व दामदुप्पट योजना (Official Society Published FD Rate Ladder)</p></div></div><button type="button" className="primary-button" style={{ background: '#f59e0b', borderColor: '#d97706', color: '#78350f', fontWeight: 700, padding: '6px 14px', fontSize: '0.82rem' }} onClick={() => setModal('account')}><Plus size={14} /> Open FD with Scheme</button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>{OFFICIAL_FD_SCHEMES.map((scheme) => <div key={scheme.id} style={{ background: scheme.isDamduppat ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.18) 0%, rgba(253, 230, 138, 0.28) 100%)' : 'rgba(255, 255, 255, 0.10)', border: scheme.isDamduppat ? '1px solid #fcd34d' : '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', padding: '10px 12px', backdropFilter: 'blur(4px)' }}><div style={{ fontSize: '0.72rem', color: scheme.isDamduppat ? '#fef08a' : '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{scheme.englishTitle}</div><div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: '2px 0' }}>{scheme.marathiTitle}</div><div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}><span style={{ fontSize: '1.2rem', fontWeight: 800, color: scheme.isDamduppat ? '#fde047' : '#67e8f9' }}>{scheme.isDamduppat ? '७२ महिने' : `${scheme.ratePercent}%`}</span><span style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 500 }}>{scheme.isDamduppat ? 'रक्कम दुप्पट' : 'व्याजदर'}</span></div></div>)}</div></div><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search FD, customer, nominee or reference..." aria-label="Search fixed deposits" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter FD accounts by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Completed">Completed</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => setShowRange((current) => !current)}><CalendarDays size={15} /> Maturity range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={exportCsv} disabled={exporting} aria-label="Export FD data"><Download size={16} /></button></div>{showRange ? <div className="filter-bar"><label>Maturity from<input type="date" value={rangeFrom} onChange={(event) => { setRangeFrom(event.target.value); setPage(1); }} aria-label="Maturity from" /></label><label>Maturity to<input type="date" value={rangeTo} onChange={(event) => { setRangeTo(event.target.value); setPage(1); }} aria-label="Maturity to" /></label><button className="filter-button" onClick={() => { setRangeFrom(''); setRangeTo(''); setPage(1); }}>Clear range</button></div> : null}<div className="data-table-wrap"><table className="data-table"><thead><tr><th>FD account / customer</th><th>Principal</th><th>Rate / tenure</th><th>Maturity</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{loading ? <tr><td className="empty-state" colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#888' }}><Loader2 size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} /> Loading fixed deposits...</td></tr> : visibleRows.length ? visibleRows.map((row) => <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.customerPhone}</span><small>{row.id} · Nominee {row.nomineeName}</small></td><td className="table-amount">₹{row.principal.toLocaleString('en-IN')}</td><td className="table-muted">{row.interestRate}% p.a. · {row.tenureMonths} months</td><td className="table-muted"><strong className="fd-maturity-amount">₹{row.maturityAmount.toLocaleString('en-IN')}</strong><span>{row.maturityDate}</span></td><td><StatusPill status={row.status} /></td><td><div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}><button className="row-action" title="Close / delete FD" onClick={(event) => { event.stopPropagation(); setDeleteTarget(row); }} aria-label={`Close ${row.id}`} style={{ color: '#dc2626' }}><Trash2 size={15} /></button><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></div></td></tr>) : <tr><td className="empty-state" colSpan={6}>No FD accounts match the current search and status filter.</td></tr>}</tbody></table></div><Pagination page={page} pageSize={pageSize} totalItems={filteredRows.length} itemName="deposits" setPage={setPage} />
</section>{modal === 'account' && <FDModal mode="account" onClose={close} onSave={(input) => saveAccount(input as FDInput)} />}{modal === 'action' && selected && <FDModal mode="action" record={selected} onClose={close} onSave={(input) => saveAction(input as FDActionInput)} />}{modal === 'edit' && selected && <FDEditModal record={selected} onClose={() => setModal('detail')} onSave={saveEdit} />}{modal === 'statement' && selected && <FDStatementModal record={selected} onClose={() => setModal('detail')} />}{modal === 'detail' && selected && <FDDetail record={fdRows.find((row) => row.id === selected.id) ?? selected} onClose={close} onEdit={() => setModal('edit')} onAction={() => setModal('action')} onStatement={() => setModal('statement')} onDelete={() => setDeleteTarget(selected)} />}{deleteTarget && <FDDeleteModal record={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDeleteFD} />}{toast && <div className="admin-toast"><CheckCircle2 size={15} />{toast}</div>}</div>;
}
