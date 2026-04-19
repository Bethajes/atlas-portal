# Implementation Plan

- [ ] 1. Fix semester date validation in the backend
  - Add validation in `academic.controller.js` `createSemester` to reject requests where `registrationStart >= registrationEnd` or `startDate >= endDate`, returning a 400 with a descriptive message
  - Apply the same validation to the inline `PUT /academic/semesters/:id` route handler
  - _Requirements: 1.5_

- [ ]* 1.1 Write property test for semester date constraint enforcement
  - **Property 17: Semester date constraint enforcement**
  - **Validates: Requirements 1.5**

- [ ] 2. Fix semester activation exclusivity
  - Verify the `PATCH /academic/semesters/:id/activate` handler deactivates all others atomically; add a test to confirm exactly one semester is active after activation
  - _Requirements: 1.3_

- [ ]* 2.1 Write property test for semester activation exclusivity
  - **Property 18: Semester activation exclusivity**
  - **Validates: Requirements 1.3**

- [ ] 3. Harden registration window utility and enforcement
  - Review `utils/registrationWindow.js` `getRegistrationState` for off-by-one on boundary dates (inclusive end)
  - Ensure `saveDraft` and `confirmRegistration` in `registration.controller.js` both call `getRegistrationState` and return the full `registration` object in the 403 response
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 3.1 Write property test for registration window state correctness
  - **Property 1: Registration window state correctness**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 3.2 Write property test for registration window enforcement on writes
  - **Property 2: Registration window enforcement on writes**
  - **Validates: Requirements 2.4**

- [ ] 4. Fix student lifecycle state guards
  - Audit `canStudentAttemptRegistration` in `utils/registrationWindow.js` to cover all blocked statuses (SUSPENDED, WITHDRAWN, DROPPED) and blocked levels (APPLICANT, ADMITTED)
  - Ensure the function is called in both `saveDraft` and `confirmRegistration`
  - _Requirements: 3.4, 3.5, 5.4_

- [ ]* 4.1 Write property test for blocked registration for ineligible students
  - **Property 4: Blocked registration for ineligible students**
  - **Validates: Requirements 3.4, 3.5, 5.4**

- [ ]* 4.2 Write property test for student field invariants
  - **Property 3: Student field invariants**
  - **Validates: Requirements 3.1, 3.2**

- [ ] 5. Fix and complete the lifecycle progression service
  - Verify `YEAR_TO_LEVEL` mapping covers years 1–4 correctly in `lifecycle.service.js`
  - Ensure `progressStudent` updates `currentSemesterId` to the active semester when promoting
  - Ensure `progressStudent` returns the correct `newYear` and `newLevel` fields
  - Fix the missing `closeSemesterRegistration` and `approveRegistrationWithCourses` exports referenced in `registrar.routes.js` but not exported from `registrar.controller.js`
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 5.1 Write property test for progression of eligible students
  - **Property 5: Progression promotes eligible students correctly**
  - **Validates: Requirements 4.1**

- [ ]* 5.2 Write property test for ineligible progression sets probation
  - **Property 6: Ineligible progression sets probation**
  - **Validates: Requirements 4.2, 4.3**

- [ ] 6. Fix bulk progression endpoint
  - Ensure `bulkProgressStudents` in `lifecycle.service.js` returns one result entry per student evaluated
  - Wire the `POST /registrar/students/bulk-progress` route to call `bulkProgressStudents` correctly in `registrar.controller.js`
  - _Requirements: 4.4_

- [ ]* 6.1 Write property test for bulk progression coverage
  - **Property 7: Bulk progression covers all eligible students**
  - **Validates: Requirements 4.4**

- [ ] 7. Fix graduation eligibility and graduation handlers
  - Ensure `checkGraduationEligibility` always returns `{ eligible, reason, completedCredits, requiredCredits, cgpa, missingRequiredCount }` — add missing fields if absent
  - Ensure `graduateStudent` throws (not silently fails) when eligibility check fails, so the HTTP handler returns 400
  - Add `graduateStudentHandler`, `progressStudentHandler`, `checkGraduationHandler`, and `bulkProgressHandler` to `registrar.controller.js` exports (currently referenced in routes but missing from exports)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 7.1 Write property test for graduation eligibility response completeness
  - **Property 8: Graduation eligibility response completeness**
  - **Validates: Requirements 5.1**

- [ ]* 7.2 Write property test for graduation state transition
  - **Property 9: Graduation state transition**
  - **Validates: Requirements 5.2**

- [ ]* 7.3 Write property test for graduation rejection for missing courses
  - **Property 10: Graduation rejection for missing courses**
  - **Validates: Requirements 5.3**

