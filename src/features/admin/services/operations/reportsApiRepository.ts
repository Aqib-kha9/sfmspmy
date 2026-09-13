import { apiClient } from '../../../../lib/api/apiClient';
import { downloadBinary, formatTimestamp } from './helpers';

/**
 * Reports adapter repository.
 *
 * Bridges the backend /api/v1/reports surface (docs/backend-master-spec.md §17)
 * onto the display shapes the AdminPages reports UI expects:
 *
 *  - GET  /reports                    -> catalogue (active, permission-filtered)
 *  - POST /reports/:type/generate     -> render + store a PDF (201)
 *  - GET  /reports/:id/download       -> stream the stored PDF (reports.export)
 *  - POST /reports/:id/share          -> record-only share (M.D. only)
 *  - GET  /reports/customers/:id/statements -> savings statement
 *  - GET  /reports/statements/:customerId   -> alias of the route above
 *
 * The catalogue `name` field is the display title; the backend does not expose
 * a per-report category, so the UI category is derived from the report's type
 * family and the required permissions.
 */

export interface ReportCatalogueView {
    id: string;
    reportType: string;
    name: string;
    description: string | null;
    availableFilters: string[];
    requiredPermissions: string[];
    dateBasis: string[];
}

export interface ReportGenerationView {
    id: string;
    definitionId: string;
    reportType: string;
    filename: string;
    fileSizeBytes: number;
    generatedAt: string;
}

export interface ReportShareView {
    id: string;
    reportId: string;
    recipient: string;
    channel: 'email' | 'whatsapp' | 'sms';
    sharedAt: string;
}

type ReportCategory = 'Operations' | 'Finance' | 'Compliance';

export type ReportRecord = {
    id: string;
    /** Backend report_type used in the /:type/generate path. */
    reportType: string;
    name: string;
    category: ReportCategory;
    scope: string;
    output: string;
    description: string;
    lastGenerated: string;
    generatedBy: string;
    /** Backend uuid of a generated report, when one has been produced this session. */
    generatedId?: string;
    filename?: string;
    branch?: string;
    agent?: string;
    customerOrAccountScope?: string;
    fiscalYear?: string;
    timezone?: string;
    granularity?: string;
    statusFilter?: string;
    inclusionOptions?: string;
    deliveryDestination?: string;
    reportLabel?: string;
    statementType?: string;
    exportReference?: string;
    correlationReference?: string;
};

export type ReportGenerateInput = {
    report: ReportRecord;
    fromDate?: string;
    toDate?: string;
    branch?: string;
    agent?: string;
    customerOrAccountScope?: string;
    fiscalYear?: string;
    timezone?: string;
    granularity?: string;
    statusFilter?: string;
    inclusionOptions?: string;
    deliveryDestination?: string;
    reportLabel?: string;
    statementType?: string;
    correlationReference?: string;
};

export interface ReportsRepository {
    list(): Promise<ReportRecord[]>;
    generate(input: ReportGenerateInput): Promise<ReportRecord>;
    download(reportId: string, filename: string): Promise<void>;
    share(reportId: string, input: { recipient: string; channel: 'email' | 'whatsapp' | 'sms'; note?: string }): Promise<void>;
}

/** Report-type -> UI category, derived from the seeded catalogue families. */
const CATEGORY_BY_TYPE: Record<string, ReportCategory> = {
    daily_collection_register: 'Operations',
    agent_performance_report: 'Operations',
    day_close_summary: 'Operations',
    savings_transaction_register: 'Finance',
    customer_statement: 'Finance',
    loan_outstanding_report: 'Finance',
    overdue_loan_report: 'Finance',
    interest_posting_register: 'Finance',
    weekly_loan_collection_register: 'Finance',
    dispute_register: 'Compliance',
    audit_event_report: 'Compliance',
    yearly_authority_report: 'Compliance',
};

/** Short human scope derived from the report family. */
function scopeOf(reportType: string): string {
    if (reportType.includes('collection')) return 'Collections and agents';
    if (reportType.includes('savings') || reportType.includes('transaction')) return 'Savings and deposit accounts';
    if (reportType.includes('loan')) return 'Loans and repayments';
    if (reportType.includes('statement')) return 'Customer accounts';
    if (reportType.includes('day_close')) return 'Reconciliation';
    if (reportType.includes('agent')) return 'Collection agents';
    if (reportType.includes('interest')) return 'Interest postings';
    if (reportType.includes('audit') || reportType.includes('dispute')) return 'Audit and compliance';
    return 'Operational records';
}

/** Short output summary derived from the available filters. */
function outputOf(view: ReportCatalogueView): string {
    if (view.availableFilters.length === 0) return 'Summary position and regulatory totals';
    return `Filterable by ${view.availableFilters.map((filter) => filter.replace(/_/g, ' ')).join(', ')}`;
}

function toRecord(view: ReportCatalogueView): ReportRecord {
    return {
        id: view.id,
        reportType: view.reportType,
        name: view.name,
        category: CATEGORY_BY_TYPE[view.reportType] ?? 'Compliance',
        scope: scopeOf(view.reportType),
        output: outputOf(view),
        description: view.description ?? 'Report generated from live cooperative data.',
        lastGenerated: 'Not generated',
        generatedBy: '—',
    };
}

export class ApiReportsRepository implements ReportsRepository {
    async list(): Promise<ReportRecord[]> {
        const result = await apiClient.request<{ items: ReportCatalogueView[]; total: number }>('/reports');
        return result.items.map(toRecord);
    }

    async generate(input: ReportGenerateInput): Promise<ReportRecord> {
        const filters: Record<string, unknown> = {};
        if (input.report.reportType === 'daily_collection_register' && input.agent) filters.agent_id = input.agent;
        if (input.statusFilter) filters.status = input.statusFilter;
        if (input.branch) filters.branch_id = input.branch;

        const result = await apiClient.request<ReportGenerationView>(`/reports/${input.report.reportType}/generate`, {
            method: 'POST',
            body: {
                fromDate: input.fromDate,
                toDate: input.toDate,
                filters: Object.keys(filters).length > 0 ? filters : undefined,
            },
        });
        return {
            ...input.report,
            generatedId: result.id,
            filename: result.filename,
            exportReference: result.filename,
            lastGenerated: formatTimestamp(result.generatedAt),
            generatedBy: 'You',
            branch: input.branch,
            agent: input.agent,
            customerOrAccountScope: input.customerOrAccountScope,
            fiscalYear: input.fiscalYear,
            timezone: input.timezone,
            granularity: input.granularity,
            statusFilter: input.statusFilter,
            inclusionOptions: input.inclusionOptions,
            deliveryDestination: input.deliveryDestination,
            reportLabel: input.reportLabel,
            statementType: input.statementType,
            correlationReference: input.correlationReference,
        };
    }

    async download(reportId: string, filename: string): Promise<void> {
        await downloadBinary(`/reports/${reportId}/download`, filename);
    }

    async share(reportId: string, input: { recipient: string; channel: 'email' | 'whatsapp' | 'sms'; note?: string }): Promise<void> {
        await apiClient.request<ReportShareView>(`/reports/${reportId}/share`, {
            method: 'POST',
            body: input,
        });
    }
}

export const reportsRepository: ReportsRepository = new ApiReportsRepository();
