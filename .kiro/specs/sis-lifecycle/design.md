# Design Document — SIS Lifecycle & Registration

## Overview

The SIS Lifecycle & Registration feature extends the existing Atlas Health College platform to deliver a complete, registrar-controlled academic lifecycle. The system already has a solid Prisma schema, lifecycle service, and registration controller. This design identifies the gaps, bugs, and missing pieces and specifies exactly what must be built or fixed to satisfy all requirements.

The key design goals are:
- Registrar has full control over semester dates and registration windows
- Registration window state is computed server-side and enforced on every write
- Student lifecycle (FRESHMAN → SOPHOMORE → JUNIOR → SENIOR → GRADUATED) is driven by credit thresholds and CGPA
- GPA is always credit-weighted and computed from SectionEnrollment records
- Dashboards surface the right data with no empty or ambiguous states

---

## Architecture

The system follows the existing layered architecture:

```
Client (React + Vite)
  └── API Layer (axios, /api/*)
        └── Express Router
              └── Controller
                    ├── Prisma ORM (PostgreSQL)
                    ├── lifecycle.service.js
                    ├── registrationWindow.js (util)
                    └── gpa.js (util)
```

No new infrastructure is required. All changes are within the existing Node.js backend and React frontend.

---

## Components and Interfaces

### Backend Components

| Component | File | Responsibility |
|---|---|---|
| Semester Controller | `academic.controller.js` | CRUD for AcademicSemester; date validation |
| Registration Window | `utils/registrationWindow.js` | Compute UPCOMING/OPEN/CLOSED state |
| Lifecycle Service | `services/lifecycle.service.js` | Progress, graduate, eligibility check |
| Registration Controller | `controllers/registration.controller.js` | Draft, confirm, submit registration |
| Registrar Controller | `controllers/registrar.controller.js` | Approve/reject, dashboard stats, lifecycle triggers |
| Student Controller | `controllers/student.controller.js` | Profile, academic record, lifecycle endpoint, transcript |
| GPA Utility | `utils/gpa.js` | Credit-weighted GPA calculation |

### Frontend Components

| Component | File | Responsibility |
|---|---|---|
| Student Dashboard | `pages/StudentDashboard.jsx` | Lifecycle status, GPA, credits, alerts, registration CTA |
| Registrar Dashboard | `pages/RegistrarDashboard.jsx` | Stats, pending registrations, semester management |
| Registration Page | `pages/Registration.jsx` | Course selection, draft save, confirm |

### Key API Endpoints

```
GET  /api/academic/semesters/active          → active semester + registration state
POST /api/academic/semesters                 → create semester (registrar/admin)
PUT  /api/academic/semesters/:id             → update semester dates
PATCH /api/academic/semesters/:id/activate   → activate semester

GET  /api/registration/available-courses     → curriculum courses + window state
GET  /api/registration/my-draft             → current draft
POST /api/registration/draft                → save draft
POST /api/registration/confirm              → confirm & submit

GET  /api/student/lifecycle                 → full lifecycle data for dashboard
GET  /api/student/academic-record           → courses + live GPA
GET  /api/student/transcript                → official transcript (graduated only)

GET  /api/registrar/dashboard/stats         → registrar stats
GET  /api/registrar/registrations/pending   → pending registrations
PUT  /api/registrar/registrations/:id/status → approve/reject
POST /api/registrar/students/:id/progress   → trigger progression
POST /api/registrar/students/:id/graduate   → trigger graduation
GET  /api/registrar/students/:id/graduation-check → eligibility
POST /api/registrar/students/bulk-progress  → bulk progression
```

---

## Data Models

All models already exist in `prisma/schema.prisma`. The relevant fields are:

### AcademicSemester
```
id, name, type (FALL|SPRING|SUMMER), year
startDate, endDate          ← academic term dates
registrationStart, registrationEnd  ← registration window (separate)
dropDeadline, addDeadline
isActive
```

### Student
```
academicLevel: AcademicLevel  (APPLICANT|ADMITTED|FRESHMAN|SOPHOMORE|JUNIOR|SENIOR|GRADUATED)
status: StudentStatus         (ACTIVE|PROBATION|SUSPENDED|GRADUATED|DROPPED|ON_LEAVE|WITHDRAWN)
currentYear: Int              (1–4)
currentSemester: SemesterType (FALL|SPRING|SUMMER)
cumulativeGPA: Float
totalCredits: Int
graduatedAt: DateTime?
currentSemesterId: String?    → FK to AcademicSemester
```

