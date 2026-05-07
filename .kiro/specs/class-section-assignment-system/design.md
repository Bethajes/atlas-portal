# Design Document: Class/Section Assignment System

## Overview

The Class/Section Assignment System is a comprehensive academic allocation platform that transforms basic section management into an intelligent, scalable system suitable for large universities. The system provides visual schedule building, conflict detection, smart student assignment, optimization recommendations, and bulk operations.

The design follows a layered architecture with clear separation between the frontend UI components, backend API services, business logic layer, and data access layer. The system integrates with the existing Prisma-based database schema while extending it with new models for schedule management and optimization tracking.

Key design principles:
- **Real-time validation**: Detect conflicts and errors as users interact with the system
- **Progressive disclosure**: Use multi-step wizards to guide users through complex workflows
- **Performance optimization**: Use indexed queries, pagination, and batch processing for scalability
- **Intelligent automation**: Provide smart suggestions and automated distribution algorithms
- **Comprehensive audit trail**: Track all section changes and student assignments

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Section    │  │   Schedule   │  │ Optimization │     │
│  │  Management  │  │    Builder   │  │  Dashboard   │     │
│  │      UI      │  │      UI      │  │      UI      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Section    │  │   Schedule   │  │ Optimization │     │
│  │  Controller  │  │  Controller  │  │  Controller  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Section    │  │   Conflict   │  │    Smart     │     │
│  │   Service    │  │   Detector   │  │  Assignment  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Optimization │  │    Bulk      │                       │
│  │   Engine     │  │  Operations  │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Section    │  │   Schedule   │  │   Student    │     │
│  │ Repository   │  │ Repository   │  │ Repository   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                    │
│         Section, Schedule, SectionEnrollment Tables         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React with hooks for state management
- Tailwind CSS for styling
- React DnD (optional) for drag-and-drop schedule builder
- Recharts for analytics visualization
- React Query for server state management

**Backend:**
- Node.js with Express
- Prisma ORM for database access
- JWT for authentication
- CSV parsing libraries (csv-parser, papaparse)

**Database:**
- PostgreSQL with Prisma schema extensions

## Components and Interfaces

### Frontend Components

#### 1. SectionWizard Component
Multi-step wizard for section creation with progress tracking.

**Props:**
```typescript
interface SectionWizardProps {
  onComplete: (section: Section) => void;
  onCancel: () => void;
  initialData?: Partial<Section>;
}
```

**Steps:**
1. Basic Information (course, semester, department)
2. Instructor Assignment
3. Schedule Builder
4. Capacity & Room
5. Review & Confirm

#### 2. ScheduleBuilder Component
Visual time grid for selecting section meeting times.

**Props:**
```typescript
interface ScheduleBuilderProps {
  selectedSlots: TimeSlot[];
  onSlotsChange: (slots: TimeSlot[]) => void;
  conflicts: ScheduleConflict[];
  instructorId?: string;
}
```

**Features:**
- 7-day week grid with hourly time slots
- Click/drag to select time ranges
- Real-time conflict highlighting
- Weekly preview panel

#### 3. StudentAssignment Component
Interface for searching and assigning students to sections.

**Props:**
```typescript
interface StudentAssignmentProps {
  sectionId: string;
  onAssignmentComplete: () => void;
}
```

**Features:**
- Multi-criteria search (name, ID, department, GPA)
- Checkbox grid for bulk selection
- Smart suggestion panel
- Capacity indicator

#### 4. OptimizationDashboard Component
Analytics and recommendations for section optimization.

**Props:**
```typescript
interface OptimizationDashboardProps {
  semesterId: string;
  departmentId?: string;
}
```

**Displays:**
- Overcrowded sections list
- Underfilled sections list
- Instructor workload warnings
- Schedule conflict alerts
- Actionable recommendations

#### 5. SectionCard Component
Compact display of section information with quick actions.

