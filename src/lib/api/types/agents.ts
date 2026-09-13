// API contracts: Agents (mirrored from the backend service views).
import type { DayCloseStatus } from './reconciliation';

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AgentStatus =
    | 'pending'
    | 'active'
    | 'suspended'
    | 'deactivated'
    | 'locked';

export type RouteExchangeStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'completed'
    | 'cancelled';

export interface AgentView {
    id: string;
    staffId: string;
    staffCode: string | null;
    fullName: string | null;
    branchId: string | null;
    branchCode: string | null;
    branchName: string | null;
    agentCode: string;
    phone: string | null;
    email: string | null;
    status: AgentStatus;
    resumeReference: string | null;
    verificationReference: string | null;
    idProofType: string | null;
    idProofReference: string | null;
    addressProofType: string | null;
    addressProofReference: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    trainingStatus: string | null;
    startDate: string | null;
    endDate: string | null;
    dailyCashLimit: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AgentListResult {
    items: AgentView[];
    total: number;
}

export interface RouteExchangeView {
    id: string;
    fromAgentId: string;
    toAgentId: string;
    routeId: string | null;
    customerIds: string[];
    startDate: string;
    endDate: string | null;
    reason: string;
    status: RouteExchangeStatus;
    requestedBy: string | null;
    requestedByName: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    approvedOn: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface OutOfAreaApprovalResult {
    approvalId: string;
    agentId: string;
    customerId: string | null;
    businessDate: string;
    reason: string;
    createdAt: string;
}

export interface DisableDeviceResult {
    deviceId: string;
    disabled: boolean;
    disabledAt: string;
}

export interface PerformanceEntryView {
    agentId: string;
    agentCode: string;
    agentName: string | null;
    businessDate: string;
    collectionCount: number;
    collectionAmount: number;
    visitCount: number;
    customerCount: number;
}

export interface AgentPerformanceResult {
    items: PerformanceEntryView[];
    total: number;
}

export interface AssignedCustomerView {
    customerId: string;
    customerNumber: string;
    fullName: string;
    phone: string | null;
    address: string | null;
    status: string;
    routeId: string | null;
    assignedOn: string;
}

export interface AssignedProductView {
    productType: string;
    productId: string;
    productName: string;
    accountCount: number;
}

export interface DayTotalsView {
    businessDate: string;
    collectionCount: number;
    collectionAmount: number;
    cashAmount: number;
    digitalAmount: number;
    visitCount: number;
    customerCount: number;
}

export interface DayCloseResult {
    dayCloseId: string;
    businessDate: string;
    status: DayCloseStatus;
    submittedAt: string;
}

export interface FieldVerificationView {
    id: string;
    agentId: string;
    customerId: string;
    verificationType: string;
    status: string;
    notes: string | null;
    verifiedOn: string;
    createdAt: string;
}

export type OnboardAgentInput = {
    staffId: string;
    agentCode: string;
    branchId?: string | null;
    phone?: string;
    email?: string;
    resumeReference?: string;
    verificationReference?: string;
    idProofType: string;
    idProofReference: string;
    addressProofType: string;
    addressProofReference: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    trainingStatus?: string;
    startDate?: string | null;
    endDate?: string | null;
    dailyCashLimit?: string;
};

export type UpdateAgentInput = {
    branchId?: string | null;
    phone?: string | null;
    email?: string | null;
    resumeReference?: string | null;
    verificationReference?: string | null;
    idProofType?: string | null;
    idProofReference?: string | null;
    addressProofType?: string | null;
    addressProofReference?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    trainingStatus?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    dailyCashLimit?: string | null;
};

export type ListAgentsQuery = {
    status?: AgentStatus;
    branchId?: string;
    q?: string;
    limit?: number;
    offset?: number;
};

export type AgentAssignmentInput = {
    customerIds: string[];
    reason?: string;
    effectiveFrom?: string;
};

export type RouteExchangeInput = {
    toAgentId: string;
    routeId?: string | null;
    customerIds?: string[];
    startDate: string;
    endDate?: string | null;
    reason: string;
};

export type OutOfAreaApprovalInput = {
    customerId?: string;
    businessDate?: string;
    reason: string;
};

export type DisableDeviceInput = {
    reason: string;
};

export type AgentPerformanceQuery = {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
};
