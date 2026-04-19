import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button variant classes (Property 1)', () => {
  it('maps variants to expected Tailwind tokens', () => {
    fc.assert(
      fc.property(fc.constantFrom('primary', 'secondary', 'danger'), (variant) => {
        render(<Button variant={variant}>X</Button>);
        const btn = screen.getByRole('button', { name: 'X' });
        if (variant === 'primary') {
          expect(btn.className).toMatch(/bg-blue-600/);
          expect(btn.className).toMatch(/hover:bg-blue-700/);
        } else if (variant === 'secondary') {
          expect(btn.className).toMatch(/bg-gray-100/);
          expect(btn.className).toMatch(/hover:bg-gray-200/);
        } else {
          expect(btn.className).toMatch(/bg-red-500/);
          expect(btn.className).toMatch(/hover:bg-red-600/);
        }
      }),
      { numRuns: 30 }
    );
  });
});
