// GOVERNANCE / Team & access.

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Filter, Loader2, LockKeyhole, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { staffRepository } from '../services/operations/staffApiRepository';
import type { CreateStaffInput, StaffBranchOption, StaffRecord, StaffRoleOption, StaffStatus, UpdateStaffInput } from '../services/operations/staffApiRepository';
import { messageFor } from '../services/operations/helpers';
import { useAuth } from '../../auth/AuthContext';
import { isSuperAdmin, type StaffRole } from '../../../lib/permissions/permissions';
import { type Status, SummaryStrip } from '../components/adminShared';

/** Formats a `group.action` permission code (e.g. `withdrawals.approve_high_value`) for the role matrix. */
export function humanisePermission(permission: string): string {
    const [group = permission, action = ''] = permission.split('.');
    const groupLabel = group.charAt(0).toUpperCase() + group.slice(1);
    const actionLabel = action.replace(/_/g, ' ').replace(/\b[a-z]/g, (character) => character.toUpperCase());
    return action ? `${groupLabel} · ${actionLabel}` : groupLabel;
}

export const staffStatusLabel: Record<StaffStatus, string> = { active: 'Active', locked: 'Locked', disabled: 'Disabled' };

export const staffStatusClass: Record<StaffStatus, string> = { active: 'status-pill active', locked: 'status-pill review', disabled: 'status-pill inactive' };

export function StaffStatusPill({ status }: { status: StaffStatus }) {
    return <span className={staffStatusClass[status]}><i />{staffStatusLabel[status]}</span>;
}

export type StaffFormInput = {
    staffCode: string;
    fullName: string;
    roleCode: StaffRole;
    branchId: string;
    email: string;
    phone: string;
    password: string;
    ndaSigned: boolean;
    mfaEnabled: boolean;
    exitDate: string;
};

export function StaffModal({ mode, record, roles, branchOptions, onClose, onSave }: { mode: 'add' | 'edit'; record?: StaffRecord; roles: StaffRoleOption[]; branchOptions: StaffBranchOption[]; onClose: () => void; onSave: (input: StaffFormInput) => Promise<void> }) {
    const [staffCode, setStaffCode] = useState(record?.staffCode ?? '');
    const [fullName, setFullName] = useState(record?.fullName ?? '');
    const [roleCode, setRoleCode] = useState<StaffRole>(record?.roleCode ?? roles[0]?.code ?? 'clerk');
    const [branchId, setBranchId] = useState(record?.branchId ?? '');
    const [email, setEmail] = useState(record?.email ?? '');
    const [phone, setPhone] = useState(record?.phone ?? '');
    const [password, setPassword] = useState('');
    const [ndaSigned, setNdaSigned] = useState(record?.ndaSigned ?? false);
    const [mfaEnabled, setMfaEnabled] = useState(record?.mfaEnabled ?? false);
    const [exitDate, setExitDate] = useState(record?.exitDate ?? '');
    const [error, setError] = useState('');
    const reactivating = mode === 'edit' && record?.status === 'disabled'; const locked = mode === 'edit' && (record?.isProtected ?? false);
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        if (saving) return;
        setSaving(true);
        try {
            event.preventDefault();
            if (locked) { setError('This is a protected system account and cannot be modified.'); return; } const code = staffCode.trim();
            if (!code || !fullName.trim()) { setError('Staff code and full name are required.'); return; }
            if (!/^[A-Za-z0-9._-]{2,20}$/.test(code)) { setError('Staff code must be 2-20 characters using letters, numbers, dot, underscore or hyphen.'); return; }
            if (mode === 'add' && password.length < 8) { setError('Set an initial password of at least 8 characters.'); return; }
            if (password !== '' && password.length < 8) { setError('A new password must be at least 8 characters.'); return; }
            if (reactivating && password.length < 8) { setError('Reactivating a disabled account requires a new password of at least 8 characters.'); return; }
            if (reactivating && !ndaSigned) { setError('The NDA must be signed before a disabled account can be reactivated.'); return; }
            await onSave({ staffCode: code, fullName: fullName.trim(), roleCode, branchId: branchId.trim(), email: email.trim(), phone: phone.trim(), password, ndaSigned, mfaEnabled, exitDate });
        } finally { setSaving(false); }
    };
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={mode === 'add' ? 'Add team member' : 'Edit team member'}><div className="admin-modal-header"><div><div className="eyebrow">TEAM ACCESS WORKFLOW</div><h2>{mode === 'add' ? 'Add team member' : `Edit ${record?.fullName ?? 'team member'}`}</h2><p>Provision a staff login, assign its role and branch, and control the NDA and MFA posture.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => void submit(event)}><label>Staff code<input value={staffCode} onChange={(event) => setStaffCode(event.target.value)} placeholder="MGR-002" disabled={mode === 'edit'} /></label><label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Team member name" /></label><label>Role<select value={roleCode} disabled={locked} onChange={(event) => setRoleCode(event.target.value as StaffRole)}>{roles.length === 0 && <option value={roleCode}>{roleCode}</option>}{roles.map((role) => <option key={role.code} value={role.code}>{role.label}</option>)}</select></label><label>Branch<select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Unassigned</option>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.code}</option>)}</select></label><label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@savitribaipatsanstha.coop" /></label><label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98XXXX0000" /></label><label>{mode === 'add' ? 'Initial password' : 'New password'}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={reactivating ? 'Required to reactivate' : 'Minimum 8 characters'} /></label><label>Exit date<input type="date" value={exitDate} onChange={(event) => setExitDate(event.target.value)} /></label><div className="full-field" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={ndaSigned} onChange={(event) => setNdaSigned(event.target.checked)} /> NDA signed</label><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={mfaEnabled} onChange={(event) => setMfaEnabled(event.target.checked)} /> Require MFA</label></div>{error && <p className="form-error full-field">{error}</p>}<div className="customer-detail-actions full-field"><button type="button" className="filter-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={locked || saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Saving…' : (mode === 'add' ? 'Create login' : 'Save changes')}</button></div></form></section></div>;
}

