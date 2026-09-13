// GOVERNANCE / Workspace configuration.

import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import { settingsRepository } from '../services/operations/settingsApiRepository';
import { messageFor } from '../services/operations/helpers';
import { StatusPill } from '../components/adminShared';

export type SettingsSection = 'organization' | 'collection' | 'receipts' | 'notifications' | 'retention';

export type SettingsState = {
    organizationName: string;
    registrationNumber: string;
    primaryPhone: string;
    alternatePhone: string;
    timezone: string;
    currency: string;
    fiscalYear: string;
    branchCode: string;
    branchName: string;
    address: string;
    approvalPolicy: string;
    collectionLimit: string;
    cashHoldingLimit: string;
    notificationChannels: string;
    retentionExceptionReference: string;
    auditOwner: string;
    defaultCollectionMode: 'Doorstep' | 'Branch' | 'Mixed';
    gracePeriodDays: string;
    requireGeoTag: boolean;
    allowOfflineCollection: boolean;
    receiptPrefix: string;
    nextReceiptNumber: string;
    receiptFooter: string;
    smsReceipts: boolean;
    emailStatements: boolean;
    overdueAlerts: boolean;
    notificationEmail: string;
    auditRetention: string;
    transactionRetention: string;
    autoArchive: boolean;
};

export const emptySettings: SettingsState = {
    organizationName: '', registrationNumber: '', primaryPhone: '', alternatePhone: '', timezone: 'Asia/Kolkata', currency: 'INR', fiscalYear: '', branchCode: '', branchName: '', address: '', approvalPolicy: '', collectionLimit: '', cashHoldingLimit: '', notificationChannels: '', retentionExceptionReference: '', auditOwner: '',
    defaultCollectionMode: 'Mixed', gracePeriodDays: '', requireGeoTag: false, allowOfflineCollection: false,
    receiptPrefix: '', nextReceiptNumber: '', receiptFooter: '',
    smsReceipts: false, emailStatements: false, overdueAlerts: false, notificationEmail: '',
    auditRetention: '', transactionRetention: '', autoArchive: false
};

export const settingsSections: Array<{ id: SettingsSection; label: string; description: string }> = [
    { id: 'organization', label: 'Organization profile', description: 'Identity and statement details.' },
    { id: 'collection', label: 'Collection policies', description: 'Doorstep and mobile controls.' },
    { id: 'receipts', label: 'Receipt numbering', description: 'References and receipt output.' },
    { id: 'notifications', label: 'Notifications', description: 'Customer and operations alerts.' },
    { id: 'retention', label: 'Data retention', description: 'Audit and transaction lifecycle.' }
];

