# Requirements Document

## Introduction

This feature implements a full university Student Information System (SIS) with registrar-controlled academic timelines and complete student lifecycle management. The system reflects real-world university operations with structured semesters, controlled registration periods, and student progression from admission to graduation. It builds on the existing Atlas Health College backend (Node.js/Prisma/PostgreSQL) and React frontend, extending and fixing the current implementation to cover all lifecycle states, registration window enforcement, automatic academic progression, graduation management, and professional dashboards for both students and registrars.

## Glossary

- **SIS**: Student Information System — the platform managing all academic records and student lifecycle.
- **Registrar**: The administrative role responsible for managing semesters, registration windows, and student records.
- **AcademicSemester**: A named academic term (e.g., "Fall 2026") with defined start/end dates and separate registration open/close dates.
- **RegistrationWindow**: The date range during which students may register for courses, defined independently from the academic term dates.
- **AcademicLevel**: The student's current standing in their program: APPLICANT, ADMITTED, FRESHMAN, SOPHOMORE, JUNIOR, SENIOR, or GRADUATED.
- **StudentStatus**: The operational state of a student account: ACTIVE, PROBATION, SUSPENDED, GRADUATED, DROPPED, ON_LEAVE, or WITHDRAWN.
- **CGPA**: Cumulative Grade Point Average — weighted average of all completed course grade points across all semesters.
- **SGPA**: Semester Grade Point Average — weighted average of grade points for courses in the current semester only.
- **SemesterRegistration**: A student's formal enrollment request for a given semester, with statuses DRAFT, SUBMITTED, APPROVED, or REJECTED.
- **ProgramCourse**: A course assigned to a specific year and semester within a program's curriculum.
- **Lifecycle Progression**: The automatic or manual promotion of a student from one AcademicLevel to the next based on completed credits and CGPA.
- **Graduation Eligibility**: The condition where a student has completed all required program courses, met the minimum credit requirement, and achieved the minimum CGPA.
- **Transcript**: An official academic record listing all completed courses, grades, and final CGPA, available only after graduation.
- **Section**: A specific offering of a course in a semester, assigned to an instructor with a maximum enrollment capacity.
- **SectionEnrollment**: A student's enrollment in a specific Section, carrying the grade and status for that course offering.
- **Countdown**: A computed display value showing the number of days until the registration window opens.
- **RegistrationState**: One of three computed states — UPCOMING (before open date), OPEN (within window), or CLOSED (after close date).

---

## Requirements

### Requirement 1 — Semester & Registration Date Management

**User Story:** As a registrar, I want to create and manage semesters with separate academic and registration dates, so that I can control exactly when students may register independently of when classes begin.

#### Acceptance Criteria

1. WHEN a registrar submits a create-semester request with name, type, year, startDate, endDate, registrationStart, and registrationEnd, THE SIS SHALL persist a new AcademicSemester record with all six date fields stored as UTC timestamps.
2. WHEN a registrar submits an update-semester request for an existing AcademicSemester, THE SIS SHALL update only the fields provided and return the complete updated record.
3. WHEN a registrar activates a semester, THE SIS SHALL set that semester's isActive flag to true and set all other semesters' isActive flags to false in a single atomic operation.
4. WHEN a client requests the active semester, THE SIS SHALL return the single AcademicSemester where isActive is true, or a null value if no semester is active.
5. THE SIS SHALL enforce that registrationStart is before registrationEnd, and that startDate is before endDate, returning a 400 error with a descriptive message if either constraint is violated.

---

### Requirement 2 — Registration Window Enforcement

**User Story:** As a student, I want to see clear messaging about when registration opens, is open, or has closed, so that I always know whether I can register and how much time I have.

#### Acceptance Criteria

1. WHEN the current date is before the active semester's registrationStart, THE SIS SHALL return a RegistrationState of UPCOMING with a message stating the number of days until registration opens.
2. WHEN the current date is within the active semester's registrationStart and registrationEnd (inclusive), THE SIS SHALL return a RegistrationState of OPEN with a message stating the number of days until registration closes.
3. WHEN the current date is after the active semester's registrationEnd, THE SIS SHALL return a RegistrationState of CLOSED with a message indicating registration has ended.
4. WHEN a student attempts to save or submit a registration draft and the RegistrationState is not OPEN, THE SIS SHALL reject the request with a 403 status and return the current RegistrationState and message.
5. WHEN a student requests available courses, THE SIS SHALL include the current RegistrationState and registrationOpen boolean in the response regardless of the window state.