**Props:**
```typescript
interface SectionCardProps {
  section: SectionWithDetails;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAssignStudents: (id: string) => void;
  onViewAnalytics: (id: string) => void;
}
```

### Backend API Endpoints

#### Section Management

```
POST   /api/sections                    - Create new section
GET    /api/sections                    - List sections (paginated)
GET    /api/sections/:id                - Get section details
PUT    /api/sections/:id                - Update section
DELETE /api/sections/:id                - Delete section
POST   /api/sections/:id/validate       - Validate section configuration
```

#### Schedule Management

```
GET    /api/schedules/conflicts         - Check for schedule conflicts
GET    /api/schedules/instructor/:id    - Get instructor timetable
GET    /api/schedules/student/:id       - Get student timetable
GET    /api/schedules/department/:id    - Get department timetable
POST   /api/schedules/validate          - Validate schedule against conflicts
```

#### Student Assignment

```
GET    /api/sections/:id/students       - List students in section
POST   /api/sections/:id/students       - Assign students to section
DELETE /api/sections/:id/students/:sid  - Remove student from section
POST   /api/sections/:id/smart-assign   - Auto-assign students
GET    /api/sections/:id/suggestions    - Get suggested students
```

#### Bulk Operations

```
POST   /api/sections/bulk/assign        - Bulk assign students
POST   /api/sections/bulk/move          - Bulk move students
POST   /api/sections/export             - Export sections to CSV
POST   /api/sections/import             - Import student assignments from CSV
```

#### Optimization

```
GET    /api/optimization/analyze        - Analyze sections for issues
GET    /api/optimization/recommendations - Get optimization recommendations
GET    /api/optimization/workload       - Get instructor workload analysis
```

## Data Models

### Extended Section Model

The existing `Section` model will be extended with additional fields:

```prisma
model Section {
  id           String              @id @default(uuid())
  name         String              // Section identifier (e.g., "A1")
  sectionCode  String              @unique // Auto-generated (e.g., "BUS-101-A1")
  courseId     String
  instructorId String?
  semesterId   String?
  departmentId String?             // NEW: For filtering and optimization
  maxStudents  Int                 @default(40)
  roomNumber   String?             // NEW: Physical/virtual room
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  
  course       Course              @relation(fields: [courseId], references: [id])
  instructor   Instructor?         @relation(fields: [instructorId], references: [id])
  semester     AcademicSemester?   @relation(fields: [semesterId], references: [id])
  department   Department?         @relation(fields: [departmentId], references: [id])
  
  schedules    SectionSchedule[]   // NEW: Multiple meeting times
  enrollments  SectionEnrollment[]
  
  @@unique([courseId, name, semesterId])
  @@index([semesterId, departmentId])
  @@index([instructorId, semesterId])
}
```

### New SectionSchedule Model

Stores meeting times for sections:

```prisma
model SectionSchedule {
  id         String   @id @default(uuid())
  sectionId  String
  dayOfWeek  Int      // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime  String   // Format: "HH:MM" (e.g., "09:00")
  endTime    String   // Format: "HH:MM" (e.g., "10:30")
  createdAt  DateTime @default(now())
  
  section    Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  
  @@index([sectionId])
  @@index([dayOfWeek, startTime, endTime])
}
```

### Extended SectionEnrollment Model

Add performance tracking:

```prisma
model SectionEnrollment {
  id             String           @id @default(uuid())
  studentId      String
  sectionId      String
  enrolledAt     DateTime         @default(now())
  grade          Float?
  letterGrade    String?
  status         EnrollmentStatus @default(ENROLLED)
  attendanceRate Float?           // NEW: Percentage (0-100)
  
  section        Section          @relation(fields: [sectionId], references: [id])
  student        Student          @relation(fields: [studentId], references: [id])
  
  @@unique([studentId, sectionId])
  @@index([sectionId, status])
}
```

### New OptimizationLog Model

