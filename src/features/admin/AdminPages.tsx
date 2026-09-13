// Thin router: maps a navigation path to the feature module that owns the screen.
import { ScopedCollectionsPage } from './pages/CollectionsPage';
import { ScopedReconciliationPage } from './pages/ReconciliationPage';
import { ReportsPage } from './pages/ReportsPage';
import { ScopedSecurityPage } from './pages/SecurityPage';
import { SettingsPage } from './pages/SettingsPage';
import { ScopedCustomerPage } from './pages/CustomersPage';
import { DepositsPage } from './pages/DepositsPage';
import { RecurringDepositsPage } from './pages/RecurringDepositsPage';
import { FixedDepositsPage } from './pages/FixedDepositsPage';
import { LoansPage } from './pages/LoansPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { ScopedAgentsPage } from './pages/AgentsPage';
import { StaffPage } from './pages/StaffPage';

export function AdminPage({ path }: { path: string }) {
    if (path === '/collections') return <ScopedCollectionsPage />;
    if (path === '/reconciliation') return <ScopedReconciliationPage />;
    if (path === '/reports') return <ReportsPage />;
    if (path === '/security') return <ScopedSecurityPage />;
    if (path === '/settings') return <SettingsPage />;
    if (path === '/customers') return <ScopedCustomerPage />;
    if (path === '/deposits') return <DepositsPage />;
    if (path === '/recurring-deposits') return <RecurringDepositsPage />;
    if (path === '/fixed-deposits') return <FixedDepositsPage />;
    if (path === '/loans') return <LoansPage />;
    if (path === '/withdrawals') return <WithdrawalsPage />;
    if (path === '/agents') return <ScopedAgentsPage />;
    if (path === '/staff') return <StaffPage />;
    return null;
}
