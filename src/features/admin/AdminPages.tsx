import { FormEvent, useState } from 'react';
import {
    ArrowDownToLine,
    ArrowUpRight,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Download,
    FileCheck2,
    Filter,
    LockKeyhole,
    Plus,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    UserPlus,
    UsersRound,
    WalletCards,
} from 'lucide-react';

type Status = 'Active' | 'Pending' | 'Approved' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Matched';

type Row = {
    id: string;
    primary: string;
    secondary: string;
    value: string;
    meta: string;
    status: Status;
};

const statusClass: Record<Status, string> = {
    Active: 'status-pill active',
    Pending: 'status-pill pending',
    Approved: 'status-pill approved',
    Completed: 'status-pill completed',
    Review: 'status-pill review',
    Overdue: 'status-pill overdue',
    Inactive: 'status-pill inactive',
    Rejected: 'status-pill rejected',
    Matched: 'status-pill matched',
};

const rows: Record<string, Row[]> = {
    customers: [
        { id: 'CUS-10482', primary: 'Meera Joshi', secondary: 'CUS-10482 · 98XXXX3210', value: '₹2,84,500', meta: '3 active accounts', status: 'Active' },
        { id: 'CUS-10481', primary: 'Vikram Patel', secondary: 'CUS-10481 · 97XXXX1182', value: '₹8,500', meta: 'Loan repayment due', status: 'Review' },
        { id: 'CUS-10480', primary: 'Sanjay Rao', secondary: 'CUS-10480 · 99XXXX4408', value: '₹1,46,000', meta: '2 active accounts', status: 'Active' },
        { id: 'CUS-10479', primary: 'Anita Devi', secondary: 'CUS-10479 · 96XXXX8821', value: '₹72,500', meta: 'RD installment due', status: 'Pending' },
        { id: 'CUS-10478', primary: 'Ramesh Gupta', secondary: 'CUS-10478 · 98XXXX7322', value: '₹0', meta: 'Account closed', status: 'Inactive' },
    ],
    accounts: [
        { id: 'RD-2024108', primary: 'Meera Joshi', secondary: 'RD · Monthly · ₹3,000', value: '₹36,000', meta: 'Due 12 Aug 2026', status: 'Active' },
        { id: 'FD-2024071', primary: 'Sanjay Rao', secondary: 'FD · 24 months · 7.5%', value: '₹1,00,000', meta: 'Matures 18 Jul 2026', status: 'Review' },
        { id: 'RD-2024099', primary: 'Anita Devi', secondary: 'RD · Monthly · ₹2,500', value: '₹30,000', meta: 'Due 10 Aug 2026', status: 'Pending' },
        { id: 'DEP-78144', primary: 'Ramesh Gupta', secondary: 'Deposit · Savings', value: '₹84,500', meta: 'Last entry 08 Aug 2026', status: 'Active' },
    ],
    loans: [
        { id: 'LN-30481', primary: 'Vikram Patel', secondary: 'Gold Loan · 18 months', value: '₹4,82,000', meta: '₹8,500 installment', status: 'Active' },
        { id: 'LN-30472', primary: 'Meera Joshi', secondary: 'Home Loan · 60 months', value: '₹12,40,000', meta: '₹24,800 installment', status: 'Active' },
        { id: 'LN-30455', primary: 'Ramesh Gupta', secondary: 'Mortgage Loan · 36 months', value: '₹3,18,500', meta: '12 days overdue', status: 'Overdue' },
        { id: 'LN-30439', primary: 'Sanjay Rao', secondary: 'Other Loan · 12 months', value: '₹0', meta: 'Closed 02 Aug 2026', status: 'Completed' },
    ],
    collections: [
        { id: 'TXN-20481', primary: 'Meera Joshi', secondary: 'RD installment · Rajesh Kumar', value: '₹3,000', meta: '10:42 AM · 08 Aug 2026', status: 'Completed' },
        { id: 'TXN-20480', primary: 'Vikram Patel', secondary: 'Loan repayment · Priya Sharma', value: '₹8,500', meta: '10:31 AM · 08 Aug 2026', status: 'Completed' },
        { id: 'TXN-20479', primary: 'Sanjay Rao', secondary: 'Deposit collection · Amit Verma', value: '₹5,000', meta: '10:18 AM · 08 Aug 2026', status: 'Pending' },
        { id: 'TXN-20478', primary: 'Anita Devi', secondary: 'RD installment · Neha Singh', value: '₹2,500', meta: '09:56 AM · 08 Aug 2026', status: 'Review' },
    ],
    withdrawals: [
        { id: 'WD-00881', primary: 'Kavita Shah', secondary: 'Savings deposit · Requested by customer', value: '₹18,000', meta: '08 Aug 2026 · Ref WD-00881', status: 'Review' },
        { id: 'WD-00880', primary: 'Mohan Das', secondary: 'RD account · Branch counter', value: '₹7,500', meta: '07 Aug 2026 · Ref WD-00880', status: 'Completed' },
        { id: 'WD-00879', primary: 'Anita Devi', secondary: 'Deposit account · Agent request', value: '₹12,000', meta: '06 Aug 2026 · Ref WD-00879', status: 'Pending' },
    ],
};

function getRows(type: string): Row[] {
    return rows[type] ?? [];
}

const navTitle: Record<string, string> = {
    '/customers': 'Customers', '/deposits': 'Deposits', '/recurring-deposits': 'Recurring Deposits',
    '/fixed-deposits': 'Fixed Deposits', '/loans': 'Loans', '/withdrawals': 'Withdrawals',
    '/collections': 'Collections', '/agents': 'Collection Agents', '/reconciliation': 'Reconciliation',
    '/reports': 'Reports & Statements', '/security': 'Security Center', '/settings': 'System Settings',
};

function StatusPill({ status }: { status: Status }) {
    return <span className={statusClass[status]}><i />{status}</span>;
}

function PageHeader({ title, description, action = 'Add record', icon: Icon = Plus }: { title: string; description: string; action?: string; icon?: typeof Plus }) {
    return <div className="page-heading">
        <div><div className="eyebrow">OPERATIONS / {title.toUpperCase()}</div><h1>{title}</h1><p>{description}</p></div>
        {action && <button className="primary-button"><Icon size={16} />{action}</button>}
    </div>;
}

function SummaryStrip({ items }: { items: Array<{ label: string; value: string; tone?: string }> }) {
    return <div className="summary-strip">{items.map((item) => <div className="summary-item" key={item.label}><span>{item.label}</span><strong className={item.tone}>{item.value}</strong></div>)}</div>;
}

function FilterBar({ placeholder = 'Search by name, ID or account...' }: { placeholder?: string }) {
    return <div className="filter-bar"><div className="filter-search"><Search size={16} /><input placeholder={placeholder} aria-label={placeholder} /></div><button className="filter-button"><CalendarDays size={15} /> Date range</button><button className="filter-button"><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" aria-label="Export data"><Download size={16} /></button></div>;
}

function RecordTable({ data, type }: { data: Row[]; type: string }) {
    return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{type === 'collections' ? 'Transaction' : type === 'accounts' ? 'Account' : 'Record'}</th><th>Amount / Value</th><th>Details</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{data.map((row) => <tr key={row.id}><td><strong>{row.primary}</strong><span>{row.secondary}</span><small>{row.id}</small></td><td className="table-amount">{row.value}</td><td className="table-muted">{row.meta}</td><td><StatusPill status={row.status} /></td><td><button className="row-action" aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table></div>;
}

function ListingPage({ title, description, type, action = 'Add record', summary }: { title: string; description: string; type: string; action?: string; summary: Array<{ label: string; value: string; tone?: string }> }) {
    const data = getRows(type);
    return <><PageHeader title={title} description={description} action={action} /><SummaryStrip items={summary} /><section className="panel table-panel"><FilterBar placeholder={type === 'collections' ? 'Search transactions, customers or agents...' : undefined} /><RecordTable data={data} type={type} /><div className="table-footer"><span>Showing 1–{data.length} of 2,847 records</span><div><button className="pagination-button">Previous</button><button className="pagination-button selected">1</button><button className="pagination-button">2</button><button className="pagination-button">Next</button></div></div></section></>;
}

function DetailCard({ title, children, icon: Icon = FileCheck2 }: { title: string; children: React.ReactNode; icon?: typeof FileCheck2 }) {
    return <section className="panel detail-card"><div className="panel-heading"><div className="detail-title"><span className="detail-icon"><Icon size={16} /></span><h2>{title}</h2></div><button className="more-button" aria-label={`More ${title} options`}><SlidersHorizontal size={16} /></button></div>{children}</section>;
}

function CollectionsPage() {
    return <><PageHeader title="Collections" description="Monitor doorstep entries and daily collection activity." action="Record collection" icon={ArrowDownToLine} /><SummaryStrip items={[{ label: 'Today collected', value: '₹2,38,450', tone: 'green' }, { label: 'Pending review', value: '12', tone: 'orange' }, { label: 'Active agents', value: '18' }, { label: 'Avg. collection', value: '₹13,247' }]} /><section className="dashboard-grid admin-grid"><DetailCard title="Daily collection flow" icon={WalletCards}><div className="collection-flow"><div><strong>₹2.38L</strong><span>Collected today</span></div><ArrowUpRight className="flow-arrow" size={20} /><div><strong>₹2.61L</strong><span>Expected today</span></div></div><div className="progress-track large"><i className="green" style={{ width: '91%' }} /></div><div className="flow-meta"><span>91% of expected collections received</span><b>₹22,550 remaining</b></div></DetailCard><DetailCard title="Collection status" icon={CircleAlert}><div className="status-breakdown"><div><b className="green-text">324</b><span>Completed</span></div><div><b className="orange-text">12</b><span>Pending review</span></div><div><b className="red-text">7</b><span>Failed sync</span></div></div><button className="text-button">Open sync queue <ChevronRight size={14} /></button></DetailCard></section><section className="panel table-panel"><div className="panel-heading"><div><h2>Recent collection entries</h2><p>Every mobile entry is tracked with an agent and receipt reference.</p></div></div><FilterBar /><RecordTable data={getRows('collections')} type="collections" /></section></>;
}

type CollectionRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    accountId: string;
    collectionType: 'Deposit collection' | 'RD collection' | 'Loan installment' | 'Other collection';
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

type CollectionInput = Pick<CollectionRecord, 'customerId' | 'accountId' | 'collectionType' | 'amount' | 'collectedOn' | 'agent' | 'channel' | 'reference' | 'remarks'> & Partial<Pick<CollectionRecord, 'paymentMethod' | 'externalReference' | 'receiptStatus' | 'location' | 'deviceReference' | 'offlineSyncReference' | 'principalAllocation' | 'interestAllocation' | 'penaltyAllocation' | 'collectionBatchReference' | 'routeEvidence' | 'supportingDocuments' | 'customerAcknowledgementReference'>>;

type CollectionSeed = CollectionRecord[];
const collectionSeed: CollectionSeed = [
    { id: 'COL-20481', customerId: 'CUS-10482', customerName: 'Meera Joshi', customerPhone: '98XXXX3210', accountId: 'RD-2024108', collectionType: 'RD collection', amount: 3000, collectedOn: '2026-08-22T10:42', agent: 'Rajesh Kumar', channel: 'Doorstep', reference: 'RCT-88201', remarks: 'Monthly RD installment collected at doorstep.', status: 'Completed', syncStatus: 'Synced', events: [{ id: 'CE-481', type: 'Collection recorded', date: '22 Aug 2026 · 10:42 AM', performedBy: 'Rajesh Kumar', note: 'Mobile collection entry synchronized.' }] },
    { id: 'COL-20480', customerId: 'CUS-10481', customerName: 'Vikram Patel', customerPhone: '97XXXX1182', accountId: 'LN-30481', collectionType: 'Loan installment', amount: 8500, collectedOn: '2026-08-22T10:31', agent: 'Priya Sharma', channel: 'Doorstep', reference: 'RCT-88200', remarks: 'Gold loan installment with principal and interest split recorded.', status: 'Completed', syncStatus: 'Synced', events: [{ id: 'CE-480', type: 'Collection recorded', date: '22 Aug 2026 · 10:31 AM', performedBy: 'Priya Sharma', note: 'Receipt issued and synchronized.' }] },
    { id: 'COL-20479', customerId: 'CUS-10480', customerName: 'Sanjay Rao', customerPhone: '99XXXX4408', accountId: 'DEP-78144', collectionType: 'Deposit collection', amount: 5000, collectedOn: '2026-08-22T10:18', agent: 'Amit Verma', channel: 'Mobile app', reference: 'RCT-88199', remarks: 'Savings deposit collection awaiting review.', status: 'Pending', syncStatus: 'Pending sync', events: [{ id: 'CE-479', type: 'Collection recorded', date: '22 Aug 2026 · 10:18 AM', performedBy: 'Amit Verma', note: 'Entry received from mobile application.' }] },
    { id: 'COL-20478', customerId: 'CUS-10479', customerName: 'Anita Devi', customerPhone: '96XXXX8821', accountId: 'RD-2024099', collectionType: 'RD collection', amount: 2500, collectedOn: '2026-08-22T09:56', agent: 'Neha Singh', channel: 'Doorstep', reference: 'RCT-88198', remarks: 'Customer requested receipt confirmation.', status: 'Review', syncStatus: 'Synced', events: [{ id: 'CE-478', type: 'Marked for review', date: '22 Aug 2026 · 09:56 AM', performedBy: 'Admin workspace', note: 'Receipt confirmation requires review.' }] },
    { id: 'COL-20477', customerId: 'CUS-10482', customerName: 'Meera Joshi', customerPhone: '98XXXX3210', accountId: 'DEP-78143', collectionType: 'Deposit collection', amount: 4000, collectedOn: '2026-08-21T16:12', agent: 'Rajesh Kumar', channel: 'Doorstep', reference: 'RCT-88170', remarks: 'Savings deposit entry completed.', status: 'Completed', syncStatus: 'Synced', events: [{ id: 'CE-477', type: 'Collection recorded', date: '21 Aug 2026 · 04:12 PM', performedBy: 'Rajesh Kumar', note: 'Entry synchronized successfully.' }] },
];

function CollectionModal({ onClose, onSave }: { onClose: () => void; onSave: (input: CollectionInput) => void }) {
    const [customerId, setCustomerId] = useState('CUS-10482');
    const [accountId, setAccountId] = useState('RD-2024108');
    const [collectionType, setCollectionType] = useState<CollectionRecord['collectionType']>('RD collection');
    const [amount, setAmount] = useState('');
    const [collectedOn, setCollectedOn] = useState('2026-08-22T12:00');
    const [agent, setAgent] = useState('Rajesh Kumar');
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
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!customerId.trim() || !accountId.trim() || !amount || Number(amount) <= 0 || !collectedOn || !reference.trim() || !remarks.trim()) {
            setError('Customer, account, amount, date, reference and remarks are required.');
            return;
        }
        onSave({ customerId: customerId.trim(), accountId: accountId.trim(), collectionType, amount: Number(amount), collectedOn, agent, channel, reference: reference.trim(), remarks: remarks.trim(), paymentMethod: paymentMethod.trim(), externalReference: externalReference.trim(), receiptStatus: receiptStatus.trim(), location: location.trim(), deviceReference: deviceReference.trim(), offlineSyncReference: offlineSyncReference.trim(), principalAllocation: principalAllocation.trim(), interestAllocation: interestAllocation.trim(), penaltyAllocation: penaltyAllocation.trim(), collectionBatchReference: collectionBatchReference.trim(), routeEvidence: routeEvidence.trim(), supportingDocuments: supportingDocuments.trim(), customerAcknowledgementReference: customerAcknowledgementReference.trim() });
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label="Record collection"><div className="admin-modal-header"><div><div className="eyebrow">COLLECTION WORKFLOW</div><h2>Record doorstep collection</h2><p>Capture the customer payment, assigned agent and receipt audit details.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}><label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="CUS-10482" /></label><label>Account / loan ID<input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="RD-2024108" /></label><label>Transaction type<select value={collectionType} onChange={(event) => setCollectionType(event.target.value as CollectionRecord['collectionType'])}><option>Deposit collection</option><option>RD collection</option><option>Loan installment</option><option>Other collection</option></select></label><label>Amount collected<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="3000" /></label><label>Collection date and time<input type="datetime-local" value={collectedOn} onChange={(event) => setCollectedOn(event.target.value)} /></label><label>Collection agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option></select></label><label>Entry channel<select value={channel} onChange={(event) => setChannel(event.target.value as CollectionRecord['channel'])}><option>Doorstep</option><option>Mobile app</option><option>Branch counter</option></select></label><label>Receipt / transaction reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="RCT-88210" /></label><label>Payment method<input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="Cash, UPI or bank transfer" /></label><label>External reference<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} placeholder="Provider or bank reference" /></label><label>Receipt status<input value={receiptStatus} onChange={(event) => setReceiptStatus(event.target.value)} placeholder="Issued, pending or cancelled" /></label><label>Collection location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="GPS or branch location reference" /></label><label>Device reference<input value={deviceReference} onChange={(event) => setDeviceReference(event.target.value)} placeholder="Registered device identifier" /></label><label>Offline sync reference<input value={offlineSyncReference} onChange={(event) => setOfflineSyncReference(event.target.value)} placeholder="Offline queue or sync reference" /></label><label>Principal allocation reference<input value={principalAllocation} onChange={(event) => setPrincipalAllocation(event.target.value)} placeholder="Backend allocation reference" /></label><label>Interest allocation reference<input value={interestAllocation} onChange={(event) => setInterestAllocation(event.target.value)} placeholder="Backend allocation reference" /></label><label>Penalty allocation reference<input value={penaltyAllocation} onChange={(event) => setPenaltyAllocation(event.target.value)} placeholder="Backend allocation reference" /></label><label>Collection batch reference<input value={collectionBatchReference} onChange={(event) => setCollectionBatchReference(event.target.value)} placeholder="Batch or deposit reference" /></label><label>Route evidence<input value={routeEvidence} onChange={(event) => setRouteEvidence(event.target.value)} placeholder="Route or visit evidence reference" /></label><label>Supporting documents<input value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} placeholder="Document IDs or storage references" /></label><label>Customer acknowledgement<input value={customerAcknowledgementReference} onChange={(event) => setCustomerAcknowledgementReference(event.target.value)} placeholder="Signature, OTP or acknowledgement reference" /></label><label className="full-field">Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Payment or receipt remarks" /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><CheckCircle2 size={16} /> Save collection</button></div></form></section></div>;
}

