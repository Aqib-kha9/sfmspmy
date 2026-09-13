import { useState } from 'react';
import {
    ArrowDownToLine,
    ArrowUpRight,
    BarChart3,
    Bell,
    ChevronDown,
    CircleDollarSign,
    ClipboardCheck,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    Settings,
    ShieldCheck,
    UserRound,
    UsersRound,
    WalletCards,
    X,
} from 'lucide-react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { ChangePasswordModal } from '../features/auth/ChangePasswordModal';
import { LoginPage } from '../features/auth/LoginPage';
import { Toast, useToast } from '../components/feedback/Toast';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AdminPage } from '../features/admin/AdminPages';
import { CustomersPage } from '../features/customers';
import type { Permission } from '../lib/permissions/permissions';

type NavItem = { label: string; icon: typeof LayoutDashboard; path: string; permission?: Permission };

const navigation: NavItem[] = [
    { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Customers', icon: UsersRound, path: '/customers', permission: 'customers.read' },
    { label: 'Deposits', icon: WalletCards, path: '/deposits', permission: 'deposits.read' },
    { label: 'Recurring deposits', icon: WalletCards, path: '/recurring-deposits', permission: 'deposits.read' },
    { label: 'Fixed deposits', icon: WalletCards, path: '/fixed-deposits', permission: 'deposits.read' },
    { label: 'Loans', icon: CircleDollarSign, path: '/loans', permission: 'loans.read' },
    { label: 'Withdrawals', icon: ArrowUpRight, path: '/withdrawals', permission: 'withdrawals.read' },
    { label: 'Collections', icon: ArrowDownToLine, path: '/collections', permission: 'collections.read' },
    { label: 'Reports', icon: BarChart3, path: '/reports', permission: 'reports.read' },
];

const managementNavigation: NavItem[] = [
    { label: 'Collection agents', icon: UserRound, path: '/agents', permission: 'agents.read' },
    { label: 'Team & staff', icon: UsersRound, path: '/staff', permission: 'security.read' },
    { label: 'Reconciliation', icon: ClipboardCheck, path: '/reconciliation', permission: 'reconciliation.read' },
    { label: 'Security center', icon: ShieldCheck, path: '/security', permission: 'security.read' },
    { label: 'Settings', icon: Settings, path: '/settings', permission: 'settings.read' },
];

function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '--';
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function AdminLayout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { profile, can, logout } = useAuth();
    const [signingOut, setSigningOut] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const { message: toast, notify } = useToast();

    const visibleNav = navigation.filter((item) => !item.permission || can(item.permission));
    const visibleManagementNav = managementNavigation.filter((item) => !item.permission || can(item.permission));
    const active = [...visibleNav, ...visibleManagementNav].find((item) => item.path === location.pathname)?.label ?? 'Overview';

    const signOut = async () => {
        setSigningOut(true);
        try {
            await logout();
        } finally {
            setSigningOut(false);
        }
    };

    return (
        <div className="app-shell">
            <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
                <div className="brand">
                    <div className="brand-mark"><ShieldCheck size={21} /></div>
                    <div><strong>Savitribai Fule</strong><span>Mahila Nagari Sahakari Patsanstha, Yavatmal</span></div>
                    <button className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
                </div>
                <div className="workspace-label">WORKSPACE</div>
                <nav className="nav-list">
                    {visibleNav.map(({ label, icon: Icon, path }) => (
                        <NavLink key={label} to={path} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                            <Icon size={18} /><span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
                {visibleManagementNav.length > 0 && (
                    <>
                        <div className="workspace-label secondary-label">MANAGE</div>
                        <nav className="nav-list">
                            {visibleManagementNav.map(({ label, icon: Icon, path }) => <NavLink key={label} className={`nav-item ${active === label ? 'active' : ''}`} to={path} onClick={() => setMenuOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}
                        </nav>
                    </>
                )}
                <div className="sidebar-footer"><div className="security-chip"><ShieldCheck size={15} /><span>Secure workspace</span></div><small>{profile?.branchName ?? 'Unassigned branch'} · IST · Connected to server</small></div>
            </aside>
            {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
            <section className="main-area">
                <header className="topbar">
                    <button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
                    <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{active}</strong></div>
                    <div className="topbar-actions"><div className="top-search"><Search size={17} /><input placeholder="Search anything..." aria-label="Search" /><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button><div className="profile"><div className="avatar">{initialsOf(profile?.fullName ?? '')}</div><div className="profile-copy"><strong>{profile?.fullName ?? 'Staff'}</strong><span>{profile?.roleLabel ?? 'Signed in'}</span></div><button className="icon-button" onClick={() => setChangingPassword(true)} aria-label="Change password" title="Change password"><KeyRound size={17} /></button><button className="icon-button" onClick={() => void signOut()} disabled={signingOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></div></div>
                </header>
                <main className="content"><Routes><Route path="/dashboard" element={<DashboardPage />} /><Route path="/customers" element={<CustomersPage />} />{[...navigation, ...managementNavigation].filter((item) => item.path !== '/dashboard' && item.path !== '/customers').map(({ path }) => <Route key={path} path={path} element={<AdminPage path={path} />} />)}<Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></main>
            </section>
            {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} onSuccess={(message) => notify(message)} />}
            <Toast message={toast} />
        </div>
    );
}

function RestoringSession() {
    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-heading"><h1>Restoring session</h1><p>Verifying your secure workspace…</p></div>
            </div>
        </div>
    );
}

/** Everything except /login lives behind this guard. */
function ProtectedLayout() {
    const { profile, bootstrapping } = useAuth();
    const location = useLocation();

    if (bootstrapping) return <RestoringSession />;

    // No session → send the user straight to the login page, remembering where
    // they were so they can be returned there after signing in.
    if (!profile) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }

    return <AdminLayout />;
}

/** Public route — bounces already-authenticated users back into the app. */
function LoginRoute() {
    const { profile, bootstrapping } = useAuth();
    const location = useLocation();
    const state = location.state as { from?: string } | null;

    if (bootstrapping) return <RestoringSession />;

    if (profile) return <Navigate to={state?.from ?? '/dashboard'} replace />;

    return <LoginPage />;
}

export function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginRoute />} />
                    <Route path="/*" element={<ProtectedLayout />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
