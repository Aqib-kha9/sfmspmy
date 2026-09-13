// OPERATIONS / Doorstep collections.

import { FormEvent, useEffect, useState } from 'react';
import { ArrowDownToLine, CalendarDays, CheckCircle2, ChevronRight, Download, Filter, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { collectionsRepository } from '../services/operations/collectionsApiRepository';
import { messageFor } from '../services/operations/helpers';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';
import { AgentOptions } from '../components/backendOptions';

export type CollectionRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    accountId: string;
    collectionType: 'Daily collection' | 'RD installment' | 'Loan repayment' | 'Penalty' | 'Other collection';
    amount: number;
    collectedOn: string;
    agent: string;
    channel: 'Doorstep' | 'Branch counter' | 'Mobile app';
    reference: string;
    remarks: string;
    status: Status;
    syncStatus: 'Synced' | 'Pending sync' | 'Failed sync';
    paymentMethod?: string;
    externalReference?: string;
    receiptStatus?: string;
    location?: string;
    deviceReference?: string;
    offlineSyncReference?: string;
    principalAllocation?: string;
    interestAllocation?: string;
    penaltyAllocation?: string;
    collectionBatchReference?: string;
    routeEvidence?: string;
    supportingDocuments?: string;
    customerAcknowledgementReference?: string;
    events: Array<{ id: string; type: string; date: string; performedBy: string; note: string }>;
};

export type CollectionInput = Pick<CollectionRecord, 'customerId' | 'accountId' | 'collectionType' | 'amount' | 'collectedOn' | 'agent' | 'channel' | 'reference' | 'remarks'> & Partial<Pick<CollectionRecord, 'paymentMethod' | 'externalReference' | 'receiptStatus' | 'location' | 'deviceReference' | 'offlineSyncReference' | 'principalAllocation' | 'interestAllocation' | 'penaltyAllocation' | 'collectionBatchReference' | 'routeEvidence' | 'supportingDocuments' | 'customerAcknowledgementReference'>>;

