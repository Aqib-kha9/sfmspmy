import { describe, expect, it } from 'vitest';
import { validateCustomer } from './customerSchemas';
import type { CustomerInput } from '../types/customer.types';

const validInput: CustomerInput = { name: 'Test Customer', phone: '9876543210', email: '', alternatePhone: '', customerType: 'Individual', status: 'Pending', address: 'Test address', permanentAddress: '', dateOfBirth: '', gender: '', maritalStatus: '', nationality: 'Indian', occupation: '', businessType: '', taxIdentifier: '', identityType: 'Aadhaar', identityReference: '', kycMethod: 'Document review', kycVerifiedOn: '', amlRiskCategory: 'Standard', sourceOfFunds: '', communicationPreference: 'SMS', branch: 'Jaipur Main Branch', nomineeName: 'Nominee', nomineePhone: '9876500000', nomineeRelation: 'Parent', guardianName: '', guardianPhone: '', assignedAgent: 'Unassigned', consentCaptured: false, documentReferences: '', registrationDate: '2026-08-22' };

describe('validateCustomer', () => {
    it('accepts the complete customer scope', () => expect(validateCustomer(validInput)).toEqual({ valid: true }));
    it('requires nominee details', () => expect(validateCustomer({ ...validInput, nomineeName: '' })).toEqual({ valid: false, message: 'Complete nominee details are required.' }));
});
