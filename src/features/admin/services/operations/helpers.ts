import { apiClient } from '../../../../lib/api/apiClient';
import { ApiError } from '../../../../lib/api/client';
import { getStoredProfile } from '../../../auth/auth.service';

/**
 * Shared helpers for the admin operations repositories.
 *
 * Every module in this folder follows the same contract as the customer
 * registry adapter (customerApiRepository.ts): it talks to the live
 * /api/v1 surface via the shared `apiClient` singleton, maps backend views onto
 * the display shapes the AdminPages UI expects, and reports user-facing
 * messages through `messageFor`.
 */

/** Extracts a user-facing message from an API failure. */
export function messageFor(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return error.message;
    return fallback;
}

/** Resolves the acting staff member's branch id for create calls. */
export function branchId(): string {
    const profile = getStoredProfile();
    if (!profile?.branchId) {
        throw new Error('Your session has no branch assignment. Sign in again before performing this action.');
    }
    return profile.branchId;
}

/** True when the stored profile carries the given role. */
export function hasRole(role: string): boolean {
    const profile = getStoredProfile();
    return profile?.role.toLowerCase() === role.toLowerCase();
}

/** Builds a query suffix from a record of optional string filters. */
export function querySuffix(filters: Record<string, string | number | boolean | null | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined || value === '') continue;
        params.set(key, String(value));
    }
    const suffix = params.toString();
    return suffix ? `?${suffix}` : '';
}

/**
 * Fetches a binary resource (report PDF export) and returns it as a Blob so
 * the caller can trigger a browser download without leaving the SPA.
 */
export async function downloadBinary(path: string, filename: string): Promise<void> {
    const blob = await apiClient.request<Blob>(path, { raw: true });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/** Formats an ISO timestamp as "DD Mon YYYY · HH:MM AM" for list rows. */
export function formatTimestamp(iso: string | null | undefined, fallback = 'Not recorded'): string {
    if (!iso) return fallback;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

/** Formats an ISO timestamp as "DD Mon YYYY". */
export function formatDate(iso: string | null | undefined, fallback = 'Not recorded'): string {
    if (!iso) return fallback;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Formats a paise-free backend amount string as INR with lakh separators. */
export function formatAmount(value: string | number | null | undefined, fallback = '₹0'): string {
    if (value === null || value === undefined || value === '') return fallback;
    const number = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(number)) return fallback;
    return `₹${number.toLocaleString('en-IN', { minimumFractionDigits: number % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}