Track optimization recommendations and actions:

```prisma
model OptimizationLog {
  id             String   @id @default(uuid())
  semesterId     String
  issueType      String   // "OVERCROWDED", "UNDERFILLED", "WORKLOAD", "CONFLICT"
  severity       String   // "LOW", "MEDIUM", "HIGH"
  description    String
  recommendation String
  affectedIds    Json     // Array of section/instructor IDs
  resolved       Boolean  @default(false)
  resolvedAt     DateTime?
  resolvedBy     String?
  createdAt      DateTime @default(now())
  
  @@index([semesterId, resolved])
  @@index([issueType, severity])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties were identified as redundant or combinable:

- **Instructor conflict detection (1.4 and 1.5)**: Both test the same underlying functionality - preventing instructor double-booking. These will be combined into a single comprehensive property.
- **Timetable synchronization (7.1, 7.2, 7.3, 7.5)**: All test automatic timetable updates. These will be combined into properties that test creation, modification, and deletion scenarios.
- **Error message formatting (9.1, 9.2, 9.3, 9.5)**: All test that error messages follow specific patterns. These will be combined into a single property that validates error message structure.

### Correctness Properties

Property 1: Section creation accepts valid inputs
*For any* valid section data including course, instructor, semester, department, capacity, schedule, room, and section code, the system should accept and create the section without errors.
**Validates: Requirements 1.1**

Property 2: Section code auto-generation follows pattern
*For any* section created without a section code, the generated code should match the pattern {COURSE_CODE}-{SECTION_IDENTIFIER} and be unique across all sections.
**Validates: Requirements 1.2**

Property 3: Duplicate section codes are rejected
*For any* existing section code, attempting to create another section with the same code should be prevented and display an error message.
**Validates: Requirements 1.3**

Property 4: Instructor schedule conflicts are detected
*For any* instructor with an existing schedule, attempting to assign them to a section with overlapping time slots should be prevented and display a conflict warning.
**Validates: Requirements 1.4, 1.5**

Property 5: Capacity validation enforces positive integers
*For any* capacity value that is not a positive integer (negative, zero, or non-integer), the system should reject it with a validation error.
**Validates: Requirements 1.6**

Property 6: Schedule selection updates preview
*For any* set of selected time slots in the schedule builder, the weekly timetable preview should accurately reflect those selections.
**Validates: Requirements 2.2**

Property 7: Conflicts are visually highlighted
*For any* detected schedule conflict, the conflicting time slots should be highlighted in red in the UI.
**Validates: Requirements 2.3**

Property 8: Schedule modifications trigger conflict re-evaluation
*For any* schedule modification, the system should immediately re-evaluate conflicts and update visual indicators.
**Validates: Requirements 2.4**

Property 9: Schedule summary reflects selections
*For any* completed schedule selection, the displayed summary should accurately list all selected days and times.
**Validates: Requirements 2.5**

Property 10: Student search works across all criteria
*For any* search query using name, student ID, department, or GPA, the system should return only students matching the criteria.
**Validates: Requirements 3.1**

Property 11: Section suggestions meet criteria
*For any* selected student, suggested sections should match the student's department, have available capacity, and fit the student's schedule.
**Validates: Requirements 3.3**

Property 12: Smart assign distributes students evenly
*For any* set of students and available sections, the smart assign algorithm should distribute students such that no section has more than one additional student compared to any other section.
**Validates: Requirements 3.4**

Property 13: Smart assign respects priority ordering
*For any* student assignment where multiple sections are available, the algorithm should prioritize department match over capacity availability over schedule compatibility.
**Validates: Requirements 3.5**

Property 14: Overcapacity assignments are prevented
*For any* section at maximum capacity, attempting to assign additional students should be prevented and display an overcapacity error.
**Validates: Requirements 3.6**

Property 15: Overcrowded sections are detected
*For any* section where enrollment exceeds 90% of capacity, the optimization dashboard should flag it as overcrowded.
**Validates: Requirements 4.1**

Property 16: Underfilled sections are detected
*For any* section where enrollment is below 40% of capacity, the optimization dashboard should flag it as underfilled.
**Validates: Requirements 4.2**

Property 17: Excessive instructor workload is detected
*For any* instructor assigned to more than 5 sections in a semester, the optimization dashboard should flag them as overloaded.
**Validates: Requirements 4.3**

Property 18: System-wide conflicts are detected
*For any* instructor or student with overlapping section schedules, the optimization dashboard should detect and display the conflict.
**Validates: Requirements 4.4**

Property 19: Optimization suggestions are generated
*For any* detected optimization issue, the system should generate at least one actionable suggestion.
**Validates: Requirements 4.5**

Property 20: Workload calculations are accurate
*For any* overloaded instructor, the displayed section count and teaching hours should match the actual assigned sections.
**Validates: Requirements 4.6**

Property 21: Section cards display all required information
*For any* section, the section card should display course name, instructor name, schedule details, capacity usage ratio, room information, and performance summary.
**Validates: Requirements 5.1**

Property 22: Capacity usage follows format
*For any* section card, the capacity usage should be displayed in the format "enrolled/maximum" (e.g., "24/30").
**Validates: Requirements 5.2**

Property 23: Performance calculations are accurate
*For any* section with enrolled students, the average GPA and attendance percentage should be calculated correctly from the enrollment data.
**Validates: Requirements 5.3**

Property 24: Bulk assignment processes all students
*For any* set of selected students and a target section, bulk assignment should either assign all students or report specific failures for each student that cannot be assigned.
**Validates: Requirements 6.1**

Property 25: Bulk movement transfers students correctly
*For any* set of students being moved between sections, all students should be removed from the source section and added to the target section, or specific failures should be reported.
**Validates: Requirements 6.2**

Property 26: CSV export contains complete data
*For any* section export request, the generated CSV should contain all section details and all enrolled student information.
**Validates: Requirements 6.3**

Property 27: CSV import validates all entries
*For any* uploaded CSV file, each row should be validated before processing, and invalid rows should be rejected with specific error messages.
**Validates: Requirements 6.4, 6.5**

Property 28: Bulk operation summaries are accurate
*For any* completed bulk operation, the summary should accurately report the count of successful and failed operations.
**Validates: Requirements 6.6**

Property 29: Timetables synchronize on section changes
*For any* section creation, modification, or deletion, all associated timetables (instructor, student, department) should automatically update to reflect the change.
**Validates: Requirements 7.1, 7.2, 7.3, 7.5**

Property 30: Student assignment updates timetables
*For any* student assigned to or removed from a section, the student's timetable should automatically update.
**Validates: Requirements 7.3**

Property 31: Department timetables aggregate correctly
*For any* department, the department timetable should display all sections belonging to that department organized by time slots.
**Validates: Requirements 7.4**

Property 32: Schedule changes prevent overlaps
*For any* schedule modification that would create an overlap in an instructor's or student's timetable, the system should prevent the change and display a conflict error.
**Validates: Requirements 7.6**

Property 33: Wizard validation prevents invalid progression
*For any* wizard step with invalid input, the system should prevent progression to the next step.
**Validates: Requirements 8.2**

Property 34: Review summary contains all data
*For any* wizard completion, the review summary should contain all data entered in previous steps.
**Validates: Requirements 8.3**

Property 35: Wizard preserves navigation state
*For any* navigation between wizard steps, previously entered data should be preserved.
**Validates: Requirements 8.6**

Property 36: Error messages follow required format
*For any* validation error (duplicate code, schedule conflict, capacity overflow, double-booking), the error message should follow the specified format with appropriate variable substitution.
**Validates: Requirements 9.1, 9.2, 9.3, 9.5**

Property 37: Error highlighting targets correct fields
*For any* validation error, the UI should apply error styling to the specific field or component that caused the error.
**Validates: Requirements 9.6**

Property 38: Large lists are paginated
*For any* section list exceeding 50 items, the system should implement pagination.
**Validates: Requirements 10.1**

Property 39: Bulk operations show progress
*For any* bulk operation processing multiple items, the system should display progress indicators.
**Validates: Requirements 10.3**

## Error Handling

### Validation Errors

The system implements comprehensive validation at multiple layers:

1. **Client-side validation**: Immediate feedback in the UI before API calls
2. **API validation**: Request validation using middleware
3. **Business logic validation**: Domain-specific rules in service layer
4. **Database constraints**: Final enforcement at the data layer

### Error Categories

**Input Validation Errors (400)**
- Invalid capacity values
- Malformed section codes
- Missing required fields
- Invalid date/time formats

**Conflict Errors (409)**
- Duplicate section codes
- Instructor schedule conflicts
- Student schedule conflicts
- Capacity overflow

**Not Found Errors (404)**
- Section not found
- Instructor not found
- Student not found
- Course not found

**Authorization Errors (403)**
- Insufficient permissions for section management
- Unauthorized bulk operations

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "SCHEDULE_CONFLICT",
    "message": "Conflict detected: This schedule overlaps with BUS-101-A1 at Monday 09:00-10:30.",
    "field": "schedule",
    "details": {
      "conflictingSectionId": "uuid",
      "conflictingSectionName": "BUS-101-A1",
      "conflictingTimeSlot": {
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "10:30"
      }
    }
  }
}
```