function CollectionDetail({ record, onClose, onToast }: { record: CollectionRecord; onClose: () => void; onToast: (message: string) => void }) {
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
function ScopedCollectionsPage() {
    const [collectionRows, setCollectionRows] = useState<CollectionRecord[]>(collectionSeed);
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
    const filteredRows = collectionRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.accountId} ${row.collectionType} ${row.agent} ${row.reference} ${row.remarks}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter) && (typeFilter === 'All' || row.collectionType === typeFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const todayRows = collectionRows.filter((row) => row.collectedOn.startsWith('2026-08-22'));
    const todayAmount = todayRows.reduce((total, row) => total + row.amount, 0);
    const pendingAmount = collectionRows.filter((row) => row.status === 'Pending' || row.status === 'Review').reduce((total, row) => total + row.amount, 0);
    const saveCollection = (input: CollectionInput) => { const customer = customerSeed.find((row) => row.id === input.customerId); const id = `COL-${20500 + collectionRows.length}`; const event = { id: `CE-${900 + collectionRows.length}`, type: 'Collection recorded', date: input.collectedOn.replace('T', ' · '), performedBy: input.agent, note: 'Collection entry created locally and queued for synchronization.' }; setCollectionRows((current) => [{ id, ...input, customerName: customer?.primary ?? input.customerId, customerPhone: customer?.secondary.split('·')[1]?.trim() ?? 'Not available', status: 'Pending', syncStatus: 'Pending sync', events: [event] }, ...current]); setPage(1); close(); notify('Collection entry recorded locally and queued for sync.'); };
    const openDetail = (record: CollectionRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / DOORSTEP COLLECTIONS</div><h1>Collections</h1><p>Record employee collections, monitor synchronization and verify daily customer payments.</p></div><button className="primary-button" onClick={() => setModal('entry')}><ArrowDownToLine size={16} /> Record collection</button></div><SummaryStrip items={[{ label: 'Today collected', value: `₹${todayAmount.toLocaleString('en-IN')}`, tone: 'green' }, { label: 'Pending review', value: String(collectionRows.filter((row) => row.status === 'Pending' || row.status === 'Review').length), tone: 'orange' }, { label: 'Pending amount', value: `₹${pendingAmount.toLocaleString('en-IN')}`, tone: 'orange' }, { label: 'Active agents', value: String(new Set(collectionRows.map((row) => row.agent)).size) }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer, account, agent or receipt..." aria-label="Search collections" /></div><select className="filter-button customer-status-filter" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as typeof typeFilter); setPage(1); }} aria-label="Filter collections by type"><option value="All">All collection types</option><option>Deposit collection</option><option>RD collection</option><option>Loan installment</option><option>Other collection</option></select><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter collections by status"><option value="All">All statuses</option><option>Completed</option><option>Pending</option><option>Review</option></select><button className="filter-button" onClick={() => notify('Collection date range selector is ready for local data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); notify('Showing collection entries requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} collection entries prepared for export.`)} aria-label="Export collection data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer / Account</th><th>Amount</th><th>Agent / Channel</th><th>Date / Reference</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.accountId}</span><small>{row.collectionType}</small></td><td className="table-amount collection-amount">₹{row.amount.toLocaleString('en-IN')}</td><td><strong>{row.agent}</strong><span>{row.channel}</span></td><td><strong>{row.collectedOn.replace('T', ' · ')}</strong><span>{row.reference}</span></td><td><StatusPill status={row.status} /><small className="table-muted">{row.syncStatus}</small></td><td><button className="row-action" onClick={() => openDetail(row)} aria-label={`Open collection ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} entries</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="pagination-button selected">{page} / {pageCount}</button><button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'entry' && <CollectionModal onClose={close} onSave={saveCollection} />}{modal === 'detail' && selected && <CollectionDetail record={selected} onClose={close} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}

type ReconciliationEvent = {
    id: string;
    type: string;
    date: string;
    performedBy: string;
    note: string;
};

type ReconciliationRecord = {
    id: string;
    agent: string;
    agentId: string;
    route: string;
    reconciliationDate: string;
    collectedAmount: number;
    submittedAmount: number;
    cashAmount: number;
    digitalAmount: number;
    submissionReference: string;
    submittedOn: string;
    status: 'Matched' | 'Review' | 'Pending' | 'Completed';
    remarks: string;
    cashDenominationReference?: string;
    handoverReceiptReference?: string;
    bankSettlementReference?: string;
    digitalSettlementDetails?: string;
    exceptionReason?: string;
    supportingDocuments?: string;
    supervisorReference?: string;
    secondReviewerReference?: string;
    submissionDevice?: string;
    offlineSyncReference?: string;
    reviewCorrelationReference?: string;
    reviewedBy?: string;
    reviewedOn?: string;
    resolutionNote?: string;
    events: ReconciliationEvent[];
};

type ReconciliationInput = Pick<ReconciliationRecord, 'agent' | 'agentId' | 'route' | 'reconciliationDate' | 'collectedAmount' | 'cashAmount' | 'digitalAmount' | 'submissionReference' | 'submittedOn' | 'remarks'> & Partial<Pick<ReconciliationRecord, 'cashDenominationReference' | 'handoverReceiptReference' | 'bankSettlementReference' | 'digitalSettlementDetails' | 'exceptionReason' | 'supportingDocuments' | 'supervisorReference' | 'secondReviewerReference' | 'submissionDevice' | 'offlineSyncReference' | 'reviewCorrelationReference'>>;

const reconciliationSeed: ReconciliationRecord[] = [
    { id: 'REC-2026-0081', agent: 'Rajesh Kumar', agentId: 'AGT-0018', route: 'Jaipur East / Sitapura', reconciliationDate: '2026-08-22', collectedAmount: 48620, submittedAmount: 48620, cashAmount: 35200, digitalAmount: 13420, submissionReference: 'CASH-88201', submittedOn: '2026-08-22T18:10', status: 'Matched', remarks: 'All receipts and cash count verified.', events: [{ id: 'RE-1', type: 'Submission received', date: '22 Aug 2026 · 06:10 PM', performedBy: 'Rajesh Kumar', note: 'Daily collection submitted from mobile app.' }, { id: 'RE-2', type: 'Matched', date: '22 Aug 2026 · 06:25 PM', performedBy: 'Arjun Kapoor', note: 'Recorded collections matched with submitted amount.' }] },
    { id: 'REC-2026-0082', agent: 'Priya Sharma', agentId: 'AGT-0019', route: 'Jaipur North / Vaishali Nagar', reconciliationDate: '2026-08-22', collectedAmount: 36450, submittedAmount: 35950, cashAmount: 27950, digitalAmount: 8000, submissionReference: 'CASH-88204', submittedOn: '2026-08-22T18:22', status: 'Review', remarks: 'One receipt is pending confirmation.', events: [{ id: 'RE-3', type: 'Variance flagged', date: '22 Aug 2026 · 06:22 PM', performedBy: 'System', note: 'Submitted amount is lower than recorded collections by ₹500.' }] },
    { id: 'REC-2026-0083', agent: 'Amit Verma', agentId: 'AGT-0020', route: 'Jaipur South / Sanganer', reconciliationDate: '2026-08-22', collectedAmount: 29180, submittedAmount: 29180, cashAmount: 21180, digitalAmount: 8000, submissionReference: 'CASH-88208', submittedOn: '2026-08-22T18:35', status: 'Completed', remarks: 'Branch counter handover completed.', events: [{ id: 'RE-4', type: 'Approved', date: '22 Aug 2026 · 06:45 PM', performedBy: 'Arjun Kapoor', note: 'Cash handover receipt attached and approved.' }] },
    { id: 'REC-2026-0084', agent: 'Neha Singh', agentId: 'AGT-0021', route: 'Jaipur West / Mansarovar', reconciliationDate: '2026-08-22', collectedAmount: 24900, submittedAmount: 24700, cashAmount: 18700, digitalAmount: 6000, submissionReference: 'CASH-88211', submittedOn: '2026-08-22T18:48', status: 'Pending', remarks: 'Awaiting supervisor verification of cash handover.', events: [{ id: 'RE-5', type: 'Submission received', date: '22 Aug 2026 · 06:48 PM', performedBy: 'Neha Singh', note: 'Submission is waiting for supervisor verification.' }] }
];

function ReconciliationDetail({ record, onClose, onReview, onToast }: { record: ReconciliationRecord; onClose: () => void; onReview: () => void; onToast: (message: string) => void }) {
    const variance = record.collectedAmount - record.submittedAmount;
    const evidence = [
        ['Cash denomination reference', record.cashDenominationReference],
        ['Handover receipt reference', record.handoverReceiptReference],
        ['Bank settlement reference', record.bankSettlementReference],
        ['Digital settlement details', record.digitalSettlementDetails],
        ['Exception reason', record.exceptionReason],
        ['Supporting documents', record.supportingDocuments],
        ['Supervisor reference', record.supervisorReference],
        ['Second reviewer reference', record.secondReviewerReference],
        ['Submission device', record.submissionDevice],
        ['Offline sync reference', record.offlineSyncReference],
        ['Review correlation reference', record.reviewCorrelationReference],
        ['Reviewed on', record.reviewedOn]
    ] as const;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Reconciliation ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">DAILY RECONCILIATION / {record.id}</div><h2>{record.agent}</h2><p>{record.agentId} &middot; {record.route} &middot; {record.reconciliationDate}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">&times;</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.agent.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.submissionReference}</strong><span>Submitted {record.submittedOn.replace('T', ' · ')}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>Recorded collections</span><strong className="collection-amount">&#8377;{record.collectedAmount.toLocaleString('en-IN')}</strong></div><div><span>Submitted total</span><strong>&#8377;{record.submittedAmount.toLocaleString('en-IN')}</strong></div><div><span>Variance</span><strong className={variance ? 'orange-text' : 'green-text'}>&#8377;{Math.abs(variance).toLocaleString('en-IN')}</strong></div><div><span>Cash handover</span><strong>&#8377;{record.cashAmount.toLocaleString('en-IN')}</strong></div><div><span>Digital receipts</span><strong>&#8377;{record.digitalAmount.toLocaleString('en-IN')}</strong></div><div><span>Reviewed by</span><strong>{record.reviewedBy ?? 'Awaiting verification'}</strong></div>{evidence.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not captured'}</strong></div>)}<div><span>Remarks</span><strong>{record.remarks}</strong></div><div><span>Resolution</span><strong>{record.resolutionNote ?? 'Not resolved'}</strong></div><div><span>Audit events</span><strong>{record.events.length}</strong></div></div><div className="modal-actions recon-detail-actions"><button className="secondary-button" onClick={() => onToast('Reconciliation export prepared locally.')}><Download size={15} /> Export audit</button>{record.status !== 'Completed' && <button className="primary-button" onClick={onReview}><CheckCircle2 size={15} /> Review submission</button>}</div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Reconciliation history</h3><p>Submission, evidence and review events captured for this local record.</p></div><span>{record.events.length} events</span></div><div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.performedBy} &middot; {event.date}</span><small>{event.note}</small></div><strong>{event.id}</strong></div>)}</div></section></section></div>;
}
function ReconciliationReviewModal({ record, onClose, onSave }: { record: ReconciliationRecord; onClose: () => void; onSave: (status: ReconciliationRecord['status'], note: string, metadata: ReconciliationInput) => void }) {
    const [status, setStatus] = useState<ReconciliationRecord['status']>(record.collectedAmount === record.submittedAmount ? 'Completed' : 'Review');
    const [note, setNote] = useState(record.resolutionNote ?? '');
    const [exceptionReason, setExceptionReason] = useState(record.exceptionReason ?? '');
    const [supervisorReference, setSupervisorReference] = useState(record.supervisorReference ?? '');
    const [secondReviewerReference, setSecondReviewerReference] = useState(record.secondReviewerReference ?? '');
    const [supportingDocuments, setSupportingDocuments] = useState(record.supportingDocuments ?? '');
    const [reviewCorrelationReference, setReviewCorrelationReference] = useState(record.reviewCorrelationReference ?? '');
    const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!note.trim()) return; onSave(status, note.trim(), { agent: record.agent, agentId: record.agentId, route: record.route, reconciliationDate: record.reconciliationDate, collectedAmount: record.collectedAmount, cashAmount: record.cashAmount, digitalAmount: record.digitalAmount, submissionReference: record.submissionReference, submittedOn: record.submittedOn, remarks: record.remarks, exceptionReason: exceptionReason.trim(), supervisorReference: supervisorReference.trim(), secondReviewerReference: secondReviewerReference.trim(), supportingDocuments: supportingDocuments.trim(), reviewCorrelationReference: reviewCorrelationReference.trim() }); };
    return <div className="admin-overlay" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-label="Review reconciliation"><div className="admin-modal-header"><div><div className="eyebrow">CONTROLLED REVIEW</div><h2>Review {record.id}</h2><p>Record review evidence and a resolution note for this close.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">&times;</button></div><form className="form-grid customer-form recon-review-form" onSubmit={submit}><label>Verification outcome<select value={status} onChange={(event) => setStatus(event.target.value as ReconciliationRecord['status'])}><option value="Completed">Approve and close</option><option value="Matched">Mark matched</option><option value="Review">Keep under review</option><option value="Pending">Return to pending</option></select></label><label>Exception reason<input value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} placeholder="Variance or exception reference" /></label><label>Supervisor reference<input value={supervisorReference} onChange={(event) => setSupervisorReference(event.target.value)} placeholder="Supervisor review reference" /></label><label>Second reviewer reference<input value={secondReviewerReference} onChange={(event) => setSecondReviewerReference(event.target.value)} placeholder="Second reviewer or maker-checker reference" /></label><label>Review correlation reference<input value={reviewCorrelationReference} onChange={(event) => setReviewCorrelationReference(event.target.value)} placeholder="Review request or correlation ID" /></label><label className="full-field">Supporting documents<input value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} placeholder="Document IDs or storage references" /></label><label className="full-field">Resolution / verification note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the cash count, receipt check or variance resolution." /></label><div className="form-note"><CircleAlert size={16} /><span>Review decisions are recorded in the local audit history.</span></div><div className="modal-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><CheckCircle2 size={15} /> Save decision</button></div></form></section></div>;
}
function ScopedReconciliationPage() {
    const [rows, setRows] = useState<ReconciliationRecord[]>(reconciliationSeed);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | ReconciliationRecord['status']>('All');
    const [dateFilter, setDateFilter] = useState('2026-08-22');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<ReconciliationRecord | undefined>();
    const [modal, setModal] = useState<'detail' | 'review' | null>(null);
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = rows.filter((row) => `${row.id} ${row.agent} ${row.agentId} ${row.route} ${row.submissionReference} ${row.remarks}`.toLowerCase().includes(search.toLowerCase()) && (!dateFilter || row.reconciliationDate === dateFilter) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const pending = rows.filter((row) => row.status === 'Pending' || row.status === 'Review');
    const submitted = rows.reduce((total, row) => total + row.submittedAmount, 0);
    const matched = rows.filter((row) => row.status === 'Matched' || row.status === 'Completed').reduce((total, row) => total + row.submittedAmount, 0);
    const variance = rows.reduce((total, row) => total + Math.abs(row.collectedAmount - row.submittedAmount), 0);
    const openDetail = (record: ReconciliationRecord) => { setSelected(record); setModal('detail'); };
    const startReconciliation = () => { setDateFilter(''); setStatusFilter('All'); setPage(1); notify('Reconciliation workspace opened for all pending daily submissions.'); };
    const saveDecision = (status: ReconciliationRecord['status'], note: string, metadata: ReconciliationInput) => { if (!selected) return; const event: ReconciliationEvent = { id: `RE-${Date.now()}`, type: status === 'Completed' ? 'Reconciliation approved' : 'Review decision recorded', date: '22 Aug 2026 · 07:10 PM', performedBy: 'Arjun Kapoor', note }; setRows((current) => current.map((row) => row.id === selected.id ? { ...row, status, ...metadata, reviewedBy: 'Arjun Kapoor', reviewedOn: '2026-08-22T19:10', resolutionNote: note, events: [event, ...row.events] } : row)); close(); notify(`Reconciliation ${selected.id} updated locally.`); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / CASH CONTROL</div><h1>Daily Reconciliation</h1><p>Verify agent cash submissions against recorded collections and resolve exceptions.</p></div><button className="primary-button" onClick={startReconciliation}><FileCheck2 size={16} /> Start reconciliation</button></div><SummaryStrip items={[{ label: 'Awaiting verification', value: String(pending.length), tone: 'orange' }, { label: 'Submitted today', value: `₹${submitted.toLocaleString('en-IN')}` }, { label: 'Matched amount', value: `₹${matched.toLocaleString('en-IN')}`, tone: 'green' }, { label: 'Variance', value: `₹${variance.toLocaleString('en-IN')}`, tone: variance ? 'red' : 'green' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search agent, reconciliation ID, route or reference..." aria-label="Search reconciliations" /></div><input className="recon-date-filter" type="date" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1); }} aria-label="Filter by reconciliation date" /><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }} aria-label="Filter reconciliations by status"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Matched">Matched</option><option value="Completed">Completed</option></select><button className="icon-button export-button" onClick={() => notify('Reconciliation register export prepared locally.')} aria-label="Export reconciliation register"><Download size={16} /></button></div>{visibleRows.length ? <div className="data-table-wrap"><table className="data-table reconciliation-table"><thead><tr><th>Agent / route</th><th>Reconciliation</th><th>Recorded</th><th>Submitted</th><th>Variance</th><th>Status</th><th /></tr></thead><tbody>{visibleRows.map((row) => { const rowVariance = row.collectedAmount - row.submittedAmount; return <tr key={row.id}><td><strong>{row.agent}</strong><span>{row.agentId} · {row.route}</span></td><td><strong>{row.id}</strong><span>{row.reconciliationDate} · {row.submissionReference}</span></td><td><strong>₹{row.collectedAmount.toLocaleString('en-IN')}</strong><small>{row.cashAmount.toLocaleString('en-IN')} cash · {row.digitalAmount.toLocaleString('en-IN')} digital</small></td><td><strong>₹{row.submittedAmount.toLocaleString('en-IN')}</strong><span>{row.submittedOn.replace('T', ' · ')}</span></td><td><strong className={rowVariance ? 'orange-text' : 'green-text'}>₹{Math.abs(rowVariance).toLocaleString('en-IN')}</strong><span>{rowVariance > 0 ? 'Short submitted' : rowVariance < 0 ? 'Over submitted' : 'Balanced'}</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={() => openDetail(row)} aria-label={`Open reconciliation ${row.id}`}><ChevronRight size={16} /></button></td></tr>; })}</tbody></table></div> : <div className="empty-state"><strong>No reconciliation records found</strong><span>Adjust the date, status or search filters to view another daily close.</span></div>}<div className="table-footer"><span>{filteredRows.length} reconciliation records</span><div className="pagination"><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page} of {pageCount}</span><button className="pagination-button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{selected && modal === 'detail' && <ReconciliationDetail record={selected} onClose={close} onReview={() => setModal('review')} onToast={notify} />}{selected && modal === 'review' && <ReconciliationReviewModal record={selected} onClose={close} onSave={saveDecision} />}{toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}

type ReportRecord = {
    id: string;
    name: string;
    category: 'Operations' | 'Finance' | 'Compliance';
    scope: string;
    output: string;
    description: string;
    lastGenerated: string;
    generatedBy: string;
    branch?: string;
    agent?: string;
    customerOrAccountScope?: string;
    fiscalYear?: string;
    timezone?: string;
    granularity?: string;
    statusFilter?: string;
    inclusionOptions?: string;
    deliveryDestination?: string;
    reportLabel?: string;
    statementType?: string;
    exportReference?: string;
    correlationReference?: string;
};

const reportSeed: ReportRecord[] = [
    { id: 'RPT-1001', name: 'Daily Collection Report', category: 'Operations', scope: 'Collections and agents', output: 'Collection amount, count, channel, agent and sync status', description: 'Daily doorstep, branch and mobile collection activity with receipt references.', lastGenerated: '22 Aug 2026 · 06:15 PM', generatedBy: 'Arjun Kapoor' },
    { id: 'RPT-1002', name: 'Agent-wise Collection Report', category: 'Operations', scope: 'Collection agents', output: 'Agent totals, routes, pending sync and variance', description: 'Compare collection performance and operational status across assigned agents.', lastGenerated: '22 Aug 2026 · 05:40 PM', generatedBy: 'Arjun Kapoor' },
    { id: 'RPT-1003', name: 'Customer-wise Transaction Report', category: 'Finance', scope: 'Customers and accounts', output: 'Customer, account, transaction, amount and reference', description: 'Consolidated customer activity across deposits, recurring deposits and loans.', lastGenerated: '21 Aug 2026 · 04:20 PM', generatedBy: 'Priya Sharma' },
    { id: 'RPT-1004', name: 'Deposit & RD Statement', category: 'Finance', scope: 'Deposit and RD accounts', output: 'Opening balance, installments, credits and closing balance', description: 'Account-level statement for savings deposits and recurring deposit schedules.', lastGenerated: '21 Aug 2026 · 02:10 PM', generatedBy: 'Arjun Kapoor' },
    { id: 'RPT-1005', name: 'FD Maturity Report', category: 'Finance', scope: 'Fixed deposits', output: 'Maturity date, principal, interest and maturity value', description: 'Track upcoming fixed deposit maturities and payout readiness.', lastGenerated: '20 Aug 2026 · 11:45 AM', generatedBy: 'Arjun Kapoor' },
    { id: 'RPT-1006', name: 'Loan Collection Report', category: 'Finance', scope: 'Loans and repayments', output: 'Installment due, paid, overdue and outstanding amounts', description: 'Repayment schedule and collection performance for active loan accounts.', lastGenerated: '22 Aug 2026 · 06:00 PM', generatedBy: 'Arjun Kapoor' },
    { id: 'RPT-1007', name: 'Withdrawal Report', category: 'Finance', scope: 'Withdrawals', output: 'Requests, approvals, rejections and settlement references', description: 'Review withdrawal requests and the complete approval trail.', lastGenerated: '19 Aug 2026 · 03:30 PM', generatedBy: 'Arjun Kapoor' },
    { id: 'RPT-1008', name: 'Pending Collection Report', category: 'Compliance', scope: 'Review and reconciliation', output: 'Pending entries, failed sync and unresolved variances', description: 'Exception queue for collection review, reconciliation and audit follow-up.', lastGenerated: '22 Aug 2026 · 06:20 PM', generatedBy: 'Arjun Kapoor' },
];

function ReportsPage() {
    const [reports, setReports] = useState(reportSeed);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'All' | ReportRecord['category']>('All');
    const [scope, setScope] = useState('All scopes');
    const [from, setFrom] = useState('2026-08-01');
    const [to, setTo] = useState('2026-08-22');
    const [format, setFormat] = useState<'PDF' | 'CSV' | 'Excel'>('PDF');
    const [branch, setBranch] = useState('All branches');
    const [agent, setAgent] = useState('All agents');
    const [accountScope, setAccountScope] = useState('All customers and accounts');
    const [fiscalYear, setFiscalYear] = useState('2026-2027');
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [granularity, setGranularity] = useState('Daily');
    const [reportStatus, setReportStatus] = useState('All statuses');
    const [inclusionOptions, setInclusionOptions] = useState('Transactions and audit references');
    const [deliveryDestination, setDeliveryDestination] = useState('Download locally');
    const [reportLabel, setReportLabel] = useState('');
    const [statementType, setStatementType] = useState('Operational report');
    const [correlationReference, setCorrelationReference] = useState('');
    const [selected, setSelected] = useState<ReportRecord | undefined>();
    const [toast, setToast] = useState('');
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const filteredReports = reports.filter((report) => `${report.name} ${report.scope} ${report.output} ${report.description}`.toLowerCase().includes(search.toLowerCase()) && (category === 'All' || report.category === category) && (scope === 'All scopes' || report.scope === scope));
    const generate = (report: ReportRecord) => { const generated = { ...report, branch, agent, customerOrAccountScope: accountScope, fiscalYear, timezone, granularity, statusFilter: reportStatus, inclusionOptions, deliveryDestination, reportLabel, statementType, correlationReference, exportReference: `RPT-LOCAL-${Date.now()}`, lastGenerated: '22 Aug 2026 · 07:05 PM', generatedBy: 'Arjun Kapoor' }; setReports((current) => current.map((row) => row.id === report.id ? generated : row)); setSelected(generated); notify(`${report.name} generated locally as ${format}.`); };
    const exportReport = (report: ReportRecord) => notify(`${report.name} export prepared as ${format} for ${from} to ${to}; destination ${deliveryDestination}.`);
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">REPORTING / STATEMENTS</div><h1>Reports & Statements</h1><p>Generate controlled operational, financial and audit outputs from the cooperative finance workspace.</p></div><button className="primary-button" onClick={() => filteredReports[0] && generate(filteredReports[0])}><Download size={16} /> Generate report</button></div><section className="panel report-controls"><div className="report-control-grid"><label>Reporting period<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To date<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label>Report category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option>All</option><option>Operations</option><option>Finance</option><option>Compliance</option></select></label><label>Output format<select value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option>PDF</option><option>CSV</option><option>Excel</option></select></label><label>Branch<select value={branch} onChange={(event) => setBranch(event.target.value)}><option>All branches</option><option>JPR-CENTRAL</option><option>JPR-NORTH</option></select></label><label>Collection agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><option>All agents</option><option>Arjun Kapoor</option><option>Priya Sharma</option><option>Rajesh Kumar</option></select></label><label>Customer / account scope<select value={accountScope} onChange={(event) => setAccountScope(event.target.value)}><option>All customers and accounts</option><option>Selected customer or account</option><option>Assigned route only</option></select></label><label>Fiscal year<input value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} /></label><label>Timezone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Dubai</option></select></label><label>Granularity<select value={granularity} onChange={(event) => setGranularity(event.target.value)}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label><label>Status filter<select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)}><option>All statuses</option><option>Completed</option><option>Pending</option><option>Review</option></select></label><label>Inclusion options<input value={inclusionOptions} onChange={(event) => setInclusionOptions(event.target.value)} /></label><label>Delivery destination<select value={deliveryDestination} onChange={(event) => setDeliveryDestination(event.target.value)}><option>Download locally</option><option>Configured email</option><option>Statement archive</option></select></label><label>Report label<input value={reportLabel} onChange={(event) => setReportLabel(event.target.value)} placeholder="Optional label" /></label><label>Statement type<select value={statementType} onChange={(event) => setStatementType(event.target.value)}><option>Operational report</option><option>Customer statement</option><option>Account statement</option><option>Audit extract</option></select></label><label>Correlation reference<input value={correlationReference} onChange={(event) => setCorrelationReference(event.target.value)} placeholder="Optional request ID" /></label></div><div className="report-toolbar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search report name, scope or output..." aria-label="Search reports" /></div><select className="filter-button" value={scope} onChange={(event) => setScope(event.target.value)} aria-label="Filter reports by scope"><option>All scopes</option><option>Collections and agents</option><option>Collection agents</option><option>Customers and accounts</option><option>Deposit and RD accounts</option><option>Fixed deposits</option><option>Loans and repayments</option><option>Withdrawals</option><option>Review and reconciliation</option></select><button className="filter-button" onClick={() => notify(`Report period set to ${from} through ${to}.`)}><CalendarDays size={15} /> Apply period</button></div></section><div className="summary-strip"><div className="summary-item"><span>Available reports</span><strong>{reports.length}</strong></div><div className="summary-item"><span>Operational outputs</span><strong className="green">{reports.filter((report) => report.category === 'Operations').length}</strong></div><div className="summary-item"><span>Financial statements</span><strong>{reports.filter((report) => report.category === 'Finance').length}</strong></div><div className="summary-item"><span>Audit / exception views</span><strong className="orange">{reports.filter((report) => report.category === 'Compliance').length}</strong></div></div><div className="report-grid">{filteredReports.map((report) => <section className="panel report-card" key={report.id}><span className={`report-icon report-${report.category.toLowerCase()}`}><FileCheck2 size={18} /></span><div className="report-card-copy"><div className="eyebrow">{report.category} · {report.id}</div><h2>{report.name}</h2><p>{report.description}</p><small>{report.output}</small><small>Last generated {report.lastGenerated} by {report.generatedBy}</small></div><div className="report-card-actions"><button className="icon-button" onClick={() => setSelected(report)} aria-label={`Preview ${report.name}`}><FileCheck2 size={16} /></button><button className="icon-button" onClick={() => generate(report)} aria-label={`Generate ${report.name}`}><Download size={16} /></button></div></section>)}</div>{filteredReports.length === 0 && <section className="panel empty-state"><strong>No reports match the current filters.</strong><span>Adjust the search, category or scope to view available outputs.</span></section>}{selected && <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(undefined); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Report ${selected.name}`}><div className="admin-modal-header"><div><div className="eyebrow">REPORT PREVIEW / {selected.id}</div><h2>{selected.name}</h2><p>{selected.description}</p></div><button className="icon-button" onClick={() => setSelected(undefined)} aria-label="Close report preview">×</button></div><div className="customer-detail-grid"><div><span>Category</span><strong>{selected.category}</strong></div><div><span>Scope</span><strong>{selected.scope}</strong></div><div><span>Period</span><strong>{from} to {to}</strong></div><div><span>Format</span><strong>{format}</strong></div><div><span>Output includes</span><strong>{selected.output}</strong></div><div><span>Generated by</span><strong>{selected.generatedBy}</strong></div><div><span>Generated at</span><strong>{selected.lastGenerated}</strong></div><div><span>Audit status</span><StatusPill status="Completed" /></div><div><span>Branch / agent</span><strong>{selected.branch ?? branch} / {selected.agent ?? agent}</strong></div><div><span>Customer or account scope</span><strong>{selected.customerOrAccountScope ?? accountScope}</strong></div><div><span>Fiscal year / timezone</span><strong>{selected.fiscalYear ?? fiscalYear} / {selected.timezone ?? timezone}</strong></div><div><span>Granularity / status filter</span><strong>{selected.granularity ?? granularity} / {selected.statusFilter ?? reportStatus}</strong></div><div><span>Inclusion / delivery</span><strong>{selected.inclusionOptions ?? inclusionOptions} / {selected.deliveryDestination ?? deliveryDestination}</strong></div><div><span>Statement type / label</span><strong>{selected.statementType ?? statementType} / {selected.reportLabel || reportLabel || 'Not specified'}</strong></div><div><span>Export / correlation reference</span><strong>{selected.exportReference ?? 'Not generated'} / {(selected.correlationReference ?? correlationReference) || 'Not specified'}</strong></div></div><div className="customer-detail-actions"><button className="secondary-button" onClick={() => notify(`${selected.name} preview marked for review.`)}><CheckCircle2 size={15} /> Mark reviewed</button><button className="primary-button" onClick={() => exportReport(selected)}><Download size={15} /> Export {format}</button></div></section></div>}{toast && <div className="admin-toast" role="status"><CheckCircle2 size={16} />{toast}</div>}</div>;
}

type SecurityPolicy = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    value: string;
    mfaMethod?: string;
    recoveryReference?: string;
    policyOwner?: string;
    secondApproverReference?: string;
};

type SecurityRole = {
    id: string;
    name: string;
    members: number;
    scope: string;
    permissions: string[];
    status: Status;
};

type SecuritySession = {
    id: string;
    user: string;
    role: string;
    device: string;
    location: string;
    lastActive: string;
    status: 'Active' | 'Inactive';
    ipAddress?: string;
    userAgent?: string;
    deviceReference?: string;
    loginFailureCount?: string;
    lockoutReference?: string;
};

type SecurityAuditEvent = {
    id: string;
    action: string;
    actor: string;
    target: string;
    date: string;
    requestId: string;
    status: Status;
    approvalReference?: string;
    secondApprover?: string;
    ipAddress?: string;
    userAgent?: string;
    evidenceReference?: string;
};

const securityPolicySeed: SecurityPolicy[] = [
    { id: 'mfa', name: 'Multi-factor authentication', description: 'Require a second factor for administrator and financial approvals.', enabled: true, value: 'Required for admins' },
    { id: 'login', name: 'Failed login protection', description: 'Lock an account after repeated failed authentication attempts.', enabled: true, value: '5 attempts / 15 minutes' },
    { id: 'rotation', name: 'Refresh token rotation', description: 'Rotate sessions when a refresh token is used.', enabled: true, value: 'Enabled' },
    { id: 'approval', name: 'Financial mutation approval', description: 'Require a second approver for withdrawals and reconciliation decisions.', enabled: true, value: 'Dual control' },
];

const securityRoleSeed: SecurityRole[] = [
    { id: 'role-admin', name: 'Super Admin / Proprietor', members: 2, scope: 'All branches and financial operations', permissions: ['Customers', 'Accounts', 'Approvals', 'Reports', 'Security'], status: 'Active' },
    { id: 'role-ops', name: 'Operations Manager', members: 3, scope: 'Assigned branches and collections', permissions: ['Customers', 'Collections', 'Reconciliation', 'Reports'], status: 'Active' },
    { id: 'role-agent', name: 'Collection Agent', members: 18, scope: 'Assigned route and customers only', permissions: ['Assigned customers', 'Mobile collection', 'Own history'], status: 'Active' },
];

const securitySessionSeed: SecuritySession[] = [
    { id: 'SES-8821', user: 'Arjun Kapoor', role: 'Super Admin / Proprietor', device: 'Chrome on Windows', location: 'Jaipur, IN', lastActive: 'Just now', status: 'Active' },
    { id: 'SES-8818', user: 'Priya Sharma', role: 'Operations Manager', device: 'Finora mobile app', location: 'Jaipur, IN', lastActive: '12 minutes ago', status: 'Active' },
    { id: 'SES-8804', user: 'Rajesh Kumar', role: 'Collection Agent', device: 'Finora mobile app', location: 'Jaipur, IN', lastActive: '48 minutes ago', status: 'Active' },
    { id: 'SES-8791', user: 'Unknown device', role: 'Blocked request', device: 'Chrome on Linux', location: 'Delhi, IN', lastActive: '2 hours ago', status: 'Inactive' },
];

const securityAuditSeed: SecurityAuditEvent[] = [
    { id: 'AUD-1081', action: 'MFA challenge completed', actor: 'Arjun Kapoor', target: 'Admin workspace', date: '22 Aug 2026 · 07:12 PM', requestId: 'req_7f2a9c', status: 'Completed' },
    { id: 'AUD-1080', action: 'Role permission viewed', actor: 'Arjun Kapoor', target: 'Collection Agent', date: '22 Aug 2026 · 06:58 PM', requestId: 'req_7f2a82', status: 'Completed' },
    { id: 'AUD-1079', action: 'New agent invitation created', actor: 'Arjun Kapoor', target: 'AGT-0022', date: '22 Aug 2026 · 06:40 PM', requestId: 'req_7f2a71', status: 'Pending' },
    { id: 'AUD-1078', action: 'Login attempt blocked after rate limit', actor: 'System', target: 'Unknown device', date: '22 Aug 2026 · 05:41 PM', requestId: 'req_7f29d0', status: 'Review' },
];

function ScopedSecurityPage() {
    const [policies, setPolicies] = useState(securityPolicySeed);
    const [sessions, setSessions] = useState(securitySessionSeed);
    const [auditEvents, setAuditEvents] = useState(securityAuditSeed);
    const [search, setSearch] = useState('');
    const [auditStatus, setAuditStatus] = useState<'All' | Status>('All');
    const [mfaMethod, setMfaMethod] = useState('Authenticator app');
    const [recoveryReference, setRecoveryReference] = useState('');
    const [sessionIpAddress, setSessionIpAddress] = useState('');
    const [sessionUserAgent, setSessionUserAgent] = useState('');
    const [deviceReference, setDeviceReference] = useState('');
    const [loginFailureEvidence, setLoginFailureEvidence] = useState('');
    const [approvalReference, setApprovalReference] = useState('');
    const [secondApprover, setSecondApprover] = useState('');
    const [toast, setToast] = useState('');
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const togglePolicy = (policy: SecurityPolicy) => { const enabled = !policy.enabled; setPolicies((current) => current.map((row) => row.id === policy.id ? { ...row, enabled, value: enabled ? 'Enabled' : 'Disabled' } : row)); setAuditEvents((current) => [{ id: `AUD-${Date.now()}`, action: `${policy.name} ${enabled ? 'enabled' : 'disabled'}`, actor: 'Arjun Kapoor', target: 'Security policy', date: '22 Aug 2026 · 07:20 PM', requestId: 'req_local', status: 'Completed' }, ...current]); notify(`${policy.name} ${enabled ? 'enabled' : 'disabled'} locally.`); };
    const revokeSession = (session: SecuritySession) => { setSessions((current) => current.map((row) => row.id === session.id ? { ...row, status: 'Inactive', lastActive: 'Revoked just now' } : row)); setAuditEvents((current) => [{ id: `AUD-${Date.now()}`, action: 'Session revoked', actor: 'Arjun Kapoor', target: `${session.user} · ${session.id}`, date: '22 Aug 2026 · 07:20 PM', requestId: 'req_local', status: 'Completed' }, ...current]); notify(`${session.user} session revoked locally.`); };
    const filteredAudit = auditEvents.filter((event) => `${event.action} ${event.actor} ${event.target} ${event.requestId}`.toLowerCase().includes(search.toLowerCase()) && (auditStatus === 'All' || event.status === auditStatus));
    const reviewAudit = () => { setSearch(''); setAuditStatus('All'); document.getElementById('security-audit-log')?.scrollIntoView({ behavior: 'smooth' }); notify('Showing the complete local security audit log.'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">GOVERNANCE / ACCESS CONTROL</div><h1>Security Center</h1><p>Manage authentication posture, role permissions, active sessions and immutable audit activity.</p></div><button className="primary-button" onClick={reviewAudit}><ShieldCheck size={16} /> Review audit log</button></div><div className="security-banner"><div className="security-banner-icon"><ShieldCheck size={24} /></div><div><strong>Workspace security is active</strong><p>Financial actions require authenticated users, permission checks and audit events.</p></div><StatusPill status="Active" /></div><SummaryStrip items={[{ label: 'Protected policies', value: `${policies.filter((policy) => policy.enabled).length}/${policies.length}`, tone: 'green' }, { label: 'Active sessions', value: String(sessions.filter((session) => session.status === 'Active').length) }, { label: 'Roles configured', value: String(securityRoleSeed.length) }, { label: 'Audit events', value: String(auditEvents.length), tone: 'orange' }]} /><div className="security-grid"><DetailCard title="Authentication controls" icon={LockKeyhole}><div className="security-policy-list">{policies.map((policy) => <div className="security-policy-row" key={policy.id}><div><strong>{policy.name}</strong><span>{policy.description}</span><small>{policy.value}</small></div><button className={`security-toggle ${policy.enabled ? 'enabled' : ''}`} onClick={() => togglePolicy(policy)} aria-pressed={policy.enabled}>{policy.enabled ? 'Enabled' : 'Disabled'}</button></div>)}</div></DetailCard><DetailCard title="Role permissions" icon={UsersRound}><div className="security-role-list">{securityRoleSeed.map((role) => <div className="security-role-row" key={role.id}><div><strong>{role.name}</strong><span>{role.members} members · {role.scope}</span><small>{role.permissions.join(' · ')}</small></div><StatusPill status={role.status} /></div>)}</div></DetailCard></div><section className="panel security-session-panel"><div className="panel-heading"><div><h2>Active sessions</h2><p>Review connected devices and revoke access when a session is not recognized.</p></div><button className="filter-button" onClick={() => notify('Session inventory refreshed locally.')}><CheckCircle2 size={15} /> Refresh</button></div><div className="data-table-wrap"><table className="data-table security-session-table"><thead><tr><th>User</th><th>Device / location</th><th>Last active</th><th>Status</th><th /></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td><strong>{session.user}</strong><span>{session.role} · {session.id}</span></td><td><strong>{session.device}</strong><span>{session.location} · {session.deviceReference ?? 'Device reference not captured'}</span><small>{session.ipAddress ?? 'IP not captured'} · {session.userAgent ?? 'User-agent not captured'}</small>{(session.loginFailureCount || session.lockoutReference) && <small>{session.loginFailureCount ?? 'Login evidence'} · {session.lockoutReference ?? 'Lockout reference not captured'}</small>}</td><td>{session.lastActive}</td><td><StatusPill status={session.status === 'Active' ? 'Active' : 'Inactive'} /></td><td>{session.status === 'Active' && <button className="text-button" onClick={() => revokeSession(session)}>Revoke</button>}</td></tr>)}</tbody></table></div></section><section className="panel audit-panel" id="security-audit-log"><div className="panel-heading"><div><h2>Security audit log</h2><p>Authentication, authorization and access-control events with request references.</p></div></div><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actor, target, action or request ID..." aria-label="Search security audit log" /></div><select className="filter-button" value={auditStatus} onChange={(event) => setAuditStatus(event.target.value as typeof auditStatus)} aria-label="Filter security audit events"><option value="All">All event statuses</option><option value="Completed">Completed</option><option value="Pending">Pending</option><option value="Review">Review</option></select></div>{filteredAudit.length ? filteredAudit.map((event) => <div className="audit-row" key={event.id}><span className={`audit-dot ${event.status === 'Review' ? 'warning' : ''}`} /><div><strong>{event.action}</strong><span>{event.actor} · {event.target} · {event.date} · {event.requestId}</span><small>{event.approvalReference ?? 'Approval reference not captured'} · {event.secondApprover ?? 'Second approver not captured'} · {event.ipAddress ?? 'IP not captured'} · {event.evidenceReference ?? 'Evidence reference not captured'}</small></div><StatusPill status={event.status} /></div>) : <div className="empty-state"><strong>No security events found</strong><span>Adjust the audit search or status filter.</span></div>}</section>{toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}

type DepositTransaction = {
    id: string;
    type: 'Deposit entry' | 'Withdrawal';
    amount: number;
    date: string;
    reference: string;
    agent: string;
    status: Status;
    paymentMethod?: string;
    externalReference?: string;
    receiptStatus?: string;
    deviceReference?: string;
    location?: string;
    offlineSyncReference?: string;
    narration?: string;
    supportingDocuments?: string;
    recordedBy?: string;
};

type DepositRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    accountType: 'Savings deposit' | 'Current deposit' | 'Term deposit';
    openingAmount: number;
    balance: number;
    openedOn: string;
    lastEntry: string;
    status: Status;
    transactions: DepositTransaction[];
    productCode?: string;
    branch?: string;
    openingChannel?: string;
    currency?: string;
    interestMethod?: string;
    interestRate?: number;
    interestFrequency?: string;
    minimumBalance?: number;
    charges?: number;
    nomineeName?: string;
    nomineePhone?: string;
    nomineeRelation?: string;
    jointHolderDetails?: string;
    operatingInstructions?: string;
    kycReference?: string;
    documentReferences?: string;
    consentReference?: string;
    openedBy?: string;
};

type DepositInput = Pick<DepositRecord, 'customerId' | 'accountType' | 'openingAmount' | 'openedOn' | 'status'> & Partial<Omit<DepositRecord, 'id' | 'customerId' | 'customerName' | 'customerPhone' | 'accountType' | 'openingAmount' | 'balance' | 'openedOn' | 'lastEntry' | 'status' | 'transactions'>>;

type DepositTransactionInput = Pick<DepositTransaction, 'type' | 'amount' | 'date' | 'reference' | 'agent' | 'status'> & Partial<Omit<DepositTransaction, 'id' | 'type' | 'amount' | 'date' | 'reference' | 'agent' | 'status'>>;

const depositSeed: DepositRecord[] = [
    { id: 'DEP-78144', customerId: 'CUS-10480', customerName: 'Sanjay Rao', customerPhone: '99XXXX4408', accountType: 'Savings deposit', openingAmount: 100000, balance: 146000, openedOn: '2022-11-19', lastEntry: '08 Aug 2026', status: 'Active', transactions: [{ id: 'TXN-20479', type: 'Deposit entry', amount: 5000, date: '08 Aug 2026 · 10:18 AM', reference: 'RCT-88199', agent: 'Amit Verma', status: 'Pending' }, { id: 'TXN-20412', type: 'Deposit entry', amount: 12000, date: '01 Aug 2026 · 11:06 AM', reference: 'RCT-88132', agent: 'Amit Verma', status: 'Completed' }] },
    { id: 'DEP-78143', customerId: 'CUS-10482', customerName: 'Meera Joshi', customerPhone: '98XXXX3210', accountType: 'Savings deposit', openingAmount: 75000, balance: 84000, openedOn: '2024-02-14', lastEntry: '07 Aug 2026', status: 'Active', transactions: [{ id: 'TXN-20402', type: 'Deposit entry', amount: 9000, date: '07 Aug 2026 · 09:42 AM', reference: 'RCT-88122', agent: 'Rajesh Kumar', status: 'Completed' }] },
    { id: 'DEP-78142', customerId: 'CUS-10479', customerName: 'Anita Devi', customerPhone: '96XXXX8821', accountType: 'Current deposit', openingAmount: 50000, balance: 72500, openedOn: '2025-01-08', lastEntry: '06 Aug 2026', status: 'Review', transactions: [{ id: 'TXN-20388', type: 'Deposit entry', amount: 2500, date: '06 Aug 2026 · 09:56 AM', reference: 'RCT-88108', agent: 'Neha Singh', status: 'Review' }] },
    { id: 'DEP-78141', customerId: 'CUS-10478', customerName: 'Ramesh Gupta', customerPhone: '98XXXX7322', accountType: 'Term deposit', openingAmount: 84000, balance: 84000, openedOn: '2021-06-23', lastEntry: '08 Aug 2026', status: 'Inactive', transactions: [] },
];

function DepositModal({ mode, record, onClose, onSave, onToast }: { mode: 'account' | 'transaction'; record?: DepositRecord; onClose: () => void; onSave: (input: DepositInput | DepositTransactionInput) => void; onToast: (message: string) => void }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? 'CUS-10482');
    const [accountType, setAccountType] = useState<DepositRecord['accountType']>(record?.accountType ?? 'Savings deposit');
    const [openingAmount, setOpeningAmount] = useState(String(record?.openingAmount ?? ''));
    const [openedOn, setOpenedOn] = useState(record?.openedOn ?? '2026-08-08');
    const [status, setStatus] = useState<Status>(record?.status ?? 'Active');
    const [productCode, setProductCode] = useState(record?.productCode ?? '');
    const [branch, setBranch] = useState(record?.branch ?? 'Jaipur Main');
    const [openingChannel, setOpeningChannel] = useState(record?.openingChannel ?? 'Branch counter');
    const [currency, setCurrency] = useState(record?.currency ?? 'INR');
    const [interestMethod, setInterestMethod] = useState(record?.interestMethod ?? 'Not applicable');
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? ''));
    const [nomineeName, setNomineeName] = useState(record?.nomineeName ?? '');
    const [nomineePhone, setNomineePhone] = useState(record?.nomineePhone ?? '');
    const [nomineeRelation, setNomineeRelation] = useState(record?.nomineeRelation ?? '');
    const [operatingInstructions, setOperatingInstructions] = useState(record?.operatingInstructions ?? '');
    const [kycReference, setKycReference] = useState(record?.kycReference ?? '');
    const [documentReferences, setDocumentReferences] = useState(record?.documentReferences ?? '');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [externalReference, setExternalReference] = useState('');
    const [deviceReference, setDeviceReference] = useState('');
    const [location, setLocation] = useState('');
    const [narration, setNarration] = useState('');
    const [transactionDocuments, setTransactionDocuments] = useState('');
    const [transactionType, setTransactionType] = useState<DepositTransaction['type']>('Deposit entry');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('2026-08-08');
    const [reference, setReference] = useState('');
    const [agent, setAgent] = useState('Rajesh Kumar');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (mode === 'account') {
            if (!customerId.trim() || !openingAmount || Number(openingAmount) <= 0 || !openedOn) { setError('Customer, opening deposit amount and opening date are required.'); return; }
            onSave({ customerId: customerId.trim(), accountType, openingAmount: Number(openingAmount), openedOn, status, productCode, branch, openingChannel, currency, interestMethod, interestRate: interestRate ? Number(interestRate) : undefined, nomineeName, nomineePhone, nomineeRelation, operatingInstructions, kycReference, documentReferences });
            return;
        }
        if (!record || !amount || Number(amount) <= 0 || !date || !reference.trim()) { setError('Amount, transaction date and reference are required.'); return; }
        onSave({ type: transactionType, amount: Number(amount), date, reference: reference.trim(), agent, status: 'Completed', paymentMethod, externalReference, deviceReference, location, narration, supportingDocuments: transactionDocuments });
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Open deposit account' : 'Record deposit transaction'}><div className="admin-modal-header"><div><div className="eyebrow">DEPOSIT WORKFLOW</div><h2>{mode === 'account' ? 'Open deposit account' : `Record entry · ${record?.id}`}</h2><p>{mode === 'account' ? 'Link a deposit account to a customer and capture its opening details.' : 'Record a customer deposit or withdrawal against the linked account.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}>{mode === 'account' ? <><label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="CUS-10482" /></label><label>Deposit account type<select value={accountType} onChange={(event) => setAccountType(event.target.value as DepositRecord['accountType'])}><option>Savings deposit</option><option>Current deposit</option><option>Term deposit</option></select></label><label>Product / scheme code<input value={productCode} onChange={(event) => setProductCode(event.target.value)} placeholder="SAV-REGULAR" /></label><label>Opening deposit amount<input type="number" min="1" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="100000" /></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} /></label><label>Opening channel<select value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)}><option>Branch counter</option><option>Doorstep agent</option><option>Digital onboarding</option></select></label><label>Currency<input value={currency} onChange={(event) => setCurrency(event.target.value)} /></label><label>Interest method<input value={interestMethod} onChange={(event) => setInterestMethod(event.target.value)} placeholder="Simple / not applicable" /></label><label>Interest rate<input type="number" min="0" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /></label><label>Account status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select></label><label>Account opening date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label>Nominee name<input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} /></label><label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label>Nominee relationship<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} /></label><label>Operating instructions<textarea value={operatingInstructions} onChange={(event) => setOperatingInstructions(event.target.value)} /></label><label>KYC reference<input value={kycReference} onChange={(event) => setKycReference(event.target.value)} /></label><label>Document references<input value={documentReferences} onChange={(event) => setDocumentReferences(event.target.value)} placeholder="KYC, mandate, account form" /></label></> : <><label>Transaction type<select value={transactionType} onChange={(event) => setTransactionType(event.target.value as DepositTransaction['type'])}><option>Deposit entry</option><option>Withdrawal</option></select></label><label>Amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="5000" /></label><label>Transaction date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Agent / entry source<select value={agent} onChange={(event) => setAgent(event.target.value)}><option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option><option>Branch counter</option></select></label><label>Payment method / channel<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Card</option></select></label><label>External reference / UTR<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label><label>Device reference<input value={deviceReference} onChange={(event) => setDeviceReference(event.target.value)} placeholder="DEVICE-AGT-22" /></label><label>Collection location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="GPS or branch location" /></label><label className="full-field">Transaction reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="RCT-88202" /></label><label>Narration<textarea value={narration} onChange={(event) => setNarration(event.target.value)} /></label><label>Supporting documents<input value={transactionDocuments} onChange={(event) => setTransactionDocuments(event.target.value)} placeholder="Receipt or attachment references" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{mode === 'account' ? 'Create deposit account' : 'Save transaction'}</button></div></form></section></div>;
}

