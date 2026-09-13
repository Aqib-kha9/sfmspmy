// REPORTING / Statements.

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, FileCheck2, Filter, Search } from 'lucide-react';
import { reportsRepository } from '../services/operations/reportsApiRepository';
import { messageFor } from '../services/operations/helpers';
import { type Status, StatusPill } from '../components/adminShared';
import { AgentOptions, BranchOptions } from '../components/backendOptions';

export type ReportRecord = {
    id: string;
    reportType: string;
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
    generatedId?: string;
    filename?: string;
};

export function ReportsPage() {
    const [reports, setReports] = useState<ReportRecord[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'All' | ReportRecord['category']>('All');
    const [scope, setScope] = useState('All scopes');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [format, setFormat] = useState<'PDF'>('PDF');
    const [branch, setBranch] = useState('');
    const [agent, setAgent] = useState('');
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
    useEffect(() => {
        let active = true;
        reportsRepository
            .list()
            .then((records) => { if (active) setReports(records); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load reports from the backend.')); });
        return () => { active = false; };
    }, []);
    const filteredReports = reports.filter((report) => `${report.name} ${report.scope} ${report.output} ${report.description}`.toLowerCase().includes(search.toLowerCase()) && (category === 'All' || report.category === category) && (scope === 'All scopes' || report.scope === scope));
    const generate = async (report: ReportRecord) => { try { const generated = await reportsRepository.generate({ report, fromDate: from, toDate: to, branch, agent, customerOrAccountScope: accountScope, fiscalYear, timezone, granularity, statusFilter: reportStatus, inclusionOptions, deliveryDestination, reportLabel, statementType, correlationReference }); setReports((current) => current.map((row) => row.id === report.id ? generated : row)); setSelected(generated); notify(`${report.name} generated as ${format}.`); } catch (reason) { notify(messageFor(reason, 'Unable to generate report.')); } };
    const exportReport = async (report: ReportRecord) => { try { if (!report.generatedId) { notify('Generate the report first before exporting.'); return; } await reportsRepository.download(report.generatedId, report.filename ?? `${report.reportType}.pdf`); notify(`${report.name} downloaded.`); } catch (reason) { notify(messageFor(reason, 'Unable to download report.')); } };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">REPORTING / STATEMENTS</div><h1>Reports & Statements</h1><p>Generate controlled operational, financial and audit outputs from the cooperative finance workspace.</p></div><button className="primary-button" onClick={() => filteredReports[0] && generate(filteredReports[0])}><Download size={16} /> Generate report</button></div><section className="panel report-controls"><div className="report-control-grid"><label>Reporting period<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To date<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label>Report category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option>All</option><option>Operations</option><option>Finance</option><option>Compliance</option></select></label><label>Output format<select value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option>PDF</option></select></label><label>Branch<select value={branch} onChange={(event) => setBranch(event.target.value)}><option>All branches</option><BranchOptions /></select></label><label>Collection agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><option>All agents</option><AgentOptions /></select></label><label>Customer / account scope<select value={accountScope} onChange={(event) => setAccountScope(event.target.value)}><option>All customers and accounts</option><option>Selected customer or account</option><option>Assigned route only</option></select></label><label>Fiscal year<input value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} /></label><label>Timezone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Dubai</option></select></label><label>Granularity<select value={granularity} onChange={(event) => setGranularity(event.target.value)}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label><label>Status filter<select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)}><option>All statuses</option><option>Completed</option><option>Pending</option><option>Review</option></select></label><label>Inclusion options<input value={inclusionOptions} onChange={(event) => setInclusionOptions(event.target.value)} /></label><label>Delivery destination<select value={deliveryDestination} onChange={(event) => setDeliveryDestination(event.target.value)}><option>Download locally</option><option>Configured email</option><option>Statement archive</option></select></label><label>Report label<input value={reportLabel} onChange={(event) => setReportLabel(event.target.value)} placeholder="Optional label" /></label><label>Statement type<select value={statementType} onChange={(event) => setStatementType(event.target.value)}><option>Operational report</option><option>Customer statement</option><option>Account statement</option><option>Audit extract</option></select></label><label>Correlation reference<input value={correlationReference} onChange={(event) => setCorrelationReference(event.target.value)} placeholder="Optional request ID" /></label></div><div className="report-toolbar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search report name, scope or output..." aria-label="Search reports" /></div><select className="filter-button" value={scope} onChange={(event) => setScope(event.target.value)} aria-label="Filter reports by scope"><option>All scopes</option><option>Collections and agents</option><option>Collection agents</option><option>Customers and accounts</option><option>Deposit and RD accounts</option><option>Fixed deposits</option><option>Loans and repayments</option><option>Withdrawals</option><option>Review and reconciliation</option></select><button className="filter-button" onClick={() => notify(`Report period set to ${from} through ${to}.`)}><CalendarDays size={15} /> Apply period</button></div></section><div className="summary-strip"><div className="summary-item"><span>Available reports</span><strong>{reports.length}</strong></div><div className="summary-item"><span>Operational outputs</span><strong className="green">{reports.filter((report) => report.category === 'Operations').length}</strong></div><div className="summary-item"><span>Financial statements</span><strong>{reports.filter((report) => report.category === 'Finance').length}</strong></div><div className="summary-item"><span>Audit / exception views</span><strong className="orange">{reports.filter((report) => report.category === 'Compliance').length}</strong></div></div><div className="report-grid">{filteredReports.map((report) => <section className="panel report-card" key={report.id}><span className={`report-icon report-${report.category.toLowerCase()}`}><FileCheck2 size={18} /></span><div className="report-card-copy"><div className="eyebrow">{report.category} · {report.id}</div><h2>{report.name}</h2><p>{report.description}</p><small>{report.output}</small><small>Last generated {report.lastGenerated} by {report.generatedBy}</small></div><div className="report-card-actions"><button className="icon-button" onClick={() => setSelected(report)} aria-label={`Preview ${report.name}`}><FileCheck2 size={16} /></button><button className="icon-button" onClick={() => generate(report)} aria-label={`Generate ${report.name}`}><Download size={16} /></button></div></section>)}</div>{filteredReports.length === 0 && <section className="panel empty-state"><strong>No reports match the current filters.</strong><span>Adjust the search, category or scope to view available outputs.</span></section>}{selected && <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(undefined); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Report ${selected.name}`}><div className="admin-modal-header"><div><div className="eyebrow">REPORT PREVIEW / {selected.id}</div><h2>{selected.name}</h2><p>{selected.description}</p></div><button className="icon-button" onClick={() => setSelected(undefined)} aria-label="Close report preview">×</button></div><div className="customer-detail-grid"><div><span>Category</span><strong>{selected.category}</strong></div><div><span>Scope</span><strong>{selected.scope}</strong></div><div><span>Period</span><strong>{from} to {to}</strong></div><div><span>Format</span><strong>{format}</strong></div><div><span>Output includes</span><strong>{selected.output}</strong></div><div><span>Generated by</span><strong>{selected.generatedBy}</strong></div><div><span>Generated at</span><strong>{selected.lastGenerated}</strong></div><div><span>Audit status</span><StatusPill status="Completed" /></div><div><span>Branch / agent</span><strong>{selected.branch ?? branch} / {selected.agent ?? agent}</strong></div><div><span>Customer or account scope</span><strong>{selected.customerOrAccountScope ?? accountScope}</strong></div><div><span>Fiscal year / timezone</span><strong>{selected.fiscalYear ?? fiscalYear} / {selected.timezone ?? timezone}</strong></div><div><span>Granularity / status filter</span><strong>{selected.granularity ?? granularity} / {selected.statusFilter ?? reportStatus}</strong></div><div><span>Inclusion / delivery</span><strong>{selected.inclusionOptions ?? inclusionOptions} / {selected.deliveryDestination ?? deliveryDestination}</strong></div><div><span>Statement type / label</span><strong>{selected.statementType ?? statementType} / {selected.reportLabel || reportLabel || 'Not specified'}</strong></div><div><span>Export / correlation reference</span><strong>{selected.exportReference ?? 'Not generated'} / {(selected.correlationReference ?? correlationReference) || 'Not specified'}</strong></div></div><div className="customer-detail-actions"><button className="secondary-button" onClick={() => notify(`${selected.name} preview marked for review.`)}><CheckCircle2 size={15} /> Mark reviewed</button><button className="primary-button" onClick={() => exportReport(selected)}><Download size={15} /> Export {format}</button></div></section></div>}{toast && <div className="admin-toast" role="status"><CheckCircle2 size={16} />{toast}</div>}</div>;
}
