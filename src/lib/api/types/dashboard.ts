// API contracts: Dashboard (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Dashboard (backend/src/modules/dashboard/dashboard.service.ts)
// ---------------------------------------------------------------------------

export interface CollectionModeBreakdown {
    mode: string;
    amount: number;
    count: number;
}

export interface RecentTransactionView {
    id: string;
    transactionType: string;
    direction: 'credit' | 'debit';
    amount: number;
    valueDate: string;
    paymentMethod: string | null;
    referenceNumber: string | null;
    description: string | null;
    performedSource: 'admin_web' | 'agent_mobile' | 'system' | null;
    createdAt: string;
    accountNumber: string | null;
    customerName: string | null;
}

export interface DashboardOverviewView {
    date: string;
    collections: {
        entryCount: number;
        totalAmount: number;
        cashAmount: number;
        digitalAmount: number;
        bankAmount: number;
        byMode: CollectionModeBreakdown[];
        acceptedCount: number;
        waitingCount: number;
    };
    activeAgents: {
        total: number;
        activeToday: number;
    };
    averageCollection: {
        perEntry: number;
        perActiveAgent: number;
    };
    pendingCounts: Partial<Record<'collections' | 'withdrawals' | 'overdueLoans' | 'reconciliationDifferences' | 'complaints', number>>;
    recentTransactions: RecentTransactionView[];
}

export type PendingItemKind =
    | 'collections'
    | 'withdrawals'
    | 'overdueLoans'
    | 'reconciliationDifferences'
    | 'complaints';

export interface PendingItemView {
    id: string;
    kind: PendingItemKind;
    reference: string;
    amount: number;
    customerName: string | null;
    accountNumber: string | null;
    createdAt: string;
    dueDate: string | null;
    status: string;
    description: string | null;
}

export interface DashboardPendingResult {
    date: string;
    kinds: PendingItemKind[];
    counts: Record<string, number>;
    items: PendingItemView[];
    perKindLimit: number;
}

export interface AgentPerformanceEntryView {
    agentId: string;
    agentName: string;
    staffCode: string;
    entryCount: number;
    totalAmount: number;
    cashAmount: number;
    digitalAmount: number;
    bankAmount: number;
    lastEntryAt: string | null;
}

export interface AgentPerformanceDashboardResult {
    items: AgentPerformanceEntryView[];
    total: number;
    summary: {
        from: string;
        to: string;
        agentCount: number;
        entryCount: number;
        totalAmount: number;
    };
}

export interface RecentTransactionsResult {
    items: RecentTransactionView[];
    total: number;
    page: number;
    pageSize: number;
}