function DepositDetail({ record, onClose, onEdit, onTransaction, onToast }: { record: DepositRecord; onClose: () => void; onEdit: () => void; onTransaction: () => void; onToast: (message: string) => void }) {
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Deposit ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">DEPOSIT ACCOUNT / {record.id}</div><h2>{record.customerName}</h2><p>{record.accountType} linked to {record.customerId} · {record.customerPhone}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>Opened {record.openedOn} · Last entry {record.lastEntry}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>Current balance</span><strong>₹{record.balance.toLocaleString('en-IN')}</strong></div><div><span>Opening amount</span><strong>₹{record.openingAmount.toLocaleString('en-IN')}</strong></div><div><span>Account type</span><strong>{record.accountType}</strong></div><div><span>Account status</span><strong>{record.status}</strong></div><div><span>Customer ID</span><strong>{record.customerId}</strong></div><div><span>Transaction records</span><strong>{record.transactions.length}</strong></div><div><span>Product / scheme</span><strong>{record.productCode ?? 'Not captured'}</strong></div><div><span>Branch / opening channel</span><strong>{record.branch ?? 'Not captured'} · {record.openingChannel ?? 'Not captured'}</strong></div><div><span>Currency / interest</span><strong>{record.currency ?? 'Not captured'} · {record.interestMethod ?? 'Not captured'}{record.interestRate !== undefined ? ` · ${record.interestRate}%` : ''}</strong></div><div><span>Nominee</span><strong>{record.nomineeName ?? 'Not captured'}{record.nomineeRelation ? ` · ${record.nomineeRelation}` : ''}{record.nomineePhone ? ` · ${record.nomineePhone}` : ''}</strong></div><div><span>Operating instructions</span><strong>{record.operatingInstructions ?? 'Not captured'}</strong></div><div><span>KYC / documents</span><strong>{record.kycReference ?? 'Not captured'} · {record.documentReferences ?? 'Not captured'}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Deposit transaction history</h3><p>Customer-wise entries recorded against this deposit account.</p></div><span>{record.transactions.length} records</span></div>{record.transactions.length ? <div className="customer-transaction-list">{record.transactions.map((transaction) => <div className="customer-transaction-row" key={transaction.id}><div><strong>{transaction.type}</strong><span>{transaction.id} · {transaction.date}</span></div><div><b>₹{transaction.amount.toLocaleString('en-IN')}</b><small>{transaction.agent} · {transaction.reference} · {transaction.paymentMethod ?? 'Method not captured'} · {transaction.externalReference ?? 'No external reference'} · {transaction.location ?? 'Location not captured'} · {transaction.deviceReference ?? 'Device not captured'}{transaction.offlineSyncReference ? ` · ${transaction.offlineSyncReference}` : ''}{transaction.narration ? ` · ${transaction.narration}` : ''}{transaction.supportingDocuments ? ` · Docs: ${transaction.supportingDocuments}` : ''}</small></div><StatusPill status={transaction.status} /></div>)}</div> : <div className="customer-empty">No deposit transactions recorded for this account.</div>}</section><div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast(`Deposit statement for ${record.id} prepared locally.`)}><Download size={15} /> View / export statement</button><button className="secondary-button" onClick={onEdit}>Edit account</button><button className="primary-button" onClick={onTransaction}><Plus size={15} /> Record transaction</button></div></section></div>;
}

type RDInstallment = {
    id: string;
    dueDate: string;
    paidDate?: string;
    amount: number;
    agent: string;
    reference?: string;
    status: 'Paid' | 'Pending' | 'Overdue';
    paymentMethod?: string;
    externalReference?: string;
    receiptStatus?: string;
    location?: string;
    deviceReference?: string;
    offlineSyncReference?: string;
    supportingDocuments?: string;
    acknowledgmentReference?: string;
    recordedBy?: string;
};

type RDRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    monthlyAmount: number;
    frequency: 'Monthly' | 'Weekly' | 'Quarterly';
    installmentDueDate: string;
    openedOn: string;
    maturityDate: string;
    status: Status;
    installments: RDInstallment[];
    productCode?: string;
    branch?: string;
    tenureMonths?: number;
    installmentCount?: number;
    gracePeriodDays?: number;
    penaltyTerms?: string;
    interestMethod?: string;
    interestRate?: number;
    maturityInstructions?: string;
    nomineeName?: string;
    nomineePhone?: string;
    nomineeRelation?: string;
    autoDebitInstruction?: string;
    openingChannel?: string;
    assignedRoute?: string;
    assignedAgent?: string;
    documentReferences?: string;
    consentReference?: string;
};

type RDInput = Pick<RDRecord, 'customerId' | 'monthlyAmount' | 'frequency' | 'installmentDueDate' | 'openedOn' | 'maturityDate' | 'status'> & Partial<Omit<RDRecord, 'id' | 'customerId' | 'customerName' | 'customerPhone' | 'monthlyAmount' | 'frequency' | 'installmentDueDate' | 'openedOn' | 'maturityDate' | 'status' | 'installments'>>;
type RDCollectionInput = Pick<RDInstallment, 'amount' | 'dueDate' | 'agent'> & { reference: string } & Partial<Omit<RDInstallment, 'id' | 'amount' | 'dueDate' | 'agent' | 'reference' | 'status' | 'paidDate'>>;

const rdSeed: RDRecord[] = [
    { id: 'RD-2024108', customerId: 'CUS-10482', customerName: 'Meera Joshi', customerPhone: '98XXXX3210', monthlyAmount: 3000, frequency: 'Monthly', installmentDueDate: '12', openedOn: '2024-02-14', maturityDate: '2027-02-14', status: 'Active', installments: [{ id: 'RDI-88101', dueDate: '12 Aug 2026', paidDate: '08 Aug 2026', amount: 3000, agent: 'Rajesh Kumar', reference: 'RCT-88201', status: 'Paid' }, { id: 'RDI-88001', dueDate: '12 Jul 2026', paidDate: '12 Jul 2026', amount: 3000, agent: 'Rajesh Kumar', reference: 'RCT-88101', status: 'Paid' }, { id: 'RDI-87901', dueDate: '12 Sep 2026', amount: 3000, agent: 'Rajesh Kumar', status: 'Pending' }] },
    { id: 'RD-2024099', customerId: 'CUS-10479', customerName: 'Anita Devi', customerPhone: '96XXXX8821', monthlyAmount: 2500, frequency: 'Monthly', installmentDueDate: '10', openedOn: '2025-01-08', maturityDate: '2028-01-08', status: 'Pending', installments: [{ id: 'RDI-87801', dueDate: '10 Aug 2026', amount: 2500, agent: 'Neha Singh', reference: 'RCT-88198', status: 'Pending' }, { id: 'RDI-87701', dueDate: '10 Jul 2026', paidDate: '08 Aug 2026', amount: 2500, agent: 'Neha Singh', reference: 'RCT-88188', status: 'Paid' }] },
    { id: 'RD-2024082', customerId: 'CUS-10480', customerName: 'Sanjay Rao', customerPhone: '99XXXX4408', monthlyAmount: 5000, frequency: 'Quarterly', installmentDueDate: '15', openedOn: '2023-11-19', maturityDate: '2026-11-19', status: 'Active', installments: [{ id: 'RDI-87601', dueDate: '15 Aug 2026', paidDate: '07 Aug 2026', amount: 5000, agent: 'Amit Verma', reference: 'RCT-88177', status: 'Paid' }] },
    { id: 'RD-2024017', customerId: 'CUS-10478', customerName: 'Ramesh Gupta', customerPhone: '98XXXX7322', monthlyAmount: 1500, frequency: 'Monthly', installmentDueDate: '05', openedOn: '2022-06-23', maturityDate: '2025-06-23', status: 'Completed', installments: [{ id: 'RDI-80101', dueDate: '05 Jun 2025', paidDate: '05 Jun 2025', amount: 1500, agent: 'Branch counter', reference: 'RCT-87001', status: 'Paid' }] },
];

function RDModal({ mode, record, onClose, onSave }: { mode: 'account' | 'collection'; record?: RDRecord; onClose: () => void; onSave: (input: RDInput | RDCollectionInput) => void }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? 'CUS-10482');
    const [amount, setAmount] = useState(String(record?.monthlyAmount ?? ''));
    const [frequency, setFrequency] = useState<RDRecord['frequency']>(record?.frequency ?? 'Monthly');
    const [dueDay, setDueDay] = useState(record?.installmentDueDate ?? '10');
    const [openedOn, setOpenedOn] = useState(record?.openedOn ?? '2026-08-08');
    const [maturityDate, setMaturityDate] = useState(record?.maturityDate ?? '2029-08-08');
    const [status, setStatus] = useState<Status>(record?.status ?? 'Active');
    const [agent, setAgent] = useState('Rajesh Kumar');
    const [reference, setReference] = useState('');
    const [productCode, setProductCode] = useState(record?.productCode ?? 'RD-REGULAR');
    const [branch, setBranch] = useState(record?.branch ?? 'Jaipur Main');
    const [tenureMonths, setTenureMonths] = useState(String(record?.tenureMonths ?? ''));
    const [installmentCount, setInstallmentCount] = useState(String(record?.installmentCount ?? ''));
    const [interestMethod, setInterestMethod] = useState(record?.interestMethod ?? 'Scheme rate');
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? ''));
    const [penaltyTerms, setPenaltyTerms] = useState(record?.penaltyTerms ?? '');
    const [maturityInstructions, setMaturityInstructions] = useState(record?.maturityInstructions ?? 'Payout at maturity');
    const [nomineeName, setNomineeName] = useState(record?.nomineeName ?? '');
    const [nomineePhone, setNomineePhone] = useState(record?.nomineePhone ?? '');
    const [openingChannel, setOpeningChannel] = useState(record?.openingChannel ?? 'Branch counter');
    const [documentReferences, setDocumentReferences] = useState(record?.documentReferences ?? '');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [externalReference, setExternalReference] = useState('');
    const [location, setLocation] = useState('');
    const [deviceReference, setDeviceReference] = useState('');
    const [offlineSyncReference, setOfflineSyncReference] = useState('');
    const [collectionDocuments, setCollectionDocuments] = useState('');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!amount || Number(amount) <= 0 || !dueDay) { setError('Installment amount and due day are required.'); return; }
        if (mode === 'account') { if (!customerId.trim() || !openedOn || !maturityDate) { setError('Customer mapping and account dates are required.'); return; } onSave({ customerId: customerId.trim(), monthlyAmount: Number(amount), frequency, installmentDueDate: dueDay, openedOn, maturityDate, status, productCode, branch, tenureMonths: tenureMonths ? Number(tenureMonths) : undefined, installmentCount: installmentCount ? Number(installmentCount) : undefined, interestMethod, interestRate: interestRate ? Number(interestRate) : undefined, penaltyTerms, maturityInstructions, nomineeName, nomineePhone, openingChannel, documentReferences }); return; }
        if (!record || !reference.trim()) { setError('Receipt reference is required for collection entry.'); return; }
        onSave({ amount: Number(amount), dueDate: dueDay, agent, reference: reference.trim(), paymentMethod, externalReference, location, deviceReference, offlineSyncReference, supportingDocuments: collectionDocuments, recordedBy: agent });
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Open recurring deposit' : 'Record RD installment'}><div className="admin-modal-header"><div><div className="eyebrow">RD WORKFLOW</div><h2>{mode === 'account' ? 'Open recurring deposit account' : `Record installment · ${record?.id}`}</h2><p>{mode === 'account' ? 'Map the RD to a customer and define its collection schedule.' : 'Capture a paid installment collected by branch or doorstep agent.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}>{mode === 'account' ? <><label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="CUS-10482" /></label><label>Installment amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="3000" /></label><label>Installment frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as RDRecord['frequency'])}><option>Monthly</option><option>Weekly</option><option>Quarterly</option></select></label><label>Installment due day<input value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="10" /></label><label>Account opening date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label>Maturity date<input type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} /></label><label>Product / scheme code<input value={productCode} onChange={(event) => setProductCode(event.target.value)} /></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} /></label><label>Tenure months<input type="number" min="1" value={tenureMonths} onChange={(event) => setTenureMonths(event.target.value)} /></label><label>Number of installments<input type="number" min="1" value={installmentCount} onChange={(event) => setInstallmentCount(event.target.value)} /></label><label>Interest method<input value={interestMethod} onChange={(event) => setInterestMethod(event.target.value)} /></label><label>Interest rate<input type="number" min="0" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /></label><label>Penalty / late-fee terms<input value={penaltyTerms} onChange={(event) => setPenaltyTerms(event.target.value)} /></label><label>Maturity instructions<input value={maturityInstructions} onChange={(event) => setMaturityInstructions(event.target.value)} /></label><label>Nominee name<input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} /></label><label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label>Opening channel<input value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)} /></label><label>Document references<input value={documentReferences} onChange={(event) => setDocumentReferences(event.target.value)} /></label><label>RD account status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Active</option><option>Pending</option><option>Review</option><option>Inactive</option></select></label></> : <><label>Installment amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Installment due date<input value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="12 Aug 2026" /></label><label>Collection agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option><option>Branch counter</option></select></label><label>Payment method / channel<input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /></label><label>External reference / UTR<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label><label>Collection location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label><label>Device reference<input value={deviceReference} onChange={(event) => setDeviceReference(event.target.value)} /></label><label>Offline sync reference<input value={offlineSyncReference} onChange={(event) => setOfflineSyncReference(event.target.value)} /></label><label>Supporting documents<input value={collectionDocuments} onChange={(event) => setCollectionDocuments(event.target.value)} /></label><label>Receipt / transaction reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="RCT-88210" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{mode === 'account' ? 'Create RD account' : 'Record installment'}</button></div></form></section></div>;
}

