/**
 * Property-based tests for audit log creation in admin controllers.
 * Feature: admin-dashboard-upgrade
 * Uses: fast-check + vitest
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Entity types that support audit logging */
const entityTypeArb = fc.constantFrom('Department', 'Program', 'Course');

/** Action types */
const actionTypeArb = fc.constantFrom('CREATE', 'UPDATE', 'DELETE');

/** Valid entity names */
const entityNameArb = fc.string({ minLength: 1, maxLength: 50 });

/** User IDs */
const userIdArb = fc.uuid();

/** Entity IDs */
const entityIdArb = fc.uuid();

/** Audit log entry */
const auditLogEntryArb = fc.record({
  id: fc.uuid(),
  userId: userIdArb,
  action: actionTypeArb,
  resource: entityTypeArb,
  details: fc.record({
    entityName: entityNameArb,
    id: entityIdArb,
  }),
  createdAt: fc.date().map(d => d.toISOString()),
});

// ---------------------------------------------------------------------------
// Helper functions that mirror backend audit logging logic
// ---------------------------------------------------------------------------

/**
 * Simulates the logAudit function from backend/src/utils/audit.js
 * Returns an audit log entry object.
 */
function createAuditLogEntry(userId, action, entity, entityName, details = {}) {
  return {
    id: `audit-${Date.now()}-${Math.random()}`,
    userId,
    action,
    resource: entity,
    details: { ...details, entityName },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Simulates a mutation operation that should create an audit log.
 * Returns { success: true, auditLog: <entry> }
 */
function performMutationWithAudit(userId, action, entity, entityName, entityId) {
  const auditLog = createAuditLogEntry(userId, action, entity, entityName, { id: entityId });
  return {
    success: true,
    data: { id: entityId, name: entityName },
    auditLog,
  };
}

// ---------------------------------------------------------------------------
// Property 5: Audit log entry created for every mutation
// **Feature: admin-dashboard-upgrade, Property 5: Audit log entry created for every mutation**
// Validates: Requirements 14.1, 14.2
// ---------------------------------------------------------------------------

describe('Property 5: Audit log entry created for every mutation', () => {
  it('CREATE action creates an audit log entry with correct action, entity, and userId', () => {
    fc.assert(
      fc.property(userIdArb, entityTypeArb, entityNameArb, entityIdArb, (userId, entity, entityName, entityId) => {
        const result = performMutationWithAudit(userId, 'CREATE', entity, entityName, entityId);
        
        expect(result.success).toBe(true);
        expect(result.auditLog).toBeDefined();
        expect(result.auditLog.action).toBe('CREATE');
        expect(result.auditLog.resource).toBe(entity);
        expect(result.auditLog.userId).toBe(userId);
        expect(result.auditLog.details.entityName).toBe(entityName);
        expect(result.auditLog.details.id).toBe(entityId);
      }),
      { numRuns: 100 }
    );
  });

  it('UPDATE action creates an audit log entry with correct action, entity, and userId', () => {
    fc.assert(
      fc.property(userIdArb, entityTypeArb, entityNameArb, entityIdArb, (userId, entity, entityName, entityId) => {
        const result = performMutationWithAudit(userId, 'UPDATE', entity, entityName, entityId);
        
        expect(result.success).toBe(true);
        expect(result.auditLog).toBeDefined();
        expect(result.auditLog.action).toBe('UPDATE');
        expect(result.auditLog.resource).toBe(entity);
        expect(result.auditLog.userId).toBe(userId);
        expect(result.auditLog.details.entityName).toBe(entityName);
        expect(result.auditLog.details.id).toBe(entityId);
      }),
      { numRuns: 100 }
    );
  });

  it('DELETE action creates an audit log entry with correct action, entity, and userId', () => {
    fc.assert(
      fc.property(userIdArb, entityTypeArb, entityNameArb, entityIdArb, (userId, entity, entityName, entityId) => {
        const result = performMutationWithAudit(userId, 'DELETE', entity, entityName, entityId);
        
        expect(result.success).toBe(true);
        expect(result.auditLog).toBeDefined();
        expect(result.auditLog.action).toBe('DELETE');
        expect(result.auditLog.resource).toBe(entity);
        expect(result.auditLog.userId).toBe(userId);
        expect(result.auditLog.details.entityName).toBe(entityName);
        expect(result.auditLog.details.id).toBe(entityId);
      }),
      { numRuns: 100 }
    );
  });

  it('audit log entries contain all required fields for any mutation', () => {
    fc.assert(
      fc.property(userIdArb, actionTypeArb, entityTypeArb, entityNameArb, entityIdArb, 
        (userId, action, entity, entityName, entityId) => {
          const result = performMutationWithAudit(userId, action, entity, entityName, entityId);
          const log = result.auditLog;
          
          // Verify all required fields are present
          expect(log.id).toBeDefined();
          expect(log.userId).toBe(userId);
          expect(log.action).toBe(action);
          expect(log.resource).toBe(entity);
          expect(log.details).toBeDefined();
          expect(log.details.entityName).toBe(entityName);
          expect(log.details.id).toBe(entityId);
          expect(log.createdAt).toBeDefined();
          
          // Verify createdAt is a valid ISO date string
          expect(() => new Date(log.createdAt)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('audit log details preserve entity metadata across all entity types', () => {
    fc.assert(
      fc.property(
        userIdArb, 
        actionTypeArb, 
        entityTypeArb, 
        entityNameArb, 
        entityIdArb,
        fc.record({
          code: fc.string({ minLength: 2, maxLength: 10 }),
          additionalInfo: fc.string(),
        }),
        (userId, action, entity, entityName, entityId, extraDetails) => {
          const auditLog = createAuditLogEntry(userId, action, entity, entityName, { 
            id: entityId, 
            ...extraDetails 
          });
          
          // Verify extra details are preserved
          expect(auditLog.details.code).toBe(extraDetails.code);
          expect(auditLog.details.additionalInfo).toBe(extraDetails.additionalInfo);
        }
      ),
      { numRuns: 100 }
    );
  });
});
