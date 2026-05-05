import { useAuth } from '../context/AuthContext';

/**
 * Hook for Role-Based Access Control (RBAC) within the admin panel.
 * Reads the user's adminRole from auth context and provides role checks.
 * 
 * Admin role hierarchy:
 * - SUPER_ADMIN: Full access (all actions)
 * - STAFF: View and create only (no delete, no audit log)
 * - REGISTRAR_ADMIN: Student management only
 * 
 * @returns {Object} RBAC utilities
 * @returns {boolean} isSuperAdmin - True if user is SUPER_ADMIN
 * @returns {boolean} isStaff - True if user is STAFF
 * @returns {boolean} isRegistrarAdmin - True if user is REGISTRAR_ADMIN
 * @returns {Function} can - Function to check if user can perform an action
 */
export const useAdminRole = () => {
  const { user } = useAuth();
  
  // Default to SUPER_ADMIN behavior if adminRole is null (backward compatibility)
  const adminRole = user?.adminRole || 'SUPER_ADMIN';
  
  const isSuperAdmin = adminRole === 'SUPER_ADMIN';
  const isStaff = adminRole === 'STAFF';
  const isRegistrarAdmin = adminRole === 'REGISTRAR_ADMIN';
  
  /**
   * Check if the current admin user can perform a specific action.
   * 
   * @param {string} action - The action to check ('delete', 'create', 'viewAuditLog')
   * @returns {boolean} True if the user's role permits the action
   */
  const can = (action) => {
    // SUPER_ADMIN can do everything
    if (isSuperAdmin) {
      return true;
    }
    
    // STAFF can create but not delete or view audit logs
    if (isStaff) {
      if (action === 'create') return true;
      if (action === 'delete') return false;
      if (action === 'viewAuditLog') return false;
      return false;
    }
    
    // REGISTRAR_ADMIN has limited permissions (student management only)
    if (isRegistrarAdmin) {
      // REGISTRAR_ADMIN cannot delete, create academic entities, or view audit logs
      return false;
    }
    
    // Default deny for unknown roles
    return false;
  };
  
  return {
    isSuperAdmin,
    isStaff,
    isRegistrarAdmin,
    can,
  };
};

export default useAdminRole;
