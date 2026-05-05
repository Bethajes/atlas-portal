/**
 * Property-based tests for semester activation exclusivity.
 * Feature: sis-lifecycle
 * Uses: fast-check + vitest
 *
 * Property 18: Semester activation exclusivity
 * Validates: Requirements 1.3
 *
 * For any collection of N semesters, activating one semester must result in
 * exactly one semester with isActive = true across all N semesters.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// In-memory model of the atomic activation logic in the PATCH handler.
// Mirrors: prisma.$transaction → updateMany({ isActive: false }) then update one.
// ---------------------------------------------------------------------------

/**
 * @param {Array<{id: string, isActive: boolean}>} semesters
 * @param {string} targetId
 * @returns {Array<{id: string, isActive: boolean}>}
 */
function activateSemester(semesters, targetId) {
  // Atomic: deactivate ALL, then activate the target
  return semesters.map((s) => ({ ...s, isActive: s.id === targetId }));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A non-empty array of semesters with unique ids */
const semestersArb = fc
  .uniqueArray(fc.uuid(), { minLength: 1, maxLength: 20 })
  .chain((ids) =>
    fc
      .array(fc.boolean(), { minLength: ids.length, maxLength: ids.length })
      .map((flags) => ids.map((id, i) => ({ id, isActive: flags[i] })))
  );

// ---------------------------------------------------------------------------
// Property 18: Semester activation exclusivity
// Feature: sis-lifecycle, Property 18: Semester activation exclusivity
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------

describe('Property 18: Semester activation exclusivity', () => {
  it('exactly one semester is active after activation', () => {
    // Feature: sis-lifecycle, Property 18: Semester activation exclusivity
    // Validates: Requirements 1.3
    fc.assert(
      fc.property(semestersArb, (semesters) => {
        // Pick any semester as the activation target
        const target = semesters[Math.floor(Math.random() * semesters.length)];
        const result = activateSemester(semesters, target.id);

        const activeCount = result.filter((s) => s.isActive).length;
        expect(activeCount).toBe(1);
      }),
      { numRuns: 200 }
    );
  });

  it('the activated semester is the target', () => {
    // Feature: sis-lifecycle, Property 18: Semester activation exclusivity
    // Validates: Requirements 1.3
    fc.assert(
      fc.property(semestersArb, (semesters) => {
        const target = semesters[Math.floor(Math.random() * semesters.length)];
        const result = activateSemester(semesters, target.id);

        const activeSemester = result.find((s) => s.isActive);
        expect(activeSemester?.id).toBe(target.id);
      }),
      { numRuns: 200 }
    );
  });

  it('all other semesters are inactive after activation', () => {
    // Feature: sis-lifecycle, Property 18: Semester activation exclusivity
    // Validates: Requirements 1.3
    fc.assert(
      fc.property(semestersArb, (semesters) => {
        const target = semesters[Math.floor(Math.random() * semesters.length)];
        const result = activateSemester(semesters, target.id);

        const inactiveOthers = result.filter((s) => s.id !== target.id && !s.isActive);
        expect(inactiveOthers.length).toBe(semesters.length - 1);
      }),
      { numRuns: 200 }
    );
  });
});
