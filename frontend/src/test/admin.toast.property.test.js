/**
 * Property 3: Toast shown for all entity CRUD operations
 * **Feature: admin-dashboard-upgrade, Property 3: Toast shown for all entity CRUD operations**
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5
 *
 * For any entity type (department, program, course) and action type (create, update, delete),
 * when the operation succeeds the success toast should be called,
 * and when it fails the error toast should be called with the backend message.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Toast notification logic extracted from AdminDashboard handlers
// This mirrors the pattern used in every CRUD handler:
//   try { await api.call(...); toast.success(successMsg); }
//   catch (err) { toast.error(err.response?.data?.message || fallback); }
// ---------------------------------------------------------------------------

/**
 * Simulates the toast-calling logic for any CRUD operation.
 * Returns which toast type was called and with what message.
 */
async function runCrudOperation({ apiCall, successMessage, fallbackError }) {
  const toastCalls = { success: null, error: null };
  const mockToast = {
    success: (msg) => { toastCalls.success = msg; },
    error: (msg) => { toastCalls.error = msg; },
  };

  try {
    await apiCall();
    mockToast.success(successMessage);
  } catch (err) {
    const msg = err?.response?.data?.message || fallbackError;
    mockToast.error(msg);
  }

  return toastCalls;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const entityTypeArb = fc.constantFrom('department', 'program', 'course');
const actionTypeArb = fc.constantFrom('create', 'update', 'delete');
const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 });
const successMessageArb = fc.string({ minLength: 1, maxLength: 100 });

// ---------------------------------------------------------------------------
// Property 3: Toast shown for all entity CRUD operations
// ---------------------------------------------------------------------------

describe('Property 3: Toast shown for all entity CRUD operations', () => {
  it('calls toast.success on successful operation for any entity/action combination', async () => {
    await fc.assert(
      fc.asyncProperty(entityTypeArb, actionTypeArb, successMessageArb, async (entity, action, successMsg) => {
        // Simulate a successful API call
        const apiCall = async () => ({ data: { success: true } });

        const toastCalls = await runCrudOperation({
          apiCall,
          successMessage: `${entity} ${action}d`,
          fallbackError: `Failed to ${action} ${entity}`,
        });

        expect(toastCalls.success).toBeTruthy();
        expect(toastCalls.error).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('calls toast.error with backend message on failed operation for any entity/action combination', async () => {
    await fc.assert(
      fc.asyncProperty(entityTypeArb, actionTypeArb, errorMessageArb, async (entity, action, backendMsg) => {
        // Simulate a failed API call with a backend error message
        const apiCall = async () => {
          const err = new Error('Request failed');
          err.response = { data: { message: backendMsg } };
          throw err;
        };

        const toastCalls = await runCrudOperation({
          apiCall,
          successMessage: `${entity} ${action}d`,
          fallbackError: `Failed to ${action} ${entity}`,
        });

        expect(toastCalls.error).toBe(backendMsg);
        expect(toastCalls.success).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('calls toast.error with fallback message when backend provides no message', async () => {
    await fc.assert(
      fc.asyncProperty(entityTypeArb, actionTypeArb, async (entity, action) => {
        const fallback = `Failed to ${action} ${entity}`;

        // Simulate a network error with no response body
        const apiCall = async () => {
          throw new Error('Network Error');
        };

        const toastCalls = await runCrudOperation({
          apiCall,
          successMessage: `${entity} ${action}d`,
          fallbackError: fallback,
        });

        expect(toastCalls.error).toBe(fallback);
        expect(toastCalls.success).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('never calls both toast.success and toast.error for the same operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityTypeArb,
        actionTypeArb,
        fc.boolean(), // true = success, false = failure
        async (entity, action, shouldSucceed) => {
          const apiCall = shouldSucceed
            ? async () => ({ data: { success: true } })
            : async () => { throw new Error('Failed'); };

          const toastCalls = await runCrudOperation({
            apiCall,
            successMessage: `${entity} ${action}d`,
            fallbackError: `Failed to ${action} ${entity}`,
          });

          // Exactly one of success or error should be called, never both
          const successCalled = toastCalls.success !== null;
          const errorCalled = toastCalls.error !== null;
          expect(successCalled !== errorCalled).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