### Conflict Detection Algorithm

The conflict detection system uses a time-based overlap algorithm:

```javascript
function hasTimeOverlap(slot1, slot2) {
  // Same day check
  if (slot1.dayOfWeek !== slot2.dayOfWeek) {
    return false;
  }
  
  // Convert times to minutes for comparison
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  // Check for overlap: (start1 < end2) AND (end1 > start2)
  return start1 < end2 && end1 > start2;
}
```

### Rollback Strategy

For bulk operations, the system implements transaction-based rollback:

1. **Batch processing**: Process assignments in batches of 50
2. **Transaction per batch**: Each batch runs in a database transaction
3. **Partial success handling**: Track successful and failed operations
4. **Error reporting**: Provide detailed feedback for each failure

## Testing Strategy

### Unit Testing

Unit tests will cover individual functions and components:

**Backend Unit Tests:**
- Section code generation logic
- Conflict detection algorithms
- Smart assignment distribution logic
- Capacity validation
- Schedule overlap detection
- CSV parsing and validation
- Error message formatting

**Frontend Unit Tests:**
- Component rendering with various props
- Event handler functions
- State management logic
- Form validation
- Time slot selection logic

### Property-Based Testing

Property-based tests will verify universal properties using **fast-check** (JavaScript property testing library). Each property test will run a minimum of 100 iterations with randomly generated inputs.

