export function formatCurrency(value?: number | null) {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) {
        return '₹0';
    }
    return `₹${Number(value).toLocaleString('en-IN')}`;
}

export function initials(value: string) {
    return value.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

/** Converts numeric amount into Indian currency words for official vouchers and receipts. */
export function numberToIndianWords(num: number): string {
    if (!Number.isFinite(num) || num <= 0) return 'Zero Rupees Only';
    const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function convert(n: number): string {
        if (n === 0) return '';
        if (n < 20) return single[n] + ' ';
        if (n < 100) return tens[Math.floor(n / 10)] + ' ' + single[n % 10] + ' ';
        if (n < 1000) return convert(Math.floor(n / 100)) + 'Hundred ' + convert(n % 100);
        if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
        if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000);
        return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000);
    }
    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    let result = convert(whole).trim() + ' Rupees';
    if (fraction > 0) {
        result += ' and ' + convert(fraction).trim() + ' Paise';
    }
    return result + ' Only';
}

/** Formats a lengthy UUID or transaction reference into a clean readable string (e.g. DEP-ce2e8...50bec1) */
export function formatShortRef(ref?: string): string {
    if (!ref) return '—';
    if (ref.length <= 18) return ref;
    if (ref.startsWith('DEP-') || ref.startsWith('RCT-') || ref.startsWith('TXN-') || ref.startsWith('WDL-')) {
        const prefix = ref.slice(0, 4);
        const remainder = ref.slice(4);
        if (remainder.length > 12) {
            return `${prefix}${remainder.slice(0, 5)}...${remainder.slice(-5)}`;
        }
    }
    if (ref.includes('-') && ref.length > 20) {
        return `${ref.slice(0, 8)}...${ref.slice(-4)}`;
    }
    return ref;
}

/** Formats agent/cashier identifier to avoid raw UUID dumps */
export function formatAgentOrCashier(val?: string): string {
    if (!val) return 'Branch Staff';
    // If it's like "586fdf49-9d54-49a1-b5ed-ea410a716c0f"
    if (/^[0-9a-fA-F-]{20,}$/.test(val.trim())) {
        return `Staff (${val.slice(0, 8)})`;
    }
    // If it contains a UUID prefix/suffix like "Cash · 586fdf49-..."
    if (val.includes('-') && val.length > 25) {
        const parts = val.split('·').map((p) => p.trim());
        const modePart = parts[0];
        const idPart = parts[1];
        if (modePart && idPart && /^[0-9a-fA-F-]{20,}$/.test(idPart)) {
            return `${modePart} · Staff (${idPart.slice(0, 8)})`;
        }
    }
    return val;
}

