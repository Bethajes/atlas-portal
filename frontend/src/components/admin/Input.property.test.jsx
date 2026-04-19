import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import Input from './Input';

describe('Input error display (Property 2)', () => {
  it('shows error message text', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 80 }), (msg) => {
        render(
          <Input
            label="Field"
            name="f"
            value=""
            onChange={() => {}}
            error={msg}
          />
        );
        expect(screen.getByText(msg)).toBeTruthy();
      }),
      { numRuns: 25 }
    );
  });
});
