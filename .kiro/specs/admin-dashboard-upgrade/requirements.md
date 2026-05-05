# Requirements Document

## Introduction

This feature upgrades the existing admin panel of the Atlas Portal (a university management system built with React, Tailwind CSS, Node.js, Express, and Prisma) to production-level quality. The goal is to transform the admin dashboard into a professional, modern, and scalable interface comparable to real SaaS platforms — without rewriting the application. All improvements are incremental and must preserve existing functionality.

The admin panel currently covers: overview stats, students, instructors, courses, departments, programs, and notifications. The upgrade targets UI consistency, UX polish, reusable components, toast notifications, search/filter, empty states, loading states, error handling, responsiveness, role-based access control, audit logging, pagination, bulk operations, CSV export, soft delete, and code quality.

## Glossary

- **Admin Dashboard**: The `AdminDashboard.jsx` page at `/admin` for users with the `ADMIN` role.
- **Design System**: Shared color tokens, component styles, and spacing rules applied consistently across the admin UI.
- **Toast Notification**: A transient, non-blocking UI message shown in response to user actions.
- **Modal**: A centered overlay dialog used for create/edit forms.
- **Confirmation Modal**: A dialog that asks the user to confirm a destructive action before proceeding.
- **Empty State**: A UI placeholder shown when a list or table has no data.
- **Loading Skeleton**: A placeholder UI element shown while data is being fetched.
- **Badge**: A small inline label communicating status or type (e.g., ACTIVE, DECLARED).
- **Sidebar**: The fixed left navigation panel in the admin layout.
- **react-hot-toast**: A lightweight React toast notification library.
- **ProgramType**: An enum value of either `DECLARED` (linked to a department) or `UNDECLARED`.
- **Zebra Rows**: Alternating row background colors in a table for improved readability.
- **Reusable Component**: A self-contained React component usable in multiple places without duplication.
- **RBAC**: Role-Based Access Control — UI actions and API endpoints gated by the user's assigned sub-role.
- **AdminRole**: A sub-role within the ADMIN type: `SUPER_ADMIN` (full access), `STAFF` (view + create), `REGISTRAR_ADMIN` (student management).
- **AuditLog**: A database record capturing who performed what action on which entity and when.
- **Soft Delete**: Marking a record as deleted (`isDeleted: true`) rather than removing it from the database.
- **Pagination**: Splitting a large list into pages with controls for navigating between them.
- **Bulk Operation**: An action applied simultaneously to multiple selected records.
- **CSV Export**: A downloadable comma-separated values file generated from a data set.
- **Global Search**: A single search input that queries across multiple entity types simultaneously.
- **Breadcrumb**: A secondary navigation aid showing the user's current location in the app hierarchy.

---

## Requirements

### Requirement 1 — Design System

**User Story:** As an admin, I want a consistent design system applied across all UI elements, so that the dashboard looks professional and cohesive.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL apply a consistent color palette: `blue-600` for primary actions, `green-500` for success, `amber-500` for warnings, `red-500` for danger, and gray scale for neutral elements.
2. THE Admin Dashboard SHALL apply consistent border-radius, spacing, and typography tokens across all buttons, badges, cards, and alerts.
3. WHEN a primary action button is rendered, THE Admin Dashboard SHALL display it with `bg-blue-600 text-white` and `hover:bg-blue-700`.
4. WHEN a danger action button is rendered, THE Admin Dashboard SHALL display it with `bg-red-500 text-white` and `hover:bg-red-600`.
5. WHEN a secondary action button is rendered, THE Admin Dashboard SHALL display it with `bg-gray-100 text-gray-700` and `hover:bg-gray-200`.

---

### Requirement 2 — Reusable Components

**User Story:** As an admin, I want reusable UI components (Button, Input, Modal, Badge, Card), so that the codebase is maintainable and consistent.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL provide a reusable `Button` component accepting `variant` (`primary`, `secondary`, `danger`), `loading`, and `disabled` props.
2. WHEN the `Button` component receives `loading={true}`, THE Button SHALL display an inline spinner and disable interaction.
3. WHEN the `Button` component receives `disabled={true}`, THE Button SHALL render with reduced opacity and prevent click events.
4. THE Admin Dashboard SHALL provide a reusable `Input` component with label, placeholder, `focus:ring-2 focus:ring-blue-500`, and error message support.
5. THE Admin Dashboard SHALL provide a reusable `Modal` component that renders centered with a backdrop overlay, `rounded-2xl`, `shadow-2xl`, and smooth fade+scale animation.

