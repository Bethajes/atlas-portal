# Implementation Plan

- [ ] 1. Create prerequisite validator utility
  - Create `backend/src/utils/prerequisiteValidator.js`
  - Define `PASSING_GRADES` set: `{ 'A', 'B+', 'B', 'C' }`
  - Implement `hasPassedCourse(prisma, studentId, courseId)` — checks SectionEnrollment first, falls back to Enrollment
  - Implement `validatePrerequisites(prisma, studentId, courseIds)` — returns `{ valid, errors[] }`
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 1.1 Write property test for hasPassedCourse correctness
  - **Property 6: hasPassedCourse correctness**
  - **Validates: Requirements 5.2**
  - Use fast-check to generate arbitrary grade strings; assert returns true iff grade ∈ { A, B+, B, C } and status is COMPLETED
  - Tag: `**Feature: course-registration-prerequisites, Property 6: hasPassedCourse correctness**`

- [ ] 1.2 Write unit tests for prerequisiteValidator
  - Test `validatePrerequisites` with student who has passed all prerequisites → valid
  - Test `validatePrerequisites` with student missing one prerequisite → error with correct course codes
  - Test `hasPassedCourse` with ENROLLED status (not COMPLETED) → false
  - Test course with no prerequisites → always valid
  - _Requirements: 5.2, 5.3, 5.4_

- [ ] 2. Implement studentRegistration controller — getAvailableSections
  - Create `backend/src/controllers/studentRegistration.controller.js`
  - Implement `getAvailableSections(req, res)`:
    - Find active AcademicSemester (`isActive: true`)
    - Return empty list with message if none found (edge case: Req 1.4)
    - Fetch all Sections with `semesterId` matching active semester, include course (title, code, credits), instructor name, enrolled count
    - Fetch student's existing SectionEnrollments for the active semester; mark `alreadyEnrolled`
    - Include `creditLimit` from `process.env.MAX_REGISTRATION_CREDITS` (default 18) in response
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2.1 Write property test for section response completeness
  - **Property 7: Section response completeness**
  - **Validates: Requirements 1.2, 1.3**
  - Use fast-check to generate random section arrays; assert every returned section contains courseTitle, courseCode, credits, sectionName, enrolledCount, maxStudents, alreadyEnrolled
  - Tag: `**Feature: course-registration-prerequisites, Property 7: Section response completeness**`

- [ ] 3. Implement studentRegistration controller — registerSections
  - Add `registerSections(req, res)` to `studentRegistration.controller.js`
  - Validate student eligibility using existing `canStudentAttemptRegistration`
  - Validate registration window using existing `getRegistrationState`
  - Validate all `sectionIds` exist and belong to the active semester; reject with `INVALID_SECTION` if not (Req 2.1, 2.4)
  - Check for existing SUBMITTED/APPROVED registration; reject with `ALREADY_REGISTERED` (Req 2.3)
  - Compute total credits; reject with `CREDIT_LIMIT_EXCEEDED` if over limit (Req 3.1, 3.2)
  - Check for duplicate courseIds across selected sections; reject with `DUPLICATE_COURSE` (Req 4.1, 4.2)
  - Call `validatePrerequisites`; reject with `PREREQUISITE_NOT_SATISFIED` if any fail (Req 5.2, 5.3)
  - In a Prisma transaction: upsert SemesterRegistration (status SUBMITTED), create SectionEnrollments, create legacy Enrollment records
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 5.2, 5.3_

- [ ] 3.1 Write property test for credit limit enforcement
  - **Property 1: Credit limit rejection**
  - **Validates: Requirements 3.1, 3.2**
  - Use fast-check to generate section arrays whose total credits exceed the limit; assert handler returns error and no DB records are created
  - Tag: `**Feature: course-registration-prerequisites, Property 1: Credit limit rejection**`

- [ ] 3.2 Write property test for duplicate course rejection
  - **Property 2: Duplicate course rejection**
  - **Validates: Requirements 4.1, 4.2**
  - Use fast-check to generate section arrays with at least two sections sharing a courseId; assert rejection and no DB records
  - Tag: `**Feature: course-registration-prerequisites, Property 2: Duplicate course rejection**`

- [ ] 3.3 Write property test for prerequisite rejection
  - **Property 3: Prerequisite rejection**
  - **Validates: Requirements 5.2, 5.3**
  - Use fast-check to generate a student with no completed enrollments and a course with prerequisites; assert rejection
  - Tag: `**Feature: course-registration-prerequisites, Property 3: Prerequisite rejection**`

- [ ] 3.4 Write property test for successful registration completeness
  - **Property 4: Successful registration completeness**
  - **Validates: Requirements 2.1, 2.2**
  - Use fast-check to generate valid section arrays (within limit, no duplicates, prerequisites met); assert exactly one SemesterRegistration and N SectionEnrollments are created
  - Tag: `**Feature: course-registration-prerequisites, Property 4: Successful registration completeness**`

- [ ] 4. Register new routes
  - In the appropriate student routes file, add:
    - `GET /api/student/register/sections` → `getAvailableSections` (auth: STUDENT)
    - `POST /api/student/register` → `registerSections` (auth: STUDENT)
  - Ensure routes are mounted in `server.js` under `/api/student`
  - _Requirements: 1.1, 2.1_

- [ ] 5. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Update StudentRegistration.jsx — section picker UI
  - Add state: `selectedSectionIds` (Set), `submitting`
  - Add derived state: `totalCredits` (sum of selected section credits), `duplicateWarnings`, `isOverLimit`
  - Fetch sections from `GET /api/student/register/sections` on mount
  - Render a section list grouped by course with checkboxes; show course title, code, credits, instructor, enrolled/max
  - Display real-time total credits counter
  - Disable submit and show warning when `isOverLimit` is true (Req 6.2)
  - Disable submit and show warning when `duplicateWarnings.length > 0` (Req 6.3)
  - Show prerequisite info panel for each selected course that has prerequisites (Req 7.1)
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 7.1_

- [ ] 6.1 Write property test for frontend credit total accuracy
  - **Property 5: Frontend credit total accuracy**
  - **Validates: Requirements 6.1**
  - Use fast-check to generate arbitrary arrays of section objects with random credit values; assert the computed total always equals the arithmetic sum
  - Tag: `**Feature: course-registration-prerequisites, Property 5: Frontend credit total accuracy**`

- [ ] 7. Wire submit button to POST /api/student/register
  - On submit, call `POST /api/student/register` with `{ semesterId, sectionIds: [...selectedSectionIds] }`
  - Disable button and show spinner while `submitting` is true (Req 8.3)
  - On success: show success toast, transition to registration slip view (Req 8.1)
  - On error: show toast with `error.response.data.message` (Req 8.2)
  - _Requirements: 2.2, 8.1, 8.2, 8.3_

- [ ] 8. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.
