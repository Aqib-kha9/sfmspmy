import type {
    CustomerStatementQuery,
    CustomerStatementView,
    CustomerType,
    MembershipCategory,
} from '../../../lib/api/types';
import type { Customer, CustomerInput, Status } from '../types/customer.types';

/**
 * Server-side query contract for the customer registry.
 *
 * Every field maps to a validated `GET /api/v1/customers` query parameter, so
 * the list stays correct for large registries instead of filtering a single
 * client-side page. `'All'` sentinels are accepted for select controls and are
 * dropped before the request is sent.
 */
export type CustomerQuery = {
    search?: string;
    status?: Status | 'All';
    agentId?: string;
    membershipCategory?: MembershipCategory | 'All';
    customerType?: CustomerType | 'All';
    customerId?: string;
    registeredFrom?: string;
    registeredTo?: string;
    limit?: number;
    offset?: number;
};

/** A single server page of customer records plus the unfiltered match count. */
export type CustomerPage = { total: number; items: Customer[] };

/** Lightweight customer identity used to populate the "customer name" filter. */
export type CustomerOption = { id: string; name: string; customerNumber: string };

/** Headline counts for the registry summary strip. */
export type CustomerStats = {
    total: number;
    active: number;
    registeredThisMonth: number;
    needsReview: number;
};

export interface CustomerRepository {
    list(query?: CustomerQuery): Promise<Customer[]>;
    listPage(query?: CustomerQuery): Promise<CustomerPage>;
    options(search?: string, limit?: number): Promise<CustomerOption[]>;
    /**
     * Loads a single customer as the display-oriented UI record.
     *
     * `id` may be the display customer number or the raw UUID, so callers that
     * already hold the UUID (e.g. the deposit form's customer selector) do not
     * need to resolve it themselves.
     */
    detail(id: string): Promise<Customer>;
    stats(): Promise<CustomerStats>;
    exportCsv(query?: CustomerQuery): Promise<string>;
    create(input: CustomerInput): Promise<Customer>;
    update(id: string, input: CustomerInput): Promise<Customer>;
    /**
     * Loads the server-side savings statement (accounts + ledger entries +
     * opening/closing balances + period) for a single customer.
     */
    statement(id: string, query?: CustomerStatementQuery): Promise<CustomerStatementView>;
}
