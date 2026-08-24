import { useCallback, useEffect, useState } from 'react';
import type { Customer, CustomerInput } from '../types/customer.types';
import { customerRepository } from '../services/customerMockRepository';

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const refresh = useCallback(async () => {
        setLoading(true);
        try { setCustomers(await customerRepository.list()); setError(''); } catch { setError('Unable to load customer records.'); } finally { setLoading(false); }
    }, []);
    useEffect(() => { void refresh(); }, [refresh]);
    const create = async (input: CustomerInput) => { const customer = await customerRepository.create(input); setCustomers((current) => [customer, ...current]); return customer; };
    const update = async (id: string, input: CustomerInput) => { const customer = await customerRepository.update(id, input); setCustomers((current) => current.map((item) => item.id === id ? customer : item)); return customer; };
    return { customers, loading, error, refresh, create, update };
}
