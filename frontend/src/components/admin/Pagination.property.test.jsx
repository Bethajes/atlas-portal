import React from 'react';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import Pagination from './Pagination';

/**
 * Feature: admin-dashboard-upgrade, Property 7: Pagination shows correct slice of records
 * Validates: Requirements 16.1, 16.2, 16.5
 */
describe('Pagination - Property 7: Pagination shows correct slice of records', () => {
  it('shows correct "Showing X–Y of Z" label for any total, page, and pageSize', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.constantFrom(10, 20, 50),
        fc.integer({ min: 1, max: 20 }),
        (total, pageSize, page) => {
          // Ensure page is within valid range
          const totalPages = Math.ceil(total / pageSize);
          const validPage = Math.min(page, totalPages);
          
          const { container } = render(
            <Pagination 
              total={total} 
              page={validPage} 
              pageSize={pageSize} 
              onPageChange={() => {}} 
              onPageSizeChange={() => {}} 
            />
          );
          
          // Calculate expected values
          const expectedStart = total === 0 ? 0 : (validPage - 1) * pageSize + 1;
          const expectedEnd = Math.min(validPage * pageSize, total);
          
          // Find the text content
          const text = container.textContent;
          
          // Assert the label contains the correct values
          const expectedText = `Showing ${expectedStart}–${expectedEnd} of ${total}`;
          expect(text).toContain(expectedText);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shows "Showing 0–0 of 0" when total is 0', () => {
    const { container } = render(
      <Pagination 
        total={0} 
        page={1} 
        pageSize={10} 
        onPageChange={() => {}} 
        onPageSizeChange={() => {}} 
      />
    );
    
    expect(container.textContent).toContain('Showing 0–0 of 0');
  });
});
