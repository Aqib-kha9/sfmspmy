// OPERATIONS / Collection agents.

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, Download, Filter, Loader2, Search, ShieldCheck, SlidersHorizontal, UserPlus } from 'lucide-react';
import { customerRepository } from '../../customers/services/customerApiRepository';
import { agentsRepository } from '../services/operations/agentsApiRepository';
import { messageFor } from '../services/operations/helpers';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';
import { type CustomerRecord, toCustomerRecord } from './CustomersPage';

export type AgentEvent = {
    id: string;
    type: string;
    date: string;
    performedBy: string;
    note: string;
};

export type AgentRecord = {
    id: string;
    name: string;
    phone: string;
    email: string;
    employeeCode: string;
    role: 'Collection Agent' | 'Senior Collection Agent';
    status: Status;
    accessStatus: 'Enabled' | 'Locked' | 'Pending invitation';
    route: string;
    joinedOn: string;
    assignedCustomerIds: string[];
    branch?: string;
    supervisor?: string;
    identityReference?: string;
    employmentDocumentReferences?: string;
    emergencyContact?: string;
    registeredDevice?: string;
    appVersion?: string;
    lastKnownLocation?: string;
    routeEffectiveFrom?: string;
    routeEffectiveTo?: string;
    assignmentEffectiveFrom?: string;
    assignmentEffectiveTo?: string;
    collectionLimit?: string;
    cashHoldingLimit?: string;
    invitationReference?: string;
    mfaPinStatus?: string;
    deactivationReason?: string;
    todayCollected: number;
    pendingAmount: number;
    transactionCount: number;
    syncStatus: 'Synced' | 'Pending sync' | 'Failed sync';
    lastSync: string;
    events: AgentEvent[];
};

export type AgentInput = Omit<AgentRecord, 'id' | 'todayCollected' | 'pendingAmount' | 'transactionCount' | 'syncStatus' | 'lastSync' | 'events'>;

