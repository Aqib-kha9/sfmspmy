import type { Customer, CustomerInput } from '../types/customer.types';

export type CustomerQuery = { search?: string; status?: Customer['status'] | 'All' };

export interface CustomerRepository {
    list(query?: CustomerQuery): Promise<Customer[]>;
    create(input: CustomerInput): Promise<Customer>;
    update(id: string, input: CustomerInput): Promise<Customer>;
}
