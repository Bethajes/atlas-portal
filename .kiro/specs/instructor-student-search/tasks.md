# Implementation Plan

- [x] 1. Add Students tab to InstructorDashboard navigation
  - Add "students" tab to navItems array with Users icon
  - Update sidebar navigation to include the new tab
  - Add tab switching logic to show/hide Students content
  - _Requirements: 5.1, 5.2_

- [x] 2. Integrate StudentSearch component in Students tab
  - Add Students tab content section in main area
  - Pass instructorStudents data to StudentSearch as enrollments prop
  - Pass attendanceByStudentId to StudentSearch component
  - Add state management for student profile modal
  - _Requirements: 1.1, 1.3_

- [x] 3. Create StudentProfileModal component
  - Create new component file at frontend/src/components/instructor/StudentProfileModal.jsx
  - Implement modal layout with student details display
  - Add sections for personal info, academic info, enrollments, and payment status
  - Include close button and backdrop click handling
  - Style with Tailwind CSS matching dashboard design
  - _Requirements: 3.4_

- [x] 4. Implement student action handlers
  - Create onViewProfile handler to open StudentProfileModal
  - Create onAddGrade handler to navigate to section grading
  - Create onMessageStudent handler to open message composition
  - Wire handlers to StudentSearch component props
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Fix missing imports and dependencies
  - Add missing icon imports (Eye, Save, TrendingUp, BarChart2, GraduationCap)
  - Verify all component imports are correct
  - Check for any TypeScript/PropTypes issues
  - _Requirements: 1.1_

- [x] 6. Test the complete student search flow
  - Verify Students tab appears in navigation
  - Test search functionality with various queries
  - Verify risk indicators display correctly
  - Test all action buttons (View Profile, Add Grade, Message)
  - Test keyboard navigation in search dropdown
  - Test mobile responsiveness
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
