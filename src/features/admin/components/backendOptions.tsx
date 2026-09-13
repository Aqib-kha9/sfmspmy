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
