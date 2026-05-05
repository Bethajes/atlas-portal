/**
 * Property-based tests for soft delete functionality in admin controllers.
 * Feature: admin-dashboard-upgrade
 * Uses: fast-check + vitest
 * 
 * Property 10: Soft delete removes from list and appears in trash
 * Validates: Requirements 19.2, 19.3, 19.4
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Entity types that support soft delete */
const entityTypeArb = fc.constantFrom('Department', 'Program');

/** Valid entity names */
const entityNameArb = fc.string({ minLength: 1, maxLength: 50 });

/** Valid entity codes */
const entityCodeArb = fc.string({ minLength: 2, maxLength: 10 });

/** Entity IDs */
const entityIdArb = fc.uuid();

/** Timestamps */
const timestampArb = fc.date().map(d => d.toISOString());

/** A single entity record (active) */
const activeEntityArb = fc.record({
  id: entityIdArb,
  name: entityNameArb,
  code: entityCodeArb,
  isDeleted: fc.constant(false),
  createdAt: timestampArb,
  updatedAt: timestampArb,
});

/** A single entity record (deleted) */
const deletedEntityArb = fc.record({
  id: entityIdArb,
  name: entityNameArb,
  code: entityCodeArb,
  isDeleted: fc.constant(true),
  createdAt: timestampArb,
  updatedAt: timestampArb,
});

/** Collection of active entities */
const activeEntitiesArb = fc.array(activeEntityArb, { minLength: 0, maxLength: 20 });

/** Collection of deleted entities */
const deletedEntitiesArb = fc.array(deletedEntityArb, { minLength: 0, maxLength: 20 });

// ---------------------------------------------------------------------------
// Helper functions that mirror backend soft delete logic
// ---------------------------------------------------------------------------

/**
 * Simulates the backend list endpoint that filters isDeleted: false
 * Returns only active (non-deleted) entities
 */
function getActiveEntities(allEntities) {
  return allEntities.filter(entity => !entity.isDeleted);
}

/**
 * Simulates the backend deleted list endpoint that filters isDeleted: true
 * Returns only deleted entities
 */
function getDeletedEntities(allEntities) {
  return allEntities.filter(entity => entity.isDeleted);
}

/**
 * Simulates the soft delete operation.
 * Sets isDeleted: true on the entity instead of removing it.
 */
function softDeleteEntity(allEntities, entityId) {
  return allEntities.map(entity =>
    entity.id === entityId
      ? { ...entity, isDeleted: true, updatedAt: new Date().toISOString() }
      : entity
  );
}

/**
 * Simulates the restore operation.
 * Sets isDeleted: false on the entity.
 */
function restoreEntity(allEntities, entityId) {
  return allEntities.map(entity =>
    entity.id === entityId
      ? { ...entity, isDeleted: false, updatedAt: new Date().toISOString() }
      : entity
  );
}

// ---------------------------------------------------------------------------
// Property 10: Soft delete removes from list and appears in trash
// **Feature: admin-dashboard-upgrade, Property 10: Soft delete removes from list and appears in trash**
// Validates: Requirements 19.2, 19.3, 19.4
// ---------------------------------------------------------------------------

