import React from 'react';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import Breadcrumb from './Breadcrumb';

/**
 * Feature: admin-dashboard-upgrade, Property 11: Breadcrumb reflects current navigation state
 * Validates: Requirements 20.1, 20.2
 */

const TAB_LABELS = {
  overview: 'Overview',
  students: 'Students',
  departments: 'Departments',
  programs: 'Programs',
  courses: 'Courses',
  notifications: 'Notifications',
};

describe('Breadcrumb — Property 11: Breadcrumb reflects current navigation state', () => {
  it('last breadcrumb segment text matches the expected tab display name', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('overview', 'students', 'departments', 'programs', 'courses', 'notifications'),
        (tab) => {
          const expectedLabel = TAB_LABELS[tab];
          const { unmount } = render(
            <Breadcrumb items={[{ label: 'Admin', onClick: () => {} }, { label: expectedLabel }]} />
          );

          // The last segment should be rendered as a non-clickable span with the tab's display name
          const lastSegment = screen.getByText(expectedLabel);
          expect(lastSegment).toBeTruthy();
          expect(lastSegment.tagName.toLowerCase()).toBe('span');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
