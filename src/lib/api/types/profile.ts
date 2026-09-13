// API contracts: Permissions-driven profile (mirrored from the backend service views).
import type { Permission, StaffRole } from '../../permissions/permissions';

// ---------------------------------------------------------------------------
// Permissions-driven profile
// ---------------------------------------------------------------------------

export interface StaffProfile {
    id: string;
    staffCode: string;
    fullName: string;
    role: StaffRole;
    roleLabel: string;
    branchId: string | null;
    branchName: string | null;
    permissions: Permission[];
}
