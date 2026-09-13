// OPERATIONS / Fixed deposits.

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, Download, FileCheck2, Filter, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { fdRepository } from '../services/operations/fdApiRepository';
import type { FDInput as FdRepoInput, FdMaturityActionInput, RateCardView, FdUpdateInput, FdPayoutFrequency, FdPayoutMode, FdMaturityAction } from '../services/operations/fdApiRepository';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer } from '../../customers/types/customer.types';
import type { CustomerOption } from '../../customers/services/customerRepository';
import { messageFor } from '../services/operations/helpers';
import { Modal } from '../../../components/overlays/Modal';
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

export function FDModal({ mode, record, onClose, onSave }: { mode: 'account' | 'action'; record?: FDRecord; onClose: () => void; onSave: (input: FDInput | FDActionInput) => Promise<void> }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? '');
    const [principal, setPrincipal] = useState(String(record?.principal ?? ''));
    const [tenureMonths, setTenureMonths] = useState(String(record?.tenureMonths ?? 12));
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? 7.5));
    const [openedOn, setOpenedOn] = useState(record?.openedOn ?? '');
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
    // Simple-interest projection mirrors the backend: principal + principal x rate x months / 1200.
    const projectedMaturityAmount = principal && Number.isFinite(principalNumber) && Number.isFinite(Number(interestRate)) && Number(tenureMonths)
        ? Math.round(principalNumber + (principalNumber * Number(interestRate) * Number(tenureMonths)) / 1200)
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
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Open fixed deposit' : 'Fixed deposit lifecycle action'}><div className="admin-modal-header"><div><div className="eyebrow">FD WORKFLOW</div><h2>{mode === 'account' ? 'Open fixed deposit account' : `${action} · ${record?.id}`}</h2><p>{mode === 'account' ? 'Capture principal, rate, maturity and beneficiary information.' : 'Record a controlled renewal, closure or maturity payout action.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>{mode === 'account' ? <><label className="full-field">Search customer<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label><label className="full-field">Customer<select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name} | {option.customerNumber}</option>)}</select></label>{customerError ? <p className="form-error full-field">{customerError}</p> : null}{customerDetails ? <p className="form-note full-field">Opening against {customerDetails.name} - {customerDetails.phone}{customerDetails.branch ? ` - ${customerDetails.branch}` : null}</p> : null}<label>Product / rate card<select value={productCode} onChange={(event) => selectRateCard(event.target.value)} aria-label="Select FD rate card"><option value="">{rateCardLoading ? 'Loading rate cards...' : 'Select a rate card'}</option>{rateCards.map((card) => <option key={card.id} value={card.id}>{`${card.tenureMonths} mo | ${Number(card.interestRate)}% p.a. | Rs ${Number(card.minAmount).toLocaleString('en-IN')} - Rs ${Number(card.maxAmount).toLocaleString('en-IN')}`}</option>)}</select></label>{rateCardError ? <p className="form-error full-field">{rateCardError}</p> : null}{rateCardHint ? <p className="form-note full-field">{rateCardHint}</p> : null}<label>Principal amount<input type="number" min={BUSINESS_RULES.FD_MIN_AMOUNT} max={BUSINESS_RULES.FD_MAX_AMOUNT} value={principal} onChange={(event) => setPrincipal(event.target.value)} placeholder="100000" />{principalBelowMin ? <small className="form-error">Principal must be at least {formatCurrency(BUSINESS_RULES.FD_MIN_AMOUNT)}.</small> : null}{principalAboveMax ? <small className="form-error">Principal cannot exceed {formatCurrency(BUSINESS_RULES.FD_MAX_AMOUNT)} per society rules.</small> : null}</label><label>Tenure (months)<input type="number" min="1" value={tenureMonths} onChange={(event) => setTenureMonths(event.target.value)} />{rateCardMismatch ? <small className="form-error">No active rate card covers this principal and tenure.</small> : null}</label><label>Interest rate (% p.a.)<input type="number" min="0" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} readOnly={Boolean(selectedRateCard)} aria-readonly={Boolean(selectedRateCard)} />{selectedRateCard ? <small className="form-note">Set from the selected rate card; not editable.</small> : null}</label><label>Opening date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label>Maturity date<input type="date" value={maturityDate} readOnly aria-readonly="true" />{projectedMaturityAmount > 0 ? <small className="form-note">Projected maturity value {formatCurrency(projectedMaturityAmount)} at {interestRate}% p.a.</small> : null}</label><label>Product / scheme code<input value={productCode} onChange={(event) => setProductCode(event.target.value)} /></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} /></label><label>Opening channel<input value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)} /></label><label>Interest method<input value={interestMethod} onChange={(event) => setInterestMethod(event.target.value)} /></label><label>Compounding frequency<input value={compoundingFrequency} onChange={(event) => setCompoundingFrequency(event.target.value)} /></label><label>Special-rate reference<input value={specialRateReference} onChange={(event) => setSpecialRateReference(event.target.value)} /></label><label>Tax identifier / PAN<input value={taxIdentifier} onChange={(event) => setTaxIdentifier(event.target.value)} /></label><label>Tax withholding instruction<input value={taxWithholdingInstruction} onChange={(event) => setTaxWithholdingInstruction(event.target.value)} /></label><label>Nominee / beneficiary name<input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} placeholder="Nominee name" /></label><label>Nominee relationship<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} placeholder="Spouse, parent..." /></label><label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label>Nominee address<input value={nomineeAddress} onChange={(event) => setNomineeAddress(event.target.value)} /></label><label>Nominee identity reference<input value={nomineeIdentityReference} onChange={(event) => setNomineeIdentityReference(event.target.value)} /></label><label>Nominee document references<input value={nomineeDocumentReferences} onChange={(event) => setNomineeDocumentReferences(event.target.value)} /></label><label>Payout method<select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)} aria-label="Select payout method"><option value="Cash">Cash</option><option value="Bank transfer">Bank transfer</option><option value="Cheque">Cheque</option><option value="Mobile money">Mobile money</option><option value="UPI">UPI</option><option value="NEFT">NEFT</option><option value="RTGS">RTGS</option></select></label><label>Payout account reference<input value={payoutAccountReference} onChange={(event) => setPayoutAccountReference(event.target.value)} /></label><label>Lien details<textarea value={lienDetails} onChange={(event) => setLienDetails(event.target.value)} />{lienAboveCap ? <small className="form-error">Loan against FD cannot exceed {formatCurrency(lienCapAmount)} (85% of the FD amount) per society rules.</small> : null}</label><label>Premature closure terms<textarea value={prematureClosureTerms} onChange={(event) => setPrematureClosureTerms(event.target.value)} /></label><label>Renewal instructions<textarea value={renewalInstructions} onChange={(event) => setRenewalInstructions(event.target.value)} /></label><label>Authorization reference<input value={authorizationReference} onChange={(event) => setAuthorizationReference(event.target.value)} /></label><label>Document references<input value={documentReferences} onChange={(event) => setDocumentReferences(event.target.value)} /></label><label>Consent reference<input value={consentReference} onChange={(event) => setConsentReference(event.target.value)} /></label><label>Payout instruction<select value={payoutInstruction} onChange={(event) => setPayoutInstruction(event.target.value as FDRecord['payoutInstruction'])}><option>Renew principal</option><option>Payout at maturity</option><option>Renew principal + interest</option></select></label><label>Account status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Active</option><option>Pending</option><option>Review</option><option>Inactive</option></select></label></> : <><label>Lifecycle action<select value={action} onChange={(event) => setAction(event.target.value as FDActionInput['action'])}><option>Renew</option><option>Close</option><option>Payout</option></select></label><label>Action date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label>Reference / authorization ID<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="AUTH-FD-88210" /></label><label>Approval reference<input value={approvalReference} onChange={(event) => setApprovalReference(event.target.value)} /></label><label>Payment / payout method<input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /></label><label>Destination account<input value={destinationAccount} onChange={(event) => setDestinationAccount(event.target.value)} /></label><label>External transfer reference<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label><label>Supporting documents<input value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} /></label><label>Consent / acknowledgment reference<input value={actionConsentReference} onChange={(event) => setActionConsentReference(event.target.value)} /></label><label className="full-field">Action note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record authorization, payout destination or renewal instruction" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : (mode === 'account' ? 'Create FD account' : `Save ${action.toLowerCase()} action`)}</button></div></form></section></div>;
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
            <p className="form-note full-field">Principal, tenure, customer, branch, opening date and status are fixed once the deposit is booked — the backend revises only the rate card / rate, the payout behaviour and the maturity action.</p>
            <label>Rate card<select value={rateCardId} onChange={(event) => { const next = event.target.value; setRateCardTouched(true); setRateCardId(next); const card = rateCards.find((item) => item.id === next); if (card) setInterestRate(String(Number(card.interestRate))); }} aria-label="Select FD rate card" disabled={loading}><option value="">{loading ? 'Loading rate cards…' : 'Keep current rate card'}</option>{rateCards.map((card) => <option key={card.id} value={card.id}>{formatCurrency(Number(card.minAmount))} - {formatCurrency(Number(card.maxAmount))} · {card.tenureMonths} months · {card.interestRate}%</option>)}</select></label>
            <label>Interest rate (% p.a.)<input value={interestRate} onChange={(event) => setInterestRate(event.target.value)} inputMode="decimal" aria-label="Interest rate" /></label>
            <label>Rate basis<select value={rateIsFixed ? 'fixed' : 'scheme'} onChange={(event) => setRateIsFixed(event.target.value === 'fixed')} aria-label="Rate basis"><option value="scheme">Scheme rate</option><option value="fixed">Fixed rate</option></select></label>
            <label>Interest payout frequency<select value={payoutFrequency} onChange={(event) => { setFrequencyTouched(true); setPayoutFrequency(event.target.value as FdPayoutFrequency); }} aria-label="Payout frequency"><option value="at_maturity">At maturity</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label>
            <label>Payout mode<select value={payoutMode} onChange={(event) => { setModeTouched(true); setPayoutMode(event.target.value as FdPayoutMode); }} aria-label="Payout mode"><option value="payout">Payout</option><option value="reinvest">Reinvest</option></select></label>
            <label>Maturity action<select value={maturityAction} onChange={(event) => { setActionTouched(true); setMaturityAction(event.target.value as FdMaturityAction); }} aria-label="Maturity action"><option value="pending">Pending decision</option><option value="renew_principal_interest">Renew principal + interest</option><option value="renew_principal">Renew principal</option><option value="transfer_to_savings">Transfer to savings</option><option value="pay_cash">Pay by cash</option><option value="pay_bank">Pay by bank</option></select></label>
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