---

### Requirement 3 — Toast Notifications

**User Story:** As an admin, I want toast notifications for all create, update, and delete actions, so that I receive immediate feedback.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL use `react-hot-toast` for all user-facing feedback messages.
2. WHEN a department, program, or course is successfully created, THE Admin Dashboard SHALL display a green success toast.
3. WHEN a department, program, or course is successfully updated, THE Admin Dashboard SHALL display a green success toast.
4. WHEN a department, program, or course is successfully deleted, THE Admin Dashboard SHALL display a green success toast.
5. IF a create, update, or delete operation fails, THEN THE Admin Dashboard SHALL display a red error toast with the backend error message.
6. THE Admin Dashboard SHALL remove the existing inline `message` state banner and replace it entirely with toast notifications.

---

### Requirement 4 — Overview Dashboard

**User Story:** As an admin, I want a professional overview dashboard with summary stat cards, so that I can quickly assess the state of the institution.

#### Acceptance Criteria

1. THE Admin Dashboard overview tab SHALL display stat cards for: Total Students, Active Instructors, Active Courses, Total Departments, and Total Programs.
2. EACH stat card SHALL display an icon, a numeric value, a label, and a colored accent consistent with the design system.
3. WHILE data is loading, THE Admin Dashboard SHALL display loading skeleton placeholders in place of stat card values.
4. THE Admin Dashboard overview tab SHALL display a recent departments table and an active semester card.

---

### Requirement 5 — Tables

**User Story:** As an admin, I want upgraded data tables with zebra rows, hover effects, action buttons, and metadata columns, so that I can efficiently manage records.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL render all data tables with alternating row background colors (zebra rows).
2. WHEN a user hovers over a table row, THE Admin Dashboard SHALL apply a `hover:bg-gray-50` transition effect.
3. THE Admin Dashboard departments and programs tables SHALL include Edit and Delete action buttons per row.
4. WHEN a table has no matching records after filtering, THE Admin Dashboard SHALL display an empty state with an icon, message, and an action button.
5. THE Admin Dashboard tables SHALL scroll horizontally on small screens to prevent layout overflow.
6. THE Admin Dashboard tables for departments and programs SHALL display a `Created At` metadata column.

---

### Requirement 6 — Modals and Forms

**User Story:** As an admin, I want improved modals for create and edit forms, so that data entry is clear and error-free.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL render all create/edit modals centered on screen with a semi-transparent backdrop overlay.
2. WHEN a modal opens, THE Admin Dashboard SHALL animate it with a fade and scale-in transition.
3. THE Admin Dashboard modal forms SHALL display proper labels, required field indicators (`*`), and `focus:ring-2 focus:ring-blue-500` on inputs.
4. WHEN the Program modal type is set to `UNDECLARED`, THE Admin Dashboard SHALL hide the department selection field.
5. WHEN the Program modal type is set to `DECLARED`, THE Admin Dashboard SHALL require and display the department selection field.
6. WHEN a form is submitting, THE Admin Dashboard SHALL disable the submit button and display a loading spinner inside it.

---

### Requirement 7 — Confirmation Modal

**User Story:** As an admin, I want a confirmation modal before destructive delete actions, so that I do not accidentally delete records.

#### Acceptance Criteria

1. WHEN an admin clicks a Delete button on a department or program row, THE Admin Dashboard SHALL display a confirmation modal instead of a `window.confirm` dialog.
2. THE confirmation modal SHALL display the name of the item being deleted and a warning message.
3. WHEN the admin confirms deletion in the modal, THE Admin Dashboard SHALL proceed with the delete API call.
4. WHEN the admin cancels in the confirmation modal, THE Admin Dashboard SHALL close the modal and take no action.

---

### Requirement 8 — Search and Filter

**User Story:** As an admin, I want search and filter functionality for students, programs, and departments, so that I can quickly find specific records.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL provide a search input that filters the currently active tab's data in real time.
2. WHEN the admin is on the students tab, THE Admin Dashboard SHALL filter students by name or student ID.
3. WHEN the admin is on the departments tab, THE Admin Dashboard SHALL filter departments by name or code.
4. WHEN the admin is on the programs tab, THE Admin Dashboard SHALL filter programs by name, code, or department name.
5. WHEN the admin is on the programs tab, THE Admin Dashboard SHALL provide a filter dropdown to filter programs by type (`DECLARED` / `UNDECLARED`).
6. THE Admin Dashboard SHALL provide a global search mode that queries across students, programs, and departments simultaneously and displays grouped results.

