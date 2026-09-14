// GOVERNANCE / Security centre.

import { useEffect, useState } from 'react';
import { CheckCircle2, Filter, LockKeyhole, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { securityRepository } from '../services/operations/securityApiRepository';
import { messageFor } from '../services/operations/helpers';
import { type Status, StatusPill, SummaryStrip, DetailCard } from '../components/adminShared';

export type SecurityPolicy = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    value: string;
    mfaMethod?: string;
    recoveryReference?: string;
    policyOwner?: string;
    secondApproverReference?: string;
};

export type SecurityRole = {
    id: string;
    name: string;
    members: number;
    scope: string;
    permissions: string[];
    status: Status;
};

export type SecuritySession = {
    id: string;
    user: string;
    role: string;
    device: string;
    location: string;
    lastActive: string;
    status: 'Active' | 'Inactive';
    /** True while the registry entry awaits Managing Director confirmation. */
    pending?: boolean;
    ipAddress?: string;
    userAgent?: string;
    deviceReference?: string;
    loginFailureCount?: string;
    lockoutReference?: string;
};

export type SecurityAuditEvent = {
    id: string;
    action: string;
    actor: string;
    target: string;
    date: string;
    requestId: string;
    status: Status;
    approvalReference?: string;
    secondApprover?: string;
    ipAddress?: string;
    userAgent?: string;
    evidenceReference?: string;
};

