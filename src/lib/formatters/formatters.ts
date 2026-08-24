export function formatCurrency(value: number) {
    return `₹${value.toLocaleString('en-IN')}`;
}

export function initials(value: string) {
    return value.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
