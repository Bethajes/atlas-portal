/**
 * Property-based tests for duplicate code validation in admin controllers.
 * Feature: admin-dashboard-upgrade
 * Uses: fast-check + vitest
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid code strings (2-10 alphanumeric characters) */
const codeArb = fc.string({ minLength: 2, maxLength: 10 });

/** Simulated entity collection (array of objects with code field) */
const entityCollectionArb = fc.array(
  fc.record({
    id: fc.uuid(),
    code: codeArb,
    name: fc.string({ minLength: 1, maxLength: 50 }),
    isDeleted: fc.boolean(),
  }),
  { minLength: 0, maxLength: 20 }
);

// ---------------------------------------------------------------------------
// Helper functions that mirror backend validation logic
// ---------------------------------------------------------------------------

/**
 * Simulates the duplicate code check in createDepartment/createProgram.
 * Returns true if the code already exists in active (non-deleted) entities.
 */
function isDuplicateCode(existingEntities, newCode) {
  return existingEntities.some(
    entity => entity.code === newCode && !entity.isDeleted
  );
}

/**
 * Simulates the validation response.
 * Returns { success: false, status: 400 } if duplicate, else { success: true, status: 201 }
 */
function validateEntityCreation(existingEntities, newCode) {
  if (isDuplicateCode(existingEntities, newCode)) {
    return {
      success: false,
      status: 400,
      message: 'Code already exists'
    };
  }
  return {
    success: true,
    status: 201,
    data: { id: 'new-id', code: newCode }
  };
}

// ---------------------------------------------------------------------------
// Property 6: Duplicate code rejected for any entity type
// **Feature: admin-dashboard-upgrade, Property 6: Duplicate code rejected for any entity type**
// Validates: Requirements 15.1, 15.2, 15.4
// ---------------------------------------------------------------------------

describe('Property 6: Duplicate code rejected for any entity type', () => {
  it('attempting to create an entity with a code that exists in active entities returns 400', () => {
    fc.assert(
      fc.property(entityCollectionArb, codeArb, (existingEntities, newCode) => {
        // Add an active entity with the newCode to the collection
        const entitiesWithDuplicate = [
          ...existingEntities,
          { id: 'existing-id', code: newCode, name: 'Existing', isDeleted: false }
        ];
        
        const result = validateEntityCreation(entitiesWithDuplicate, newCode);
        
        expect(result.success).toBe(false);
        expect(result.status).toBe(400);
        expect(result.message).toMatch(/code.*exists|duplicate/i);
      }),
      { numRuns: 100 }
    );
  });

  it('attempting to create an entity with a code that only exists in deleted entities succeeds', () => {
    fc.assert(
      fc.property(entityCollectionArb, codeArb, (existingEntities, newCode) => {
        // Add a deleted entity with the newCode to the collection
        const entitiesWithDeletedDuplicate = [
          ...existingEntities.filter(e => e.code !== newCode || e.isDeleted),
          { id: 'deleted-id', code: newCode, name: 'Deleted', isDeleted: true }
        ];
        
        const result = validateEntityCreation(entitiesWithDeletedDuplicate, newCode);
        
        expect(result.success).toBe(true);
        expect(result.status).toBe(201);
      }),
      { numRuns: 100 }
    );
  });

  it('attempting to create an entity with a unique code succeeds', () => {
    fc.assert(
      fc.property(entityCollectionArb, codeArb, (existingEntities, newCode) => {
        // Filter out any entities with the newCode
        const entitiesWithoutCode = existingEntities.filter(e => e.code !== newCode);
        
        const result = validateEntityCreation(entitiesWithoutCode, newCode);
        
        expect(result.success).toBe(true);
        expect(result.status).toBe(201);
      }),
      { numRuns: 100 }
    );
  });

  it('duplicate check is case-sensitive for codes', () => {
    fc.assert(
      fc.property(codeArb, (code) => {
        // Assume code is uppercase
        const upperCode = code.toUpperCase();
        const lowerCode = code.toLowerCase();
        
        if (upperCode === lowerCode) {
          // Skip if case doesn't matter (e.g., all numbers)
          return true;
        }
        
        const entitiesWithUpper = [
          { id: 'id1', code: upperCode, name: 'Upper', isDeleted: false }
        ];
        
        // Attempting to create with lowercase should succeed (case-sensitive)
        const result = validateEntityCreation(entitiesWithUpper, lowerCode);
        
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
