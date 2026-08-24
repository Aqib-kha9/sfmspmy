import { ReactNode } from 'react';

export type Column<T> = { key: string; header: string; render: (row: T) => ReactNode };

export function DataTable<T extends { id: string }>({ columns, rows, emptyMessage = 'No records found.' }: { columns: Column<T>[]; rows: T[]; emptyMessage?: string }) {
    return <div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>) : <tr><td colSpan={columns.length}><div className="empty-state"><strong>{emptyMessage}</strong><span>Adjust the filters or create a new record to continue.</span></div></td></tr>}</tbody></table></div>;
}
