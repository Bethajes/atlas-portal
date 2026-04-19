import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import Pagination, { paginatedItems } from './Pagination';

describe('Pagination slice (Property 7)', () => {
  it('paginatedItems returns correct length', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom(10, 20, 50),
        (total, page, pageSize) => {
          const list = Array.from({ length: total }, (_, i) => ({ id: i }));
          const slice = paginatedItems(list, page, pageSize);
          const start = (Math.max(1, page) - 1) * pageSize;
          const expectLen = Math.max(0, Math.min(pageSize, total - start));
          expect(slice.length).toBe(expectLen);
        }
      ),
      { numRuns: 40 }
    );
  });

  it('shows correct range label', () => {
    render(
      <Pagination total={25} page={2} pageSize={10} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent('11');
    expect(screen.getByText(/Showing/)).toHaveTextContent('20');
    expect(screen.getByText(/Showing/)).toHaveTextContent('25');
  });
});
