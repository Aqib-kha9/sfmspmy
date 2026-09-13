// API contracts: Customers (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Customers (backend/src/modules/customers/customers.service.ts)
// ---------------------------------------------------------------------------

export type CustomerStatus =
    | 'active'
    | 'inactive'
    | 'blocked'
    | 'deceased'
    | 'transferred'
    | 'closed'
    | 'restricted'
    | 'deleted';

export type CustomerType =
    | 'Individual'
    | 'Cooperation'
    | 'Group'
    | 'SHG'
    | 'Organisation'
    | 'Minor'
    | 'Joint';

export type MembershipCategory = 'Loan' | 'Savings' | 'Daily' | 'RD' | 'Current';

export interface CustomerAddress {
    addressType: 'permanent' | 'current' | 'work' | 'collection';
    line1: string;
    line2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    landmark: string | null;
}

export interface CustomerIdentityDocument {
    id: string;
    documentType: string;
    documentNumber: string;
    issueDate: string | null;
    expiryDate: string | null;
    issuingAuthority: string | null;
    copyReference: string | null;
    isVerified: boolean;
}

export interface CustomerView {
    id: string;
    customerNumber: string | null;
    customerType: CustomerType;
    fullName: string;
    dateOfBirth: string | null;
    gender: string | null;
    occupation: string | null;
    businessType: string | null;
    mobile: string;
    alternatePhone: string | null;
    email: string | null;
    branchId: string;
    branchName: string | null;
    membershipCategory: MembershipCategory;
    status: CustomerStatus;
    riskCategory: string | null;
    amlRisk: string | null;
    sourceOfFunds: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
    kycMethod: string | null;
    registrationDate: string;
    mergedIntoCustomerId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerKyc {
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    method: string | null;
    verifiedByStaffId: string | null;
    verifiedBy: string | null;
    verifiedOn: string | null;
    rejectionReason: string | null;
    expiresOn: string | null;
}

export interface CustomerNominee {
    id: string;
    name: string;
    relationship: string;
    dateOfBirth: string | null;
    identityDocumentType: string | null;
    identityDocumentNumber: string | null;
    address: string | null;
    phone: string | null;
    sharePercentage: string;
    guardianName: string | null;
    guardianPhone: string | null;
    isCurrent: boolean;
}

export interface CustomerConsent {
    channel: string;
    granted: boolean;
    grantedAt: string | null;
    revokedAt: string | null;
}

export interface CustomerComplaint {
    id: string;
    category: string | null;
    description: string;
    status: string;
    createdAt: string;
}

export interface CustomerServiceView {
    id: string;
    type: 'Savings' | 'Recurring deposit' | 'Fixed deposit' | 'Loan';
    accountNumber: string;
    label: string;
    amount: string;
    detail: string;
    status: string;
}

export interface CustomerTransactionView {
    id: string;
    type: 'Deposit collection' | 'RD installment' | 'Loan repayment' | 'Withdrawal' | 'Penalty';
    amount: string;
    date: string;
    agent: string;
    reference: string;
    status: string;
}

export interface CustomerDetailView extends CustomerView {
    addresses: CustomerAddress[];
    identityDocuments: CustomerIdentityDocument[];
    kyc: CustomerKyc | null;
    nominee: CustomerNominee | null;
    consents: CustomerConsent[];
    complaints: CustomerComplaint[];
    assignedAgent: string | null;
    accountSummary: string;
    totalValue: string;
    services: CustomerServiceView[];
    transactions: CustomerTransactionView[];
}

export interface CustomerListResult {
    total: number;
    items: CustomerView[];
}

export interface CreateCustomerInput {
    fullName: string;
    customerType?: CustomerType;
    mobile: string;
    alternatePhone?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    occupation?: string | null;
    businessType?: string | null;
    branchId: string;
    membershipCategory?: MembershipCategory;
    riskCategory?: string | null;
    amlRisk?: string | null;
    sourceOfFunds?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    kycMethod?: string | null;
    addresses: Array<{
        addressType: CustomerAddress['addressType'];
        line1: string;
        line2?: string | null;
        city?: string | null;
        district?: string | null;
        state?: string | null;
        pincode?: string | null;
        landmark?: string | null;
    }>;
    identityDocuments?: Array<{
        documentType: string;
        documentNumber: string;
        issueDate?: string | null;
        expiryDate?: string | null;
        issuingAuthority?: string | null;
        copyReference?: string | null;
        isVerified?: boolean;
    }>;
}

export type UpdateCustomerInput = Partial<
    Pick<
        CreateCustomerInput,
        | 'fullName'
        | 'customerType'
        | 'mobile'
        | 'alternatePhone'
        | 'email'
        | 'dateOfBirth'
        | 'gender'
        | 'occupation'
        | 'businessType'
        | 'riskCategory'
        | 'amlRisk'
        | 'sourceOfFunds'
        | 'guardianName'
        | 'guardianPhone'
        | 'kycMethod'
    >
> & {
    addresses?: CreateCustomerInput['addresses'];
    identityDocuments?: CreateCustomerInput['identityDocuments'];
};