function RDDetail({ record, onClose, onEdit, onCollection, onToast }: { record: RDRecord; onClose: () => void; onEdit: () => void; onCollection: () => void; onToast: (message: string) => void }) {
    const paid = record.installments.filter((item) => item.status === 'Paid').length;
    const pending = record.installments.filter((item) => item.status !== 'Paid').length;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`RD ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">RECURRING DEPOSIT / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} · {record.customerPhone} · Customer-wise RD history</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>{record.frequency} collection · due day {record.installmentDueDate}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>RD installment amount</span><strong>₹{record.monthlyAmount.toLocaleString('en-IN')}</strong></div><div><span>Paid installments</span><strong className="green-text">{paid}</strong></div><div><span>Pending installments</span><strong className="orange-text">{pending}</strong></div><div><span>Account status</span><strong>{record.status}</strong></div><div><span>Opened on</span><strong>{record.openedOn}</strong></div><div><span>Maturity date</span><strong>{record.maturityDate}</strong></div><div><span>Product / branch</span><strong>{record.productCode ?? 'Not captured'} · {record.branch ?? 'Not captured'}</strong></div><div><span>Tenure / installments</span><strong>{record.tenureMonths ?? 'Not captured'} months · {record.installmentCount ?? 'Not captured'} installments</strong></div><div><span>Interest terms</span><strong>{record.interestMethod ?? 'Not captured'}{record.interestRate !== undefined ? ` · ${record.interestRate}%` : ''}</strong></div><div><span>Nominee</span><strong>{record.nomineeName ?? 'Not captured'}{record.nomineePhone ? ` · ${record.nomineePhone}` : ''}</strong></div><div><span>Maturity / penalty terms</span><strong>{record.maturityInstructions ?? 'Not captured'} · {record.penaltyTerms ?? 'Not captured'}</strong></div><div><span>Channel / documents</span><strong>{record.openingChannel ?? 'Not captured'} · {record.documentReferences ?? 'Not captured'}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Installment collection history</h3><p>Paid and pending entries with agent and receipt audit fields.</p></div><span>{record.installments.length} installments</span></div><div className="customer-transaction-list">{record.installments.map((item) => <div className="customer-transaction-row" key={item.id}><div><strong>{item.id}</strong><span>Due {item.dueDate}{item.paidDate ? ` · Paid ${item.paidDate}` : ''}</span></div><div><b>₹{item.amount.toLocaleString('en-IN')}</b><small>{item.agent}{item.reference ? ` · ${item.reference}` : ''} · {item.paymentMethod ?? 'Method not captured'} · {item.externalReference ?? 'No external reference'} · {item.location ?? 'Location not captured'} · {item.deviceReference ?? 'Device not captured'}{item.offlineSyncReference ? ` · ${item.offlineSyncReference}` : ''}{item.supportingDocuments ? ` · Docs: ${item.supportingDocuments}` : ''}</small></div><StatusPill status={item.status === 'Paid' ? 'Completed' : item.status === 'Overdue' ? 'Overdue' : 'Pending'} /></div>)}</div></section><div className="customer-detail-actions rd-detail-actions"><button className="secondary-button" onClick={() => onToast('RD statement prepared locally for export.')}>View / export statement</button><button className="secondary-button" onClick={onEdit}>Edit RD account</button><button className="primary-button" onClick={onCollection}><ArrowDownToLine size={15} /> Record installment</button></div></section></div>;
}

function RecurringDepositsPage() {
    const [rdRows, setRdRows] = useState<RDRecord[]>(rdSeed);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'account' | 'collection' | 'detail' | null>(null);
    const [selected, setSelected] = useState<RDRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = rdRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.frequency} ${row.installmentDueDate} ${row.installments.map((item) => `${item.id} ${item.agent} ${item.reference ?? ''} ${item.dueDate}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const paidCount = rdRows.reduce((total, row) => total + row.installments.filter((item) => item.status === 'Paid').length, 0);
    const pendingItems = rdRows.flatMap((row) => row.installments).filter((item) => item.status !== 'Paid');
    const saveAccount = (input: RDInput) => { const customer = customerSeed.find((row) => row.id === input.customerId); const id = `RD-${2024109 + rdRows.length}`; setRdRows((current) => [{ id, ...input, customerId: input.customerId, customerName: customer?.primary ?? input.customerId, customerPhone: customer?.secondary.split('·')[1]?.trim() ?? 'Not available', monthlyAmount: input.monthlyAmount, frequency: input.frequency, installmentDueDate: input.installmentDueDate, openedOn: input.openedOn, maturityDate: input.maturityDate, status: input.status, installments: [] }, ...current]); setPage(1); close(); notify('RD account created locally.'); };
    const saveCollection = (input: RDCollectionInput) => { if (!selected) return; const installment: RDInstallment = { ...input, id: `RDI-${88200 + selected.installments.length + rdRows.length}`, dueDate: input.dueDate, paidDate: '22 Aug 2026', amount: input.amount, agent: input.agent, reference: input.reference, status: 'Paid' }; setRdRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: 'Active', installments: [installment, ...row.installments] } : row)); close(); notify('RD installment recorded locally.'); };
    const openDetail = (record: RDRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / RECURRING DEPOSITS</div><h1>Recurring Deposits</h1><p>Manage RD accounts, installment schedules, doorstep collections and customer history.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Open RD account</button></div><SummaryStrip items={[{ label: 'Active RD accounts', value: String(rdRows.filter((row) => row.status === 'Active').length), tone: 'green' }, { label: 'Paid installments', value: String(paidCount) }, { label: 'Pending installments', value: String(pendingItems.length), tone: 'orange' }, { label: 'Collection due', value: `₹${pendingItems.reduce((total, item) => total + item.amount, 0).toLocaleString('en-IN')}`, tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search RD, customer, agent or receipt..." aria-label="Search recurring deposits" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter RD accounts by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Completed">Completed</option><option value="Review">Review</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Date range selector is ready for local RD data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Pending'); setPage(1); notify('Showing RD accounts with pending installments.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} RD account records prepared for export.`)} aria-label="Export RD data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>RD account / customer</th><th>Installment</th><th>Schedule</th><th>Paid / pending</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => { const paid = row.installments.filter((item) => item.status === 'Paid').length; const pending = row.installments.filter((item) => item.status !== 'Paid').length; return <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.customerPhone}</span><small>{row.id}</small></td><td className="table-amount">₹{row.monthlyAmount.toLocaleString('en-IN')}</td><td className="table-muted">{row.frequency} · due {row.installmentDueDate}<br />Matures {row.maturityDate}</td><td className="rd-counts"><span className="green-text">{paid} paid</span><span className="orange-text">{pending} pending</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>; }) : <tr><td className="empty-state" colSpan={6}>No RD accounts match the current search and status filter.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {visibleRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} RD accounts</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={`pagination-button ${page === item ? 'selected' : ''}`} key={item} onClick={() => setPage(item)}>{item}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'account' && <RDModal mode="account" onClose={close} onSave={(input) => saveAccount(input as RDInput)} />}{modal === 'collection' && selected && <RDModal mode="collection" record={selected} onClose={close} onSave={(input) => saveCollection(input as RDCollectionInput)} />}{modal === 'detail' && selected && <RDDetail record={rdRows.find((row) => row.id === selected.id) ?? selected} onClose={close} onEdit={() => setModal('account')} onCollection={() => setModal('collection')} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={15} />{toast}</div>}</div>;
}

type FDEvent = {
    id: string;
    type: 'Opened' | 'Renewed' | 'Interest credited' | 'Closed' | 'Payout';
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

type FDRecord = {
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

type FDInput = Pick<FDRecord, 'customerId' | 'principal' | 'tenureMonths' | 'interestRate' | 'openedOn' | 'maturityDate' | 'nomineeName' | 'nomineeRelation' | 'payoutInstruction' | 'status'> & Partial<Omit<FDRecord, 'id' | 'customerId' | 'customerName' | 'customerPhone' | 'principal' | 'tenureMonths' | 'interestRate' | 'openedOn' | 'maturityDate' | 'maturityAmount' | 'nomineeName' | 'nomineeRelation' | 'payoutInstruction' | 'status' | 'events'>>;
type FDActionInput = { action: 'Renew' | 'Close' | 'Payout'; reference: string; date: string; note: string } & Partial<Pick<FDEvent, 'authorizationReference' | 'approvalReference' | 'paymentMethod' | 'destinationAccount' | 'externalReference' | 'supportingDocuments' | 'consentReference'>>;

const fdSeed: FDRecord[] = [
    { id: 'FD-2024071', customerId: 'CUS-10480', customerName: 'Sanjay Rao', customerPhone: '99XXXX4408', principal: 100000, tenureMonths: 24, interestRate: 7.5, openedOn: '2024-07-18', maturityDate: '2026-07-18', maturityAmount: 115320, nomineeName: 'Asha Rao', nomineeRelation: 'Partner', payoutInstruction: 'Payout at maturity', status: 'Review', events: [{ id: 'FDE-901', type: 'Opened', date: '18 Jul 2024', amount: 100000, reference: 'FD-OPEN-4071', performedBy: 'Arjun Kapoor', note: 'Fixed deposit account opened.' }, { id: 'FDE-902', type: 'Interest credited', date: '18 Jul 2025', amount: 7500, reference: 'INT-4071', performedBy: 'System', note: 'Annual interest accrual recorded.' }] },
    { id: 'FD-2024062', customerId: 'CUS-10482', customerName: 'Meera Joshi', customerPhone: '98XXXX3210', principal: 250000, tenureMonths: 36, interestRate: 8, openedOn: '2024-02-14', maturityDate: '2027-02-14', maturityAmount: 315000, nomineeName: 'Ritu Joshi', nomineeRelation: 'Spouse', payoutInstruction: 'Renew principal + interest', status: 'Active', events: [{ id: 'FDE-903', type: 'Opened', date: '14 Feb 2024', amount: 250000, reference: 'FD-OPEN-4062', performedBy: 'Arjun Kapoor', note: 'Fixed deposit account opened.' }] },
    { id: 'FD-2023055', customerId: 'CUS-10479', customerName: 'Anita Devi', customerPhone: '96XXXX8821', principal: 75000, tenureMonths: 12, interestRate: 7.25, openedOn: '2025-01-08', maturityDate: '2026-01-08', maturityAmount: 80438, nomineeName: 'Mohan Devi', nomineeRelation: 'Parent', payoutInstruction: 'Payout at maturity', status: 'Completed', events: [{ id: 'FDE-904', type: 'Opened', date: '08 Jan 2025', amount: 75000, reference: 'FD-OPEN-3055', performedBy: 'Neha Singh', note: 'Fixed deposit account opened.' }, { id: 'FDE-905', type: 'Payout', date: '08 Jan 2026', amount: 80438, reference: 'PAY-3055', performedBy: 'Neha Singh', note: 'Maturity payout completed.' }] },
    { id: 'FD-2022088', customerId: 'CUS-10478', customerName: 'Ramesh Gupta', customerPhone: '98XXXX7322', principal: 50000, tenureMonths: 24, interestRate: 6.75, openedOn: '2024-06-23', maturityDate: '2026-06-23', maturityAmount: 56750, nomineeName: 'Suresh Gupta', nomineeRelation: 'Sibling', payoutInstruction: 'Renew principal', status: 'Pending', events: [{ id: 'FDE-906', type: 'Opened', date: '23 Jun 2024', amount: 50000, reference: 'FD-OPEN-2088', performedBy: 'Branch counter', note: 'Maturity instruction pending approval.' }] },
];

function FDModal({ mode, record, onClose, onSave }: { mode: 'account' | 'action'; record?: FDRecord; onClose: () => void; onSave: (input: FDInput | FDActionInput) => void }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? 'CUS-10482');
    const [principal, setPrincipal] = useState(String(record?.principal ?? ''));
    const [tenureMonths, setTenureMonths] = useState(String(record?.tenureMonths ?? 12));
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? 7.5));
    const [openedOn, setOpenedOn] = useState(record?.openedOn ?? '2026-08-22');
    const [maturityDate, setMaturityDate] = useState(record?.maturityDate ?? '2027-08-22');
    const [nomineeName, setNomineeName] = useState(record?.nomineeName ?? '');
    const [nomineeRelation, setNomineeRelation] = useState(record?.nomineeRelation ?? '');
    const [payoutInstruction, setPayoutInstruction] = useState<FDRecord['payoutInstruction']>(record?.payoutInstruction ?? 'Payout at maturity');
    const [status, setStatus] = useState<Status>(record?.status ?? 'Active');
    const [productCode, setProductCode] = useState(record?.productCode ?? 'FD-REGULAR');
    const [branch, setBranch] = useState(record?.branch ?? 'Jaipur Main');
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
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (mode === 'account') {
            if (!customerId.trim() || !principal || Number(principal) <= 0 || !openedOn || !maturityDate || !nomineeName.trim() || !nomineeRelation.trim()) { setError('Customer, principal, dates and complete nominee details are required.'); return; }
            onSave({ customerId: customerId.trim(), principal: Number(principal), tenureMonths: Number(tenureMonths), interestRate: Number(interestRate), openedOn, maturityDate, nomineeName: nomineeName.trim(), nomineeRelation: nomineeRelation.trim(), payoutInstruction, status, productCode, branch, openingChannel, interestMethod, compoundingFrequency, specialRateReference, taxIdentifier, taxWithholdingInstruction, nomineePhone, nomineeAddress, nomineeIdentityReference, nomineeDocumentReferences, payoutMethod, payoutAccountReference, lienDetails, prematureClosureTerms, renewalInstructions, authorizationReference, documentReferences, consentReference });
            return;
        }
        if (!record || !reference.trim() || !note.trim()) { setError('Reference and action note are required for an audited FD action.'); return; }
        onSave({ action, reference: reference.trim(), date: openedOn, note: note.trim(), authorizationReference, approvalReference, paymentMethod, destinationAccount, externalReference, supportingDocuments, consentReference: actionConsentReference });
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Open fixed deposit' : 'Fixed deposit lifecycle action'}><div className="admin-modal-header"><div><div className="eyebrow">FD WORKFLOW</div><h2>{mode === 'account' ? 'Open fixed deposit account' : `${action} · ${record?.id}`}</h2><p>{mode === 'account' ? 'Capture principal, rate, maturity and beneficiary information.' : 'Record a controlled renewal, closure or maturity payout action.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}>{mode === 'account' ? <><label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="CUS-10480" /></label><label>Principal amount<input type="number" min="1" value={principal} onChange={(event) => setPrincipal(event.target.value)} placeholder="100000" /></label><label>Tenure (months)<input type="number" min="1" value={tenureMonths} onChange={(event) => setTenureMonths(event.target.value)} /></label><label>Interest rate (% p.a.)<input type="number" min="0" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /></label><label>Opening date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label>Maturity date<input type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} /></label><label>Product / scheme code<input value={productCode} onChange={(event) => setProductCode(event.target.value)} /></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} /></label><label>Opening channel<input value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)} /></label><label>Interest method<input value={interestMethod} onChange={(event) => setInterestMethod(event.target.value)} /></label><label>Compounding frequency<input value={compoundingFrequency} onChange={(event) => setCompoundingFrequency(event.target.value)} /></label><label>Special-rate reference<input value={specialRateReference} onChange={(event) => setSpecialRateReference(event.target.value)} /></label><label>Tax identifier / PAN<input value={taxIdentifier} onChange={(event) => setTaxIdentifier(event.target.value)} /></label><label>Tax withholding instruction<input value={taxWithholdingInstruction} onChange={(event) => setTaxWithholdingInstruction(event.target.value)} /></label><label>Nominee / beneficiary name<input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} placeholder="Nominee name" /></label><label>Nominee relationship<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} placeholder="Spouse, parent..." /></label><label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label>Nominee address<input value={nomineeAddress} onChange={(event) => setNomineeAddress(event.target.value)} /></label><label>Nominee identity reference<input value={nomineeIdentityReference} onChange={(event) => setNomineeIdentityReference(event.target.value)} /></label><label>Nominee document references<input value={nomineeDocumentReferences} onChange={(event) => setNomineeDocumentReferences(event.target.value)} /></label><label>Payout method<input value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)} /></label><label>Payout account reference<input value={payoutAccountReference} onChange={(event) => setPayoutAccountReference(event.target.value)} /></label><label>Lien details<textarea value={lienDetails} onChange={(event) => setLienDetails(event.target.value)} /></label><label>Premature closure terms<textarea value={prematureClosureTerms} onChange={(event) => setPrematureClosureTerms(event.target.value)} /></label><label>Renewal instructions<textarea value={renewalInstructions} onChange={(event) => setRenewalInstructions(event.target.value)} /></label><label>Authorization reference<input value={authorizationReference} onChange={(event) => setAuthorizationReference(event.target.value)} /></label><label>Document references<input value={documentReferences} onChange={(event) => setDocumentReferences(event.target.value)} /></label><label>Consent reference<input value={consentReference} onChange={(event) => setConsentReference(event.target.value)} /></label><label>Payout instruction<select value={payoutInstruction} onChange={(event) => setPayoutInstruction(event.target.value as FDRecord['payoutInstruction'])}><option>Renew principal</option><option>Payout at maturity</option><option>Renew principal + interest</option></select></label><label>Account status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Active</option><option>Pending</option><option>Review</option><option>Inactive</option></select></label></> : <><label>Lifecycle action<select value={action} onChange={(event) => setAction(event.target.value as FDActionInput['action'])}><option>Renew</option><option>Close</option><option>Payout</option></select></label><label>Action date<input type="date" value={openedOn} onChange={(event) => setOpenedOn(event.target.value)} /></label><label>Reference / authorization ID<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="AUTH-FD-88210" /></label><label>Approval reference<input value={approvalReference} onChange={(event) => setApprovalReference(event.target.value)} /></label><label>Payment / payout method<input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /></label><label>Destination account<input value={destinationAccount} onChange={(event) => setDestinationAccount(event.target.value)} /></label><label>External transfer reference<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label><label>Supporting documents<input value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} /></label><label>Consent / acknowledgment reference<input value={actionConsentReference} onChange={(event) => setActionConsentReference(event.target.value)} /></label><label className="full-field">Action note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record authorization, payout destination or renewal instruction" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{mode === 'account' ? 'Create FD account' : `Save ${action.toLowerCase()} action`}</button></div></form></section></div>;
}

function FDDetail({ record, onClose, onEdit, onAction, onToast }: { record: FDRecord; onClose: () => void; onEdit: () => void; onAction: () => void; onToast: (message: string) => void }) {
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`FD ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">FIXED DEPOSIT / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} · {record.customerPhone} · Principal and maturity lifecycle</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>{record.tenureMonths} months · {record.interestRate}% p.a. · Matures {record.maturityDate}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>Principal amount</span><strong>₹{record.principal.toLocaleString('en-IN')}</strong></div><div><span>Maturity amount</span><strong className="green-text">₹{record.maturityAmount.toLocaleString('en-IN')}</strong></div><div><span>Interest rate</span><strong>{record.interestRate}% p.a.</strong></div><div><span>Tenure</span><strong>{record.tenureMonths} months</strong></div><div><span>Nominee / beneficiary</span><strong>{record.nomineeName} · {record.nomineeRelation}</strong></div><div><span>Payout instruction</span><strong>{record.payoutInstruction}</strong></div><div><span>Opened on</span><strong>{record.openedOn}</strong></div><div><span>Maturity date</span><strong>{record.maturityDate}</strong></div><div><span>Product / branch</span><strong>{record.productCode ?? 'Not captured'} · {record.branch ?? 'Not captured'}</strong></div><div><span>Opening channel</span><strong>{record.openingChannel ?? 'Not captured'}</strong></div><div><span>Interest terms</span><strong>{record.interestMethod ?? 'Not captured'} · {record.compoundingFrequency ?? 'Not captured'}</strong></div><div><span>Tax / special rate</span><strong>{record.taxIdentifier ?? 'Not captured'} · {record.specialRateReference ?? 'Not captured'}</strong></div><div><span>Nominee contact</span><strong>{record.nomineePhone ?? 'Not captured'} · {record.nomineeAddress ?? 'Not captured'}</strong></div><div><span>Nominee identity / documents</span><strong>{record.nomineeIdentityReference ?? 'Not captured'} · {record.nomineeDocumentReferences ?? 'Not captured'}</strong></div><div><span>Payout details</span><strong>{record.payoutMethod ?? 'Not captured'} · {record.payoutAccountReference ?? 'Not captured'}</strong></div><div><span>Closure / renewal terms</span><strong>{record.prematureClosureTerms ?? 'Not captured'} · {record.renewalInstructions ?? 'Not captured'}</strong></div><div><span>Lien / authorization</span><strong>{record.lienDetails ?? 'Not captured'} · {record.authorizationReference ?? 'Not captured'}</strong></div><div><span>Documents / consent</span><strong>{record.documentReferences ?? 'Not captured'} · {record.consentReference ?? 'Not captured'}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>FD account history</h3><p>Lifecycle events, interest entries and authorization references.</p></div><span>{record.events.length} events</span></div><div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.note}</span></div><div><b>₹{event.amount.toLocaleString('en-IN')}</b><small>{event.reference} · {event.performedBy}{event.authorizationReference ? ` · Auth: ${event.authorizationReference}` : ''}{event.approvalReference ? ` · Approval: ${event.approvalReference}` : ''}{event.paymentMethod ? ` · ${event.paymentMethod}` : ''}{event.destinationAccount ? ` · Destination: ${event.destinationAccount}` : ''}{event.externalReference ? ` · ${event.externalReference}` : ''}{event.supportingDocuments ? ` · Docs: ${event.supportingDocuments}` : ''}{event.consentReference ? ` · Consent: ${event.consentReference}` : ''}</small></div><StatusPill status={event.type === 'Closed' || event.type === 'Payout' ? 'Completed' : 'Active'} /></div>)}</div></section><div className="customer-detail-actions fd-detail-actions"><button className="secondary-button" onClick={() => onToast('FD certificate and statement prepared locally.')}>View / export statement</button><button className="secondary-button" onClick={onEdit}>Edit FD account</button><button className="primary-button" onClick={onAction}><FileCheck2 size={15} /> Renewal / closure / payout</button></div></section></div>;
}

function FixedDepositsPage() {
    const [fdRows, setFdRows] = useState<FDRecord[]>(fdSeed);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'account' | 'action' | 'detail' | null>(null);
    const [selected, setSelected] = useState<FDRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = fdRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.nomineeName} ${row.payoutInstruction} ${row.events.map((event) => `${event.reference} ${event.performedBy} ${event.type}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const activeCount = fdRows.filter((row) => row.status === 'Active').length;
    const maturityReviewCount = fdRows.filter((row) => row.status === 'Review' || row.status === 'Pending').length;
    const totalPrincipal = fdRows.reduce((total, row) => total + row.principal, 0);
    const maturityValue = fdRows.filter((row) => row.status !== 'Completed').reduce((total, row) => total + row.maturityAmount, 0);
    const saveAccount = (input: FDInput) => { const customer = customerSeed.find((row) => row.id === input.customerId); const id = `FD-${2024072 + fdRows.length}`; const estimatedMaturity = Math.round(input.principal + (input.principal * input.interestRate * input.tenureMonths) / 1200); const event: FDEvent = { id: `FDE-${920 + fdRows.length}`, type: 'Opened', date: input.openedOn, amount: input.principal, reference: `FD-OPEN-${id.slice(-4)}`, performedBy: 'Admin workspace', note: 'Fixed deposit account opened locally.', authorizationReference: input.authorizationReference, supportingDocuments: input.documentReferences, consentReference: input.consentReference }; setFdRows((current) => [{ id, ...input, customerId: input.customerId, customerName: customer?.primary ?? input.customerId, customerPhone: customer?.secondary.split('·')[1]?.trim() ?? 'Not available', principal: input.principal, tenureMonths: input.tenureMonths, interestRate: input.interestRate, openedOn: input.openedOn, maturityDate: input.maturityDate, maturityAmount: estimatedMaturity, nomineeName: input.nomineeName, nomineeRelation: input.nomineeRelation, payoutInstruction: input.payoutInstruction, status: input.status, events: [event] }, ...current]); setPage(1); close(); notify('FD account created locally.'); };
    const saveAction = (input: FDActionInput) => { if (!selected) return; const event: FDEvent = { id: `FDE-${940 + selected.events.length + fdRows.length}`, type: input.action === 'Renew' ? 'Renewed' : input.action === 'Close' ? 'Closed' : 'Payout', date: input.date, amount: input.action === 'Payout' ? selected.maturityAmount : selected.principal, reference: input.reference, performedBy: 'Admin workspace', note: input.note, authorizationReference: input.authorizationReference, approvalReference: input.approvalReference, paymentMethod: input.paymentMethod, destinationAccount: input.destinationAccount, externalReference: input.externalReference, supportingDocuments: input.supportingDocuments, consentReference: input.consentReference }; const nextStatus: Status = input.action === 'Renew' ? 'Active' : 'Completed'; setFdRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: nextStatus, events: [event, ...row.events] } : row)); close(); notify(`FD ${input.action.toLowerCase()} action recorded locally.`); };
    const openDetail = (record: FDRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / FIXED DEPOSITS</div><h1>Fixed Deposits</h1><p>Manage principal, interest, maturity, nominee, payout and FD lifecycle controls.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Open FD account</button></div><SummaryStrip items={[{ label: 'Active FD accounts', value: String(activeCount), tone: 'green' }, { label: 'Total principal', value: `₹${(totalPrincipal / 100000).toFixed(2)}L` }, { label: 'Maturity / review', value: String(maturityReviewCount), tone: 'orange' }, { label: 'Maturity value', value: `₹${(maturityValue / 100000).toFixed(2)}L`, tone: 'green' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search FD, customer, nominee or reference..." aria-label="Search fixed deposits" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter FD accounts by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Completed">Completed</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Maturity date range selector is ready for local FD data.')}><CalendarDays size={15} /> Maturity range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); notify('Showing FD accounts requiring maturity review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} FD account records prepared for export.`)} aria-label="Export FD data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>FD account / customer</th><th>Principal</th><th>Rate / tenure</th><th>Maturity</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.customerPhone}</span><small>{row.id} · Nominee {row.nomineeName}</small></td><td className="table-amount">₹{row.principal.toLocaleString('en-IN')}</td><td className="table-muted">{row.interestRate}% p.a. · {row.tenureMonths} months</td><td className="table-muted"><strong className="fd-maturity-amount">₹{row.maturityAmount.toLocaleString('en-IN')}</strong><span>{row.maturityDate}</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>) : <tr><td className="empty-state" colSpan={6}>No FD accounts match the current search and status filter.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {visibleRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} FD accounts</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={`pagination-button ${page === item ? 'selected' : ''}`} key={item} onClick={() => setPage(item)}>{item}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'account' && <FDModal mode="account" onClose={close} onSave={(input) => saveAccount(input as FDInput)} />}{modal === 'action' && selected && <FDModal mode="action" record={selected} onClose={close} onSave={(input) => saveAction(input as FDActionInput)} />}{modal === 'detail' && selected && <FDDetail record={fdRows.find((row) => row.id === selected.id) ?? selected} onClose={close} onEdit={() => setModal('account')} onAction={() => setModal('action')} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={15} />{toast}</div>}</div>;
}

type LoanInstallment = {
    id: string;
    dueDate: string;
    paidDate?: string;
    amount: number;
    principal: number;
    interest: number;
    penalty?: number;
    agent: string;
    reference?: string;
    status: 'Paid' | 'Pending' | 'Overdue';
};

type LoanLifecycle = 'Application' | 'Underwriting' | 'Approved' | 'Disbursed' | 'Active' | 'Overdue' | 'Rescheduled' | 'Settled' | 'Written off' | 'Completed';
type LoanInterestMethod = 'Flat' | 'Reducing balance' | 'Daily reducing';
type LoanFrequency = 'Monthly' | 'Fortnightly' | 'Weekly' | 'Quarterly';

type LoanRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    loanType: 'Gold Loan' | 'Home Loan' | 'Mortgage Loan' | 'Other Loan';
    productCode?: string;
    purpose?: string;
    principal: number;
    processingFee?: number;
    documentationFee?: number;
    insuranceFee?: number;
    otherCharges?: number;
    netDisbursement?: number;
    disbursementMethod?: 'Cash' | 'Bank transfer' | 'Account credit';
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
    status: Status;
    lifecycle: LoanLifecycle;
    installments: LoanInstallment[];
    events: Array<{ id: string; type: string; date: string; actor: string; reference: string; note: string }>;
};

