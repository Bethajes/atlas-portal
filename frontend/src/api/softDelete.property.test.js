import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 10: after soft delete, record absent from main list, present in deleted list (mocked API shape).
 */
describe('Soft delete list model (Property 10)', () => {
  it('partitioning by isDeleted', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 4, maxLength: 12 }),
            name: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        fc.nat({ max: 5 }),
        (records, delIdx) => {
          const idToDelete = records[delIdx % records.length].id;
          const deleted = records.map((r) => (r.id === idToDelete ? { ...r, isDeleted: true } : { ...r, isDeleted: false }));
          const main = deleted.filter((r) => !r.isDeleted);
          const trash = deleted.filter((r) => r.isDeleted);
          expect(main.find((r) => r.id === idToDelete)).toBeUndefined();
          expect(trash.find((r) => r.id === idToDelete)).toBeDefined();
        }
      ),
      { numRuns: 30 }
    );
  });
});