**Key Property Tests:**
- Section code uniqueness and format (Property 2)
- Conflict detection accuracy (Property 4)
- Smart assignment distribution fairness (Property 12)
- Capacity enforcement (Property 14)
- Timetable synchronization (Property 29)
- CSV round-trip consistency (Property 26, 27)
- Error message format compliance (Property 36)

Each property-based test will be tagged with a comment referencing the design document:
```javascript
// Feature: class-section-assignment-system, Property 4: Instructor schedule conflicts are detected
```

### Integration Testing

Integration tests will verify end-to-end workflows:

- Complete section creation wizard flow
- Student assignment with conflict detection
- Bulk operations with mixed success/failure
- Timetable updates across multiple entities
- CSV import/export round-trip
- Optimization dashboard data accuracy

### Test Data Generation

For property-based testing, generators will create:

- **Valid sections**: Random courses, instructors, schedules, capacities
- **Conflicting schedules**: Intentionally overlapping time slots
- **Student populations**: Various departments, GPAs, existing schedules
- **Edge cases**: Boundary capacities, extreme workloads, minimal/maximal schedules

### Performance Testing

While not part of correctness properties, performance tests will validate:

- Search response times with 10,000+ students
- Bulk operation processing speed
- Optimization analysis completion time
- Pagination performance with large datasets

