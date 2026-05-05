# Implementation Plan — Admin Dashboard Upgrade

- [ ] 1. Set up shared infrastructure
  - Install `react-hot-toast` in the frontend (`npm install react-hot-toast`)
  - Add `<Toaster />` to `App.jsx` so toasts render globally
  - Install `fast-check` as a dev dependency for property-based tests (`npm install -D fast-check`)
  - Set up Vitest + React Testing Library if not already present (`npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`)
  - Add `vitest.config.js` with jsdom environment
  - _Requirements: 3.1_

- [ ] 2. Create reusable admin UI components
- [ ] 2.1 Create `Button` component
  - File: `frontend/src/components/admin/Button.jsx`
  - Accept `variant` (`primary`|`secondary`|`danger`), `loading`, `disabled`, `onClick`, `children`, `type`, `className`
  - Map variants to Tailwind classes: primary=`bg-blue-600 hover:bg-blue-700 text-white`, secondary=`bg-gray-100 hover:bg-gray-200 text-gray-700`, danger=`bg-red-500 hover:bg-red-600 text-white`
  - When `loading=true`: show inline spinner SVG and set `disabled`
  - When `disabled=true`: add `opacity-50 cursor-not-allowed`
  - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 2.2 Write property test for Button component
  - **Property 1: Button variant renders correct classes**
  - **Validates: Requirements 1.3, 1.4, 1.5, 2.1**
  - Use `fc.constantFrom('primary', 'secondary', 'danger')` as generator
  - Assert rendered button contains the expected Tailwind class for each variant

- [x] 2.3 Create `Input` component
  - File: `frontend/src/components/admin/Input.jsx`
  - Accept `label`, `name`, `value`, `onChange`, `placeholder`, `type`, `required`, `error`, `className`
  - Apply `focus:ring-2 focus:ring-blue-500` on the input element
  - When `error` is provided: render a `<p className="text-red-500 text-xs mt-1">` below the input
  - Show `*` after label when `required=true`
  - _Requirements: 2.4, 6.3, 15.5_

- [x] 2.4 Write property test for Input component
  - **Property 2: Input error message display**
  - **Validates: Requirements 2.4, 15.5**
  - Use `fc.string({ minLength: 1 })` as generator for error strings
  - Assert the rendered output contains the error string in a visible element

- [x] 2.5 Create `Modal` and `ConfirmModal` components
  - File: `frontend/src/components/admin/Modal.jsx`
  - Accept `isOpen`, `onClose`, `title`, `subtitle`, `accentColor`, `children`
  - Render backdrop with `bg-black/50 backdrop-blur-sm`, content with `rounded-2xl shadow-2xl animate-in zoom-in-95`
  - Close on backdrop click and Escape key (useEffect keydown listener)
  - File: `frontend/src/components/admin/ConfirmModal.jsx`
  - Accept `isOpen`, `onClose`, `onConfirm`, `itemName`, `entityType`, `loading`
  - Show item name, warning message, Cancel (secondary Button) and Delete (danger Button with loading)
  - _Requirements: 2.5, 7.1, 7.2, 7.3, 7.4_

- [x] 2.6 Create `Badge`, `StatCard`, `EmptyState`, `TableSkeleton` components
  - `Badge.jsx`: map status strings to color classes (ACTIVE=green, PROBATION=amber, SUSPENDED=red, GRADUATED=blue, DECLARED=green, UNDECLARED=amber, INSTRUCTOR=indigo, ADMIN=rose, STAFF=purple)
  - `StatCard.jsx`: accept `label`, `value`, `icon`, `color`, `bg`, `loading`; when loading show `animate-pulse bg-gray-200 rounded h-8 w-16` skeleton
  - `EmptyState.jsx`: accept `icon`, `message`, `actionLabel`, `onAction`; render centered with icon, message, optional Button
  - `TableSkeleton.jsx`: accept `rows`, `cols`; render N rows of animated skeleton cells
  - _Requirements: 1.1, 1.2, 4.2, 4.3, 5.4, 9.1_