### SemesterRegistration
```
status: RegistrationStatus (DRAFT|SUBMITTED|APPROVED|REJECTED|WAITLISTED)
totalCredits: Int
isPaid: Boolean
approvedBy, approvedAt, rejectionReason
```

### SectionEnrollment
```
studentId, sectionId
grade: Float?, letterGrade: String?
status: EnrollmentStatus (ENROLLED|COMPLETED|DROPPED|...)
```

### Section
```
courseId, instructorId, semesterId
name (e.g. "A", "B")
maxStudents
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Registration window state correctness**
*For any* AcademicSemester with defined registrationStart and registrationEnd dates, the `getRegistrationState` function must return:
- UPCOMING (with correct daysUntilOpen) when the current time is before registrationStart
- OPEN (with correct daysUntilClose) when the current time is within the window
- CLOSED when the current time is after registrationEnd
**Validates: Requirements 2.1, 2.2, 2.3**

**Property 2: Registration window enforcement on writes**
*For any* student with a valid lifecycle state, attempting to save or confirm a registration when the RegistrationState is UPCOMING or CLOSED must be rejected with a 403 status containing the current state message.
**Validates: Requirements 2.4**

**Property 3: Student field invariants**
*For any* student record in the database, the `academicLevel` field must be one of {APPLICANT, ADMITTED, FRESHMAN, SOPHOMORE, JUNIOR, SENIOR, GRADUATED} and the `status` field must be one of {ACTIVE, PROBATION, SUSPENDED, GRADUATED, DROPPED, ON_LEAVE, WITHDRAWN}.
**Validates: Requirements 3.1, 3.2**

**Property 4: Blocked registration for ineligible students**
*For any* student whose `status` is SUSPENDED, WITHDRAWN, or DROPPED, or whose `academicLevel` is APPLICANT or ADMITTED, the `canStudentAttemptRegistration` function must return `{ ok: false }` with a non-empty reason string.
**Validates: Requirements 3.4, 3.5, 5.4**

**Property 5: Progression promotes eligible students correctly**
*For any* student in Year N (N < program durationYears) with completedCredits ≥ MIN_CREDITS_TO_PROGRESS[N] and CGPA ≥ 2.0, calling `progressStudent` must return `{ promoted: true, newYear: N+1, newLevel: YEAR_TO_LEVEL[N+1] }` and the student record must be updated accordingly.
**Validates: Requirements 4.1**

**Property 6: Ineligible progression sets probation**
*For any* student who fails progression due to insufficient credits or CGPA below 2.0, `progressStudent` must return `{ promoted: false }` with a reason, and if CGPA < 2.0 the student's status must be set to PROBATION.
**Validates: Requirements 4.2, 4.3**

**Property 7: Bulk progression covers all eligible students**
*For any* set of N students with status ACTIVE or PROBATION, `bulkProgressStudents` must return a result array of exactly N entries, one per student.
**Validates: Requirements 4.4**

**Property 8: Graduation eligibility response completeness**
*For any* student, `checkGraduationEligibility` must return an object containing the fields: `eligible` (boolean), `reason` (string), `completedCredits` (number), `requiredCredits` (number), and `cgpa` (number).
**Validates: Requirements 5.1**

**Property 9: Graduation state transition**
*For any* student who meets all graduation requirements, calling `graduateStudent` must result in the student record having `status = GRADUATED`, `academicLevel = GRADUATED`, and a non-null `graduatedAt` timestamp.
**Validates: Requirements 5.2**

**Property 10: Graduation rejection for missing courses**
*For any* student who has not completed all required program courses, calling `graduateStudent` must throw an error (or return a rejection) without modifying the student's status or academicLevel.
**Validates: Requirements 5.3**

**Property 11: Transcript structure completeness**
*For any* graduated student, the transcript endpoint must return an object containing: `institution` (string), `student` (object with name, studentId, email), `degree` (object with program, code, department, degreeLevel), `graduatedAt` (timestamp), `cgpa` (number), `totalCreditsEarned` (number), and `terms` (array).
**Validates: Requirements 5.5**

**Property 12: Lifecycle response completeness**
*For any* student, the `/student/lifecycle` endpoint must return an object containing: `academicLevel`, `academicLevelLabel`, `status`, `currentYear`, `currentSemester`, `sgpa`, `cgpa`, `completedCredits`, `requiredCredits`, `progressPct`, `canRegister`, and `activeSemester`.
**Validates: Requirements 6.1**

**Property 13: Registrar dashboard stats completeness**
*For any* system state, the `/registrar/dashboard/stats` endpoint must return an object containing: `totalStudents`, `pendingRegistrations`, `pendingApplications`, `paymentsThisMonth`, `activeSemester`, and `registrationOpen`.
**Validates: Requirements 7.1**

**Property 14: Registration approval creates enrollments**
*For any* SUBMITTED SemesterRegistration with K RegistrationCourse entries, approving it must result in exactly K new Enrollment records for the student in that semester, and each course's `currentEnrollment` must be incremented by 1.
**Validates: Requirements 7.3**

**Property 15: Available courses match student curriculum**
*For any* student, all courses returned by `/registration/available-courses` must have a ProgramCourse entry matching the student's `programId`, `currentYear`, and the semester number derived from `currentSemester`.
**Validates: Requirements 8.1, 8.2**

**Property 16: Credit-weighted GPA calculation**
*For any* collection of `{ letterGrade, credits }` pairs where letterGrade is a valid grade symbol and credits > 0, `calculateGPA` must return the exact credit-weighted average of grade points, rounded to 2 decimal places. When the collection is empty or all grades are I/W, the result must be 0.0.
**Validates: Requirements 9.1, 9.2, 9.3**

**Property 17: Semester date constraint enforcement**
*For any* create-semester request where registrationStart ≥ registrationEnd or startDate ≥ endDate, the SIS must return a 400 error without persisting a record.
**Validates: Requirements 1.5**

**Property 18: Semester activation exclusivity**
*For any* collection of N semesters, activating one semester must result in exactly one semester with isActive = true across all N semesters.
**Validates: Requirements 1.3**

---

## Error Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Registration window not OPEN | 403 | `{ success: false, message, registration: { state, message } }` |
| Student status blocks registration | 403 | `{ success: false, message: reason }` |
| Graduation with missing courses | 400 | `{ success: false, message: "N required course(s) not completed" }` |
| Transcript for non-graduate | 403 | `{ success: false, message: "Official transcript issued after graduation..." }` |
| Invalid date constraints on semester | 400 | `{ success: false, message: "registrationStart must be before registrationEnd" }` |
| No active semester | 400/200 | Context-dependent; registration returns 400, lifecycle returns null activeSemester |
| Student not found | 404 | `{ success: false, message: "Student not found" }` |
| Duplicate semester (type+year) | 400 | `{ success: false, message: "Semester already exists" }` |

---

## Testing Strategy

### Property-Based Testing Library
**Backend:** [fast-check](https://github.com/dubzzz/fast-check) (JavaScript/TypeScript PBT library). Each property test runs a minimum of 100 iterations.

**Frontend:** No PBT required; unit tests with Vitest cover component rendering.

### Unit Tests
Unit tests cover:
- Specific examples of the admissions flow (student created with FRESHMAN/ACTIVE)
- Transcript 403 for non-graduated student
- Empty curriculum returns 400 on confirm
- GPA edge cases (empty input, all I/W grades)

### Property-Based Tests
Each correctness property (1–18) is implemented as a single fast-check property test. Tests are tagged with the format:
`// Feature: sis-lifecycle, Property N: <property text>`

Property tests focus on pure functions where possible:
- `getRegistrationState` (Properties 1, 2) — pure function, no DB needed
- `canStudentAttemptRegistration` (Property 4) — pure function, no DB needed
- `calculateGPA` (Property 16) — pure function, no DB needed
- `yearToLevel` / `progressStudent` logic (Properties 5, 6) — can be tested with in-memory Prisma mock or test DB
- DB-backed properties (7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18) use a test database seeded per test

### Test Annotation Format
```js
// Feature: sis-lifecycle, Property 1: Registration window state correctness
// Validates: Requirements 2.1, 2.2, 2.3
test.prop([semesterArbitrary, dateArbitrary])('...', ...)
```
