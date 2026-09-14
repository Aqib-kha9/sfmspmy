import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, Plus, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Toast, useToast } from '../../../components/feedback/Toast';
import { CustomerDetailModal } from '../components/CustomerDetailModal';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { CustomerStatementModal } from '../components/CustomerStatementModal';
import { CustomerTable } from '../components/CustomerTable';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer, CustomerInput, CustomerType, Status } from '../types/customer.types';

const pageSize = 25;

/** Membership categories accepted by `GET /customers?membershipCategory=`. */
type AccountTypeFilter = 'All' | 'Savings' | 'Daily' | 'RD' | 'Current' | 'Loan';

const accountTypeOptions: AccountTypeFilter[] = ['All', 'Savings', 'Daily', 'RD', 'Current', 'Loan'];
const accountTypeLabels: Record<AccountTypeFilter, string> = {
    All: 'All account types',
    Savings: 'Savings / Deposit',
    Daily: 'Daily deposit',
    RD: 'Recurring deposit (RD)',
    Current: 'Current account',
    Loan: 'Loan',
};

const customerTypeOptions: CustomerType[] = ['Individual', 'Cooperation', 'Group', 'SHG', 'Organisation', 'Minor', 'Joint'];

/** Debounces a fast-changing value (the search box) to limit server calls. */
function useDebounced<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