- [ ] 8. Fix transcript endpoint access control
  - In `student.controller.js` `getMyTranscript`, ensure the 403 guard checks both `student.status === 'GRADUATED'` and `student.academicLevel === 'GRADUATED'`
  - Ensure the transcript response always includes all required fields: `institution`, `student`, `degree`, `graduatedAt`, `cgpa`, `totalCreditsEarned`, `terms`
  - _Requirements: 5.5, 5.6_

- [ ]* 8.1 Write property test for transcript structure completeness
  - **Property 11: Transcript structure completeness**
  - **Validates: Requirements 5.5**

- [ ]* 8.2 Write unit test for transcript 403 for non-graduated student
  - **Validates: Requirements 5.6**

- [ ] 9. Fix GPA calculation utility
  - Verify `calculateGPA` in `utils/gpa.js` correctly handles empty arrays (returns 0.0) and skips I/W grades
  - Verify `calculateStudentGPAs` correctly filters semester enrollments by `activeSemesterId`
  - Ensure `recalculateStudentGPA` is called after any grade assignment in the grade controller
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ]* 9.1 Write property test for credit-weighted GPA calculation
  - **Property 16: Credit-weighted GPA calculation**
  - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 10. Fix student lifecycle API response
  - In `student.controller.js` `getMyLifecycle`, ensure the response always includes: `academicLevel`, `academicLevelLabel`, `status`, `currentYear`, `currentSemester`, `sgpa`, `cgpa`, `completedCredits`, `requiredCredits`, `progressPct`, `canRegister`, `activeSemester`
  - Fix the `canRegister` logic to correctly combine `eligibility.ok && windowOpen && !isGraduated`
  - _Requirements: 6.1_

- [ ]* 10.1 Write property test for lifecycle response completeness
  - **Property 12: Lifecycle response completeness**
  - **Validates: Requirements 6.1**

- [ ] 11. Fix registrar dashboard stats endpoint
  - In `registrar.controller.js` `getDashboardStats`, ensure the response includes `registrationOpen` (boolean) derived from `getRegistrationState`
  - Fix the truncated response body (the existing code is cut off before closing the JSON)
  - _Requirements: 7.1_

- [ ]* 11.1 Write property test for registrar dashboard stats completeness
  - **Property 13: Registrar dashboard stats completeness**
  - **Validates: Requirements 7.1**

- [ ] 12. Fix registration approval to create enrollments
  - In `registrar.controller.js` `updateRegistrationStatus`, verify that approving a registration creates Enrollment records for each RegistrationCourse and increments `currentEnrollment` on each course
  - Fix the `approveRegistrationWithCourses` function (referenced in routes but not exported) — either implement it or alias it to `updateRegistrationStatus`
  - _Requirements: 7.3, 7.4_

- [ ]* 12.1 Write property test for registration approval creates enrollments
  - **Property 14: Registration approval creates enrollments**
  - **Validates: Requirements 7.3**

- [ ] 13. Fix available courses filtering
  - In `registration.controller.js` `getAvailableCourses`, verify the `programCourses` query filters by `year: student.currentYear` and `semester: semNumber` correctly
  - Ensure `alreadyEnrolled` flag is set for courses already in the active semester
  - _Requirements: 8.1, 8.2_

- [ ]* 13.1 Write property test for available courses match student curriculum
  - **Property 15: Available courses match student curriculum**
  - **Validates: Requirements 8.1, 8.2**

- [ ] 14. Fix confirm registration to update currentSemesterId
  - In `registration.controller.js` `confirmRegistration`, after creating the SemesterRegistration, update the student's `currentSemesterId` to `activeSemester.id`
  - _Requirements: 8.3, 8.5_

- [ ]* 14.1 Write unit test for confirm registration creates all record types
  - **Validates: Requirements 8.3**

- [ ] 15. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Fix StudentDashboard to handle all lifecycle states
  - Ensure the dashboard correctly renders when `lifecycle` is null (no active semester)
  - Fix the `registration` panel to show the correct state when `lifecycle?.canRegister` is false but window is UPCOMING (show countdown)
  - Add the graduation transcript download button wiring to `/student/transcript`
  - _Requirements: 6.1, 6.4, 6.6_

- [ ] 17. Fix RegistrarDashboard semester management UI
  - Ensure the semester create form includes all required fields: name, type, year, startDate, endDate, registrationStart, registrationEnd, dropDeadline, addDeadline
  - Add lifecycle management controls: progress student, graduate student, bulk progress buttons
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 18. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.
