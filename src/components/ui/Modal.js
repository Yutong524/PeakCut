'use client';
export default function Modal({ open, title, children, onClose, footer }) {
    if (!open) return null;
    return (
        <div className="modal">
            <div className="modal-backdrop" onClick={onClose} />
            <div className="modal-card">
                <div className="p-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <h3 className="text-lg" style={{ color: 'var(--acid-200)' }}>{title}</h3>
                </div>
                <div className="p-4">{children}</div>
                {footer && (
                    <div className="p-3 border-t flex justify-end gap-2"
                        style={{ borderColor: 'var(--line)' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
