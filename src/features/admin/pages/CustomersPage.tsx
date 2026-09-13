// OPERATIONS / Customers.

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Download, Filter, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { customerRepository } from '../../customers/services/customerApiRepository';
import type { Customer as ApiCustomer, CustomerInput as ApiCustomerInput } from '../../customers/types/customer.types';
import { messageFor } from '../services/operations/helpers';
import { type Status, type Row, StatusPill } from '../components/adminShared';
import { AgentOptions } from '../components/backendOptions';

export type CustomerService = {
    id: string;
    type: 'Savings' | 'Recurring deposit' | 'Fixed deposit' | 'Loan';
    accountNumber: string;
    label: string;
    amount: string;
    detail: string;
    status: string;
};

export type CustomerTransaction = {
    id: string;
    type: 'Deposit collection' | 'RD installment' | 'Loan repayment' | 'Withdrawal' | 'Penalty';
    amount: string;
    date: string;
    agent: string;
    reference: string;
    status: string;
    paymentMethod?: string;
    externalReference?: string;
    location?: string;
    deviceReference?: string;
    offlineSyncReference?: string;
    narration?: string;
    supportingDocuments?: string;
};

export type CustomerRecord = Row & {
    address: string;
    customerType: 'Individual' | 'Cooperation' | 'Group' | 'SHG' | 'Organisation' | 'Minor' | 'Joint';
    nomineeName: string;
    nomineePhone: string;
    nomineeRelation: string;
    assignedAgent: string;
    registrationDate: string;
    services: CustomerService[];
    transactions: CustomerTransaction[];
};

export type CustomerInput = Pick<CustomerRecord, 'primary' | 'status' | 'address' | 'customerType' | 'nomineeName' | 'nomineePhone' | 'nomineeRelation' | 'assignedAgent' | 'registrationDate'> & { phone: string };

