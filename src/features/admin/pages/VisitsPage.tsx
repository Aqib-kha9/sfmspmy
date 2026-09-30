import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Loader2 } from 'lucide-react';
import { collectionsRepository } from '../services/operations/collectionsApiRepository';
import { formatTimestamp, formatDate } from '../services/operations/helpers';
import type { VisitOutcome, VisitView } from '../../../lib/api/types';

export function VisitsPage() {
    const [loading, setLoading] = useState(true);
    const [visits, setVisits] = useState<VisitView[]>([]);
    const [total, setTotal] = useState(0);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [outcome, setOutcome] = useState<VisitOutcome | ''>('');

    const loadVisits = async () => {
        setLoading(true);
        try {
            const result = await collectionsRepository.listVisits({
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                outcome: (outcome as VisitOutcome) || undefined,
                limit: 50,
            });
            setVisits(result.items);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to load visits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadVisits();
    }, [dateFrom, dateTo, outcome]);

    return (
        <div className="admin-page">
            <header className="page-header">
                <div className="header-titles">
                    <h1>Visit Logs</h1>
                    <p>Doorstep visits recorded by collection agents</p>
                </div>
            </header>

            <div className="filter-bar">
                <label className="statement-field">
                    <span>From date</span>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </label>
                <label className="statement-field">
                    <span>To date</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </label>
                <select 
                    className="filter-button customer-status-filter" 
                    value={outcome} 
                    onChange={(e) => setOutcome(e.target.value as VisitOutcome | '')}
                >
                    <option value="">All outcomes</option>
                    <option value="collected">Collected</option>
                    <option value="notAvailable">Not Available</option>
                    <option value="promised">Promised</option>
                    <option value="refused">Refused</option>
                </select>
                <button 
                    className="secondary-button" 
                    onClick={() => { setDateFrom(''); setDateTo(''); setOutcome(''); }}
                    disabled={!dateFrom && !dateTo && !outcome}
                >
                    Clear filters
                </button>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Agent</th>
                            <th>Customer</th>
                            <th>Outcome</th>
                            <th>Remarks</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && visits.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                    <Loader2 size={24} className="spin" style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading visits...</p>
                                </td>
                            </tr>
                        ) : visits.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No visits found for the selected filters.
                                </td>
                            </tr>
                        ) : (
                            visits.map((visit) => (
                                <tr key={visit.id}>
                                    <td>
                                        <div className="stack-cell">
                                            <strong>{formatDate(visit.visitDate)}</strong>
                                            <span>{visit.visitedAt ? formatTimestamp(visit.visitedAt) : 'No exact time'}</span>
                                        </div>
                                    </td>
                                    <td>{visit.agentName}</td>
                                    <td>{visit.customerName}</td>
                                    <td>
                                        <span className={`status-pill ${visit.outcome}`}>
                                            {visit.outcome === 'notAvailable' ? 'Not Available' : visit.outcome}
                                        </span>
                                    </td>
                                    <td>{visit.remark || '-'}</td>
                                    <td className="actions-cell">
                                        <button className="icon-button" aria-label="View details">
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {!loading && visits.length > 0 && (
                <div className="table-footer">
                    <p>Showing {visits.length} of {total} total visits</p>
                </div>
            )}
        </div>
    );
}
