import { createPortal } from 'react-dom';
import { Printer, Download, CheckCircle2, X } from 'lucide-react';
import { numberToIndianWords, formatAgentOrCashier } from '../../../lib/formatters/formatters';

export interface ReceiptData {
    receiptNumber: string;
    date: string;
    time?: string;
    customerName: string;
    customerId: string;
    customerPhone?: string;
    accountNumber: string;
    productName: string;
    productType: 'RD' | 'Loan' | 'Deposit' | 'Daily';
    amount: number;
    paymentMethod: string;
    agentOrCashier: string;
    reference?: string;
    balanceAfter?: number;
    outstandingAfter?: number;
    narration?: string;
    branch?: string;
}

export function TransactionReceiptModal({
    receipt,
    onClose,
}: {
    receipt: ReceiptData;
    onClose: () => void;
}) {
    const handlePrint = () => {
        window.print();
    };

    const handleDownloadTxt = () => {
        const lines = [
            '================================================================',
            'सावित्रीबाई महिला नागरी सहकारी पतसंस्था मर्यादित',
            'SAVITRIBAI MAHILA NAGARI SAHAKARI PATSANSTHA MARYADIT',
            'Reg No: BOM/RPR/419/1990 · Branch: ' + (receipt.branch ?? 'Head Office'),
            '----------------------------------------------------------------',
            'OFFICIAL TRANSACTION RECEIPT / अधिकृत पावती',
            '----------------------------------------------------------------',
            `Receipt No     : ${receipt.receiptNumber}`,
            `Date & Time    : ${receipt.date}${receipt.time ? ' ' + receipt.time : ''}`,
            `Member Name    : ${receipt.customerName}`,
            `Member ID      : ${receipt.customerId}`,
            `Mobile No      : ${receipt.customerPhone ?? 'N/A'}`,
            `Account No     : ${receipt.accountNumber}`,
            `Product / Type : ${receipt.productName}`,
            `Amount Paid    : ₹${receipt.amount.toLocaleString('en-IN')}`,
            `Amount in Words: ${numberToIndianWords(receipt.amount)}`,
            `Payment Mode   : ${receipt.paymentMethod}`,
            `Reference / UTR: ${receipt.reference ?? 'N/A'}`,
            `Recorded By    : ${receipt.agentOrCashier}`,
            receipt.balanceAfter !== undefined ? `Balance After  : ₹${receipt.balanceAfter.toLocaleString('en-IN')}` : '',
            receipt.outstandingAfter !== undefined ? `Outstanding    : ₹${receipt.outstandingAfter.toLocaleString('en-IN')}` : '',
            receipt.narration ? `Narration      : ${receipt.narration}` : '',
            '----------------------------------------------------------------',
            'Received with thanks. Computer generated official receipt.',
            '================================================================',
        ].filter(Boolean).join('\r\n');

        const blob = new Blob([lines], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${receipt.receiptNumber}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const voucherContent = (
        <div className="receipt-voucher">
            <div className="receipt-watermark">SAVITRIBAI</div>

            {/* Official Bank Header */}
            <div className="receipt-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '4px' }}>
                    <img src="/logo.png" alt="Savitribai Patsanstha Logo" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
                    <div>
                        <div className="receipt-org-title-mr">
                            सावित्रीबाई महिला नागरी सहकारी पतसंस्था मर्यादित
                        </div>
                        <div className="receipt-org-title-en">
                            SAVITRIBAI MAHILA NAGARI SAHAKARI PATSANSTHA MARYADIT
                        </div>
                    </div>
                </div>
                <div className="receipt-org-meta">
                    नोंदणी क्र.: BOM/RPR/419/1990 · शाखा: {receipt.branch ?? 'मुख्य शाखा, यवतमाळ (Head Office)'}
                </div>
                <div className="receipt-badge-title">
                    अधिकृत पावती · OFFICIAL TRANSACTION RECEIPT
                </div>
            </div>

            {/* Meta Fields Grid */}
            <div className="receipt-grid">
                <div className="receipt-field">
                    <span className="receipt-field-label">पावती क्र. (Receipt No):</span>
                    <span className="receipt-field-val" style={{ color: '#1e40af' }}>
                        {receipt.receiptNumber}
                    </span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">दिनांक (Date):</span>
                    <span className="receipt-field-val">
                        {receipt.date} {receipt.time ?? ''}
                    </span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">सभासद नाव (Member):</span>
                    <span className="receipt-field-val">{receipt.customerName}</span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">सभासद क्र. (Member ID):</span>
                    <span className="receipt-field-val">{receipt.customerId}</span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">खाते क्र. (Account No):</span>
                    <span className="receipt-field-val" style={{ letterSpacing: '0.02em' }}>
                        {receipt.accountNumber}
                    </span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">योजना (Product / Scheme):</span>
                    <span className="receipt-field-val">{receipt.productName}</span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">भरणा प्रकार (Payment Mode):</span>
                    <span className="receipt-field-val">{receipt.paymentMethod}</span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">पावती संदर्भ (Reference):</span>
                    <span className="receipt-field-val" style={{ wordBreak: 'break-all' }}>
                        {receipt.reference ?? 'Cash Collection'}
                    </span>
                </div>
                <div className="receipt-field">
                    <span className="receipt-field-label">वसूलकर्ता (Collected By):</span>
                    <span className="receipt-field-val">{formatAgentOrCashier(receipt.agentOrCashier)}</span>
                </div>
                {receipt.balanceAfter !== undefined && (
                    <div className="receipt-field">
                        <span className="receipt-field-label">शिल्लक रक्कम (Current Balance):</span>
                        <span className="receipt-field-val" style={{ color: '#16a34a' }}>
                            ₹{receipt.balanceAfter.toLocaleString('en-IN')}
                        </span>
                    </div>
                )}
                {receipt.outstandingAfter !== undefined && (
                    <div className="receipt-field">
                        <span className="receipt-field-label">थकबाकी (Outstanding):</span>
                        <span className="receipt-field-val" style={{ color: '#ea580c' }}>
                            ₹{receipt.outstandingAfter.toLocaleString('en-IN')}
                        </span>
                    </div>
                )}
            </div>

            {/* Prominent Amount Box */}
            <div className="receipt-amount-card">
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    जमा रक्कम / AMOUNT RECEIVED
                </div>
                <div className="receipt-amount-val">
                    ₹{receipt.amount.toLocaleString('en-IN')}
                </div>
                <div className="receipt-amount-words">
                    (In Words: {numberToIndianWords(receipt.amount)})
                </div>
            </div>

            {/* Signatures */}
            <div className="receipt-signatures">
                <div className="receipt-sign-box">
                    <div className="receipt-sign-line" />
                    <span>ठेवीदार / सभासद सही<br />(Member's Signature)</span>
                </div>
                <div className="receipt-sign-box">
                    <div className="receipt-sign-line" />
                    <span>रोखपाल / अधिकृत स्वाक्षरी<br />(Cashier / Authorized Officer)</span>
                </div>
            </div>

            {/* Footer Legal Note */}
            <div className="receipt-footer-note">
                सदर पावती संगणकीय प्रणालीद्वारे तयार करण्यात आली आहे. नियमांचे पालन करणे आवश्यक आहे.<br />
                This is a computer generated official acknowledgement receipt.
            </div>
        </div>
    );

    return (
        <>
            {/* 1. Interactive Modal (Screen only) */}
            <div
                className="receipt-overlay no-print"
                role="presentation"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) onClose();
                }}
            >
                <div className="receipt-modal-container">
                    {/* Modal Top Bar */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} color="#16a34a" />
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                                Transaction Recorded · Receipt Generated
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748b',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Receipt Voucher on Screen */}
                    {voucherContent}

                    {/* Modal Footer Actions */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 20px',
                            borderTop: '1px solid #e2e8f0',
                            background: '#f8fafc',
                        }}
                    >
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={handleDownloadTxt}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Download size={15} /> Download Receipt (.txt)
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={handlePrint}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Printer size={15} /> Print Receipt
                            </button>
                            <button type="button" className="secondary-button" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Print-Only Portal (Renders directly into document.body for zero margin cutoff) */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <div className="receipt-voucher-print print-only">
                        {voucherContent}
                    </div>,
                    document.body
                )}
        </>
    );
}
