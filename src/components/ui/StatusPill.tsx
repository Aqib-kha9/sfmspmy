import { CheckCircle2, CircleAlert, Clock3, Eye, XCircle } from 'lucide-react';
import type { Status } from '../../features/customers/types/customer.types';

const icons = { Active: CheckCircle2, Completed: CheckCircle2, Pending: Clock3, Review: Eye, Overdue: CircleAlert, Inactive: XCircle, Rejected: XCircle, Matched: CheckCircle2 } as const;

export function StatusPill({ status }: { status: Status }) {
    const Icon = icons[status];
    return <span className={statusClass(status)}><Icon size={13} />{status}</span>;
}

/**
 * Builds the pill class for a status label.
 *
 * Accepts the fixed workflow `Status` union as well as the free-form labels the
 * backend authors for service/transaction rows (e.g. "Matured", "Written off"),
 * so callers can render a consistent pill without narrowing the value first.
 */
export function statusClass(status: Status | string) {
    return `status-pill ${status.toLowerCase().replace(/\s+/g, '-')}`;
}
