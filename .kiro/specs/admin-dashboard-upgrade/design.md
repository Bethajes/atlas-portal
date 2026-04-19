# Design Document — Admin Dashboard Upgrade

## Overview

The Atlas Portal admin dashboard is upgraded from a functional but monolithic single-file page into a production-quality, modular admin panel. The upgrade is incremental — no rewrites, only targeted improvements layered on top of the existing React + Tailwind + Prisma stack.

The result is a dashboard that matches modern SaaS admin panels: consistent design tokens, reusable components, toast feedback, RBAC-gated UI, audit logging, pagination, bulk operations, CSV export, soft delete, and responsive layout.

---

## Architecture

The upgrade follows a layered approach:

```
frontend/src/
  components/
    admin/               ← new: all reusable admin UI primitives
      Button.jsx
      Input.jsx
      Modal.jsx
      ConfirmModal.jsx
      Badge.jsx
      StatCard.jsx
      TableSkeleton.jsx
      Breadcrumb.jsx
      Pagination.jsx
      BulkToolbar.jsx
      EmptyState.jsx
  pages/
    AdminDashboard.jsx   ← refactored: uses new components, toast, RBAC
  hooks/
    useAdminRole.js      ← new: RBAC hook derived from auth context

backend/src/
  controllers/
    adminAcademic.controller.js  ← extended: soft delete, audit log writes
  middleware/
    adminRole.middleware.js      ← new: sub-role RBAC enforcement
  routes/
    admin.routes.js              ← extended: audit log endpoint, restore endpoint
```

**Key architectural decisions:**

- All reusable admin components live in `frontend/src/components/admin/` to keep them isolated from the student/registrar UI.
- RBAC is enforced at two layers: the frontend hides/disables UI elements, and the backend middleware rejects unauthorized requests with 403.
- The existing `AuditLog` Prisma model is already present in the schema — we only need to wire up writes in the controller layer.
- Soft delete adds `isDeleted` fields via a new Prisma migration on `Department` and `Program`.
- Pagination is handled client-side for the current data set size (no backend pagination needed until records exceed ~500).
- CSV export is fully client-side using a utility function — no new API endpoints required.
- `react-hot-toast` replaces the existing inline `message` state banner entirely.

---

## Components and Interfaces

### `Button.jsx`
```jsx
// Props: variant ('primary'|'secondary'|'danger'), loading, disabled, onClick, children, type, className
```
Renders a styled button. When `loading=true`, shows an inline spinner and sets `disabled`. Variant maps to Tailwind class sets from the design token map.

### `Input.jsx`
```jsx
// Props: label, name, value, onChange, placeholder, type, required, error, className
```
Renders a labeled input with focus ring (`focus:ring-2 focus:ring-blue-500`). When `error` is provided, shows a red message below the field.

### `Modal.jsx`
```jsx
// Props: isOpen, onClose, title, subtitle, accentColor, children
```
Renders a centered overlay modal with backdrop blur, `rounded-2xl shadow-2xl`, and a CSS `animate-in zoom-in-95` transition. Closes on backdrop click or Escape key.

### `ConfirmModal.jsx`
```jsx
// Props: isOpen, onClose, onConfirm, itemName, entityType, loading
```
A specialized modal for destructive confirmations. Shows the item name, a warning icon, and two buttons: Cancel (secondary) and Delete (danger with loading state).

### `Badge.jsx`
```jsx
// Props: status (string), variant override
```
Maps known status strings to color classes. Handles: ACTIVE, PROBATION, SUSPENDED, GRADUATED, DECLARED, UNDECLARED, INSTRUCTOR, ADMIN, REGISTRAR, STAFF.

### `StatCard.jsx`
```jsx
// Props: label, value, icon, color, bg, loading
```
Displays a metric card. When `loading=true`, renders a skeleton pulse animation instead of the value.

### `TableSkeleton.jsx`
```jsx
// Props: rows (number), cols (number)
```
Renders N rows of animated skeleton cells for use during data fetch.

### `Breadcrumb.jsx`
```jsx
// Props: items ([{ label, onClick }])
```
Renders a breadcrumb trail. Each item except the last is clickable.

### `Pagination.jsx`
```jsx
// Props: total, page, pageSize, onPageChange, onPageSizeChange
```
Renders Previous/Next buttons, current page indicator, page size selector (10/20/50), and a "Showing X–Y of Z" label.

### `BulkToolbar.jsx`
```jsx
// Props: selectedCount, onDelete, onAssignProgram, canDelete, entityType
```
Appears above the table when `selectedCount > 0`. Shows count and action buttons gated by `canDelete`.

### `EmptyState.jsx`
```jsx
// Props: icon, message, actionLabel, onAction
```
Centered empty state with icon, message, and optional action button.

### `useAdminRole.js`
```js
// Returns: { isSuperAdmin, isStaff, isRegistrarAdmin, can(action) }
// Reads adminRole from user context (stored in JWT / user object)
```

---

## Data Models

### Existing models used (no schema changes needed for most features):
- `User` — `role: ADMIN`, extended with `adminRole` field (new)
- `Department` — add `isDeleted Boolean @default(false)`
- `Program` — add `isDeleted Boolean @default(false)`
- `AuditLog` — already exists, extend `resource` field usage

### New migration required:

