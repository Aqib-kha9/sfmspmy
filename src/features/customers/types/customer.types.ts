export type Status = 'Active' | 'Pending' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Matched';
export type CustomerType = 'Individual' | 'Cooperation' | 'Group' | 'SHG' | 'Organisation' | 'Minor' | 'Joint';
export type CustomerServiceType = 'Savings' | 'Recurring deposit' | 'Fixed deposit' | 'Loan';
export type CustomerTransactionType = 'Deposit collection' | 'RD installment' | 'Loan repayment' | 'Withdrawal' | 'Penalty';

/**
 * Service and transaction rows carry backend-authored status labels
 * (e.g. "Active", "Matured", "Completed"), so `status` is a plain string rather
 * than the fixed workflow-status union used by the customer record itself.
 */
export type CustomerService = { id: string; type: CustomerServiceType; accountNumber: string; label: string; amount: string; detail: string; status: string };
export type CustomerTransaction = { id: string; type: CustomerTransactionType; amount: string; date: string; agent: string; reference: string; status: string };

export type Customer = {
    id: string;
    name: string;
    phone: string;
    email: string;
    alternatePhone: string;
    value: string;
    accountSummary: string;
    status: Status;
    address: string;
    permanentAddress: string;
    customerType: CustomerType;
    dateOfBirth: string;
    gender: string;
    occupation: string;
    businessType: string;
    taxIdentifier: string;
    identityType: string;
    identityReference: string;
    kycMethod: string;
    kycVerifiedOn: string;
    amlRiskCategory: string;
    sourceOfFunds: string;
    communicationPreference: string;
    branch: string;
    nomineeName: string;
    nomineePhone: string;
    nomineeRelation: string;
    guardianName: string;
    guardianPhone: string;
    assignedAgent: string;
    consentCaptured: boolean;
    documentReferences: string;
    registrationDate: string;
    services: CustomerService[];
    transactions: CustomerTransaction[];
};

export type CustomerInput = Omit<Customer, 'id' | 'value' | 'accountSummary' | 'services' | 'transactions'>;
