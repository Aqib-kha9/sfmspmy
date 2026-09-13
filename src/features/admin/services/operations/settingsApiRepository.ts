import { apiClient } from '../../../../lib/api/apiClient';
import type {
    BranchListResult,
    BranchView,
    OrganisationView,
    SettingChangeInput,
    SettingHistoryListResult,
    SettingListResult,
    SettingView,
    UpdateBranchInput,
    UpdateOrganisationInput,
    UpdateSettingsResult,
} from '../../../../lib/api/types';
import { formatTimestamp, querySuffix } from './helpers';

/**
 * System settings adapter repository.
 *
 * Bridges the AdminPages System Settings workspace onto the backend settings
 * module (/api/v1/settings). The backend splits the surface into:
 *   - GET/PATCH /settings/organisation  (settings.read / settings.write)
 *   - GET/POST  /settings/branches, PATCH /settings/branches/:id
 *   - GET       /settings               (current app_setting rows)
 *   - PATCH     /settings               (bulk audited change history)
 *   - GET       /settings/history       (append-only change trail)
 *
 * The frontend form is a single operational draft, so `load()` composes the
 * organisation row, the primary branch and the app_setting rows into one
 * SettingsDraft, and `save()` fans the draft back out across the three
 * underlying resources. Fields without a matching app_setting key are simply
 * not persisted (the backend only accepts existing keys).
 */

export type SettingsDraft = {
    organizationName: string;
    registrationNumber: string;
    primaryPhone: string;
    alternatePhone: string;
    timezone: string;
    currency: string;
    fiscalYear: string;
    branchCode: string;
    branchName: string;
    address: string;
    approvalPolicy: string;
    collectionLimit: string;
    cashHoldingLimit: string;
    notificationChannels: string;
    retentionExceptionReference: string;
    auditOwner: string;
    defaultCollectionMode: 'Doorstep' | 'Branch' | 'Mixed';
    gracePeriodDays: string;
    requireGeoTag: boolean;
    allowOfflineCollection: boolean;
    receiptPrefix: string;
    nextReceiptNumber: string;
    receiptFooter: string;
    smsReceipts: boolean;
    emailStatements: boolean;
    overdueAlerts: boolean;
    notificationEmail: string;
    auditRetention: string;
    transactionRetention: string;
    autoArchive: boolean;
};

export type SettingsHistoryEntry = { id: string; label: string; at: string };

export interface SettingsRepository {
    load(): Promise<SettingsDraft>;
    save(draft: SettingsDraft): Promise<void>;
    history(): Promise<SettingsHistoryEntry[]>;
    /** Branches for backend-driven dropdowns (no hard-coded branch names). */
    branches(): Promise<BranchView[]>;
}

const emptyDraft: SettingsDraft = {
    organizationName: '', registrationNumber: '', primaryPhone: '', alternatePhone: '',
    timezone: 'Asia/Kolkata', currency: 'INR', fiscalYear: '', branchCode: '', branchName: '',
    address: '', approvalPolicy: '', collectionLimit: '', cashHoldingLimit: '',
    notificationChannels: '', retentionExceptionReference: '', auditOwner: '',
    defaultCollectionMode: 'Mixed', gracePeriodDays: '', requireGeoTag: false,
    allowOfflineCollection: false, receiptPrefix: '', nextReceiptNumber: '', receiptFooter: '',
    smsReceipts: false, emailStatements: false, overdueAlerts: false, notificationEmail: '',
    auditRetention: '', transactionRetention: '', autoArchive: false,
};

function stringOf(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return typeof value === 'string' ? value : fallback;
}

function booleanOf(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    return false;
}

function channelsOf(value: unknown): string {
    if (Array.isArray(value)) return value.map((entry) => stringOf(entry)).filter(Boolean).join(', ');
    return stringOf(value);
}

function settingValue(settings: Map<string, SettingView>, key: string): unknown {
    return settings.get(key)?.value;
}

/** The backend PATCH only accepts keys that already exist in app_setting. */
function settingKeyExists(settings: Map<string, SettingView>, key: string): boolean {
    return settings.has(key);
}

function fiscalYearLabel(startMonth: number): string {
    const now = new Date();
    const year = startMonth > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
    return `${year}-${year + 1}`;
}

/** Financial year labels start in April; the backend stores the month number. */
function monthOfFiscalYear(label: string): number | undefined {
    return /^(\d{4})/.test(label.trim()) ? 4 : undefined;
}

