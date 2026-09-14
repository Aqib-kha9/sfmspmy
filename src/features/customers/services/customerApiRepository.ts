import { apiClient } from '../../../lib/api/apiClient';
import { ApiError } from '../../../lib/api/client';
import type {
    CreateCustomerInput,
    CustomerDetailView,
    CustomerListResult,
    CustomerStatementQuery,
    CustomerStatementView,
    CustomerStatus,
    CustomerView,
    UpdateCustomerInput,
} from '../../../lib/api/types';
import { getStoredProfile } from '../../auth/auth.service';
import { agentsRepository } from '../../admin/services/operations/agentsApiRepository';
import { settingsRepository } from '../../admin/services/operations/settingsApiRepository';
import type { Customer, CustomerInput, CustomerService, CustomerTransaction, Status } from '../types/customer.types';
import type {
    CustomerOption,
    CustomerPage,
    CustomerQuery,
    CustomerRepository,
    CustomerStats,
} from './customerRepository';

/**
 * API-backed customer registry repository.
 *
 * The admin UI was originally authored against a bespoke, display-oriented
 * `Customer` shape (Title-case statuses, pre-formatted currency, embedded
 * services/transactions). The backend serves a normalised `CustomerView`
 * (lowercase statuses, raw fields, no financial roll-up). This adapter bridges
 * the two so the existing pages/components stay unchanged while every read and
 * write now hits the live `/api/v1/customers` surface.
 */

// ---------------------------------------------------------------------------
// Enum bridges
// ---------------------------------------------------------------------------

/** Backend (lowercase) status -> admin UI (Title-case) status. */
const STATUS_FROM_API: Record<CustomerStatus, Status> = {
    active: 'Active',
    inactive: 'Inactive',
    blocked: 'Review',
    deceased: 'Inactive',
    transferred: 'Inactive',
    closed: 'Inactive',
    restricted: 'Review',
    deleted: 'Inactive',
};

/**
 * Admin UI status filter -> backend status filter.
 * `Pending`/`Review` have no backend counterpart in the current vocabulary, so
 * they are left unfiltered server-side and narrowed client-side by the page.
 */
const STATUS_TO_API: Partial<Record<Status, CustomerStatus>> = {
    Active: 'active',
    Inactive: 'inactive',
    Review: 'restricted',
};

/** Admin identity-document label -> backend document type enum. */
const DOCUMENT_TYPE_TO_API: Record<string, 'aadhaar' | 'pan' | 'electricity_bill'> = {
    Aadhaar: 'aadhaar',
    PAN: 'pan',
    'Electricity bill': 'electricity_bill',
};

const DOCUMENT_TYPE_FROM_API: Record<string, string> = {
    aadhaar: 'Aadhaar',
    pan: 'PAN',
    electricity_bill: 'Electricity bill',
};

const ADDRESS_TYPE_FROM_API: Record<string, 'Current / registered' | 'Permanent'> = {
    current: 'Current / registered',
    permanent: 'Permanent',
};

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const text = (value: string | null | undefined, fallback = ''): string => value ?? fallback;

/**
 * Normalises an identity-document number before it goes on the wire.
 *
 * The same Aadhaar typed as `1234 5678 9012` and `123456789012` identifies one
 * person, so separators are stripped and the value is upper-cased. The backend
 * applies the identical rule, and migration 005 enforces it in the database, so
 * all three layers agree on what counts as the same document.
 */
const normalizeDocumentNumber = (value: string): string => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** Joins an address view into the single-line string the UI expects. */
function formatAddress(address: {
    line1: string;
    line2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    landmark: string | null;
}): string {
    return [address.line1, address.line2, address.landmark, address.city, address.district, address.state, address.pincode]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(', ');
}

/** Formats a raw ISO timestamp as the compact `YYYY-MM-DD` display value. */
function shortDate(value: string | null): string {
    return value ? value.slice(0, 10) : '';
}

/**
 * Maps the backend's derived service rows onto the UI service shape.
 *
 * The API resolves account type, number, balance, status label and opening
 * detail from the live savings/RD/FD/loan tables, so nothing is synthesised
 * on the client.
 */
