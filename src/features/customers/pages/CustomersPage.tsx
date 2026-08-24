import { useMemo, useState } from 'react';
import { CalendarDays, Download, Plus, SlidersHorizontal } from 'lucide-react';
import { can, adminPermissions } from '../../../lib/permissions/permissions';
import { Toast, useToast } from '../../../components/feedback/Toast';
import { CustomerDetailModal } from '../components/CustomerDetailModal';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { CustomerTable } from '../components/CustomerTable';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer, CustomerInput, Status } from '../types/customer.types';

const pageSize = 4;

export function CustomersPage() {
    const { customers, loading, error, create, update } = useCustomers();
    const { message, notify } = useToast();
    const canWrite = can(adminPermissions, 'customers.write');
    const canExport = can(adminPermissions, 'customers.export');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<Customer>();

    const filtered = useMemo(() => customers.filter((customer) => {
        const serviceSearch = customer.services
            .map((service) => `${service.accountNumber} ${service.type}`)
            .join(' ');
        const haystack = `${customer.id} ${customer.name} ${customer.phone} ${customer.address} ${customer.assignedAgent} ${serviceSearch}`.toLowerCase();
        return haystack.includes(search.toLowerCase()) && (status === 'All' || customer.status === status);
    }), [customers, search, status]);
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    const close = () => { setModal(null); setSelected(undefined); };
    const save = async (input: CustomerInput) => {
        if (modal === 'edit' && selected) {
            await update(selected.id, input);
            notify('Customer profile updated locally.');
        } else {
            await create(input);
            setPage(1);
            notify('Customer profile created locally.');
        }
        close();
    };
    const chooseStatus = (value: 'All' | Status) => { setStatus(value); setPage(1); };

    return <div className="admin-page">
        <div className="page-heading"><div><div className="eyebrow">OPERATIONS / CUSTOMERS</div><h1>Customers</h1><p>Manage profiles, nominees, assigned agents, accounts, services and customer history.</p></div>{canWrite && <button className="primary-button" onClick={() => setModal('add')}><Plus size={16} /> Add customer</button>}</div>
        <div className="summary-strip"><div className="summary-item"><span>Total customers</span><strong>{customers.length}</strong></div><div className="summary-item"><span>Active customers</span><strong className="green">{customers.filter((customer) => customer.status === 'Active').length}</strong></div><div className="summary-item"><span>New this month</span><strong>{customers.filter((customer) => customer.registrationDate.startsWith('2026-08')).length}</strong></div><div className="summary-item"><span>Needs review</span><strong className="orange">{customers.filter((customer) => customer.status === 'Review' || customer.status === 'Pending').length}</strong></div></div>
        <section className="panel table-panel">
            <div className="filter-bar"><div className="filter-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, ID, mobile, account or agent..." aria-label="Search customers" /></div><select className="filter-button customer-status-filter" value={status} onChange={(event) => chooseStatus(event.target.value as 'All' | Status)} aria-label="Filter customers by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Date range selector is ready for local customer data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { chooseStatus('Review'); notify('Showing customers requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button>{canExport && <button className="icon-button export-button" onClick={() => notify(`${filtered.length} customer records prepared for export.`)} aria-label="Export customer data"><Download size={16} /></button>}</div>
            {loading ? <div className="empty-state"><strong>Loading customer records</strong><span>Preparing the local repository view.</span></div> : error ? <div className="empty-state"><strong>{error}</strong><span>Refresh the page to retry the local repository.</span></div> : <CustomerTable rows={visible} onDetail={(customer) => { setSelected(customer); setModal('detail'); }} onEdit={canWrite ? (customer) => { setSelected(customer); setModal('edit'); } : undefined} />}
            <div className="pagination"><span>Showing {visible.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button className="secondary-button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><button className="secondary-button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
        </section>
        {modal === 'add' && <CustomerFormModal onClose={close} onSave={save} />}
        {modal === 'edit' && canWrite && selected && <CustomerFormModal customer={selected} onClose={close} onSave={save} />}
        {modal === 'detail' && selected && <CustomerDetailModal customer={selected} onClose={close} onEdit={() => setModal('edit')} onToast={notify} />}
        <Toast message={message} />
    </div>;
}