- [x] 2.7 Create `Breadcrumb`, `Pagination`, `BulkToolbar` components
  - `Breadcrumb.jsx`: accept `items ([{ label, onClick }])`; render `Admin > Section > Action` trail; last item non-clickable
  - `Pagination.jsx`: accept `total`, `page`, `pageSize`, `onPageChange`, `onPageSizeChange`; render Prev/Next buttons, page indicator, page size selector (10/20/50), "Showing X–Y of Z" label
  - `BulkToolbar.jsx`: accept `selectedCount`, `onDelete`, `onAssignProgram`, `canDelete`, `entityType`; visible only when `selectedCount > 0`
  - _Requirements: 16.2, 16.3, 16.5, 17.2, 17.3, 20.1, 20.2, 20.3_

- [x] 2.8 Write property test for Pagination component
  - **Property 7: Pagination shows correct slice of records**
  - **Validates: Requirements 16.1, 16.2, 16.5**
  - Use `fc.integer({ min: 1, max: 200 })` for total and `fc.constantFrom(10, 20, 50)` for pageSize
  - Assert the "Showing X–Y of Z" label reflects the correct range

- [x] 2.9 Write property test for BulkToolbar component
  - **Property 8: Bulk selection toolbar visibility**
  - **Validates: Requirements 17.1, 17.2, 17.6**
  - Use `fc.integer({ min: 0, max: 50 })` for selectedCount
  - Assert toolbar is visible iff selectedCount > 0

- [x] 3. Create `useAdminRole` hook and RBAC utilities
  - File: `frontend/src/hooks/useAdminRole.js`
  - Read `user.adminRole` from `useAuth()` context
  - Return `{ isSuperAdmin, isStaff, isRegistrarAdmin, can(action) }`
  - `can(action)` maps actions (`delete`, `create`, `viewAuditLog`) to allowed roles
  - Default to `SUPER_ADMIN` behavior if `adminRole` is null (backward compatibility)
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 3.1 Write property test for useAdminRole hook
  - **Property 4: RBAC UI gating by admin sub-role**
  - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
  - Use `fc.constantFrom('SUPER_ADMIN', 'STAFF', 'REGISTRAR_ADMIN')` as generator
  - For each role, assert `can('delete')`, `can('create')`, `can('viewAuditLog')` return the correct boolean

- [x] 4. Backend: add `adminRole` field and soft delete migration
  - Add `adminRole AdminRole?` field to `User` model in `schema.prisma`
  - Add `enum AdminRole { SUPER_ADMIN STAFF REGISTRAR_ADMIN }` to schema
  - Add `isDeleted Boolean @default(false)` to `Department` model
  - Add `isDeleted Boolean @default(false)` to `Program` model
  - Run `npx prisma migrate dev --name add_admin_role_soft_delete`
  - _Requirements: 13.1, 19.1_

- [x] 5. Backend: admin role middleware and soft delete endpoints
- [x] 5.1 Create `adminRole.middleware.js`
  - File: `backend/src/middleware/adminRole.middleware.js`
  - Read `req.user.adminRole` (set by existing auth middleware)
  - Accept `requiredRole` param; return 403 `{ success: false, message: 'Insufficient permissions' }` if role is insufficient
  - Role hierarchy: `SUPER_ADMIN` > `STAFF` > `REGISTRAR_ADMIN`
  - _Requirements: 13.6_

- [x] 5.2 Update department and program delete endpoints for soft delete
  - In `adminAcademic.controller.js`: change `deleteDepartment` to set `isDeleted = true` instead of `prisma.department.delete`
  - In `adminAcademic.controller.js`: change `deleteProgram` to set `isDeleted = true`
  - Update `getDepartments` and `getPrograms` to add `where: { isDeleted: false }` filter
  - Add `getDeletedDepartments` and `getDeletedPrograms` endpoints that filter `isDeleted: true`
  - Add `restoreDepartment` and `restoreProgram` endpoints that set `isDeleted = false`
  - _Requirements: 19.2, 19.3, 19.4, 19.5_

- [x] 5.3 Add duplicate code validation to backend
  - In `createDepartment`: check `prisma.department.findUnique({ where: { code } })` before creating; return 400 if exists
  - In `createProgram`: check `prisma.program.findUnique({ where: { code } })` before creating; return 400 if exists
  - In `deleteDepartment`: check `prisma.program.count({ where: { departmentId, isDeleted: false } })`; return 400 if > 0
  - _Requirements: 15.3, 15.4_

