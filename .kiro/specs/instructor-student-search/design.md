# Design Document

## Overview

This design enhances the instructor dashboard by integrating the existing `StudentSearch` component and fixing navigation issues. The solution leverages the existing backend API (`/sections/my-students`) which already returns comprehensive student data across all instructor sections. The frontend will add a new "Students" tab to the dashboard navigation and properly wire up the `StudentSearch` component with the necessary data and handlers.

## Architecture

### Component Structure

```
InstructorDashboard
├── Sidebar Navigation (with new "Students" tab)
├── Header (with global search)
└── Main Content Area
    ├── Overview Tab
    ├── Sections Tab
    ├── Courses Tab
    ├── Assignments Tab
    └── Students Tab (NEW)
        └── StudentSearch Component
            ├── Search Input with Autocomplete
            ├── Student Cards Grid
            └── Student Profile Modal (NEW)
```

### Data Flow

1. **Initial Load**: Dashboard fetches all students via `fetchMyStudents()` service call
2. **Search**: StudentSearch component filters the student list locally using debounced input
3. **Actions**: User interactions (view profile, add grade, message) trigger modal displays or navigation
4. **State Management**: React useState hooks manage search query, selected student, and modal visibility

## Components and Interfaces

### Modified Components

#### InstructorDashboard.jsx
- Add "Students" tab to navigation items
- Add state for student profile modal
- Wire up StudentSearch component with proper props
- Implement handler functions for student actions

#### StudentSearch.jsx (existing)
- Already implements search, filtering, and display logic
- Requires parent component to provide:
  - `enrollments`: Array of student enrollment data
  - `attendanceByStudentId`: Map of student IDs to attendance percentages
  - `onViewProfile`: Handler for viewing student details
  - `onAddGrade`: Handler for adding grades
  - `onMessageStudent`: Handler for messaging students

### New Components

#### StudentProfileModal.jsx
A modal component that displays detailed student information including:
- Personal information (name, ID, email, photo)
- Academic information (program, department, year, GPA)
- Enrollment details (sections, courses, grades)
- Payment status
- Attendance records
- Risk indicators

### API Integration

The existing backend endpoint `/sections/my-students` already provides all necessary data:

```javascript
// Response structure
{
  success: true,
  data: [
    {
      enrollmentId: string,
      sectionId: string,
      sectionName: string,
      courseId: string,
      courseCode: string,
      courseTitle: string,
      courseCredits: number,
      status: string,
      grade: number,
      letterGrade: string,
      enrolledAt: date,
      student: {
        id: string,
        userId: string,
        name: string,
        institutionalEmail: string,
        studentId: string,
        cumulativeGPA: number,
        photoUrl: string,
        department: { id, name },
        program: { id, name },
        latestPayment: { status, isPaid, amount, createdAt }
      }
    }
  ]
}
```

## Data Models

### Student Enrollment Data (from API)
```typescript
interface StudentEnrollment {
  enrollmentId: string;
  sectionId: string;
  sectionName: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseCredits: number;
  status: 'ENROLLED' | 'COMPLETED' | 'DROPPED' | 'FAILED';
  grade: number | null;
  letterGrade: string | null;
  enrolledAt: Date;
  student: StudentProfile;
}

interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  institutionalEmail: string;
  studentId: string;
  cumulativeGPA: number;
  photoUrl: string | null;
  department: { id: string; name: string };
  program: { id: string; name: string };
  latestPayment: PaymentInfo | null;
}

interface PaymentInfo {
  status: string;
  isPaid: boolean;
  amount: number;
  createdAt: Date;
}
```

### Attendance Data (from localStorage)
```typescript
interface AttendanceByStudentId {
  [studentId: string]: number; // percentage 0-100
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Search filtering completeness
*For any* search query and student list, the filtered results should only include students whose name, student ID, department name, program name, course code, course title, or section name contains the search query (case-insensitive).
**Validates: Requirements 1.2**

### Property 2: Risk indicator accuracy
*For any* student with GPA below 2.0, the system should display a "Low GPA" warning badge in the risk indicators.
**Validates: Requirements 2.1**

### Property 3: Risk indicator accuracy - attendance
*For any* student with attendance below 75%, the system should display a "Low Attendance" warning badge in the risk indicators.
**Validates: Requirements 2.2**

### Property 4: Risk indicator accuracy - payment
*For any* student with unpaid fees (payment status not in ['APPROVED', 'PAID', 'SUCCESS', 'SUCCESSFUL'] or isPaid is false), the system should display an "Unpaid Fees" warning badge in the risk indicators.
**Validates: Requirements 2.3**

### Property 5: Action button availability
*For any* student displayed in search results, all three action buttons (View Profile, Add Grade, Message Student) should be present and clickable.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: Authorization enforcement
*For any* instructor, the backend should only return students enrolled in sections where that instructor is assigned.
**Validates: Requirements 6.3**

## Error Handling

### Frontend Error Handling

1. **API Failures**: Display toast notifications for failed API calls
2. **Empty States**: Show helpful messages when no students are found
3. **Loading States**: Display skeleton loaders during data fetching
4. **Invalid Data**: Gracefully handle missing or malformed student data with fallback values

### Backend Error Handling

The existing backend endpoint already implements:
- Authentication checks (instructor role required)
- Authorization checks (only returns instructor's students)
- Error logging and descriptive error messages
- Graceful handling of missing instructor profiles

## Testing Strategy

### Unit Testing

1. **Search Filtering Logic**
   - Test search with various queries (name, ID, department, etc.)
   - Test case-insensitive matching
   - Test empty query returns all students
   - Test special characters in search queries

2. **Risk Indicator Logic**
   - Test GPA threshold detection (< 2.0)
   - Test attendance threshold detection (< 75%)
   - Test payment status detection
   - Test multiple simultaneous risk indicators

3. **Component Rendering**
   - Test StudentSearch renders with empty data
   - Test StudentSearch renders with student data
   - Test action buttons are present
   - Test modal opens/closes correctly

### Property-Based Testing

Property-based tests will use **fast-check** library for JavaScript/React testing. Each test will run a minimum of 100 iterations.

1. **Property 1 Test**: Generate random student lists and search queries, verify filtered results match the search criteria
2. **Property 2-4 Tests**: Generate random student data with varying GPA, attendance, and payment values, verify correct risk badges appear
3. **Property 5 Test**: Generate random student data, verify all action buttons are rendered for each student
4. **Property 6 Test**: Generate random instructor and student data, verify backend only returns authorized students

### Integration Testing

1. Test full user flow: login → navigate to Students tab → search → view profile
2. Test navigation between tabs preserves state
3. Test mobile sidebar behavior
4. Test keyboard navigation in search dropdown

## Implementation Notes

### Existing Code Reuse

The `StudentSearch` component is already fully implemented with:
- Debounced search input
- Autocomplete dropdown with keyboard navigation
- Student card grid display
- Risk indicator badges
- Action buttons

The main implementation work involves:
1. Adding the "Students" tab to navigation
2. Rendering StudentSearch in the new tab
3. Creating the StudentProfileModal component
4. Wiring up event handlers

### Performance Considerations

- Search filtering is done client-side with debouncing (160ms delay)
- Results are limited to 60 students for optimal rendering
- Attendance data is computed once and memoized
- Student list is deduplicated by student ID to avoid showing duplicates from multiple sections

### Accessibility

- Search input has proper ARIA labels and roles
- Keyboard navigation supported (arrow keys, Enter, Escape)
- Focus management in modals
- Color contrast meets WCAG AA standards
- Screen reader friendly button labels
