# Design Document — Course Registration with Prerequisite Validation

## Overview

This feature extends the existing university management system with a section-based course registration workflow. Students select sections for the active semester; the backend enforces credit limits, duplicate course prevention, and prerequisite validation before creating enrollment records. The design reuses existing Prisma models (`AcademicSemester`, `Section`, `SectionEnrollment`, `CoursePrerequisites`, `SemesterRegistration`) and extends the existing `registration.controller.js` and `StudentRegistration.jsx` rather than replacing them.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                    │
│  StudentRegistration.jsx                                    │
│  ├── GET /api/student/register/sections  (available)        │
│  └── POST /api/student/register          (submit)           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (axios)
┌────────────────────────▼────────────────────────────────────┐
│  Backend (Express)                                          │
│  POST /api/student/register                                 │
│  ├── validateSemester()                                     │
│  ├── fetchSections()                                        │
│  ├── enforceCreditLimit()                                   │
│  ├── preventDuplicateCourses()                              │
│  ├── validatePrerequisites()                                │
│  └── createRegistrationAndEnrollments()  (Prisma tx)        │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────▼────────────────────────────────────┐
│  PostgreSQL                                                 │
│  AcademicSemester · Section · SectionEnrollment             │
│  CoursePrerequisites · SemesterRegistration                 │
│  Enrollment (legacy)                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Backend

#### New file: `backend/src/controllers/studentRegistration.controller.js`

Exports two handlers:

```
getAvailableSections(req, res)
  GET /api/student/register/sections
  Auth: STUDENT
  Returns: { sections[], activeSemester, creditLimit }

registerSections(req, res)
  POST /api/student/register
  Auth: STUDENT
  Body: { semesterId: string, sectionIds: string[] }
  Returns: { registration, enrollments[] } | error
```

#### New file: `backend/src/utils/prerequisiteValidator.js`

```
PASSING_GRADES: Set<string>  // { 'A', 'B+', 'B', 'C' }

hasPassedCourse(prisma, studentId, courseId): Promise<boolean>
  Checks SectionEnrollment (letterGrade in PASSING_GRADES, status COMPLETED)
  Falls back to Enrollment (letterGrade in PASSING_GRADES, status COMPLETED)

validatePrerequisites(prisma, studentId, courseIds): Promise<ValidationResult>
  Returns { valid: boolean, errors: PrereqError[] }
  PrereqError: { courseCode, courseTitle, missingPrereqCode, missingPrereqTitle }
```

#### Route additions in `backend/src/routes/student.routes.js` (or equivalent)

```
GET  /api/student/register/sections   → getAvailableSections
POST /api/student/register            → registerSections
```

### Frontend

#### Modified: `frontend/src/pages/StudentRegistration.jsx`

The existing page is extended with a new "section-picker" mode alongside the existing curriculum-confirm flow. Key additions:

- `useSectionRegistration` hook (inline state) managing:
  - `selectedSectionIds: Set<string>`
  - `totalCredits: number` (derived, no server call)
  - `duplicateWarnings: string[]` (derived)
  - `prereqWarnings: { courseTitle, prereqs[] }[]` (derived from section metadata)
- Submit calls `POST /api/student/register`
- Real-time credit counter and validation badges

---

## Data Models

No schema migrations are required. All necessary models already exist:

| Model | Relevant fields used |
|---|---|
| `AcademicSemester` | `id`, `isActive`, `registrationStart`, `registrationEnd` |
| `Section` | `id`, `courseId`, `semesterId`, `maxStudents` |
| `SectionEnrollment` | `studentId`, `sectionId`, `letterGrade`, `status` |
| `CoursePrerequisites` | `courseId`, `prerequisiteId` |
| `SemesterRegistration` | `studentId`, `semesterId`, `status`, `totalCredits` |
| `Course` | `id`, `code`, `title`, `credits` |
| `Enrollment` | `studentId`, `courseId`, `semesterId`, `letterGrade`, `status` (legacy fallback) |

**Credit limit** is read from `process.env.MAX_REGISTRATION_CREDITS` with a default of `18`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Credit limit rejection
*For any* set of sections whose total credits exceed the configured maximum, the `registerSections` handler SHALL return an error and SHALL NOT create any SemesterRegistration or SectionEnrollment records.
**Validates: Requirements 3.1, 3.2**

