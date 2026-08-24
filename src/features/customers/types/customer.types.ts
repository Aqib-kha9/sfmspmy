export type Status = 'Active' | 'Pending' | 'Completed' | 'Review' | 'Overdue' | 'Inactive' | 'Rejected' | 'Matched';
export type CustomerType = 'Individual' | 'Business';
export type CustomerServiceType = 'Deposit' | 'RD' | 'FD' | 'Loan';
export type CustomerTransactionType = 'Deposit collection' | 'RD installment' | 'Loan repayment' | 'Withdrawal';

export type CustomerService = { id: string; type: CustomerServiceType; accountNumber: string; label: string; amount: string; detail: string; status: Status };
export type CustomerTransaction = { id: string; type: CustomerTransactionType; amount: string; date: string; agent: string; reference: string; status: Status };

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
    maritalStatus: string;
    nationality: string;
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