---

### Requirement 3 — Student Lifecycle States

**User Story:** As a registrar, I want the system to track each student's full lifecycle from applicant to graduate, so that I can manage student progression and enforce appropriate access controls at each stage.

#### Acceptance Criteria

1. THE SIS SHALL maintain an AcademicLevel for every student with exactly one of the values: APPLICANT, ADMITTED, FRESHMAN, SOPHOMORE, JUNIOR, SENIOR, or GRADUATED.
2. THE SIS SHALL maintain a StudentStatus for every student with exactly one of the values: ACTIVE, PROBATION, SUSPENDED, GRADUATED, DROPPED, ON_LEAVE, or WITHDRAWN.
3. WHEN a new student account is created via the admissions flow, THE SIS SHALL set the student's AcademicLevel to FRESHMAN and StudentStatus to ACTIVE.
4. WHEN a student's StudentStatus is SUSPENDED, WITHDRAWN, or DROPPED, THE SIS SHALL prevent that student from submitting a new SemesterRegistration, returning a 403 with the reason.
5. WHEN a student's AcademicLevel is APPLICANT or ADMITTED, THE SIS SHALL prevent that student from submitting a SemesterRegistration, returning a 403 with the reason.

---

### Requirement 4 — Automatic Academic Progression

**User Story:** As a registrar, I want the system to automatically evaluate and promote students to the next academic year at the end of each academic year, so that student records stay accurate without manual updates.

#### Acceptance Criteria

1. WHEN a registrar triggers progression for a student in Year N (where N < program durationYears), THE SIS SHALL promote the student to Year N+1 and update AcademicLevel to the corresponding level (SOPHOMORE for Year 2, JUNIOR for Year 3, SENIOR for Year 4) if the student has completed the minimum required credits for Year N and has a CGPA of 2.0 or above.
2. WHEN a student does not meet the minimum credit threshold for progression, THE SIS SHALL not promote the student and SHALL return a reason message indicating the credit shortfall.
3. WHEN a student's CGPA is below 2.0 at the time of progression evaluation, THE SIS SHALL set the student's StudentStatus to PROBATION and SHALL not promote the student.
4. WHEN a registrar triggers bulk progression, THE SIS SHALL evaluate all students with StudentStatus ACTIVE or PROBATION and return a result list with each student's outcome.
5. WHEN a student is successfully promoted, THE SIS SHALL send a notification to the student's user account with the new AcademicLevel and current CGPA.

---

### Requirement 5 — Graduation System

**User Story:** As a registrar, I want to mark students as graduated when they meet all degree requirements, so that their records are finalized and they gain access to their official transcript.

#### Acceptance Criteria

1. WHEN a registrar requests graduation eligibility for a student, THE SIS SHALL return whether the student is eligible, the reason if not eligible, completed credits, required credits, and current CGPA.
2. WHEN a registrar triggers graduation for an eligible student, THE SIS SHALL set the student's StudentStatus to GRADUATED, AcademicLevel to GRADUATED, and record the graduatedAt timestamp.
3. WHEN a registrar attempts to graduate a student who has not completed all required program courses, THE SIS SHALL reject the request with a 400 error listing the number of missing required courses.
4. WHEN a student's StudentStatus is GRADUATED, THE SIS SHALL prevent any new SemesterRegistration from being created for that student.
5. WHEN a graduated student requests their transcript, THE SIS SHALL return a structured transcript including institution name, student identity, degree details, all completed courses grouped by term, total credits earned, and final CGPA.
6. WHEN a non-graduated student requests the official transcript endpoint, THE SIS SHALL return a 403 error with a message directing the student to use the Academic Record endpoint instead.

---

### Requirement 6 — Student Dashboard

**User Story:** As a student, I want a dashboard that shows my current academic status, GPA, credits, and registration state, so that I always have a clear picture of my academic standing.

#### Acceptance Criteria

