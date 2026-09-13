import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../../components/overlays/Modal';
import { statusClass } from '../../../components/ui/StatusPill';
import { formatCurrency } from '../../../lib/formatters/formatters';
import type {
    CustomerStatementAccount,
    CustomerStatementQuery,
    CustomerStatementView,
} from '../../../lib/api/types';
import type { Status } from '../types/customer.types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats an ISO `YYYY-MM-DD` date without shifting it across time zones. */
function formatDay(iso: string): string {
    const [year, month, day] = iso.split('-');
    const monthLabel = MONTHS[Number(month) - 1];
    if (!year || !monthLabel || !day) return iso;
    return `${day} ${monthLabel} ${year}`;
}

/** Renders a server-provided money string, leaving unknown values explicit. */
function money(value: string | undefined): string {
    if (value === undefined || value === '') return '—';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? formatCurrency(numeric) : value;
}

/** Turns a raw backend status (`pending_approval`) into readable text. */
function humanise(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Maps the savings-account status vocabulary from the database onto the shared
 * pill vocabulary so the colour treatment is consistent, while the raw status
 * text is still what the operator reads.
 */
function pillStatus(value: string): Status {
    switch (value.toLowerCase()) {
        case 'active':
            return 'Active';
        case 'closed':
            return 'Inactive';
        case 'frozen':
            return 'Rejected';
        case 'pending_approval':
            return 'Pending';
        default:
            return 'Review';
    }
}

export function CustomerStatementModal({
    customerId,
    customerName,
    onClose,
    loadStatement,
}: {
    customerId: string;
    customerName: string;
    onClose: () => void;
    loadStatement: (id: string, query?: CustomerStatementQuery) => Promise<CustomerStatementView>;
}) {
    const [view, setView] = useState<CustomerStatementView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [accountId, setAccountId] = useState('');
    const [accounts, setAccounts] = useState<CustomerStatementAccount[]>([]);

    const load = useCallback(async (query: CustomerStatementQuery) => {
        setLoading(true);
        try {
            const statement = await loadStatement(customerId, query);
            setView(statement);
            setError('');
            // Merge accounts seen so far so the account selector keeps offering
            // every account even after the ledger is narrowed to one of them.
            setAccounts((current) => {
                const merged = new Map(current.map((account) => [account.id, account]));
                statement.accounts.forEach((account) => merged.set(account.id, account));
                return [...merged.values()].sort((left, right) => left.accountNumber.localeCompare(right.accountNumber));
            });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load the customer statement.');
        } finally {
            setLoading(false);
        }
    }, [customerId, loadStatement]);

    useEffect(() => { void load({}); }, [load]);

    useEffect(() => {
        if (!view) return;
        setFrom((current) => current || view.period.from);
        setTo((current) => current || view.period.to);
    }, [view]);

    const applyPeriod = () => {
        if (from && to && from > to) {
            setError('Start date must be on or before the end date.');
            return;
        }
        void load({ fromDate: from || undefined, toDate: to || undefined, accountId: accountId || undefined });
    };

    const resetPeriod = () => {
        setFrom('');
        setTo('');
        setAccountId('');
        void load({});
    };

    const title = view?.customer.fullName || customerName;
    const code = view?.customer.customerCode;

    return <Modal title={title} eyebrow={`CUSTOMER STATEMENT${code ? ` / ${code}` : ''}`} onClose={onClose} wide>
        <p className="customer-modal-intro">Savings account ledger for this customer, including opening and closing balances for the selected period.</p>

        <div className="statement-filter">
            <label className="statement-field"><span>From</span><input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="statement-field"><span>To</span><input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
            <label className="statement-field"><span>Account</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                <option value="">All accounts</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.accountNumber}</option>)}
            </select></label>
            <div className="statement-filter-actions">
                <button type="button" className="secondary-button" onClick={resetPeriod}>Reset</button>
                <button type="button" className="primary-button" onClick={applyPeriod} disabled={loading}>Apply</button>
            </div>
        </div>

        {loading && !view ? <div className="empty-state"><strong>Loading statement</strong><span>Fetching the savings ledger from the server.</span></div>
            : error && !view ? <div className="empty-state"><strong>{error}</strong><span>Adjust the filters or retry the request.</span></div>
                : view ? <>
                    {error && <p className="form-error statement-error">{error}</p>}
                    {view.period.from && view.period.to && <p className="statement-period">Period {formatDay(view.period.from)} — {formatDay(view.period.to)}</p>}
                    <div className="statement-summary">
                        <div className="statement-stat"><span>Opening balance</span><strong>{money(view.openingBalance)}</strong></div>
                        <div className="statement-stat"><span>Closing balance</span><strong>{money(view.closingBalance)}</strong></div>
                        <div className="statement-stat"><span>Accounts</span><strong>{view.accounts.length}</strong></div>
                        <div className="statement-stat"><span>Ledger entries</span><strong>{view.entries.length}</strong></div>
                    </div>

                    <section className="customer-subsection">
                        <div className="customer-section-heading"><div><h3>Accounts</h3><p>Savings accounts included in this statement.</p></div><span>{view.accounts.length} accounts</span></div>
                        {view.accounts.length ? <div className="statement-account-list">{view.accounts.map((account) => <div className="statement-account-row" key={account.id}><div><strong>{account.accountNumber}</strong><span>Savings deposit</span></div><div><strong>{money(account.currentBalance)}</strong><span className={statusClass(pillStatus(account.status))}>{humanise(account.status)}</span></div></div>)}</div>
                            : <div className="empty-state"><strong>No savings accounts</strong><span>This customer has no savings account for the selected filter.</span></div>}
                    </section>

                    <section className="customer-subsection">
                        <div className="customer-section-heading"><div><h3>Statement entries</h3><p>Debits, credits and corrections recorded in the period.</p></div><span>{view.entries.length} entries</span></div>
                        {view.entries.length ? <div className="statement-table-wrap"><table className="statement-table">
                            <thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                            <tbody>{view.entries.map((entry, index) => <tr key={`${entry.accountId}-${entry.date}-${index}`}>
                                <td>{formatDay(entry.date)}</td>
                                <td><strong>{entry.description}</strong>{entry.correctionNote && <small>Correction: {entry.correctionNote}</small>}{entry.reversalOf && <small>Reverses {entry.reversalOf}</small>}</td>
                                <td className="statement-debit">{entry.debit ? money(entry.debit) : '—'}</td>
                                <td className="statement-credit">{entry.credit ? money(entry.credit) : '—'}</td>
                                <td>{money(entry.balance)}</td>
                            </tr>)}</tbody>
                        </table></div>
                            : <div className="empty-state"><strong>No transactions recorded</strong><span>No ledger activity was recorded for this customer in the selected period.</span></div>}
                    </section>
                </>
                    : null}
    </Modal>;
}
