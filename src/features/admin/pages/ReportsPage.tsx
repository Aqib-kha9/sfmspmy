// REPORTING / Statements.

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, FileCheck2, Filter, Search, Loader2 } from 'lucide-react';
import { reportsRepository, type ReportGenerateInput } from '../services/operations/reportsApiRepository';
import { messageFor } from '../services/operations/helpers';
import { type Status, StatusPill } from '../components/adminShared';
import { AgentOptions, BranchOptions, CustomerOptions, AccountOptions } from '../components/backendOptions';

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
    availableFilters: string[];
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

function GenerateReportModal({ report, onClose, onGenerate }: { report: ReportRecord, onClose: () => void, onGenerate: (input: ReportGenerateInput) => Promise<void> }) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [branch, setBranch] = useState('');
    const [agent, setAgent] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [generating, setGenerating] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            await onGenerate({ report, fromDate: from, toDate: to, branch, agent, statusFilter, customerId, accountId });
            onClose();
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="admin-modal" role="dialog" aria-modal="true" aria-label={`Generate ${report.name}`}>
                <div className="admin-modal-header">
                    <div>
                        <div className="eyebrow">GENERATE REPORT</div>
                        <h2>{report.name}</h2>
                        <p>{report.description}</p>
                    </div>
                    <button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button>
                </div>
                <form className="form-grid customer-form" onSubmit={(e) => void submit(e)}>
                    <label className="full-field">
                        From date
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
                    </label>
                    <label className="full-field">
                        To date
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
                    </label>
                    
                    {report.availableFilters?.includes('branch_id') && (
                        <label className="full-field">
                            Branch
                            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                                <option value="">All branches</option>
                                <BranchOptions />
                            </select>
                        </label>
                    )}
                    {report.availableFilters?.includes('agent_id') && (
                        <label className="full-field">
                            Collection agent
                            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
                                <option value="">All agents</option>
                                <AgentOptions />
                            </select>
                        </label>
                    )}
                    {report.availableFilters?.includes('customer_id') && (
                        <label className="full-field">
                            Customer ID
                            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                                <option value="">Select a customer</option>
                                <CustomerOptions />
                            </select>
                        </label>
                    )}
                    {report.availableFilters?.includes('account_id') && (
                        <label className="full-field">
                            Account ID
                            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} disabled={!customerId}>
                                <AccountOptions customerId={customerId} />
                            </select>
                        </label>
                    )}
                    {report.availableFilters?.includes('status') && (
                        <label className="full-field">
                            Status filter
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">All statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="reversed">Reversed</option>
                            </select>
                        </label>
                    )}

                    <div className="admin-form-actions full-field">
                        <button type="button" className="secondary-button" onClick={onClose} disabled={generating}>Cancel</button>
                        <button type="submit" className="primary-button" disabled={generating}>
                            {generating ? <Loader2 size={15} className="spin" /> : null}
                            {generating ? 'Generating...' : 'Generate PDF'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export function ReportsPage() {
    const [reports, setReports] = useState<ReportRecord[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'All' | ReportRecord['category']>('All');
    const [scope, setScope] = useState('All scopes');

    const [generatingReport, setGeneratingReport] = useState<ReportRecord | undefined>();
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

    const filteredReports = reports.filter((report) => 
        `${report.name} ${report.scope} ${report.output} ${report.description}`.toLowerCase().includes(search.toLowerCase()) && 
        (category === 'All' || report.category === category) && 
        (scope === 'All scopes' || report.scope === scope)
    );

    const generate = async (input: ReportGenerateInput) => {
        try { 
            const generated = await reportsRepository.generate(input); 
            setReports((current) => current.map((row) => row.id === input.report.id ? generated : row)); 
            setSelected(generated); 
            notify(`${input.report.name} generated successfully.`); 
        } catch (reason) { 
            notify(messageFor(reason, 'Unable to generate report.')); 
            throw reason;
        } 
    };

    const exportReport = async (report: ReportRecord) => { 
        try { 
            if (!report.generatedId) { 
                notify('Generate the report first before exporting.'); 
                return; 
            } 
            await reportsRepository.download(report.generatedId, report.filename ?? `${report.reportType}.pdf`); 
            notify(`${report.name} downloaded.`); 
        } catch (reason) { 
            notify(messageFor(reason, 'Unable to download report.')); 
        } 
    };

    return (
        <div className="admin-page">
            <div className="page-heading">
                <div>
                    <div className="eyebrow">REPORTING / STATEMENTS</div>
                    <h1>Reports & Statements</h1>
                    <p>Generate controlled operational, financial and audit outputs from the cooperative finance workspace.</p>
                </div>
            </div>

            <section className="panel table-panel">
                <div className="filter-bar">
                    <div className="filter-search">
                        <Search size={16} />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search report name, scope or output..." aria-label="Search reports" />
                    </div>
                    <select className="filter-button" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
                        <option value="All">All categories</option>
                        <option value="Operations">Operations</option>
                        <option value="Finance">Finance</option>
                        <option value="Compliance">Compliance</option>
                    </select>
                    <select className="filter-button" value={scope} onChange={(event) => setScope(event.target.value)} aria-label="Filter reports by scope">
                        <option>All scopes</option>
                        <option>Collections and agents</option>
                        <option>Collection agents</option>
                        <option>Customers and accounts</option>
                        <option>Deposit and RD accounts</option>
                        <option>Fixed deposits</option>
                        <option>Loans and repayments</option>
                        <option>Withdrawals</option>
                        <option>Review and reconciliation</option>
                    </select>
                </div>
            </section>

            <div className="summary-strip">
                <div className="summary-item">
                    <span>Available reports</span>
                    <strong>{reports.length}</strong>
                </div>
                <div className="summary-item">
                    <span>Operational outputs</span>
                    <strong className="green">{reports.filter((report) => report.category === 'Operations').length}</strong>
                </div>
                <div className="summary-item">
                    <span>Financial statements</span>
                    <strong>{reports.filter((report) => report.category === 'Finance').length}</strong>
                </div>
                <div className="summary-item">
                    <span>Audit / exception views</span>
                    <strong className="orange">{reports.filter((report) => report.category === 'Compliance').length}</strong>
                </div>
            </div>

            <div className="report-grid">
                {filteredReports.map((report) => (
                    <section className="panel report-card" key={report.id}>
                        <span className={`report-icon report-${report.category.toLowerCase()}`}>
                            <FileCheck2 size={18} />
                        </span>
                        <div className="report-card-copy">
                            <div className="eyebrow">{report.category} · {report.id}</div>
                            <h2>{report.name}</h2>
                            <p>{report.description}</p>
                            <small>{report.output}</small>
                            <small>Last generated {report.lastGenerated} by {report.generatedBy}</small>
                        </div>
                        <div className="report-card-actions">
                            <button className="icon-button" onClick={() => setSelected(report)} aria-label={`Preview ${report.name}`}>
                                <FileCheck2 size={16} />
                            </button>
                            <button className="icon-button" onClick={() => setGeneratingReport(report)} aria-label={`Generate ${report.name}`}>
                                <Download size={16} />
                            </button>
                        </div>
                    </section>
                ))}
            </div>

            {filteredReports.length === 0 && (
                <section className="panel empty-state">
                    <strong>No reports match the current filters.</strong>
                    <span>Adjust the search, category or scope to view available outputs.</span>
                </section>
            )}

            {generatingReport && (
                <GenerateReportModal 
                    report={generatingReport} 
                    onClose={() => setGeneratingReport(undefined)} 
                    onGenerate={generate} 
                />
            )}

            {selected && (
                <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(undefined); }}>
                    <section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Report ${selected.name}`}>
                        <div className="admin-modal-header">
                            <div>
                                <div className="eyebrow">REPORT PREVIEW / {selected.id}</div>
                                <h2>{selected.name}</h2>
                                <p>{selected.description}</p>
                            </div>
                            <button className="icon-button" onClick={() => setSelected(undefined)} aria-label="Close report preview">×</button>
                        </div>
                        <div className="customer-detail-grid">
                            <div><span>Category</span><strong>{selected.category}</strong></div>
                            <div><span>Scope</span><strong>{selected.scope}</strong></div>
                            <div><span>Output includes</span><strong>{selected.output}</strong></div>
                            <div><span>Generated by</span><strong>{selected.generatedBy}</strong></div>
                            <div><span>Generated at</span><strong>{selected.lastGenerated}</strong></div>
                            <div><span>Audit status</span><StatusPill status="Completed" /></div>
                            <div><span>Branch</span><strong>{selected.branch || 'All branches'}</strong></div>
                            <div><span>Agent</span><strong>{selected.agent || 'All agents'}</strong></div>
                            <div><span>Status filter</span><strong>{selected.statusFilter || 'All statuses'}</strong></div>
                        </div>
                        <div className="customer-detail-actions">

                            <button className="primary-button" onClick={() => exportReport(selected)}>
                                <Download size={15} /> Export PDF
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {toast && <div className="admin-toast" role="status"><CheckCircle2 size={16} />{toast}</div>}
        </div>
    );
}
