import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import BulkToolbar from './BulkToolbar';

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
      { numRuns: 40 }
    );
  });
});