export function CollectionModal({ onClose, onSave }: { onClose: () => void; onSave: (input: CollectionInput) => Promise<void> }) {
    const [customerId, setCustomerId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [collectionType, setCollectionType] = useState<CollectionRecord['collectionType']>('RD installment');
    const [amount, setAmount] = useState('');
    const [collectedOn, setCollectedOn] = useState('');
    const [agent, setAgent] = useState('');
    const [channel, setChannel] = useState<CollectionRecord['channel']>('Doorstep');
    const [reference, setReference] = useState('');
    const [remarks, setRemarks] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [externalReference, setExternalReference] = useState('');
    const [receiptStatus, setReceiptStatus] = useState('Issued');
    const [location, setLocation] = useState('');
    const [deviceReference, setDeviceReference] = useState('');
    const [offlineSyncReference, setOfflineSyncReference] = useState('');
    const [principalAllocation, setPrincipalAllocation] = useState('');
    const [interestAllocation, setInterestAllocation] = useState('');
    const [penaltyAllocation, setPenaltyAllocation] = useState('');
    const [collectionBatchReference, setCollectionBatchReference] = useState('');
    const [routeEvidence, setRouteEvidence] = useState('');
    const [supportingDocuments, setSupportingDocuments] = useState('');
    const [customerAcknowledgementReference, setCustomerAcknowledgementReference] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            if (!customerId.trim() || !accountId.trim() || !amount || Number(amount) <= 0 || !collectedOn || !reference.trim() || !remarks.trim()) {
                setError('Customer, account, amount, date, reference and remarks are required.');
                return;
            }
            await onSave({ customerId: customerId.trim(), accountId: accountId.trim(), collectionType, amount: Number(amount), collectedOn, agent, channel, reference: reference.trim(), remarks: remarks.trim(), paymentMethod: paymentMethod.trim(), externalReference: externalReference.trim(), receiptStatus: receiptStatus.trim(), location: location.trim(), deviceReference: deviceReference.trim(), offlineSyncReference: offlineSyncReference.trim(), principalAllocation: principalAllocation.trim(), interestAllocation: interestAllocation.trim(), penaltyAllocation: penaltyAllocation.trim(), collectionBatchReference: collectionBatchReference.trim(), routeEvidence: routeEvidence.trim(), supportingDocuments: supportingDocuments.trim(), customerAcknowledgementReference: customerAcknowledgementReference.trim() });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label="Record collection"><div className="admin-modal-header"><div><div className="eyebrow">COLLECTION WORKFLOW</div><h2>Record doorstep collection</h2><p>Capture the customer payment, assigned agent and receipt audit details. Collect only from the customer or an authorised person - third-party collection is not permitted.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="Customer ID" /></label><label>Account / loan ID<input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="Account ID" /></label><label>Transaction type<select value={collectionType} onChange={(event) => setCollectionType(event.target.value as CollectionRecord['collectionType'])}><option>Daily collection</option><option>RD installment</option><option>Loan repayment</option><option>Penalty</option><option>Other collection</option></select></label><label>Amount collected<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="3000" /></label><label>Collection date and time<input type="datetime-local" value={collectedOn} onChange={(event) => setCollectedOn(event.target.value)} /></label><label>Collection agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><AgentOptions /></select></label><label>Entry channel<select value={channel} onChange={(event) => setChannel(event.target.value as CollectionRecord['channel'])}><option>Doorstep</option><option>Mobile app</option><option>Branch counter</option></select></label><label>Receipt / transaction reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="RCT-88210" /></label><label>Payment method<input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="Cash, UPI or bank transfer" /></label><label>External reference<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} placeholder="Provider or bank reference" /></label><label>Receipt status<input value={receiptStatus} onChange={(event) => setReceiptStatus(event.target.value)} placeholder="Issued, pending or cancelled" /></label><label>Collection location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="GPS or branch location reference" /></label><label>Device reference<input value={deviceReference} onChange={(event) => setDeviceReference(event.target.value)} placeholder="Registered device identifier" /></label><label>Offline sync reference<input value={offlineSyncReference} onChange={(event) => setOfflineSyncReference(event.target.value)} placeholder="Offline queue or sync reference" /></label><label>Principal allocation reference<input value={principalAllocation} onChange={(event) => setPrincipalAllocation(event.target.value)} placeholder="Backend allocation reference" /></label><label>Interest allocation reference<input value={interestAllocation} onChange={(event) => setInterestAllocation(event.target.value)} placeholder="Backend allocation reference" /></label><label>Penalty allocation reference<input value={penaltyAllocation} onChange={(event) => setPenaltyAllocation(event.target.value)} placeholder="Backend allocation reference" /></label><label>Collection batch reference<input value={collectionBatchReference} onChange={(event) => setCollectionBatchReference(event.target.value)} placeholder="Batch or deposit reference" /></label><label>Route evidence<input value={routeEvidence} onChange={(event) => setRouteEvidence(event.target.value)} placeholder="Route or visit evidence reference" /></label><label>Supporting documents<input value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} placeholder="Document IDs or storage references" /></label><label>Customer acknowledgement<input value={customerAcknowledgementReference} onChange={(event) => setCustomerAcknowledgementReference(event.target.value)} placeholder="Signature, OTP or acknowledgement reference" /></label><label className="full-field">Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Payment or receipt remarks" /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} {saving ? 'Saving…' : 'Save collection'}</button></div></form></section></div>;
}

