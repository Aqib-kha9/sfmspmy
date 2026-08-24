import type { CustomerInput } from '../types/customer.types';

export type ValidationResult = { valid: true } | { valid: false; message: string };

export function validateCustomer(input: CustomerInput): ValidationResult {
    if (!input.name.trim() || !input.phone.trim() || !input.address.trim()) return { valid: false, message: 'Name, mobile and registered address are required.' };
    if (!input.nomineeName.trim() || !input.nomineePhone.trim() || !input.nomineeRelation.trim()) return { valid: false, message: 'Complete nominee details are required.' };
    if (!input.registrationDate) return { valid: false, message: 'Registration date is required.' };
    return { valid: true };
}