/** `security.max_login_attempts` -> `Max login attempts` for the history line. */
function humaniseKey(key: string): string {
    const tail = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key;
    const spaced = tail.replace(/_/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** `SMS, WhatsApp, email` -> `['sms', 'whatsapp', 'email']` backend tokens. */
function channelsArray(value: string): string[] {
    return value
        .split(',')
        .map((entry) => entry.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
        .filter(Boolean);
}

function toDraft(
    organisation: OrganisationView,
    branch: BranchView | undefined,
    settings: Map<string, SettingView>,
): SettingsDraft {
    const enabledChannels = channelsOf(settingValue(settings, 'notifications.enabled_channels'));
    const offlineHours = stringOf(settingValue(settings, 'offline.limit_hours'));
    return {
        ...emptyDraft,
        organizationName: organisation.displayName || organisation.legalName,
        registrationNumber: organisation.registrationNumber,
        primaryPhone: organisation.phone ?? '',
        timezone: organisation.timezone,
        currency: organisation.currency,
        fiscalYear: fiscalYearLabel(organisation.financialYearStartMonth),
        branchCode: branch?.code ?? '',
        branchName: branch?.name ?? '',
        address: organisation.legalAddress,
        collectionLimit: stringOf(settingValue(settings, 'withdrawals.high_value_limit')),
        cashHoldingLimit: stringOf(settingValue(settings, 'savings.min_balance')),
        notificationChannels: enabledChannels,
        requireGeoTag: true,
        allowOfflineCollection: Number(offlineHours) > 0,
        gracePeriodDays: offlineHours,
        smsReceipts: enabledChannels.toLowerCase().includes('sms'),
        emailStatements: enabledChannels.toLowerCase().includes('email'),
        notificationEmail: organisation.email ?? '',
        autoArchive: !booleanOf(settingValue(settings, 'numbering.allow_cancelled_reuse')),
    };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiSettingsRepository implements SettingsRepository {
    private async organisation(): Promise<OrganisationView> {
        return apiClient.request<OrganisationView>('/settings/organisation');
    }

    async branches(): Promise<BranchView[]> {
        const result = await apiClient.request<BranchListResult>(
            `/settings/branches${querySuffix({ pageSize: 100 })}`,
        );
        return result.items;
    }

    private async settings(): Promise<Map<string, SettingView>> {
        const result = await apiClient.request<SettingListResult>('/settings');
        return new Map(result.items.map((entry): [string, SettingView] => [entry.key, entry]));
    }

    async load(): Promise<SettingsDraft> {
        const [organisation, branches, settings] = await Promise.all([
            this.organisation(),
            this.branches().catch(() => [] as BranchView[]),
            this.settings(),
        ]);
        const primary = branches.find((branch) => branch.isActive) ?? branches[0];
        return toDraft(organisation, primary, settings);
    }

    async save(draft: SettingsDraft): Promise<void> {
        const [organisation, branches, settings] = await Promise.all([
            this.organisation(),
            this.branches().catch(() => [] as BranchView[]),
            this.settings(),
        ]);

        // 1. Organisation profile (identity and statement details).
        const organisationChanges: UpdateOrganisationInput = {};
        const displayName = draft.organizationName.trim();
        if (displayName && displayName !== organisation.displayName) {
            organisationChanges.displayName = displayName;
            organisationChanges.legalName = organisation.legalName || displayName;
        }
        const registrationNumber = draft.registrationNumber.trim();
        if (registrationNumber && registrationNumber !== organisation.registrationNumber) {
            organisationChanges.registrationNumber = registrationNumber;
        }
        const address = draft.address.trim();
        if (address && address !== organisation.legalAddress) {
            organisationChanges.legalAddress = address;
        }
        if (draft.timezone && draft.timezone !== organisation.timezone) {
            organisationChanges.timezone = draft.timezone;
        }
        if (draft.currency && draft.currency !== organisation.currency) {
            organisationChanges.currency = draft.currency;
        }
        if (draft.primaryPhone !== (organisation.phone ?? '')) {
            organisationChanges.phone = draft.primaryPhone.trim() || null;
        }
        if (draft.notificationEmail !== (organisation.email ?? '')) {
            organisationChanges.email = draft.notificationEmail.trim() || null;
        }
        const startMonth = monthOfFiscalYear(draft.fiscalYear);
        if (startMonth && startMonth !== organisation.financialYearStartMonth) {
            organisationChanges.financialYearStartMonth = startMonth;
        }
        if (Object.keys(organisationChanges).length > 0) {
            await apiClient.request<OrganisationView>('/settings/organisation', {
                method: 'PATCH',
                body: organisationChanges,
            });
        }

        // 2. Primary branch (code, name).
        const primary = branches.find((branch) => branch.isActive) ?? branches[0];
        if (primary) {
            const branchChanges: UpdateBranchInput = {};
            const branchCode = draft.branchCode.trim().toUpperCase();
            if (branchCode && branchCode !== primary.code) {
                branchChanges.code = branchCode;
            }
            if (draft.branchName.trim() && draft.branchName.trim() !== primary.name) {
                branchChanges.name = draft.branchName.trim();
            }
            if (Object.keys(branchChanges).length > 0) {
                await apiClient.request<BranchView>(`/settings/branches/${primary.id}`, {
                    method: 'PATCH',
                    body: branchChanges,
                });
            }
        }

        // 3. Application settings. The backend only accepts existing keys, so
        //    every candidate is filtered against the loaded catalogue first.
        const changes: SettingChangeInput[] = [];
        const candidate = (key: string, value: unknown): void => {
            const current = settingValue(settings, key);
            if (!settingKeyExists(settings, key)) return;
            if (JSON.stringify(current) === JSON.stringify(value)) return;
            changes.push({ key, value, reason: 'System Settings workspace update' });
        };
        candidate('withdrawals.high_value_limit', draft.collectionLimit.trim());
        candidate('savings.min_balance', draft.cashHoldingLimit.trim());
        candidate('notifications.enabled_channels', channelsArray(draft.notificationChannels));
        const offlineHours = Number(draft.gracePeriodDays);
        if (draft.gracePeriodDays.trim() && !Number.isNaN(offlineHours)) {
            candidate('offline.limit_hours', offlineHours);
        }
        candidate('numbering.allow_cancelled_reuse', !draft.autoArchive);
        if (changes.length > 0) {
            await apiClient.request<UpdateSettingsResult>('/settings', {
                method: 'PATCH',
                body: { changes },
            });
        }
    }

    async history(): Promise<SettingsHistoryEntry[]> {
        const result = await apiClient.request<SettingHistoryListResult>(
            `/settings/history${querySuffix({ pageSize: 20 })}`,
        );
        return result.items.map((entry) => ({
            id: entry.id,
            label: `${entry.changedByName ?? 'Staff'} · ${humaniseKey(entry.settingKey)}`,
            at: formatTimestamp(entry.createdAt),
        }));
    }
}

export const settingsRepository: SettingsRepository = new ApiSettingsRepository();