export function CollectionDetail({ record, onClose, onToast }: { record: CollectionRecord; onClose: () => void; onToast: (message: string) => void }) {
    const metadata = [
        ['Payment method', record.paymentMethod],
        ['External reference', record.externalReference],
        ['Receipt status', record.receiptStatus],
        ['Collection location', record.location],
        ['Device reference', record.deviceReference],
        ['Offline sync reference', record.offlineSyncReference],
        ['Principal allocation reference', record.principalAllocation],
        ['Interest allocation reference', record.interestAllocation],
        ['Penalty allocation reference', record.penaltyAllocation],
        ['Collection batch reference', record.collectionBatchReference],
        ['Route evidence', record.routeEvidence],
        ['Supporting documents', record.supportingDocuments],
        ['Customer acknowledgement', record.customerAcknowledgementReference]
    ] as const;

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Collection ${record.id}`}>
            <div className="admin-modal-header">
                <div><div className="eyebrow">COLLECTION ENTRY / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} &middot; {record.customerPhone} &middot; {record.collectionType}</p></div>
                <button className="icon-button" onClick={onClose} aria-label="Close dialog">&times;</button>
            </div>
            <div className="customer-profile-summary">
                <div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div>
                <div><strong>{record.reference}</strong><span>{record.agent} &middot; {record.channel} &middot; {record.collectedOn.replace('T', ' · ')}</span></div>
                <StatusPill status={record.status} />
            </div>
            <div className="customer-detail-grid">
                <div><span>Amount collected</span><strong className="collection-amount">&#8377;{record.amount.toLocaleString('en-IN')}</strong></div>
                <div><span>Account / loan</span><strong>{record.accountId}</strong></div>
                <div><span>Transaction type</span><strong>{record.collectionType}</strong></div>
                <div><span>Agent</span><strong>{record.agent}</strong></div>
                <div><span>Entry channel</span><strong>{record.channel}</strong></div>
                <div><span>Sync status</span><strong>{record.syncStatus}</strong></div>
                {metadata.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not captured'}</strong></div>)}
                <div><span>Remarks</span><strong>{record.remarks}</strong></div>
                <div><span>Audit events</span><strong>{record.events.length}</strong></div>
            </div>
            <section className="customer-subsection">
                <div className="customer-section-heading"><div><h3>Collection history</h3><p>Agent, receipt and synchronization events for this financial entry.</p></div><span>{record.events.length} events</span></div>
                <div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.performedBy} &middot; {event.date}</span><small>{event.note}</small></div><strong>{event.id}</strong></div>)}</div>
            </section>
            <div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast('Collection receipt preview is ready for local data.')}>View receipt</button><button className="secondary-button" onClick={() => onToast('Collection history prepared for export.')}>Export history</button></div>
        </section>
    </div>;
}

export function ScopedCollectionsPage() {
    const [collectionRows, setCollectionRows] = useState<CollectionRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [typeFilter, setTypeFilter] = useState<'All' | CollectionRecord['collectionType']>('All');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<CollectionRecord | undefined>();
    const [modal, setModal] = useState<'entry' | 'detail' | null>(null);
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    useEffect(() => {
        let active = true;
        collectionsRepository
            .list()
            .then((rows) => { if (active) setCollectionRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load collections from the backend.')); });
        return () => { active = false; };
    }, []);
    const filteredRows = collectionRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.accountId} ${row.collectionType} ${row.agent} ${row.reference} ${row.remarks}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter) && (typeFilter === 'All' || row.collectionType === typeFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const todayRows = collectionRows.filter((row) => row.collectedOn.startsWith(new Date().toISOString().slice(0, 10)));
    const todayAmount = todayRows.reduce((total, row) => total + row.amount, 0);
    const pendingAmount = collectionRows.filter((row) => row.status === 'Pending' || row.status === 'Review').reduce((total, row) => total + row.amount, 0);
    const saveCollection = async (_input: CollectionInput) => { close(); notify('Collection entries are recorded by agents through the mobile app and appear here once synchronized.'); };
    const openDetail = (record: CollectionRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / DOORSTEP COLLECTIONS</div><h1>Collections</h1><p>Record employee collections, monitor synchronization and verify daily customer payments.</p></div><button className="primary-button" onClick={() => setModal('entry')}><ArrowDownToLine size={16} /> Record collection</button></div><SummaryStrip items={[{ label: 'Today collected', value: `₹${todayAmount.toLocaleString('en-IN')}`, tone: 'green' }, { label: 'Pending review', value: String(collectionRows.filter((row) => row.status === 'Pending' || row.status === 'Review').length), tone: 'orange' }, { label: 'Pending amount', value: `₹${pendingAmount.toLocaleString('en-IN')}`, tone: 'orange' }, { label: 'Active agents', value: String(new Set(collectionRows.map((row) => row.agent)).size) }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer, account, agent or receipt..." aria-label="Search collections" /></div><select className="filter-button customer-status-filter" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as typeof typeFilter); setPage(1); }} aria-label="Filter collections by type"><option value="All">All collection types</option><option>Daily collection</option><option>RD installment</option><option>Loan repayment</option><option>Penalty</option><option>Other collection</option></select><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter collections by status"><option value="All">All statuses</option><option>Completed</option><option>Pending</option><option>Review</option></select><button className="filter-button" onClick={() => notify('Collection date range selector is ready for local data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); notify('Showing collection entries requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} collection entries prepared for export.`)} aria-label="Export collection data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer / Account</th><th>Amount</th><th>Agent / Channel</th><th>Date / Reference</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.accountId}</span><small>{row.collectionType}</small></td><td className="table-amount collection-amount">₹{row.amount.toLocaleString('en-IN')}</td><td><strong>{row.agent}</strong><span>{row.channel}</span></td><td><strong>{row.collectedOn.replace('T', ' · ')}</strong><span>{row.reference}</span></td><td><StatusPill status={row.status} /><small className="table-muted">{row.syncStatus}</small></td><td><button className="row-action" onClick={() => openDetail(row)} aria-label={`Open collection ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} entries</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="pagination-button selected">{page} / {pageCount}</button><button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'entry' && <CollectionModal onClose={close} onSave={saveCollection} />}{modal === 'detail' && selected && <CollectionDetail record={selected} onClose={close} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}
