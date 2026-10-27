import { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';

export function Modal({
    title,
    eyebrow,
    children,
    onClose,
    wide = false,
}: {
    title: string;
    eyebrow?: string;
    children: ReactNode;
    onClose: () => void;
    wide?: boolean;
}) {
    return (
        <div className="admin-overlay" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className={`admin-modal ${wide ? 'customer-wide-modal' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
                <div className="admin-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onClose}
                            aria-label="Back / Return"
                            title="Go back / close"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                        >
                            <ArrowLeft size={15} /> <span>Back</span>
                        </button>
                        <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>
                    </div>
                    <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={16} /></button>
                </div>
                {children}
            </section>
        </div>
    );
}
