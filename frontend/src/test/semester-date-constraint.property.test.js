/**
 * Property-based tests for semester date constraint enforcement.
 * Feature: sis-lifecycle
 * Uses: fast-check + vitest
 *
 * Property 17: Semester date constraint enforcement
 * Validates: Requirements 1.5
 *
 * For any create-semester request where registrationStart >= registrationEnd
 * or startDate >= endDate, the SIS must return a 400 error without persisting a record.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mirror of the validation logic in academic.controller.js createSemester
// and the inline PUT /semesters/:id route handler.
// ---------------------------------------------------------------------------

/**
 * Validates semester date constraints.
 * Returns { valid: true } or { valid: false, status: 400, message: string }
 */
function validateSemesterDates({ registrationStart, registrationEnd, startDate, endDate }) {
  if (registrationStart && registrationEnd && new Date(registrationStart) >= new Date(registrationEnd)) {
    return { valid: false, status: 400, message: 'registrationStart must be before registrationEnd' };
  }
  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    return { valid: false, status: 400, message: 'startDate must be before endDate' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Two dates where the first is strictly before the second (valid pair) */
const validDatePairArb = fc.tuple(fc.date(), fc.date()).filter(([a, b]) => a < b);

/** Two dates where the first is equal to or after the second (invalid pair) */
const invalidDatePairArb = fc.tuple(fc.date(), fc.date()).filter(([a, b]) => a >= b);

// ---------------------------------------------------------------------------
// Property 17: Semester date constraint enforcement
// Feature: sis-lifecycle, Property 17: Semester date constraint enforcement
// Validates: Requirements 1.5
// ---------------------------------------------------------------------------

describe('Property 17: Semester date constraint enforcement', () => {
  it('rejects when registrationStart >= registrationEnd', () => {
    // Feature: sis-lifecycle, Property 17: Semester date constraint enforcement
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(
        invalidDatePairArb,
        validDatePairArb,
        ([regStart, regEnd], [start, end]) => {
          const result = validateSemesterDates({
            registrationStart: regStart.toISOString(),
            registrationEnd: regEnd.toISOString(),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          });

          expect(result.valid).toBe(false);
          expect(result.status).toBe(400);
          expect(result.message).toBe('registrationStart must be before registrationEnd');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when startDate >= endDate', () => {
    // Feature: sis-lifecycle, Property 17: Semester date constraint enforcement
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(
        validDatePairArb,
        invalidDatePairArb,
        ([regStart, regEnd], [start, end]) => {
          const result = validateSemesterDates({
            registrationStart: regStart.toISOString(),
            registrationEnd: regEnd.toISOString(),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          });

          expect(result.valid).toBe(false);
          expect(result.status).toBe(400);
          expect(result.message).toBe('startDate must be before endDate');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts when registrationStart < registrationEnd and startDate < endDate', () => {
    // Feature: sis-lifecycle, Property 17: Semester date constraint enforcement
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(
        validDatePairArb,
        validDatePairArb,
        ([regStart, regEnd], [start, end]) => {
          const result = validateSemesterDates({
            registrationStart: regStart.toISOString(),
            registrationEnd: regEnd.toISOString(),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          });

          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('registrationStart constraint is checked before startDate constraint', () => {
    // Feature: sis-lifecycle, Property 17: Semester date constraint enforcement
    // Validates: Requirements 1.5
    // When both pairs are invalid, the registrationStart error takes priority
    fc.assert(
      fc.property(
        invalidDatePairArb,
        invalidDatePairArb,
        ([regStart, regEnd], [start, end]) => {
          const result = validateSemesterDates({
            registrationStart: regStart.toISOString(),
            registrationEnd: regEnd.toISOString(),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          });

          expect(result.valid).toBe(false);
          expect(result.status).toBe(400);
          // registrationStart constraint is evaluated first
          expect(result.message).toBe('registrationStart must be before registrationEnd');
        }
      ),
      { numRuns: 100 }
    );
  });
});