type LoanInput = Pick<LoanRecord, 'customerId' | 'loanType' | 'principal' | 'loanDate' | 'tenureMonths' | 'interestRate' | 'installmentAmount' | 'status'> & Partial<Pick<LoanRecord, 'productCode' | 'purpose' | 'processingFee' | 'documentationFee' | 'insuranceFee' | 'otherCharges' | 'disbursementMethod' | 'disbursementReference' | 'firstDueDate' | 'repaymentFrequency' | 'interestMethod' | 'gracePeriodDays' | 'moratoriumMonths' | 'lateFee' | 'penalInterestRate' | 'incomeSource' | 'monthlyIncome' | 'guarantorName' | 'guarantorPhone' | 'collateralDescription' | 'collateralValue' | 'collateralLtv' | 'collateralReference'>>;
type LoanCollectionInput = Pick<LoanInstallment, 'amount' | 'principal' | 'interest' | 'penalty' | 'dueDate' | 'agent'> & { reference: string };

const loanSeed: LoanRecord[] = [
    { id: 'LN-30481', customerId: 'CUS-10481', customerName: 'Vikram Patel', customerPhone: '97XXXX1182', loanType: 'Gold Loan', principal: 500000, loanDate: '2025-02-12', tenureMonths: 18, interestRate: 14.5, installmentAmount: 8500, outstandingAmount: 482000, paidAmount: 18000, pendingAmount: 482000, status: 'Active', lifecycle: 'Active', installments: [{ id: 'LNI-881', dueDate: '08 Aug 2026', paidDate: '08 Aug 2026', amount: 8500, principal: 6200, interest: 2300, agent: 'Priya Sharma', reference: 'RCT-20480', status: 'Paid' }, { id: 'LNI-880', dueDate: '08 Sep 2026', amount: 8500, principal: 6200, interest: 2300, agent: 'Priya Sharma', status: 'Pending' }], events: [{ id: 'LNE-30481-1', type: 'Loan disbursed', date: '2025-02-12', actor: 'Arjun Kapoor', reference: 'DISB-30481', note: 'Gold loan disbursed after approval and collateral custody.' }] },
    { id: 'LN-30472', customerId: 'CUS-10482', customerName: 'Meera Joshi', customerPhone: '98XXXX3210', loanType: 'Home Loan', principal: 1500000, loanDate: '2024-04-20', tenureMonths: 60, interestRate: 10.5, installmentAmount: 24800, outstandingAmount: 1240000, paidAmount: 260000, pendingAmount: 1240000, status: 'Active', lifecycle: 'Active', installments: [{ id: 'LNI-771', dueDate: '05 Aug 2026', paidDate: '05 Aug 2026', amount: 24800, principal: 11700, interest: 13100, agent: 'Rajesh Kumar', reference: 'RCT-20472', status: 'Paid' }], events: [{ id: 'LNE-30472-1', type: 'Loan disbursed', date: '2024-04-20', actor: 'Arjun Kapoor', reference: 'DISB-30472', note: 'Home loan disbursed after approval.' }] },
    { id: 'LN-30455', customerId: 'CUS-10478', customerName: 'Ramesh Gupta', customerPhone: '98XXXX7322', loanType: 'Mortgage Loan', principal: 400000, loanDate: '2023-06-23', tenureMonths: 36, interestRate: 12.75, installmentAmount: 12500, outstandingAmount: 318500, paidAmount: 81500, pendingAmount: 318500, status: 'Overdue', lifecycle: 'Overdue', installments: [{ id: 'LNI-655', dueDate: '27 Jul 2026', amount: 12500, principal: 8250, interest: 4250, agent: 'Amit Verma', status: 'Overdue' }], events: [{ id: 'LNE-30455-1', type: 'Delinquency recorded', date: '2026-08-08', actor: 'System', reference: 'OD-30455', note: 'Installment remains unpaid beyond the due date.' }] },
    { id: 'LN-30439', customerId: 'CUS-10480', customerName: 'Sanjay Rao', customerPhone: '99XXXX4408', loanType: 'Other Loan', principal: 120000, loanDate: '2025-08-02', tenureMonths: 12, interestRate: 15, installmentAmount: 11000, outstandingAmount: 0, paidAmount: 120000, pendingAmount: 0, status: 'Completed', lifecycle: 'Completed', installments: [{ id: 'LNI-539', dueDate: '02 Aug 2026', paidDate: '02 Aug 2026', amount: 11000, principal: 9500, interest: 1500, agent: 'Branch counter', reference: 'RCT-20439', status: 'Paid' }], events: [{ id: 'LNE-30439-1', type: 'Loan completed', date: '2026-08-02', actor: 'Branch counter', reference: 'CLS-30439', note: 'All principal and charges settled; account closed.' }] },
];

function LegacyLoanModal({ mode, record, onClose, onSave }: { mode: 'account' | 'collection'; record?: LoanRecord; onClose: () => void; onSave: (input: LoanInput | LoanCollectionInput) => void }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? 'CUS-10481');
    const [loanType, setLoanType] = useState<LoanRecord['loanType']>(record?.loanType ?? 'Gold Loan');
    const [principal, setPrincipal] = useState(String(record?.principal ?? ''));
    const [loanDate, setLoanDate] = useState(record?.loanDate ?? '2026-08-22');
    const [tenureMonths, setTenureMonths] = useState(String(record?.tenureMonths ?? 12));
    const [interestRate, setInterestRate] = useState(String(record?.interestRate ?? 14.5));
    const [installmentAmount, setInstallmentAmount] = useState(String(record?.installmentAmount ?? ''));
    const [status, setStatus] = useState<Status>(record?.status ?? 'Active');
    const [amount, setAmount] = useState(String(record?.installmentAmount ?? ''));
    const [principalPart, setPrincipalPart] = useState('');
    const [interestPart, setInterestPart] = useState('');
    const [dueDate, setDueDate] = useState('2026-08-22');
    const [agent, setAgent] = useState('Rajesh Kumar');
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (mode === 'account') {
            if (!customerId.trim() || !principal || Number(principal) <= 0 || !loanDate || !installmentAmount || Number(installmentAmount) <= 0) { setError('Customer, loan amount, loan date and installment amount are required.'); return; }
            onSave({ customerId: customerId.trim(), loanType, principal: Number(principal), loanDate, tenureMonths: Number(tenureMonths), interestRate: Number(interestRate), installmentAmount: Number(installmentAmount), status });
            return;
        }
        if (!record || !amount || Number(amount) <= 0 || !principalPart || !interestPart || !dueDate || !reference.trim()) { setError('Amount split, due date and receipt reference are required.'); return; }
        onSave({ amount: Number(amount), principal: Number(principalPart), interest: Number(interestPart), dueDate, agent, reference: reference.trim() });
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Create loan account' : 'Record loan installment'}><div className="admin-modal-header"><div><div className="eyebrow">LOAN WORKFLOW</div><h2>{mode === 'account' ? 'Create loan account' : `Record installment · ${record?.id}`}</h2><p>{mode === 'account' ? 'Map the loan to a customer and define repayment terms.' : 'Capture a repayment with principal, interest and receipt audit details.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}>{mode === 'account' ? <><label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="CUS-10481" /></label><label>Loan type<select value={loanType} onChange={(event) => setLoanType(event.target.value as LoanRecord['loanType'])}><option>Gold Loan</option><option>Home Loan</option><option>Mortgage Loan</option><option>Other Loan</option></select></label><label>Loan amount<input type="number" min="1" value={principal} onChange={(event) => setPrincipal(event.target.value)} placeholder="500000" /></label><label>Loan date<input type="date" value={loanDate} onChange={(event) => setLoanDate(event.target.value)} /></label><label>Tenure (months)<input type="number" min="1" value={tenureMonths} onChange={(event) => setTenureMonths(event.target.value)} /></label><label>Interest rate (% p.a.)<input type="number" min="0" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /></label><label>Installment amount<input type="number" min="1" value={installmentAmount} onChange={(event) => setInstallmentAmount(event.target.value)} placeholder="8500" /></label><label>Loan status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Active</option><option>Pending</option><option>Review</option><option>Inactive</option></select></label></> : <><label>Collected installment<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Principal component<input type="number" min="0" value={principalPart} onChange={(event) => setPrincipalPart(event.target.value)} placeholder="6200" /></label><label>Interest component<input type="number" min="0" value={interestPart} onChange={(event) => setInterestPart(event.target.value)} placeholder="2300" /></label><label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>Collection agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option><option>Branch counter</option></select></label><label>Receipt / transaction reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="RCT-20501" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{mode === 'account' ? 'Create loan' : 'Record collection'}</button></div></form></section></div>;
}

function LoanModal({ mode, record, onClose, onSave }: { mode: 'account' | 'collection'; record?: LoanRecord; onClose: () => void; onSave: (input: LoanInput | LoanCollectionInput) => void }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? 'CUS-10481');
    const [loanType, setLoanType] = useState<LoanRecord['loanType']>(record?.loanType ?? 'Gold Loan');
    const [productCode, setProductCode] = useState(record?.productCode ?? 'GL-001');
    const [purpose, setPurpose] = useState(record?.purpose ?? 'Working capital');
    const [principal, setPrincipal] = useState(String(record?.principal ?? ''));
    const [processingFee, setProcessingFee] = useState(String(record?.processingFee ?? 0));
    const [documentationFee, setDocumentationFee] = useState(String(record?.documentationFee ?? 0));
    const [insuranceFee, setInsuranceFee] = useState(String(record?.insuranceFee ?? 0));
    const [otherCharges, setOtherCharges] = useState(String(record?.otherCharges ?? 0));
    const [loanDate, setLoanDate] = useState(record?.loanDate ?? '2026-08-22');
    const [firstDueDate, setFirstDueDate] = useState(record?.firstDueDate ?? '2026-09-22');
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
    const [disbursementMethod, setDisbursementMethod] = useState<NonNullable<LoanRecord['disbursementMethod']>>(record?.disbursementMethod ?? 'Account credit');
    const [disbursementReference, setDisbursementReference] = useState(record?.disbursementReference ?? '');
    const [status, setStatus] = useState<Status>(record?.status ?? 'Review');
    const [amount, setAmount] = useState(String(record?.installmentAmount ?? ''));
    const [principalPart, setPrincipalPart] = useState('');
    const [interestPart, setInterestPart] = useState('');
    const [penaltyPart, setPenaltyPart] = useState('0');
    const [dueDate, setDueDate] = useState('2026-08-22');
    const [agent, setAgent] = useState('Rajesh Kumar');
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        if (mode === 'account') {
            const values = [principal, tenureMonths, interestRate, installmentAmount, processingFee, documentationFee, insuranceFee, otherCharges, gracePeriodDays, moratoriumMonths, lateFee, penalInterestRate];
            if (!customerId.trim() || !productCode.trim() || !loanDate || !firstDueDate || values.some((value) => value === '' || Number(value) < 0) || Number(principal) <= 0 || Number(tenureMonths) <= 0 || Number(installmentAmount) <= 0 || Number(interestRate) < 0) { setError('Customer, product, dates, positive principal, tenure and installment terms are required.'); return; }
            if (loanType === 'Gold Loan' && (!collateralDescription.trim() || Number(collateralValue) <= 0 || Number(collateralLtv) <= 0 || Number(collateralLtv) > 100)) { setError('Gold loans require collateral description, valuation and LTV between 1% and 100%.'); return; }
            if (disbursementMethod !== 'Cash' && !disbursementReference.trim()) { setError('A bank or account disbursement reference is required.'); return; }
            onSave({ customerId: customerId.trim(), loanType, productCode: productCode.trim(), purpose: purpose.trim(), principal: Number(principal), processingFee: Number(processingFee), documentationFee: Number(documentationFee), insuranceFee: Number(insuranceFee), otherCharges: Number(otherCharges), disbursementMethod, disbursementReference: disbursementReference.trim() || undefined, loanDate, firstDueDate, tenureMonths: Number(tenureMonths), repaymentFrequency: frequency, interestMethod, interestRate: Number(interestRate), gracePeriodDays: Number(gracePeriodDays), moratoriumMonths: Number(moratoriumMonths), lateFee: Number(lateFee), penalInterestRate: Number(penalInterestRate), installmentAmount: Number(installmentAmount), incomeSource: incomeSource.trim() || undefined, monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined, guarantorName: guarantorName.trim() || undefined, guarantorPhone: guarantorPhone.trim() || undefined, collateralDescription: collateralDescription.trim() || undefined, collateralValue: collateralValue ? Number(collateralValue) : undefined, collateralLtv: collateralLtv ? Number(collateralLtv) : undefined, collateralReference: collateralReference.trim() || undefined, status });
            return;
        }
        const total = Number(amount);
        const principalValue = Number(principalPart);
        const interestValue = Number(interestPart);
        const penaltyValue = Number(penaltyPart);
        if (!record || !reference.trim() || !dueDate || total <= 0 || principalValue < 0 || interestValue < 0 || penaltyValue < 0 || Math.abs(total - principalValue - interestValue - penaltyValue) > 0.01) { setError('Receipt, due date and an exact principal, interest and penalty allocation are required.'); return; }
        if (principalValue > record.outstandingAmount) { setError('Principal allocation cannot exceed the current outstanding principal.'); return; }
        onSave({ amount: total, principal: principalValue, interest: interestValue, penalty: penaltyValue, dueDate, agent, reference: reference.trim() });
    };
    const field = (label: string, value: string, setValue: (value: string) => void, type = 'text') => <label>{label}<input type={type} value={value} onChange={(event) => setValue(event.target.value)} /></label>;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'account' ? 'Create production loan account' : 'Record loan installment'}><div className="admin-modal-header"><div><div className="eyebrow">LOAN WORKFLOW</div><h2>{mode === 'account' ? 'Create production loan account' : `Record installment · ${record?.id}`}</h2><p>{mode === 'account' ? 'Capture underwriting, pricing, disbursement and security inputs.' : 'Allocate the receipt across principal, interest and penalties.'}</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}>{mode === 'account' ? <><div className="full-field form-section-heading"><strong>Application and pricing</strong><span>These values drive the repayment schedule.</span></div>{field('Customer ID', customerId, setCustomerId)}{field('Product / scheme code', productCode, setProductCode)}<label>Loan type<select value={loanType} onChange={(event) => setLoanType(event.target.value as LoanRecord['loanType'])}><option>Gold Loan</option><option>Home Loan</option><option>Mortgage Loan</option><option>Other Loan</option></select></label>{field('Loan purpose', purpose, setPurpose)}{field('Gross principal', principal, setPrincipal, 'number')}{field('Interest rate (% p.a.)', interestRate, setInterestRate, 'number')}<label>Interest method<select value={interestMethod} onChange={(event) => setInterestMethod(event.target.value as LoanInterestMethod)}><option>Flat</option><option>Reducing balance</option><option>Daily reducing</option></select></label><label>Repayment frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as LoanFrequency)}><option>Monthly</option><option>Fortnightly</option><option>Weekly</option><option>Quarterly</option></select></label>{field('Tenure (months)', tenureMonths, setTenureMonths, 'number')}{field('Installment amount', installmentAmount, setInstallmentAmount, 'number')}{field('Loan / application date', loanDate, setLoanDate, 'date')}{field('First due date', firstDueDate, setFirstDueDate, 'date')}<div className="full-field form-section-heading"><strong>Charges and repayment controls</strong><span>Charges are separated from principal for transparent net disbursement.</span></div>{field('Processing fee', processingFee, setProcessingFee, 'number')}{field('Documentation fee', documentationFee, setDocumentationFee, 'number')}{field('Insurance fee', insuranceFee, setInsuranceFee, 'number')}{field('Other charges', otherCharges, setOtherCharges, 'number')}{field('Grace period (days)', gracePeriodDays, setGracePeriodDays, 'number')}{field('Moratorium (months)', moratoriumMonths, setMoratoriumMonths, 'number')}{field('Late fee per missed installment', lateFee, setLateFee, 'number')}{field('Penal interest (% p.a.)', penalInterestRate, setPenalInterestRate, 'number')}<div className="full-field form-section-heading"><strong>Borrower, security and disbursement</strong><span>Conditional security fields are mandatory for Gold Loan products.</span></div>{field('Income / employment source', incomeSource, setIncomeSource)}{field('Monthly income', monthlyIncome, setMonthlyIncome, 'number')}{field('Guarantor name', guarantorName, setGuarantorName)}{field('Guarantor phone', guarantorPhone, setGuarantorPhone)}{field('Collateral description', collateralDescription, setCollateralDescription)}{field('Collateral value', collateralValue, setCollateralValue, 'number')}{field('Collateral LTV (%)', collateralLtv, setCollateralLtv, 'number')}{field('Collateral custody reference', collateralReference, setCollateralReference)}<label>Disbursement method<select value={disbursementMethod} onChange={(event) => setDisbursementMethod(event.target.value as NonNullable<LoanRecord['disbursementMethod']>)}><option>Cash</option><option>Bank transfer</option><option>Account credit</option></select></label>{field('Disbursement reference', disbursementReference, setDisbursementReference)}<label>Initial lifecycle status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Review</option><option>Pending</option><option>Active</option><option>Overdue</option></select></label></> : <>{field('Receipt amount', amount, setAmount, 'number')}{field('Principal allocation', principalPart, setPrincipalPart, 'number')}{field('Interest allocation', interestPart, setInterestPart, 'number')}{field('Penalty allocation', penaltyPart, setPenaltyPart, 'number')}{field('Due date', dueDate, setDueDate, 'date')}{field('Collection agent', agent, setAgent)}{field('Receipt reference', reference, setReference)}</>} {error && <p className="form-error full-field">{error}</p>}<div className="full-field form-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{mode === 'account' ? 'Create loan workflow' : 'Record repayment'}</button></div></form></section></div>;
}