export function StaffDetail({ member, canEdit, canUnlock, onClose, onEdit, onUnlock }: { member: StaffRecord; canEdit: boolean; canUnlock: boolean; onClose: () => void; onEdit: () => void; onUnlock: () => void }) {
    const metadata: Array<[string, string]> = [['Protection', member.isProtected ? 'Immutable system account' : 'Standard account'],
    ['Staff code', member.staffCode],
    ['Role', member.roleLabel],
    ['Branch', member.branchName ?? 'Unassigned'],
    ['Email', member.email ?? 'Not captured'],
    ['Mobile', member.phone ?? 'Not captured'],
    ['Last sign in', member.lastLoginAt ?? 'Never signed in'],
    ['Failed attempts', String(member.failedLoginAttempts)],
    ['Locked until', member.lockedUntil ?? 'Not locked'],
    ['Exit date', member.exitDate ?? 'Not set'],
    ['MFA', member.mfaEnabled ? 'Required' : 'Not required'],
    ['NDA', member.ndaSigned ? 'Signed' : 'Pending'],
    ['Created', member.createdAt],
    ];
    return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label={`Team member ${member.fullName}`}><div className="admin-modal-header"><div><div className="eyebrow">TEAM / {member.staffCode}</div><h2>{member.fullName}</h2><p>{member.roleLabel} · {member.branchName ?? 'Unassigned branch'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div><div className="customer-profile-summary"><div className="customer-avatar">{member.fullName.split(' ').map((part) => part[0]).join('')}</div><div><strong>{member.email ?? 'No email on record'}</strong><span>{member.phone ?? 'No mobile on record'}</span></div><StaffStatusPill status={member.status} /></div><div className="customer-detail-grid">{metadata.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="customer-detail-actions"><button type="button" className="filter-button" onClick={onClose}>Close</button>{canUnlock && member.status === 'locked' && <button type="button" className="filter-button" onClick={onUnlock}><LockKeyhole size={15} /> Unlock account</button>}{!member.isProtected && canEdit && <button type="button" className="primary-button" onClick={onEdit}>Edit access</button>}{member.isProtected && <span className="table-muted">Protected system account - editing disabled</span>}</div></section></div>;
}

export function StaffPage() {
    const { can, hasRole } = useAuth();
    const canManage = hasRole('managing_director');
    const canUnlock = can('security.unlock_accounts');
    const [rows, setRows] = useState<StaffRecord[]>([]);
    const [roleOptions, setRoleOptions] = useState<StaffRoleOption[]>([]);
    const [branchOptions, setBranchOptions] = useState<StaffBranchOption[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>('all');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | 'roles' | null>(null);
    const [selected, setSelected] = useState<StaffRecord | undefined>();
    const [deactivateTarget, setDeactivateTarget] = useState<StaffRecord | undefined>();
    const [deactivateReason, setDeactivateReason] = useState('');
    const [deactivateSaving, setDeactivateSaving] = useState(false);
    const [toast, setToast] = useState('');
    const pageSize = 4; const assignableRoles = roleOptions.filter((role) => !isSuperAdmin(role.code));
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const close = () => { setModal(null); setSelected(undefined); };
    const refresh = async () => {
        try {
            setRows(await staffRepository.list());
        } catch (reason) {
            notify(messageFor(reason, 'Unable to load the team directory.'));
        }
    };
    useEffect(() => {
        let active = true;
        staffRepository.list()
            .then((list) => { if (active) setRows(list); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load the team directory.')); });
        staffRepository.roles()
            .then((options) => { if (active) setRoleOptions(options); })
            .catch(() => undefined);
        staffRepository.branches()
            .then((options) => { if (active) setBranchOptions(options); })
            .catch(() => undefined);
        return () => { active = false; };
    }, []);
    const filteredRows = rows.filter((member) => `${member.staffCode} ${member.fullName} ${member.roleLabel} ${member.branchName ?? ''} ${member.email ?? ''} ${member.phone ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()) && (roleFilter === 'all' || member.roleCode === roleFilter) && (statusFilter === 'all' || member.status === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const saveStaff = async (input: StaffFormInput) => {
        try {
            if (modal === 'edit' && selected) {
                const payload: UpdateStaffInput = {
                    fullName: input.fullName,
                    roleCode: input.roleCode,
                    branchId: input.branchId || null,
                    email: input.email || null,
                    phone: input.phone || null,
                    ndaSigned: input.ndaSigned,
                    mfaEnabled: input.mfaEnabled,
                    exitDate: input.exitDate || null,
                };
                if (input.password) payload.password = input.password;
                await staffRepository.update(selected.id, payload);
                close();
                notify(`${input.fullName}'s access profile updated.`);
            } else {
                const payload: CreateStaffInput = {
                    staffCode: input.staffCode,
                    fullName: input.fullName,
                    roleCode: input.roleCode,
                    branchId: input.branchId || null,
                    email: input.email || null,
                    phone: input.phone || null,
                    password: input.password,
                    ndaSigned: input.ndaSigned,
                    mfaEnabled: input.mfaEnabled,
                    exitDate: input.exitDate || null,
                };
                await staffRepository.create(payload);
                setPage(1);
                close();
                notify(`${input.fullName} can now sign in.`);
            }
            await refresh();
        } catch (reason) {
            notify(messageFor(reason, 'Unable to save the team member.'));
        }
    };
    const unlock = async (member: StaffRecord) => {
        try {
            await staffRepository.unlock(member.id);
            await refresh();
            notify(`${member.fullName}'s account unlocked.`);
        } catch (reason) {
            notify(messageFor(reason, `Unable to unlock ${member.fullName}.`));
        }
    };
    const startDeactivate = (member: StaffRecord) => { setSelected(member); setDeactivateReason(''); setDeactivateTarget(member); setModal(null); };
    const stopDeactivate = () => { setDeactivateTarget(undefined); setDeactivateReason(''); };
    const confirmDeactivate = async () => {
        if (!deactivateTarget) return;
        if (!deactivateReason.trim()) { notify('Provide a reason before deactivating a staff account.'); return; }
        setDeactivateSaving(true);
        const member = deactivateTarget;
        try {
            await staffRepository.deactivate(member.id, deactivateReason.trim());
            stopDeactivate();
            setModal(null);
            setSelected(undefined);
            await refresh();
            notify(`${member.fullName} deactivated.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to deactivate the staff account.'));
        } finally {
            setDeactivateSaving(false);
        }
    };
    const openEdit = (member: StaffRecord) => { setSelected(member); setModal('edit'); };
    const openDetail = (member: StaffRecord) => { setSelected(member); setModal('detail'); };
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">GOVERNANCE / TEAM & ACCESS</div><h1>Team & Staff</h1><p>Provision staff logins, assign roles and branches, unlock locked accounts and revoke workspace access.</p></div><div style={{ display: 'flex', gap: '10px' }}><button className="filter-button" onClick={() => setModal('roles')}><ShieldCheck size={15} /> Roles</button>{canManage && <button className="primary-button" onClick={() => setModal('add')}><UserPlus size={16} /> Add team member</button>}</div></div><SummaryStrip items={[{ label: 'Active staff', value: String(rows.filter((member) => member.status === 'active').length), tone: 'green' }, { label: 'Locked accounts', value: String(rows.filter((member) => member.status === 'locked').length), tone: 'orange' }, { label: 'Deactivated', value: String(rows.filter((member) => member.status === 'disabled').length) }, { label: 'Team seats', value: String(rows.length) }]} /><section className="panel table-panel"><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search staff code, name, role or branch..." aria-label="Search team" /></div><select className="filter-button customer-status-filter" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as StaffRole | 'all'); setPage(1); }} aria-label="Filter team by role"><option value="all">All roles</option>{roleOptions.map((role) => <option key={role.code} value={role.code}>{role.label}</option>)}</select><select className="filter-button customer-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as StaffStatus | 'all'); setPage(1); }} aria-label="Filter team by status"><option value="all">All statuses</option><option value="active">Active</option><option value="locked">Locked</option><option value="disabled">Disabled</option></select></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Team member</th><th>Role</th><th>Branch</th><th>Contact</th><th>Status</th><th>Last sign in</th><th>Actions</th></tr></thead><tbody>{visibleRows.map((member) => <tr key={member.id}><td><strong>{member.fullName}</strong><span>{member.staffCode}</span></td><td>{member.roleLabel}</td><td>{member.branchName ?? 'Unassigned'}</td><td>{member.phone ?? member.email ?? 'Not captured'}</td><td><StaffStatusPill status={member.status} /></td><td className="table-muted">{member.lastLoginAt ?? 'Never'}</td><td><div className="customer-table-actions"><button className="filter-button" onClick={() => openDetail(member)}>View</button>{canUnlock && member.status === 'locked' && <button className="filter-button" onClick={() => void unlock(member)}><LockKeyhole size={14} /> Unlock</button>}{canManage && !member.isProtected && <button className="filter-button" onClick={() => openEdit(member)}>Edit</button>}{canManage && !member.isProtected && member.status !== 'disabled' && <button className="filter-button" onClick={() => startDeactivate(member)}>Deactivate</button>}{member.isProtected && <span className="table-muted">Protected</span>}</div></td></tr>)}</tbody></table>{filteredRows.length === 0 && <div className="empty-state"><strong>No team members match these filters</strong><span>Adjust the search, role or status filters to see staff logins.</span></div>}</div><div className="table-footer"><span>Showing {visibleRows.length} of {filteredRows.length} staff · Page {page} of {pageCount}</span><div style={{ display: 'flex', gap: '8px' }}><button className="pagination-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button><button className="pagination-button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</button></div></div></section>{modal === 'add' && <StaffModal mode="add" roles={assignableRoles} branchOptions={branchOptions} onClose={close} onSave={saveStaff} />}{modal === 'edit' && selected && <StaffModal mode="edit" record={selected} roles={assignableRoles} branchOptions={branchOptions} onClose={close} onSave={saveStaff} />}{modal === 'detail' && selected && <StaffDetail member={selected} canEdit={canManage && !selected.isProtected} canUnlock={canUnlock} onClose={close} onEdit={() => setModal('edit')} onUnlock={() => void unlock(selected)} />}{modal === 'roles' && <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="admin-modal customer-wide-modal" role="dialog" aria-modal="true" aria-label="Roles and permissions"><div className="admin-modal-header"><div><div className="eyebrow">GOVERNANCE / ROLE PERMISSIONS</div><h2>Roles & permissions</h2><p>Every role maps to a fixed permission set that the backend enforces on each request.</p></div><button className="icon-button" onClick={close} aria-label="Close dialog">×</button></div><section className="customer-subsection"><div className="customer-section-heading"><div><h3>Permission matrix</h3><p>Assign a role to a team member from the create or edit dialog.</p></div><span>{roleOptions.length} roles</span></div><div className="security-role-list">{roleOptions.length === 0 && <div className="empty-state"><strong>Role catalogue unavailable</strong><span>Role permissions will appear once the directory loads.</span></div>}{roleOptions.map((role) => <div className="security-role-row security-role-matrix" key={role.id}><div className="security-role-meta"><strong>{role.label}</strong><span>{role.description ?? 'System role'}</span></div><div className="security-role-perms"><span className="security-role-count">{role.permissions.length} permissions</span><div className="permission-chip-grid">{role.permissions.map((permission) => <span className="permission-chip" key={permission}>{humanisePermission(permission)}</span>)}</div></div></div>)}</div></section></section></div>}{deactivateTarget && <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) stopDeactivate(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label="Deactivate staff account"><div className="admin-modal-header"><div><div className="eyebrow">ACCESS REVOCATION</div><h2>Deactivate {deactivateTarget.fullName}</h2><p>Access is revoked immediately. The account stays on record and can be reactivated with a new password.</p></div><button className="icon-button" onClick={stopDeactivate} aria-label="Close dialog">×</button></div><form className="form-grid customer-form" onSubmit={(event) => { event.preventDefault(); void confirmDeactivate(); }}><label className="full-field">Reason for deactivation<textarea value={deactivateReason} onChange={(event) => setDeactivateReason(event.target.value)} rows={3} placeholder="Resignation, role change, policy breach..." /></label><div className="customer-detail-actions full-field"><button type="button" className="filter-button" onClick={stopDeactivate} disabled={deactivateSaving}>Cancel</button><button className="primary-button" type="submit" disabled={deactivateSaving}>{deactivateSaving ? <Loader2 size={15} className="spin" /> : null}{deactivateSaving ? 'Deactivating…' : 'Deactivate account'}</button></div></form></section></div>}{toast && <div className="admin-toast"><CheckCircle2 size={16} /> {toast}</div>}</div>;
}