Property 2: Duplicate course rejection
*For any* set of sections that contains two or more sections belonging to the same course, the `registerSections` handler SHALL return an error and SHALL NOT create any SemesterRegistration or SectionEnrollment records.
**Validates: Requirements 4.1, 4.2**

Property 3: Prerequisite rejection
*For any* student and any course whose prerequisites the student has not passed, the `registerSections` handler SHALL return an error and SHALL NOT create any SemesterRegistration or SectionEnrollment records.
**Validates: Requirements 5.2, 5.3**

Property 4: Successful registration completeness
*For any* valid registration request (within credit limit, no duplicates, all prerequisites satisfied), the `registerSections` handler SHALL create exactly one SemesterRegistration record and exactly one SectionEnrollment record per selected section.
**Validates: Requirements 2.1, 2.2**

Property 5: Real-time credit total accuracy
*For any* selection of sections on the frontend, the displayed total credits SHALL equal the sum of the `credits` field of the course associated with each selected section.
**Validates: Requirements 6.1**

Property 6: `hasPassedCourse` correctness
*For any* student and course, `hasPassedCourse` SHALL return true if and only if the student has at least one SectionEnrollment or Enrollment record for that course with a letterGrade in { A, B+, B, C } and status COMPLETED.
**Validates: Requirements 5.2**

---

## Error Handling

All validation errors return HTTP 400 with a structured body:

```json
{
  "success": false,
  "message": "<human-readable summary>",
  "code": "CREDIT_LIMIT_EXCEEDED | DUPLICATE_COURSE | PREREQUISITE_NOT_SATISFIED | INVALID_SECTION | REGISTRATION_CLOSED | ALREADY_REGISTERED",
  "details": { ... }
}
```

| Scenario | HTTP | `code` | `details` |
|---|---|---|---|
| Credit limit exceeded | 400 | `CREDIT_LIMIT_EXCEEDED` | `{ total, limit }` |
| Duplicate course | 400 | `DUPLICATE_COURSE` | `{ courseCode, courseTitle }` |
| Prerequisite not satisfied | 400 | `PREREQUISITE_NOT_SATISFIED` | `{ courseCode, missingPrereqCode }` |
| Invalid / wrong-semester section | 400 | `INVALID_SECTION` | `{ sectionId }` |
| Registration window closed | 403 | `REGISTRATION_CLOSED` | `{ state }` |
| Already registered | 409 | `ALREADY_REGISTERED` | `{ status }` |

---

## Testing Strategy

### Property-Based Testing

Library: **fast-check** (already available in the frontend; added as a dev dependency to the backend as well).

Each property-based test runs a minimum of 100 iterations.

Tests are tagged with the format: `**Feature: course-registration-prerequisites, Property {N}: {text}**`

#### Properties to implement as PBTs:

- **Property 1** — Generate arbitrary arrays of sections with random credit values; assert that any combination summing > 18 is rejected and no DB records are created.
- **Property 2** — Generate section arrays where at least two share a `courseId`; assert rejection and no DB records.
- **Property 3** — Generate a student with no completed enrollments and a course with prerequisites; assert rejection.
- **Property 4** — Generate valid section arrays (within limit, no duplicates, prerequisites met); assert exactly one registration and N enrollments are created.
- **Property 6** — Generate arbitrary grade strings; assert `hasPassedCourse` returns true iff the grade is in `{ A, B+, B, C }`.

#### Unit Tests

- `validatePrerequisites` with a student who has passed all prerequisites → valid
- `validatePrerequisites` with a student missing one prerequisite → error with correct course codes
- `hasPassedCourse` with COMPLETED + passing grade → true
- `hasPassedCourse` with COMPLETED + failing grade (D, F) → false
- `hasPassedCourse` with ENROLLED status (not completed) → false
- `registerSections` with already-SUBMITTED registration → 409
- `getAvailableSections` with no active semester → empty list + message

### Integration Tests

End-to-end flow: seed a student with prerequisites satisfied → POST /api/student/register → assert SemesterRegistration and SectionEnrollment records in DB.
