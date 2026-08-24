import { FormEvent, useState } from 'react';
import { Modal } from '../../../components/overlays/Modal';
import { validateCustomer } from '../schemas/customerSchemas';
import type { Customer, CustomerInput } from '../types/customer.types';

export function CustomerFormModal({ customer, onClose, onSave }: { customer?: Customer; onClose: () => void; onSave: (input: CustomerInput) => Promise<void> }) {
    const [form, setForm] = useState<CustomerInput>({
        name: customer?.name ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '', alternatePhone: customer?.alternatePhone ?? '',
        customerType: customer?.customerType ?? 'Individual', status: customer?.status ?? 'Pending', address: customer?.address ?? '', permanentAddress: customer?.permanentAddress ?? '',
        dateOfBirth: customer?.dateOfBirth ?? '', gender: customer?.gender ?? '', maritalStatus: customer?.maritalStatus ?? '', nationality: customer?.nationality ?? 'Indian',
        occupation: customer?.occupation ?? '', businessType: customer?.businessType ?? '', taxIdentifier: customer?.taxIdentifier ?? '', identityType: customer?.identityType ?? 'Aadhaar',
        identityReference: customer?.identityReference ?? '', kycMethod: customer?.kycMethod ?? 'Document review', kycVerifiedOn: customer?.kycVerifiedOn ?? '', amlRiskCategory: customer?.amlRiskCategory ?? 'Standard',
        sourceOfFunds: customer?.sourceOfFunds ?? '', communicationPreference: customer?.communicationPreference ?? 'SMS', branch: customer?.branch ?? 'Jaipur Main Branch',
        nomineeName: customer?.nomineeName ?? '', nomineePhone: customer?.nomineePhone ?? '', nomineeRelation: customer?.nomineeRelation ?? '', guardianName: customer?.guardianName ?? '', guardianPhone: customer?.guardianPhone ?? '',
        assignedAgent: customer?.assignedAgent ?? 'Unassigned', consentCaptured: customer?.consentCaptured ?? false, documentReferences: customer?.documentReferences ?? '', registrationDate: customer?.registrationDate ?? '2026-08-22'
    });
    const [error, setError] = useState('');
    const set = (key: keyof CustomerInput, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const input: CustomerInput = { ...form, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), nomineeName: form.nomineeName.trim(), nomineePhone: form.nomineePhone.trim(), nomineeRelation: form.nomineeRelation.trim() };
        const result = validateCustomer(input);
        if (!result.valid) { setError(result.message); return; }
        await onSave(input);
    };
    return <Modal title={customer ? 'Edit customer profile' : 'Add customer profile'} eyebrow="CUSTOMER WORKFLOW" onClose={onClose} wide><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
        <label>Legal / full name<input value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
        <label>Mobile number<input value={form.phone} onChange={(event) => set('phone', event.target.value)} /></label>
        <label>Email address<input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} /></label>
        <label>Alternate phone<input value={form.alternatePhone} onChange={(event) => set('alternatePhone', event.target.value)} /></label>
        <label>Customer type<select value={form.customerType} onChange={(event) => set('customerType', event.target.value)}><option>Individual</option><option>Business</option></select></label>
        <label>Account / KYC status<select value={form.status} onChange={(event) => set('status', event.target.value)}><option value="Pending">Pending</option><option value="Active">Verified / Active</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select></label>
        <label>Date of birth / incorporation<input type="date" value={form.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} /></label>
        <label>Gender<input value={form.gender} onChange={(event) => set('gender', event.target.value)} /></label>
        <label>Marital status<input value={form.maritalStatus} onChange={(event) => set('maritalStatus', event.target.value)} /></label>
        <label>Nationality<input value={form.nationality} onChange={(event) => set('nationality', event.target.value)} /></label>
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
        <label>Branch<select value={form.branch} onChange={(event) => set('branch', event.target.value)}><option>Jaipur Main Branch</option><option>Vaishali Nagar Branch</option><option>Jhotwara Branch</option></select></label>
        <label>Registration date<input type="date" value={form.registrationDate} onChange={(event) => set('registrationDate', event.target.value)} /></label>
        <label>Assigned collection agent<select value={form.assignedAgent} onChange={(event) => set('assignedAgent', event.target.value)}><option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option><option>Unassigned</option></select></label>
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
        <div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{customer ? 'Update customer' : 'Save customer'}</button></div>
    </form></Modal>;
}