export function AgentModal({ mode, record, onClose, onSave }: { mode: 'add' | 'edit'; record?: AgentRecord; onClose: () => void; onSave: (input: AgentInput) => Promise<void> }) {
    const [name, setName] = useState(record?.name ?? ''); const [phone, setPhone] = useState(record?.phone ?? ''); const [email, setEmail] = useState(record?.email ?? ''); const [employeeCode, setEmployeeCode] = useState(record?.employeeCode ?? ''); const [role, setRole] = useState<AgentRecord['role']>(record?.role ?? 'Collection Agent'); const [status, setStatus] = useState<Status>(record?.status ?? 'Active'); const [accessStatus, setAccessStatus] = useState<AgentRecord['accessStatus']>(record?.accessStatus ?? 'Enabled'); const [route, setRoute] = useState(record?.route ?? ''); const [joinedOn, setJoinedOn] = useState(record?.joinedOn ?? ''); const [assignedCustomerIds, setAssignedCustomerIds] = useState(record?.assignedCustomerIds ?? []); const [branch, setBranch] = useState(record?.branch ?? ''); const [supervisor, setSupervisor] = useState(record?.supervisor ?? ''); const [identityReference, setIdentityReference] = useState(record?.identityReference ?? ''); const [employmentDocumentReferences, setEmploymentDocumentReferences] = useState(record?.employmentDocumentReferences ?? ''); const [emergencyContact, setEmergencyContact] = useState(record?.emergencyContact ?? ''); const [registeredDevice, setRegisteredDevice] = useState(record?.registeredDevice ?? ''); const [appVersion, setAppVersion] = useState(record?.appVersion ?? ''); const [lastKnownLocation, setLastKnownLocation] = useState(record?.lastKnownLocation ?? ''); const [routeEffectiveFrom, setRouteEffectiveFrom] = useState(record?.routeEffectiveFrom ?? ''); const [routeEffectiveTo, setRouteEffectiveTo] = useState(record?.routeEffectiveTo ?? ''); const [assignmentEffectiveFrom, setAssignmentEffectiveFrom] = useState(record?.assignmentEffectiveFrom ?? ''); const [assignmentEffectiveTo, setAssignmentEffectiveTo] = useState(record?.assignmentEffectiveTo ?? ''); const [collectionLimit, setCollectionLimit] = useState(record?.collectionLimit ?? ''); const [cashHoldingLimit, setCashHoldingLimit] = useState(record?.cashHoldingLimit ?? ''); const [invitationReference, setInvitationReference] = useState(record?.invitationReference ?? ''); const [mfaPinStatus, setMfaPinStatus] = useState(record?.mfaPinStatus ?? ''); const [deactivationReason, setDeactivationReason] = useState(record?.deactivationReason ?? ''); const [error, setError] = useState('');
    const [availableCustomers, setAvailableCustomers] = useState<CustomerRecord[]>([]);
    useEffect(() => {
        let active = true;
        customerRepository.list()
            .then((records) => { if (active) setAvailableCustomers(records.map(toCustomerRecord)); })
            .catch(() => { if (active) setAvailableCustomers([]); });
        return () => { active = false; };
    }, []);
    const toggleCustomer = (id: string) => setAssignedCustomerIds((current) => current.includes(id) ? current.filter((customerId) => customerId !== id) : [...current, id]);
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault(); if (!name.trim() || !phone.trim() || !email.trim() || !employeeCode.trim() || !route.trim() || !joinedOn) { setError('Name, mobile, email, employee code, route and joining date are required.'); return; } await onSave({ name: name.trim(), phone: phone.trim(), email: email.trim(), employeeCode: employeeCode.trim(), role, status, accessStatus, route: route.trim(), joinedOn, assignedCustomerIds, branch: branch.trim(), supervisor: supervisor.trim(), identityReference: identityReference.trim(), employmentDocumentReferences: employmentDocumentReferences.trim(), emergencyContact: emergencyContact.trim(), registeredDevice: registeredDevice.trim(), appVersion: appVersion.trim(), lastKnownLocation: lastKnownLocation.trim(), routeEffectiveFrom, routeEffectiveTo, assignmentEffectiveFrom, assignmentEffectiveTo, collectionLimit: collectionLimit.trim(), cashHoldingLimit: cashHoldingLimit.trim(), invitationReference: invitationReference.trim(), mfaPinStatus: mfaPinStatus.trim(), deactivationReason: deactivationReason.trim() });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'add' ? 'Add collection agent' : 'Edit collection agent'}><div className="admin-modal-header"><div><div className="eyebrow">AGENT ACCESS WORKFLOW</div><h2>{mode === 'add' ? 'Add collection agent' : `Edit ${record?.name}`}</h2><p>Maintain identity, controlled mobile access, route ownership and customer assignments.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Agent name" /></label><label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98XXXX0000" /></label><label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="agent@savitribaipatsanstha.coop" /></label><label>Employee code<input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} placeholder="EMP-1901" /></label><label>Agent role<select value={role} onChange={(event) => setRole(event.target.value as AgentRecord['role'])}><option>Collection Agent</option><option>Senior Collection Agent</option></select></label><label>Account status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Review">Needs review</option><option value="Pending">Pending approval</option></select></label><label>Mobile application access<select value={accessStatus} onChange={(event) => setAccessStatus(event.target.value as AgentRecord['accessStatus'])}><option>Enabled</option><option>Locked</option><option>Pending invitation</option></select></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Branch" /></label><label>Supervisor<input value={supervisor} onChange={(event) => setSupervisor(event.target.value)} placeholder="Supervisor" /></label><label>Route / area<input value={route} onChange={(event) => setRoute(event.target.value)} placeholder="Waghapur Tekdi route" /></label><label>Joining date<input type="date" value={joinedOn} onChange={(event) => setJoinedOn(event.target.value)} /></label><label>Identity reference<input value={identityReference} onChange={(event) => setIdentityReference(event.target.value)} placeholder="Identity verification reference" /></label><label>Emergency contact<input value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} placeholder="Name and phone" /></label><label>Registered device<input value={registeredDevice} onChange={(event) => setRegisteredDevice(event.target.value)} placeholder="Device identifier" /></label><label>App version<input value={appVersion} onChange={(event) => setAppVersion(event.target.value)} placeholder="Mobile app version" /></label><label>Last known location<input value={lastKnownLocation} onChange={(event) => setLastKnownLocation(event.target.value)} placeholder="Last location reference" /></label><label>Route effective from<input type="date" value={routeEffectiveFrom} onChange={(event) => setRouteEffectiveFrom(event.target.value)} /></label><label>Route effective to<input type="date" value={routeEffectiveTo} onChange={(event) => setRouteEffectiveTo(event.target.value)} /></label><label>Assignment effective from<input type="date" value={assignmentEffectiveFrom} onChange={(event) => setAssignmentEffectiveFrom(event.target.value)} /></label><label>Assignment effective to<input type="date" value={assignmentEffectiveTo} onChange={(event) => setAssignmentEffectiveTo(event.target.value)} /></label><label>Collection limit<input value={collectionLimit} onChange={(event) => setCollectionLimit(event.target.value)} placeholder="Configured limit" /></label><label>Cash holding limit<input value={cashHoldingLimit} onChange={(event) => setCashHoldingLimit(event.target.value)} placeholder="Configured limit" /></label><label>Invitation reference<input value={invitationReference} onChange={(event) => setInvitationReference(event.target.value)} placeholder="Invitation reference" /></label><label>MFA / PIN status<input value={mfaPinStatus} onChange={(event) => setMfaPinStatus(event.target.value)} placeholder="Enrollment or PIN status" /></label><label className="full-field">Employment document references<textarea value={employmentDocumentReferences} onChange={(event) => setEmploymentDocumentReferences(event.target.value)} placeholder="Employment and verification documents" /></label><label className="full-field">Deactivation reason<textarea value={deactivationReason} onChange={(event) => setDeactivationReason(event.target.value)} placeholder="Capture when applicable" /></label><div className="full-field"><span className="field-label">Assigned customers</span><div className="agent-assignment-list">{availableCustomers.map((customer) => <label key={customer.id} className="checkbox-row"><input type="checkbox" checked={assignedCustomerIds.includes(customer.id)} onChange={() => toggleCustomer(customer.id)} />{customer.primary} · {customer.id}</label>)}</div></div>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : 'Save agent locally'}</button></div></form></section></div>;
}

