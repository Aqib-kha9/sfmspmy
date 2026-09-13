// Date maths shared by the RD, FD and loan workflows (backend parity).

// ---------------------------------------------------------------------------
// RD schedule maths - mirrors the backend so the form can derive term fields
// ahead of submit. Keeping the same rules means the previewed schedule always
// matches the one the server materialises when the account is opened.
// ---------------------------------------------------------------------------

/** Formats a local Date as `YYYY-MM-DD` (mirrors the backend date columns). */
export function toYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` string as a local date, or null when unusable. */
export function parseYmd(value: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Adds months, clamping the day to the target month (backend addMonths parity). */
export function addMonthsYmd(value: string, months: number): string {
    const base = parseYmd(value);
    if (!base) return '';
    const day = base.getDate();
    const target = new Date(base.getFullYear(), base.getMonth(), 1);
    target.setMonth(target.getMonth() + months);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));
    return toYmd(target);
}

/** Adds whole days to a `YYYY-MM-DD` string. */
export function addDaysYmd(value: string, days: number): string {
    const base = parseYmd(value);
    if (!base) return '';
    base.setDate(base.getDate() + days);
    return toYmd(base);
}

/** Whole months between two `YYYY-MM-DD` dates (backend term parity). */
export function monthsBetweenYmd(from: string, to: string): number {
    const start = parseYmd(from);
    const end = parseYmd(to);
    if (!start || !end) return 0;
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}
