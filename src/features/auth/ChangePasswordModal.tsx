import { FormEvent, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/overlays/Modal';
import { useAuth } from './AuthContext';

/**
 * Self-service credential rotation for the signed-in user. The backend verifies
 * the current password and revokes every OTHER session on success; the calling
 * session stays valid, so the user remains signed in here.
 */
export function ChangePasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (message: string) => void }) {
    const { changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        setError('');

        if (currentPassword.length === 0) {
            setError('Enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match.');
            return;
        }
        if (newPassword === currentPassword) {
            setError('New password must be different from the current password.');
            return;
        }

        setSaving(true);
        try {
            await changePassword(currentPassword, newPassword);
            onSuccess('Password changed. All other sessions were signed out.');
            onClose();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to change password. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Change password" eyebrow="ACCOUNT SECURITY" onClose={onClose}>
            <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
                <p className="customer-modal-intro full-field"><ShieldCheck size={15} /> Rotating your password signs out every other active session. This session stays signed in.</p>
                <label className="full-field">Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
                <label className="full-field">New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" /></label>
                <label className="full-field">Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
                {error && <p className="form-error full-field">{error}</p>}
                <div className="admin-form-actions full-field">
                    <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? 'Updating…' : 'Change password'}</button>
                </div>
            </form>
        </Modal>
    );
}