---

### Requirement 9 — Loading and Submission States

**User Story:** As an admin, I want loading skeletons and disabled states during data fetching, so that the UI feels responsive and prevents double submissions.

#### Acceptance Criteria

1. WHILE the initial data fetch is in progress, THE Admin Dashboard SHALL display skeleton placeholder rows in tables.
2. WHILE a form is submitting, THE Admin Dashboard SHALL disable all form inputs and the submit button.
3. WHEN a delete action is in progress, THE Admin Dashboard SHALL disable the delete button for that row.
4. THE Admin Dashboard SHALL prevent double form submissions by disabling the submit button after the first click until the operation completes.

---

### Requirement 10 — Responsiveness

**User Story:** As an admin, I want the dashboard to be responsive on tablets and mobile screens, so that I can manage the institution from any device.

#### Acceptance Criteria

1. WHEN the viewport width is below 1024px, THE Admin Dashboard sidebar SHALL collapse and be accessible via a hamburger menu toggle.
2. THE Admin Dashboard tables SHALL be wrapped in a horizontally scrollable container on viewports below 768px.
3. THE Admin Dashboard stat cards grid SHALL reflow to a single column on viewports below 640px.
4. THE Admin Dashboard modals SHALL be full-width with appropriate padding on viewports below 640px.

---

### Requirement 11 — Program Type Badges

**User Story:** As an admin, I want program type badges and smart form logic, so that DECLARED and UNDECLARED programs are visually distinct and correctly managed.

#### Acceptance Criteria

1. WHEN a program has type `DECLARED`, THE Admin Dashboard SHALL display a green badge labeled "DECLARED".
2. WHEN a program has type `UNDECLARED`, THE Admin Dashboard SHALL display an amber badge labeled "UNDECLARED".
3. WHEN creating or editing a program with type `DECLARED`, THE Admin Dashboard SHALL require a department to be selected before the form can be submitted.
4. WHEN creating or editing a program with type `UNDECLARED`, THE Admin Dashboard SHALL not require or display the department field.

---

### Requirement 12 — Error Handling

**User Story:** As an admin, I want all backend errors surfaced clearly in the UI, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. IF an API call returns an error response, THEN THE Admin Dashboard SHALL display the backend error message in a toast notification.
2. THE Admin Dashboard SHALL wrap all API calls in try/catch blocks to prevent silent failures.
3. IF a network error occurs during data fetch, THEN THE Admin Dashboard SHALL display an error toast and show a retry option or empty state.

---

### Requirement 13 — Role-Based Access Control

**User Story:** As a system administrator, I want role-based access control within the admin panel, so that different staff members have appropriate permissions.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL recognize three admin sub-roles: `SUPER_ADMIN` (full access), `STAFF` (view and create only), and `REGISTRAR_ADMIN` (student management only).
2. WHEN a `STAFF` user is logged in, THE Admin Dashboard SHALL hide all Delete buttons for departments and programs.
3. WHEN a `REGISTRAR_ADMIN` user is logged in, THE Admin Dashboard SHALL restrict navigation to the students tab only.
4. WHEN a `SUPER_ADMIN` user is logged in, THE Admin Dashboard SHALL display all tabs and all action buttons without restriction.
5. IF a user attempts an action beyond their role permissions, THEN THE Admin Dashboard SHALL display an "Unauthorized" toast and prevent the action.
6. THE backend SHALL validate the admin sub-role on all mutating endpoints and return a 403 response if the role is insufficient.

---

### Requirement 14 — Audit Logs

**User Story:** As a super admin, I want an audit log of all admin actions, so that I can track who changed what and when for accountability.

#### Acceptance Criteria

1. THE system SHALL record an audit log entry whenever an admin creates, updates, or deletes a department, program, or course.
2. EACH audit log entry SHALL store: action type (`CREATE`, `UPDATE`, `DELETE`), entity type, entity name, acting user ID and name, and timestamp.
3. THE Admin Dashboard SHALL display an Audit Log tab visible only to `SUPER_ADMIN` users.
4. THE Audit Log tab SHALL display entries in reverse chronological order with actor name, action, entity, and timestamp columns.
5. THE backend SHALL expose a `GET /admin/audit-logs` endpoint returning paginated audit log entries.
6. THE Prisma schema SHALL include an `AuditLog` model with fields: `id`, `action`, `entity`, `entityName`, `userId`, `createdAt`.

