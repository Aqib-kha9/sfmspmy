import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer, FileText, X } from 'lucide-react';
import { formatCurrency, formatShortRef, formatAgentOrCashier } from '../../../lib/formatters/formatters';
import type { ReceiptData } from './TransactionReceiptModal';

export interface StatementEntry {
    id: string;
    date: string;
    time?: string;
    description: string;
    reference?: string;
    debit?: number;
    credit?: number;
    balance?: number;
    paymentMethod?: string;
    agentOrCashier?: string;
    receiptNumber?: string;
    status?: string;
}

export interface StatementAccountMeta {
    accountNumber: string;
    customerName: string;
    customerId: string;
    customerPhone?: string;
    productName: string;
    productType: 'RD' | 'Loan' | 'Deposit' | 'Daily';
    branch?: string;
    currentBalance?: number;
    outstandingAmount?: number;
    openedOn?: string;
}

export function AccountStatementModal({
    account,
    entries,
    onClose,
    onViewReceipt,
}: {
    account: StatementAccountMeta;
    entries: StatementEntry[];
    onClose: () => void;
    onViewReceipt: (receipt: ReceiptData) => void;
}) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'this_month' | 'last_30' | 'last_90' | 'fy'>('all');

    // Quick filter chip handlers
    const setQuickFilter = (type: 'all' | 'this_month' | 'last_30' | 'last_90' | 'fy') => {
        setActiveFilter(type);
        const today = new Date();
        const ymd = (d: Date) => d.toISOString().slice(0, 10);

        if (type === 'all') {
            setFrom('');
            setTo('');
            return;
        }
        if (type === 'this_month') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            setFrom(ymd(start));
            setTo(ymd(today));
            return;
        }
        if (type === 'last_30') {
            const start = new Date(today);
            start.setDate(today.getDate() - 30);
            setFrom(ymd(start));
            setTo(ymd(today));
            return;
        }
        if (type === 'last_90') {
            const start = new Date(today);
            start.setDate(today.getDate() - 90);
            setFrom(ymd(start));
            setTo(ymd(today));
            return;
        }
        if (type === 'fy') {
            // Indian Financial Year: April 1 to March 31
            const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
            const start = new Date(currentYear, 3, 1);
            const end = new Date(currentYear + 1, 2, 31);
            setFrom(ymd(start));
            setTo(ymd(end));
            return;
        }
    };

    // Filtered entries according to date range and search keyword
    const filteredEntries = useMemo(() => {
        return entries.filter((item) => {
            if (from && item.date < from) return false;
            if (to && item.date > to) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = `${item.date} ${item.description} ${item.reference ?? ''} ${item.receiptNumber ?? ''} ${item.paymentMethod ?? ''} ${item.agentOrCashier ?? ''}`.toLowerCase();
                if (!match.includes(q)) return false;
            }
            return true;
        });
    }, [entries, from, to, searchQuery]);

    // Financial totals
    const totalCredits = useMemo(
        () => filteredEntries.reduce((sum, item) => sum + (item.credit ?? 0), 0),
        [filteredEntries]
    );
    const totalDebits = useMemo(
        () => filteredEntries.reduce((sum, item) => sum + (item.debit ?? 0), 0),
        [filteredEntries]
    );

    // Export to Excel / CSV with proper UTF-8 BOM
    const handleExportExcel = () => {
        const titleRows = [
            `सावित्रीबाई महिला नागरी सहकारी पतसंस्था मर्यादित (SAVITRIBAI PATSANSTHA)`,
            `खाते विवरण / ACCOUNT STATEMENT`,
            `खाते क्र. (Account No): ${account.accountNumber} | सभासद (Member): ${account.customerName} (${account.customerId})`,
            `योजना (Product): ${account.productName} | शाखा (Branch): ${account.branch ?? 'Main Branch'}`,
            `कालावधी (Period): ${from || 'Beginning'} ते ${to || 'Latest'} | Generated: ${new Date().toLocaleString('en-IN')}`,
            ``,
        ];

        const headerRow = [
            'दिनांक (Date)',
            'तपशील (Particulars)',
            'पावती क्र. / Ref (Receipt/Ref)',
            'नावे रक्कम (Debit ₹)',
            'जमा रक्कम (Credit ₹)',
            'शिल्लक (Balance ₹)',
            'पेमेंट मोड (Payment Mode)',
            'वसूलकर्ता / Cashier',
        ];

        const dataRows = filteredEntries.map((row) => [
            row.date,
            `"${(row.description || '').replace(/"/g, '""')}"`,
            `"${(row.receiptNumber || row.reference || '').replace(/"/g, '""')}"`,
            row.debit ? row.debit.toFixed(2) : '0.00',
            row.credit ? row.credit.toFixed(2) : '0.00',
            row.balance !== undefined ? row.balance.toFixed(2) : '',
            `"${(row.paymentMethod || '').replace(/"/g, '""')}"`,
            `"${(row.agentOrCashier || '').replace(/"/g, '""')}"`,
        ]);

        const summaryRow = [
            'TOTAL',
            'एकूण व्यवहार',
            '',
            totalDebits.toFixed(2),
            totalCredits.toFixed(2),
            account.currentBalance !== undefined ? account.currentBalance.toFixed(2) : '',
            '',
            '',
        ];

        const csvContent =
            '\uFEFF' +
            [
                ...titleRows,
                headerRow.join(','),
                ...dataRows.map((r) => r.join(',')),
                summaryRow.join(','),
            ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `statement-${account.accountNumber}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* =========================================================================
                1. INTERACTIVE SCREEN MODAL (Visible on screen, hidden on print)
               ========================================================================= */}
            <div
                className="admin-overlay no-print"
                role="presentation"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) onClose();
                }}
            >
                <section
                    className="admin-modal customer-wide-modal"
                    role="dialog"
                    aria-modal="true"
                    style={{ maxWidth: '1000px', width: '95%' }}
                >
                    {/* Modal Header */}
                    <div className="admin-modal-header">
                        <div>
                            <div className="eyebrow">
                                ACCOUNT STATEMENT / {account.accountNumber}
                            </div>
                            <h2>{account.customerName}</h2>
                            <p>
                                {account.productName} · {account.customerId}
                                {account.customerPhone ? ` · ${account.customerPhone}` : ''}
                            </p>
                        </div>
                        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Account Summary Strip */}
                    <div className="customer-profile-summary">
                        <div className="customer-avatar">
                            {account.customerName.split(' ').map((p) => p[0]).join('')}
                        </div>
                        <div>
                            <strong>{account.accountNumber}</strong>
                            <span>
                                {account.productName} · {account.branch ?? 'Head Office'}
                            </span>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                            {account.currentBalance !== undefined && (
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Balance</span>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a' }}>
                                        {formatCurrency(account.currentBalance)}
                                    </div>
                                </div>
                            )}
                            {account.outstandingAmount !== undefined && (
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Outstanding</span>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ea580c' }}>
                                        {formatCurrency(account.outstandingAmount)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="statement-filter" style={{ gridTemplateColumns: 'repeat(3, 1fr) auto' }}>
                        <label className="statement-field">
                            <span>From Date (पासून)</span>
                            <input
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(event) => {
                                    setFrom(event.target.value);
                                    setActiveFilter('all');
                                }}
                            />
                        </label>
                        <label className="statement-field">
                            <span>To Date (पर्यंत)</span>
                            <input
                                type="date"
                                value={to}
                                min={from || undefined}
                                onChange={(event) => {
                                    setTo(event.target.value);
                                    setActiveFilter('all');
                                }}
                            />
                        </label>
                        <label className="statement-field">
                            <span>Search particulars / ref</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search in statement..."
                            />
                        </label>
                        <div className="statement-filter-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => {
                                    setFrom('');
                                    setTo('');
                                    setSearchQuery('');
                                    setActiveFilter('all');
                                }}
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Quick Date Chips */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 24px',
                            flexWrap: 'wrap',
                        }}
                    >
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Quick:</span>
                        {[
                            { key: 'all', label: 'All Time' },
                            { key: 'this_month', label: 'This Month' },
                            { key: 'last_30', label: 'Last 30 Days' },
                            { key: 'last_90', label: 'Last 3 Months' },
                            { key: 'fy', label: 'Financial Year' },
                        ].map((chip) => (
                            <button
                                type="button"
                                key={chip.key}
                                onClick={() => setQuickFilter(chip.key as any)}
                                style={{
                                    padding: '3px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: activeFilter === chip.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                    background: activeFilter === chip.key ? '#eff6ff' : '#ffffff',
                                    color: activeFilter === chip.key ? '#1d4ed8' : '#475569',
                                    cursor: 'pointer',
                                }}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Financial Totals Strip */}
                    <div className="statement-summary">
                        <div className="statement-stat">
                            <span>Total Deposits / Credits (जमा)</span>
                            <strong className="green-text">{formatCurrency(totalCredits)}</strong>
                        </div>
                        <div className="statement-stat">
                            <span>Total Withdrawals / Debits (नावे)</span>
                            <strong className="orange-text">{formatCurrency(totalDebits)}</strong>
                        </div>
                        <div className="statement-stat">
                            <span>Net Movement (निव्वळ बदल)</span>
                            <strong>{formatCurrency(totalCredits - totalDebits)}</strong>
                        </div>
                        <div className="statement-stat">
                            <span>Transactions (एकूण नोंदी)</span>
                            <strong>{filteredEntries.length} entries</strong>
                        </div>
                    </div>

                    {/* Screen Ledger Table */}
                    <section className="customer-subsection" style={{ padding: '0 24px 16px' }}>
                        <div className="customer-section-heading">
                            <div>
                                <h3>Transaction Ledger (खातेवही नोंदी)</h3>
                                <p>Chronological statement entries with receipt generation.</p>
                            </div>
                            <span>{filteredEntries.length} rows</span>
                        </div>

                        {filteredEntries.length ? (
                            <div className="statement-table-wrap">
                                <table className="statement-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Particulars / Description</th>
                                            <th>Ref / Receipt</th>
                                            <th>Debit (-₹)</th>
                                            <th>Credit (+₹)</th>
                                            <th>Balance (₹)</th>
                                            <th>Mode / Collector</th>
                                            <th style={{ textAlign: 'center' }}>Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEntries.map((row) => (
                                            <tr key={row.id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <strong>{row.date}</strong>
                                                    {row.time && <small>{row.time}</small>}
                                                </td>
                                                <td>
                                                    <strong>{row.description}</strong>
                                                </td>
                                                <td>
                                                    <span
                                                        className="mono-ref-tag"
                                                        title={row.receiptNumber || row.reference || ''}
                                                    >
                                                        {formatShortRef(row.receiptNumber || row.reference)}
                                                    </span>
                                                </td>
                                                <td className="statement-debit">
                                                    {row.debit ? formatCurrency(row.debit) : '—'}
                                                </td>
                                                <td className="statement-credit">
                                                    {row.credit ? formatCurrency(row.credit) : '—'}
                                                </td>
                                                <td style={{ fontWeight: 700 }}>
                                                    {row.balance !== undefined ? formatCurrency(row.balance) : '—'}
                                                </td>
                                                <td>
                                                    <small>
                                                        {row.paymentMethod ?? 'Cash'}
                                                        {row.agentOrCashier ? ` · ${formatAgentOrCashier(row.agentOrCashier)}` : ''}
                                                    </small>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            onViewReceipt({
                                                                receiptNumber: row.receiptNumber || row.reference || `RCT-${row.id.slice(0, 8).toUpperCase()}`,
                                                                date: row.date,
                                                                time: row.time,
                                                                customerName: account.customerName,
                                                                customerId: account.customerId,
                                                                customerPhone: account.customerPhone,
                                                                accountNumber: account.accountNumber,
                                                                productName: account.productName,
                                                                productType: account.productType,
                                                                amount: row.credit || row.debit || 0,
                                                                paymentMethod: row.paymentMethod || 'Cash',
                                                                agentOrCashier: row.agentOrCashier || 'Branch Staff',
                                                                reference: row.reference,
                                                                balanceAfter: row.balance,
                                                                branch: account.branch,
                                                                narration: row.description,
                                                            })
                                                        }
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '0.72rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            borderRadius: '4px',
                                                        }}
                                                        title="View / Print Receipt for this entry"
                                                    >
                                                        <FileText size={13} /> Receipt
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <strong>No transactions found</strong>
                                <span>Try adjusting the date filter or search query.</span>
                            </div>
                        )}
                    </section>

                    {/* Footer Actions */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderTop: '1px solid #e2e8f0',
                            background: '#f8fafc',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleExportExcel}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Download size={15} /> Export Excel / CSV
                            </button>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handlePrint}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Printer size={15} /> Print / Save as PDF
                            </button>
                        </div>
                        <button type="button" className="primary-button" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </section>
            </div>

            {/* =========================================================================
                2. DEDICATED CO-OPERATIVE BANK A4 STATEMENT (PRINT ONLY - PORTAL TO BODY)
                सावित्रीबाई महिला नागरी सहकारी पतसंस्था मर्यादित, यवतमाळ
                Portaled directly to document.body so #root { display: none } leaves ZERO
                blank space at the top of the printed page!
               ========================================================================= */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <div className="bank-statement-print-sheet print-only" id="statement-print-document">
                        <header className="statement-print-header">
                            <div className="statement-header-top">
                                <img
                                    src="/logo.png"
                                    alt="Savitribai Patsanstha Logo"
                                    className="statement-bank-logo"
                                />
                                <div className="statement-header-titles">
                                    <h1 className="statement-bank-name-mr">
                                        सावित्रीबाई महिला नागरी सहकारी पतसंस्था मर्यादित, यवतमाळ
                                    </h1>
                                    <h2 className="statement-bank-name-en">
                                        SAVITRIBAI MAHILA NAGARI SAHAKARI PATSANSTHA MARYADIT, YAVATMAL
                                    </h2>
                                    <div className="statement-bank-reg-info">
                                        नोंदणी क्र. (Reg. No.): BOM/RPR/419/1990 · प्रधान कार्यालय: मुख्य रस्ता, यवतमाळ - ४४५००१
                                    </div>
                                    <div className="statement-bank-contact-info">
                                        फोन: 07232-245678 · ईमेल: savitribaipatsanstha@gmail.com · शाखा: {account.branch || 'मुख्य शाखा, यवतमाळ (Main Branch)'}
                                    </div>
                                </div>
                            </div>
                            <div className="statement-print-title-banner">
                                <span>खाते विवरण / STATEMENT OF ACCOUNT</span>
                            </div>
                        </header>

                        {/* 2. Formal Bank Metadata Table (Fixed 4-column layout: NEVER squishes or breaks text!) */}
                        <table className="statement-print-meta-table">
                            <tbody>
                                <tr>
                                    <td className="meta-lbl">खाते क्र. (Account No):</td>
                                    <td className="meta-val meta-highlight">{account.accountNumber}</td>
                                    <td className="meta-lbl">खाते प्रकार (Scheme / Product):</td>
                                    <td className="meta-val meta-product">{account.productName}</td>
                                </tr>
                                <tr>
                                    <td className="meta-lbl">सभासद नाव (Member Name):</td>
                                    <td className="meta-val">{account.customerName}</td>
                                    <td className="meta-lbl">शाखा (Branch):</td>
                                    <td className="meta-val">{account.branch || 'मुख्य शाखा, यवतमाळ (Main Branch)'}</td>
                                </tr>
                                <tr>
                                    <td className="meta-lbl">सभासद क्र. (Member ID):</td>
                                    <td className="meta-val">{account.customerId}</td>
                                    <td className="meta-lbl">विवरण कालावधी (Statement Period):</td>
                                    <td className="meta-val">
                                        {from ? `${from}` : 'सुरुवातीपासून (Start)'} ते {to ? `${to}` : 'आजपर्यंत (Till Date)'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="meta-lbl">मोबाईल क्र. (Mobile No):</td>
                                    <td className="meta-val">{account.customerPhone || 'N/A'}</td>
                                    <td className="meta-lbl">मुद्रण दिनांक (Printed On):</td>
                                    <td className="meta-val">
                                        {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 3. Account Activity Summary Table (Clean 4-column bordered strip) */}
                        <table className="statement-print-summary-table">
                            <tbody>
                                <tr>
                                    <td className="sum-box">
                                        <span className="sum-box-label">एकूण जमा (Total Credits)</span>
                                        <strong className="sum-box-val text-credit">{formatCurrency(totalCredits)}</strong>
                                    </td>
                                    <td className="sum-box">
                                        <span className="sum-box-label">एकूण नावे (Total Debits)</span>
                                        <strong className="sum-box-val text-debit">{formatCurrency(totalDebits)}</strong>
                                    </td>
                                    <td className="sum-box">
                                        <span className="sum-box-label">निव्वळ बदल (Net Movement)</span>
                                        <strong className="sum-box-val">{formatCurrency(totalCredits - totalDebits)}</strong>
                                    </td>
                                    <td className="sum-box">
                                        <span className="sum-box-label">अखेरची शिल्लक (Closing Balance)</span>
                                        <strong className="sum-box-val text-balance">
                                            {formatCurrency(account.currentBalance ?? (totalCredits - totalDebits))}
                                        </strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 4. Printable Ledger Table (100% full width, no overflow, clean borders) */}
                        <table className="statement-print-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '13%' }}>दिनांक (Date)</th>
                                    <th style={{ width: '33%' }}>तपशील (Particulars / Description)</th>
                                    <th style={{ width: '16%' }}>पावती / संदर्भ (Receipt / Ref)</th>
                                    <th style={{ width: '12%', textAlign: 'right' }}>नावे (Debit ₹)</th>
                                    <th style={{ width: '12%', textAlign: 'right' }}>जमा (Credit ₹)</th>
                                    <th style={{ width: '14%', textAlign: 'right' }}>शिल्लक (Balance ₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.length > 0 ? (
                                    filteredEntries.map((row) => (
                                        <tr key={row.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <strong>{row.date}</strong>
                                                {row.time && <div className="print-subtext">{row.time}</div>}
                                            </td>
                                            <td>
                                                <div className="print-main-text">{row.description}</div>
                                                {(row.paymentMethod || row.agentOrCashier) && (
                                                    <div className="print-subtext">
                                                        मोड: {row.paymentMethod || 'Cash'}
                                                        {row.agentOrCashier ? ` · वसूलकर्ता: ${formatAgentOrCashier(row.agentOrCashier)}` : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#1e3a8a', wordBreak: 'normal', overflowWrap: 'break-word' }}>
                                                {formatShortRef(row.receiptNumber || row.reference)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>
                                                {row.debit ? formatCurrency(row.debit) : '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                                                {row.credit ? formatCurrency(row.credit) : '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {row.balance !== undefined ? formatCurrency(row.balance) : '—'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>
                                            निवडलेल्या कालावधीत कोणतीही नोंद आढळली नाही (No transactions found)
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="statement-print-tfoot-row">
                                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 800 }}>
                                        एकूण (TOTAL) [{filteredEntries.length} नोंदी]:
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#b91c1c' }}>
                                        {formatCurrency(totalDebits)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                                        {formatCurrency(totalCredits)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 900 }}>
                                        {formatCurrency(account.currentBalance ?? (totalCredits - totalDebits))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* 5. Signatures & Bank Seal Block */}
                        <div className="statement-print-signatures">
                            <div className="statement-sign-block">
                                <div className="statement-sign-line" />
                                <div className="statement-sign-role">तयार करणार / रोखपाल</div>
                                <div className="statement-sign-en">(Prepared By / Cashier)</div>
                            </div>
                            <div className="statement-sign-seal-box">
                                <div className="statement-seal-circle">
                                    <span>पतसंस्था अधिकृत शिक्का<br />OFFICIAL SEAL</span>
                                </div>
                            </div>
                            <div className="statement-sign-block">
                                <div className="statement-sign-line" />
                                <div className="statement-sign-role">तपासणार / लेखापाल</div>
                                <div className="statement-sign-en">(Checked By / Accountant)</div>
                            </div>
                            <div className="statement-sign-block">
                                <div className="statement-sign-line" />
                                <div className="statement-sign-role">शाखा व्यवस्थापक / अधिकृत स्वाक्षरी</div>
                                <div className="statement-sign-en">(Branch Manager / Auth. Signatory)</div>
                            </div>
                        </div>

                        {/* 6. Legal Disclaimer & Regulatory Notice */}
                        <footer className="statement-print-footer-notice">
                            <p>
                                <strong>महत्त्वाची सूचना:</strong> सदर खाते विवरण संगणकीय प्रणालीद्वारे तयार करण्यात आले आहे. कृपया सर्व नोंदींची खात्री करावी. 
                                नोंदींमध्ये काही तफावत आढळल्यास विवरण जारी झाल्यापासून ७ दिवसांच्या आत संस्थेच्या शाखेशी संपर्क साधावा.
                            </p>
                            <p className="statement-print-confidential">
                                सावित्रीबाई महिला नागरी सहकारी पतसंस्था मर्यादित, यवतमाळ · अधिकृत खाते विवरण (Computer Generated Statement)
                            </p>
                        </footer>
                    </div>,
                    document.body
                )}
        </>
    );
}
