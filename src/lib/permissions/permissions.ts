export type Permission =
    | 'customers.read'
    | 'customers.write'
    | 'customers.export'
    | 'deposits.read'
    | 'deposits.write'
    | 'loans.read'
    | 'loans.write'
    | 'loans.approve'
    | 'withdrawals.read'
    | 'withdrawals.create'
    | 'withdrawals.approve'
    | 'withdrawals.approve_high_value'
    | 'collections.read'
    | 'collections.write'
    | 'reconciliation.read'
    | 'reconciliation.write'
    | 'reports.read'
    | 'reports.export'
    | 'agents.read'
    | 'agents.write'
    | 'security.read'
    | 'security.unlock_accounts'
    | 'security.audit.read'
    | 'settings.read'
    | 'settings.write';

export type StaffRole =
    | 'super_admin'
    | 'managing_director'
    | 'president'
    | 'vice_president'
    | 'manager'
    | 'cashier'
    | 'clerk'
    | 'collection_agent';

export type PermissionContext = { role: StaffRole; permissions: Permission[] };

export const staffRoles: Array<{ id: StaffRole; label: string; description: string }> = [
    { id: 'super_admin', label: 'Super Administrator', description: 'Immutable root account with unconditional access to every module; cannot be edited or deactivated' },
    { id: 'managing_director', label: 'Managing Director', description: 'Full oversight of the patsanstha, unlocks locked staff accounts, reviews immutable activity history' },
    { id: 'president', label: 'President', description: 'Approves withdrawals above ₹2,00,000 and provides governance oversight' },
    { id: 'vice_president', label: 'Vice President', description: 'Approves routine withdrawals and supports governance oversight' },
    { id: 'manager', label: 'Manager', description: 'Day-to-day operations, staff supervision, loan and account processing' },
    { id: 'cashier', label: 'Cashier', description: 'Counts cash at day close, processes deposits and withdrawal payouts' },
    { id: 'clerk', label: 'Clerk', description: 'Customer records, account opening and data entry' },
    { id: 'collection_agent', label: 'Collection Agent', description: 'Doorstep collection for assigned customers, own history only' },
];

const allPermissions: Permission[] = [
    'customers.read', 'customers.write', 'customers.export',
    'deposits.read', 'deposits.write',
    'loans.read', 'loans.write', 'loans.approve',
    'withdrawals.read', 'withdrawals.create', 'withdrawals.approve', 'withdrawals.approve_high_value',
    'collections.read', 'collections.write',
    'reconciliation.read', 'reconciliation.write',
    'reports.read', 'reports.export',
    'agents.read', 'agents.write',
    'security.read', 'security.unlock_accounts', 'security.audit.read',
    'settings.read', 'settings.write',
];

export const rolePermissions: Record<StaffRole, Permission[]> = {
    super_admin: allPermissions,
    managing_director: allPermissions,
    president: [
        'customers.read', 'deposits.read', 'loans.read', 'loans.approve',
        'withdrawals.read', 'withdrawals.approve', 'withdrawals.approve_high_value',
        'collections.read', 'reconciliation.read',
        'reports.read', 'reports.export', 'agents.read',
        'security.read', 'security.audit.read', 'settings.read',
    ],
    vice_president: [
        'customers.read', 'deposits.read', 'loans.read', 'loans.approve',
        'withdrawals.read', 'withdrawals.approve',
        'collections.read', 'reconciliation.read',
        'reports.read', 'reports.export', 'agents.read',
        'security.read', 'settings.read',
    ],
    manager: [
        'customers.read', 'customers.write', 'customers.export',
        'deposits.read', 'deposits.write',
        'loans.read', 'loans.write', 'loans.approve',
        'withdrawals.read', 'withdrawals.create', 'withdrawals.approve',
        'collections.read', 'collections.write',
        'reconciliation.read', 'reconciliation.write',
        'reports.read', 'reports.export',
        'agents.read', 'agents.write',
        'security.read', 'settings.read',
    ],
    cashier: [
        'customers.read', 'deposits.read', 'deposits.write',
        'withdrawals.read', 'withdrawals.create',
        'collections.read', 'collections.write',
        'reconciliation.read', 'reconciliation.write',
        'reports.read',
    ],
    clerk: [
        'customers.read', 'customers.write',
        'deposits.read', 'deposits.write',
        'loans.read', 'withdrawals.read', 'withdrawals.create',
        'collections.read', 'reports.read',
    ],
    collection_agent: [
        'customers.read', 'collections.read', 'collections.write', 'reconciliation.read',
    ],
};

/** The immutable super-administrator role code. */
export const SUPER_ADMIN_ROLE: StaffRole = 'super_admin';

export function isSuperAdmin(role: StaffRole) {
    return role === SUPER_ADMIN_ROLE;
}

export function can(context: PermissionContext, permission: Permission) {
    if (isSuperAdmin(context.role)) return true;
    return context.permissions.includes(permission);
}

export const adminPermissions: PermissionContext = {
    role: 'managing_director',
    permissions: rolePermissions.managing_director,
};

/** Client rule: withdrawals above ₹2,00,000 require President approval. */
export const HIGH_VALUE_WITHDRAWAL_LIMIT = 200000;

/** Mirrors `BUSINESS_RULES` in backend/src/core/money.ts (spec §5, §9–§13, §22.2). */
export const BUSINESS_RULES = {
    HIGH_VALUE_WITHDRAWAL_LIMIT: 200000,
    FD_MIN_AMOUNT: 1000,
    FD_MAX_AMOUNT: 100000,
    FD_LIEN_LOAN_PERCENT: 85, // loan against FD ≤ 85% of the FD amount
    COLLATERAL_LENDING_PERCENT: 60, // loan ≤ 60% of collateral value
    GUARANTOR_MAX_ACTIVE_LOANS: 2,
    RD_GRACE_PERIOD_MONTHS: 1,
    RD_EARLY_CLOSURE_FEE_PERCENT: 4, // 4% closure fee
    DISPUTE_WINDOW_MONTHS: 3,
    MIN_INTEREST_RATE: 4,
    MAX_INTEREST_RATE: 25,
} as const;

export function canApproveWithdrawal(context: PermissionContext, amount: number) {
    if (isSuperAdmin(context.role)) return true;
    if (amount > HIGH_VALUE_WITHDRAWAL_LIMIT) return context.role === 'president';
    return context.permissions.includes('withdrawals.approve');
}
