export type Permission = 'customers.read' | 'customers.write' | 'customers.export';

export type PermissionContext = { role: 'super_admin' | 'collection_agent'; permissions: Permission[] };

export function can(context: PermissionContext, permission: Permission) {
    return context.role === 'super_admin' || context.permissions.includes(permission);
}

export const adminPermissions: PermissionContext = {
    role: 'super_admin',
    permissions: ['customers.read', 'customers.write', 'customers.export'],
};