function LoanDetail({ record, onClose, onCollection, onLifecycle, onToast }: { record: LoanRecord; onClose: () => void; onCollection: () => void; onLifecycle: (lifecycle: LoanLifecycle, status: Status) => void; onToast: (message: string) => void }) {
    const pending = record.installments.filter((item) => item.status !== 'Paid').length;
    const charges = (record.processingFee ?? 0) + (record.documentationFee ?? 0) + (record.insuranceFee ?? 0) + (record.otherCharges ?? 0);
    const canApprove = record.lifecycle === 'Application' || record.lifecycle === 'Underwriting';
    const canDisburse = record.lifecycle === 'Approved';
    const canClose = record.lifecycle === 'Settled' || record.outstandingAmount === 0;

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Loan ${record.id}`}>
            <div className="admin-modal-header"><div><div className="eyebrow">LOAN ACCOUNT / {record.id}</div><h2>{record.customerName}</h2><p>{record.loanType} · {record.customerId} · {record.customerPhone}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>
            <div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.id}</strong><span>{record.lifecycle} · {record.tenureMonths} months · {record.interestRate}% p.a.</span></div><StatusPill status={record.status} /></div>
            <div className="customer-detail-grid">
                <div><span>Gross principal</span><strong>₹{record.principal.toLocaleString('en-IN')}</strong></div><div><span>Net disbursement</span><strong>₹{(record.netDisbursement ?? record.principal - charges).toLocaleString('en-IN')}</strong></div><div><span>Outstanding principal</span><strong className="orange-text">₹{record.outstandingAmount.toLocaleString('en-IN')}</strong></div><div><span>Paid to date</span><strong className="green-text">₹{record.paidAmount.toLocaleString('en-IN')}</strong></div><div><span>Installment</span><strong>₹{record.installmentAmount.toLocaleString('en-IN')}</strong></div><div><span>Pending installments</span><strong>{pending}</strong></div><div><span>Interest method</span><strong>{record.interestMethod ?? 'Reducing balance'}</strong></div><div><span>Repayment frequency</span><strong>{record.repaymentFrequency ?? 'Monthly'}</strong></div>
            </div>
            <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Pricing, controls and disbursement</h3><p>Terms that must be persisted with the loan contract and schedule.</p></div></div><div className="customer-detail-grid loan-detail-grid"><div><span>Product / purpose</span><strong>{record.productCode ?? 'Not configured'} · {record.purpose || 'Not captured'}</strong></div><div><span>Fees and charges</span><strong>₹{charges.toLocaleString('en-IN')}</strong></div><div><span>First due date</span><strong>{record.firstDueDate ?? record.loanDate}</strong></div><div><span>Grace / moratorium</span><strong>{record.gracePeriodDays ?? 0} days · {record.moratoriumMonths ?? 0} months</strong></div><div><span>Late fee / penal interest</span><strong>₹{(record.lateFee ?? 0).toLocaleString('en-IN')} · {record.penalInterestRate ?? 0}%</strong></div><div><span>Disbursement</span><strong>{record.disbursementMethod ?? 'Account credit'}{record.disbursementReference ? ` · ${record.disbursementReference}` : ''}</strong></div></div></section>
            <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Borrower and security</h3><p>Underwriting evidence, guarantor details and collateral custody fields.</p></div></div><div className="customer-detail-grid loan-detail-grid"><div><span>Income source</span><strong>{record.incomeSource || 'Not captured'}{record.monthlyIncome ? ` · ₹${record.monthlyIncome.toLocaleString('en-IN')} / month` : ''}</strong></div><div><span>Guarantor</span><strong>{record.guarantorName || 'Not captured'}{record.guarantorPhone ? ` · ${record.guarantorPhone}` : ''}</strong></div><div><span>Collateral</span><strong>{record.collateralDescription || 'Not captured'}</strong></div><div><span>Collateral value / LTV</span><strong>{record.collateralValue ? `₹${record.collateralValue.toLocaleString('en-IN')}` : 'Not captured'} · {record.collateralLtv ?? 0}%</strong></div></div></section>
            <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Repayment schedule and allocation history</h3><p>Each receipt is allocated across principal, interest and penalty.</p></div><span>{record.installments.length} entries</span></div><div className="customer-transaction-list">{record.installments.map((item) => <div className="customer-transaction-row" key={item.id}><div><strong>{item.id} · {item.status}</strong><span>Due {item.dueDate}{item.paidDate ? ` · Paid ${item.paidDate}` : ''}</span></div><div><b>₹{item.amount.toLocaleString('en-IN')}</b><small>Principal ₹{item.principal.toLocaleString('en-IN')} · Interest ₹{item.interest.toLocaleString('en-IN')} · Penalty ₹{(item.penalty ?? 0).toLocaleString('en-IN')} · {item.agent}{item.reference ? ` · ${item.reference}` : ''}</small></div><StatusPill status={item.status === 'Paid' ? 'Completed' : item.status === 'Overdue' ? 'Overdue' : 'Pending'} /></div>)}</div></section>
            <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Lifecycle and audit trail</h3><p>Approval, disbursement, delinquency, restructuring and closure events.</p></div><span>{record.events.length} events</span></div><div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.actor}</span></div><div><b>{event.reference}</b><small>{event.note}</small></div></div>)}</div></section>
            <div className="loan-detail-actions customer-detail-actions"><button className="secondary-button" onClick={() => onToast('Loan statement prepared locally.')}>View statement</button>{canApprove && <button className="secondary-button" onClick={() => onLifecycle('Approved', 'Active')}>Approve</button>}{canDisburse && <button className="secondary-button" onClick={() => onLifecycle('Active', 'Active')}>Disburse</button>}{record.lifecycle === 'Overdue' && <button className="secondary-button" onClick={() => onLifecycle('Rescheduled', 'Review')}>Reschedule</button>}{record.outstandingAmount > 0 && <button className="secondary-button" onClick={() => onLifecycle('Settled', 'Completed')}>Settle</button>}{record.outstandingAmount > 0 && <button className="secondary-button" onClick={() => onLifecycle('Written off', 'Inactive')}>Write off</button>}{canClose && <button className="secondary-button" onClick={() => onLifecycle('Completed', 'Completed')}>Close account</button>}<button className="primary-button" onClick={onCollection}><Plus size={15} /> Record installment</button></div>
        </section>
    </div>;
}

function LoansPage() {
    const [loanRows, setLoanRows] = useState<LoanRecord[]>(loanSeed);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'account' | 'collection' | 'detail' | null>(null);
    const [selected, setSelected] = useState<LoanRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = loanRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.loanType} ${row.installments.map((item) => `${item.id} ${item.agent} ${item.reference ?? ''}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const outstanding = loanRows.reduce((total, row) => total + row.outstandingAmount, 0);
    const dueAmount = loanRows.flatMap((row) => row.installments).filter((item) => item.status !== 'Paid').reduce((total, item) => total + item.amount, 0);
    const saveAccount = (input: LoanInput) => { const customer = customerSeed.find((row) => row.id === input.customerId); const id = `LN-${30482 + loanRows.length}`; const charges = (input.processingFee ?? 0) + (input.documentationFee ?? 0) + (input.insuranceFee ?? 0) + (input.otherCharges ?? 0); setLoanRows((current) => [{ id, customerId: input.customerId, customerName: customer?.primary ?? input.customerId, customerPhone: customer?.secondary.split('·')[1]?.trim() ?? 'Not available', loanType: input.loanType, productCode: input.productCode ?? 'UNCONFIGURED', purpose: input.purpose ?? '', principal: input.principal, processingFee: input.processingFee ?? 0, documentationFee: input.documentationFee ?? 0, insuranceFee: input.insuranceFee ?? 0, otherCharges: input.otherCharges ?? 0, netDisbursement: Math.max(0, input.principal - charges), disbursementMethod: input.disbursementMethod ?? 'Account credit', disbursementReference: input.disbursementReference, loanDate: input.loanDate, firstDueDate: input.firstDueDate ?? input.loanDate, tenureMonths: input.tenureMonths, repaymentFrequency: input.repaymentFrequency ?? 'Monthly', interestMethod: input.interestMethod ?? 'Reducing balance', interestRate: input.interestRate, gracePeriodDays: input.gracePeriodDays ?? 0, moratoriumMonths: input.moratoriumMonths ?? 0, lateFee: input.lateFee ?? 0, penalInterestRate: input.penalInterestRate ?? 0, installmentAmount: input.installmentAmount, outstandingAmount: input.principal, paidAmount: 0, pendingAmount: input.principal, incomeSource: input.incomeSource, monthlyIncome: input.monthlyIncome, guarantorName: input.guarantorName, guarantorPhone: input.guarantorPhone, collateralDescription: input.collateralDescription, collateralValue: input.collateralValue, collateralLtv: input.collateralLtv, collateralReference: input.collateralReference, status: input.status, lifecycle: input.status === 'Active' ? 'Active' : 'Application', installments: [], events: [{ id: `LNE-${id}`, type: 'Application created', date: input.loanDate, actor: 'Admin workspace', reference: id, note: 'Loan application and repayment terms captured locally.' }] }, ...current]); setPage(1); close(); notify('Loan application and account terms created locally.'); };
    const saveCollection = (input: LoanCollectionInput) => { if (!selected) return; const nextOutstanding = Math.max(0, selected.outstandingAmount - input.principal); const nextPending = Math.max(0, selected.pendingAmount - input.amount); const installment: LoanInstallment = { id: `LNI-${900 + selected.installments.length + loanRows.length}`, dueDate: input.dueDate, paidDate: '22 Aug 2026', amount: input.amount, principal: input.principal, interest: input.interest, penalty: input.penalty, agent: input.agent, reference: input.reference, status: 'Paid' }; setLoanRows((current) => current.map((row) => row.id === selected.id ? { ...row, outstandingAmount: nextOutstanding, pendingAmount: nextPending, paidAmount: row.paidAmount + input.amount, status: nextOutstanding === 0 ? 'Completed' : 'Active', lifecycle: nextOutstanding === 0 ? 'Completed' : 'Active', installments: [installment, ...row.installments], events: [{ id: `LNE-${installment.id}`, type: 'Repayment recorded', date: '22 Aug 2026', actor: input.agent, reference: input.reference, note: `Allocated ₹${input.amount.toLocaleString('en-IN')} across principal, interest and penalty.` }, ...row.events] } : row)); close(); notify('Loan repayment allocation recorded locally.'); };
    const updateLifecycle = (lifecycle: LoanLifecycle, status: Status) => { if (!selected) return; const event = { id: `LNE-${selected.id}-${selected.events.length + 1}`, type: `Loan ${lifecycle.toLowerCase()}`, date: '22 Aug 2026', actor: 'Admin workspace', reference: `${lifecycle.toUpperCase().replaceAll(' ', '-')}-${selected.id}`, note: `Lifecycle changed locally to ${lifecycle}. Backend maker-checker approval is required in production.` }; setLoanRows((current) => current.map((row) => row.id === selected.id ? { ...row, lifecycle, status, events: [event, ...row.events] } : row)); setSelected((current) => current ? { ...current, lifecycle, status, events: [event, ...current.events] } : current); notify(`Loan moved to ${lifecycle.toLowerCase()} locally.`); };
    const openDetail = (record: LoanRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / LOANS</div><h1>Loans</h1><p>Manage loan accounts, repayment schedules, collections and customer history.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Create loan account</button></div><SummaryStrip items={[{ label: 'Active loans', value: String(loanRows.filter((row) => row.status === 'Active').length), tone: 'green' }, { label: 'Outstanding amount', value: `₹${(outstanding / 100000).toFixed(2)}L` }, { label: 'Due amount', value: `₹${dueAmount.toLocaleString('en-IN')}`, tone: 'orange' }, { label: 'Overdue accounts', value: String(loanRows.filter((row) => row.status === 'Overdue').length), tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search loan, customer, agent or reference..." aria-label="Search loans" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter loans by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Overdue">Overdue</option><option value="Completed">Completed</option><option value="Review">Review</option></select><button className="filter-button" onClick={() => notify('Loan due-date range selector is ready for local data.')}><CalendarDays size={15} /> Due range</button><button className="filter-button" onClick={() => { setStatusFilter('Overdue'); setPage(1); notify('Showing overdue loan accounts.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} loan account records prepared for export.`)} aria-label="Export loans"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Loan account</th><th>Loan amount</th><th>Installment</th><th>Outstanding</th><th>Schedule</th><th>Status</th><th /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.customerName}</strong><span>{row.id} · {row.customerId}</span><small>{row.loanType} · {row.interestRate}% p.a. · {row.tenureMonths} months · {row.lifecycle}</small></td><td><strong className="table-amount">₹{row.principal.toLocaleString('en-IN')}</strong><span>{row.loanDate}</span></td><td><strong className="table-amount">₹{row.installmentAmount.toLocaleString('en-IN')}</strong><span>{row.installments.length} entries</span></td><td><strong className="loan-outstanding-amount">₹{row.outstandingAmount.toLocaleString('en-IN')}</strong><span>Paid ₹{row.paidAmount.toLocaleString('en-IN')}</span></td><td><strong>{row.installments.filter((item) => item.status === 'Paid').length} paid</strong><span>{row.installments.filter((item) => item.status !== 'Paid').length} pending</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table>{!visibleRows.length && <div className="empty-state">No loan accounts match the current search and status filter.</div>}<div className="table-footer"><span>Showing {visibleRows.length} of {filteredRows.length} loan accounts</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={`pagination-button ${page === item ? 'selected' : ''}`} key={item} onClick={() => setPage(item)}>{item}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></div></section>{modal === 'account' && <LoanModal mode="account" onClose={close} onSave={(input) => saveAccount(input as LoanInput)} />}{modal === 'collection' && selected && <LoanModal mode="collection" record={selected} onClose={close} onSave={(input) => saveCollection(input as LoanCollectionInput)} />}{modal === 'detail' && selected && <LoanDetail record={selected} onClose={close} onCollection={() => setModal('collection')} onLifecycle={updateLifecycle} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}

type WithdrawalEvent = {
    id: string;
    type: 'Requested' | 'Approved' | 'Rejected' | 'Marked for review' | 'Settled';
    date: string;
    performedBy: string;
    reference: string;
    note: string;
};

type WithdrawalRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    sourceAccountType: 'Savings deposit' | 'Current deposit' | 'Recurring deposit' | 'Fixed deposit';
    sourceAccountId: string;
    amount: number;
    requestedOn: string;
    requestedBy: 'Customer' | 'Branch counter' | 'Collection agent';
    channel: 'Branch counter' | 'Doorstep agent' | 'Customer request';
    status: Status;
    identityVerificationReference?: string;
    purposeCode?: string;
    destinationAccountReference?: string;
    bankUtrOrExternalReference?: string;
    supportingDocuments?: string;
    consentReference?: string;
    cashHandoverReference?: string;
    makerReference?: string;
    checkerReference?: string;
    rejectionReason?: string;
    deviceReference?: string;
    location?: string;
    offlineSyncReference?: string;
    authorizedBy?: string;
    decisionDate?: string;
    payoutMethod?: 'Cash' | 'Bank transfer' | 'Account credit';
    settlementDate?: string;
    settlementReference?: string;
    settlementOperator?: string;
    reference: string;
    note: string;
    events: WithdrawalEvent[];
};

type WithdrawalInput = Pick<WithdrawalRecord, 'customerId' | 'sourceAccountType' | 'sourceAccountId' | 'amount' | 'requestedOn' | 'requestedBy' | 'channel' | 'reference' | 'note'> & Partial<Pick<WithdrawalRecord, 'identityVerificationReference' | 'purposeCode' | 'destinationAccountReference' | 'bankUtrOrExternalReference' | 'supportingDocuments' | 'consentReference' | 'cashHandoverReference' | 'makerReference' | 'deviceReference' | 'location' | 'offlineSyncReference'>>;
type WithdrawalActionInput = { decision: 'Approved' | 'Rejected' | 'Marked for review'; reviewer: string; decisionDate: string; reference: string; note: string; checkerReference?: string; rejectionReason?: string };
type WithdrawalSettlementInput = { payoutMethod: NonNullable<WithdrawalRecord['payoutMethod']>; settlementDate: string; settlementReference: string; note: string; operator: string; settlementOperator?: string; cashHandoverReference?: string; bankUtrOrExternalReference?: string };

const withdrawalSeed: WithdrawalRecord[] = [
    { id: 'WD-00881', customerId: 'CUS-10482', customerName: 'Kavita Shah', customerPhone: '98XXXX3210', sourceAccountType: 'Savings deposit', sourceAccountId: 'DEP-78143', amount: 18000, requestedOn: '2026-08-08', requestedBy: 'Customer', channel: 'Customer request', status: 'Review', reference: 'WD-00881', note: 'Customer requested withdrawal after identity verification.', events: [{ id: 'WDE-881', type: 'Requested', date: '08 Aug 2026', performedBy: 'Kavita Shah', reference: 'WD-00881', note: 'Withdrawal request submitted.' }, { id: 'WDE-882', type: 'Marked for review', date: '08 Aug 2026', performedBy: 'Arjun Kapoor', reference: 'REV-881', note: 'Additional authorization review required.' }] },
    { id: 'WD-00880', customerId: 'CUS-10479', customerName: 'Mohan Das', customerPhone: '97XXXX1182', sourceAccountType: 'Recurring deposit', sourceAccountId: 'RD-2024099', amount: 7500, requestedOn: '2026-08-07', requestedBy: 'Branch counter', channel: 'Branch counter', status: 'Completed', authorizedBy: 'Arjun Kapoor', decisionDate: '2026-08-07', payoutMethod: 'Cash', settlementDate: '2026-08-07', settlementReference: 'CASH-880', reference: 'WD-00880', note: 'Approved after branch counter verification.', events: [{ id: 'WDE-880', type: 'Requested', date: '07 Aug 2026', performedBy: 'Branch counter', reference: 'WD-00880', note: 'Withdrawal request submitted.' }, { id: 'WDE-881A', type: 'Approved', date: '07 Aug 2026', performedBy: 'Arjun Kapoor', reference: 'AUTH-880', note: 'Withdrawal approved and transaction released.' }, { id: 'WDE-881S', type: 'Settled', date: '07 Aug 2026', performedBy: 'Arjun Kapoor', reference: 'CASH-880', note: 'Cash payout completed after authorization.' }] },
    { id: 'WD-00879', customerId: 'CUS-10479', customerName: 'Anita Devi', customerPhone: '96XXXX8821', sourceAccountType: 'Savings deposit', sourceAccountId: 'DEP-78142', amount: 12000, requestedOn: '2026-08-06', requestedBy: 'Collection agent', channel: 'Doorstep agent', status: 'Pending', reference: 'WD-00879', note: 'Awaiting supervisor authorization.', events: [{ id: 'WDE-879', type: 'Requested', date: '06 Aug 2026', performedBy: 'Neha Singh', reference: 'WD-00879', note: 'Doorstep withdrawal request submitted.' }] },
    { id: 'WD-00878', customerId: 'CUS-10480', customerName: 'Sanjay Rao', customerPhone: '99XXXX4408', sourceAccountType: 'Fixed deposit', sourceAccountId: 'FD-2024071', amount: 50000, requestedOn: '2026-08-05', requestedBy: 'Customer', channel: 'Branch counter', status: 'Rejected', reference: 'WD-00878', note: 'Premature FD closure documents incomplete.', events: [{ id: 'WDE-878', type: 'Requested', date: '05 Aug 2026', performedBy: 'Sanjay Rao', reference: 'WD-00878', note: 'Premature withdrawal request submitted.' }, { id: 'WDE-878A', type: 'Rejected', date: '05 Aug 2026', performedBy: 'Arjun Kapoor', reference: 'REJ-878', note: 'Nominee and closure documents are incomplete.' }] },
];

function WithdrawalModal({ mode, record, onClose, onSave }: { mode: 'request' | 'action'; record?: WithdrawalRecord; onClose: () => void; onSave: (input: WithdrawalInput | WithdrawalActionInput) => void }) {
    const [customerId, setCustomerId] = useState(record?.customerId ?? 'CUS-10482');
    const [accountType, setAccountType] = useState<WithdrawalRecord['sourceAccountType']>(record?.sourceAccountType ?? 'Savings deposit');
    const [accountId, setAccountId] = useState(record?.sourceAccountId ?? 'DEP-78143');
    const [amount, setAmount] = useState(String(record?.amount ?? ''));
    const [requestedOn, setRequestedOn] = useState(record?.requestedOn ?? '2026-08-22');
    const [requestedBy, setRequestedBy] = useState<WithdrawalRecord['requestedBy']>(record?.requestedBy ?? 'Customer');
    const [channel, setChannel] = useState<WithdrawalRecord['channel']>(record?.channel ?? 'Customer request');
    const [reference, setReference] = useState(record?.reference ?? '');
    const [note, setNote] = useState(record?.note ?? '');
    const [identityVerificationReference, setIdentityVerificationReference] = useState(record?.identityVerificationReference ?? '');
    const [purposeCode, setPurposeCode] = useState(record?.purposeCode ?? '');
    const [destinationAccountReference, setDestinationAccountReference] = useState(record?.destinationAccountReference ?? '');
    const [bankUtrOrExternalReference, setBankUtrOrExternalReference] = useState(record?.bankUtrOrExternalReference ?? '');
    const [supportingDocuments, setSupportingDocuments] = useState(record?.supportingDocuments ?? '');
    const [consentReference, setConsentReference] = useState(record?.consentReference ?? '');
    const [cashHandoverReference, setCashHandoverReference] = useState(record?.cashHandoverReference ?? '');
    const [makerReference, setMakerReference] = useState(record?.makerReference ?? '');
    const [deviceReference, setDeviceReference] = useState(record?.deviceReference ?? '');
    const [location, setLocation] = useState(record?.location ?? '');
    const [offlineSyncReference, setOfflineSyncReference] = useState(record?.offlineSyncReference ?? '');
    const [decision, setDecision] = useState<WithdrawalActionInput['decision']>('Approved');
    const [reviewer, setReviewer] = useState('Arjun Kapoor');
    const [checkerReference, setCheckerReference] = useState(record?.checkerReference ?? '');
    const [rejectionReason, setRejectionReason] = useState(record?.rejectionReason ?? '');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (mode === 'request') {
            if (!customerId.trim() || !accountId.trim() || !amount || Number(amount) <= 0 || !requestedOn || !reference.trim() || !note.trim()) { setError('Customer, source account, amount, date, reference and reason are required.'); return; }
            onSave({ customerId: customerId.trim(), sourceAccountType: accountType, sourceAccountId: accountId.trim(), amount: Number(amount), requestedOn, requestedBy, channel, reference: reference.trim(), note: note.trim(), identityVerificationReference: identityVerificationReference.trim(), purposeCode: purposeCode.trim(), destinationAccountReference: destinationAccountReference.trim(), bankUtrOrExternalReference: bankUtrOrExternalReference.trim(), supportingDocuments: supportingDocuments.trim(), consentReference: consentReference.trim(), cashHandoverReference: cashHandoverReference.trim(), makerReference: makerReference.trim(), deviceReference: deviceReference.trim(), location: location.trim(), offlineSyncReference: offlineSyncReference.trim() });
            return;
        }
        if (!record || !reviewer.trim() || !requestedOn || !reference.trim() || !note.trim()) { setError('Reviewer, decision date, authorization reference and note are required.'); return; }
        onSave({ decision, reviewer: reviewer.trim(), decisionDate: requestedOn, reference: reference.trim(), note: note.trim(), checkerReference: checkerReference.trim(), rejectionReason: rejectionReason.trim() });
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'request' ? 'Create withdrawal request' : 'Authorize withdrawal'}><div className="admin-modal-header"><div><div className="eyebrow">WITHDRAWAL WORKFLOW</div><h2>{mode === 'request' ? 'Create withdrawal request' : `Authorize · ${record?.id}`}</h2><p>{mode === 'request' ? 'Capture the customer, source account and controlled withdrawal request details.' : 'Record an approval, rejection or additional review decision with an audit reference.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}>{mode === 'request' ? <><label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="CUS-10482" /></label><label>Source account type<select value={accountType} onChange={(event) => setAccountType(event.target.value as WithdrawalRecord['sourceAccountType'])}><option>Savings deposit</option><option>Current deposit</option><option>Recurring deposit</option><option>Fixed deposit</option></select></label><label>Source account ID<input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="DEP-78143" /></label><label>Withdrawal amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="18000" /></label><label>Request date<input type="date" value={requestedOn} onChange={(event) => setRequestedOn(event.target.value)} /></label><label>Requested by<select value={requestedBy} onChange={(event) => setRequestedBy(event.target.value as WithdrawalRecord['requestedBy'])}><option>Customer</option><option>Branch counter</option><option>Collection agent</option></select></label><label>Request channel<select value={channel} onChange={(event) => setChannel(event.target.value as WithdrawalRecord['channel'])}><option>Branch counter</option><option>Doorstep agent</option><option>Customer request</option></select></label><label>Identity verification reference<input value={identityVerificationReference} onChange={(event) => setIdentityVerificationReference(event.target.value)} placeholder="KYC / verification reference" /></label><label>Purpose code<input value={purposeCode} onChange={(event) => setPurposeCode(event.target.value)} placeholder="Purpose or reason code" /></label><label>Destination account reference<input value={destinationAccountReference} onChange={(event) => setDestinationAccountReference(event.target.value)} placeholder="Destination account / beneficiary" /></label><label>Bank UTR / external reference<input value={bankUtrOrExternalReference} onChange={(event) => setBankUtrOrExternalReference(event.target.value)} placeholder="Bank or external reference" /></label><label>Consent reference<input value={consentReference} onChange={(event) => setConsentReference(event.target.value)} placeholder="Consent record reference" /></label><label>Cash handover reference<input value={cashHandoverReference} onChange={(event) => setCashHandoverReference(event.target.value)} placeholder="Cash handover reference" /></label><label>Maker reference<input value={makerReference} onChange={(event) => setMakerReference(event.target.value)} placeholder="Request maker reference" /></label><label>Device reference<input value={deviceReference} onChange={(event) => setDeviceReference(event.target.value)} placeholder="Capture device reference" /></label><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Branch or collection location" /></label><label>Offline sync reference<input value={offlineSyncReference} onChange={(event) => setOfflineSyncReference(event.target.value)} placeholder="Offline capture / sync reference" /></label><label className="full-field">Supporting documents<textarea value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} placeholder="Document references" /></label><label className="full-field">Request note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason and customer request details" /></label></> : <><label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value as WithdrawalActionInput['decision'])}><option>Approved</option><option>Rejected</option><option>Marked for review</option></select></label><label>Reviewer<input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label><label>Decision date<input type="date" value={requestedOn} onChange={(event) => setRequestedOn(event.target.value)} /></label><label>Authorization reference<input value={reference} onChange={(event) => setReference(event.target.value)} /></label><label>Checker reference<input value={checkerReference} onChange={(event) => setCheckerReference(event.target.value)} placeholder="Second reviewer / checker reference" /></label><label>Rejection reason<input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Capture when applicable" /></label><label className="full-field">Decision note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Approval, rejection or review details" /></label></>}{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save locally</button></div></form></section></div>;
}
function WithdrawalSettlementModal({ record, onClose, onSave }: { record: WithdrawalRecord; onClose: () => void; onSave: (input: WithdrawalSettlementInput) => void }) {
    const [payoutMethod, setPayoutMethod] = useState<NonNullable<WithdrawalRecord['payoutMethod']>>(record.payoutMethod ?? 'Cash');
    const [settlementDate, setSettlementDate] = useState(record.settlementDate ?? '2026-08-22');
    const [settlementReference, setSettlementReference] = useState(record.settlementReference ?? '');
    const [operator, setOperator] = useState('Arjun Kapoor');
    const [settlementOperator, setSettlementOperator] = useState(record.settlementOperator ?? '');
    const [cashHandoverReference, setCashHandoverReference] = useState(record.cashHandoverReference ?? '');
    const [bankUtrOrExternalReference, setBankUtrOrExternalReference] = useState(record.bankUtrOrExternalReference ?? '');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (record.status !== 'Approved') { setError('Only an approved withdrawal can be settled.'); return; } if (!settlementDate || !settlementReference.trim() || !operator.trim() || !note.trim()) { setError('Settlement date, payout reference, operator and settlement note are required.'); return; } onSave({ payoutMethod, settlementDate, settlementReference: settlementReference.trim(), operator: operator.trim(), settlementOperator: settlementOperator.trim(), cashHandoverReference: cashHandoverReference.trim(), bankUtrOrExternalReference: bankUtrOrExternalReference.trim(), note: note.trim() }); };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Settle withdrawal ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">WITHDRAWAL WORKFLOW</div><h2>Settle · {record.id}</h2><p>Record the controlled payout after authorization. Settlement is the step that completes the withdrawal.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}><label>Payout method<select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value as NonNullable<WithdrawalRecord['payoutMethod']>)}><option>Cash</option><option>Bank transfer</option><option>Account credit</option></select></label><label>Settlement date<input type="date" value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} /></label><label>Settlement reference<input value={settlementReference} onChange={(event) => setSettlementReference(event.target.value)} placeholder="CASH-00880 or bank UTR" /></label><label>Settled by<input value={operator} onChange={(event) => setOperator(event.target.value)} /></label><label>Settlement operator<input value={settlementOperator} onChange={(event) => setSettlementOperator(event.target.value)} placeholder="Operator or counterparty" /></label><label>Cash handover reference<input value={cashHandoverReference} onChange={(event) => setCashHandoverReference(event.target.value)} placeholder="Cash handover evidence" /></label><label>Bank UTR / external reference<input value={bankUtrOrExternalReference} onChange={(event) => setBankUtrOrExternalReference(event.target.value)} placeholder="Settlement bank reference" /></label><label className="full-field">Settlement note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record payout verification and handover details." /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Complete settlement</button></div></form></section></div>;
}
function WithdrawalDetail({ record, onClose, onAction, onSettle, onToast }: { record: WithdrawalRecord; onClose: () => void; onAction: () => void; onSettle: () => void; onToast: (message: string) => void }) {
    const metadata = [['Identity verification', record.identityVerificationReference], ['Purpose code', record.purposeCode], ['Destination account', record.destinationAccountReference], ['Bank UTR / external reference', record.bankUtrOrExternalReference], ['Supporting documents', record.supportingDocuments], ['Consent reference', record.consentReference], ['Cash handover reference', record.cashHandoverReference], ['Maker reference', record.makerReference], ['Checker reference', record.checkerReference], ['Rejection reason', record.rejectionReason], ['Device reference', record.deviceReference], ['Location', record.location], ['Offline sync reference', record.offlineSyncReference], ['Settlement operator', record.settlementOperator]] as const;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Withdrawal ${record.id}`}><div className="admin-modal-header"><div><div className="eyebrow">WITHDRAWAL REQUEST / {record.id}</div><h2>{record.customerName}</h2><p>{record.customerId} · {record.customerPhone} · Controlled account transaction</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{record.customerName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{record.reference}</strong><span>{record.channel} · Requested {record.requestedOn}</span></div><StatusPill status={record.status} /></div><div className="customer-detail-grid"><div><span>Withdrawal amount</span><strong className="withdrawal-amount">₹{record.amount.toLocaleString('en-IN')}</strong></div><div><span>Source account</span><strong>{record.sourceAccountId}</strong></div><div><span>Account type</span><strong>{record.sourceAccountType}</strong></div><div><span>Requested by</span><strong>{record.requestedBy}</strong></div><div><span>Authorized by</span><strong>{record.authorizedBy ?? 'Awaiting authorization'}</strong></div><div><span>Decision date</span><strong>{record.decisionDate ?? 'Pending'}</strong></div><div><span>Payout method</span><strong>{record.payoutMethod ?? 'Not settled'}</strong></div><div><span>Settlement date</span><strong>{record.settlementDate ?? 'Pending settlement'}</strong></div><div><span>Settlement reference</span><strong>{record.settlementReference ?? 'Not settled'}</strong></div>{metadata.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not captured'}</strong></div>)}<div><span>Reason / notes</span><strong>{record.note}</strong></div><div><span>Audit events</span><strong>{record.events.length}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Withdrawal history</h3><p>Request, authorization and transaction references are retained locally for review.</p></div><span>{record.events.length} events</span></div><div className="customer-transaction-list">{record.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.performedBy}</span></div><div><b>{event.reference}</b><small>{event.note}</small></div></div>)}</div></section><div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast('Withdrawal statement prepared locally.')}>View statement</button>{record.status !== 'Completed' && record.status !== 'Rejected' && <button className="primary-button" onClick={onAction}><ShieldCheck size={15} /> Review request</button>}{record.status === 'Approved' && <button className="primary-button" onClick={onSettle}><CheckCircle2 size={15} /> Settle payout</button>}</div></section></div>;
}
function WithdrawalsPage() {
    const [withdrawalRows, setWithdrawalRows] = useState<WithdrawalRecord[]>(withdrawalSeed);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'request' | 'action' | 'settlement' | 'detail' | null>(null);
    const [selected, setSelected] = useState<WithdrawalRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = withdrawalRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.sourceAccountType} ${row.sourceAccountId} ${row.requestedBy} ${row.channel} ${row.reference} ${row.note}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const pendingCount = withdrawalRows.filter((row) => row.status === 'Pending').length;
    const reviewCount = withdrawalRows.filter((row) => row.status === 'Review').length;
    const approvedAmount = withdrawalRows.filter((row) => row.status === 'Approved' || row.status === 'Completed').reduce((total, row) => total + row.amount, 0);
    const monthAmount = withdrawalRows.filter((row) => row.requestedOn.startsWith('2026-08')).reduce((total, row) => total + row.amount, 0);
    const saveRequest = (input: WithdrawalInput) => {
        const customer = customerSeed.find((row) => row.id === input.customerId);
        const id = `WD-${882 + withdrawalRows.length}`;
        const event: WithdrawalEvent = {
            id: `WDE-${900 + withdrawalRows.length}`,
            type: 'Requested',
            date: input.requestedOn,
            performedBy: input.requestedBy,
            reference: input.reference,
            note: input.note
        };
        const newWithdrawal: WithdrawalRecord = {
            ...input,
            id,
            customerName: customer?.primary ?? input.customerId,
            customerPhone: customer?.secondary.split('·')[1]?.trim() ?? 'Not available',
            status: 'Pending',
            events: [event]
        };
        setWithdrawalRows((current) => [newWithdrawal, ...current]);
        setPage(1);
        close();
        notify('Withdrawal request created locally.');
    };
    const saveAction = (input: WithdrawalActionInput) => { if (!selected) return; const event: WithdrawalEvent = { id: `WDE-${950 + selected.events.length + withdrawalRows.length}`, type: input.decision, date: input.decisionDate, performedBy: input.reviewer, reference: input.reference, note: input.note }; const nextStatus: Status = input.decision === 'Approved' ? 'Approved' : input.decision === 'Rejected' ? 'Rejected' : 'Review'; setWithdrawalRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: nextStatus, authorizedBy: input.decision === 'Approved' ? input.reviewer : undefined, decisionDate: input.decision === 'Approved' ? input.decisionDate : undefined, reference: input.reference, note: input.note, checkerReference: input.checkerReference, rejectionReason: input.rejectionReason, events: [event, ...row.events] } : row)); close(); notify(`Withdrawal ${input.decision.toLowerCase()} locally. Settlement remains a separate controlled step.`); };
    const saveSettlement = (input: WithdrawalSettlementInput) => { if (!selected || selected.status !== 'Approved') return; const event: WithdrawalEvent = { id: `WDE-${980 + selected.events.length + withdrawalRows.length}`, type: 'Settled', date: input.settlementDate, performedBy: input.operator, reference: input.settlementReference, note: `${input.payoutMethod} payout completed. ${input.note}` }; setWithdrawalRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: 'Completed', payoutMethod: input.payoutMethod, settlementDate: input.settlementDate, settlementReference: input.settlementReference, settlementOperator: input.settlementOperator, cashHandoverReference: input.cashHandoverReference, bankUtrOrExternalReference: input.bankUtrOrExternalReference, note: input.note, events: [event, ...row.events] } : row)); close(); notify('Withdrawal settlement recorded locally. Backend balance posting and idempotency must be enforced server-side.'); };
    const openDetail = (record: WithdrawalRecord) => { setSelected(record); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / WITHDRAWALS</div><h1>Withdrawals</h1><p>Review customer withdrawal requests, authorize payouts and maintain transaction history.</p></div><button className="primary-button" onClick={() => setModal('request')}><Plus size={16} /> New withdrawal</button></div><SummaryStrip items={[{ label: 'Pending approval', value: String(pendingCount), tone: 'orange' }, { label: 'Approved amount', value: `₹${approvedAmount.toLocaleString('en-IN')}`, tone: 'green' }, { label: 'This month', value: `₹${monthAmount.toLocaleString('en-IN')}` }, { label: 'Requires review', value: String(reviewCount), tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer, account, request or reference..." aria-label="Search withdrawals" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter withdrawals by status"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Approved">Approved</option><option value="Completed">Settled</option><option value="Rejected">Rejected</option></select><button className="filter-button" onClick={() => notify('Withdrawal request date range is ready for local data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); notify('Showing withdrawal requests requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} withdrawal records prepared for export.`)} aria-label="Export withdrawals"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer / Request</th><th>Amount</th><th>Source account</th><th>Request details</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><strong>{row.customerName}</strong><span>{row.customerId} · {row.customerPhone}</span><small>{row.id} · {row.requestedBy}</small></td><td className="table-amount withdrawal-amount">₹{row.amount.toLocaleString('en-IN')}</td><td><strong>{row.sourceAccountId}</strong><span>{row.sourceAccountType}</span></td><td className="table-muted">{row.requestedOn} · {row.channel}<br />{row.reference}</td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={() => openDetail(row)} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} withdrawal requests</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button className={`pagination-button ${page === number ? 'selected' : ''}`} key={number} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'request' && <WithdrawalModal mode="request" onClose={close} onSave={(input) => saveRequest(input as WithdrawalInput)} />}{modal === 'action' && selected && <WithdrawalModal mode="action" record={selected} onClose={close} onSave={(input) => saveAction(input as WithdrawalActionInput)} />}{modal === 'settlement' && selected && <WithdrawalSettlementModal record={selected} onClose={close} onSave={saveSettlement} />}{modal === 'detail' && selected && <WithdrawalDetail record={selected} onClose={close} onAction={() => setModal('action')} onSettle={() => setModal('settlement')} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}

function DepositsPage() {
    const [depositRows, setDepositRows] = useState<DepositRecord[]>(depositSeed);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [modal, setModal] = useState<'account' | 'transaction' | 'detail' | null>(null);
    const [selected, setSelected] = useState<DepositRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = depositRows.filter((row) => `${row.id} ${row.customerId} ${row.customerName} ${row.customerPhone} ${row.accountType} ${row.transactions.map((transaction) => `${transaction.id} ${transaction.agent} ${transaction.reference}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const visibleRows = filteredRows.slice(0, pageSize);
    const totalBalance = depositRows.reduce((total, row) => total + row.balance, 0);
    const entriesToday = depositRows.flatMap((row) => row.transactions).filter((transaction) => transaction.date.startsWith('08 Aug 2026')).length;
    const reviewCount = depositRows.filter((row) => row.status === 'Review' || row.status === 'Pending').length;
    const saveAccount = (input: DepositInput) => { const customer = customerSeed.find((row) => row.id === input.customerId); const id = `DEP-${78145 + depositRows.length}`; setDepositRows((current) => [{ id, ...input, customerId: input.customerId, customerName: customer?.primary ?? input.customerId, customerPhone: customer?.secondary.split('·')[1]?.trim() ?? 'Not available', accountType: input.accountType, openingAmount: input.openingAmount, balance: input.openingAmount, openedOn: input.openedOn, lastEntry: input.openedOn, status: input.status, transactions: [] }, ...current]); close(); notify('Deposit account created locally.'); };
    const saveTransaction = (input: DepositTransactionInput) => { if (!selected) return; const currentAccount = depositRows.find((row) => row.id === selected.id); if (!currentAccount) return; if (currentAccount.status !== 'Active') { notify('Only active deposit accounts can accept transactions.'); return; } if (input.type === 'Withdrawal' && input.amount > currentAccount.balance) { notify(`Withdrawal rejected: available balance is ₹${currentAccount.balance.toLocaleString('en-IN')}.`); return; } const transaction: DepositTransaction = { ...input, id: `TXN-${20500 + selected.transactions.length + depositRows.length}` }; setDepositRows((current) => current.map((row) => row.id === selected.id ? { ...row, balance: row.balance + (input.type === 'Deposit entry' ? input.amount : -input.amount), lastEntry: input.date, transactions: [transaction, ...row.transactions] } : row)); close(); notify('Deposit transaction recorded locally.'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / DEPOSITS</div><h1>Deposits</h1><p>Manage deposit accounts, customer-linked entries, balances and statements.</p></div><button className="primary-button" onClick={() => setModal('account')}><Plus size={16} /> Open deposit account</button></div><SummaryStrip items={[{ label: 'Active deposit accounts', value: String(depositRows.filter((row) => row.status === 'Active').length), tone: 'green' }, { label: 'Total deposit balance', value: `₹${(totalBalance / 100000).toFixed(2)}L` }, { label: 'Entries today', value: String(entriesToday), tone: 'orange' }, { label: 'Needs review', value: String(reviewCount), tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, account, agent or reference..." aria-label="Search deposits" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All' | Status)} aria-label="Filter deposits by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Date range selector is ready for local deposit data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); notify('Showing deposit accounts requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} deposit account records prepared for export.`)} aria-label="Export deposits"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Deposit account</th><th>Balance</th><th>Details</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => <tr key={row.id} onClick={() => { setSelected(row); setModal('detail'); }}><td><strong>{row.customerName}</strong><span>{row.accountType} · {row.customerId}</span><small>{row.id} · {row.customerPhone}</small></td><td className="table-amount">₹{row.balance.toLocaleString('en-IN')}</td><td className="table-muted">Opened {row.openedOn}<br />Last entry {row.lastEntry}</td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); setSelected(row); setModal('detail'); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>) : <tr><td colSpan={5} className="empty-state">No deposit accounts match the current search or filter.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {visibleRows.length} of {filteredRows.length} deposit accounts</span><div><button className="pagination-button selected">1</button><button className="pagination-button" onClick={() => notify('Deposit pagination is ready for local records.')}>Next</button></div></div></section>{modal === 'account' && <DepositModal mode="account" onClose={close} onSave={(input) => saveAccount(input as DepositInput)} onToast={notify} />}{modal === 'transaction' && selected && <DepositModal mode="transaction" record={selected} onClose={close} onSave={(input) => saveTransaction(input as DepositTransactionInput)} onToast={notify} />}{modal === 'detail' && selected && <DepositDetail record={selected} onClose={close} onEdit={() => setModal('account')} onTransaction={() => setModal('transaction')} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}

function CustomerModal({ title, customer, onClose, onSave }: { title: string; customer?: Row; onClose: () => void; onSave: (name: string, phone: string, status: Status) => void }) {
    const [name, setName] = useState(customer?.primary ?? '');
    const [phone, setPhone] = useState(customer?.secondary.split('·')[1]?.trim() ?? '');
    const [status, setStatus] = useState<Status>(customer?.status ?? 'Pending');
    const [error, setError] = useState('');

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setError('Full name and mobile number are required.');
            return;
        }
        onSave(name.trim(), phone.trim(), status);
    };

    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
            <div className="admin-modal-header"><div><div className="eyebrow">CUSTOMER WORKFLOW</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>
            <form className="form-grid customer-form" onSubmit={submit}>
                <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" /></label>
                <label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98XXXX0000" /></label>
                <label>Customer type<select defaultValue="Individual"><option>Individual</option><option>Business</option></select></label>
                <label>KYC status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="Pending">Pending</option><option value="Active">Verified / Active</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select></label>
                <label className="full-field">Address<textarea defaultValue="" placeholder="Registered address" /></label>
                {error && <p className="form-error full-field">{error}</p>}
                <div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save customer</button></div>
            </form>
        </section>
    </div>;
}

function CustomerDetail({ customer, onClose, onEdit, onToast }: { customer: Row; onClose: () => void; onEdit: () => void; onToast: (message: string) => void }) {
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="admin-modal customer-detail-modal" role="dialog" aria-modal="true" aria-label={`Customer ${customer.primary}`}>
            <div className="admin-modal-header"><div><div className="eyebrow">CUSTOMER PROFILE</div><h2>{customer.primary}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>
            <div className="customer-profile-summary"><div className="customer-avatar">{customer.primary.split(' ').map((part) => part[0]).join('')}</div><div><strong>{customer.id}</strong><span>{customer.secondary}</span></div><StatusPill status={customer.status} /></div>
            <div className="customer-detail-grid"><div><span>Total value</span><strong>{customer.value}</strong></div><div><span>Account status</span><strong>{customer.status}</strong></div><div><span>Active accounts</span><strong>{customer.meta}</strong></div><div><span>Last activity</span><strong>Today · 10:42 AM</strong></div></div>
            <div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast('Customer statement queued locally.')}>View statement</button><button className="primary-button" onClick={onEdit}>Edit customer</button></div>
        </section>
    </div>;
}

type CustomerService = {
    id: string;
    type: 'Deposit' | 'RD' | 'FD' | 'Loan';
    accountNumber: string;
    label: string;
    amount: string;
    detail: string;
    status: Status;
};

type CustomerTransaction = {
    id: string;
    type: 'Deposit collection' | 'RD installment' | 'Loan repayment' | 'Withdrawal';
    amount: string;
    date: string;
    agent: string;
    reference: string;
    status: Status;
    paymentMethod?: string;
    externalReference?: string;
    location?: string;
    deviceReference?: string;
    offlineSyncReference?: string;
    narration?: string;
    supportingDocuments?: string;
};

type CustomerRecord = Row & {
    address: string;
    customerType: 'Individual' | 'Business';
    nomineeName: string;
    nomineePhone: string;
    nomineeRelation: string;
    assignedAgent: string;
    registrationDate: string;
    services: CustomerService[];
    transactions: CustomerTransaction[];
};

const customerRowsSeed = rows.customers ?? [];
const customerSeed: CustomerRecord[] = [
    { ...customerRowsSeed[0]!, address: '12 Finance Street, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Ritu Joshi', nomineePhone: '98XXXX7788', nomineeRelation: 'Spouse', assignedAgent: 'Rajesh Kumar', registrationDate: '2024-02-14', services: [{ id: 'svc-1', type: 'RD', accountNumber: 'RD-2024108', label: 'Monthly recurring deposit', amount: '₹3,000 / month', detail: 'Due 12 Aug 2026', status: 'Active' }, { id: 'svc-2', type: 'Loan', accountNumber: 'LN-30472', label: 'Home loan', amount: '₹12,40,000 outstanding', detail: '₹24,800 installment', status: 'Active' }], transactions: [{ id: 'TXN-20481', type: 'RD installment', amount: '₹3,000', date: '08 Aug 2026 · 10:42 AM', agent: 'Rajesh Kumar', reference: 'RCT-88201', status: 'Completed' }] },
    { ...customerRowsSeed[1]!, address: '44 Market Road, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Kiran Patel', nomineePhone: '97XXXX4488', nomineeRelation: 'Parent', assignedAgent: 'Priya Sharma', registrationDate: '2023-09-04', services: [{ id: 'svc-3', type: 'Loan', accountNumber: 'LN-30481', label: 'Gold loan', amount: '₹4,82,000 outstanding', detail: '₹8,500 installment due', status: 'Review' }], transactions: [{ id: 'TXN-20480', type: 'Loan repayment', amount: '₹8,500', date: '08 Aug 2026 · 10:31 AM', agent: 'Priya Sharma', reference: 'RCT-88200', status: 'Completed' }] },
    { ...customerRowsSeed[2]!, address: '8 Lake View Colony, Jaipur, Rajasthan', customerType: 'Business', nomineeName: 'Asha Rao', nomineePhone: '99XXXX2288', nomineeRelation: 'Partner', assignedAgent: 'Amit Verma', registrationDate: '2022-11-19', services: [{ id: 'svc-4', type: 'FD', accountNumber: 'FD-2024071', label: 'Fixed deposit', amount: '₹1,00,000', detail: 'Matures 18 Jul 2026 · 7.5%', status: 'Review' }, { id: 'svc-5', type: 'Deposit', accountNumber: 'DEP-78144', label: 'Savings deposit', amount: '₹46,000 balance', detail: 'Last entry 08 Aug 2026', status: 'Active' }], transactions: [{ id: 'TXN-20479', type: 'Deposit collection', amount: '₹5,000', date: '08 Aug 2026 · 10:18 AM', agent: 'Amit Verma', reference: 'RCT-88199', status: 'Pending' }] },
    { ...customerRowsSeed[3]!, address: '19 Station Lane, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Mohan Devi', nomineePhone: '96XXXX1188', nomineeRelation: 'Parent', assignedAgent: 'Neha Singh', registrationDate: '2025-01-08', services: [{ id: 'svc-6', type: 'RD', accountNumber: 'RD-2024099', label: 'Monthly recurring deposit', amount: '₹2,500 / month', detail: 'Due 10 Aug 2026', status: 'Pending' }], transactions: [{ id: 'TXN-20478', type: 'RD installment', amount: '₹2,500', date: '08 Aug 2026 · 09:56 AM', agent: 'Neha Singh', reference: 'RCT-88198', status: 'Review' }] },
    { ...customerRowsSeed[4]!, address: '2 Old Town, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Suresh Gupta', nomineePhone: '98XXXX1188', nomineeRelation: 'Sibling', assignedAgent: 'Unassigned', registrationDate: '2021-06-23', services: [], transactions: [] },
];

type CustomerInput = Pick<CustomerRecord, 'primary' | 'status' | 'address' | 'customerType' | 'nomineeName' | 'nomineePhone' | 'nomineeRelation' | 'assignedAgent' | 'registrationDate'> & { phone: string };

function ScopedCustomerModal({ customer, onClose, onSave }: { customer?: CustomerRecord; onClose: () => void; onSave: (record: CustomerInput) => void }) {
    const [name, setName] = useState(customer?.primary ?? '');
    const [phone, setPhone] = useState(customer?.secondary.split('·')[1]?.trim() ?? '');
    const [address, setAddress] = useState(customer?.address ?? '');
    const [customerType, setCustomerType] = useState<CustomerRecord['customerType']>(customer?.customerType ?? 'Individual');
    const [status, setStatus] = useState<Status>(customer?.status ?? 'Pending');
    const [nomineeName, setNomineeName] = useState(customer?.nomineeName ?? '');
    const [nomineePhone, setNomineePhone] = useState(customer?.nomineePhone ?? '');
    const [nomineeRelation, setNomineeRelation] = useState(customer?.nomineeRelation ?? '');
    const [assignedAgent, setAssignedAgent] = useState(customer?.assignedAgent ?? 'Unassigned');
    const [registrationDate, setRegistrationDate] = useState(customer?.registrationDate ?? '2026-08-08');
    const [error, setError] = useState('');
    const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim() || !phone.trim() || !address.trim() || !nomineeName.trim() || !nomineePhone.trim() || !nomineeRelation.trim()) { setError('Name, mobile, address and complete nominee details are required.'); return; } onSave({ primary: name.trim(), phone: phone.trim(), status, address: address.trim(), customerType, nomineeName: nomineeName.trim(), nomineePhone: nomineePhone.trim(), nomineeRelation: nomineeRelation.trim(), assignedAgent, registrationDate }); };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={customer ? 'Edit customer' : 'Add customer'}><div className="admin-modal-header"><div><div className="eyebrow">CUSTOMER WORKFLOW</div><h2>{customer ? 'Edit customer profile' : 'Add customer profile'}</h2><p>Capture the complete customer record required for account and collection operations.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" /></label><label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98XXXX0000" /></label><label>Customer type<select value={customerType} onChange={(event) => setCustomerType(event.target.value as CustomerRecord['customerType'])}><option>Individual</option><option>Business</option></select></label><label>Account status / KYC<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="Pending">Pending</option><option value="Active">Verified / Active</option><option value="Review">Needs review</option><option value="Inactive">Inactive</option></select></label><label>Registration date<input type="date" value={registrationDate} onChange={(event) => setRegistrationDate(event.target.value)} /></label><label>Assigned collection agent<select value={assignedAgent} onChange={(event) => setAssignedAgent(event.target.value)}><option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option><option>Unassigned</option></select></label><label className="full-field">Registered address<textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Complete customer address" /></label><div className="form-section-label full-field">Nominee details</div><label>Nominee name<input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} placeholder="Nominee full name" /></label><label>Nominee mobile<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} placeholder="Nominee mobile number" /></label><label>Relationship with nominee<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} placeholder="Spouse, parent, sibling..." /></label>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save customer</button></div></form></section></div>;
}

function ScopedCustomerDetail({ customer, onClose, onEdit, onToast }: { customer: CustomerRecord; onClose: () => void; onEdit: () => void; onToast: (message: string) => void }) {
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Customer ${customer.primary}`}><div className="admin-modal-header"><div><div className="eyebrow">CUSTOMER PROFILE / {customer.id}</div><h2>{customer.primary}</h2><p>Complete profile, active services and transaction history.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{customer.primary.split(' ').map((part) => part[0]).join('')}</div><div><strong>{customer.id}</strong><span>{customer.secondary} · Registered {customer.registrationDate}</span></div><StatusPill status={customer.status} /></div><div className="customer-detail-grid"><div><span>Customer type</span><strong>{customer.customerType}</strong></div><div><span>Assigned agent</span><strong>{customer.assignedAgent}</strong></div><div><span>Mobile number</span><strong>{customer.secondary.split('·')[1]?.trim()}</strong></div><div><span>Address</span><strong>{customer.address}</strong></div><div><span>Nominee</span><strong>{customer.nomineeName} · {customer.nomineeRelation}</strong></div><div><span>Nominee mobile</span><strong>{customer.nomineePhone}</strong></div><div><span>Total value</span><strong>{customer.value}</strong></div><div><span>Account status</span><strong>{customer.status}</strong></div></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Active accounts and services</h3><p>Deposit, RD, FD and loan services mapped to this customer.</p></div><span>{customer.services.length} services</span></div>{customer.services.length ? <div className="customer-service-list">{customer.services.map((service) => <div className="customer-service-row" key={service.id}><div><strong>{service.label}</strong><span>{service.type} · {service.accountNumber}</span></div><div><b>{service.amount}</b><small>{service.detail}</small></div><StatusPill status={service.status} /><button className="row-action" onClick={() => onToast(`${service.accountNumber} details opened locally.`)} aria-label={`Open ${service.accountNumber}`}><ChevronRight size={16} /></button></div>)}</div> : <p className="customer-empty">No active accounts or services mapped.</p>}</section><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Transaction history</h3><p>Customer-wise collection, repayment and withdrawal records.</p></div><span>{customer.transactions.length} transactions</span></div>{customer.transactions.length ? <div className="customer-transaction-list">{customer.transactions.map((transaction) => <div className="customer-transaction-row" key={transaction.id}><div><strong>{transaction.type}</strong><span>{transaction.id} · {transaction.date}</span></div><div><b>{transaction.amount}</b><small>{transaction.agent} · {transaction.reference}</small></div><StatusPill status={transaction.status} /></div>)}</div> : <p className="customer-empty">No transaction history available.</p>}</section><div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast(`Statement for ${customer.id} prepared locally.`)}><Download size={15} /> View / export statement</button><button className="primary-button" onClick={onEdit}>Edit customer</button></div></section></div>;
}

function ScopedCustomerPage() {
    const [customerRows, setCustomerRows] = useState<CustomerRecord[]>(customerSeed);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<CustomerRecord | undefined>();
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = customerRows.filter((row) => `${row.id} ${row.primary} ${row.secondary} ${row.address} ${row.assignedAgent} ${row.services.map((service) => `${service.accountNumber} ${service.type}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const activeCount = customerRows.filter((row) => row.status === 'Active').length;
    const reviewCount = customerRows.filter((row) => row.status === 'Review' || row.status === 'Pending').length;
    const saveCustomer = (input: CustomerInput) => {
        if (modal === 'edit' && selected) { setCustomerRows((current) => current.map((row) => row.id === selected.id ? { ...row, ...input, secondary: `${row.id} · ${input.phone}` } : row)); close(); notify('Customer profile updated locally.'); return; }
        const id = `CUS-${10500 + customerRows.length}`;
        setCustomerRows((current) => [{ ...input, id, secondary: `${id} · ${input.phone}`, value: '₹0', meta: 'No active accounts', services: [], transactions: [] }, ...current]); setPage(1); close(); notify('Customer profile created locally.');
    };
    const openDetail = (customer: CustomerRecord) => { setSelected(customer); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / CUSTOMERS</div><h1>Customers</h1><p>Manage profiles, nominees, assigned agents, accounts, services and customer history.</p></div><button className="primary-button" onClick={() => setModal('add')}><Plus size={16} /> Add customer</button></div><div className="summary-strip"><div className="summary-item"><span>Total customers</span><strong>{customerRows.length}</strong></div><div className="summary-item"><span>Active customers</span><strong className="green">{activeCount}</strong></div><div className="summary-item"><span>New this month</span><strong>{customerRows.filter((row) => row.registrationDate.startsWith('2026-08')).length}</strong></div><div className="summary-item"><span>Needs review</span><strong className="orange">{reviewCount}</strong></div></div><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, ID, mobile, account or agent..." aria-label="Search customers" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter customers by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Date range selector is ready for local customer data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); setPage(1); notify('Showing customers requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} customer records prepared for export.`)} aria-label="Export customer data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Amount / Value</th><th>Accounts / Agent</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} onClick={() => openDetail(row)}><td><strong>{row.primary}</strong><span>{row.secondary}</span><small>{row.address}</small></td><td className="table-amount">{row.value}</td><td className="table-muted"><strong>{row.services.length} services</strong><span>{row.assignedAgent}</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); openDetail(row); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!visibleRows.length && <div className="customer-empty">No customers match the selected search and status filters.</div>}</div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} customers</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} className={`pagination-button ${page === number ? 'selected' : ''}`} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{modal === 'add' && <ScopedCustomerModal onClose={close} onSave={saveCustomer} />}{modal === 'edit' && selected && <ScopedCustomerModal customer={selected} onClose={close} onSave={saveCustomer} />}{modal === 'detail' && selected && <ScopedCustomerDetail customer={selected} onClose={close} onEdit={() => setModal('edit')} onToast={notify} />}{toast && <div className="admin-toast" role="status">{toast}</div>}</div>;
}

function CustomerPage() {
    const [customerRows, setCustomerRows] = useState<Row[]>(getRows('customers'));
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<Row | undefined>();
    const [toast, setToast] = useState('');

    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const filteredRows = customerRows.filter((row) => {
        const matchesSearch = `${row.id} ${row.primary} ${row.secondary}`.toLowerCase().includes(search.toLowerCase());
        return matchesSearch && (statusFilter === 'All' || row.status === statusFilter);
    });
    const saveCustomer = (name: string, phone: string, status: Status) => {
        if (modal === 'edit' && selected) {
            setCustomerRows((current) => current.map((row) => row.id === selected.id ? { ...row, primary: name, secondary: `${row.id} · ${phone}`, status } : row));
            close(); notify('Customer profile updated locally.');
            return;
        }
        const newCustomer: Row = { id: `CUS-${10500 + customerRows.length}`, primary: name, secondary: `CUS-${10500 + customerRows.length} · ${phone}`, value: '₹0', meta: 'No active accounts', status };
        setCustomerRows((current) => [newCustomer, ...current]);
        close(); notify('Customer profile created locally.');
    };
    const exportCustomers = () => notify(`${filteredRows.length} customer records prepared for export.`);

    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / CUSTOMERS</div><h1>Customers</h1><p>Manage customer profiles, accounts, nominees and history.</p></div><button className="primary-button" onClick={() => setModal('add')}><Plus size={16} /> Add customer</button></div><div className="summary-strip"><div className="summary-item"><span>Total customers</span><strong>2,847</strong></div><div className="summary-item"><span>Active customers</span><strong className="green">2,691</strong></div><div className="summary-item"><span>New this month</span><strong>124</strong></div><div className="summary-item"><span>Needs review</span><strong className="orange">16</strong></div></div><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, ID or mobile..." aria-label="Search customers" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All' | Status)} aria-label="Filter customers by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Inactive">Inactive</option></select><button className="filter-button" onClick={() => notify('Date range selector is ready for API data.')}><CalendarDays size={15} /> Date range</button><button className="filter-button" onClick={() => { setStatusFilter('Review'); notify('Showing customers requiring review.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={exportCustomers} aria-label="Export customer data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Amount / Value</th><th>Details</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id} onClick={() => { setSelected(row); setModal('detail'); }}><td><strong>{row.primary}</strong><span>{row.secondary}</span><small>{row.id}</small></td><td className="table-amount">{row.value}</td><td className="table-muted">{row.meta}</td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); setSelected(row); setModal('detail'); }} aria-label={`Open ${row.id}`}><ChevronRight size={16} /></button></td></tr>)}{filteredRows.length === 0 && <tr><td colSpan={5} className="empty-state">No customers match the current search or filter.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {filteredRows.length} of 2,847 records</span><div><button className="pagination-button" onClick={() => notify('Already on the first page.')}>Previous</button><button className="pagination-button selected">1</button><button className="pagination-button" onClick={() => notify('Page 2 selected locally.')}>2</button><button className="pagination-button" onClick={() => notify('Next page selected locally.')}>Next</button></div></div></section>{modal === 'add' && <CustomerModal title="Add customer" onClose={close} onSave={saveCustomer} />}{modal === 'edit' && selected && <CustomerModal title="Edit customer" customer={selected} onClose={close} onSave={saveCustomer} />}{modal === 'detail' && selected && <CustomerDetail customer={selected} onClose={close} onEdit={() => setModal('edit')} onToast={notify} />}{toast && <div className="admin-toast"><CheckCircle2 size={17} /><span>{toast}</span></div>}</div>;
}

