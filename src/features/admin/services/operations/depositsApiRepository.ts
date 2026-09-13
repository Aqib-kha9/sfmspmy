import { apiClient } from '../../../../lib/api/apiClient';
import { customerRepository } from '../../../customers/services/customerApiRepository';
import type { Customer } from '../../../customers/types/customer.types';
import { branchId, formatDate, querySuffix } from './helpers';

/**
 * Savings / deposit accounts adapter (spec §9).
 *
 * Bridges the backend `/api/v1/deposits` contract onto the AdminPages
 * `DepositRecord` / `DepositTransaction` shapes. The backend exposes the
 * account UUID plus a human account number; the UI keys off the account
 * number, so this adapter keeps an internal id map and resolves the UUID
 * transparently for mutations.
 *
 * Every field surfaced by the UI is sourced from a real backend response — the
 * account view, the linked product scheme (`/deposits/products`) or the linked
 * customer record (`/customers/:id`). Optional fields are left `undefined`
 * (rendered as "Not captured") instead of being filled with placeholders.
 */

export type Status =
    | 'Active'
    | 'Pending'
    | 'Approved'
    | 'Completed'
    | 'Review'
    | 'Overdue'
    | 'Inactive'
    | 'Rejected'
    | 'Matched';

export type DepositTransaction = {
    id: string;
    type: 'Deposit entry' | 'Withdrawal';
    amount: number;
    date: string;
    reference?: string;
    agent?: string;
    /** Resolved performer name for display (falls back to `agent` when absent). */
    agentName?: string;
    status: Status;
    paymentMethod?: string;
    externalReference?: string;
    narration?: string;
    recordedBy?: string;
    balanceAfter?: number;
};

export type DepositRecord = {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    accountType: 'Regular savings' | 'Fixed deposit' | 'Recurring deposit';
    openingAmount: number;
    balance: number;
    openedOn: string;
    /** Raw ISO opening date, kept so date-range filters compare real values. */
    openedOnIso?: string;
    lastEntry: string;
    status: Status;
    transactions: DepositTransaction[];
    productCode?: string;
    productName?: string;
    branch?: string;
    interestMethod?: string;
    interestRate?: number;
    interestFrequency?: string;
    minimumBalance?: number;
    maxBalance?: number;
    nomineeName?: string;
    nomineePhone?: string;
    nomineeRelation?: string;
    kycMethod?: string;
    identityType?: string;
    identityReference?: string;
    documentReferences?: string;
    openedBy?: string;
};

/**
 * Opening payload. Only the fields the backend `createAccountSchema` accepts are
 * declared here so the form can never submit a value that would be silently
 * dropped (nominee/KYC data is owned by the customer record, not the account).
 */
export type DepositInput = {
    customerId: string;
    productCode?: string;
    openingAmount: number;
    openedOn?: string;
    interestRate?: number;
    paymentMethod?: string;
    referenceNumber?: string;
    description?: string;
};

/**
 * Editable account fields. Mirrors `updateAccountSchema`, which only allows the
 * booked scheme and the account-level interest rate to change (everything else
 * is owned by the linked customer and product records).
 */
export type DepositUpdateInput = {
    productCode?: string;
    /** `null` clears the account override so the product rate applies again. */
    interestRate?: number | null;
};

/**
 * Ledger entry payload. Mirrors `postTransactionSchema`; the entry author and
 * source are stamped server-side from the authenticated session.
 */
export type DepositTransactionInput = {
    type: 'Deposit entry' | 'Withdrawal';
    amount: number;
    date?: string;
    reference?: string;
    paymentMethod?: string;
    narration?: string;
};

/** A savings/deposit scheme as exposed by `GET /deposits/products`. */
export type DepositProduct = {
    id: string;
    code: string;
    name: string;
    minOpeningAmount: number;
    minBalance: number;
    maxBalance?: number;
    interestMethod: string;
    interestFrequency: string;
    interestRate: number;
    isActive: boolean;
};

export type DepositQuery = {
    search?: string;
    status?: Status;
    customerId?: string;
    limit?: number;
    offset?: number;
};

export type DepositStatementQuery = {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
};

export type DepositStatementEntry = {
    id: string;
    date: string;
    description: string;
    type: string;
    direction: 'credit' | 'debit';
    amount: number;
    balanceAfter: number;
    reference?: string;
    paymentMethod?: string;
    recordedBy?: string;
    /** Resolved performer name, so statements never surface a raw staff UUID. */
    recordedByName?: string;
};

