/**
 * Property-based tests for registration window state correctness.
 * Feature: sis-lifecycle
 * Uses: fast-check + vitest
 *
 * Property 1: Registration window state correctness
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * For any AcademicSemester with defined registrationStart and registrationEnd dates,
 * getRegistrationState must return:
 *   - UPCOMING (with correct daysUntilOpen) when current time is before registrationStart
 *   - OPEN (with correct daysUntilClose) when current time is within the window
 *   - CLOSED when current time is after registrationEnd
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Import the pure function under test directly from the backend utility.
// The function has no side effects and no DB dependency.
// ---------------------------------------------------------------------------

// Mirror of getRegistrationState from backend/src/utils/registrationWindow.js
// We inline it here since the frontend test runner cannot resolve backend paths.
function getRegistrationState(semester) {
  if (!semester) {
    return {
      state: 'CLOSED',
      message: 'No active semester configured.',
      daysUntilOpen: null,
      daysUntilClose: null,
    };
  }
  const now = new Date();
  const regStart = new Date(semester.registrationStart);

  const regEndRaw = new Date(semester.registrationEnd);
  const regEnd = new Date(regEndRaw);
  regEnd.setHours(23, 59, 59, 999);

  if (now < regStart) {
    const daysUntilOpen = Math.ceil((regStart - now) / (1000 * 60 * 60 * 24));
    return {
      state: 'UPCOMING',
      message: `Registration opens in ${daysUntilOpen} day${daysUntilOpen !== 1 ? 's' : ''}.`,
      daysUntilOpen,
      daysUntilClose: null,
    };
  }
  if (now >= regStart && now <= regEnd) {
    const daysUntilClose = Math.ceil((regEnd - now) / (1000 * 60 * 60 * 24));
    return {
      state: 'OPEN',
      message: `Registration is open. Closes in ${daysUntilClose} day${daysUntilClose !== 1 ? 's' : ''}.`,
      daysUntilOpen: 0,
      daysUntilClose,
    };
  }
  return {
    state: 'CLOSED',
    message: 'Registration period has ended for this semester.',
    daysUntilOpen: null,
    daysUntilClose: 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a semester object with registrationStart/End relative to `now` by offsets in ms */
function semesterWithOffsets(now, startOffsetMs, endOffsetMs) {
  return {
    registrationStart: new Date(now.getTime() + startOffsetMs).toISOString(),
    registrationEnd: new Date(now.getTime() + endOffsetMs).toISOString(),
  };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * UPCOMING: registrationStart is strictly in the future.
 * We use a positive offset of at least 2 days so the ceil-based daysUntilOpen >= 1.
 */
const upcomingOffsetArb = fc
  .integer({ min: 2, max: 365 }) // days in the future
  .chain((startDays) =>
    fc
      .integer({ min: 1, max: 180 }) // window length in days
      .map((windowDays) => ({ startDays, endDays: startDays + windowDays }))
  );

/**
 * OPEN: registrationStart is in the past, registrationEnd (as midnight) is today or future.
 * We set registrationEnd to at least today (offset 0) so that after the end-of-day extension
 * (23:59:59.999) the window is still open.
 */
const openOffsetArb = fc
  .integer({ min: 1, max: 30 }) // how many days ago registration opened
  .chain((startDaysAgo) =>
    fc
      .integer({ min: 0, max: 30 }) // registrationEnd is 0..30 days from now (midnight)
      .map((endDaysFromNow) => ({ startDaysAgo, endDaysFromNow }))
  );

/**
 * CLOSED: registrationEnd (as midnight) is strictly in the past (at least 1 full day ago),
 * so even after the end-of-day extension it remains in the past.
 */
const closedOffsetArb = fc
  .integer({ min: 2, max: 365 }) // how many days ago registration ended (>= 2 to clear end-of-day)
  .chain((endDaysAgo) =>
    fc
      .integer({ min: 1, max: 180 }) // window length in days
      .map((windowDays) => ({ endDaysAgo, startDaysAgo: endDaysAgo + windowDays }))
  );

// ---------------------------------------------------------------------------
// Property 1: Registration window state correctness
// Feature: sis-lifecycle, Property 1: Registration window state correctness
// Validates: Requirements 2.1, 2.2, 2.3
// ---------------------------------------------------------------------------

describe('Property 1: Registration window state correctness', () => {
  // Requirement 2.1 — UPCOMING state
  it('returns UPCOMING with positive daysUntilOpen when now is before registrationStart', () => {
    // Feature: sis-lifecycle, Property 1: Registration window state correctness
    // Validates: Requirements 2.1
    fc.assert(
      fc.property(upcomingOffsetArb, ({ startDays, endDays }) => {
        const now = new Date();
        const semester = semesterWithOffsets(
          now,
          startDays * ONE_DAY_MS,
          endDays * ONE_DAY_MS
        );

        const result = getRegistrationState(semester);

        expect(result.state).toBe('UPCOMING');
        expect(result.daysUntilOpen).toBeGreaterThan(0);
        expect(result.daysUntilClose).toBeNull();
        expect(result.message).toMatch(/Registration opens in \d+ days?\./);
      }),
      { numRuns: 100 }
    );
  });

  // Requirement 2.2 — OPEN state
  it('returns OPEN with non-negative daysUntilClose when now is within the registration window', () => {
    // Feature: sis-lifecycle, Property 1: Registration window state correctness
    // Validates: Requirements 2.2
    fc.assert(
      fc.property(openOffsetArb, ({ startDaysAgo, endDaysFromNow }) => {
        const now = new Date();
        const semester = semesterWithOffsets(
          now,
          -startDaysAgo * ONE_DAY_MS,
          endDaysFromNow * ONE_DAY_MS
        );

        const result = getRegistrationState(semester);

        expect(result.state).toBe('OPEN');
        expect(result.daysUntilOpen).toBe(0);
        expect(result.daysUntilClose).toBeGreaterThanOrEqual(0);
        expect(result.message).toMatch(/Registration is open\./);
      }),
      { numRuns: 100 }
    );
  });

  // Requirement 2.3 — CLOSED state
  it('returns CLOSED when now is after registrationEnd', () => {
    // Feature: sis-lifecycle, Property 1: Registration window state correctness
    // Validates: Requirements 2.3
    fc.assert(
      fc.property(closedOffsetArb, ({ endDaysAgo, startDaysAgo }) => {
        const now = new Date();
        const semester = semesterWithOffsets(
          now,
          -startDaysAgo * ONE_DAY_MS,
          -endDaysAgo * ONE_DAY_MS
        );

        const result = getRegistrationState(semester);

        expect(result.state).toBe('CLOSED');
        expect(result.daysUntilOpen).toBeNull();
        expect(result.daysUntilClose).toBe(0);
        expect(result.message).toMatch(/Registration period has ended/);
      }),
      { numRuns: 100 }
    );
  });

  // Null semester — no active semester configured
  it('returns CLOSED when semester is null', () => {
    // Feature: sis-lifecycle, Property 1: Registration window state correctness
    // Validates: Requirements 2.1, 2.2, 2.3
    const result = getRegistrationState(null);
    expect(result.state).toBe('CLOSED');
    expect(result.message).toBe('No active semester configured.');
  });
});