1. WHEN a student loads the dashboard, THE SIS SHALL display the student's current AcademicLevel label (e.g., "Freshman (Year 1)"), StudentStatus badge, current semester name, SGPA, CGPA, completed credits, required credits, and degree progress percentage.
2. WHEN a student's CGPA is below 2.0, THE SIS SHALL display a probation alert on the dashboard.
3. WHEN a student's profile is incomplete (missing firstName, fatherName, or photo), THE SIS SHALL display a profile-incomplete warning on the dashboard.
4. WHEN the RegistrationState is OPEN and the student has not yet registered, THE SIS SHALL display a registration call-to-action on the dashboard.
5. WHEN a student has a SemesterRegistration in DRAFT status, THE SIS SHALL display a warning prompting the student to complete and submit the registration.
6. WHEN a student's StudentStatus is GRADUATED, THE SIS SHALL display a graduation congratulations banner and a link to download the transcript.

---

### Requirement 7 — Registrar Dashboard

**User Story:** As a registrar, I want a dashboard showing pending registrations, student lifecycle statistics, and semester status, so that I can efficiently manage the academic cycle.

#### Acceptance Criteria

1. WHEN a registrar loads the dashboard stats endpoint, THE SIS SHALL return total student count, count of pending (SUBMITTED) registrations, count of pending admission applications, total payments this month, active semester name, and whether registration is currently open.
2. WHEN a registrar views the pending registrations list, THE SIS SHALL return each registration with student name, student ID, program, semester, list of selected courses with credits, and invoice payment status.
3. WHEN a registrar approves a SemesterRegistration, THE SIS SHALL set the registration status to APPROVED, create Enrollment records for each selected course, increment each course's currentEnrollment counter, and send a success notification to the student.
4. WHEN a registrar rejects a SemesterRegistration, THE SIS SHALL set the registration status to REJECTED, record the rejectionReason, and send a rejection notification to the student.
5. WHEN a registrar triggers the lifecycle progression endpoint for a specific student, THE SIS SHALL return the promotion result including promoted boolean, reason, newYear, and newLevel.

---

### Requirement 8 — Registration Integration with Curriculum

**User Story:** As a student, I want the registration system to automatically show me the courses assigned to my current year and semester in my program, so that I register for the right courses without manual searching.

#### Acceptance Criteria

1. WHEN a student requests available courses, THE SIS SHALL return only the ProgramCourse entries matching the student's programId, currentYear, and currentSemester (mapped to semester number 1 for FALL, 2 for SPRING).
2. WHEN a student has already enrolled in a course in the active semester, THE SIS SHALL mark that course as alreadyEnrolled in the available courses response.
3. WHEN a student confirms registration, THE SIS SHALL create a SemesterRegistration with status SUBMITTED, create RegistrationCourse entries for all curriculum courses, create SectionEnrollment records for the first available section of each course, and create legacy Enrollment records.
4. WHEN no curriculum courses exist for a student's current year and semester, THE SIS SHALL return a 400 error with a descriptive message rather than creating an empty registration.
5. WHEN a student's registration is confirmed, THE SIS SHALL update the student's currentSemesterId to the active semester's ID.

---

### Requirement 9 — GPA Calculation

**User Story:** As a student, I want my SGPA and CGPA to be accurately calculated from my section enrollments, so that I can track my academic performance in real time.

#### Acceptance Criteria

1. THE SIS SHALL calculate CGPA as the credit-weighted average of grade points for all SectionEnrollment records belonging to the student, using the standard 4.0 scale (A/A+ = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, C- = 1.7, D+ = 1.3, D = 1.0, D- = 0.7, F = 0.0; I and W grades are excluded from calculation).
2. THE SIS SHALL calculate SGPA as the credit-weighted average of grade points for SectionEnrollment records in the active semester only.
3. WHEN a student has no graded enrollments, THE SIS SHALL return a CGPA and SGPA of 0.0.
4. WHEN the academic record endpoint is called, THE SIS SHALL return both the live-computed CGPA and SGPA alongside the stored cumulativeGPA value.
5. WHEN a grade is assigned to a SectionEnrollment, THE SIS SHALL recalculate and persist the student's cumulativeGPA in the Student record.
