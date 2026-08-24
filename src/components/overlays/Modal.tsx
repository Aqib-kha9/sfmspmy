import { ReactNode } from 'react';
import { X } from 'lucide-react';

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
                <div className="admin-modal-header">
                    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>
                    <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={16} /></button>
                </div>
                {children}
            </section>
        </div>
    );
}
