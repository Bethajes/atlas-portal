# Requirements Document

## Introduction

This feature extends the existing university management system with a production-level course registration workflow that enforces academic rules. Students select sections for an active semester, and the system validates credit limits, duplicate course prevention, and prerequisite completion before creating enrollment records. The feature builds on the existing `AcademicSemester`, `Section`, `SectionEnrollment`, `CoursePrerequisites`, and `SemesterRegistration` models without replacing them.

## Glossary

- **Registration System**: The backend and frontend components responsible for processing a student's section selections for a given semester.
- **Student**: A user with the STUDENT role who has an associated Student profile record.
- **Section**: A scheduled instance of a Course in a specific semester, identified by a section name (e.g., "A", "B") and a `semesterId`.
- **Course**: An academic subject with a credit value, a unique code, and optional prerequisite courses.
- **AcademicSemester**: A semester record with an `isActive` flag and registration window dates (`registrationStart`, `registrationEnd`).
- **SemesterRegistration**: A record linking a Student to an AcademicSemester, tracking registration status (DRAFT, SUBMITTED, APPROVED, REJECTED).
- **SectionEnrollment**: A record linking a Student to a specific Section, representing actual enrollment.
- **CoursePrerequisites**: A join table recording which courses must be passed before a student may enroll in a given course.
- **Passing Grade**: A letter grade of A, B+, B, or C recorded on a SectionEnrollment or Enrollment record.
- **Credit Limit**: The maximum total credits a student may register for in a single semester, set to 18 by default and configurable via environment variable.
- **Duplicate Course**: Two or more selected sections that belong to the same Course.
- **Prerequisite Validation**: The process of checking that a student has a passing grade in every prerequisite course before allowing registration in a dependent course.
- **Registration Window**: The period between `registrationStart` and `registrationEnd` on the active AcademicSemester during which students may submit registrations.

---

## Requirements

### Requirement 1

**User Story:** As a student, I want to view available sections for the active semester, so that I can make informed course selections.

#### Acceptance Criteria

1. WHEN a student requests available sections, THE Registration System SHALL return all sections whose `semesterId` matches the currently active AcademicSemester.
2. WHEN returning section data, THE Registration System SHALL include course title, course code, credit value, section name, enrolled count, and maximum capacity for each section.
3. WHEN a student has already enrolled in a section for the active semester, THE Registration System SHALL mark that section as already enrolled in the response.
4. IF no AcademicSemester has `isActive` set to true, THEN THE Registration System SHALL return an empty section list with a message indicating no active semester is configured.

---

### Requirement 2

**User Story:** As a student, I want to register for sections in the active semester, so that I am officially enrolled in my chosen courses.

#### Acceptance Criteria

1. WHEN a student submits a registration request with a list of `sectionIds`, THE Registration System SHALL validate that every provided `sectionId` exists and belongs to the active semester.
2. WHEN all validations pass, THE Registration System SHALL create or update a SemesterRegistration record with status SUBMITTED and create a SectionEnrollment record for each selected section.
3. WHEN a student already has a SemesterRegistration with status SUBMITTED or APPROVED for the active semester, THE Registration System SHALL reject the new request with a message indicating registration is already complete.
4. IF a provided `sectionId` does not exist or does not belong to the active semester, THEN THE Registration System SHALL reject the entire request and return an error identifying the invalid section.

---

### Requirement 3

**User Story:** As a student, I want the system to enforce the credit limit, so that I cannot register for more courses than academically permitted.

#### Acceptance Criteria

1. WHEN a student submits a registration request, THE Registration System SHALL compute the total credits by summing the `credits` field of the course associated with each selected section.
2. WHEN the computed total credits exceed 18 (or the configured maximum), THE Registration System SHALL reject the request with the message "Credit limit exceeded" and include the computed total and the allowed maximum in the response.
3. WHILE a credit limit is configured via the `MAX_REGISTRATION_CREDITS` environment variable, THE Registration System SHALL use that value instead of the default of 18.

---

### Requirement 4

**User Story:** As a student, I want the system to prevent me from registering for the same course twice, so that my schedule contains no duplicate courses.

#### Acceptance Criteria

1. WHEN a student submits a registration request, THE Registration System SHALL check that no two selected sections belong to the same Course.
2. IF two or more selected sections share the same `courseId`, THEN THE Registration System SHALL reject the request with the message "Duplicate course selected" and identify the duplicated course code in the response.

---

### Requirement 5

**User Story:** As a student, I want the system to validate my prerequisites, so that I only enroll in courses for which I am academically prepared.

#### Acceptance Criteria

1. WHEN a student submits a registration request, THE Registration System SHALL fetch the prerequisite courses for each selected course from the CoursePrerequisites table.
2. WHEN a selected course has one or more prerequisites, THE Registration System SHALL verify that the student has a passing grade (A, B+, B, or C) in each prerequisite course by checking SectionEnrollment and Enrollment records.
3. IF a student has not passed a required prerequisite course, THEN THE Registration System SHALL reject the request with the message "Prerequisite not satisfied" and include the name of the unsatisfied prerequisite and the dependent course in the response.
4. WHEN a course has no prerequisites, THE Registration System SHALL allow registration for that course without prerequisite checks.

---

### Requirement 6

**User Story:** As a student, I want to see my total selected credits update in real time on the registration page, so that I can stay within the credit limit before submitting.

#### Acceptance Criteria

1. WHEN a student selects or deselects a section on the registration page, THE Registration System frontend SHALL recalculate and display the total selected credits immediately without a server round-trip.
2. WHEN the total selected credits exceed the credit limit, THE Registration System frontend SHALL disable the submit button and display a credit-limit warning.
3. WHEN two selected sections belong to the same course, THE Registration System frontend SHALL display a duplicate-course warning and disable the submit button.

---

### Requirement 7

**User Story:** As a student, I want to see prerequisite warnings before I submit, so that I can correct my selection without waiting for a server error.

#### Acceptance Criteria

1. WHEN a student selects a section whose course has prerequisites, THE Registration System frontend SHALL display the list of prerequisite courses for that course.
2. WHEN the frontend cannot determine whether a prerequisite is satisfied (because prerequisite status data is not yet loaded), THE Registration System frontend SHALL display a neutral informational indicator rather than a blocking error.

---

### Requirement 8

**User Story:** As a student, I want clear success and error feedback after submitting my registration, so that I know whether my registration was accepted or why it was rejected.

#### Acceptance Criteria

1. WHEN a registration request succeeds, THE Registration System frontend SHALL display a success toast notification and transition the page to show the registration slip.
2. WHEN a registration request fails due to a validation error, THE Registration System frontend SHALL display a toast notification containing the specific error message returned by the server.
3. WHILE a registration submission is in progress, THE Registration System frontend SHALL disable the submit button and display a loading indicator.