export type DepositStatement = {
    accountId: string;
    accountNumber: string;
    customerId: string;
    customerName: string;
    productName: string;
    productCode: string;
    branch?: string;
    status: Status;
    from: string;
    to: string;
    openingBalance: number;
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    total: number;
    entries: DepositStatementEntry[];
};

export interface DepositsRepository {
    list(query?: DepositQuery): Promise<DepositRecord[]>;
    detail(id: string): Promise<DepositRecord>;
    /** Live scheme catalogue, so the opening form can offer real product codes. */
    products(): Promise<DepositProduct[]>;
    create(input: DepositInput): Promise<DepositRecord>;
    update(id: string, input: DepositUpdateInput): Promise<DepositRecord>;
    postTransaction(id: string, input: DepositTransactionInput): Promise<DepositRecord>;
    approve(id: string, note?: string): Promise<DepositRecord>;
    freeze(id: string, reason: string): Promise<DepositRecord>;
    close(id: string, reason: string): Promise<DepositRecord>;
    reopen(id: string, note?: string): Promise<DepositRecord>;
    statement(id: string, query?: DepositStatementQuery): Promise<DepositStatement>;
}

// ---------------------------------------------------------------------------
// Backend view contracts (snake→camel already applied by the service layer)
// ---------------------------------------------------------------------------

export type SavingsAccountStatus = 'pending_approval' | 'active' | 'frozen' | 'closed';

type AccountView = {
    id: string;
    accountNumber: string;
    customerId: string;
    customerNumber: string | null;
    customerName: string;
    productId: string;
    productCode: string;
    productName: string;
    productMinBalance: string;
    productMaxBalance: string | null;
    branchId: string;
    branchName: string | null;
    status: SavingsAccountStatus;
    currentBalance: string;
    interestRate: string | null;
    openedBy: string | null;
    openedByName: string | null;
    openedOn: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    approvedOn: string | null;
    freezeReason: string | null;
    closedOn: string | null;
    closureReason: string | null;
    reopenedOn: string | null;
    lastInterestPostedOn: string | null;
    createdAt: string;
    updatedAt: string;
};

type TransactionView = {
    id: string;
    accountId: string;
    accountNumber: string;
    transactionType: 'deposit' | 'withdrawal' | 'interest' | 'adjustment' | 'reversal';
    direction: 'credit' | 'debit';
    amount: string;
    balanceAfter: string;
    valueDate: string;
    paymentMethod: string | null;
    referenceNumber: string | null;
    description: string | null;
    performedBy: string | null;
    performedSource: string;
    performedByName: string | null;
    reversalOf: string | null;
    adjustmentId: string | null;
    createdAt: string;
};

type ProductView = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    minOpeningAmount: string;
    minBalance: string;
    maxBalance: string | null;
    interestMethod: string;
    interestFrequency: string;
    interestRate: string;
    ratePolicy: string;
    isActive: boolean;
};

type StatementView = {
    account: AccountView;
    from: string;
    to: string;
    openingBalance: string;
    closingBalance: string;
    totalCredits: string;
    totalDebits: string;
    total: number;
    transactions: TransactionView[];
};

