/**
 * Feature: admin-analytics-dashboard, Property 5: GPA pie chart has exactly three segments
 * Validates: Requirements 4.1, 4.2
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

import GpaDistributionPieChart, { SEGMENTS } from './GpaDistributionPieChart';

afterEach(() => cleanup());

describe('GpaDistributionPieChart', () => {
  // Property 5a: the SEGMENTS constant always has exactly 3 entries with the required colors
  it('defines exactly 3 segments with the correct specification colors', () => {
    expect(SEGMENTS).toHaveLength(3);
    const colors = SEGMENTS.map((s) => s.color);
    expect(colors).toContain('#22c55e'); // high — green
    expect(colors).toContain('#f59e0b'); // medium — amber
    expect(colors).toContain('#ef4444'); // low — red
    const keys = SEGMENTS.map((s) => s.key);
    expect(keys).toContain('high');
    expect(keys).toContain('medium');
    expect(keys).toContain('low');
  });

  // Property 5b: for any non-zero distribution, the chart container is rendered (not empty state)
  it('renders chart container for any non-zero distribution', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.record({
          high:   fc.integer({ min: 0, max: 200 }),
          medium: fc.integer({ min: 0, max: 200 }),
          low:    fc.integer({ min: 0, max: 200 }),
        }).filter((d) => d.high + d.medium + d.low > 0),
        (data) => {
          const { container, queryByText } = render(<GpaDistributionPieChart data={data} />);
          expect(container.querySelector('[data-testid="gpa-pie-chart"]')).not.toBeNull();
          expect(queryByText(/no gpa data/i)).toBeNull();
          cleanup();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('shows empty state when all bands are zero', () => {
    const { getByText, container } = render(
      <GpaDistributionPieChart data={{ high: 0, medium: 0, low: 0 }} />
    );
    expect(getByText(/no gpa data/i)).toBeTruthy();
    expect(container.querySelector('[data-testid="gpa-pie-chart"]')).toBeNull();
  });
});