## Implementation Notes

### Schedule Time Representation

Times are stored as strings in "HH:MM" 24-hour format for simplicity and database compatibility. The system converts to minutes for comparison operations.

### Section Code Generation

The auto-generation algorithm:
1. Extract course code from the course
2. Find existing sections for the course in the semester
3. Generate next available identifier (A1, A2, ..., Z9)
4. Combine as {COURSE_CODE}-{IDENTIFIER}

### Smart Assignment Algorithm

The smart assignment algorithm uses a weighted scoring system:

```javascript
function calculateAssignmentScore(student, section) {
  let score = 0;
  
  // Department match (highest priority)
  if (student.departmentId === section.departmentId) {
    score += 100;
  }
  
  // Capacity availability (medium priority)
  const capacityRatio = section.enrolledCount / section.maxStudents;
  score += (1 - capacityRatio) * 50;
  
  // Schedule fit (lowest priority)
  if (!hasScheduleConflict(student, section)) {
    score += 25;
  }
  
  return score;
}
```

Students are assigned to the highest-scoring available section, with even distribution as a tiebreaker.

### Optimization Thresholds

The optimization engine uses configurable thresholds:

- **Overcrowded**: > 90% capacity
- **Underfilled**: < 40% capacity
- **Overloaded instructor**: > 5 sections per semester
- **High workload**: > 15 teaching hours per week

### Database Indexing Strategy

Critical indexes for performance:

```sql
-- Section lookups
CREATE INDEX idx_section_semester_dept ON Section(semesterId, departmentId);
CREATE INDEX idx_section_instructor_semester ON Section(instructorId, semesterId);

-- Schedule conflict detection
CREATE INDEX idx_schedule_day_time ON SectionSchedule(dayOfWeek, startTime, endTime);

-- Student search
CREATE INDEX idx_student_department ON Student(departmentId);
CREATE INDEX idx_student_gpa ON Student(cumulativeGPA);

-- Enrollment queries
CREATE INDEX idx_enrollment_section_status ON SectionEnrollment(sectionId, status);
```

### Caching Strategy

To improve performance:

- **Instructor timetables**: Cache for 5 minutes, invalidate on section changes
- **Department timetables**: Cache for 10 minutes, invalidate on section changes
- **Optimization analysis**: Cache for 15 minutes, manual refresh option
- **Student search results**: No caching (real-time data required)

### Security Considerations

- **Role-based access**: Only ADMIN and REGISTRAR roles can manage sections
- **Audit logging**: All section changes logged with user ID and timestamp
- **Input sanitization**: All user inputs sanitized to prevent injection attacks
- **Rate limiting**: Bulk operations limited to prevent abuse
- **File upload validation**: CSV files validated for size, format, and content

## Future Enhancements

Potential future improvements not in current scope:

1. **AI-powered optimization**: Machine learning for optimal section distribution
2. **Room conflict detection**: Integration with room booking system
3. **Waitlist management**: Automatic enrollment from waitlists when capacity opens
4. **Historical analytics**: Trend analysis for section demand and performance
5. **Mobile app**: Native mobile interface for instructors and students
6. **Real-time notifications**: Push notifications for schedule changes
7. **Advanced scheduling**: Support for irregular meeting patterns (e.g., alternating weeks)
8. **Resource allocation**: Equipment and facility assignment
9. **Cross-listed courses**: Support for courses listed under multiple departments
10. **Prerequisite enforcement**: Automatic validation of student prerequisites during assignment