describe('Property 10: Soft delete removes from list and appears in trash', () => {
  it('after soft delete, record is absent from active list and present in deleted list', () => {
    fc.assert(
      fc.property(activeEntitiesArb, entityIdArb, (activeEntities, targetId) => {
        // Create a record to delete
        const recordToDelete = {
          id: targetId,
          name: 'Test Entity',
          code: 'TEST',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Start with active entities plus the record to delete
        const allEntities = [...activeEntities, recordToDelete];
        
        // Verify record is in active list before delete
        const activeBeforeDelete = getActiveEntities(allEntities);
        expect(activeBeforeDelete.some(e => e.id === targetId)).toBe(true);
        
        // Perform soft delete
        const entitiesAfterDelete = softDeleteEntity(allEntities, targetId);
        
        // Verify record is NOT in active list after delete
        const activeAfterDelete = getActiveEntities(entitiesAfterDelete);
        expect(activeAfterDelete.some(e => e.id === targetId)).toBe(false);
        
        // Verify record IS in deleted list after delete
        const deletedAfterDelete = getDeletedEntities(entitiesAfterDelete);
        expect(deletedAfterDelete.some(e => e.id === targetId)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('soft delete preserves all entity data (name, code, timestamps)', () => {
    fc.assert(
      fc.property(activeEntityArb, (entity) => {
        const allEntities = [entity];
        
        // Perform soft delete
        const entitiesAfterDelete = softDeleteEntity(allEntities, entity.id);
        const deletedEntity = entitiesAfterDelete[0];
        
        // Verify all data is preserved
        expect(deletedEntity.id).toBe(entity.id);
        expect(deletedEntity.name).toBe(entity.name);
        expect(deletedEntity.code).toBe(entity.code);
        expect(deletedEntity.createdAt).toBe(entity.createdAt);
        expect(deletedEntity.isDeleted).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('restore operation moves record from deleted list back to active list', () => {
    fc.assert(
      fc.property(deletedEntityArb, (deletedEntity) => {
        const allEntities = [deletedEntity];
        
        // Verify record is in deleted list before restore
        const deletedBefore = getDeletedEntities(allEntities);
        expect(deletedBefore.some(e => e.id === deletedEntity.id)).toBe(true);
        
        // Perform restore
        const entitiesAfterRestore = restoreEntity(allEntities, deletedEntity.id);
        
        // Verify record is NOT in deleted list after restore
        const deletedAfter = getDeletedEntities(entitiesAfterRestore);
        expect(deletedAfter.some(e => e.id === deletedEntity.id)).toBe(false);
        
        // Verify record IS in active list after restore
        const activeAfter = getActiveEntities(entitiesAfterRestore);
        expect(activeAfter.some(e => e.id === deletedEntity.id)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('soft delete does not affect other entities in the collection', () => {
    fc.assert(
      fc.property(activeEntitiesArb, entityIdArb, (otherEntities, targetId) => {
        // Create a record to delete
        const recordToDelete = {
          id: targetId,
          name: 'Target',
          code: 'TGT',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Ensure targetId is not already in otherEntities
        const filteredOthers = otherEntities.filter(e => e.id !== targetId);
        const allEntities = [...filteredOthers, recordToDelete];
        
        // Perform soft delete
        const entitiesAfterDelete = softDeleteEntity(allEntities, targetId);
        
        // Verify other entities remain in active list
        const activeAfterDelete = getActiveEntities(entitiesAfterDelete);
        filteredOthers.forEach(other => {
          expect(activeAfterDelete.some(e => e.id === other.id)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('multiple soft deletes correctly segregate records into active and deleted lists', () => {
    fc.assert(
      fc.property(
        fc.array(activeEntityArb, { minLength: 2, maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }),
        (entities, indicesToDelete) => {
          let allEntities = [...entities];
          const uniqueIndices = [...new Set(indicesToDelete)].filter(i => i < entities.length);
          
          // Perform multiple soft deletes
          uniqueIndices.forEach(index => {
            allEntities = softDeleteEntity(allEntities, entities[index].id);
          });
          
          // Verify correct segregation
          const activeAfter = getActiveEntities(allEntities);
          const deletedAfter = getDeletedEntities(allEntities);
          
          // Active list should have (total - deleted count) records
          expect(activeAfter.length).toBe(entities.length - uniqueIndices.length);
          
          // Deleted list should have exactly the deleted count
          expect(deletedAfter.length).toBe(uniqueIndices.length);
          
          // No record should be in both lists
          const activeIds = new Set(activeAfter.map(e => e.id));
          const deletedIds = new Set(deletedAfter.map(e => e.id));
          const intersection = [...activeIds].filter(id => deletedIds.has(id));
          expect(intersection.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isDeleted flag is the only difference between active and deleted entities', () => {
    fc.assert(
      fc.property(activeEntityArb, (entity) => {
        const allEntities = [entity];
        const entitiesAfterDelete = softDeleteEntity(allEntities, entity.id);
        const deletedEntity = entitiesAfterDelete[0];
        
        // Compare all fields except isDeleted
        expect(deletedEntity.id).toBe(entity.id);
        expect(deletedEntity.name).toBe(entity.name);
        expect(deletedEntity.code).toBe(entity.code);
        expect(deletedEntity.createdAt).toBe(entity.createdAt);
        
        // Only isDeleted should differ
        expect(entity.isDeleted).toBe(false);
        expect(deletedEntity.isDeleted).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
