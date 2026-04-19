import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import Breadcrumb from './Breadcrumb';

const LABELS = {
  overview: 'Overview',
  students: 'Students',
  departments: 'Departments',
  programs: 'Programs',
  courses: 'Courses',
  notifications: 'Notifications',
};

describe('Breadcrumb last segment (Property 11)', () => {
  it('last label matches tab', () => {
    fc.assert(
      fc.property(fc.constantFrom('overview', 'students', 'departments', 'programs', 'courses', 'notifications'), (tab) => {
        render(<Breadcrumb items={[{ label: 'Admin' }, { label: LABELS[tab] }]} />);
        expect(screen.getByText(LABELS[tab])).toBeTruthy();
      }),
      { numRuns: 30 }
    );
  });
});
