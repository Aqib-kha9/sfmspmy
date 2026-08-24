import { describe, expect, it } from 'vitest';
import { MockCustomerRepository } from './customerMockRepository';
import type { CustomerInput } from '../types/customer.types';

const validInput: CustomerInput = {
    name: 'New Customer',
    phone: '9876543210',
    email: '',
    alternatePhone: '',
    customerType: 'Individual',
    status: 'Pending',
    address: 'New address',
    permanentAddress: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    nationality: 'Indian',
    occupation: '',
    businessType: '',
    taxIdentifier: '',
    identityType: 'Aadhaar',
    identityReference: '',
    kycMethod: 'Document review',
    kycVerifiedOn: '',
    amlRiskCategory: 'Standard',
    sourceOfFunds: '',
    communicationPreference: 'SMS',
    branch: 'Jaipur Main Branch',
    nomineeName: 'Nominee',
    nomineePhone: '9876500000',
    nomineeRelation: 'Parent',
    guardianName: '',
    guardianPhone: '',
    assignedAgent: 'Unassigned',
    consentCaptured: false,
    documentReferences: '',
    registrationDate: '2026-08-22',
};

describe('MockCustomerRepository', () => {
    it('lists the seeded customers', async () => {
        const repository = new MockCustomerRepository();
        const customers = await repository.list();

        expect(customers).toHaveLength(5);
        expect(customers[0]?.id).toBe('CUS-10482');
    });

    it('filters by customer and service search terms', async () => {
        const repository = new MockCustomerRepository();

        await expect(repository.list({ search: 'FD-2024071' })).resolves.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'CUS-10480' }),
            ])
        );
    });

    it('filters by status', async () => {
        const repository = new MockCustomerRepository();
        const customers = await repository.list({ status: 'Review' });

        expect(customers.every((customer) => customer.status === 'Review')).toBe(true);
        expect(customers).toHaveLength(2);
    });

    it('creates and updates customer records', async () => {
        const repository = new MockCustomerRepository();
        const created = await repository.create(validInput);
        const updated = await repository.update(created.id, {
            ...validInput,
            name: 'Updated Customer',
        });

        expect(created.id).toBe('CUS-10505');
        expect(updated.name).toBe('Updated Customer');
        await expect(repository.list({ search: 'Updated Customer' })).resolves.toHaveLength(1);
    });

    it('rejects updates for missing records', async () => {
        const repository = new MockCustomerRepository();

        await expect(repository.update('CUS-MISSING', validInput)).rejects.toThrow(
            'Customer record was not found.'
        );
    });

    it('does not expose mutable nested arrays from the repository', async () => {
        const repository = new MockCustomerRepository();
        const customers = await repository.list();
        const first = customers[0];

        expect(first).toBeDefined();
        if (!first) return;

        first.services.pop();
        const fresh = await repository.list();

        expect(fresh[0]?.services).toHaveLength(2);
    });
});