- [x] 5.4 Write property test for duplicate code validation
  - **Property 6: Duplicate code rejected for any entity type**
  - **Validates: Requirements 15.1, 15.2, 15.4**
  - Use `fc.string({ minLength: 2, maxLength: 10 })` for code strings
  - For each entity type, attempt to create two records with the same code and assert the second returns a 4xx error

- [x] 5.5 Wire up audit log writes in admin controllers
  - Extend `backend/src/utils/audit.js` with `logAudit(userId, action, entity, entityName, details)` helper
  - Call `logAudit` after every successful create, update, delete in `adminAcademic.controller.js`
  - Add `GET /admin/audit-logs` endpoint with pagination (`skip`, `take` query params), ordered by `createdAt desc`
  - Include actor user name in response via `include: { User: { select: { name: true } } }`
  - _Requirements: 14.1, 14.2, 14.5_

- [x] 5.6 Write property test for audit log creation
  - **Property 5: Audit log entry created for every mutation**
  - **Validates: Requirements 14.1, 14.2**
  - Use `fc.constantFrom('department', 'program', 'course')` and `fc.constantFrom('CREATE', 'UPDATE', 'DELETE')` as generators
  - After each mutation, query audit logs and assert an entry exists with matching action, entity, and userId

- [-] 6. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Refactor `AdminDashboard.jsx` — replace inline components with new primitives
  - Replace all inline `<button>` elements with `<Button variant="...">` from the new component
  - Replace all inline `<input>` elements in modals with `<Input>` component
  - Replace all modal JSX blocks with `<Modal>` and `<ConfirmModal>` components
  - Replace all `<span>` status badges with `<Badge status="...">` component
  - Replace all `StatCard` inline definitions with the new `StatCard` component
  - Replace all empty table states with `<EmptyState>` component
  - Replace all loading spinners in tables with `<TableSkeleton rows={5} cols={4} />`
  - _Requirements: 1.1, 1.2, 2.1–2.5, 4.3, 5.4, 9.1_

- [x] 8. Replace inline message banner with `react-hot-toast`
  - Remove `message` state and `showNotify` function from `AdminDashboard.jsx`
  - Replace all `showNotify('...', 'success')` calls with `toast.success('...')`
  - Replace all `showNotify('...', 'error')` calls with `toast.error('...')`
  - Remove the inline message banner JSX block
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 8.1 Write property test for toast on CRUD operations
  - **Property 3: Toast shown for all entity CRUD operations**
  - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
  - Mock the API and `toast` module; use `fc.constantFrom('department', 'program', 'course')` and `fc.constantFrom('create', 'update', 'delete')` as generators
  - Assert `toast.success` is called on success and `toast.error` is called on failure for every combination

- [x] 9. Implement confirmation modal for delete actions
  - Replace `window.confirm(...)` calls in `handleDeleteDepartment` and `handleDeleteProgram` with state-driven `<ConfirmModal>`
  - Add `deleteTarget` state: `{ type: 'department'|'program', id, name }`
  - When Delete button is clicked: set `deleteTarget` and open `ConfirmModal`
  - On confirm: call the appropriate delete handler; on cancel: clear `deleteTarget`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Implement search, filter, and global search
  - Keep existing `searchTerm` state and `filteredItems` utility
  - Add `programTypeFilter` state (`''`|`'DECLARED'`|`'UNDECLARED'`) for programs tab
  - Add a filter dropdown next to the search bar when on the programs tab
  - Add `globalSearchMode` state: when the search bar is focused and has 3+ characters, show a dropdown with grouped results (students, programs, departments)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 11. Implement pagination
  - Add `page` and `pageSize` state (default: page=1, pageSize=20)
  - Create `paginatedItems(list, page, pageSize)` utility that returns the correct slice
  - Apply `paginatedItems` to all table renders (students, instructors, courses, departments, programs)
  - Render `<Pagination>` below each table
  - Reset `page` to 1 when `searchTerm` or `programTypeFilter` changes
  - Scroll table container to top on page change
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 12. Implement bulk operations
  - Add `selectedIds` state (Set) to `AdminDashboard.jsx`
  - Add checkbox column to students and programs tables
  - Add "Select All" checkbox in table header that toggles all current-page IDs
  - Render `<BulkToolbar>` above the table when `selectedIds.size > 0`
  - Implement bulk delete: iterate `selectedIds`, call delete for each, show summary toast
  - Implement "Assign Program" bulk action for students: open a program selection modal, then call update API for each selected student
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [x] 12.1 Write property test for bulk selection
  - **Property 8: Bulk selection toolbar visibility**
  - **Validates: Requirements 17.1, 17.2, 17.6**
  - Property test passes: toolbar visible iff selectedCount > 0

