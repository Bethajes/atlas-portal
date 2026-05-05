import React from 'react';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import BulkToolbar from './BulkToolbar';

/**
 * Feature: admin-dashboard-upgrade, Property 8: Bulk selection toolbar visibility
 * Validates: Requirements 17.1, 17.2, 17.6
 */
describe('BulkToolbar visibility (Property 8)', () => {
  it('visible iff selectedCount > 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (n) => {
        const { container } = render(
          <BulkToolbar
            selectedCount={n}
            onDelete={() => {}}
            canDelete
            entityType="x"
          />
        );
        const visible = container.textContent.includes('selected');
        expect(visible).toBe(n > 0);
      }),
      { numRuns: 100 }
    );
  });
});
