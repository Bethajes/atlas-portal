const prisma = require('../services/prisma');

/**
 * @desc    Create an audit log entry
 */
const logAction = async (userId, action, resource, details = {}, ipAddress = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

/**
 * Admin-friendly audit entry (resource = entity type string, entityName in details).
 */
const logAudit = async (userId, action, entity, entityName, details = {}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: entity,
        details: { ...details, entityName },
      },
    });
  } catch (error) {
    console.error('logAudit error:', error);
  }
};

module.exports = logAction;
module.exports.logAudit = logAudit;
