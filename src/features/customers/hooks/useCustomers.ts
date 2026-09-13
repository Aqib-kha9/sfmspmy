import { useCallback, useEffect, useState } from 'react';
import type { CustomerStatementQuery, CustomerStatementView } from '../../../lib/api/types';
import type { Customer, CustomerInput } from '../types/customer.types';
import { customerRepository } from '../services/customerApiRepository';
import type { CustomerOption, CustomerQuery, CustomerStats } from '../services/customerRepository';

const emptyStats: CustomerStats = { total: 0, active: 0, registeredThisMonth: 0, needsReview: 0 };

/**
 * Server-driven customer registry hook.
 *
 * `query` (search / filters / page offset) is serialised into a stable key, so
 * the list is re-fetched from `/api/v1/customers` only when a filter actually
 * changes — filtering and pagination therefore happen in the database rather
 * than over a single client-side page.
 */
export function useCustomers(query: CustomerQuery = {}) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [total, setTotal] = useState(0);
    const [options, setOptions] = useState<CustomerOption[]>([]);
    const [stats, setStats] = useState<CustomerStats>(emptyStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const key = JSON.stringify(query);

    const refresh = useCallback(async (override?: CustomerQuery) => {
        const effective = override ?? (JSON.parse(key) as CustomerQuery);
        setLoading(true);
        try {
            const page = await customerRepository.listPage(effective);
            setCustomers(page.items);
            setTotal(page.total);
            setError('');
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load customer records.');
        } finally {
            setLoading(false);
        }
    }, [key]);

    useEffect(() => { void refresh(); }, [refresh]);

    // Name options + headline counts are independent of the active filters, so
    // they are loaded once and refreshed after a write (which changes totals).
    const refreshMeta = useCallback(async () => {
        try {
            const [nameOptions, headline] = await Promise.all([
                customerRepository.options('', 100),
                customerRepository.stats(),
            ]);
            setOptions(nameOptions);
            setStats(headline);
        } catch {
            /* Non-blocking: the registry list still works without these. */
        }
    }, []);

    useEffect(() => { void refreshMeta(); }, [refreshMeta]);

    const exportCsv = useCallback(async (override?: CustomerQuery) => {
        const effective = override ?? (JSON.parse(key) as CustomerQuery);
        return customerRepository.exportCsv(effective);
    }, [key]);

    /** Loads the server-side savings statement for a single customer. */
    const statement = useCallback(
        (id: string, override?: CustomerStatementQuery): Promise<CustomerStatementView> =>
            customerRepository.statement(id, override),
        [],
    );

    const create = async (input: CustomerInput) => {
        const customer = await customerRepository.create(input);
        await Promise.all([refresh(), refreshMeta()]);
        return customer;
    };
    const update = async (id: string, input: CustomerInput) => {
        const customer = await customerRepository.update(id, input);
        await Promise.all([refresh(), refreshMeta()]);
        return customer;
    };

    return { customers, total, options, stats, loading, error, refresh, refreshMeta, exportCsv, statement, create, update };
}
