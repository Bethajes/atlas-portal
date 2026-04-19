/**
 * Property-based tests for analytics controller pure logic.
 * These tests import the exported pure functions directly — no Prisma, no Express.
 *
 * Feature: admin-analytics-dashboard
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeGpaBands,
  sortByCountDesc,
  partitionPassFail,
} from '../../../backend/src/controllers/analytics.controller.js';

// ── Property 1: GPA band invariant ──────────────────────────────────────────
// Feature: admin-analytics-dashboard, Property 1: GPA band invariant
// Validates: Requirements 1.2, 1.3
describe('computeGpaBands', () => {
  it('high + medium + low === total students, nulls go to low', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            cumulativeGPA: fc.oneof(
              fc.float({ min: 0, max: 4, noNaN: true }),
              fc.constant(null)
            ),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (students) => {
          const { high, medium, low } = computeGpaBands(students);

          // Invariant: bands sum to total
          expect(high + medium + low).toBe(students.length);

          // Invariant: null GPAs land in low
          const nullCount = students.filter((s) => s.cumulativeGPA == null).length;
          const belowTwoCount = students.filter(
            (s) => s.cumulativeGPA != null && s.cumulativeGPA < 2.0
          ).length;
          expect(low).toBe(nullCount + belowTwoCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: Enrollment sort order ───────────────────────────────────────
// Feature: admin-analytics-dashboard, Property 2: Enrollment by program is sorted descending
// Validates: Requirements 1.4
describe('sortByCountDesc', () => {
  it('output is sorted non-increasing by count', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 30 }),
            count: fc.integer({ min: 0, max: 500 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (items) => {
          const sorted = sortByCountDesc(items);
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].count).toBeGreaterThanOrEqual(sorted[i + 1].count);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ name: fc.string(), count: fc.integer({ min: 0, max: 100 }) }),
          { minLength: 1, maxLength: 10 }
        ),
        (items) => {
          const original = items.map((x) => ({ ...x }));
          sortByCountDesc(items);
          expect(items).toEqual(original);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Pass/fail completeness ──────────────────────────────────────
// Feature: admin-analytics-dashboard, Property 3: Pass/fail completeness
// Validates: Requirements 1.6, 1.7
describe('partitionPassFail', () => {
  it('pass + fail === total grades', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D+', 'D', 'F'),
          { minLength: 0, maxLength: 100 }
        ),
        (grades) => {
          const { pass, fail } = partitionPassFail(grades);
          expect(pass + fail).toBe(grades.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns { pass: 0, fail: 0 } when no grades exist', () => {
    const result = partitionPassFail([]);
    expect(result).toEqual({ pass: 0, fail: 0 });
  });

  it('all passing grades produce fail === 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'), {
          minLength: 1,
          maxLength: 50,
        }),
        (grades) => {
          const { fail } = partitionPassFail(grades);
          expect(fail).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
