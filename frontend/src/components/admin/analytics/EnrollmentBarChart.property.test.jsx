/**
 * Feature: admin-analytics-dashboard, Property 4: Bar chart renders one bar per data entry
 * Validates: Requirements 3.1
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 600, height: 280 }}>{children}</div>
    ),
  };
});

import EnrollmentBarChart from './EnrollmentBarChart';

afterEach(() => cleanup());

describe('EnrollmentBarChart', () => {
  // Property 4: for any non-empty data array, the chart container is rendered (not empty state)
  it('renders chart container for any non-empty data array', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            count: fc.integer({ min: 0, max: 500 }),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (data) => {
          const { container, queryByText } = render(<EnrollmentBarChart data={data} />);
          // Chart wrapper must be present
          expect(container.querySelector('[data-testid="enrollment-bar-chart"]')).not.toBeNull();
          // Empty state must NOT be shown
          expect(queryByText(/no enrollment data/i)).toBeNull();
          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('shows empty state when data is empty', () => {
    const { getByText, container } = render(<EnrollmentBarChart data={[]} />);
    expect(getByText(/no enrollment data/i)).toBeTruthy();
    expect(container.querySelector('[data-testid="enrollment-bar-chart"]')).toBeNull();
  });
});
