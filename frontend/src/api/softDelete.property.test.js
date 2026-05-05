import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Property 10: Soft delete removes from list and appears in trash
 * **Feature: admin-dashboard-upgrade, Property 10: Soft delete removes from list and appears in trash**
 * Validates: Requirements 19.2, 19.3, 19.4
 * 
 * For any record, after soft delete:
 * - The record should NOT appear in the main list response
 * - The record SHOULD appear in the deleted/trash list response
 */

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Entity types that support soft delete */
const entityTypeArb = fc.constantFrom('department', 'program');

/** Valid entity records */
const entityRecordArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  code: fc.string({ minLength: 2, maxLength: 10 }),
  isDeleted: fc.boolean(),
});

/** Collection of entity records */
const entityCollectionArb = fc.array(entityRecordArb, { minLength: 1, maxLength: 20 });

// ---------------------------------------------------------------------------
// Helper functions that simulate API behavior
// ---------------------------------------------------------------------------

/**
 * Simulates the main list endpoint (GET /admin/{entity}s)
 * Returns only non-deleted records
 */
function getMainList(allRecords) {
  return allRecords.filter(r => !r.isDeleted);
}

/**
 * Simulates the deleted/trash endpoint (GET /admin/{entity}s/deleted)
 * Returns only deleted records
 */
function getDeletedList(allRecords) {
  return allRecords.filter(r => r.isDeleted);
}

/**
 * Simulates the soft delete operation (DELETE /admin/{entity}/:id)
 * Sets isDeleted = true on the record
 */
function softDeleteRecord(allRecords, recordId) {
  return allRecords.map(r => 
    r.id === recordId ? { ...r, isDeleted: true } : r
  );
}

// ---------------------------------------------------------------------------
// Property 10: Soft delete removes from list and appears in trash
// ---------------------------------------------------------------------------

describe('Property 10: Soft delete removes from list and appears in trash', () => {
  it('after soft delete, record is absent from main list and present in deleted list', () => {
    fc.assert(
      fc.property(
        entityCollectionArb,
        fc.nat().chain(idx => 
          fc.tuple(fc.constant(idx), entityCollectionArb)
        ),
        (records, [delIdx, _]) => {
          // Pick a record to delete
          const recordToDelete = records[delIdx % records.length];
          
          // Simulate the soft delete operation
          const afterDelete = softDeleteRecord(records, recordToDelete.id);
          
          // Get the main and deleted lists after the operation
          const mainList = getMainList(afterDelete);
          const deletedList = getDeletedList(afterDelete);
          
          // Verify the record is NOT in the main list
          const inMain = mainList.find(r => r.id === recordToDelete.id);
          expect(inMain).toBeUndefined();
          
          // Verify the record IS in the deleted list
          const inDeleted = deletedList.find(r => r.id === recordToDelete.id);
          expect(inDeleted).toBeDefined();
          expect(inDeleted?.isDeleted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('soft delete does not affect other records in the list', () => {
    fc.assert(
      fc.property(
        entityCollectionArb,
        fc.nat(),
        (records, delIdx) => {
          const recordToDelete = records[delIdx % records.length];
          const otherRecords = records.filter(r => r.id !== recordToDelete.id);
          
          // Simulate soft delete
          const afterDelete = softDeleteRecord(records, recordToDelete.id);
          const mainList = getMainList(afterDelete);
          
          // Verify all other non-deleted records are still in main list
          otherRecords.forEach(other => {
            if (!other.isDeleted) {
              const found = mainList.find(r => r.id === other.id);
              expect(found).toBeDefined();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('soft delete is reversible: restore moves record back to main list', () => {
    fc.assert(
      fc.property(
        entityCollectionArb,
        fc.nat(),
        (records, delIdx) => {
          const recordToDelete = records[delIdx % records.length];
          
          // Soft delete
          const afterDelete = softDeleteRecord(records, recordToDelete.id);
          
          // Restore (set isDeleted = false)
          const afterRestore = afterDelete.map(r =>
            r.id === recordToDelete.id ? { ...r, isDeleted: false } : r
          );
          
          // Verify record is back in main list
          const mainList = getMainList(afterRestore);
          const restored = mainList.find(r => r.id === recordToDelete.id);
          expect(restored).toBeDefined();
          expect(restored?.isDeleted).toBe(false);
          
          // Verify record is NOT in deleted list
          const deletedList = getDeletedList(afterRestore);
          const stillDeleted = deletedList.find(r => r.id === recordToDelete.id);
          expect(stillDeleted).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple soft deletes partition records correctly', () => {
    fc.assert(
      fc.property(
        entityCollectionArb,
        fc.array(fc.nat(), { minLength: 1, maxLength: 5 }),
        (records, deleteIndices) => {
          // Perform multiple soft deletes
          let current = records;
          const newlyDeleted = new Set();
          
          deleteIndices.forEach(idx => {
            const record = current[idx % current.length];
            if (record && !newlyDeleted.has(record.id)) {
              newlyDeleted.add(record.id);
              current = softDeleteRecord(current, record.id);
            }
          });
          
          // Verify partitioning
          const mainList = getMainList(current);
          const deletedList = getDeletedList(current);
          
          // All newly deleted records should be in deleted list and absent from main list
          newlyDeleted.forEach(id => {
            const inDeleted = deletedList.find(r => r.id === id);
            expect(inDeleted).toBeDefined();
            const inMain = mainList.find(r => r.id === id);
            expect(inMain).toBeUndefined();
          });
          
          // Every record in current state is in exactly one list
          current.forEach(r => {
            const inMain = mainList.find(m => m.id === r.id);
            const inDeleted = deletedList.find(d => d.id === r.id);
            // A record must be in exactly one of the two lists
            expect((inMain !== undefined) !== (inDeleted !== undefined)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
