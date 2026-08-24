import type { Customer, CustomerInput } from '../types/customer.types';
import type { CustomerQuery, CustomerRepository } from './customerRepository';

const customerDefaults = { email: '', alternatePhone: '', permanentAddress: '', dateOfBirth: '', gender: '', maritalStatus: '', nationality: 'Indian', occupation: '', businessType: '', taxIdentifier: '', identityType: 'Aadhaar', identityReference: '', kycMethod: 'Document review', kycVerifiedOn: '', amlRiskCategory: 'Standard', sourceOfFunds: '', communicationPreference: 'SMS', branch: 'Jaipur Main Branch', guardianName: '', guardianPhone: '', consentCaptured: false, documentReferences: '' };

const seed: Customer[] = [
    { ...customerDefaults, id: 'CUS-10482', name: 'Meera Joshi', phone: '98XXXX7788', value: '₹12,40,000', accountSummary: '2 active accounts', status: 'Active', address: '12 Finance Street, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Ritu Joshi', nomineePhone: '98XXXX7788', nomineeRelation: 'Spouse', assignedAgent: 'Rajesh Kumar', registrationDate: '2024-02-14', services: [{ id: 'svc-1', type: 'RD', accountNumber: 'RD-2024108', label: 'Monthly recurring deposit', amount: '₹3,000 / month', detail: 'Due 12 Aug 2026', status: 'Active' }, { id: 'svc-2', type: 'Loan', accountNumber: 'LN-30472', label: 'Home loan', amount: '₹12,40,000 outstanding', detail: '₹24,800 installment', status: 'Active' }], transactions: [{ id: 'TXN-20481', type: 'RD installment', amount: '₹3,000', date: '08 Aug 2026 · 10:42 AM', agent: 'Rajesh Kumar', reference: 'RCT-88201', status: 'Completed' }] },
    { ...customerDefaults, id: 'CUS-10481', name: 'Kavita Shah', phone: '97XXXX4488', value: '₹4,82,000', accountSummary: '1 active account', status: 'Review', address: '44 Market Road, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Kiran Patel', nomineePhone: '97XXXX4488', nomineeRelation: 'Parent', assignedAgent: 'Priya Sharma', registrationDate: '2023-09-04', services: [{ id: 'svc-3', type: 'Loan', accountNumber: 'LN-30481', label: 'Gold loan', amount: '₹4,82,000 outstanding', detail: '₹8,500 installment due', status: 'Review' }], transactions: [{ id: 'TXN-20480', type: 'Loan repayment', amount: '₹8,500', date: '08 Aug 2026 · 10:31 AM', agent: 'Priya Sharma', reference: 'RCT-88200', status: 'Completed' }] },
    { ...customerDefaults, id: 'CUS-10480', name: 'Sanjay Rao', phone: '99XXXX2288', value: '₹1,46,000', accountSummary: '2 active accounts', status: 'Review', address: '8 Lake View Colony, Jaipur, Rajasthan', customerType: 'Business', nomineeName: 'Asha Rao', nomineePhone: '99XXXX2288', nomineeRelation: 'Partner', assignedAgent: 'Amit Verma', registrationDate: '2022-11-19', services: [{ id: 'svc-4', type: 'FD', accountNumber: 'FD-2024071', label: 'Fixed deposit', amount: '₹1,00,000', detail: 'Matures 18 Jul 2026 · 7.5%', status: 'Review' }, { id: 'svc-5', type: 'Deposit', accountNumber: 'DEP-78144', label: 'Savings deposit', amount: '₹46,000 balance', detail: 'Last entry 08 Aug 2026', status: 'Active' }], transactions: [{ id: 'TXN-20479', type: 'Deposit collection', amount: '₹5,000', date: '08 Aug 2026 · 10:18 AM', agent: 'Amit Verma', reference: 'RCT-88199', status: 'Pending' }] },
    { ...customerDefaults, id: 'CUS-10479', name: 'Anita Devi', phone: '96XXXX1188', value: '₹2,500', accountSummary: '1 active account', status: 'Pending', address: '19 Station Lane, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Mohan Devi', nomineePhone: '96XXXX1188', nomineeRelation: 'Parent', assignedAgent: 'Neha Singh', registrationDate: '2026-08-08', services: [{ id: 'svc-6', type: 'RD', accountNumber: 'RD-2024099', label: 'Monthly recurring deposit', amount: '₹2,500 / month', detail: 'Due 10 Aug 2026', status: 'Pending' }], transactions: [{ id: 'TXN-20478', type: 'RD installment', amount: '₹2,500', date: '08 Aug 2026 · 09:56 AM', agent: 'Neha Singh', reference: 'RCT-88198', status: 'Review' }] },
    { ...customerDefaults, id: 'CUS-10478', name: 'Mohan Das', phone: '98XXXX1188', value: '₹0', accountSummary: 'No active accounts', status: 'Inactive', address: '2 Old Town, Jaipur, Rajasthan', customerType: 'Individual', nomineeName: 'Suresh Gupta', nomineePhone: '98XXXX1188', nomineeRelation: 'Sibling', assignedAgent: 'Unassigned', registrationDate: '2021-06-23', services: [], transactions: [] },
];

const clone = (customer: Customer) => ({ ...customer, services: [...customer.services], transactions: [...customer.transactions] });

export class MockCustomerRepository implements CustomerRepository {
    private records = seed.map(clone);
    async list(query: CustomerQuery = {}) {
        const search = query.search?.trim().toLowerCase() ?? '';
        return this.records.filter((customer) => {
            const haystack = `${customer.id} ${customer.name} ${customer.phone} ${customer.address} ${customer.assignedAgent} ${customer.services.map((service) => `${service.accountNumber} ${service.type}`).join(' ')}`.toLowerCase();
            return (!search || haystack.includes(search)) && (!query.status || query.status === 'All' || customer.status === query.status);
        }).map(clone);
    }
    async create(input: CustomerInput) {
        const id = `CUS-${10500 + this.records.length}`;
        const customer: Customer = { ...input, id, value: '₹0', accountSummary: 'No active accounts', services: [], transactions: [] };
        this.records = [customer, ...this.records];
        return clone(customer);
    }
    async update(id: string, input: CustomerInput) {
        const current = this.records.find((customer) => customer.id === id);
        if (!current) throw new Error('Customer record was not found.');
        const updated = { ...current, ...input };
        this.records = this.records.map((customer) => customer.id === id ? updated : customer);
        return clone(updated);
    }
}

export const customerRepository: CustomerRepository = new MockCustomerRepository();