- [x] 13. Implement CSV export
  - Create `frontend/src/utils/exportCsv.js` utility:
    - `exportStudentsCsv(students)`: maps to `[Student ID, Full Name, Program, Status, Enrollment Date]` and triggers download
    - `exportProgramsCsv(programs)`: maps to `[Code, Name, Type, Department, Duration, Total Credits]` and triggers download
    - Both functions operate on the currently filtered data set passed as argument
  - Add "Export CSV" button to students and programs tab headers
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [x] 13.1 Write property test for CSV export
  - **Property 9: CSV export round trip**
  - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**
  - Use `fc.array(fc.record({ studentId: fc.string(), name: fc.string(), ... }), { minLength: 1 })` as generator
  - Call `exportStudentsCsv` and parse the output; assert all input field values appear in the CSV rows

- [x] 14. Implement soft delete trash view
  - Add "Trash" sub-tab to departments and programs tabs (visible to SUPER_ADMIN only)
  - When trash sub-tab is active: fetch from `GET /admin/departments/deleted` or `GET /admin/programs/deleted`
  - Render deleted records in a table with a "Restore" button per row
  - On restore: call `PUT /admin/departments/:id/restore` or `PUT /admin/programs/:id/restore`, refresh list, show success toast
  - _Requirements: 19.4, 19.5_

- [x] 14.1 Write property test for soft delete
  - **Property 10: Soft delete removes from list and appears in trash**
  - **Validates: Requirements 19.2, 19.3, 19.4**
  - Mock the API; for any record, after soft delete assert it is absent from the main list response and present in the deleted list response

- [x] 15. Implement audit log tab
  - Add "Audit Log" tab to sidebar, visible only when `isSuperAdmin` is true
  - Fetch from `GET /admin/audit-logs?skip=0&take=20` on tab activation
  - Render a table with columns: Actor, Action (badge), Entity, Entity Name, Timestamp
  - Add pagination using `<Pagination>` component
  - _Requirements: 14.3, 14.4, 14.5_

- [ ] 16. Implement breadcrumbs
  - Add `<Breadcrumb>` below the top header in `AdminDashboard.jsx`
  - Compute `breadcrumbItems` from `activeTab` and `modal` state:
    - Default: `[{ label: 'Admin' }]`
    - With tab: `[{ label: 'Admin', onClick: () => setActiveTab('overview') }, { label: tabLabel }]`
    - With modal open: append `{ label: modalLabel }` (e.g., "Add Program", "Edit Department")
  - _Requirements: 20.1, 20.2, 20.3_

- [x] 16.1 Write property test for breadcrumb
  - **Property 11: Breadcrumb reflects current navigation state**
  - **Validates: Requirements 20.1, 20.2**
  - Use `fc.constantFrom('overview', 'students', 'departments', 'programs', 'courses', 'notifications')` as generator
  - Assert the last breadcrumb segment text matches the expected tab display name

- [x] 17. Implement responsive mobile sidebar
  - Add `mobileMenuOpen` state to `AdminDashboard.jsx`
  - Add a hamburger button (`Menu` icon from lucide-react) in the top header, visible only on `lg:hidden`
  - When `mobileMenuOpen=true`: render sidebar as a fixed overlay with backdrop and slide-in animation
  - Add close button inside the mobile sidebar
  - _Requirements: 10.1_

- [x] 18. Apply RBAC to UI — gate buttons and tabs by admin sub-role
  - Import `useAdminRole` hook in `AdminDashboard.jsx`
  - Wrap all Delete buttons with `{isSuperAdmin && <Button variant="danger">...}` or `{can('delete') && ...}`
  - Restrict sidebar tabs: `REGISTRAR_ADMIN` sees only "Students"; `STAFF` sees all except "Audit Log"
  - Show "Unauthorized" toast if a restricted action is attempted programmatically
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 19. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
