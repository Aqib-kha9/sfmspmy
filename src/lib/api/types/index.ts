/**
* Shared API types — mirrored from the backend view contracts
 * (backend modules' service.ts interfaces). These describe exactly what
 * the /api/v1 surface returns so the panel never relies on mock shapes.
 *
 * Barrel of per-domain API contract modules. Consumers keep importing from
 * `lib/api/types`; each domain lives in its own file so no single module
 * becomes an unmaintainable monolith.
 */
export * from './identity';
export * from './customers';
export * from './dashboard';
export * from './settings';
export * from './profile';
export * from './withdrawals';
export * from './reconciliation';
export * from './agents';
export * from './reports';
export * from './audit';
export * from './notifications';
export * from './collections';
export * from './deposits';
export * from './rd';
export * from './fd';
export * from './loans';
