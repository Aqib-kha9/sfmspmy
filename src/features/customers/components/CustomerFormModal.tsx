import { FormEvent, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../../../components/overlays/Modal';
import { validateCustomer } from '../schemas/customerSchemas';
import { agentsRepository } from '../../admin/services/operations/agentsApiRepository';
import { settingsRepository } from '../../admin/services/operations/settingsApiRepository';
import type { Customer, CustomerInput } from '../types/customer.types';

/**
 * Test profile used by docs/testing-sequence.md step A2.2 (Customer Workflow).
 * The "Fill test data" button writes these values INTO the form fields so the
 * executor can save quickly without copy/pasting each field. The save handler
 * still reads the form's current field values, so anything edited afterwards
 * is what gets submitted — the constant is only a one-time convenience seed.
 * Branch and assigned agent are bound to whatever option is actually loaded
 * (falling back to the first available), so the two dropdowns stay valid.
 */
const TEST_CUSTOMER_FILL: Omit<CustomerInput, 'branch' | 'assignedAgent'> = {
    name: 'Test Customer One',
    phone: '9555500001',
    email: 'test.one@example.com',
    alternatePhone: '',
    customerType: 'Individual',
    status: 'Pending',
    address: 'Waghapur, Yavatmal 445001',
    permanentAddress: 'Waghapur, Yavatmal 445001',
    dateOfBirth: '1990-05-15',
    gender: 'Female',
    occupation: 'Tailoring',
    businessType: '',
    taxIdentifier: 'ABCDE1234F',
    identityType: 'Aadhaar',
    identityReference: '1234 5678 9012',
    kycMethod: 'Document review',
    kycVerifiedOn: '',
    amlRiskCategory: 'Low',
    sourceOfFunds: 'Business income',
    communicationPreference: 'SMS',
    nomineeName: 'Nominee One',
    nomineePhone: '9555500002',
    nomineeRelation: 'Spouse',
    guardianName: '',
    guardianPhone: '',
    consentCaptured: true,
    documentReferences: 'Test documents for A2.2 workflow validation',
    registrationDate: new Date().toISOString().slice(0, 10),
};

export function CustomerFormModal({ customer, onClose, onSave }: { customer?: Customer; onClose: () => void; onSave: (input: CustomerInput) => Promise<void> }) {
    const [form, setForm] = useState<CustomerInput>({
        name: customer?.name ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '', alternatePhone: customer?.alternatePhone ?? '',
        customerType: customer?.customerType ?? 'Individual', status: customer?.status ?? 'Pending', address: customer?.address ?? '', permanentAddress: customer?.permanentAddress ?? '',
        dateOfBirth: customer?.dateOfBirth ?? '', gender: customer?.gender ?? '',
        occupation: customer?.occupation ?? '', businessType: customer?.businessType ?? '', taxIdentifier: customer?.taxIdentifier ?? '', identityType: customer?.identityType ?? 'Aadhaar',
        identityReference: customer?.identityReference ?? '', kycMethod: customer?.kycMethod ?? 'Document review', kycVerifiedOn: customer?.kycVerifiedOn ?? '', amlRiskCategory: customer?.amlRiskCategory ?? 'Standard',
        sourceOfFunds: customer?.sourceOfFunds ?? '', communicationPreference: customer?.communicationPreference ?? 'SMS', branch: customer?.branch ?? '',
        nomineeName: customer?.nomineeName ?? '', nomineePhone: customer?.nomineePhone ?? '', nomineeRelation: customer?.nomineeRelation ?? '', guardianName: customer?.guardianName ?? '', guardianPhone: customer?.guardianPhone ?? '',
        assignedAgent: customer?.assignedAgent ?? 'Unassigned', consentCaptured: customer?.consentCaptured ?? false, documentReferences: customer?.documentReferences ?? '', registrationDate: customer?.registrationDate ?? ''
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [agentNames, setAgentNames] = useState<string[]>([]);
    const [branchNames, setBranchNames] = useState<string[]>([]);
    useEffect(() => {
        let active = true;
        agentsRepository.list()
            .then((rows) => { if (active) setAgentNames(rows.map((row) => row.name).filter((name) => name.trim().length > 0)); })
            .catch(() => undefined);
        settingsRepository.branches()
            .then((rows) => { if (active) setBranchNames(rows.map((row) => row.name).filter((name) => name.trim().length > 0)); })
            .catch(() => undefined);
        return () => { active = false; };
    }, []);
    const set = (key: keyof CustomerInput, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
    const fillTestData = () => {
        setError('');
        setForm((current) => ({
            ...current,
            ...TEST_CUSTOMER_FILL,
            branch: branchNames[0] ?? current.branch,
            assignedAgent: agentNames[0] ?? current.assignedAgent,
        }));
    };
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        const input: CustomerInput = { ...form, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), nomineeName: form.nomineeName.trim(), nomineePhone: form.nomineePhone.trim(), nomineeRelation: form.nomineeRelation.trim() };
        const result = validateCustomer(input);
        if (!result.valid) { setError(result.message); return; }
        setError('');
        setSaving(true);
        try {
            await onSave(input);
        } catch (reason) {
            // Surface the server's message (e.g. a 409 duplicate-mobile /
            // duplicate-identity conflict that names the existing customer)
            // directly in the form instead of only in the page toast.
            setError(reason instanceof Error && reason.message ? reason.message : 'Unable to save the customer profile.');
        } finally {
            setSaving(false);
        }
    };
    return <Modal title={customer ? 'Edit customer profile' : 'Add customer profile'} eyebrow="CUSTOMER WORKFLOW" onClose={onClose} wide><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
        <label>Legal / full name<input value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
        <label>Mobile number<input value={form.phone} onChange={(event) => set('phone', event.target.value)} /></label>
        <label>Email address<input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} /></label>
        <label>Alternate phone<input value={form.alternatePhone} onChange={(event) => set('alternatePhone', event.target.value)} /></label>
        <label>Customer type<select value={form.customerType} onChange={(event) => set('customerType', event.target.value)}><option>Individual</option><option>Cooperation</option><option>Group</option><option>SHG</option><option>Organisation</option><option>Minor</option><option>Joint</option></select></label>
        <label>Account / KYC status (Aadhaar verification)<select value={form.status} onChange={(event) => set('status', event.target.value)}><option value="Pending">Pending</option><option value="Active">Verified / Active</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select></label>
        <label>Date of birth / incorporation<input type="date" value={form.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} /></label>
        <label>Gender<input value={form.gender} onChange={(event) => set('gender', event.target.value)} /></label>
        <label>Occupation<input value={form.occupation} onChange={(event) => set('occupation', event.target.value)} /></label>
        <label>Business type<input value={form.businessType} onChange={(event) => set('businessType', event.target.value)} /></label>
        <label>PAN / tax identifier<input value={form.taxIdentifier} onChange={(event) => set('taxIdentifier', event.target.value)} /></label>
        <label>Identity document type<select value={form.identityType} onChange={(event) => set('identityType', event.target.value)}><option>Aadhaar</option><option>PAN</option><option>Passport</option><option>Voter ID</option><option>Driving licence</option></select></label>
        <label>Identity reference<input value={form.identityReference} onChange={(event) => set('identityReference', event.target.value)} placeholder="Masked or backend reference" /></label>
        <label>KYC verification method<select value={form.kycMethod} onChange={(event) => set('kycMethod', event.target.value)}><option>Document review</option><option>Video KYC</option><option>e-KYC</option><option>Manual verification</option></select></label>
        <label>KYC verified on<input type="date" value={form.kycVerifiedOn} onChange={(event) => set('kycVerifiedOn', event.target.value)} /></label>
        <label>AML risk category<select value={form.amlRiskCategory} onChange={(event) => set('amlRiskCategory', event.target.value)}><option>Standard</option><option>Low</option><option>High</option><option>Enhanced review</option></select></label>
        <label>Source of funds<input value={form.sourceOfFunds} onChange={(event) => set('sourceOfFunds', event.target.value)} /></label>
        <label>Communication preference<select value={form.communicationPreference} onChange={(event) => set('communicationPreference', event.target.value)}><option>SMS</option><option>WhatsApp</option><option>Email</option><option>Phone</option><option>Do not contact</option></select></label>
        <label>Branch<select value={form.branch} onChange={(event) => set('branch', event.target.value)}><option value="">Select branch</option>{branchNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Registration date<input type="date" value={form.registrationDate} onChange={(event) => set('registrationDate', event.target.value)} /></label>
        <label>Assigned collection agent<select value={form.assignedAgent} onChange={(event) => set('assignedAgent', event.target.value)}><option value="">Unassigned</option>{agentNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="full-field">Current / registered address<textarea value={form.address} onChange={(event) => set('address', event.target.value)} /></label>
        <label className="full-field">Permanent address<textarea value={form.permanentAddress} onChange={(event) => set('permanentAddress', event.target.value)} /></label>
        <label>Nominee full name<input value={form.nomineeName} onChange={(event) => set('nomineeName', event.target.value)} /></label>
        <label>Nominee mobile<input value={form.nomineePhone} onChange={(event) => set('nomineePhone', event.target.value)} /></label>
        <label>Nominee relation<input value={form.nomineeRelation} onChange={(event) => set('nomineeRelation', event.target.value)} /></label>
        <label>Guardian name, if applicable<input value={form.guardianName} onChange={(event) => set('guardianName', event.target.value)} /></label>
        <label>Guardian phone, if applicable<input value={form.guardianPhone} onChange={(event) => set('guardianPhone', event.target.value)} /></label>
        <label className="full-field">Document references<textarea value={form.documentReferences} onChange={(event) => set('documentReferences', event.target.value)} placeholder="Photo, signature, KYC and consent document references" /></label>
        <label className="full-field checkbox-field"><input type="checkbox" checked={form.consentCaptured} onChange={(event) => set('consentCaptured', event.target.checked)} /> Customer consent captured for profile and communications</label>
        {error && <p className="form-error full-field">{error}</p>}
        {!customer && <p className="form-hint full-field">Tip: use <strong>Fill test data</strong> to drop in the documented A2.2 sample profile, then Save to submit exactly what is shown in the fields.</p>}
        <div className="admin-form-actions full-field">{!customer && <button type="button" className="secondary-button" onClick={fillTestData} disabled={saving}>Fill test data</button>}<button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? (customer ? 'Updating…' : 'Saving…') : (customer ? 'Update customer' : 'Save customer')}</button></div>
    </form></Modal>;
}