export function FDDetail({ record, onClose, onEdit, onAction, onStatement }: { record: FDRecord; onClose: () => void; onEdit: () => void; onAction: () => void; onStatement: () => void }) {
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`FD ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">FIXED DEPOSIT / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} · {record.customerPhone} · Principal and maturity lifecycle</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>{record.tenureMonths} months · {record.interestRate}% p.a. · Matures {record.maturityDate}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>Principal amount</span><strong>₹{record.principal.toLocaleString('en-IN')}</strong></div><div><span>Maturity amount</span><strong className="green-text">₹{record.maturityAmount.toLocaleString('en-IN')}</strong></div><div><span>Interest rate</span><strong>{record.interestRate}% p.a.</strong></div><div><span>Tenure</span><strong>{record.tenureMonths} months</strong></div><div><span>Nominee / beneficiary</span><strong>{record.nomineeName} · {record.nomineeRelation}</strong></div><div><span>Payout instruction</span><strong>{record.payoutInstruction}</strong></div><div><span>Opened on</span><strong>{record.openedOn}</strong></div><div><span>Maturity date</span><strong>{record.maturityDate}</strong></div><div><span>Product / branch</span><strong>{record.productCode ?? 'Not captured'} · {record.branch ?? 'Not captured'}</strong></div><div><span>Opening channel</span><strong>{record.openingChannel ?? 'Not captured'}</strong></div><div><span>Interest terms</span><strong>{record.interestMethod ?? 'Not captured'} · {record.compoundingFrequency ?? 'Not captured'}</strong></div><div><span>Tax / special rate</span><strong>{record.taxIdentifier ?? 'Not captured'} · {record.specialRateReference ?? 'Not captured'}</strong></div><div><span>Nominee contact</span><strong>{record.nomineePhone ?? 'Not captured'} · {record.nomineeAddress ?? 'Not captured'}</strong></div><div><span>Nominee identity / documents</span><strong>{record.nomineeIdentityReference ?? 'Not captured'} · {record.nomineeDocumentReferences ?? 'Not captured'}</strong></div><div><span>Payout details</span><strong>{record.payoutMethod ?? 'Not captured'} · {record.payoutAccountReference ?? 'Not captured'}</strong></div><div><span>Closure / renewal terms</span><strong>{record.prematureClosureTerms ?? 'Not captured'} · {record.renewalInstructions ?? 'Not captured'}</strong></div><div><span>Lien / authorization</span><strong>{record.lienDetails ?? 'Not captured'} · {record.authorizationReference ?? 'Not captured'}</strong></div><div><span>Documents / consent</span><strong>{record.documentReferences ?? 'Not captured'} · {record.consentReference ?? 'Not captured'}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>FD account history</h3><p>Lifecycle events, interest entries and authorization references.</p></div><span>{record.events.length} events</span></div><div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.note}</span></div><div><b>₹{event.amount.toLocaleString('en-IN')}</b><small>{event.reference} · {event.performedBy}{event.authorizationReference ? ` · Auth: ${event.authorizationReference}` : ''}{event.approvalReference ? ` · Approval: ${event.approvalReference}` : ''}{event.paymentMethod ? ` · ${event.paymentMethod}` : ''}{event.destinationAccount ? ` · Destination: ${event.destinationAccount}` : ''}{event.externalReference ? ` · ${event.externalReference}` : ''}{event.supportingDocuments ? ` · Docs: ${event.supportingDocuments}` : ''}{event.consentReference ? ` · Consent: ${event.consentReference}` : ''}</small></div><StatusPill status={event.type === 'Closed' || event.type === 'Payout' ? 'Completed' : 'Active'} /></div>)}</div></section><div className="customer-detail-actions fd-detail-actions"><button className="secondary-button" onClick={onStatement}>View / export statement</button><button className="secondary-button" onClick={onEdit}>Edit FD account</button><button className="primary-button" onClick={onAction}><FileCheck2 size={15} /> Renewal / closure / payout</button></div></section></div>;
}

export function FixedDepositsPage() {
    const [fdRows, setFdRows] = useState<FDRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    const [showRange, setShowRange] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'account' | 'action' | 'detail' | 'edit' | 'statement' | null>(null);
    const [selected, setSelected] = useState<FDRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    useEffect(() => {
        let active = true;
        fdRepository
            .list()
            .then((rows) => { if (active) setFdRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load fixed deposit records from the backend.')); });
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
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / FIXED DEPOSITS</div><h1>Fixed Deposits</h1><p>Manage principal, interest, maturity, nominee, payout and FD lifecycle controls.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Open FD account</button></div><SummaryStrip items={[{ label: 'Active FD accounts', value: String(activeCount), tone: 'green' }, { label: 'Total principal', value: `₹${(totalPrincipal / 100000).toFixed(2)}L` }, { label: 'Maturity / review', value: String(maturityReviewCount), tone: 'orange' }, { label: 'Maturity value', value: `₹${(maturityValue / 100000).toFixed(2)}L`, tone: 'green' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search FD, customer, nominee or reference..." aria-label="Search fixed deposits" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter FD accounts by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Completed">Completed</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => setShowRange((current) => !current)}><CalendarDays size={15} /> Maturity range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={exportCsv} disabled={exporting} aria-label="Export FD data"><Download size={16} /></button></div>{showRange ? <div className="filter-bar"><label>Maturity from<input type="date" value={rangeFrom} onChange={(event) => { setRangeFrom(event.target.value); setPage(1); }} aria-label="Maturity from" /></label><label>Maturity to<input type="date" value={rangeTo} onChange={(event) => { setRangeTo(event.target.value); setPage(1); }} aria-label="Maturity to" /></label><button className="filter-button" onClick={() => { setRangeFrom(''); setRangeTo(''); setPage(1); }}>Clear range</button></div> : null}<div className="data-table-wrap"><table className="data-table"><thead><tr><th>FD account / customer</th><th>Principal</th><th>Rate / tenure</th><th>Maturity</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.customerPhone}</span><small>{row.id} · Nominee {row.nomineeName}</small></td><td className="table-amount">₹{row.principal.toLocaleString('en-IN')}</td><td className="table-muted">{row.interestRate}% p.a. · {row.tenureMonths} months</td><td className="table-muted"><strong className="fd-maturity-amount">₹{row.maturityAmount.toLocaleString('en-IN')}</strong><span>{row.maturityDate}</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>) : <tr><td className="empty-state" colSpan={6}>No FD accounts match the current search and status filter.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {visibleRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} FD accounts</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={`pagination-button ${page === item ? 'selected' : ''}`} key={item} onClick={() => setPage(item)}>{item}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'account' && <FDModal mode="account" onClose={close} onSave={(input) => saveAccount(input as FDInput)} />}{modal === 'action' && selected && <FDModal mode="action" record={selected} onClose={close} onSave={(input) => saveAction(input as FDActionInput)} />}{modal === 'edit' && selected && <FDEditModal record={selected} onClose={() => setModal('detail')} onSave={saveEdit} />}{modal === 'statement' && selected && <FDStatementModal record={selected} onClose={() => setModal('detail')} />}{modal === 'detail' && selected && <FDDetail record={fdRows.find((row) => row.id === selected.id) ?? selected} onClose={close} onEdit={() => setModal('edit')} onAction={() => setModal('action')} onStatement={() => setModal('statement')} />}{toast && <div className="admin-toast"><CheckCircle2 size={15} />{toast}</div>}</div>;
}