export function CustomersPage() {
    const { can } = useAuth();
    const canWrite = can('customers.write');
    const canExport = can('customers.export');
    const { message, notify } = useToast();

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounced(search, 350);
    const [status, setStatus] = useState<Status | 'All'>('All');
    const [accountType, setAccountType] = useState<AccountTypeFilter>('All');
    const [customerId, setCustomerId] = useState('');
    const [customerType, setCustomerType] = useState<CustomerType | 'All'>('All');
    const [registeredFrom, setRegisteredFrom] = useState('');
    const [registeredTo, setRegisteredTo] = useState('');
    const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);
    const [showDateRange, setShowDateRange] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | 'statement' | null>(null);
    const [selected, setSelected] = useState<Customer>();

    // Every control maps to a validated backend query parameter, so filtering
    // and pagination run in the database instead of over one client-side page.
    const query = useMemo(() => ({
        search: debouncedSearch.trim() || undefined,
        status,
        membershipCategory: accountType,
        customerType,
        customerId: customerId || undefined,
        registeredFrom: appliedRange?.from || undefined,
        registeredTo: appliedRange?.to || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
    }), [debouncedSearch, status, accountType, customerType, customerId, appliedRange, page]);

    const { customers, total, options, stats, loading, error, exportCsv, statement, create, update } = useCustomers(query);

    const pages = Math.max(1, Math.ceil(total / pageSize));
    const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const showingTo = Math.min(page * pageSize, total);
    const filtersActive = Boolean(debouncedSearch.trim()) || status !== 'All' || accountType !== 'All' || customerType !== 'All' || Boolean(customerId) || Boolean(appliedRange);

    const close = () => { setModal(null); setSelected(undefined); };
    const chooseStatus = (value: Status | 'All') => { setStatus(value); setPage(1); };
    const chooseAccountType = (value: AccountTypeFilter) => { setAccountType(value); setCustomerId(''); setPage(1); };
    const chooseCustomerType = (value: CustomerType | 'All') => { setCustomerType(value); setPage(1); };
    const chooseCustomer = (value: string) => {
        setCustomerId(value);
        setPage(1);
        const match = options.find((option) => option.id === value);
        if (match) notify(`Showing ${match.name} · ${match.customerNumber}`);
    };
    const applyRange = () => {
        if (registeredFrom && registeredTo && registeredFrom > registeredTo) {
            notify('Start date must be on or before the end date.');
            return;
        }
        setAppliedRange(registeredFrom || registeredTo ? { from: registeredFrom, to: registeredTo } : null);
        setShowDateRange(false);
        setPage(1);
    };
    const clearRange = () => { setRegisteredFrom(''); setRegisteredTo(''); setAppliedRange(null); setShowDateRange(false); setPage(1); };
    const clearAllFilters = () => {
        setSearch(''); setStatus('All'); setAccountType('All'); setCustomerType('All'); setCustomerId('');
        setRegisteredFrom(''); setRegisteredTo(''); setAppliedRange(null); setShowFilters(false); setShowDateRange(false);
        setPage(1);
    };

    const save = async (input: CustomerInput) => {
        try {
            if (modal === 'edit' && selected) {
                await update(selected.id, input);
                notify('Customer profile updated on the server.');
            } else {
                await create(input);
                setPage(1);
                notify('Customer profile created on the server.');
            }
            close();
        } catch (reason) {
            // Rethrow so the Add/Edit modal can render the server's message inline
            // (e.g. a 409 duplicate-mobile / duplicate-identity conflict that names
            // the existing customer). Notifying here as well would show it twice.
            throw reason instanceof Error ? reason : new Error('Unable to save the customer profile.');
        }
    };

    const downloadCsv = async () => {
        if (!canExport || exporting) return;
        setExporting(true);
        try {
            const csv = await exportCsv();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            notify('Customer export downloaded as CSV.');
        } catch (reason) {
            notify(reason instanceof Error ? reason.message : 'Unable to export customer records.');
        } finally {
            setExporting(false);
        }
    };

    return <div className="admin-page">
        <div className="page-heading"><div><div className="eyebrow">OPERATIONS / CUSTOMERS</div><h1>Customers</h1><p>Manage profiles, nominees, assigned agents, accounts, services and customer history.</p></div>{canWrite && <button className="primary-button" onClick={() => setModal('add')}><Plus size={16} /> Add customer</button>}</div>
        <div className="summary-strip"><div className="summary-item"><span>Total customers</span><strong>{stats.total}</strong></div><div className="summary-item"><span>Active customers</span><strong className="green">{stats.active}</strong></div><div className="summary-item"><span>New this month</span><strong>{stats.registeredThisMonth}</strong></div><div className="summary-item"><span>Needs review</span><strong className="orange">{stats.needsReview}</strong></div></div>
        <section className="panel table-panel">
            <div className="filter-bar">
                <div className="filter-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, ID, mobile, account or agent..." aria-label="Search customers" /></div>
                <select className="filter-button customer-status-filter" value={accountType} onChange={(event) => chooseAccountType(event.target.value as AccountTypeFilter)} aria-label="Filter customers by account type">{accountTypeOptions.map((option) => <option key={option} value={option}>{accountTypeLabels[option]}</option>)}</select>
                <select className="filter-button customer-status-filter" value={customerId} onChange={(event) => chooseCustomer(event.target.value)} aria-label="Filter customers by customer name"><option value="">All customer names</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.customerNumber}</option>)}</select>
                <select className="filter-button customer-status-filter" value={status} onChange={(event) => chooseStatus(event.target.value as Status | 'All')} aria-label="Filter customers by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select>
                <div className="filter-popover">
                    <button type="button" className={`filter-button${appliedRange ? ' active' : ''}`} aria-expanded={showDateRange} onClick={() => { setShowDateRange((open) => !open); setShowFilters(false); }}><CalendarDays size={15} /> Date range</button>
                    {showDateRange && <div className="filter-panel" role="dialog" aria-label="Date range">
                        <label className="filter-field"><span>Registered from</span><input type="date" value={registeredFrom} max={registeredTo || undefined} onChange={(event) => setRegisteredFrom(event.target.value)} /></label>
                        <label className="filter-field"><span>Registered to</span><input type="date" value={registeredTo} min={registeredFrom || undefined} onChange={(event) => setRegisteredTo(event.target.value)} /></label>
                        <div className="filter-panel-actions"><button type="button" className="secondary-button" onClick={clearRange}>Clear</button><button type="button" className="primary-button" onClick={applyRange}>Apply</button></div>
                    </div>}
                </div>
                <div className="filter-popover">
                    <button type="button" className={`filter-button${filtersActive ? ' active' : ''}`} aria-expanded={showFilters} onClick={() => { setShowFilters((open) => !open); setShowDateRange(false); }}><SlidersHorizontal size={15} /> Filters</button>
                    {showFilters && <div className="filter-panel" role="dialog" aria-label="Advanced filters">
                        <label className="filter-field"><span>Customer type</span><select value={customerType} onChange={(event) => chooseCustomerType(event.target.value as CustomerType | 'All')}><option value="All">All types</option>{customerTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                        <div className="filter-quick"><span>Quick filters</span><div className="filter-chips">
                            <button type="button" className={`filter-chip${status === 'Review' ? ' active' : ''}`} onClick={() => chooseStatus(status === 'Review' ? 'All' : 'Review')}>Needs review</button>
                            <button type="button" className={`filter-chip${status === 'Active' ? ' active' : ''}`} onClick={() => chooseStatus(status === 'Active' ? 'All' : 'Active')}>Active only</button>
                            <button type="button" className={`filter-chip${accountType === 'Loan' ? ' active' : ''}`} onClick={() => chooseAccountType(accountType === 'Loan' ? 'All' : 'Loan')}>Loan accounts</button>
                        </div></div>
                        <div className="filter-panel-actions"><button type="button" className="secondary-button" onClick={clearAllFilters}>Clear all</button></div>
                    </div>}
                </div>
                {canExport && <button type="button" className="icon-button export-button" onClick={() => void downloadCsv()} disabled={exporting} aria-label="Export customer data" title="Export filtered customers (CSV)"><Download size={16} /></button>}
            </div>
            {loading && customers.length === 0 ? <div className="empty-state"><strong>Loading customer records</strong><span>Fetching customers from the server.</span></div>
                : error ? <div className="empty-state"><strong>{error}</strong><span>Refresh the page to retry the server request.</span></div>
                    : customers.length === 0 ? <div className="empty-state"><strong>No customers match these filters</strong><span>{filtersActive ? 'Adjust or clear the filters to widen the search.' : 'Register a customer to see it listed here.'}</span></div>
                        : <CustomerTable rows={customers} onDetail={(customer) => { setSelected(customer); setModal('detail'); }} onEdit={canWrite ? (customer) => { setSelected(customer); setModal('edit'); } : undefined} />}
            <div className="pagination"><span>Showing {showingFrom}–{showingTo} of {total}</span><div><button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button type="button" className="secondary-button" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))}>Next</button></div></div>
        </section>
        {modal === 'add' && <CustomerFormModal onClose={close} onSave={save} />}
        {modal === 'edit' && canWrite && selected && <CustomerFormModal customer={selected} onClose={close} onSave={save} />}
        {modal === 'detail' && selected && <CustomerDetailModal customer={selected} onClose={close} onEdit={() => setModal('edit')} onViewStatement={() => setModal('statement')} />}
        {modal === 'statement' && selected && <CustomerStatementModal customerId={selected.systemId} customerName={selected.name} onClose={() => setModal('detail')} loadStatement={statement} />}
        <Toast message={message} />
    </div>;
}