export function ScopedSecurityPage() {
    const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
    const [roles, setRoles] = useState<SecurityRole[]>([]);
    const [sessions, setSessions] = useState<SecuritySession[]>([]);
    const [auditEvents, setAuditEvents] = useState<SecurityAuditEvent[]>([]);
    const [search, setSearch] = useState('');
    const [auditStatus, setAuditStatus] = useState<'All' | Status>('All');
    const [mfaMethod, setMfaMethod] = useState('Authenticator app');
    const [recoveryReference, setRecoveryReference] = useState('');
    const [sessionIpAddress, setSessionIpAddress] = useState('');
    const [sessionUserAgent, setSessionUserAgent] = useState('');
    const [deviceReference, setDeviceReference] = useState('');
    const [loginFailureEvidence, setLoginFailureEvidence] = useState('');
    const [approvalReference, setApprovalReference] = useState('');
    const [secondApprover, setSecondApprover] = useState('');
    const [toast, setToast] = useState('');
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };

    useEffect(() => {
        let active = true;
        securityRepository.listPolicies().then((rows) => { if (active) setPolicies(rows); }).catch((reason: unknown) => { if (active) notify(messageFor(reason, 'Unable to load security policies.')); });
        securityRepository.listRoles().then((rows) => { if (active) setRoles(rows); }).catch((reason: unknown) => { if (active) notify(messageFor(reason, 'Unable to load role permissions.')); });
        securityRepository.listSessions().then((rows) => { if (active) setSessions(rows); }).catch((reason: unknown) => { if (active) notify(messageFor(reason, 'Unable to load active sessions.')); });
        securityRepository.listAuditEvents().then((rows) => { if (active) setAuditEvents(rows); }).catch((reason: unknown) => { if (active) notify(messageFor(reason, 'Unable to load audit events.')); });
        return () => { active = false; };
    }, []);

    const refreshAudit = async () => {
        try {
            const events = await securityRepository.listAuditEvents();
            setAuditEvents(events);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to refresh the audit log.'));
        }
    };

    const togglePolicy = async (policy: SecurityPolicy) => {
        const enabled = !policy.enabled;
        try {
            const rows = await securityRepository.togglePolicy(policy.id, enabled);
            setPolicies(rows);
            await refreshAudit();
            notify(`${policy.name} ${enabled ? 'enabled' : 'disabled'}.`);
        } catch (reason) {
            notify(messageFor(reason, `Unable to update ${policy.name}.`));
        }
    };

    const revokeSession = async (session: SecuritySession) => {
        try {
            await securityRepository.revokeSession(session.deviceReference ?? session.id);
            const rows = await securityRepository.listSessions();
            setSessions(rows);
            notify(`${session.user} session revoked.`);
        } catch (reason) {
            notify(messageFor(reason, `Unable to revoke ${session.user}.`));
        }
    };

    const confirmSession = async (session: SecuritySession) => {
        try {
            await securityRepository.confirmDevice(session.deviceReference ?? session.id);
            const rows = await securityRepository.listSessions();
            setSessions(rows);
            notify(`${session.user} confirmed. The agent can now sign in from this device.`);
        } catch (reason) {
            notify(messageFor(reason, `Unable to confirm ${session.user}.`));
        }
    };

    const refreshSessions = async () => {
        try {
            const rows = await securityRepository.listSessions();
            setSessions(rows);
            notify('Active sessions refreshed from the server.');
        } catch (reason) {
            notify(messageFor(reason, 'Unable to refresh sessions.'));
        }
    };

    const filteredAudit = auditEvents.filter((event) => `${event.action} ${event.actor} ${event.target} ${event.requestId}`.toLowerCase().includes(search.toLowerCase()) && (auditStatus === 'All' || event.status === auditStatus));
    const reviewAudit = () => { setSearch(''); setAuditStatus('All'); document.getElementById('security-audit-log')?.scrollIntoView({ behavior: 'smooth' }); notify('Showing the complete security audit log.'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">GOVERNANCE / ACCESS CONTROL</div><h1>Security Center</h1><p>Manage authentication posture, role permissions, active sessions and immutable audit activity. Activity history is immutable and reviewed by the Managing Director.</p></div><button className="primary-button" onClick={reviewAudit}><ShieldCheck size={16} /> Review audit log</button></div><div className="security-banner"><div className="security-banner-icon"><ShieldCheck size={24} /></div><div><strong>Workspace security is active</strong><p>Financial actions require authenticated users, permission checks and audit events.</p></div><StatusPill status="Active" /></div><SummaryStrip items={[{ label: 'Protected policies', value: `${policies.filter((policy) => policy.enabled).length}/${policies.length}`, tone: 'green' }, { label: 'Active sessions', value: String(sessions.filter((session) => session.status === 'Active').length) }, { label: 'Roles configured', value: String(roles.length) }, { label: 'Audit events', value: String(auditEvents.length), tone: 'orange' }]} /><div className="security-grid"><DetailCard title="Authentication controls" icon={LockKeyhole}><div className="security-policy-list">{policies.map((policy) => <div className="security-policy-row" key={policy.id}><div><strong>{policy.name}</strong><span>{policy.description}</span><small>{policy.value}</small></div><button className={`security-toggle ${policy.enabled ? 'enabled' : ''}`} onClick={() => togglePolicy(policy)} aria-pressed={policy.enabled}>{policy.enabled ? 'Enabled' : 'Disabled'}</button></div>)}</div></DetailCard><DetailCard title="Role permissions" icon={UsersRound}><div className="security-role-list">{roles.map((role) => <div className="security-role-row" key={role.id}><div><strong>{role.name}</strong><span>{role.members} members · {role.scope}</span><small>{role.permissions.join(' · ')}</small></div><StatusPill status={role.status} /></div>)}</div></DetailCard></div><section className="panel security-session-panel"><div className="panel-heading"><div><h2>Active sessions</h2><p>Review connected devices and revoke access when a session is not recognized.</p></div><button className="filter-button" onClick={refreshSessions}><CheckCircle2 size={15} /> Refresh</button></div><div className="data-table-wrap"><table className="data-table security-session-table"><thead><tr><th>User</th><th>Device / location</th><th>Last active</th><th>Status</th><th /></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td><strong>{session.user}</strong><span>{session.role} · {session.id}</span></td><td><strong>{session.device}</strong><span>{session.location} · {session.deviceReference ?? 'Device reference not captured'}</span><small>{session.ipAddress ?? 'IP not captured'} · {session.userAgent ?? 'User-agent not captured'}</small>{(session.loginFailureCount || session.lockoutReference) && <small>{session.loginFailureCount ?? 'Login evidence'} · {session.lockoutReference ?? 'Lockout reference not captured'}</small>}</td><td>{session.lastActive}</td><td><StatusPill status={session.status === 'Active' ? 'Active' : 'Inactive'} /></td><td>{session.pending ? <button className="text-button" onClick={() => confirmSession(session)}>Confirm</button> : session.status === 'Active' && <button className="text-button" onClick={() => revokeSession(session)}>Revoke</button>}</td></tr>)}</tbody></table></div></section><section className="panel audit-panel" id="security-audit-log"><div className="panel-heading"><div><h2>Security audit log</h2><p>Authentication, authorization and access-control events with request references.</p></div></div><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actor, target, action or request ID..." aria-label="Search security audit log" /></div><select className="filter-button" value={auditStatus} onChange={(event) => setAuditStatus(event.target.value as typeof auditStatus)} aria-label="Filter security audit events"><option value="All">All event statuses</option><option value="Completed">Completed</option><option value="Pending">Pending</option><option value="Review">Review</option></select></div>{filteredAudit.length ? filteredAudit.map((event) => <div className="audit-row" key={event.id}><span className={`audit-dot ${event.status === 'Review' ? 'warning' : ''}`} /><div><strong>{event.action}</strong><span>{event.actor} · {event.target} · {event.date} · {event.requestId}</span><small>{event.approvalReference ?? 'Approval reference not captured'} · {event.secondApprover ?? 'Second approver not captured'} · {event.ipAddress ?? 'IP not captured'} · {event.evidenceReference ?? 'Evidence reference not captured'}</small></div><StatusPill status={event.status} /></div>) : <div className="empty-state"><strong>No security events found</strong><span>Adjust the audit search or status filter.</span></div>}</section>{toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}
