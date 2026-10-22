import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowUpRight,
    Building2,
    CalendarDays,
    ChevronRight,
    CircleCheck,
    Clock3,
    Coins,
    CreditCard,
    Landmark,
    MoreHorizontal,
    PiggyBank,
    RefreshCw,
    Scale,
    Search,
    TrendingUp,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api/apiClient';
import type {
    AgentPerformanceDashboardResult,
    AgentPerformanceEntryView,
    DashboardOverviewView,
    DashboardPendingResult,
    PendingItemKind,
    PendingItemView,
    RecentTransactionView,
} from '../../lib/api/types';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency, initials } from '../../lib/formatters/formatters';

type ModalKind = 'agent' | 'transaction-detail' | 'task' | 'tasks' | null;
type TaskIcon = 'clock' | 'wallet' | 'calendar';

const kindStyles: Record<PendingItemKind, { tone: string; icon: TaskIcon; label: string }> = {
    collections: { tone: 'red', icon: 'clock', label: 'Pending collections' },
    withdrawals: { tone: 'amber', icon: 'wallet', label: 'Pending withdrawals' },
    overdueLoans: { tone: 'red', icon: 'calendar', label: 'Overdue loans' },
    reconciliationDifferences: { tone: 'amber', icon: 'wallet', label: 'Reconciliation differences' },
    complaints: { tone: 'violet', icon: 'calendar', label: 'Open complaints' },
};

const taskRoutes: Record<PendingItemKind, string> = {
    collections: '/collections',
    withdrawals: '/withdrawals',
    overdueLoans: '/loans?status=overdue',
    reconciliationDifferences: '/reconciliation',
    complaints: '/customers',
};

function greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateHeading(isoDate: string): string {
    if (!isoDate) return '';
    const parts = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1));
    if (Number.isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

function formatLongDate(iso: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** ₹ with lakh/crore compaction for large aggregates (₹84.60L, ₹1.20Cr). */
function compactLakh(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return formatCurrency(value);
}

function transactionReference(id: string): string {
    return `#TXN-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return <div className="dashboard-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className={`dashboard-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
            <div className="dashboard-modal-header"><div><div className="eyebrow">LIVE OVERVIEW</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
            {children}
        </section>
    </div>;
}

function TaskIconGlyph({ icon }: { icon: TaskIcon }) {
    if (icon === 'wallet') return <Wallet size={18} />;
    if (icon === 'calendar') return <CalendarDays size={18} />;
    return <Clock3 size={18} />;
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { profile } = useAuth();

    const [overview, setOverview] = useState<DashboardOverviewView | null>(null);
    const [pending, setPending] = useState<DashboardPendingResult | null>(null);
    const [performance, setPerformance] = useState<AgentPerformanceDashboardResult | null>(null);
    const [recent, setRecent] = useState<RecentTransactionView[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [modal, setModal] = useState<ModalKind>(null);
    const [selectedAgent, setSelectedAgent] = useState<AgentPerformanceEntryView | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<RecentTransactionView | null>(null);
    const [selectedTask, setSelectedTask] = useState<PendingItemView | null>(null);
    const [metricMenu, setMetricMenu] = useState<string | null>(null);
    const [toast, setToast] = useState('');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [overviewResult, pendingResult, performanceResult, recentResult] = await Promise.all([
                apiClient.request<DashboardOverviewView>('/dashboard/overview'),
                apiClient.request<DashboardPendingResult>('/dashboard/pending'),
                apiClient.request<AgentPerformanceDashboardResult>('/dashboard/performance/agents?page=1&pageSize=50'),
                apiClient.request<{ items: RecentTransactionView[] }>('/dashboard/transactions/recent?page=1&pageSize=10'),
            ]);
            setOverview(overviewResult);
            setPending(pendingResult);
            setPerformance(performanceResult);
            setRecent(recentResult.items);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load the dashboard.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const showToast = useCallback((message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(''), 2800);
    }, []);

    const close = () => {
        setModal(null);
        setSelectedAgent(null);
        setSelectedTransaction(null);
        setSelectedTask(null);
        setMetricMenu(null);
    };

    const firstName = (profile?.fullName ?? 'Staff').split(' ')[0] ?? 'Staff';

    const metrics = useMemo(() => {
        if (!overview) return [];
        const collections = overview.collections;
        const modeList = collections.byMode.length > 0 ? collections.byMode.map((mode) => mode.mode).join(', ') : 'No modes yet';
        return [
            { label: "Today's collection", value: compactLakh(collections.totalAmount), change: `${collections.entryCount} entries`, note: 'across the organisation', icon: CircleCheck, tone: 'orange', action: () => navigate('/collections') },
            { label: 'Cash collected', value: compactLakh(collections.cashAmount), change: `${collections.acceptedCount} accepted`, note: `${collections.waitingCount} awaiting review`, icon: Wallet, tone: 'green', action: () => navigate('/collections') },
            { label: 'Digital + bank', value: compactLakh(collections.digitalAmount + collections.bankAmount), change: modeList, note: 'UPI · NEFT · RTGS · cheque', icon: TrendingUp, tone: 'blue', action: () => navigate('/collections') },
            { label: 'Active agents', value: `${overview.activeAgents.activeToday}/${overview.activeAgents.total}`, change: 'field force', note: 'active on the business date', icon: Users, tone: 'purple', action: () => navigate('/agents') },
        ];
    }, [overview, navigate]);

    const tasks = useMemo(() => {
        if (!pending) return [];
        return (pending.kinds as PendingItemKind[])
            .map((kind) => ({ kind, count: pending.counts[kind] ?? 0 }))
            .filter((entry) => entry.count > 0)
            .map(({ kind, count }) => {
                const style = kindStyles[kind] ?? { tone: 'red', icon: 'clock' as TaskIcon, label: kind };
                return {
                    kind,
                    title: `${count} ${style.label.toLowerCase()}`,
                    detail: count === 1 ? '1 item needs attention' : `${count} items need attention`,
                    tone: style.tone,
                    icon: style.icon,
                };
            });
    }, [pending]);

    const agentRows = useMemo(() => {
        if (!performance) return [];
        const items = performance.items;
        const max = Math.max(1, ...items.map((agent) => agent.totalAmount));
        return items.map((agent) => ({ agent, share: Math.round((agent.totalAmount / max) * 100) }));
    }, [performance]);

    const modeChart = useMemo(() => {
        if (!overview) return [];
        const byMode = overview.collections.byMode;
        const max = Math.max(1, ...byMode.map((mode) => mode.amount));
        return byMode.map((mode) => ({ label: mode.mode, value: mode.amount, count: mode.count, height: Math.round((mode.amount / max) * 100) }));
    }, [overview]);

    const peakHeight = Math.max(1, ...modeChart.map((entry) => entry.height));

    const filteredTransactions = recent.filter((tx) =>
        `${tx.id} ${tx.customerName ?? ''} ${tx.transactionType} ${tx.referenceNumber ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    );

    const taskItems = useMemo(
        () => (selectedTask ? (pending?.items ?? []).filter((item) => item.kind === selectedTask.kind) : []),
        [pending, selectedTask],
    );

    if (loading && !overview) {
        return <div className="dashboard-page">
            <div className="page-heading"><div><div className="eyebrow">LIVE OVERVIEW</div><h1>Loading dashboard</h1><p>Fetching live figures from the server…</p></div><button className="primary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing..." : "Refresh"}</button></div>
            <div className="panel"><p className="empty-state">Fetching the latest collections, pending work and agent performance.</p></div>
        </div>;
    }

    return <div className="dashboard-page">
        <div className="page-heading"><div><div className="eyebrow">{formatDateHeading(overview?.date ?? '')}</div><h1>{greeting()}, {firstName} <span>✦</span></h1><p>Live figures from the patsanstha server for today's business date.</p></div>
            <button className="primary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing..." : "Refresh"}</button>
        </div>

        {error && <div className="panel" style={{ marginBottom: '1rem' }}><p className="empty-state">Could not refresh the dashboard: {error}. <button className="text-button" onClick={() => void load()}>Retry</button></p></div>}

        {overview?.bankTotals && (
            <section className="bank-position-section">
                <div className="bank-hero-card">
                    <div className="bank-hero-main">
                        <div className="bank-hero-label">
                            <Landmark size={18} />
                            <span>बँकेची एकूण शिल्लक बाकी · Net Treasury Liquidity</span>
                        </div>
                        <div className="bank-hero-value">
                            {formatCurrency(overview.bankTotals.netBankBalance)}
                        </div>
                        <div className="bank-hero-sub">
                            ठेवी आणि कर्ज समायोजनानंतर बँकेची एकूण शिल्लक रक्कम (As of {formatDateHeading(overview.date)})
                        </div>
                    </div>
                    <div className="bank-hero-stats">
                        <div className="bank-hero-stat-item">
                            <div className="bank-hero-stat-label">एकूण ठेवी · Total Deposits</div>
                            <div className="bank-hero-stat-value">{formatCurrency(overview.bankTotals.totalDeposits)}</div>
                        </div>
                        <div className="bank-hero-stat-item">
                            <div className="bank-hero-stat-label">एकूण कर्ज येणे · Active Loans</div>
                            <div className="bank-hero-stat-value">{formatCurrency(overview.bankTotals.totalLoansOutstanding)}</div>
                        </div>
                        <div className="bank-hero-stat-item">
                            <div className="bank-hero-stat-label">एकूण कार्यरत खाती · Total Accounts</div>
                            <div className="bank-hero-stat-value">{overview.bankTotals.totalAccountsCount.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="bank-products-grid">
                    <div className="bank-product-card" onClick={() => navigate('/deposits')}>
                        <div className="bank-product-header">
                            <div>
                                <div className="bank-product-title">Daily Deposit 180</div>
                                <div className="bank-product-marathi">दैनिक ठेव (180 दिवस)</div>
                            </div>
                            <div className="metric-icon orange" style={{ width: 32, height: 32, margin: 0 }}>
                                <Coins size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="bank-product-balance">
                                {formatCurrency(overview.bankTotals.breakdown.dailyDeposit.totalBalance)}
                            </div>
                            <div className="bank-product-count">
                                {overview.bankTotals.breakdown.dailyDeposit.accountCount} सक्रिय खाती (Accounts)
                            </div>
                        </div>
                    </div>

                    <div className="bank-product-card" onClick={() => navigate('/deposits')}>
                        <div className="bank-product-header">
                            <div>
                                <div className="bank-product-title">Savings Bachat</div>
                                <div className="bank-product-marathi">बचत ठेव खाती</div>
                            </div>
                            <div className="metric-icon green" style={{ width: 32, height: 32, margin: 0 }}>
                                <PiggyBank size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="bank-product-balance">
                                {formatCurrency(overview.bankTotals.breakdown.savings.totalBalance)}
                            </div>
                            <div className="bank-product-count">
                                {overview.bankTotals.breakdown.savings.accountCount} सक्रिय खाती (Accounts)
                            </div>
                        </div>
                    </div>

                    <div className="bank-product-card" onClick={() => navigate('/recurring-deposits')}>
                        <div className="bank-product-header">
                            <div>
                                <div className="bank-product-title">Recurring Deposit</div>
                                <div className="bank-product-marathi">आवर्त ठेव (RD)</div>
                            </div>
                            <div className="metric-icon blue" style={{ width: 32, height: 32, margin: 0 }}>
                                <CreditCard size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="bank-product-balance">
                                {formatCurrency(overview.bankTotals.breakdown.recurringDeposit.totalBalance)}
                            </div>
                            <div className="bank-product-count">
                                {overview.bankTotals.breakdown.recurringDeposit.accountCount} सक्रिय खाती (Accounts)
                            </div>
                        </div>
                    </div>

                    <div className="bank-product-card" onClick={() => navigate('/fixed-deposits')}>
                        <div className="bank-product-header">
                            <div>
                                <div className="bank-product-title">Fixed Deposit</div>
                                <div className="bank-product-marathi">मुदत ठेव (FD)</div>
                            </div>
                            <div className="metric-icon purple" style={{ width: 32, height: 32, margin: 0 }}>
                                <Building2 size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="bank-product-balance">
                                {formatCurrency(overview.bankTotals.breakdown.fixedDeposit.totalBalance)}
                            </div>
                            <div className="bank-product-count">
                                {overview.bankTotals.breakdown.fixedDeposit.accountCount} सक्रिय खाती (Accounts)
                            </div>
                        </div>
                    </div>

                    <div className="bank-product-card" onClick={() => navigate('/loans')}>
                        <div className="bank-product-header">
                            <div>
                                <div className="bank-product-title">Loans & Advances</div>
                                <div className="bank-product-marathi">कर्ज खाती (थकबाकी)</div>
                            </div>
                            <div className="metric-icon orange" style={{ width: 32, height: 32, margin: 0 }}>
                                <Scale size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="bank-product-balance">
                                {formatCurrency(overview.bankTotals.breakdown.loans.totalOutstanding)}
                            </div>
                            <div className="bank-product-count">
                                {overview.bankTotals.breakdown.loans.accountCount} खाती · वितरित {compactLakh(overview.bankTotals.breakdown.loans.totalDisbursed)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )}

        <section className="metric-grid">{metrics.map(({ label, value, change, note, icon: Icon, tone, action }) => <article className="metric-card" key={label}><div className={`metric-icon ${tone}`}><Icon size={20} /></div><div className="metric-label">{label}<button className="metric-menu-trigger" onClick={() => setMetricMenu(metricMenu === label ? null : label)} aria-label={`Open ${label} options`}><MoreHorizontal size={18} /></button>{metricMenu === label && <div className="metric-menu"><button onClick={() => { setMetricMenu(null); action(); }}>Open {label.toLowerCase()}</button><button onClick={() => { setMetricMenu(null); void load(); }}>Refresh data</button></div>}</div><div className="metric-value">{value}</div><div className="metric-change"><span><ArrowUpRight size={14} />{change}</span><small>{note}</small></div></article>)}</section>

        <div className="dashboard-grid">
            <section className="panel collection-panel"><div className="panel-heading"><div><h2>Collection overview</h2><p>Today's collections by payment mode</p></div><span className="muted-text">{overview?.date ?? ''}</span></div><div className="chart-summary"><strong>{overview ? compactLakh(overview.collections.totalAmount) : '—'}</strong><span><ArrowUpRight size={14} /> {overview?.collections.entryCount ?? 0} entries</span><small>collected on the business date</small></div><div className="bar-chart" aria-label="Today's collection by mode">{modeChart.map((item) => <div className="bar-group" key={item.label}><div className="bar-value">{item.height === peakHeight ? compactLakh(item.value) : ''}</div><div className={`bar ${item.height === peakHeight ? 'current' : ''}`} style={{ height: `${item.height}%` }} /><span>{item.label}</span></div>)}{modeChart.length === 0 && <p className="empty-state">No collections recorded yet today.</p>}</div></section>

            <section className="panel pending-panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Pending items requiring review</p></div><button className="more-button" onClick={() => setModal('tasks')} aria-label="Open task actions"><MoreHorizontal size={19} /></button></div><div className="attention-list">{tasks.length === 0 && <button className="attention-item" onClick={() => showToast('No pending items require review.')}><div className="attention-icon green"><CircleCheck size={18} /></div><div><strong>All caught up</strong><span>No pending items require review right now.</span></div></button>}{tasks.map((task) => <button className="attention-item" key={task.kind} onClick={() => { const item = pending?.items.find((entry) => entry.kind === task.kind); setSelectedTask(item ?? { id: task.kind, kind: task.kind, reference: '', amount: 0, customerName: null, accountNumber: null, createdAt: '', dueDate: null, status: '', description: null }); setModal('task'); }}><div className={`attention-icon ${task.tone}`}><TaskIconGlyph icon={task.icon} /></div><div><strong>{task.title}</strong><span>{task.detail}</span></div><ChevronRight size={17} /></button>)}</div><button className="text-button" onClick={() => setModal('tasks')}>View all tasks <ArrowUpRight size={14} /></button></section>
        </div>

        <div className="dashboard-grid lower-grid">
            <section className="panel"><div className="panel-heading"><div><h2>Agent performance</h2><p>{performance ? `${performance.summary.agentCount} agents · ${performance.summary.entryCount} entries · ${formatCurrency(performance.summary.totalAmount)}` : 'Live collection progress'}</p></div><button className="text-button" onClick={() => navigate('/agents')}>View all <ChevronRight size={15} /></button></div><div className="agent-list">{agentRows.length === 0 && <p className="empty-state">No agent collections recorded for this window.</p>}{agentRows.map(({ agent, share }) => <button className="agent-row" key={agent.agentId} onClick={() => { setSelectedAgent(agent); setModal('agent'); }}><div className="mini-avatar blue">{initials(agent.agentName)}</div><div className="agent-name"><strong>{agent.agentName}</strong><span className="status blue">{agent.staffCode}</span></div><div className="progress-wrap"><div className="progress-label"><span>Share of top agent</span><b>{share}%</b></div><div className="progress-track"><i className="blue" style={{ width: `${share}%` }} /></div></div><strong className="agent-total">{formatCurrency(agent.totalAmount)}</strong><ChevronRight size={15} /></button>)}</div></section>

            <section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Jump straight into a workflow</p></div></div><div className="quick-actions"><button onClick={() => navigate('/customers')}><div className="quick-icon blue"><Users size={18} /></div><span>Add customer</span><ChevronRight size={16} /></button><button onClick={() => navigate('/collections')}><div className="quick-icon green"><Wallet size={18} /></div><span>Record collection</span><ChevronRight size={16} /></button><button onClick={() => navigate('/reports')}><div className="quick-icon purple"><CalendarDays size={18} /></div><span>Generate report</span><ChevronRight size={16} /></button></div></section>
        </div>

        <section className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Latest ledger activity across the organisation</p></div><div className="transaction-actions"><div className="dashboard-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" aria-label="Search transactions" /></div><button className="text-button" onClick={() => navigate('/collections')}>View all transactions <ChevronRight size={15} /></button></div></div><div className="table-wrap"><table><thead><tr><th>Transaction ID</th><th>Customer</th><th>Type</th><th>Amount</th><th>Time</th><th>Direction</th></tr></thead><tbody>{filteredTransactions.map((tx) => <tr key={tx.id} onClick={() => { setSelectedTransaction(tx); setModal('transaction-detail'); }}><td className="muted-text">{transactionReference(tx.id)}</td><td><strong>{tx.customerName ?? '—'}</strong></td><td>{tx.transactionType}</td><td className="amount">{tx.direction === 'debit' ? '−' : '+'}{formatCurrency(tx.amount)}</td><td className="muted-text">{formatTime(tx.createdAt)}</td><td><span className={`table-status ${tx.direction === 'credit' ? 'completed' : 'pending'}`}>{tx.direction === 'credit' ? <CircleCheck size={13} /> : <Clock3 size={13} />}{tx.direction === 'credit' ? 'Credit' : 'Debit'}</span></td></tr>)}{filteredTransactions.length === 0 && <tr><td colSpan={6} className="empty-state">No transactions available for this view.</td></tr>}</tbody></table></div></section>

        {modal === 'agent' && selectedAgent && <Modal title={selectedAgent.agentName} onClose={close}><div className="dashboard-detail"><div className="detail-profile"><div className="large-avatar blue">{initials(selectedAgent.agentName)}</div><div><strong>{selectedAgent.agentName}</strong><span>{selectedAgent.staffCode} · Collection agent</span></div></div><div className="detail-stat-grid"><div><span>Collected today</span><strong>{formatCurrency(selectedAgent.totalAmount)}</strong></div><div><span>Entries</span><strong>{selectedAgent.entryCount}</strong></div><div><span>Cash</span><strong>{formatCurrency(selectedAgent.cashAmount)}</strong></div><div><span>Digital + bank</span><strong>{formatCurrency(selectedAgent.digitalAmount + selectedAgent.bankAmount)}</strong></div><div><span>Last entry</span><strong>{selectedAgent.lastEntryAt ? `${formatTime(selectedAgent.lastEntryAt)} · ${formatLongDate(selectedAgent.lastEntryAt)}` : '—'}</strong></div></div><button className="primary-button detail-full-button" onClick={() => { close(); navigate('/agents'); }}>Open agent workspace <ArrowUpRight size={15} /></button></div></Modal>}

        {modal === 'transaction-detail' && selectedTransaction && <Modal title="Transaction details" onClose={close}><div className="dashboard-detail"><div className="transaction-detail-heading"><div><span className="detail-label">REFERENCE</span><strong>{transactionReference(selectedTransaction.id)}</strong></div><span className={`table-status ${selectedTransaction.direction === 'credit' ? 'completed' : 'pending'}`}>{selectedTransaction.direction === 'credit' ? <CircleCheck size={13} /> : <Clock3 size={13} />}{selectedTransaction.direction === 'credit' ? 'Credit' : 'Debit'}</span></div><div className="detail-list"><div><span>Customer</span><strong>{selectedTransaction.customerName ?? '—'}</strong></div><div><span>Transaction type</span><strong>{selectedTransaction.transactionType}</strong></div><div><span>Amount</span><strong>{selectedTransaction.direction === 'debit' ? '−' : '+'}{formatCurrency(selectedTransaction.amount)}</strong></div><div><span>Value date</span><strong>{formatLongDate(selectedTransaction.valueDate)}</strong></div><div><span>Account</span><strong>{selectedTransaction.accountNumber ?? '—'}</strong></div><div><span>Payment method</span><strong>{selectedTransaction.paymentMethod ?? '—'}</strong></div><div><span>Reference</span><strong>{selectedTransaction.referenceNumber ?? '—'}</strong></div><div><span>Recorded at</span><strong>{formatTime(selectedTransaction.createdAt)} · {formatLongDate(selectedTransaction.createdAt)}</strong></div><div><span>Source</span><strong>{selectedTransaction.performedSource === 'agent_mobile' ? 'Collection agent mobile app' : selectedTransaction.performedSource === 'admin_web' ? 'Admin web panel' : 'System'}</strong></div><div><span>Description</span><strong>{selectedTransaction.description ?? '—'}</strong></div></div><button className="secondary-button detail-full-button" onClick={() => { close(); showToast('Ledger entry marked for review.'); }}>Mark for review</button></div></Modal>}

        {modal === 'task' && selectedTask && <Modal title={kindStyles[selectedTask.kind]?.label ?? 'Pending work'} onClose={close} wide><div className="dashboard-detail"><div className="task-banner"><TaskIconGlyph icon={kindStyles[selectedTask.kind]?.icon ?? 'clock'} /><div><strong>{kindStyles[selectedTask.kind]?.label ?? selectedTask.kind}</strong><span>{pending?.counts[selectedTask.kind] ?? taskItems.length} item(s) awaiting your review</span></div></div><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Customer / Account</th><th>Amount</th><th>Due date</th><th>Status</th></tr></thead><tbody>{taskItems.length === 0 && <tr><td colSpan={5} className="empty-state">No items in this queue.</td></tr>}{taskItems.map((rawItem) => {
            const item = rawItem as any;
            const ref = item.reference || item.loanNumber || item.requestNumber || (item.id ? item.id.slice(0, 8).toUpperCase() : '—');
            const customer = item.customerName || item.agentCode || item.differenceType || '—';
            const amt = item.amount ?? item.outstandingAmount ?? 0;
            const dateVal = item.dueDate || item.nextDueDate || item.requestedOn || item.businessDate || item.createdOn || null;
            const statusVal = item.status || (item.daysOverdue !== undefined ? `${item.daysOverdue} days overdue` : 'Overdue');
            return <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => { close(); navigate(taskRoutes[selectedTask.kind]); }} title="Click to view in operations"><td className="muted-text">{ref}</td><td><strong>{customer}</strong></td><td className="amount">{formatCurrency(amt)}</td><td className="muted-text">{formatLongDate(dateVal)}</td><td><span className="table-status pending">{statusVal}</span></td></tr>;
        })}</tbody></table></div><button className="primary-button detail-full-button" onClick={() => { const route = taskRoutes[selectedTask.kind]; close(); navigate(route); }}>Open task queue <ArrowUpRight size={15} /></button></div></Modal>}

        {modal === 'tasks' && <Modal title="All attention tasks" onClose={close}>{tasks.length === 0 ? <p className="empty-state">No pending items require review right now.</p> : <div className="task-menu-list">{tasks.map((task) => <button key={task.kind} onClick={() => { const item = pending?.items.find((entry) => entry.kind === task.kind); setSelectedTask(item ?? { id: task.kind, kind: task.kind, reference: '', amount: 0, customerName: null, accountNumber: null, createdAt: '', dueDate: null, status: '', description: null }); setModal('task'); }}><span className={`attention-icon ${task.tone}`}><TaskIconGlyph icon={task.icon} /></span><span><strong>{task.title}</strong><small>{task.detail}</small></span><ChevronRight size={16} /></button>)}</div>}</Modal>}

        {toast && <div className="dashboard-toast"><CircleCheck size={17} /><span>{toast}</span></div>}
    </div>;
}
