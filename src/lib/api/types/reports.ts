// API contracts: Reports (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportShareChannel = 'email' | 'whatsapp' | 'sms';

export type StatementProductType =
    | 'savingsDeposit'
    | 'recurringDeposit'
    | 'fixedDeposit'
    | 'loan';

export type ReportTypeParam = {
    type: string;
};

export interface ReportDefinitionView {
    id: string;
    reportType: string;
    title: string;
    category: string;
    description: string;
    availableFilters: string[];
    requiresBranch: boolean;
    createdAt: string;
}

export interface ReportCatalogueResult {
    items: ReportDefinitionView[];
    total: number;
}

export interface ReportGenerationResult {
    id: string;
    definitionId: string;
    reportType: string;
    title: string;
    fromDate: string;
    toDate: string;
    generatedBy: string;
    generatedByName: string | null;
    rowCount: number;
    createdAt: string;
}

export interface ReportDownloadResult {
    id: string;
    reportType: string;
    title: string;
    rowCount: number;
    format: string;
    filename: string;
    content: string;
    generatedAt: string;
}

export interface ReportShareRecord {
    id: string;
    recipient: string;
    channel: ReportShareChannel;
    sharedBy: string;
    sharedByName: string | null;
    note: string | null;
    sharedAt: string;
}

export interface ReportShareResult {
    reportId: string;
    shares: ReportShareRecord[];
}

export type GenerateReportInput = {
    fromDate?: string;
    toDate?: string;
    filters?: Record<string, unknown>;
};

export type ShareReportInput = {
    recipient: string;
    channel: ReportShareChannel;
    note?: string;
};

export interface CustomerStatementCustomer {
    id: string;
    fullName: string;
    customerCode: string;
}

export interface CustomerStatementAccount {
    id: string;
    accountNumber: string;
    productType: 'savingsDeposit';
    status: string;
    currentBalance: string;
}

export interface CustomerStatementEntry {
    date: string;
    productType: 'savingsDeposit';
    accountId: string;
    description: string;
    debit?: string;
    credit?: string;
    balance: string;
    correctionNote?: string;
    reversalOf?: string;
}

export interface CustomerStatementPeriod {
    from: string;
    to: string;
}

export interface CustomerStatementView {
    customer: CustomerStatementCustomer;
    accounts: CustomerStatementAccount[];
    period: CustomerStatementPeriod;
    entries: CustomerStatementEntry[];
    openingBalance: string;
    closingBalance: string;
}

export type CustomerStatementQuery = {
    fromDate?: string;
    toDate?: string;
    accountId?: string;
    productType?: StatementProductType;
};
