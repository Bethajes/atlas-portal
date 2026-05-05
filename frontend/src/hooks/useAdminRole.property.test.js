import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { renderHook } from '@testing-library/react';
import { useAdminRole } from './useAdminRole';
import * as AuthContext from '../context/AuthContext';

/**
 * Feature: admin-dashboard-upgrade, Property 4: RBAC UI gating by admin sub-role
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */
describe('useAdminRole RBAC (Property 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct permissions for each admin sub-role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('SUPER_ADMIN', 'STAFF', 'REGISTRAR_ADMIN'),
        (adminRole) => {
          // Mock the user object with the generated adminRole
          const mockUser = {
            id: 1,
            name: 'Test Admin',
            role: 'ADMIN',
            adminRole: adminRole,
          };

          // Mock useAuth to return our test user
          vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            user: mockUser,
            authLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            isAuthenticated: true,
            isAdmin: true,
            isInstructor: false,
            isStudent: false,
            isRegistrar: false,
          });

          const { result } = renderHook(() => useAdminRole());

          // Verify role flags
          if (adminRole === 'SUPER_ADMIN') {
            expect(result.current.isSuperAdmin).toBe(true);
            expect(result.current.isStaff).toBe(false);
            expect(result.current.isRegistrarAdmin).toBe(false);
            
            // SUPER_ADMIN can do everything
            expect(result.current.can('delete')).toBe(true);
            expect(result.current.can('create')).toBe(true);
            expect(result.current.can('viewAuditLog')).toBe(true);
          } else if (adminRole === 'STAFF') {
            expect(result.current.isSuperAdmin).toBe(false);
            expect(result.current.isStaff).toBe(true);
            expect(result.current.isRegistrarAdmin).toBe(false);
            
            // STAFF can create but not delete or view audit logs
            expect(result.current.can('delete')).toBe(false);
            expect(result.current.can('create')).toBe(true);
            expect(result.current.can('viewAuditLog')).toBe(false);
          } else if (adminRole === 'REGISTRAR_ADMIN') {
            expect(result.current.isSuperAdmin).toBe(false);
            expect(result.current.isStaff).toBe(false);
            expect(result.current.isRegistrarAdmin).toBe(true);
            
            // REGISTRAR_ADMIN has limited permissions
            expect(result.current.can('delete')).toBe(false);
            expect(result.current.can('create')).toBe(false);
            expect(result.current.can('viewAuditLog')).toBe(false);
          }

          // Restore the mock for the next iteration
          vi.restoreAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('defaults to SUPER_ADMIN behavior when adminRole is null', () => {
    const mockUser = {
      id: 1,
      name: 'Test Admin',
      role: 'ADMIN',
      adminRole: null, // No adminRole set
    };

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      authLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isAdmin: true,
      isInstructor: false,
      isStudent: false,
      isRegistrar: false,
    });

    const { result } = renderHook(() => useAdminRole());

    // Should default to SUPER_ADMIN behavior
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.can('delete')).toBe(true);
    expect(result.current.can('create')).toBe(true);
    expect(result.current.can('viewAuditLog')).toBe(true);

    vi.restoreAllMocks();
  });
});
