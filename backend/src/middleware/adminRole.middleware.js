const RANK = { REGISTRAR_ADMIN: 1, STAFF: 2, SUPER_ADMIN: 3 };

/**
 * Require minimum admin sub-role (for users with role ADMIN).
 * Defaults missing adminRole to SUPER_ADMIN (backward compatible).
 */
function requireAdminRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role !== 'ADMIN') {
      return next();
    }
    const effective = req.user.adminRole || 'SUPER_ADMIN';
    const need = RANK[minRole];
    const have = RANK[effective];
    if (have === undefined || need === undefined || have < need) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = requireAdminRole;