```prisma
// Migration: add_admin_role_and_soft_delete

model User {
  // ... existing fields ...
  adminRole  AdminRole? // SUPER_ADMIN | STAFF | REGISTRAR_ADMIN
}

model Department {
  // ... existing fields ...
  isDeleted  Boolean  @default(false)
}

model Program {
  // ... existing fields ...
  isDeleted  Boolean  @default(false)
}

enum AdminRole {
  SUPER_ADMIN
  STAFF
  REGISTRAR_ADMIN
}
```

### AuditLog write pattern (backend utility):
```js
// utils/audit.js — extend existing file
async function logAudit(userId, action, entity, entityName, details = {}) {
  await prisma.auditLog.create({
    data: { userId, action, resource: entity, details: { entityName, ...details } }
  });
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Button variant renders correct classes
*For any* valid variant value (`primary`, `secondary`, `danger`), rendering the `Button` component should produce an element containing the design-system class names associated with that variant.
**Validates: Requirements 1.3, 1.4, 1.5, 2.1**

### Property 2: Input error message display
*For any* non-empty error string passed to the `Input` component, the rendered output should contain that error string in a visible element below the input field.
**Validates: Requirements 2.4, 15.5**

### Property 3: Toast shown for all entity CRUD operations
*For any* entity type (`department`, `program`, `course`) and action type (`create`, `update`, `delete`), when the operation succeeds the success toast should be called, and when it fails the error toast should be called with the backend message.
**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 4: RBAC UI gating by admin sub-role
*For any* admin sub-role (`SUPER_ADMIN`, `STAFF`, `REGISTRAR_ADMIN`), rendering the dashboard should show exactly the tabs and action buttons permitted for that role — no more, no less.
**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

### Property 5: Audit log entry created for every mutation
*For any* entity type and action type (`CREATE`, `UPDATE`, `DELETE`), after the corresponding API call completes successfully, querying the audit log should return at least one entry matching that action, entity, and the acting user's ID.
**Validates: Requirements 14.1, 14.2**

### Property 6: Duplicate code rejected for any entity type
*For any* entity type (`department`, `program`) and any code string, attempting to create two records with the same code should result in the second request returning an error response (4xx).
**Validates: Requirements 15.1, 15.2, 15.4**

### Property 7: Pagination shows correct slice of records
*For any* list of N records and page size P where N > P, rendering the paginated table on page K should display exactly min(P, N - (K-1)*P) records, and the total count label should show N.
**Validates: Requirements 16.1, 16.2, 16.5**

### Property 8: Bulk selection toolbar visibility
*For any* number of selected rows S, the bulk action toolbar should be visible if and only if S > 0, and the "Select All" checkbox should select exactly the current page's record count.
**Validates: Requirements 17.1, 17.2, 17.6**

### Property 9: CSV export round trip
*For any* array of student or program records, calling the CSV export function and parsing the output should produce an array of objects with the same field values as the input (for the exported columns).
**Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

### Property 10: Soft delete removes from list and appears in trash
*For any* department or program record, after a soft delete operation, the record should not appear in the standard list endpoint response, but should appear in the trash/deleted endpoint response.
**Validates: Requirements 19.2, 19.3, 19.4**

### Property 11: Breadcrumb reflects current navigation state
*For any* active tab value, the breadcrumb component should render a trail whose last segment matches the tab's display name.
**Validates: Requirements 20.1, 20.2**

---

## Error Handling

- All API calls in `AdminDashboard.jsx` are wrapped in try/catch.
- Errors are extracted from `error.response?.data?.error || error.response?.data?.message || error.message`.
- All errors are surfaced via `toast.error(message)` — no silent failures.
- Backend controllers return structured errors: `{ success: false, message: '...' }`.
- The `adminRole.middleware.js` returns `{ success: false, message: 'Insufficient permissions' }` with status 403.
- Soft delete prevents accidental data loss; the backend returns 400 if a hard delete is attempted on a department with active programs.
- Network errors (no response) show a generic "Network error — please try again" toast.

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
- Test each reusable component (`Button`, `Input`, `Modal`, `ConfirmModal`, `Badge`, `Pagination`, `BulkToolbar`, `EmptyState`) in isolation.
- Test the `useAdminRole` hook with mocked auth context values.
- Test the CSV export utility function with known input/output pairs.
- Test the `filteredItems` and pagination slice utility functions.

### Property-Based Tests (fast-check)
- Use `fast-check` as the PBT library (well-maintained, works with Vitest, no extra setup).
- Configure each property test to run a minimum of 100 iterations (`numRuns: 100`).
- Each property-based test is tagged with the format: `**Feature: admin-dashboard-upgrade, Property {N}: {property_text}**`
- Each correctness property from the design document maps to exactly one property-based test.

**Property test generators:**
- `fc.constantFrom('primary', 'secondary', 'danger')` for Button variants
- `fc.string({ minLength: 1 })` for error messages and entity names
- `fc.constantFrom('department', 'program', 'course')` for entity types
- `fc.constantFrom('CREATE', 'UPDATE', 'DELETE')` for action types
- `fc.constantFrom('SUPER_ADMIN', 'STAFF', 'REGISTRAR_ADMIN')` for admin roles
- `fc.array(fc.record({...}), { minLength: 1 })` for record arrays in CSV/pagination tests
- `fc.integer({ min: 1, max: 200 })` for record counts in pagination tests

### Integration Tests
- Backend: test the `GET /admin/audit-logs` endpoint returns entries after mutations.
- Backend: test soft delete endpoints set `isDeleted=true` and filter correctly.
- Backend: test duplicate code constraint returns 400 with descriptive message.
- Backend: test `adminRole.middleware` returns 403 for insufficient roles.