function toServices(detail: CustomerDetailView): CustomerService[] {
    return detail.services.map((service) => ({
        id: service.id,
        type: service.type,
        accountNumber: service.accountNumber,
        label: service.label,
        amount: service.amount,
        detail: service.detail,
        status: service.status,
    }));
}

/** Maps the backend's derived transaction rows onto the UI transaction shape. */
function toTransactions(detail: CustomerDetailView): CustomerTransaction[] {
    return detail.transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        date: shortDate(transaction.date),
        agent: transaction.agent,
        reference: transaction.reference,
        status: transaction.status,
    }));
}

/**
 * Maps a backend `CustomerView` onto the UI `Customer` shape.
 *
 * `view` carries the core identity fields; `detail` (when present) adds the
 * addresses, KYC, nominee, consents and the backend-derived financial roll-up.
 * No display value is invented here — absent data is left blank so the UI can
 * render its own "not recorded" affordance.
 */
function toCustomer(view: CustomerView, detail?: CustomerDetailView): Customer {
    const current = detail?.addresses.find((address) => address.addressType === 'current') ?? detail?.addresses[0];
    const permanent = detail?.addresses.find((address) => address.addressType === 'permanent');
    const panDocument = detail?.identityDocuments.find((d) => d.documentType === 'pan');
    const document = detail?.identityDocuments.find((d) => d.documentType !== 'pan') ?? detail?.identityDocuments[0];
    const nominee = detail?.nominee ?? null;
    const kyc = detail?.kyc ?? null;
    const consentCaptured = detail?.consents.some((consent) => consent.granted) ?? false;

    return {
        id: view.customerNumber ?? view.id,
        systemId: view.id,
        name: view.fullName,
        phone: view.mobile,
        email: text(view.email),
        alternatePhone: text(view.alternatePhone),
        value: detail ? detail.totalValue : '',
        accountSummary: detail ? detail.accountSummary : '',
        status: STATUS_FROM_API[view.status] ?? 'Inactive',
        address: current ? formatAddress(current) : '',
        permanentAddress: permanent ? formatAddress(permanent) : '',
        customerType: view.customerType,
        dateOfBirth: text(view.dateOfBirth),
        gender: text(view.gender),
        occupation: text(view.occupation),
        businessType: text(view.businessType),
        taxIdentifier: panDocument ? panDocument.documentNumber : '',
        identityType: document && document.documentType !== 'pan' ? DOCUMENT_TYPE_FROM_API[document.documentType] ?? document.documentType : 'Aadhaar',
        identityReference: document && document.documentType !== 'pan' ? document.documentNumber : '',
        kycMethod: text(kyc?.method ?? view.kycMethod),
        kycVerifiedOn: kyc?.verifiedOn ? kyc.verifiedOn.slice(0, 10) : '',
        amlRiskCategory: text(view.amlRisk ?? view.riskCategory),
        sourceOfFunds: text(view.sourceOfFunds),
        communicationPreference: consentCaptured ? 'Consent captured' : '',
        branch: text(view.branchName),
        nomineeName: nominee?.name ?? '',
        nomineePhone: text(nominee?.phone),
        nomineeRelation: nominee?.relationship ?? '',
        guardianName: text(view.guardianName),
        guardianPhone: text(view.guardianPhone),
        assignedAgent: detail?.assignedAgent ?? '',
        consentCaptured,
        documentReferences: detail?.identityDocuments.map((item) => `${DOCUMENT_TYPE_FROM_API[item.documentType] ?? item.documentType} ${item.documentNumber}`).join(', ') ?? '',
        registrationDate: view.registrationDate.slice(0, 10),
        services: detail ? toServices(detail) : [],
        transactions: detail ? toTransactions(detail) : [],
    };
}