---

### Requirement 15 — Smart Validation

**User Story:** As an admin, I want smart validation on forms and the backend, so that data integrity is maintained and common mistakes are prevented.

#### Acceptance Criteria

1. WHEN an admin attempts to create a program with a code that already exists, THE Admin Dashboard SHALL display a validation error toast before submitting.
2. WHEN an admin attempts to create a department with a code that already exists, THE Admin Dashboard SHALL display a validation error toast before submitting.
3. WHEN an admin attempts to delete a department that has associated programs, THE backend SHALL return a 400 error and THE Admin Dashboard SHALL display the error message in a toast.
4. THE backend SHALL enforce unique constraints on program codes and department codes and return descriptive error messages on violation.
5. WHEN a required form field is left empty on submit, THE Admin Dashboard SHALL display an inline validation message below the field without submitting the form.

---

### Requirement 16 — Pagination

**User Story:** As an admin, I want paginated tables, so that the dashboard remains performant and usable with large numbers of records.

#### Acceptance Criteria

1. THE Admin Dashboard tables for students, instructors, courses, departments, and programs SHALL display a maximum of 20 records per page by default.
2. THE Admin Dashboard SHALL provide pagination controls: Previous, Next, and current page indicator.
3. THE Admin Dashboard SHALL provide a page size selector with options: 10, 20, 50 records per page.
4. WHEN the admin navigates to a new page, THE Admin Dashboard SHALL scroll to the top of the table.
5. THE Admin Dashboard SHALL display the total record count and current range (e.g., "Showing 1–20 of 87").

---

### Requirement 17 — Bulk Operations

**User Story:** As an admin, I want to select multiple records and perform bulk actions, so that I can manage large sets of students or programs efficiently.

#### Acceptance Criteria

1. THE Admin Dashboard students and programs tables SHALL include a checkbox column for row selection.
2. WHEN one or more rows are selected, THE Admin Dashboard SHALL display a bulk action toolbar above the table.
3. THE bulk action toolbar SHALL provide a "Delete Selected" option for `SUPER_ADMIN` users.
4. THE bulk action toolbar for students SHALL provide an "Assign Program" option that opens a program selection modal.
5. WHEN the admin confirms a bulk delete, THE Admin Dashboard SHALL process each selected record and display a summary toast on completion.
6. THE Admin Dashboard SHALL provide a "Select All" checkbox in the table header that selects all records on the current page.

---

### Requirement 18 — CSV Export

**User Story:** As an admin, I want to export student and program data to CSV, so that I can generate reports for institutional use.

#### Acceptance Criteria

1. THE Admin Dashboard students tab SHALL include an "Export CSV" button that downloads a `students.csv` file.
2. THE students CSV SHALL include columns: Student ID, Full Name, Program, Status, and Enrollment Date.
3. THE Admin Dashboard programs tab SHALL include an "Export CSV" button that downloads a `programs.csv` file.
4. THE programs CSV SHALL include columns: Program Code, Program Name, Type, Department, Duration, and Total Credits.
5. THE CSV export SHALL operate on the currently filtered/searched data set, not the full unfiltered list.
6. THE CSV export SHALL be generated client-side without requiring a backend API call.

---

### Requirement 19 — Soft Delete

**User Story:** As a super admin, I want deleted records to be soft-deleted rather than permanently removed, so that data is recoverable and audit trails are preserved.

#### Acceptance Criteria

1. THE Prisma schema for `Department` and `Program` models SHALL include an `isDeleted Boolean @default(false)` field.
2. WHEN an admin deletes a department or program, THE backend SHALL set `isDeleted = true` rather than removing the record.
3. THE backend list endpoints for departments and programs SHALL filter out records where `isDeleted = true` by default.
4. THE Admin Dashboard SHALL display soft-deleted records in a "Trash" view accessible from the departments and programs tabs.
5. WHEN viewing the Trash, THE Admin Dashboard SHALL provide a "Restore" button per record that sets `isDeleted = false`.

---

### Requirement 20 — Breadcrumbs

**User Story:** As an admin, I want breadcrumb navigation, so that I always know where I am within the admin panel.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL display a breadcrumb trail below the top header showing the current section path (e.g., "Admin > Programs").
2. WHEN a modal is open for creating or editing, THE breadcrumb SHALL update to reflect the action (e.g., "Admin > Programs > Add Program").
3. EACH breadcrumb segment SHALL be a clickable element that navigates to the corresponding section.