type AgentEvent = {
    id: string;
    type: string;
    date: string;
    performedBy: string;
    note: string;
};

type AgentRecord = {
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

type AgentInput = Omit<AgentRecord, 'id' | 'todayCollected' | 'pendingAmount' | 'transactionCount' | 'syncStatus' | 'lastSync' | 'events'>;

const agentSeed: AgentRecord[] = [
    { id: 'AGT-0018', name: 'Rajesh Kumar', phone: '98XXXX1201', email: 'rajesh.kumar@finora.coop', employeeCode: 'EMP-1842', role: 'Senior Collection Agent', status: 'Active', accessStatus: 'Enabled', route: 'Jaipur East / Sitapura', joinedOn: '2022-04-18', assignedCustomerIds: ['CUS-10482'], todayCollected: 58400, pendingAmount: 6200, transactionCount: 18, syncStatus: 'Synced', lastSync: '08 Aug 2026 · 10:46 AM', events: [{ id: 'AGE-1', type: 'Collection recorded', date: '08 Aug 2026 · 10:42 AM', performedBy: 'Rajesh Kumar', note: 'RD installment received from Meera Joshi.' }, { id: 'AGE-2', type: 'Access enabled', date: '01 Aug 2026 · 09:00 AM', performedBy: 'Arjun Kapoor', note: 'Mobile collection access confirmed.' }] },
    { id: 'AGT-0017', name: 'Priya Sharma', phone: '97XXXX2202', email: 'priya.sharma@finora.coop', employeeCode: 'EMP-1764', role: 'Collection Agent', status: 'Active', accessStatus: 'Enabled', route: 'Jaipur Central / Market Road', joinedOn: '2023-01-09', assignedCustomerIds: ['CUS-10481'], todayCollected: 42600, pendingAmount: 8500, transactionCount: 14, syncStatus: 'Pending sync', lastSync: '08 Aug 2026 · 10:25 AM', events: [{ id: 'AGE-3', type: 'Pending collection', date: '08 Aug 2026 · 10:31 AM', performedBy: 'Priya Sharma', note: 'Loan repayment is awaiting mobile synchronization.' }] },
    { id: 'AGT-0016', name: 'Amit Verma', phone: '99XXXX3303', email: 'amit.verma@finora.coop', employeeCode: 'EMP-1651', role: 'Collection Agent', status: 'Active', accessStatus: 'Enabled', route: 'Jaipur North / Lake View', joinedOn: '2023-07-22', assignedCustomerIds: ['CUS-10480'], todayCollected: 31800, pendingAmount: 5000, transactionCount: 10, syncStatus: 'Synced', lastSync: '08 Aug 2026 · 10:20 AM', events: [{ id: 'AGE-4', type: 'Collection recorded', date: '08 Aug 2026 · 10:18 AM', performedBy: 'Amit Verma', note: 'Deposit collection received from Sanjay Rao.' }] },
    { id: 'AGT-0015', name: 'Neha Singh', phone: '96XXXX4404', email: 'neha.singh@finora.coop', employeeCode: 'EMP-1588', role: 'Collection Agent', status: 'Inactive', accessStatus: 'Locked', route: 'Jaipur West / Station Lane', joinedOn: '2024-02-12', assignedCustomerIds: ['CUS-10479'], todayCollected: 12400, pendingAmount: 2500, transactionCount: 7, syncStatus: 'Failed sync', lastSync: '07 Aug 2026 · 06:10 PM', events: [{ id: 'AGE-5', type: 'Access locked', date: '08 Aug 2026 · 08:15 AM', performedBy: 'Arjun Kapoor', note: 'Agent deactivated pending review of failed synchronization.' }] },
];

function AgentModal({ mode, record, onClose, onSave }: { mode: 'add' | 'edit'; record?: AgentRecord; onClose: () => void; onSave: (input: AgentInput) => void }) {
    const [name, setName] = useState(record?.name ?? ''); const [phone, setPhone] = useState(record?.phone ?? ''); const [email, setEmail] = useState(record?.email ?? ''); const [employeeCode, setEmployeeCode] = useState(record?.employeeCode ?? ''); const [role, setRole] = useState<AgentRecord['role']>(record?.role ?? 'Collection Agent'); const [status, setStatus] = useState<Status>(record?.status ?? 'Active'); const [accessStatus, setAccessStatus] = useState<AgentRecord['accessStatus']>(record?.accessStatus ?? 'Enabled'); const [route, setRoute] = useState(record?.route ?? ''); const [joinedOn, setJoinedOn] = useState(record?.joinedOn ?? '2026-08-08'); const [assignedCustomerIds, setAssignedCustomerIds] = useState(record?.assignedCustomerIds ?? []); const [branch, setBranch] = useState(record?.branch ?? ''); const [supervisor, setSupervisor] = useState(record?.supervisor ?? ''); const [identityReference, setIdentityReference] = useState(record?.identityReference ?? ''); const [employmentDocumentReferences, setEmploymentDocumentReferences] = useState(record?.employmentDocumentReferences ?? ''); const [emergencyContact, setEmergencyContact] = useState(record?.emergencyContact ?? ''); const [registeredDevice, setRegisteredDevice] = useState(record?.registeredDevice ?? ''); const [appVersion, setAppVersion] = useState(record?.appVersion ?? ''); const [lastKnownLocation, setLastKnownLocation] = useState(record?.lastKnownLocation ?? ''); const [routeEffectiveFrom, setRouteEffectiveFrom] = useState(record?.routeEffectiveFrom ?? ''); const [routeEffectiveTo, setRouteEffectiveTo] = useState(record?.routeEffectiveTo ?? ''); const [assignmentEffectiveFrom, setAssignmentEffectiveFrom] = useState(record?.assignmentEffectiveFrom ?? ''); const [assignmentEffectiveTo, setAssignmentEffectiveTo] = useState(record?.assignmentEffectiveTo ?? ''); const [collectionLimit, setCollectionLimit] = useState(record?.collectionLimit ?? ''); const [cashHoldingLimit, setCashHoldingLimit] = useState(record?.cashHoldingLimit ?? ''); const [invitationReference, setInvitationReference] = useState(record?.invitationReference ?? ''); const [mfaPinStatus, setMfaPinStatus] = useState(record?.mfaPinStatus ?? ''); const [deactivationReason, setDeactivationReason] = useState(record?.deactivationReason ?? ''); const [error, setError] = useState('');
    const toggleCustomer = (id: string) => setAssignedCustomerIds((current) => current.includes(id) ? current.filter((customerId) => customerId !== id) : [...current, id]);
    const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim() || !phone.trim() || !email.trim() || !employeeCode.trim() || !route.trim() || !joinedOn) { setError('Name, mobile, email, employee code, route and joining date are required.'); return; } onSave({ name: name.trim(), phone: phone.trim(), email: email.trim(), employeeCode: employeeCode.trim(), role, status, accessStatus, route: route.trim(), joinedOn, assignedCustomerIds, branch: branch.trim(), supervisor: supervisor.trim(), identityReference: identityReference.trim(), employmentDocumentReferences: employmentDocumentReferences.trim(), emergencyContact: emergencyContact.trim(), registeredDevice: registeredDevice.trim(), appVersion: appVersion.trim(), lastKnownLocation: lastKnownLocation.trim(), routeEffectiveFrom, routeEffectiveTo, assignmentEffectiveFrom, assignmentEffectiveTo, collectionLimit: collectionLimit.trim(), cashHoldingLimit: cashHoldingLimit.trim(), invitationReference: invitationReference.trim(), mfaPinStatus: mfaPinStatus.trim(), deactivationReason: deactivationReason.trim() }); };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'add' ? 'Add collection agent' : 'Edit collection agent'}><div className="admin-modal-header"><div><div className="eyebrow">AGENT ACCESS WORKFLOW</div><h2>{mode === 'add' ? 'Add collection agent' : `Edit ${record?.name}`}</h2><p>Maintain identity, controlled mobile access, route ownership and customer assignments.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={submit}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Agent name" /></label><label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98XXXX0000" /></label><label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="agent@finora.coop" /></label><label>Employee code<input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} placeholder="EMP-1901" /></label><label>Agent role<select value={role} onChange={(event) => setRole(event.target.value as AgentRecord['role'])}><option>Collection Agent</option><option>Senior Collection Agent</option></select></label><label>Account status<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Review">Needs review</option><option value="Pending">Pending approval</option></select></label><label>Mobile application access<select value={accessStatus} onChange={(event) => setAccessStatus(event.target.value as AgentRecord['accessStatus'])}><option>Enabled</option><option>Locked</option><option>Pending invitation</option></select></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Branch" /></label><label>Supervisor<input value={supervisor} onChange={(event) => setSupervisor(event.target.value)} placeholder="Supervisor" /></label><label>Route / area<input value={route} onChange={(event) => setRoute(event.target.value)} placeholder="Jaipur East / Sitapura" /></label><label>Joining date<input type="date" value={joinedOn} onChange={(event) => setJoinedOn(event.target.value)} /></label><label>Identity reference<input value={identityReference} onChange={(event) => setIdentityReference(event.target.value)} placeholder="Identity verification reference" /></label><label>Emergency contact<input value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} placeholder="Name and phone" /></label><label>Registered device<input value={registeredDevice} onChange={(event) => setRegisteredDevice(event.target.value)} placeholder="Device identifier" /></label><label>App version<input value={appVersion} onChange={(event) => setAppVersion(event.target.value)} placeholder="Mobile app version" /></label><label>Last known location<input value={lastKnownLocation} onChange={(event) => setLastKnownLocation(event.target.value)} placeholder="Last location reference" /></label><label>Route effective from<input type="date" value={routeEffectiveFrom} onChange={(event) => setRouteEffectiveFrom(event.target.value)} /></label><label>Route effective to<input type="date" value={routeEffectiveTo} onChange={(event) => setRouteEffectiveTo(event.target.value)} /></label><label>Assignment effective from<input type="date" value={assignmentEffectiveFrom} onChange={(event) => setAssignmentEffectiveFrom(event.target.value)} /></label><label>Assignment effective to<input type="date" value={assignmentEffectiveTo} onChange={(event) => setAssignmentEffectiveTo(event.target.value)} /></label><label>Collection limit<input value={collectionLimit} onChange={(event) => setCollectionLimit(event.target.value)} placeholder="Configured limit" /></label><label>Cash holding limit<input value={cashHoldingLimit} onChange={(event) => setCashHoldingLimit(event.target.value)} placeholder="Configured limit" /></label><label>Invitation reference<input value={invitationReference} onChange={(event) => setInvitationReference(event.target.value)} placeholder="Invitation reference" /></label><label>MFA / PIN status<input value={mfaPinStatus} onChange={(event) => setMfaPinStatus(event.target.value)} placeholder="Enrollment or PIN status" /></label><label className="full-field">Employment document references<textarea value={employmentDocumentReferences} onChange={(event) => setEmploymentDocumentReferences(event.target.value)} placeholder="Employment and verification documents" /></label><label className="full-field">Deactivation reason<textarea value={deactivationReason} onChange={(event) => setDeactivationReason(event.target.value)} placeholder="Capture when applicable" /></label><div className="full-field"><span className="field-label">Assigned customers</span><div className="agent-assignment-list">{customerSeed.map((customer) => <label key={customer.id} className="checkbox-row"><input type="checkbox" checked={assignedCustomerIds.includes(customer.id)} onChange={() => toggleCustomer(customer.id)} />{customer.primary} · {customer.id}</label>)}</div></div>{error && <p className="form-error full-field">{error}</p>}<div className="admin-form-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save agent locally</button></div></form></section></div>;
}
function AgentDetail({ agent, onClose, onEdit, onToggle, onToast }: { agent: AgentRecord; onClose: () => void; onEdit: () => void; onToggle: () => void; onToast: (message: string) => void }) {
    const assignedCustomers = customerSeed.filter((customer) => agent.assignedCustomerIds.includes(customer.id));
    const metadata = [['Branch', agent.branch], ['Supervisor', agent.supervisor], ['Identity reference', agent.identityReference], ['Employment documents', agent.employmentDocumentReferences], ['Emergency contact', agent.emergencyContact], ['Registered device', agent.registeredDevice], ['App version', agent.appVersion], ['Last known location', agent.lastKnownLocation], ['Route effective period', `${agent.routeEffectiveFrom || 'Not captured'} to ${agent.routeEffectiveTo || 'Not captured'}`], ['Assignment effective period', `${agent.assignmentEffectiveFrom || 'Not captured'} to ${agent.assignmentEffectiveTo || 'Not captured'}`], ['Collection limit', agent.collectionLimit], ['Cash holding limit', agent.cashHoldingLimit], ['Invitation reference', agent.invitationReference], ['MFA / PIN status', agent.mfaPinStatus], ['Deactivation reason', agent.deactivationReason]] as const;
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Agent ${agent.name}`}><div className="admin-modal-header"><div><div className="eyebrow">COLLECTION AGENT / {agent.id}</div><h2>{agent.name}</h2><p>{agent.employeeCode} · {agent.role} · {agent.route}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{agent.name.split(' ').map((part) => part[0]).join('')}</div><div><strong>{agent.phone}</strong><span>{agent.email} · Joined {agent.joinedOn}</span></div><StatusPill status={agent.status} /></div><div className="customer-detail-grid"><div><span>Mobile access</span><strong>{agent.accessStatus}</strong></div><div><span>Today's collection</span><strong className="green-text">₹{agent.todayCollected.toLocaleString('en-IN')}</strong></div><div><span>Pending collection</span><strong className="orange-text">₹{agent.pendingAmount.toLocaleString('en-IN')}</strong></div><div><span>Transactions today</span><strong>{agent.transactionCount}</strong></div><div><span>Sync status</span><strong>{agent.syncStatus}</strong></div><div><span>Last synchronization</span><strong>{agent.lastSync}</strong></div><div><span>Assigned customers</span><strong>{agent.assignedCustomerIds.length}</strong></div>{metadata.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not captured'}</strong></div>)}</div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Assigned customers</h3><p>Customers available to this agent in the mobile application.</p></div><span>{assignedCustomers.length} customers</span></div><div className="agent-customer-list">{assignedCustomers.length ? assignedCustomers.map((customer) => <div className="customer-transaction-row" key={customer.id}><div><strong>{customer.primary}</strong><span>{customer.id} · {customer.secondary}</span></div><div><b>{customer.assignedAgent}</b><small>{customer.status}</small></div></div>) : <p className="empty-state">No customer assignments captured.</p>}</div></section><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Agent history</h3><p>Operational access and collection events captured locally for review.</p></div><span>{agent.events.length} events</span></div><div className="customer-transaction-list">{agent.events.map((event) => <div className="customer-transaction-row" key={event.id}><div><strong>{event.type}</strong><span>{event.date} · {event.performedBy}</span></div><small>{event.note}</small></div>)}</div></section><div className="customer-detail-actions"><button className="secondary-button" onClick={() => onToast('Agent collection statement prepared locally.')}>View statement</button><button className="secondary-button" onClick={onEdit}>Edit agent</button><button className="primary-button" onClick={onToggle}><ShieldCheck size={15} /> {agent.status === 'Active' ? 'Deactivate locally' : 'Activate locally'}</button></div></section></div>;
}
function ScopedAgentsPage() {
    const [agentRows, setAgentRows] = useState<AgentRecord[]>(agentSeed);
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
    const filteredRows = agentRows.filter((agent) => `${agent.id} ${agent.name} ${agent.phone} ${agent.email} ${agent.employeeCode} ${agent.role} ${agent.route} ${agent.syncStatus}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || agent.status === statusFilter) && (accessFilter === 'All' || agent.accessStatus === accessFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const saveAgent = (input: AgentInput) => { const event: AgentEvent = { id: `AGE-${100 + agentRows.length}`, type: modal === 'edit' ? 'Agent profile updated' : 'Agent created', date: '08 Aug 2026 · 11:00 AM', performedBy: 'Arjun Kapoor', note: `${input.assignedCustomerIds.length} customer assignments and mobile access settings saved locally.` }; if (modal === 'edit' && selected) { setAgentRows((current) => current.map((agent) => agent.id === selected.id ? { ...agent, ...input, events: [event, ...agent.events] } : agent)); close(); notify('Agent profile, access and assignments updated locally.'); return; } const id = `AGT-${String(19 + agentRows.length).padStart(4, '0')}`; setAgentRows((current) => [{ ...input, id, todayCollected: 0, pendingAmount: 0, transactionCount: 0, syncStatus: 'Pending sync', lastSync: 'Not synchronized', events: [event] }, ...current]); setPage(1); close(); notify('Collection agent created locally.'); };
    const toggleAgent = (agent: AgentRecord) => { const nextStatus: Status = agent.status === 'Active' ? 'Inactive' : 'Active'; const nextAccess: AgentRecord['accessStatus'] = nextStatus === 'Active' ? 'Enabled' : 'Locked'; const event: AgentEvent = { id: `AGE-${200 + agent.events.length}`, type: nextStatus === 'Active' ? 'Agent activated' : 'Agent deactivated', date: '08 Aug 2026 · 11:05 AM', performedBy: 'Arjun Kapoor', note: `Mobile application access ${nextAccess.toLowerCase()}.` }; setAgentRows((current) => current.map((row) => row.id === agent.id ? { ...row, status: nextStatus, accessStatus: nextAccess, events: [event, ...row.events] } : row)); close(); notify(`${agent.name} ${nextStatus === 'Active' ? 'activated' : 'deactivated'} locally.`); };
    const openDetail = (agent: AgentRecord) => { setSelected(agent); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / COLLECTION AGENTS</div><h1>Collection Agents</h1><p>Manage agent identity, controlled mobile access, customer assignments and collection performance.</p></div><button className="primary-button" onClick={() => setModal('add')}><UserPlus size={16} /> Add collection agent</button></div><SummaryStrip items={[{ label: 'Active agents', value: String(agentRows.filter((agent) => agent.status === 'Active').length), tone: 'green' }, { label: 'On route today', value: String(agentRows.filter((agent) => agent.status === 'Active' && agent.assignedCustomerIds.length > 0).length) }, { label: 'Pending sync', value: String(agentRows.filter((agent) => agent.syncStatus !== 'Synced').length), tone: 'orange' }, { label: 'Pending collections', value: `₹${agentRows.reduce((total, agent) => total + agent.pendingAmount, 0).toLocaleString('en-IN')}`, tone: 'red' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search agent, employee code, route or sync status..." aria-label="Search collection agents" /></div><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'All' | Status); setPage(1); }} aria-label="Filter agents by status"><option value="All">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Review">Needs review</option><option value="Pending">Pending approval</option></select><select className="filter-button customer-status-filter" value={accessFilter} onChange={(event) => { setAccessFilter(event.target.value as typeof accessFilter); setPage(1); }} aria-label="Filter agents by mobile access"><option value="All">All access states</option><option>Enabled</option><option>Locked</option><option>Pending invitation</option></select><button className="filter-button" onClick={() => notify('Daily collection date range is ready for local agent data.')}><CalendarDays size={15} /> Daily collections</button><button className="filter-button" onClick={() => { setAccessFilter('Pending invitation'); setPage(1); notify('Showing agents with pending mobile access.'); }}><SlidersHorizontal size={15} /> Filters</button><button className="icon-button export-button" onClick={() => notify(`${filteredRows.length} agent records prepared for export.`)} aria-label="Export agent data"><Download size={16} /></button></div><div className="data-table-wrap"><table className="data-table agent-table"><thead><tr><th>Agent</th><th>Role / Route</th><th>Assigned customers</th><th>Today's collection</th><th>Pending</th><th>Access / Sync</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{visibleRows.map((agent) => <tr key={agent.id}><td><strong>{agent.name}</strong><span>{agent.id} · {agent.employeeCode}</span><small>{agent.phone}</small></td><td><strong>{agent.role}</strong><span>{agent.route}</span></td><td><strong>{agent.assignedCustomerIds.length}</strong><span>{agent.transactionCount} transactions today</span></td><td className="collection-amount">₹{agent.todayCollected.toLocaleString('en-IN')}</td><td className="orange-text">₹{agent.pendingAmount.toLocaleString('en-IN')}</td><td><span className="agent-access-state">{agent.accessStatus}</span><small>{agent.syncStatus}</small></td><td><StatusPill status={agent.status} /></td><td><button className="row-action" onClick={() => openDetail(agent)} aria-label={`Open ${agent.name}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!visibleRows.length && <div className="empty-state"><strong>No agents match these filters</strong><span>Adjust search or access filters to view more records.</span></div>}</div><div className="table-footer"><span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} agents</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button className={`pagination-button ${page === number ? 'selected' : ''}`} key={number} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{toast && <div className="admin-toast"><CheckCircle2 size={16} />{toast}</div>}{modal === 'add' && <AgentModal mode="add" onClose={close} onSave={saveAgent} />}{modal === 'edit' && selected && <AgentModal mode="edit" record={selected} onClose={close} onSave={saveAgent} />}{modal === 'detail' && selected && <AgentDetail agent={selected} onClose={close} onEdit={() => setModal('edit')} onToggle={() => toggleAgent(selected)} onToast={notify} />}</div>;
}

type SettingsSection = 'organization' | 'collection' | 'receipts' | 'notifications' | 'retention';

type SettingsState = {
    organizationName: string;
    registrationNumber: string;
    primaryPhone: string;
    timezone: string;
    currency: string;
    fiscalYear: string;
    branchCode: string;
    branchName: string;
    address: string;
    approvalPolicy: string;
    collectionLimit: string;
    cashHoldingLimit: string;
    notificationChannels: string;
    retentionExceptionReference: string;
    auditOwner: string;
    defaultCollectionMode: 'Doorstep' | 'Branch' | 'Mixed';
    gracePeriodDays: string;
    requireGeoTag: boolean;
    allowOfflineCollection: boolean;
    receiptPrefix: string;
    nextReceiptNumber: string;
    receiptFooter: string;
    smsReceipts: boolean;
    emailStatements: boolean;
    overdueAlerts: boolean;
    notificationEmail: string;
    auditRetention: string;
    transactionRetention: string;
    autoArchive: boolean;
};

const settingsSeed: SettingsState = {
    organizationName: 'Finora Cooperative Finance', registrationNumber: 'CF-2019-8841', primaryPhone: '+91 98XXXX0000', timezone: 'Asia/Kolkata', currency: 'INR', fiscalYear: '2026-2027', branchCode: 'JPR-CENTRAL', branchName: 'Jaipur Central Branch', address: '12 Finance Street, Central Market, Jaipur, Rajasthan', approvalPolicy: 'Maker-checker for financial mutations', collectionLimit: '100000', cashHoldingLimit: '250000', notificationChannels: 'SMS, email, in-app', retentionExceptionReference: '', auditOwner: 'Compliance team',
    defaultCollectionMode: 'Mixed', gracePeriodDays: '3', requireGeoTag: true, allowOfflineCollection: true,
    receiptPrefix: 'FIN', nextReceiptNumber: '0001842', receiptFooter: 'Thank you for banking with Finora Cooperative Finance.',
    smsReceipts: true, emailStatements: true, overdueAlerts: true, notificationEmail: 'operations@finora.coop',
    auditRetention: '7 years', transactionRetention: '10 years', autoArchive: true
};

const settingsSections: Array<{ id: SettingsSection; label: string; description: string }> = [
    { id: 'organization', label: 'Organization profile', description: 'Identity and statement details.' },
    { id: 'collection', label: 'Collection policies', description: 'Doorstep and mobile controls.' },
    { id: 'receipts', label: 'Receipt numbering', description: 'References and receipt output.' },
    { id: 'notifications', label: 'Notifications', description: 'Customer and operations alerts.' },
    { id: 'retention', label: 'Data retention', description: 'Audit and transaction lifecycle.' }
];

function SettingsPage() {
    const [section, setSection] = useState<SettingsSection>('organization');
    const [settings, setSettings] = useState<SettingsState>(settingsSeed);
    const [activity, setActivity] = useState(['Organization profile saved by Arjun Kapoor · Just now', 'Financial policy review completed · Today']);
    const [toast, setToast] = useState('');
    const currentSection = settingsSections.find((item) => item.id === section)!;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => setSettings((current) => ({ ...current, [key]: value }));
    const save = () => {
        if (!settings.organizationName.trim() || !settings.registrationNumber.trim() || !settings.address.trim()) { notify('Organization name, registration number and address are required.'); return; }
        const message = `${currentSection.label} saved by Arjun Kapoor · Just now`;
        setActivity((current) => [message, ...current].slice(0, 5));
        notify(`${currentSection.label} saved locally.`);
    };
    const toggle = (key: 'requireGeoTag' | 'allowOfflineCollection' | 'smsReceipts' | 'emailStatements' | 'overdueAlerts' | 'autoArchive') => update(key, !settings[key]);
    const renderToggle = (label: string, description: string, key: Parameters<typeof toggle>[0]) => <div className="settings-toggle-row"><div><strong>{label}</strong><span>{description}</span></div><button type="button" className={`security-toggle ${settings[key] ? 'enabled' : ''}`} onClick={() => toggle(key)} aria-pressed={settings[key]}>{settings[key] ? 'Enabled' : 'Disabled'}</button></div>;
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">GOVERNANCE / WORKSPACE CONFIGURATION</div><h1>System Settings</h1><p>Configure operational defaults, customer communications and controlled data policies.</p></div><button className="primary-button" onClick={save}><CheckCircle2 size={16} /> Save changes</button></div><div className="settings-layout"><section className="panel settings-nav" aria-label="Settings sections">{settingsSections.map((item) => <button type="button" className={`settings-nav-item ${section === item.id ? 'active' : ''}`} key={item.id} onClick={() => setSection(item.id)}><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={15} /></button>)}</section><section className="panel settings-form"><div className="panel-heading"><div><div className="eyebrow">ACTIVE CONFIGURATION</div><h2>{currentSection.label}</h2><p>{currentSection.description}</p></div><span className="settings-local-state">Local draft</span></div>{section === 'organization' && <div className="form-grid"><label>Organization name<input value={settings.organizationName} onChange={(event) => update('organizationName', event.target.value)} /></label><label>Registration number<input value={settings.registrationNumber} onChange={(event) => update('registrationNumber', event.target.value)} /></label><label>Primary phone<input value={settings.primaryPhone} onChange={(event) => update('primaryPhone', event.target.value)} /></label><label>Timezone<select value={settings.timezone} onChange={(event) => update('timezone', event.target.value)}><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Dubai</option></select></label><label>Currency<input value={settings.currency} onChange={(event) => update('currency', event.target.value)} /></label><label>Fiscal year<input value={settings.fiscalYear} onChange={(event) => update('fiscalYear', event.target.value)} /></label><label>Branch code<input value={settings.branchCode} onChange={(event) => update('branchCode', event.target.value)} /></label><label>Branch name<input value={settings.branchName} onChange={(event) => update('branchName', event.target.value)} /></label><label className="full-field">Registered address<textarea value={settings.address} onChange={(event) => update('address', event.target.value)} /></label></div>}{section === 'collection' && <div className="form-grid"><label>Default collection mode<select value={settings.defaultCollectionMode} onChange={(event) => update('defaultCollectionMode', event.target.value as SettingsState['defaultCollectionMode'])}><option>Doorstep</option><option>Branch</option><option>Mixed</option></select></label><label>Grace period (days)<input type="number" min="0" max="30" value={settings.gracePeriodDays} onChange={(event) => update('gracePeriodDays', event.target.value)} /></label><label>Approval policy<input value={settings.approvalPolicy} onChange={(event) => update('approvalPolicy', event.target.value)} /></label><label>Collection limit<input value={settings.collectionLimit} onChange={(event) => update('collectionLimit', event.target.value)} /></label><label>Cash holding limit<input value={settings.cashHoldingLimit} onChange={(event) => update('cashHoldingLimit', event.target.value)} /></label><div className="full-field settings-toggle-list">{renderToggle('Require location tag', 'Capture the agent location with each mobile collection.', 'requireGeoTag')}{renderToggle('Allow offline collection', 'Queue receipts when the mobile device is temporarily offline.', 'allowOfflineCollection')}</div></div>}{section === 'receipts' && <div className="form-grid"><label>Receipt prefix<input value={settings.receiptPrefix} onChange={(event) => update('receiptPrefix', event.target.value.toUpperCase())} /></label><label>Next receipt number<input value={settings.nextReceiptNumber} onChange={(event) => update('nextReceiptNumber', event.target.value)} /></label><label className="full-field">Receipt footer<textarea value={settings.receiptFooter} onChange={(event) => update('receiptFooter', event.target.value)} /></label><div className="form-note full-field"><CheckCircle2 size={16} /><span>Next generated receipt reference: <strong>{settings.receiptPrefix}-{settings.nextReceiptNumber}</strong></span></div></div>}{section === 'notifications' && <div className="form-grid"><label className="full-field">Operations notification email<input type="email" value={settings.notificationEmail} onChange={(event) => update('notificationEmail', event.target.value)} /></label><label className="full-field">Notification channels<input value={settings.notificationChannels} onChange={(event) => update('notificationChannels', event.target.value)} /></label><div className="full-field settings-toggle-list">{renderToggle('SMS payment receipts', 'Send a receipt confirmation after a successful collection.', 'smsReceipts')}{renderToggle('Email statements', 'Allow statement delivery through the configured email channel.', 'emailStatements')}{renderToggle('Overdue collection alerts', 'Notify operations when installments pass their due date.', 'overdueAlerts')}</div></div>}{section === 'retention' && <div className="form-grid"><label>Audit log retention<select value={settings.auditRetention} onChange={(event) => update('auditRetention', event.target.value)}><option>3 years</option><option>7 years</option><option>10 years</option></select></label><label>Transaction retention<select value={settings.transactionRetention} onChange={(event) => update('transactionRetention', event.target.value)}><option>7 years</option><option>10 years</option><option>Permanent</option></select></label><label>Retention exception reference<input value={settings.retentionExceptionReference} onChange={(event) => update('retentionExceptionReference', event.target.value)} /></label><label>Audit owner<input value={settings.auditOwner} onChange={(event) => update('auditOwner', event.target.value)} /></label><div className="full-field settings-toggle-list">{renderToggle('Automatic archival', 'Archive inactive records after the configured retention period.', 'autoArchive')}</div><div className="form-note full-field"><ShieldCheck size={16} /><span>Retention changes are controlled configuration and are recorded in local activity history.</span></div></div>}<div className="settings-form-footer"><span>Changes remain local until backend persistence is connected.</span><button className="primary-button" onClick={save}><CheckCircle2 size={15} /> Save section</button></div></section></div><section className="panel settings-activity"><div className="panel-heading"><div><h2>Recent configuration activity</h2><p>Local audit feedback for settings changes made in this workspace.</p></div></div>{activity.map((item) => <div className="settings-activity-row" key={item}><span className="audit-dot" /><strong>{item}</strong><StatusPill status="Completed" /></div>)}</section>{toast && <div className="admin-toast" role="status"><CheckCircle2 size={15} />{toast}</div>}</div>;
}

export function AdminPage({ path }: { path: string }) {
    if (path === '/collections') return <ScopedCollectionsPage />;
    if (path === '/reconciliation') return <ScopedReconciliationPage />;
    if (path === '/reports') return <ReportsPage />;
    if (path === '/security') return <ScopedSecurityPage />;
    if (path === '/settings') return <SettingsPage />;
    if (path === '/customers') return <ScopedCustomerPage />;
    if (path === '/deposits') return <DepositsPage />;
    if (path === '/recurring-deposits') return <RecurringDepositsPage />;
    if (path === '/fixed-deposits') return <FixedDepositsPage />;
    if (path === '/loans') return <LoansPage />;
    if (path === '/withdrawals') return <WithdrawalsPage />;
    if (path === '/agents') return <ScopedAgentsPage />;
    return <ListingPage title="Customers" description="Manage customer profiles, accounts, nominees and history." type="customers" action="Add customer" summary={[{ label: 'Total customers', value: '2,847' }, { label: 'Active customers', value: '2,691', tone: 'green' }, { label: 'New this month', value: '124' }, { label: 'Needs review', value: '16', tone: 'orange' }]} />;
}
