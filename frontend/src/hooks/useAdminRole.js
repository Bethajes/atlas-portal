import { useAuth } from '../context/AuthContext';

/**
 * Admin sub-roles (JWT + /auth/me). Defaults missing adminRole to SUPER_ADMIN for ADMIN users.
 */
export function useAdminRole() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const adminRole = isAdmin ? (user?.adminRole ?? 'SUPER_ADMIN') : null;

  const isSuperAdmin = isAdmin && adminRole === 'SUPER_ADMIN';
  const isStaff = isAdmin && adminRole === 'STAFF';
  const isRegistrarAdmin = isAdmin && adminRole === 'REGISTRAR_ADMIN';

  const can = (action) => {
    if (!isAdmin) return false;
    if (isSuperAdmin) return true;
    if (action === 'viewAuditLog') return false;
    if (action === 'delete') return isStaff;
    if (action === 'create') return isStaff || isRegistrarAdmin;
    return false;
  };

  return {
    isAdmin,
    adminRole,
    isSuperAdmin,
    isStaff,
    isRegistrarAdmin,
    can,
  };
}
