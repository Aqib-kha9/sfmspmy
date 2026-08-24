import { Eye, Pencil } from 'lucide-react';
import { DataTable, type Column } from '../../../components/data-table/DataTable';
import { StatusPill } from '../../../components/ui/StatusPill';
import type { Customer } from '../types/customer.types';

export function CustomerTable({ rows, onDetail, onEdit }: { rows: Customer[]; onDetail: (customer: Customer) => void; onEdit?: (customer: Customer) => void }) {
    const columns: Column<Customer>[] = [
        { key: 'customer', header: 'Customer', render: (row) => <div className="table-primary"><strong>{row.name}</strong><span>{row.id} · {row.phone}</span></div> },
        { key: 'value', header: 'Amount / Value', render: (row) => <div className="table-primary"><strong>{row.value}</strong><span>{row.accountSummary}</span></div> },
        { key: 'agent', header: 'Assigned agent', render: (row) => <span>{row.assignedAgent}</span> },
        { key: 'status', header: 'Status', render: (row) => <StatusPill status={row.status} /> },
        { key: 'actions', header: 'Actions', render: (row) => <div className="customer-table-actions"><button className="icon-button" title="View customer" aria-label={`View ${row.name}`} onClick={() => onDetail(row)}><Eye size={15} /></button>{onEdit && <button className="icon-button" title="Edit customer" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}><Pencil size={15} /></button>}</div> },
    ];
    return <DataTable columns={columns} rows={rows} emptyMessage="No customers match the current view." />;
}