export function ScopedCustomerModal({ customer, onClose, onSave }: { customer?: CustomerRecord; onClose: () => void; onSave: (record: CustomerInput) => Promise<void> }) {
    const [name, setName] = useState(customer?.primary ?? '');
    const [phone, setPhone] = useState(customer?.secondary.split('·')[1]?.trim() ?? '');
    const [address, setAddress] = useState(customer?.address ?? '');
    const [customerType, setCustomerType] = useState<CustomerRecord['customerType']>(customer?.customerType ?? 'Individual');
    const [status, setStatus] = useState<Status>(customer?.status ?? 'Pending');
    const [nomineeName, setNomineeName] = useState(customer?.nomineeName ?? '');
    const [nomineePhone, setNomineePhone] = useState(customer?.nomineePhone ?? '');
    const [nomineeRelation, setNomineeRelation] = useState(customer?.nomineeRelation ?? '');
    const [assignedAgent, setAssignedAgent] = useState(customer?.assignedAgent ?? '');
    const [registrationDate, setRegistrationDate] = useState(customer?.registrationDate ?? '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault(); if (!name.trim() || !phone.trim() || !address.trim() || !nomineeName.trim() || !nomineePhone.trim() || !nomineeRelation.trim()) { setError('Name, mobile, address and complete nominee details are required.'); return; } await onSave({ primary: name.trim(), phone: phone.trim(), status, address: address.trim(), customerType, nomineeName: nomineeName.trim(), nomineePhone: nomineePhone.trim(), nomineeRelation: nomineeRelation.trim(), assignedAgent, registrationDate });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={customer ? 'Edit customer' : 'Add customer'}><div className="admin-modal-header"><div><div className="eyebrow">CUSTOMER WORKFLOW</div><h2>{customer ? 'Edit customer profile' : 'Add customer profile'}</h2><p>Capture the complete customer record required for account and collection operations.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" /></label><label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98XXXX0000" /></label><label>Customer type<select value={customerType} onChange={(event) => setCustomerType(event.target.value as CustomerRecord['customerType'])}><option>Individual</option><option>Cooperation</option><option>Group</option><option>SHG</option><option>Organisation</option><option>Minor</option><option>Joint</option></select></label><label>Account status / KYC (Aadhaar)<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="Pending">Pending</option><option value="Active">Verified / Active</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select></label><label>Registration date<input type="date" value={registrationDate} onChange={(event) => setRegistrationDate(event.target.value)} /></label><label>Assigned collection agent<select value={assignedAgent} onChange={(event) => setAssignedAgent(event.target.value)}><AgentOptions /><option>Unassigned</option></select></label><label className="full-field">Registered address<textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Complete customer address" /></label><div className="form-section-label full-field">Nominee details</div><label>Nominee name<input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} placeholder="Nominee full name" /></label><label>Nominee mobile<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} placeholder="Nominee mobile number" /></label><label>Relationship with nominee<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} placeholder="Spouse, parent, sibling..." /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : 'Save customer'}</button></div></form></section></div>;
}

export function ScopedCustomerDetail({ customer, onClose, onEdit, onToast }: { customer: CustomerRecord; onClose: () => void; onEdit: () => void; onToast: (message: string) => void }) {
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Customer ${customer.primary}`}><div className="admin-modal-header"><div><div className="eyebrow">CUSTOMER PROFILE / {customer.id}</div><h2>{customer.primary}</h2><p>Complete profile, active services and transaction history.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{customer.primary.split(' ').map((part) => part[0]).join('')}</div><div><strong>{customer.id}</strong><span>{customer.secondary} · Registered {customer.registrationDate}</span></div><StatusPill status={customer.status} /></div><div className="customer-detail-grid"><div><span>Customer type</span><strong>{customer.customerType}</strong></div><div><span>Assigned agent</span><strong>{customer.assignedAgent}</strong></div><div><span>Mobile number</span><strong>{customer.secondary.split('·')[1]?.trim()}</strong></div><div><span>Address</span><strong>{customer.address}</strong></div><div><span>Nominee</span><strong>{customer.nomineeName} · {customer.nomineeRelation}</strong></div><div><span>Nominee mobile</span><strong>{customer.nomineePhone}</strong></div><div><span>Total value</span><strong>{customer.value}</strong></div><div><span>Account status</span><strong>{customer.status}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Active accounts and services</h3><p>Deposit, RD, FD and loan services mapped to this customer.</p></div><span>{customer.services.length} services</span></div>{customer.services.length ? <div className="customer-service-list">{customer.services.map((service) => <div className="customer-service-row" key={service.id}><div><strong>{service.label}</strong><span>{service.type} · {service.accountNumber}</span></div><div><b>{service.amount}</b><small>{service.detail}</small></div><StatusPill status={service.status} /><button className="row-action" onClick={() => onToast(`${service.accountNumber} details opened locally.`)} aria-label={`Open ${service.accountNumber}`}><ChevronRight size={16} /></button></div>)}</div> : <p className="customer-empty">No active accounts or services mapped.</p>}</section><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Transaction history</h3><p>Customer-wise collection, repayment and withdrawal records.</p></div><span>{customer.transactions.length} transactions</span></div>{customer.transactions.length ? <div className="customer-transaction-list">{customer.transactions.map((transaction) => <div className="customer-transaction-row" key={transaction.id}><div><strong>{transaction.type}</strong><span>{transaction.id} · {transaction.date}</span></div><div><b>{transaction.amount}</b><small>{transaction.agent} · {transaction.reference}</small></div><StatusPill status={transaction.status} /></div>)}</div> : <p className="customer-empty">No transaction history available.</p>}</section><div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast(`Statement for ${customer.id} prepared locally.`)}><Download size={15} /> View / export statement</button><button className="primary-button" onClick={onEdit}>Edit customer</button></div></section></div>;
}

export function toCustomerRecord(customer: ApiCustomer): CustomerRecord {
    const phone = customer.phone || customer.alternatePhone;
    return {
        id: customer.id,
        primary: customer.name,
        secondary: `${customer.id} · ${phone}`,
        value: customer.value,
        meta: customer.accountSummary,
        status: customer.status,
        address: customer.address,
        customerType: customer.customerType,
        nomineeName: customer.nomineeName,
        nomineePhone: customer.nomineePhone,
        nomineeRelation: customer.nomineeRelation,
        assignedAgent: customer.assignedAgent,
        registrationDate: customer.registrationDate,
        services: customer.services,
        transactions: customer.transactions,
    };
}

export function toApiCustomerInput(input: CustomerInput): ApiCustomerInput {
    return {
        name: input.primary.trim(),
        phone: input.phone.trim(),
        email: '',
        alternatePhone: '',
        status: input.status as ApiCustomerInput['status'],
        address: input.address.trim(),
        permanentAddress: '',
        customerType: input.customerType,
        dateOfBirth: '',
        gender: '',
        occupation: '',
        businessType: '',
        taxIdentifier: '',
        identityType: '',
        identityReference: '',
        kycMethod: '',
        kycVerifiedOn: '',
        amlRiskCategory: '',
        sourceOfFunds: '',
        communicationPreference: '',
        branch: '',
        nomineeName: input.nomineeName.trim(),
        nomineePhone: input.nomineePhone.trim(),
        nomineeRelation: input.nomineeRelation.trim(),
        guardianName: '',
        guardianPhone: '',
        assignedAgent: input.assignedAgent,
        consentCaptured: false,
        documentReferences: '',
        registrationDate: input.registrationDate,
    };
}

export function ScopedCustomerPage() {
    const [customerRows, setCustomerRows] = useState<CustomerRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<CustomerRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const refresh = async () => {
        const records = await customerRepository.list();
        setCustomerRows(records.map(toCustomerRecord));
    };
    useEffect(() => {
        let active = true;
        customerRepository.list().then((records) => { if (active) setCustomerRows(records.map(toCustomerRecord)); }).catch((reason: unknown) => { if (active) notify(messageFor(reason, 'Unable to load customer records.')); });
        return () => { active = false; };
    }, []);
    const filteredRows = customerRows.filter((row) => `${row.id} ${row.primary} ${row.secondary} ${row.address} ${row.assignedAgent} ${row.services.map((service) => `${service.accountNumber} ${service.type}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const activeCount = customerRows.filter((row) => row.status === 'Active').length;
    const reviewCount = customerRows.filter((row) => row.status === 'Review' || row.status === 'Pending').length;
    const saveCustomer = async (input: CustomerInput) => {
        try {
            const payload = toApiCustomerInput(input);
            if (modal === 'edit' && selected) {
                await customerRepository.update(selected.id, payload);
                await refresh();
                close();
                notify('Customer profile updated.');
                return;
            }
            await customerRepository.create(payload);
            await refresh();
            setPage(1);
            close();
            notify('Customer profile created.');
        } catch (reason) {
            notify(messageFor(reason, 'Unable to save the customer profile.'));
        }
    };
    const openDetail = (customer: CustomerRecord) => { setSelected(customer); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / CUSTOMERS</div><h1>Customers</h1><p>Manage profiles, nominees, assigned agents, accounts, services and customer history.</p></div><button className="primary-button" onClick={() => setModal('add')}><Plus size={16} /> Add customer</button></div><div className="summary-strip"><div className="summary-item"><span>Total customers</span><strong>{customerRows.length}</strong></div><div className="summary-item"><span>Active customers</span><strong className="green">{activeCount}</strong></div><div className="summary-item"><span>New this month</span><strong>{customerRows.filter((row) => row.registrationDate.startsWith('2026-08')).length}</strong></div><div className="summary-item"><span>Needs review</span><strong className="orange">{reviewCount}</strong></div></div><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, ID, mobile, account or agent..." aria-label="Search customers" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter customers by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Date range selector is ready for local customer data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); notify('Showing customers requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} customer records prepared for export.`)} aria-label="Export customer data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Amount / Value</th><th>Accounts / Agent</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.primary}</strong><span>{row.secondary}</span><small>{row.address}</small></td><td className="table-amount">{row.value}</td><td className="table-muted"><strong>{row.services.length} services</strong><span>{row.assignedAgent}</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!visibleRows.length && <div className="customer-empty">No customers match the selected search and status filters.</div>}</div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} customers</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} className={`pagination-button ${page === number ? 'selected' : ''}`} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'add' && <ScopedCustomerModal onClose={close} onSave={saveCustomer} />}{modal === 'edit' && selected && <ScopedCustomerModal customer={selected} onClose={close} onSave={saveCustomer} />}{modal === 'detail' && selected && <ScopedCustomerDetail customer={selected} onClose={close} onEdit={() => setModal('edit')} onToast={notify} />}{toast && <div className="admin-toast" role="status">{toast}</div>}</div>;
}
