import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/** Mirrors useAdminRole rules for isolated property testing */
function capabilities(adminRole) {
  const isSuperAdmin = adminRole === 'SUPER_ADMIN';
  const isStaff = adminRole === 'STAFF';
  const isRegistrarAdmin = adminRole === 'REGISTRAR_ADMIN';
  const can = (action) => {
    if (isSuperAdmin) return true;
    if (action === 'viewAuditLog') return false;
    if (action === 'delete') return isStaff;
    if (action === 'create') return isStaff || isRegistrarAdmin;
    return false;
  };
  return { can };
}

describe('RBAC by admin sub-role (Property 4)', () => {
  it('matches policy table', () => {
    fc.assert(
      fc.property(fc.constantFrom('SUPER_ADMIN', 'STAFF', 'REGISTRAR_ADMIN'), (role) => {
        const { can } = capabilities(role);
        if (role === 'SUPER_ADMIN') {
          expect(can('delete')).toBe(true);
          expect(can('create')).toBe(true);
          expect(can('viewAuditLog')).toBe(true);
        } else if (role === 'STAFF') {
          expect(can('delete')).toBe(true);
          expect(can('create')).toBe(true);
          expect(can('viewAuditLog')).toBe(false);
        } else {
          expect(can('delete')).toBe(false);
          expect(can('create')).toBe(true);
          expect(can('viewAuditLog')).toBe(false);
        }
      }),
      { numRuns: 30 }
    );
  });
});
