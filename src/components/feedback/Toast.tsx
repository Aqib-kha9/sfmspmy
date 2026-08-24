import { useEffect, useState } from 'react';

export function Toast({ message }: { message: string }) {
    if (!message) return null;
    return <div className="admin-toast" role="status">{message}</div>;
}

export function useToast() {
    const [message, setMessage] = useState('');
    useEffect(() => {
        if (!message) return;
        const timer = window.setTimeout(() => setMessage(''), 2600);
        return () => window.clearTimeout(timer);
    }, [message]);
    return { message, notify: setMessage };
}
