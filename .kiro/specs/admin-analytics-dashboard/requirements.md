# Requirements Document

## Introduction

This feature adds a dedicated Analytics Dashboard to the Atlas Portal admin panel. It provides real-time, data-driven insights about the university system — including student totals, GPA distribution, enrollment by program, course popularity, and pass/fail rates — visualized with interactive charts. The goal is to give admins a modern, SaaS-quality analytics view without breaking any existing functionality.

## Glossary

- **Analytics Dashboard**: A dedicated page or tab in the admin panel that displays aggregated system statistics and charts.
- **GPA Distribution**: A breakdown of students by cumulative GPA into three bands: High (≥ 3.5), Medium (2.0–3.49), and Low (< 2.0).
- **Enrollment by Program**: The count of active students grouped by their enrolled program.
- **Course Popularity**: A ranking of courses by the number of currently enrolled students.
- **Pass/Fail Rate**: The proportion of completed grades where a student received a C or above (pass) versus below C (fail).
- **Recharts**: An open-source React charting library used to render Bar, Pie, and other chart types.
- **Summary Card**: A UI card displaying a single numeric KPI with a label and optional icon.
- **Loading Skeleton**: An animated placeholder shown while data is being fetched from the API.
- **Analytics Endpoint**: `GET /api/admin/analytics` — the backend route that returns all analytics data in a single response.
- **Prisma Aggregation**: Use of Prisma's `count()`, `groupBy()`, and `aggregate()` functions to compute statistics without raw SQL.
- **Letter Grade C**: The threshold grade used to determine pass vs. fail; grades ≥ C are passing.

---

## Requirements

### Requirement 1 — Analytics API Endpoint

**User Story:** As an admin, I want a single API endpoint that returns all analytics data, so that the frontend can render the dashboard with one request.

#### Acceptance Criteria

1. THE Analytics Endpoint SHALL return a JSON object containing: `totalStudents`, `totalInstructors`, `totalPrograms`, `totalCourses`, and `totalEnrollments`.
2. THE Analytics Endpoint SHALL return a `gpaDistribution` object with three numeric fields: `high` (students with cumulativeGPA ≥ 3.5), `medium` (students with cumulativeGPA ≥ 2.0 and < 3.5), and `low` (students with cumulativeGPA < 2.0).
3. WHEN a student has a null or undefined `cumulativeGPA`, THE Analytics Endpoint SHALL count that student in the `low` band.
4. THE Analytics Endpoint SHALL return an `enrollmentByProgram` array where each element contains a `name` (program name) and a `count` (number of active students enrolled in that program), ordered by count descending.
5. THE Analytics Endpoint SHALL return a `coursePopularity` array of the top 10 courses ordered by current enrollment count descending, each containing `title`, `code`, and `count`.
6. THE Analytics Endpoint SHALL return a `passFailRate` object with two numeric fields: `pass` (count of letter grades ≥ C) and `fail` (count of letter grades < C), computed from the `Enrollment` table's `letterGrade` field.
7. WHEN no letter grades exist in the system, THE Analytics Endpoint SHALL return `passFailRate` as `{ pass: 0, fail: 0 }`.
8. THE Analytics Endpoint SHALL use Prisma `count()`, `groupBy()`, and `aggregate()` functions and SHALL NOT use raw SQL queries.
9. IF the analytics query fails, THEN THE Analytics Endpoint SHALL return a 500 response with `{ success: false, message: <error message> }`.

---

### Requirement 2 — Summary Cards

**User Story:** As an admin, I want summary stat cards at the top of the analytics page, so that I can instantly see key system totals.

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL display five summary cards: Total Students, Total Courses, Total Programs, Total Instructors, and Total Enrollments.
2. EACH summary card SHALL display a numeric value, a descriptive label, and a distinct icon.
3. WHILE analytics data is loading, THE Analytics Dashboard SHALL display animated skeleton placeholders in place of each card's numeric value.
4. IF the analytics API call fails, THEN THE Analytics Dashboard SHALL display a toast error notification and show a retry button.

---

### Requirement 3 — Enrollment by Program Bar Chart

**User Story:** As an admin, I want a bar chart showing student enrollment per program, so that I can identify which programs are most popular.

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL render a Recharts `BarChart` displaying `enrollmentByProgram` data with program name on the X-axis and student count on the Y-axis.
2. THE bar chart SHALL be responsive and fill its container width using Recharts `ResponsiveContainer`.
3. WHEN the `enrollmentByProgram` array is empty, THE Analytics Dashboard SHALL display an empty state message in place of the chart.

---

### Requirement 4 — GPA Distribution Pie Chart

**User Story:** As an admin, I want a pie chart showing GPA distribution, so that I can assess the academic health of the student body.

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL render a Recharts `PieChart` with three segments: High GPA (≥ 3.5), Medium GPA (2.0–3.49), and Low GPA (< 2.0).
2. EACH pie segment SHALL use a distinct color: High = green (`#22c55e`), Medium = amber (`#f59e0b`), Low = red (`#ef4444`).
3. THE pie chart SHALL display a legend identifying each segment by label and color.
4. WHEN all three GPA bands have a count of zero, THE Analytics Dashboard SHALL display an empty state message in place of the chart.

---

### Requirement 5 — Course Popularity Chart

**User Story:** As an admin, I want a chart showing the most enrolled courses, so that I can identify high-demand courses.

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL render a Recharts `BarChart` displaying the top 10 courses by enrollment, with course code on the X-axis and enrollment count on the Y-axis.
2. THE course popularity chart SHALL be responsive using Recharts `ResponsiveContainer`.
3. WHEN the `coursePopularity` array is empty, THE Analytics Dashboard SHALL display an empty state message in place of the chart.

---

### Requirement 6 — Pass/Fail Rate Display

**User Story:** As an admin, I want to see the overall pass/fail rate, so that I can monitor academic outcomes.

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL display the `passFailRate` data as a Recharts `PieChart` with two segments: Pass and Fail.
2. THE pass segment SHALL use green (`#22c55e`) and the fail segment SHALL use red (`#ef4444`).
3. WHEN both pass and fail counts are zero, THE Analytics Dashboard SHALL display an empty state message in place of the chart.

---

### Requirement 7 — Loading and Error States

**User Story:** As an admin, I want clear loading and error feedback, so that I always know the state of the dashboard.

#### Acceptance Criteria

1. WHILE the analytics API request is in progress, THE Analytics Dashboard SHALL display skeleton placeholders for all cards and charts.
2. IF the analytics API request fails, THEN THE Analytics Dashboard SHALL display a `react-hot-toast` error notification with the error message.
3. IF the analytics API request fails, THEN THE Analytics Dashboard SHALL display a visible "Retry" button that re-triggers the API call.
4. THE Analytics Dashboard SHALL wrap the API call in a try/catch block to prevent unhandled promise rejections.

---

### Requirement 8 — Recharts Integration

**User Story:** As a developer, I want all charts built with Recharts, so that the charting library is consistent and maintainable.

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL install and use the `recharts` npm package for all chart components.
2. THE Analytics Dashboard SHALL use `ResponsiveContainer` from Recharts to make all charts adapt to their parent container width.
3. THE Analytics Dashboard SHALL use `Tooltip` from Recharts on all charts to display data values on hover.
