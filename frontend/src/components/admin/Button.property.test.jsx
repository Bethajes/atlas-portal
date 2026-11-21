import React from 'react';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import Button from './Button';

/**
 * Feature: admin-dashboard-upgrade, Property 1: Button variant renders correct classes
 * Validates: Requirements 1.3, 1.4, 1.5, 2.1
 */
describe('Button variant classes (Property 1)', () => {
  it('maps variants to expected Tailwind tokens', () => {
    fc.assert(
      fc.property(fc.constantFrom('primary', 'secondary', 'danger'), (variant) => {
        cleanup(); // Clean up previous renders
        const { container } = render(<Button variant={variant}>Test Button</Button>);
        const btn = container.querySelector('button');
        
        if (variant === 'primary') {
          expect(btn.className).toMatch(/bg-brand-600/);
          expect(btn.className).toMatch(/hover:bg-brand-700/);
          expect(btn.className).toMatch(/text-white/);
        } else if (variant === 'secondary') {
          expect(btn.className).toMatch(/bg-white/);
          expect(btn.className).toMatch(/hover:bg-slate-50/);
          expect(btn.className).toMatch(/text-slate-700/);
        } else if (variant === 'danger') {
          expect(btn.className).toMatch(/bg-red-500/);
          expect(btn.className).toMatch(/hover:bg-red-600/);
          expect(btn.className).toMatch(/text-white/);
        }
      }),
      { numRuns: 100 }
    );
  });
});
