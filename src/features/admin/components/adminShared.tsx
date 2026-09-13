// Shared admin primitives used across every admin feature page.

import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

export type Status = 'Active' | 'Pending' | 'Approved' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Matched';

export type Row = {
    id: string;
    primary: string;
    secondary: string;
    value: string;
    meta: string;
    status: Status;
};

export const statusClass: Record<Status, string> = {
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

export const navTitle: Record<string, string> = {
    '/customers': 'Customers', '/deposits': 'Deposits', '/recurring-deposits': 'Recurring Deposits',
    '/fixed-deposits': 'Fixed Deposits', '/loans': 'Loans', '/withdrawals': 'Withdrawals',
    '/collections': 'Collections', '/agents': 'Collection Agents', '/staff': 'Team & Staff', '/reconciliation': 'Reconciliation',
    '/reports': 'Reports & Statements', '/security': 'Security Center', '/settings': 'System Settings',
};

export function StatusPill({ status }: { status: Status | string }) {
    const cls = statusClass[status as Status] ?? `status-pill ${String(status).toLowerCase().replace(/\s+/g, '-')}`;
    return <span className={cls}><i />{status}</span>;
}

export function SummaryStrip({ items }: { items: Array<{ label: string; value: string; tone?: string }> }) {
    return <div className="summary-strip">{items.map((item) => <div className="summary-item" key={item.label}><span>{item.label}</span><strong className={item.tone}>{item.value}</strong></div>)}</div>;
}

export function DetailCard({ title, icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
    const Icon = icon;
    return <section className="panel settings-form"><div className="panel-heading"><div><h2>{title}</h2></div><Icon size={16} /></div>{children}</section>;
}
