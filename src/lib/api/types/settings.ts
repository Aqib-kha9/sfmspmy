// API contracts: Organisation & settings (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Organisation & settings (backend/src/modules/settings/settings.service.ts)
// ---------------------------------------------------------------------------

export interface OrganisationView {
    id: string;
    legalName: string;
    displayName: string;
    registrationNumber: string;
    legalAddress: string;
    phone: string | null;
    email: string | null;
    timezone: string;
    currency: string;
    locale: string;
    financialYearStartMonth: number;
    workingDays: string[];
    operatingHours: string;
    createdAt: string;
    updatedAt: string;
}

export type WorkingDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type UpdateOrganisationInput = {
    legalName?: string;
    displayName?: string;
    registrationNumber?: string;
    legalAddress?: string;
    phone?: string | null;
    email?: string | null;
    timezone?: string;
    currency?: string;
    locale?: string;
    financialYearStartMonth?: number;
    workingDays?: WorkingDay[];
    operatingHours?: string;
};

export interface BranchView {
    id: string;
    organisationId: string;
    code: string;
    name: string;
    address: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BranchListResult {
    items: BranchView[];
    total: number;
    page: number;
    pageSize: number;
}

export type CreateBranchInput = {
    code: string;
    name: string;
    address: string;
    phone?: string | null;
    isActive?: boolean;
};

export type UpdateBranchInput = {
    code?: string;
    name?: string;
    address?: string;
    phone?: string | null;
    isActive?: boolean;
};

export type ListBranchesQuery = {
    isActive?: 'true' | 'false';
    page?: number;
    pageSize?: number;
};

export interface HolidayView {
    id: string;
    holidayDate: string;
    occasion: string;
    calendarYear: number;
    isGovernment: boolean;
    createdAt: string;
}

export interface HolidayListResult {
    items: HolidayView[];
    total: number;
    page: number;
    pageSize: number;
}

export type CreateHolidayInput = {
    holidayDate: string;
    occasion: string;
    isGovernment?: boolean;
    calendarYear?: number;
};

export type ListHolidaysQuery = {
    year?: number;
    page?: number;
    pageSize?: number;
};

export interface SettingView {
    key: string;
    value: unknown;
    category: string;
    description: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SettingListResult {
    items: SettingView[];
    total: number;
}

export interface SettingChangeResult {
    key: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface UpdateSettingsResult {
    changes: SettingChangeResult[];
    historyIds: string[];
}

export type SettingChangeInput = {
    key: string;
    value: unknown;
    reason?: string;
};

export type UpdateSettingsInput = {
    changes: SettingChangeInput[];
};

export type ListSettingsQuery = {
    category?: string;
};

export interface SettingHistoryEntryView {
    id: string;
    settingKey: string;
    oldValue: unknown;
    newValue: unknown;
    changedBy: string | null;
    changedByName: string | null;
    reason: string | null;
    createdAt: string;
}

export interface SettingHistoryListResult {
    items: SettingHistoryEntryView[];
    total: number;
    page: number;
    pageSize: number;
}

export type ListSettingHistoryQuery = {
    settingKey?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};