export function AgentDetail({ agent, onClose, onEdit, onToggle, onToast }: { agent: AgentRecord; onClose: () => void; onEdit: () => void; onToggle: () => void; onToast: (message: string) => void }) {
    const [assignedCustomers, setAssignedCustomers] = useState<CustomerRecord[]>([]);
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const agentId = await agentsRepository.resolveAgentUuid(agent.id);
                const records = await customerRepository.list({ agentId });
                if (active) setAssignedCustomers(records.map(toCustomerRecord));
            } catch {
                if (active) setAssignedCustomers([]);
            }
        })();
        return () => { active = false; };
    }, [agent.id]);
    const metadata = [['Branch', agent.branch], ['Supervisor', agent.supervisor], ['Identity reference', agent.identityReference], ['Employment documents', agent.employmentDocumentReferences], ['Emergency contact', agent.emergencyContact], ['Registered device', agent.registeredDevice], ['App version', agent.appVersion], ['Last known location', agent.lastKnownLocation], ['Route effective period', `${agent.routeEffectiveFrom || 'Not captured'} to ${agent.routeEffectiveTo || 'Not captured'}`], ['Assignment effective period', `${agent.assignmentEffectiveFrom || 'Not captured'} to ${agent.assignmentEffectiveTo || 'Not captured'}`], ['Collection limit', agent.collectionLimit], ['Cash holding limit', agent.cashHoldingLimit], ['Invitation reference', agent.invitationReference], ['MFA / PIN status', agent.mfaPinStatus], ['Deactivation reason', agent.deactivationReason]] as const;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Agent ${agent.name}`}><div className="admin-modal-header"><div><div className="eyebrow">COLLECTION AGENT / {agent.id}</div><h2>{agent.name}</h2><p>{agent.employeeCode} · {agent.role} · {agent.route}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{agent.name.split(' ').map((part) => part[0]).join('')}</div><div><strong>{agent.phone}</strong><span>{agent.email} · Joined {agent.joinedOn}</span></div><StatusPill status={agent.status} /></div><div className="customer-detail-grid"><div><span>Mobile access</span><strong>{agent.accessStatus}</strong></div><div><span>Today's collection</span><strong className="green-text">₹{agent.todayCollected.toLocaleString('en-IN')}</strong></div><div><span>Pending collection</span><strong className="orange-text">₹{agent.pendingAmount.toLocaleString('en-IN')}</strong></div><div><span>Transactions today</span><strong>{agent.transactionCount}</strong></div><div><span>Sync status</span><strong>{agent.syncStatus}</strong></div><div><span>Last synchronization</span><strong>{agent.lastSync}</strong></div><div><span>Assigned customers</span><strong>{agent.assignedCustomerIds.length}</strong></div>{metadata.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not captured'}</strong></div>)}</div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Assigned customers</h3><p>Customers available to this agent in the mobile application.</p></div><span>{assignedCustomers.length} customers</span></div><div className="agent-customer-list">{assignedCustomers.length ? assignedCustomers.map((customer) => <div className="customer-transaction-row" key={customer.id}><div><strong>{customer.primary}</strong><span>{customer.id} · {customer.secondary}</span></div><div><b>{customer.assignedAgent}</b><small>{customer.status}</small></div></div>) : <p className="empty-state">No customer assignments captured.</p>}</div></section><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Agent history</h3><p>Operational access and collection events captured locally for review.</p></div><span>{agent.events.length} events</span></div><div className="customer-transaction-list">{agent.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.performedBy}</span></div><small>{event.note}</small></div>)}</div></section><div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast('Agent collection statement prepared locally.')}>View statement</button><button className="secondary-button" onClick={onEdit}>Edit agent</button><button className="primary-button" onClick={onToggle}><ShieldCheck size={15} /> {agent.status === 'Active' ? 'Deactivate locally' : 'Activate locally'}</button></div></section></div>;
}

export function ScopedAgentsPage() {
    const [agentRows, setAgentRows] = useState<AgentRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [accessFilter, setAccessFilter] = useState<'All' | AgentRecord['accessStatus']>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<AgentRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const refresh = async () => {
        try {
            const rows = await agentsRepository.list({ search, status: statusFilter, accessStatus: accessFilter });
            setAgentRows(rows);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to load collection agents.'));
        }
    };
    useEffect(() => {
        let active = true;
        agentsRepository.list()
            .then((rows) => { if (active) setAgentRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load collection agents.')); });
        return () => { active = false; };
    }, []);
    const filteredRows = agentRows.filter((agent) => `${agent.id} ${agent.name} ${agent.phone} ${agent.email} ${agent.employeeCode} ${agent.role} ${agent.route} ${agent.syncStatus}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || agent.status === statusFilter) && (accessFilter === 'All' || agent.accessStatus === accessFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const saveAgent = async (input: AgentInput) => {
        try {
            if (modal === 'edit' && selected) {
                await agentsRepository.update(selected.id, input);
                close();
                notify('Agent profile, access and assignments updated.');
            } else {
                await agentsRepository.create(input);
                setPage(1);
                close();
                notify('Collection agent onboarded.');
            }
            await refresh();
        } catch (reason) {
            notify(messageFor(reason, 'Unable to save the collection agent.'));
        }
    };
    const toggleAgent = async (agent: AgentRecord) => {
        const nextStatus: Status = agent.status === 'Active' ? 'Inactive' : 'Active';
        try {
            await agentsRepository.setActive(agent.id, nextStatus === 'Active');
            close();
            await refresh();
            notify(`${agent.name} ${nextStatus === 'Active' ? 'activated' : 'deactivated'}.`);
        } catch (reason) {
            notify(messageFor(reason, `Unable to update ${agent.name}.`));
        }
    };
    const openDetail = async (agent: AgentRecord) => {
        setSelected(agent);
        setModal('detail');
        try {
            const agentId = await agentsRepository.resolveAgentUuid(agent.id);
            const records = await customerRepository.list({ agentId });
            setSelected({ ...agent, assignedCustomerIds: records.map((record) => record.id) });
        } catch {
            /* Assigned-customer summary stays empty when the lookup fails. */
        }
    };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / COLLECTION AGENTS</div><h1>Collection Agents</h1><p>Manage agent identity, controlled mobile access, customer assignments and collection performance.</p></div><button className="primary-button" onClick={() => setModal('add')}><UserPlus size={16} /> Add collection agent</button></div><SummaryStrip items={[{ label: 'Active agents', value: String(agentRows.filter((agent) => agent.status === 'Active').length), tone: 'green' }, { label: 'On route today', value: String(agentRows.filter((agent) => agent.status === 'Active' && agent.assignedCustomerIds.length > 0).length) }, { label: 'Pending sync', value: String(agentRows.filter((agent) => agent.syncStatus !== 'Synced').length), tone: 'orange' }, { label: 'Pending collections', value: `₹${agentRows.reduce((total, agent) => total + agent.pendingAmount, 0).toLocaleString('en-IN')}`, tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search agent, employee code, route or sync status..." aria-label="Search collection agents" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter agents by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Review">Needs review</option><option value="Pending">Pending approval</option></select><select className="filter-button customer-status-filter" value={accessFilter} onChange={(event) => { setAccessFilter(event.target.value as typeof accessFilter); setPage(1); }} aria-label="Filter agents by mobile access"><option value="All">All access states</option><option>Enabled</option><option>Locked</option><option>Pending invitation</option></select><button className="filter-button" onClick={() => notify('Daily collection date range is ready for local agent data.')}><CalendarDays size={15} /> Daily collections</button><button className="filter-button" onClick={() => { setAccessFilter('Pending invitation'); setPage(1); notify('Showing agents with pending mobile access.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} agent records prepared for export.`)} aria-label="Export agent data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table agent-table"><thead><tr><th>Agent</th><th>Role / Route</th><th>Assigned customers</th><th>Today's collection</th><th>Pending</th><th>Access / Sync</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((agent) => <tr key={agent.id}><td><strong>{agent.name}</strong><span>{agent.id} · {agent.employeeCode}</span><small>{agent.phone}</small></td><td><strong>{agent.role}</strong><span>{agent.route}</span></td><td><strong>{agent.assignedCustomerIds.length}</strong><span>{agent.transactionCount} transactions today</span></td><td className="collection-amount">₹{agent.todayCollected.toLocaleString('en-IN')}</td><td className="orange-text">₹{agent.pendingAmount.toLocaleString('en-IN')}</td><td><span className="agent-access-state">{agent.accessStatus}</span><small>{agent.syncStatus}</small></td><td><StatusPill status={agent.status} /></td><td><button className="row-action" onClick={() => openDetail(agent)} aria-label={`Open ${agent.name}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!visibleRows.length && <div className="empty-state"><strong>No agents match these filters</strong><span>Adjust search or access filters to view more records.</span></div>}</div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} agents</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button className={`pagination-button ${page === number ? 'selected' : ''}`} key={number} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}{modal === 'add' && <AgentModal mode="add" onClose={close} onSave={saveAgent} />}{modal === 'edit' && selected && <AgentModal mode="edit" record={selected} onClose={close} onSave={saveAgent} />}{modal === 'detail' && selected && <AgentDetail agent={selected} onClose={close} onEdit={() => setModal('edit')} onToggle={() => toggleAgent(selected)} onToast={notify} />}</div>;
}
