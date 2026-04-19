const prisma = require('../services/prisma');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

const isDepartmentHead = async (req, res, next) => {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
      include: { headedDepartment: true },
    });

    if (!instructor?.headedDepartment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department head only.',
      });
    }

    req.departmentHead = instructor;
    req.department = instructor.headedDepartment;
    next();
  } catch (error) {
    console.error('Department head middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Aliases for convenience
const allowRoles = authorize;
const isStudent = authorize('STUDENT');
const isInstructor = authorize('INSTRUCTOR');
const isAdmin = authorize('ADMIN');
const isRegistrar = authorize('REGISTRAR');
const isInstructorOrAdmin = authorize('INSTRUCTOR', 'ADMIN');
const isAdminOrRegistrar = authorize('ADMIN', 'REGISTRAR');

module.exports = {
  authorize,
  allowRoles,
  isStudent,
  isInstructor,
  isAdmin,
  isRegistrar,
  isInstructorOrAdmin,
  isAdminOrRegistrar,
};