/** Maps the UI `CustomerInput` onto the backend create payload. */
function toCreatePayload(input: CustomerInput, branchId: string): CreateCustomerInput {
    // Only include keys that carry a value: the backend address schema marks
    // city/district/state/pincode as optional strings, so an explicit `null`
    // fails Zod validation (400 VALIDATION_ERROR). Omitting them is accepted.
    const addresses: CreateCustomerInput['addresses'] = [
        {
            addressType: 'current',
            line1: input.address.trim(),
        },
    ];
    if (input.permanentAddress.trim()) {
        addresses.push({ addressType: 'permanent', line1: input.permanentAddress.trim() });
    }

    const documentType = DOCUMENT_TYPE_TO_API[input.identityType];
    const identityDocuments = [];
    if (documentType && input.identityReference.trim()) {
        identityDocuments.push({ documentType, documentNumber: normalizeDocumentNumber(input.identityReference) });
    }
    if (input.taxIdentifier.trim()) {
        const pan = normalizeDocumentNumber(input.taxIdentifier);
        if (!(documentType === 'pan' && normalizeDocumentNumber(input.identityReference) === pan)) {
            identityDocuments.push({ documentType: 'pan' as const, documentNumber: pan });
        }
    }
    const payload: CreateCustomerInput = {
        fullName: input.name.trim(),
        mobile: input.phone.trim(),
        branchId,
        addresses,
    };
    if (identityDocuments.length > 0) {
        payload.identityDocuments = identityDocuments;
    }
    if (input.customerType) payload.customerType = input.customerType;
    if (input.email.trim()) payload.email = input.email.trim();
    if (input.alternatePhone.trim()) payload.alternatePhone = input.alternatePhone.trim();
    if (input.dateOfBirth) payload.dateOfBirth = input.dateOfBirth;
    if (input.gender.trim()) payload.gender = input.gender.trim();
    if (input.occupation.trim()) payload.occupation = input.occupation.trim();
    if (input.businessType.trim()) payload.businessType = input.businessType.trim();
    if (input.amlRiskCategory.trim()) payload.amlRisk = input.amlRiskCategory.trim();
    if (input.sourceOfFunds.trim()) payload.sourceOfFunds = input.sourceOfFunds.trim();
    if (input.guardianName.trim()) payload.guardianName = input.guardianName.trim();
    if (input.guardianPhone.trim()) payload.guardianPhone = input.guardianPhone.trim();
    if (input.kycMethod.trim()) payload.kycMethod = input.kycMethod.trim();
    return payload;
}

/** Maps the UI `CustomerInput` onto the backend update payload. */
function toUpdatePayload(input: CustomerInput): UpdateCustomerInput {
    const payload: UpdateCustomerInput = {};
    if (input.name.trim()) payload.fullName = input.name.trim();
    if (input.phone.trim()) payload.mobile = input.phone.trim();
    if (input.customerType) payload.customerType = input.customerType;
    if (input.email.trim()) payload.email = input.email.trim();
    if (input.alternatePhone.trim()) payload.alternatePhone = input.alternatePhone.trim();
    if (input.dateOfBirth) payload.dateOfBirth = input.dateOfBirth;
    if (input.gender.trim()) payload.gender = input.gender.trim();
    if (input.occupation.trim()) payload.occupation = input.occupation.trim();
    if (input.businessType.trim()) payload.businessType = input.businessType.trim();
    if (input.amlRiskCategory.trim()) payload.amlRisk = input.amlRiskCategory.trim();
    if (input.sourceOfFunds.trim()) payload.sourceOfFunds = input.sourceOfFunds.trim();
    if (input.guardianName.trim()) payload.guardianName = input.guardianName.trim();
    if (input.guardianPhone.trim()) payload.guardianPhone = input.guardianPhone.trim();
    if (input.kycMethod.trim()) payload.kycMethod = input.kycMethod.trim();
    // Send the identity document when one is present so the server can enforce
    // the active-customer uniqueness rule on edit (it excludes this customer's
    // own row, so resubmitting the unchanged document is always accepted).
    const documentType = DOCUMENT_TYPE_TO_API[input.identityType];
    const identityDocuments = [];
    if (documentType && input.identityReference.trim()) {
        identityDocuments.push({ documentType, documentNumber: normalizeDocumentNumber(input.identityReference) });
    }
    if (input.taxIdentifier.trim()) {
        const pan = normalizeDocumentNumber(input.taxIdentifier);
        if (!(documentType === 'pan' && normalizeDocumentNumber(input.identityReference) === pan)) {
            identityDocuments.push({ documentType: 'pan' as const, documentNumber: pan });
        }
    }
    if (identityDocuments.length > 0) {
        payload.identityDocuments = identityDocuments;
    }
    const addresses = [];
    if (input.address.trim()) {
        addresses.push({ addressType: 'current' as const, line1: input.address.trim() });
    }
    if (input.permanentAddress.trim()) {
        addresses.push({ addressType: 'permanent' as const, line1: input.permanentAddress.trim() });
    }
    if (addresses.length > 0) {
        payload.addresses = addresses;
    }
    return payload;
}

