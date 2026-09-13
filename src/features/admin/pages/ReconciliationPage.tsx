// OPERATIONS / Daily cash reconciliation.

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, CircleAlert, Download, FileCheck2, Filter, Loader2, Search } from 'lucide-react';
import { reconciliationRepository } from '../services/operations/reconciliationApiRepository';
import { messageFor } from '../services/operations/helpers';
import { type Status, StatusPill, SummaryStrip } from '../components/adminShared';

export type ReconciliationEvent = {
    id: string;
    type: string;
    date: string;
    performedBy: string;
    note: string;
};

export type ReconciliationRecord = {
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

export type ReconciliationInput = Pick<ReconciliationRecord, 'agent' | 'agentId' | 'route' | 'reconciliationDate' | 'collectedAmount' | 'cashAmount' | 'digitalAmount' | 'submissionReference' | 'submittedOn' | 'remarks'> & Partial<Pick<ReconciliationRecord, 'cashDenominationReference' | 'handoverReceiptReference' | 'bankSettlementReference' | 'digitalSettlementDetails' | 'exceptionReason' | 'supportingDocuments' | 'supervisorReference' | 'secondReviewerReference' | 'submissionDevice' | 'offlineSyncReference' | 'reviewCorrelationReference'>>;

export function ReconciliationDetail({ record, onClose, onReview, onToast }: { record: ReconciliationRecord; onClose: () => void; onReview: () => void; onToast: (message: string) => void }) {
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

export function ReconciliationReviewModal({ record, onClose, onSave }: { record: ReconciliationRecord; onClose: () => void; onSave: (status: ReconciliationRecord['status'], note: string, metadata: ReconciliationInput) => Promise<void> }) {
    const [status, setStatus] = useState<ReconciliationRecord['status']>(record.collectedAmount === record.submittedAmount ? 'Completed' : 'Review');
    const [note, setNote] = useState(record.resolutionNote ?? '');
    const [exceptionReason, setExceptionReason] = useState(record.exceptionReason ?? '');
    const [supervisorReference, setSupervisorReference] = useState(record.supervisorReference ?? '');
    const [secondReviewerReference, setSecondReviewerReference] = useState(record.secondReviewerReference ?? '');
    const [supportingDocuments, setSupportingDocuments] = useState(record.supportingDocuments ?? '');
    const [reviewCorrelationReference, setReviewCorrelationReference] = useState(record.reviewCorrelationReference ?? '');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault(); if (!note.trim()) return; await onSave(status, note.trim(), { agent: record.agent, agentId: record.agentId, route: record.route, reconciliationDate: record.reconciliationDate, collectedAmount: record.collectedAmount, cashAmount: record.cashAmount, digitalAmount: record.digitalAmount, submissionReference: record.submissionReference, submittedOn: record.submittedOn, remarks: record.remarks, exceptionReason: exceptionReason.trim(), supervisorReference: supervisorReference.trim(), secondReviewerReference: secondReviewerReference.trim(), supportingDocuments: supportingDocuments.trim(), reviewCorrelationReference: reviewCorrelationReference.trim() });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-label="Review reconciliation"><div className="admin-modal-header"><div><div className="eyebrow">CONTROLLED REVIEW</div><h2>Review {record.id}</h2><p>Record review evidence and a resolution note for this close.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">&times;</button></div><form className="form-grid customer-form recon-review-form" onSubmit={(event) => void submit(event)}><label>Verification outcome<select value={status} onChange={(event) => setStatus(event.target.value as ReconciliationRecord['status'])}><option value="Completed">Approve and close</option><option value="Matched">Mark matched</option><option value="Review">Keep under review</option><option value="Pending">Return to pending</option></select></label><label>Exception reason<input value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} placeholder="Variance or exception reference" /></label><label>Supervisor reference<input value={supervisorReference} onChange={(event) => setSupervisorReference(event.target.value)} placeholder="Supervisor review reference" /></label><label>Second reviewer reference<input value={secondReviewerReference} onChange={(event) => setSecondReviewerReference(event.target.value)} placeholder="Second reviewer or maker-checker reference" /></label><label>Review correlation reference<input value={reviewCorrelationReference} onChange={(event) => setReviewCorrelationReference(event.target.value)} placeholder="Review request or correlation ID" /></label><label className="full-field">Supporting documents<input value={supportingDocuments} onChange={(event) => setSupportingDocuments(event.target.value)} placeholder="Document IDs or storage references" /></label><label className="full-field">Resolution / verification note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the cash count, receipt check or variance resolution." /></label><div className="form-note"><CircleAlert size={16} /><span>Review decisions are recorded in the local audit history.</span></div><div className="modal-actions full-field"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} {saving ? 'Saving…' : 'Save decision'}</button></div></form></section></div>;
}

export function ScopedReconciliationPage() {
    const [rows, setRows] = useState<ReconciliationRecord[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | ReconciliationRecord['status']>('All');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<ReconciliationRecord | undefined>();
    const [modal, setModal] = useState<'detail' | 'review' | null>(null);
    const [toast, setToast] = useState('');
    const pageSize = 4;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    useEffect(() => {
        if (!dateFilter) return;
        let active = true;
        reconciliationRepository
            .list({ date: dateFilter })
            .then((records) => { if (active) setRows(records); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load reconciliation records from the backend.')); });
        return () => { active = false; };
    }, [dateFilter]);
    const filteredRows = rows.filter((row) => `${row.id} ${row.agent} ${row.agentId} ${row.route} ${row.submissionReference} ${row.remarks}`.toLowerCase().includes(search.toLowerCase()) && (!dateFilter || row.reconciliationDate === dateFilter) && (statusFilter === 'All' || row.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const pending = rows.filter((row) => row.status === 'Pending' || row.status === 'Review');
    const submitted = rows.reduce((total, row) => total + row.submittedAmount, 0);
    const matched = rows.filter((row) => row.status === 'Matched' || row.status === 'Completed').reduce((total, row) => total + row.submittedAmount, 0);
    const variance = rows.reduce((total, row) => total + Math.abs(row.collectedAmount - row.submittedAmount), 0);
    const openDetail = (record: ReconciliationRecord) => { setSelected(record); setModal('detail'); };
    const startReconciliation = () => { setDateFilter(''); setStatusFilter('All'); setPage(1); notify('Reconciliation workspace opened for all pending daily submissions.'); };
    const saveDecision = async (status: ReconciliationRecord['status'], note: string, _metadata: ReconciliationInput) => { if (!selected) return; try { if (status === 'Completed' || status === 'Matched') { await reconciliationRepository.lock(selected.id, { reason: note }); } else if (status === 'Pending') { await reconciliationRepository.reopen(selected.id, { reopenReason: note }); } else { await reconciliationRepository.escalate(selected.id, { note }); } const refreshed = await reconciliationRepository.list({ date: dateFilter }); setRows(refreshed); close(); notify(`Reconciliation ${selected.id} updated.`); } catch (reason) { notify(messageFor(reason, 'Unable to update reconciliation.')); } };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / CASH CONTROL</div><h1>Daily Reconciliation</h1><p>Verify agent cash submissions against recorded collections and resolve exceptions. Cash handover closes before 4:00 PM and daily submission before 5:00 PM.</p></div><button className="primary-button" onClick={startReconciliation}><FileCheck2 size={16} /> Start reconciliation</button></div><SummaryStrip items={[{ label: 'Awaiting verification', value: String(pending.length), tone: 'orange' }, { label: 'Submitted today', value: `₹${submitted.toLocaleString('en-IN')}` }, { label: 'Matched amount', value: `₹${matched.toLocaleString('en-IN')}`, tone: 'green' }, { label: 'Variance', value: `₹${variance.toLocaleString('en-IN')}`, tone: variance ? 'red' : 'green' }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search agent, reconciliation ID, route or reference..." aria-label="Search reconciliations" /></div><input className="recon-date-filter" type="date" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1); }} aria-label="Filter by reconciliation date" /><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }} aria-label="Filter reconciliations by status"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Review">Review</option><option value="Matched">Matched</option><option value="Completed">Completed</option></select><button className="icon-button export-button" onClick={() => notify('Reconciliation register export prepared locally.')} aria-label="Export reconciliation register"><Download size={16} /></button></div>{visibleRows.length ? <div className="data-table-wrap"><table className="data-table reconciliation-table"><thead><tr><th>Agent / route</th><th>Reconciliation</th><th>Recorded</th><th>Submitted</th><th>Variance</th><th>Status</th><th /></tr></thead><tbody>{visibleRows.map((row) => { const rowVariance = row.collectedAmount - row.submittedAmount; return <tr key={row.id}><td><strong>{row.agent}</strong><span>{row.agentId} · {row.route}</span></td><td><strong>{row.id}</strong><span>{row.reconciliationDate} · {row.submissionReference}</span></td><td><strong>₹{row.collectedAmount.toLocaleString('en-IN')}</strong><small>{row.cashAmount.toLocaleString('en-IN')} cash · {row.digitalAmount.toLocaleString('en-IN')} digital</small></td><td><strong>₹{row.submittedAmount.toLocaleString('en-IN')}</strong><span>{row.submittedOn.replace('T', ' · ')}</span></td><td><strong className={rowVariance ? 'orange-text' : 'green-text'}>₹{Math.abs(rowVariance).toLocaleString('en-IN')}</strong><span>{rowVariance > 0 ? 'Short submitted' : rowVariance < 0 ? 'Over submitted' : 'Balanced'}</span></td><td><StatusPill status={row.status} /></td><td><button className="row-action" onClick={() => openDetail(row)} aria-label={`Open reconciliation ${row.id}`}><ChevronRight size={16} /></button></td></tr>; })}</tbody></table></div> : <div className="empty-state"><strong>No reconciliation records found</strong><span>Adjust the date, status or search filters to view another daily close.</span></div>}<div className="table-footer"><span>{filteredRows.length} reconciliation records</span><div className="pagination"><button className="pagination-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page} of {pageCount}</span><button className="pagination-button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></div></section>{selected && modal === 'detail' && <ReconciliationDetail record={selected} onClose={close} onReview={() => setModal('review')} onToast={notify} />}{selected && modal === 'review' && <ReconciliationReviewModal record={selected} onClose={close} onSave={saveDecision} />}{toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}
