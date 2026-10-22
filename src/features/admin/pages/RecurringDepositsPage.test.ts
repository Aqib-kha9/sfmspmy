import { describe, it, expect } from 'vitest';
import {
    firstRdDueDate,
    getExpectedInstallmentCount,
    nextRdDueDate,
    rdInstalmentDates,
    RD_SLAB_TENURES,
    RD_SLAB_MATRIX,
    calculateRdMaturity,
    deriveRdMaturityDate,
} from './RecurringDepositsPage';

describe('RD Installment Calculation & Scheduling Suite', () => {
    it('calculates exactly 12 installments for 12 months tenure', () => {
        const count = getExpectedInstallmentCount('Monthly', 12);
        expect(count).toBe(12);

        // When first due date is next month (2026-10-16) and maturity is 2027-10-16
        const dates1 = rdInstalmentDates('2026-10-16', '2027-10-16', 'Monthly', count);
        expect(dates1.length).toBe(12);
        expect(dates1[0]).toBe('2026-10-16');
        expect(dates1[dates1.length - 1]).toBe('2027-09-16');

        // When first due date is opening day (2026-09-16) and maturity is 2027-09-16
        const dates2 = rdInstalmentDates('2026-09-16', '2027-09-16', 'Monthly', count);
        expect(dates2.length).toBe(12);
        expect(dates2[0]).toBe('2026-09-16');
        expect(dates2[dates2.length - 1]).toBe('2027-08-16');
    });

    it('never schedules an installment on the maturity date itself (no 13th phantom installment)', () => {
        const dates = rdInstalmentDates('2026-10-16', '2027-10-16', 'Monthly');
        expect(dates.length).toBe(12);
        expect(dates).not.toContain('2027-10-16');
    });

    it('generates exact installment count across all official client rate card tenures', () => {
        for (const tenure of RD_SLAB_TENURES) {
            const count = getExpectedInstallmentCount('Monthly', tenure);
            expect(count).toBe(tenure);

            // Mock first due date: 2026-10-16
            // Maturity date: 2026-10-16 + tenure months
            const firstDate = new Date(2026, 9, 16);
            const maturityDateObj = new Date(2026, 9 + tenure, 16);
            const maturityDateStr = `${maturityDateObj.getFullYear()}-${String(maturityDateObj.getMonth() + 1).padStart(2, '0')}-16`;

            const dates = rdInstalmentDates('2026-10-16', maturityDateStr, 'Monthly', count);
            expect(dates.length).toBe(tenure);
            expect(dates).not.toContain(maturityDateStr);
        }
    });

    it('calculates correct official rate card projection matching Marathi chart', () => {
        // ₹1,000/mo for 12 months = ₹12,000 deposit, ₹12,780 payout
        const payout = calculateRdMaturity(1000, 12);
        expect(payout).toBe(12780);

        const totalDeposit = 1000 * 12;
        expect(totalDeposit).toBe(12000);

        const interest = (payout ?? 0) - totalDeposit;
        expect(interest).toBe(780);
    });

    it('correctly derives first due date without pushing to next month if opening day matches due day', () => {
        // Opened on 16th, due day 16 -> first due is 2026-09-16
        expect(firstRdDueDate('2026-09-16', '16')).toBe('2026-09-16');

        // Opened on 16th, due day 20 -> first due is 2026-09-20
        expect(firstRdDueDate('2026-09-16', '20')).toBe('2026-09-20');

        // Opened on 16th, due day 10 -> past this month, advances to 2026-10-10
        expect(firstRdDueDate('2026-09-16', '10')).toBe('2026-10-10');

        // Daily RD due date is opening date
        expect(firstRdDueDate('2026-09-16', 'Daily')).toBe('2026-09-16');
        expect(firstRdDueDate('2026-09-16', 'daily')).toBe('2026-09-16');
    });

    it('correctly handles Daily RD 180 installments', () => {
        const count = getExpectedInstallmentCount('Daily', 6);
        expect(count).toBe(180);
    });

    it('derives maturity date with 2 banking transaction buffer days (+2 days)', () => {
        // First due: 2026-10-10, 12 months term -> 2027-10-10 + 2 days = 2027-10-12
        const maturity = deriveRdMaturityDate('2026-10-10', 12);
        expect(maturity).toBe('2027-10-12');

        // First due: 2026-03-15, 24 months term -> 2028-03-15 + 2 days = 2028-03-17
        const maturity2 = deriveRdMaturityDate('2026-03-15', 24);
        expect(maturity2).toBe('2028-03-17');
    });
});
