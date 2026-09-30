// Backend-driven <select> options (agents, branches). No hard-coded names.

import { useEffect, useState } from 'react';
import { agentsRepository } from '../services/operations/agentsApiRepository';
import { settingsRepository } from '../services/operations/settingsApiRepository';

export let agentNameCache: string[] | null = null;

export let agentNameRequest: Promise<string[]> | null = null;

export function loadAgentNames(): Promise<string[]> {
    if (agentNameCache) return Promise.resolve(agentNameCache);
    if (!agentNameRequest) {
        agentNameRequest = agentsRepository
            .list()
            .then((rows) => {
                agentNameCache = rows.map((row) => row.name).filter((name) => name.trim().length > 0);
                return agentNameCache;
            })
            .catch(() => {
                agentNameRequest = null;
                return [] as string[];
            });
    }
    return agentNameRequest;
}

/** Backend-driven collection agent options. No hard-coded staff names. */
export function AgentOptions() {
    const [names, setNames] = useState<string[]>(agentNameCache ?? []);
    useEffect(() => {
        let active = true;
        loadAgentNames()
            .then((rows) => { if (active) setNames(rows); })
            .catch(() => undefined);
        return () => { active = false; };
    }, []);
    return <>{names.map((name) => <option key={name}>{name}</option>)}</>;
}

export let branchNameCache: string[] | null = null;

export let branchNameRequest: Promise<string[]> | null = null;

export function loadBranchNames(): Promise<string[]> {
    if (branchNameCache) return Promise.resolve(branchNameCache);
    if (!branchNameRequest) {
        branchNameRequest = settingsRepository
            .branches()
            .then((rows) => {
                branchNameCache = rows.map((row) => row.name).filter((name) => name.trim().length > 0);
                return branchNameCache;
            })
            .catch(() => {
                branchNameRequest = null;
                return [] as string[];
            });
    }
    return branchNameRequest;
}

/** Backend-driven branch options. No hard-coded branch names. */
export function BranchOptions() {
    const [names, setNames] = useState<string[]>(branchNameCache ?? []);
    useEffect(() => {
        let active = true;
        loadBranchNames()
            .then((rows) => { if (active) setNames(rows); })
            .catch(() => undefined);
        return () => { active = false; };
    }, []);
    return <>{names.map((name) => <option key={name}>{name}</option>)}</>;
}

import { customerRepository } from '../../customers/services/customerApiRepository';
import type { CustomerOption } from '../../customers/services/customerRepository';

export let customerCache: CustomerOption[] | null = null;
export let customerRequest: Promise<CustomerOption[]> | null = null;

export function loadCustomers(): Promise<CustomerOption[]> {
    if (customerCache) return Promise.resolve(customerCache);
    if (!customerRequest) {
        customerRequest = customerRepository
            .options('', 1000)
            .then((rows) => {
                customerCache = rows;
                return customerCache;
            })
            .catch(() => {
                customerRequest = null;
                return [] as CustomerOption[];
            });
    }
    return customerRequest;
}

export function CustomerOptions() {
    const [customers, setCustomers] = useState<CustomerOption[]>(customerCache ?? []);
    useEffect(() => {
        let active = true;
        loadCustomers()
            .then((rows) => { if (active) setCustomers(rows); })
            .catch(() => undefined);
        return () => { active = false; };
    }, []);
    return <>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} | {c.customerNumber}</option>)}</>;
}

export function AccountOptions({ customerId }: { customerId: string }) {
    const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!customerId) {
            setAccounts([]);
            return;
        }
        let active = true;
        setLoading(true);
        customerRepository.detail(customerId)
            .then((customer) => {
                if (active && customer) {
                    setAccounts(customer.services.map(s => ({ id: s.id, name: `${s.accountNumber} - ${s.type}` })));
                }
            })
            .catch(() => { if (active) setAccounts([]); })
            .finally(() => { if (active) setLoading(false); });
        
        return () => { active = false; };
    }, [customerId]);

    return (
        <>
            <option value="">{loading ? 'Loading accounts...' : 'All accounts / No filter'}</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </>
    );
}