/** Extracts a user-facing message from an API failure. */
function messageFor(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return error.message;
    return fallback;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiCustomerRepository implements CustomerRepository {
    /** Resolves the acting staff member's branch for create calls. */
    private branchId(): string {
        const profile = getStoredProfile();
        if (!profile?.branchId) {
            throw new Error('Your session has no branch assignment. Sign in again before registering customers.');
        }
        return profile.branchId;
    }

    /** Resolves the raw customer UUID from the display id shown in the UI. */
    private async resolveCustomerId(displayId: string): Promise<string> {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(displayId)) return displayId;
        const result = await apiClient.request<CustomerListResult>(`/customers?search=${encodeURIComponent(displayId)}&limit=1`);
        const match = result.items[0];
        if (!match) throw new Error('Customer record was not found.');
        return match.id;
    }

    /**
     * Translates a UI query into validated backend query params.
     *
     * Only populated filters are forwarded; `limit` is clamped to the backend
     * maximum (100) and `offset` is never negative, so a malformed caller can
     * never trigger a 400 from the schema.
     */
    private buildParams(query: CustomerQuery): URLSearchParams {
        const params = new URLSearchParams();
        if (query.search?.trim()) params.set('search', query.search.trim());
        const apiStatus = query.status && query.status !== 'All' ? STATUS_TO_API[query.status] : undefined;
        if (apiStatus) params.set('status', apiStatus);
        // Scope results to a single collection agent's active assignments.
        if (query.agentId?.trim()) params.set('agentId', query.agentId.trim());
        if (query.membershipCategory && query.membershipCategory !== 'All') params.set('membershipCategory', query.membershipCategory);
        if (query.customerType && query.customerType !== 'All') params.set('type', query.customerType);
        if (query.customerId?.trim()) params.set('customerId', query.customerId.trim());
        if (query.registeredFrom) params.set('registeredFrom', query.registeredFrom);
        if (query.registeredTo) params.set('registeredTo', query.registeredTo);
        params.set('limit', String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
        params.set('offset', String(Math.max(query.offset ?? 0, 0)));
        return params;
    }

    /**
     * Enriches a page of list rows with their full detail view (addresses, KYC,
     * nominee, consents, services, transactions) so the detail modal renders a
     * complete record. Bounded to the current page so this stays O(page size).
     */
    private async enrich(views: CustomerView[]): Promise<Customer[]> {
        return Promise.all(
            views.map(async (view) => {
                try {
                    const detail = await apiClient.request<CustomerDetailView>(`/customers/${view.id}`);
                    return toCustomer(detail, detail);
                } catch {
                    return toCustomer(view);
                }
            }),
        );
    }

    /**
     * Server-driven, paginated + filtered customer list for the registry page.
     *
     * The list endpoint returns the core `CustomerView` per row; each row is then
     * enriched with its detail view so the backend-derived services,
     * transactions, assigned agent and financial roll-up are present without any
     * client-side invention.
     */
    async listPage(query: CustomerQuery = {}): Promise<CustomerPage> {
        const params = this.buildParams(query);
        let result: CustomerListResult;
        try {
            result = await apiClient.request<CustomerListResult>(`/customers?${params.toString()}`);
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to load customer records.'));
        }
        const items = await this.enrich(result.items);
        return { total: result.total, items };
    }

    /** Backwards-compatible flat list used by the scoped admin pages. */
    async list(query: CustomerQuery = {}): Promise<Customer[]> {
        const page = await this.listPage({ ...query, limit: query.limit ?? 100, offset: query.offset ?? 0 });
        return page.items;
    }

    /**
     * Loads one customer as the display-oriented UI record.
     *
     * The caller may hold either the display customer number or the raw UUID
     * (the deposit form selects the UUID), so the identifier is normalised first.
     * The detail endpoint is queried directly because the list projection does
     * not carry the addresses, identity documents, KYC or nominee the deposit
     * form prefills from.
     */
    async detail(id: string): Promise<Customer> {
        const customerId = await this.resolveCustomerId(id);
        try {
            const view = await apiClient.request<CustomerDetailView>(`/customers/${customerId}`);
            return toCustomer(view, view);
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to load the customer.'));
        }
    }

    /** Lightweight id/name options for the "customer name" filter control. */
    async options(search = '', limit = 100): Promise<CustomerOption[]> {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        params.set('limit', String(Math.min(Math.max(limit, 1), 100)));
        params.set('offset', '0');
        const result = await apiClient.request<CustomerListResult>(`/customers?${params.toString()}`);
        return result.items.map((view) => ({
            id: view.id,
            name: view.fullName,
            customerNumber: view.customerNumber ?? view.id,
        }));
    }

    /** Accurate headline counts (total / active / needs review / new this month). */
    async stats(): Promise<CustomerStats> {
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const [total, active, needsReview, registeredThisMonth] = await Promise.all([
            this.count({}),
            this.count({ status: 'Active' }),
            this.count({ status: 'Review' }),
            this.count({ registeredFrom: monthStart }),
        ]);
        return { total, active, needsReview, registeredThisMonth };
    }

    /** Counts matching records via a 1-row page (total is a window count). */
    private async count(query: CustomerQuery): Promise<number> {
        const params = this.buildParams({ ...query, limit: 1, offset: 0 });
        const result = await apiClient.request<CustomerListResult>(`/customers?${params.toString()}`);
        return result.total;
    }

    /** Streams the filtered registry as RFC-4180 CSV text (audited server-side). */
    async exportCsv(query: CustomerQuery = {}): Promise<string> {
        const params = this.buildParams(query);
        params.delete('limit');
        params.delete('offset');
        try {
            return await apiClient.request<string>(`/customers/export?${params.toString()}`, { raw: true });
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to export customer records.'));
        }
    }

    async create(input: CustomerInput): Promise<Customer> {
        const payload = toCreatePayload(input, this.branchId());
        try {
            const created = await apiClient.request<CustomerDetailView>('/customers', { method: 'POST', body: payload });
            // A nominee is a first-class sub-resource; attach it when captured.
            if (input.nomineeName.trim() && input.nomineeRelation.trim()) {
                try {
                    await apiClient.request(`/customers/${created.id}/nominee`, {
                        method: 'POST',
                        body: {
                            name: input.nomineeName.trim(),
                            relationship: input.nomineeRelation.trim(),
                            ...(input.nomineePhone.trim() ? { phone: input.nomineePhone.trim() } : {}),
                            sharePercentage: 100,
                        },
                    });
                } catch {
                    // fallthrough
                }
            }
            if (input.consentCaptured) {
                try {
                    await apiClient.request(`/customers/${created.id}/consents`, {
                        method: 'POST',
                        body: {
                            consents: [
                                { channel: 'sms', granted: true },
                                { channel: 'whatsapp', granted: true },
                                { channel: 'phone', granted: true }
                            ]
                        },
                    });
                } catch {
                    // fallthrough
                }
            }
            if (input.assignedAgent && input.assignedAgent !== 'Unassigned') {
                try {
                    const agents = await agentsRepository.list();
                    const agent = agents.find((a) => a.name === input.assignedAgent);
                    if (agent) {
                        await agentsRepository.assignCustomers(agent.id, [created.id]);
                    }
                } catch {
                    // best-effort
                }
            }
            const finalRefresh = await apiClient.request<CustomerDetailView>(`/customers/${created.id}`);
            return toCustomer(finalRefresh, finalRefresh);
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to register the customer.'));
        }
    }

    /**
     * Loads the customer savings statement from the reports surface.
     *
     * The UI holds the display customer number, so it is first resolved to the
     * raw UUID, then the statement endpoint is queried with only the supplied
     * optional filters (all validated server-side).
     */
    async statement(id: string, query: CustomerStatementQuery = {}): Promise<CustomerStatementView> {
        const customerId = await this.resolveCustomerId(id);
        const params = new URLSearchParams();
        if (query.fromDate) params.set('fromDate', query.fromDate);
        if (query.toDate) params.set('toDate', query.toDate);
        if (query.accountId) params.set('accountId', query.accountId);
        if (query.productType) params.set('productType', query.productType);
        const suffix = params.toString();
        try {
            return await apiClient.request<CustomerStatementView>(
                `/reports/statements/${customerId}${suffix ? `?${suffix}` : ''}`,
            );
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to load the customer statement.'));
        }
    }

    async update(id: string, input: CustomerInput): Promise<Customer> {
        const customerId = await this.resolveCustomerId(id);
        try {
            const updated = await apiClient.request<CustomerDetailView>(`/customers/${customerId}`, {
                method: 'PATCH',
                body: toUpdatePayload(input),
            });
            if (input.nomineeName.trim() && input.nomineeRelation.trim()) {
                try {
                    await apiClient.request(`/customers/${customerId}/nominee`, {
                        method: 'POST',
                        body: {
                            name: input.nomineeName.trim(),
                            relationship: input.nomineeRelation.trim(),
                            ...(input.nomineePhone.trim() ? { phone: input.nomineePhone.trim() } : {}),
                            sharePercentage: 100,
                        },
                    });
                } catch {
                    /* Nominee update is best-effort; profile update already succeeded. */
                }
            }
            if (input.status) {
                const apiStatus = STATUS_TO_API[input.status];
                if (apiStatus && apiStatus !== updated.status) {
                    try {
                        await apiClient.request(`/customers/${customerId}/status`, {
                            method: 'POST',
                            body: { status: apiStatus, reason: 'Updated via admin panel profile edit' }
                        });
                    } catch {
                        // best-effort, might require M.D. role
                    }
                }
            }
            if (input.branch) {
                try {
                    const branches = await settingsRepository.branches();
                    const branch = branches.find((b) => b.name === input.branch);
                    if (branch && branch.id !== updated.branchId) {
                        await apiClient.request(`/customers/${customerId}/transfer`, {
                            method: 'POST',
                            body: { toBranchId: branch.id, reason: 'Branch reassigned via admin panel' }
                        });
                    }
                } catch {
                    // best-effort
                }
            }
            if (input.consentCaptured) {
                try {
                    await apiClient.request(`/customers/${customerId}/consents`, {
                        method: 'POST',
                        body: {
                            consents: [
                                { channel: 'sms', granted: true },
                                { channel: 'whatsapp', granted: true },
                                { channel: 'phone', granted: true }
                            ]
                        },
                    });
                } catch {
                    // fallthrough
                }
            }
            if (input.assignedAgent && input.assignedAgent !== 'Unassigned') {
                try {
                    const agents = await agentsRepository.list();
                    const agent = agents.find((a) => a.name === input.assignedAgent);
                    if (agent) {
                        await agentsRepository.assignCustomers(agent.id, [customerId]);
                    }
                } catch {
                    // best-effort
                }
            }
            const finalRefresh = await apiClient.request<CustomerDetailView>(`/customers/${customerId}`);
            return toCustomer(finalRefresh, finalRefresh);
        } catch (error) {
            throw new Error(messageFor(error, 'Unable to update the customer.'));
        }
    }
}

export const customerRepository: CustomerRepository = new ApiCustomerRepository();

export { ADDRESS_TYPE_FROM_API };
