import { useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '../../../components/overlays/Modal';
import { Req } from '../../../components/ui/FieldIndicators';
import type { Customer } from '../types/customer.types';

export function CustomerDeleteModal({
    customer,
    onClose,
    onConfirm,
}: {
    customer: Customer;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
}) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmed = reason.trim();
        if (trimmed.length < 3) {
            setError('Please provide an audit reason of at least 3 characters.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onConfirm(trimmed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete customer.');
        } finally {
            setSaving(false);
        }
    };

    const hasServices = customer.services && customer.services.length > 0;

    return (
        <Modal
            title={`Delete Customer · ${customer.name}`}
            eyebrow={`CUSTOMER DELETION / ${customer.id}`}
            onClose={onClose}
        >
            <form className="form-grid customer-form" onSubmit={(event) => void submit(event)}>
                <div className="full-field" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#991b1b' }}>
                        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
                                Are you sure you want to delete / deactivate this customer?
                            </strong>
                            <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d' }}>
                                <strong>{customer.name}</strong> ({customer.id}) · {customer.phone}
                                <br />
                                {hasServices ? (
                                    <span style={{ fontWeight: 600, color: '#b91c1c' }}>
                                        Warning: Customer has {customer.services.length} active service(s) ({customer.accountSummary}). Active loans must be settled before deletion.
                                    </span>
                                ) : (
                                    'This will deactivate the customer profile while retaining transaction ledger records for banking compliance.'
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <label className="full-field">
                    <span>Audit Reason for Deletion <Req /></span>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for deletion or deactivation (e.g., duplicate registration, customer requested closure, mistaken entry)"
                        rows={3}
                        required
                    />
                </label>

                {error && <p className="form-error full-field">{error}</p>}

                <div className="admin-form-actions full-field" style={{ marginTop: 12 }}>
                    <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="primary-button"
                        style={{ background: '#dc2626', borderColor: '#dc2626' }}
                        disabled={saving}
                    >
                        {saving ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                        {saving ? 'Deleting…' : 'Confirm Delete Customer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