type AccountListResult = { total: number; items: AccountView[] };
type TransactionListResult = { total: number; items: TransactionView[] };
type ProductListResult = { total: number; items: ProductView[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Bridges
// ---------------------------------------------------------------------------

function toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function statusOf(status: SavingsAccountStatus): Status {
    switch (status) {
        case 'active':
            return 'Active';
        case 'pending_approval':
            return 'Pending';
        case 'frozen':
            return 'Review';
        case 'closed':
            return 'Inactive';
        default:
            return 'Pending';
    }
}

function accountTypeOf(view: AccountView): DepositRecord['accountType'] {
    const haystack = `${view.productName} ${view.productCode}`.toLowerCase();
    if (haystack.includes('fixed') || haystack.includes('fd')) return 'Fixed deposit';
    if (haystack.includes('recurring') || haystack.includes('rd')) return 'Recurring deposit';
    return 'Regular savings';
}

function paymentMethodLabel(value: string | null): string | undefined {
    if (!value) return undefined;
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function paymentMethodValue(value: string | undefined): string | undefined {
    if (!value) return undefined;
    return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function typeLabelOf(type: TransactionView['transactionType']): string {
    switch (type) {
        case 'withdrawal':
            return 'Withdrawal';
        case 'interest':
            return 'Interest';
        case 'adjustment':
            return 'Adjustment';
        case 'reversal':
            return 'Reversal';
        default:
            return 'Deposit entry';
    }
}

export function toDepositTransaction(view: TransactionView): DepositTransaction {
    const type: DepositTransaction['type'] =
        view.transactionType === 'withdrawal' || view.direction === 'debit' ? 'Withdrawal' : 'Deposit entry';
    return {
        id: view.id,
        type,
        amount: toNumber(view.amount),
        date: formatDate(view.valueDate ?? view.createdAt),
        reference: view.referenceNumber ?? undefined,
        agent: view.performedBy ?? undefined,
        agentName: view.performedByName ?? undefined,
        status: view.reversalOf ? 'Rejected' : 'Completed',
        paymentMethod: paymentMethodLabel(view.paymentMethod),
        externalReference: view.referenceNumber ?? undefined,
        narration: view.description ?? undefined,
        recordedBy: view.performedBy ?? undefined,
        balanceAfter: toNumber(view.balanceAfter),
    };
}

type RecordExtras = {
    product?: ProductView;
    customer?: Customer;
};

function toRecord(view: AccountView, transactions: DepositTransaction[], extras: RecordExtras = {}): DepositRecord {
    const balance = toNumber(view.currentBalance);
    const last = transactions[0];
    // The ledger is returned newest-first, so the opening ledger row is either
    // the entry tagged "Account opening deposit" or the oldest transaction.
    const opening =
        transactions.find((transaction) => transaction.narration === 'Account opening deposit') ??
        transactions[transactions.length - 1];
    const product = extras.product;
    const customer = extras.customer;
    return {
        id: view.accountNumber,
        customerId: view.customerId,
        customerName: view.customerName,
        customerPhone: view.customerNumber ?? '',
        accountType: accountTypeOf(view),
        openingAmount: opening ? opening.amount : balance,
        balance,
        openedOn: formatDate(view.openedOn),
        openedOnIso: view.openedOn ?? undefined,
        lastEntry: last ? last.date : formatDate(view.updatedAt),
        status: statusOf(view.status),
        transactions,
        productCode: view.productCode,
        productName: product?.name ?? view.productName,
        branch: view.branchName ?? undefined,
        interestMethod: product?.interestMethod,
        interestRate: view.interestRate ? Number(view.interestRate) : product ? Number(product.interestRate) : undefined,
        interestFrequency: product?.interestFrequency,
        minimumBalance: toNumber(view.productMinBalance),
        maxBalance: view.productMaxBalance
            ? toNumber(view.productMaxBalance)
            : product?.maxBalance
              ? toNumber(product.maxBalance)
              : undefined,
        nomineeName: customer?.nomineeName || undefined,
        nomineePhone: customer?.nomineePhone || undefined,
        nomineeRelation: customer?.nomineeRelation || undefined,
        kycMethod: customer?.kycMethod || undefined,
        identityType: customer?.identityType || undefined,
        identityReference: customer?.identityReference || undefined,
        documentReferences: customer?.documentReferences || undefined,
        openedBy: view.openedByName ?? undefined,
    };
}

function toStatement(view: StatementView): DepositStatement {
    const account = view.account;
    return {
        accountId: account.id,
        accountNumber: account.accountNumber,
        customerId: account.customerId,
        customerName: account.customerName,
        productName: account.productName,
        productCode: account.productCode,
        branch: account.branchName ?? undefined,
        status: statusOf(account.status),
        from: view.from,
        to: view.to,
        openingBalance: toNumber(view.openingBalance),
        closingBalance: toNumber(view.closingBalance),
        totalCredits: toNumber(view.totalCredits),
        totalDebits: toNumber(view.totalDebits),
        total: view.total,
        entries: view.transactions.map((transaction) => ({
            id: transaction.id,
            date: formatDate(transaction.valueDate ?? transaction.createdAt),
            description: transaction.description ?? '',
            type: typeLabelOf(transaction.transactionType),
            direction: transaction.direction,
            amount: toNumber(transaction.amount),
            balanceAfter: toNumber(transaction.balanceAfter),
            reference: transaction.referenceNumber ?? undefined,
            paymentMethod: paymentMethodLabel(transaction.paymentMethod),
            recordedBy: transaction.performedBy ?? undefined,
            recordedByName: transaction.performedByName ?? undefined,
        })),
    };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiDepositsRepository implements DepositsRepository {
    /** display id / uuid → uuid */
    private readonly ids = new Map<string, string>();

    /** Product scheme catalogue, keyed by product id, fetched once per session. */
    private productsPromise: Promise<Map<string, ProductView>> | undefined;

    private remember(view: AccountView): void {
        this.ids.set(view.id, view.id);
        this.ids.set(view.accountNumber, view.id);
    }

    private async uuidOf(id: string): Promise<string> {
        const cached = this.ids.get(id);
        if (cached) return cached;
        if (UUID_RE.test(id)) {
            this.ids.set(id, id);
            return id;
        }
        await this.list({ limit: 100 });
        const resolved = this.ids.get(id);
        if (resolved) return resolved;
        throw new Error(`Unknown deposit account ${id}`);
    }

    private async transactionsOf(uuid: string): Promise<DepositTransaction[]> {
        const result = await apiClient.request<TransactionListResult>(
            `/deposits/accounts/${uuid}/transactions`,
            { method: 'GET' },
        );
        return result.items.map(toDepositTransaction);
    }

    private async productIndex(): Promise<Map<string, ProductView>> {
        if (!this.productsPromise) {
            this.productsPromise = apiClient
                .request<ProductListResult>('/deposits/products?limit=100', { method: 'GET' })
                .then((result) => new Map(result.items.map((product) => [product.id, product])))
                .catch(() => {
                    this.productsPromise = undefined;
                    return new Map<string, ProductView>();
                });
        }
        return this.productsPromise;
    }

    private async customerOf(customerId: string): Promise<Customer | undefined> {
        try {
            return await customerRepository.detail(customerId);
        } catch {
            return undefined;
        }
    }

    /** Loads the linked product + customer so the record carries real backend values. */
    private async present(view: AccountView, transactions: DepositTransaction[]): Promise<DepositRecord> {
        const [index, customer] = await Promise.all([this.productIndex(), this.customerOf(view.customerId)]);
        return toRecord(view, transactions, { product: index.get(view.productId), customer });
    }

    async list(query: DepositQuery = {}): Promise<DepositRecord[]> {
        const suffix = querySuffix({
            search: query.search,
            customerId: query.customerId,
            limit: query.limit ?? 50,
            offset: query.offset ?? 0,
        });
        const result = await apiClient.request<AccountListResult>(`/deposits/accounts${suffix}`, {
            method: 'GET',
        });
        result.items.forEach((view) => this.remember(view));
        const index = await this.productIndex();
        const records = await Promise.all(
            result.items.map(async (view) =>
                toRecord(view, await this.transactionsOf(view.id), { product: index.get(view.productId) }),
            ),
        );
        return query.status ? records.filter((row) => row.status === query.status) : records;
    }

    async detail(id: string): Promise<DepositRecord> {
        const uuid = await this.uuidOf(id);
        const view = await apiClient.request<AccountView>(`/deposits/accounts/${uuid}`, { method: 'GET' });
        this.remember(view);
        return this.present(view, await this.transactionsOf(uuid));
    }

    async statement(id: string, query: DepositStatementQuery = {}): Promise<DepositStatement> {
        const uuid = await this.uuidOf(id);
        const suffix = querySuffix({
            from: query.from,
            to: query.to,
            limit: query.limit ?? 200,
            offset: query.offset ?? 0,
        });
        const view = await apiClient.request<StatementView>(`/deposits/accounts/${uuid}/statements${suffix}`, {
            method: 'GET',
        });
        return toStatement(view);
    }

    private async resolveProductId(code: string | undefined): Promise<string> {
        const index = await this.productIndex();
        const needle = (code ?? '').trim().toLowerCase();
        if (needle) {
            for (const product of index.values()) {
                if (product.code.toLowerCase() === needle) return product.id;
            }
            throw new Error(`No deposit product matches the code "${code}".`);
        }
        const active = [...index.values()].filter((product) => product.isActive);
        const only = active.length === 1 ? active[0] : undefined;
        if (only) return only.id;
        throw new Error('Enter the deposit product code — the branch has multiple schemes configured.');
    }

    async products(): Promise<DepositProduct[]> {
        const index = await this.productIndex();
        return [...index.values()]
            .filter((product) => product.isActive)
            .map((product) => ({
                id: product.id,
                code: product.code,
                name: product.name,
                minOpeningAmount: toNumber(product.minOpeningAmount),
                minBalance: toNumber(product.minBalance),
                maxBalance: product.maxBalance ? toNumber(product.maxBalance) : undefined,
                interestMethod: product.interestMethod,
                interestFrequency: product.interestFrequency,
                interestRate: toNumber(product.interestRate),
                isActive: product.isActive,
            }))
            .sort((left, right) => left.code.localeCompare(right.code));
    }

    async create(input: DepositInput): Promise<DepositRecord> {
        const productId = await this.resolveProductId(input.productCode);
        const body: Record<string, unknown> = {
            customerId: input.customerId,
            productId,
            branchId: branchId(),
            openingAmount: input.openingAmount.toFixed(2),
            paymentMethod: paymentMethodValue(input.paymentMethod) ?? 'cash',
        };
        if (input.openedOn) body.openedOn = input.openedOn;
        if (input.interestRate !== undefined) body.interestRate = input.interestRate.toFixed(4);
        if (input.referenceNumber) body.referenceNumber = input.referenceNumber;
        if (input.description) body.description = input.description;
        const view = await apiClient.request<AccountView>('/deposits/accounts', { method: 'POST', body });
        this.remember(view);
        return this.present(view, await this.transactionsOf(view.id));
    }

    async update(id: string, input: DepositUpdateInput): Promise<DepositRecord> {
        const uuid = await this.uuidOf(id);
        const body: Record<string, unknown> = {};
        if (input.productCode !== undefined && input.productCode.trim()) {
            body.productId = await this.resolveProductId(input.productCode.trim());
        }
        if (input.interestRate !== undefined) {
            body.interestRate = input.interestRate === null ? null : input.interestRate.toFixed(4);
        }
        if (Object.keys(body).length === 0) {
            throw new Error('Nothing to update — choose a scheme or change the interest rate first.');
        }
        const view = await apiClient.request<AccountView>(`/deposits/accounts/${uuid}`, { method: 'PATCH', body });
        this.remember(view);
        return this.present(view, await this.transactionsOf(uuid));
    }

    async postTransaction(id: string, input: DepositTransactionInput): Promise<DepositRecord> {
        const uuid = await this.uuidOf(id);
        const body: Record<string, unknown> = {
            transactionType: input.type === 'Withdrawal' ? 'withdrawal' : 'deposit',
            amount: input.amount.toFixed(2),
            valueDate: input.date,
        };
        const paymentMethod = paymentMethodValue(input.paymentMethod);
        if (paymentMethod) body.paymentMethod = paymentMethod;
        if (input.reference) body.referenceNumber = input.reference;
        if (input.narration) body.description = input.narration;
        await apiClient.request<TransactionView>(`/deposits/accounts/${uuid}/transactions`, {
            method: 'POST',
            body,
        });
        return this.detail(uuid);
    }

    async approve(id: string, note?: string): Promise<DepositRecord> {
        const uuid = await this.uuidOf(id);
        const body = note ? { note } : {};
        const view = await apiClient.request<AccountView>(`/deposits/accounts/${uuid}/approve`, {
            method: 'POST',
            body,
        });
        this.remember(view);
        return this.present(view, await this.transactionsOf(uuid));
    }

    async freeze(id: string, reason: string): Promise<DepositRecord> {
        const uuid = await this.uuidOf(id);
        const view = await apiClient.request<AccountView>(`/deposits/accounts/${uuid}/freeze`, {
            method: 'POST',
            body: { reason },
        });
        this.remember(view);
        return this.present(view, await this.transactionsOf(uuid));
    }

    async close(id: string, reason: string): Promise<DepositRecord> {
        const uuid = await this.uuidOf(id);
        const view = await apiClient.request<AccountView>(`/deposits/accounts/${uuid}/close`, {
            method: 'POST',
            body: { reason },
        });
        this.remember(view);
        return this.present(view, await this.transactionsOf(uuid));
    }

    async reopen(id: string, note?: string): Promise<DepositRecord> {
        const uuid = await this.uuidOf(id);
        const body = note ? { note } : {};
        const view = await apiClient.request<AccountView>(`/deposits/accounts/${uuid}/reopen`, {
            method: 'POST',
            body,
        });
        this.remember(view);
        return this.present(view, await this.transactionsOf(uuid));
    }
}

export const depositsRepository: DepositsRepository = new ApiDepositsRepository();
