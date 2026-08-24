import { useState } from 'react';
import {
    ArrowDownToLine,
    ArrowUpRight,
    BarChart3,
    Bell,
    ChevronDown,
    CircleDollarSign,
    ClipboardCheck,
    FileText,
    LayoutDashboard,
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
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AdminPage } from '../features/admin/AdminPages';
import { CustomersPage } from '../features/customers';

const navigation = [
    { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Customers', icon: UsersRound, path: '/customers' },
    { label: 'Deposits', icon: WalletCards, path: '/deposits' },
    { label: 'Recurring deposits', icon: WalletCards, path: '/recurring-deposits' },
    { label: 'Fixed deposits', icon: WalletCards, path: '/fixed-deposits' },
    { label: 'Loans', icon: CircleDollarSign, path: '/loans' },
    { label: 'Withdrawals', icon: ArrowUpRight, path: '/withdrawals' },
    { label: 'Collections', icon: ArrowDownToLine, path: '/collections' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
];

const managementNavigation = [
    { label: 'Collection agents', icon: UserRound, path: '/agents' },
    { label: 'Reconciliation', icon: ClipboardCheck, path: '/reconciliation' },
    { label: 'Security center', icon: ShieldCheck, path: '/security' },
    { label: 'Settings', icon: Settings, path: '/settings' },
];

function AdminLayout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const active = [...navigation, ...managementNavigation].find((item) => item.path === location.pathname)?.label ?? 'Overview';

    return (
        <div className="app-shell">
            <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
                <div className="brand">
                    <div className="brand-mark"><ShieldCheck size={21} /></div>
                    <div><strong>Finora</strong><span>Finance OS</span></div>
                    <button className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
                </div>
                <div className="workspace-label">WORKSPACE</div>
                <nav className="nav-list">
                    {navigation.map(({ label, icon: Icon, path }) => (
                        <NavLink key={label} to={path} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                            <Icon size={18} /><span>{label}</span>{label === 'Collections' && <b className="nav-badge">12</b>}
                        </NavLink>
                    ))}
                </nav>
                <div className="workspace-label secondary-label">MANAGE</div>
                <nav className="nav-list">
                    {managementNavigation.map(({ label, icon: Icon, path }) => <NavLink key={label} className={`nav-item ${active === label ? 'active' : ''}`} to={path} onClick={() => setMenuOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}
                </nav>
                <div className="sidebar-footer"><div className="security-chip"><ShieldCheck size={15} /><span>Secure workspace</span></div><small>Last sync · 2 mins ago</small></div>
            </aside>
            {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
            <section className="main-area">
                <header className="topbar">
                    <button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
                    <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{active}</strong></div>
                    <div className="topbar-actions"><div className="top-search"><Search size={17} /><input placeholder="Search anything..." aria-label="Search" /><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button><div className="profile"><div className="avatar">AK</div><div className="profile-copy"><strong>Arjun Kapoor</strong><span>Proprietor</span></div><ChevronDown size={16} /></div></div>
                </header>
                <main className="content"><Routes><Route path="/dashboard" element={<DashboardPage />} /><Route path="/customers" element={<CustomersPage />} />{[...navigation, ...managementNavigation].filter((item) => item.path !== '/dashboard' && item.path !== '/customers').map(({ path }) => <Route key={path} path={path} element={<AdminPage path={path} />} />)}<Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></main>
            </section>
        </div>
    );
}

export function App() {
    return <BrowserRouter><AdminLayout /></BrowserRouter>;
}