export function SettingsPage() {
    const [section, setSection] = useState<SettingsSection>('organization');
    const [settings, setSettings] = useState<SettingsState>(emptySettings);
    const [activity, setActivity] = useState<string[]>([]);
    const [toast, setToast] = useState('');
    const [saving, setSaving] = useState(false);
    const currentSection = settingsSections.find((item) => item.id === section)!;
    const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
    const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => setSettings((current) => ({ ...current, [key]: value }));
    useEffect(() => {
        let active = true;
        settingsRepository.load()
            .then((draft) => { if (active) setSettings(draft); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load system settings.')); });
        settingsRepository.history()
            .then((entries) => { if (active) setActivity(entries.map((entry) => `${entry.label} · ${entry.at}`)); })
            .catch(() => undefined);
        return () => { active = false; };
    }, []);
    const save = async () => {
        if (saving) return;
        if (!settings.organizationName.trim() || !settings.registrationNumber.trim() || !settings.address.trim()) { notify('Organization name, registration number and address are required.'); return; }
        setSaving(true);
        try {
            await settingsRepository.save(settings);
            notify(`${currentSection.label} saved.`);
            const entries = await settingsRepository.history().catch(() => []);
            setActivity(entries.map((entry) => `${entry.label} · ${entry.at}`));
        } catch (reason) {
            notify(messageFor(reason, 'Unable to save system settings.'));
        } finally {
            setSaving(false);
        }
    };
    const toggle = (key: 'requireGeoTag' | 'allowOfflineCollection' | 'smsReceipts' | 'emailStatements' | 'overdueAlerts' | 'autoArchive') => update(key, !settings[key]);
    const renderToggle = (label: string, description: string, key: Parameters<typeof toggle>[0]) => <div className="settings-toggle-row"><div><strong>{label}</strong><span>{description}</span></div><button type="button" className={`security-toggle ${settings[key] ? 'enabled' : ''}`} onClick={() => toggle(key)} aria-pressed={settings[key]}>{settings[key] ? 'Enabled' : 'Disabled'}</button></div>;
    return <div className="admin-page"><div className="page-heading"><div><div className="eyebrow">GOVERNANCE / WORKSPACE CONFIGURATION</div><h1>System Settings</h1><p>Configure operational defaults, customer communications and controlled data policies.</p></div><button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} {saving ? 'Saving…' : 'Save changes'}</button></div><div className="settings-layout"><section className="panel settings-nav" aria-label="Settings sections">{settingsSections.map((item) => <button type="button" className={`settings-nav-item ${section === item.id ? 'active' : ''}`} key={item.id} onClick={() => setSection(item.id)}><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={15} /></button>)}</section><section className="panel settings-form"><div className="panel-heading"><div><div className="eyebrow">ACTIVE CONFIGURATION</div><h2>{currentSection.label}</h2><p>{currentSection.description}</p></div><span className="settings-local-state">Local draft</span></div>{section === 'organization' && <div className="form-grid"><label>Organization name<input value={settings.organizationName} onChange={(event) => update('organizationName', event.target.value)} /></label><label>Registration number<input value={settings.registrationNumber} onChange={(event) => update('registrationNumber', event.target.value)} /></label><label>Primary phone<input value={settings.primaryPhone} onChange={(event) => update('primaryPhone', event.target.value)} /></label><label>Timezone<select value={settings.timezone} onChange={(event) => update('timezone', event.target.value)}><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Dubai</option></select></label><label>Currency<input value={settings.currency} onChange={(event) => update('currency', event.target.value)} /></label><label>Fiscal year<input value={settings.fiscalYear} onChange={(event) => update('fiscalYear', event.target.value)} /></label><label>Branch code<input value={settings.branchCode} onChange={(event) => update('branchCode', event.target.value)} /></label><label>Branch name<input value={settings.branchName} onChange={(event) => update('branchName', event.target.value)} /></label><label className="full-field">Registered address<textarea value={settings.address} onChange={(event) => update('address', event.target.value)} /></label></div>}{section === 'collection' && <div className="form-grid"><label>Default collection mode<select value={settings.defaultCollectionMode} onChange={(event) => update('defaultCollectionMode', event.target.value as SettingsState['defaultCollectionMode'])}><option>Doorstep</option><option>Branch</option><option>Mixed</option></select></label><label>Grace period (days)<input type="number" min="0" max="30" value={settings.gracePeriodDays} onChange={(event) => update('gracePeriodDays', event.target.value)} /></label><label>Approval policy<input value={settings.approvalPolicy} onChange={(event) => update('approvalPolicy', event.target.value)} /></label><label>Collection limit<input value={settings.collectionLimit} onChange={(event) => update('collectionLimit', event.target.value)} /></label><label>Cash holding limit<input value={settings.cashHoldingLimit} onChange={(event) => update('cashHoldingLimit', event.target.value)} /></label><div className="full-field settings-toggle-list">{renderToggle('Require location tag', 'Capture the agent location with each mobile collection.', 'requireGeoTag')}{renderToggle('Allow offline collection', 'Queue receipts when the mobile device is temporarily offline.', 'allowOfflineCollection')}</div></div>}{section === 'receipts' && <div className="form-grid"><label>Receipt prefix<input value={settings.receiptPrefix} onChange={(event) => update('receiptPrefix', event.target.value.toUpperCase())} /></label><label>Next receipt number<input value={settings.nextReceiptNumber} onChange={(event) => update('nextReceiptNumber', event.target.value)} /></label><label className="full-field">Receipt footer<textarea value={settings.receiptFooter} onChange={(event) => update('receiptFooter', event.target.value)} /></label><div className="form-note full-field"><CheckCircle2 size={16} /><span>Next generated receipt reference: <strong>{settings.receiptPrefix}-{settings.nextReceiptNumber}</strong></span></div></div>}{section === 'notifications' && <div className="form-grid"><label className="full-field">Operations notification email<input type="email" value={settings.notificationEmail} onChange={(event) => update('notificationEmail', event.target.value)} /></label><label className="full-field">Notification channels<input value={settings.notificationChannels} onChange={(event) => update('notificationChannels', event.target.value)} /></label><div className="full-field settings-toggle-list">{renderToggle('SMS payment receipts', 'Send a receipt confirmation after a successful collection.', 'smsReceipts')}{renderToggle('Email statements', 'Allow statement delivery through the configured email channel.', 'emailStatements')}{renderToggle('Overdue collection alerts', 'Notify operations when installments pass their due date.', 'overdueAlerts')}</div></div>}{section === 'retention' && <div className="form-grid"><label>Audit log retention<select value={settings.auditRetention} onChange={(event) => update('auditRetention', event.target.value)}><option>3 years</option><option>7 years</option><option>10 years</option></select></label><label>Transaction retention<select value={settings.transactionRetention} onChange={(event) => update('transactionRetention', event.target.value)}><option>7 years</option><option>10 years</option><option>Permanent</option></select></label><label>Retention exception reference<input value={settings.retentionExceptionReference} onChange={(event) => update('retentionExceptionReference', event.target.value)} /></label><label>Audit owner<input value={settings.auditOwner} onChange={(event) => update('auditOwner', event.target.value)} /></label><div className="full-field settings-toggle-list">{renderToggle('Automatic archival', 'Archive inactive records after the configured retention period.', 'autoArchive')}</div><div className="form-note full-field"><ShieldCheck size={16} /><span>Retention changes are controlled configuration and are recorded in local activity history.</span></div></div>}<div className="settings-form-footer"><span>Changes remain local until backend persistence is connected.</span><button className="primary-button" onClick={save}><CheckCircle2 size={15} /> Save section</button></div></section></div><section className="panel settings-activity"><div className="panel-heading"><div><h2>Recent configuration activity</h2><p>Local audit feedback for settings changes made in this workspace.</p></div></div>{activity.map((item) => <div className="settings-activity-row" key={item}><span className="audit-dot" /><strong>{item}</strong><StatusPill status="Completed" /></div>)}</section>{toast && <div className="admin-toast" role="status"><CheckCircle2 size={15} />{toast}</div>}</div>;
}
