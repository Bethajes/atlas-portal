# Design Document — Admin Analytics Dashboard

## Overview

The Admin Analytics Dashboard adds a dedicated analytics view to the Atlas Portal admin panel. A single backend endpoint (`GET /api/admin/analytics`) aggregates all statistics using Prisma's built-in query methods. The frontend renders the data as summary cards and Recharts-powered charts inside a new `AnalyticsDashboard` page component, accessible via a new "Analytics" tab in the admin sidebar.

The feature is purely additive — no existing controllers, routes, or components are modified beyond wiring in the new tab and route.

---

## Architecture

```
Frontend (React)                     Backend (Node/Express/Prisma)
─────────────────────────────────    ──────────────────────────────────
AdminDashboard.jsx                   admin.routes.js
  └─ "Analytics" tab                   └─ GET /admin/analytics
       └─ AnalyticsDashboard.jsx              └─ analytics.controller.js
            ├─ SummaryCards                        ├─ count() — totals
            ├─ EnrollmentBarChart                  ├─ groupBy() — enrollment by program
            ├─ GpaDistributionPieChart             ├─ aggregate() — GPA bands
            ├─ CoursePopularityBarChart            └─ groupBy() — pass/fail
            └─ PassFailPieChart
```

Data flows in one direction: the page component calls the API on mount, stores the response in local state, and passes slices of that state down to each chart component as props.

---

## Components and Interfaces

### Backend

**`analytics.controller.js`** — new file at `backend/src/controllers/analytics.controller.js`

```js
getAnalytics(req, res) → Promise<void>
```

Returns a single JSON object (see Data Models section).

**`admin.routes.js`** — add one line:
```js
router.get('/analytics', getAnalytics);
```

### Frontend

**`AnalyticsDashboard.jsx`** — new page at `frontend/src/pages/AnalyticsDashboard.jsx`

Props: none (reads from API directly)

Internal state:
```ts
{
  data: AnalyticsResponse | null,
  loading: boolean,
  error: string | null,
}
```

**Sub-components** (all in `frontend/src/components/admin/analytics/`):

| Component | Props | Chart type |
|---|---|---|
| `SummaryCards` | `data: AnalyticsResponse, loading: boolean` | Cards only |
| `EnrollmentBarChart` | `data: EnrollmentByProgram[]` | Recharts BarChart |
| `GpaDistributionPieChart` | `data: GpaDistribution` | Recharts PieChart |
| `CoursePopularityBarChart` | `data: CoursePopularity[]` | Recharts BarChart |
| `PassFailPieChart` | `data: PassFailRate` | Recharts PieChart |

---

## Data Models

### API Response Shape

```ts
interface AnalyticsResponse {
  totals: {
    totalStudents: number;
    totalInstructors: number;
    totalPrograms: number;
    totalCourses: number;
    totalEnrollments: number;
  };
  gpaDistribution: {
    high: number;   // cumulativeGPA >= 3.5
    medium: number; // cumulativeGPA >= 2.0 && < 3.5
    low: number;    // cumulativeGPA < 2.0 OR null
  };
  enrollmentByProgram: Array<{ name: string; count: number }>;
  coursePopularity: Array<{ title: string; code: string; count: number }>;
  passFailRate: { pass: number; fail: number };
}
```

### Backend Query Strategy

**Totals** — five parallel `prisma.model.count()` calls via `Promise.all`.

**GPA Distribution** — `prisma.student.groupBy()` is not directly usable here because the bands are numeric ranges, not discrete values. Instead, three parallel `prisma.student.count()` calls with `where` filters:
```js
high:   { cumulativeGPA: { gte: 3.5 } }
medium: { cumulativeGPA: { gte: 2.0, lt: 3.5 } }
low:    { OR: [{ cumulativeGPA: { lt: 2.0 } }, { cumulativeGPA: null }] }
```

**Enrollment by Program** — `prisma.student.groupBy({ by: ['programId'] })` combined with a `prisma.program.findMany` lookup to resolve names, then sorted by count descending.

**Course Popularity** — `prisma.enrollment.groupBy({ by: ['courseId'], _count: true })` limited to top 10, joined with course title/code.

**Pass/Fail Rate** — `prisma.enrollment.findMany({ where: { letterGrade: { not: null } }, select: { letterGrade: true } })` then partition client-side in the controller. Pass = letterGrade in `['A+','A','A-','B+','B','B-','C+','C']`, Fail = everything else with a non-null grade.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Prework Analysis

**1.1** THE Analytics Endpoint SHALL return totals including `totalStudents`, `totalInstructors`, etc.
Thoughts: This is a rule about all possible database states. For any set of seeded records, the returned counts should equal the actual counts. We can generate random counts, seed the DB (or mock Prisma), call the controller, and assert the numbers match.
Testable: yes — property

**1.2 / 1.3** GPA distribution bands and null handling.
Thoughts: For any collection of students with arbitrary GPA values (including null), the sum of high + medium + low must equal totalStudents, and null GPAs must land in `low`. This is an invariant.
Testable: yes — property

**1.4** `enrollmentByProgram` ordered by count descending.
Thoughts: For any array of enrollment data, the returned array should be sorted. We can generate random program enrollment counts and assert the output is non-increasing.
Testable: yes — property

**1.6 / 1.7** Pass/fail rate and zero-grade edge case.
Thoughts: For any set of letter grades, pass + fail must equal the total number of non-null grades. When there are no grades, both should be 0.
Testable: yes — property

**2.3** Loading skeleton shown while fetching.
Thoughts: This is a UI timing behavior — not a computable property over data.
Testable: no

**3.1** Bar chart renders enrollmentByProgram data.
Thoughts: For any non-empty array of enrollment data, the rendered chart should contain one bar per entry. We can generate random arrays and assert the rendered output contains the right number of elements.
Testable: yes — property

**4.1 / 4.2** Pie chart segments and colors.
Thoughts: For any GPA distribution object, the rendered pie chart should contain exactly three segments with the correct colors. We can generate random distributions and assert segment presence.
Testable: yes — property

**7.3** Retry button shown on error.
Thoughts: This is a specific UI state — when error is non-null, a retry button must be present. This is an example test.
Testable: yes — example

### Property Reflection

After reviewing all identified properties:
- Properties 1.2 and 1.3 (GPA bands + null handling) are combined into one invariant: "sum of bands equals total, nulls go to low"
- Properties 1.6 and 1.7 (pass/fail + zero case) are combined: "pass + fail = total non-null grades, zero when no grades"
- Properties 3.1 and 4.1 are kept separate as they test different chart components

---

### Correctness Properties

**Property 1: GPA band invariant**
*For any* collection of students with arbitrary `cumulativeGPA` values (including null), the sum of `gpaDistribution.high + gpaDistribution.medium + gpaDistribution.low` SHALL equal `totals.totalStudents`, and any student with a null GPA SHALL be counted in `low`.
**Validates: Requirements 1.2, 1.3**

---

**Property 2: Enrollment by program is sorted descending**
*For any* non-empty `enrollmentByProgram` array, each element's `count` SHALL be greater than or equal to the next element's `count` (i.e., the array is sorted in non-increasing order).
**Validates: Requirements 1.4**

---

**Property 3: Pass/fail completeness**
*For any* set of enrollment records with non-null `letterGrade` values, `passFailRate.pass + passFailRate.fail` SHALL equal the total count of those records. When no letter grades exist, both SHALL be 0.
**Validates: Requirements 1.6, 1.7**

---

**Property 4: Bar chart renders one bar per data entry**
*For any* non-empty `enrollmentByProgram` array of length N, the rendered `EnrollmentBarChart` SHALL contain exactly N bar elements.
**Validates: Requirements 3.1**

---

**Property 5: GPA pie chart has exactly three segments**
*For any* `gpaDistribution` object (including cases where one or more bands are zero), the rendered `GpaDistributionPieChart` SHALL contain exactly three segments with colors `#22c55e`, `#f59e0b`, and `#ef4444`.
**Validates: Requirements 4.1, 4.2**

---

## Error Handling

| Scenario | Backend behavior | Frontend behavior |
|---|---|---|
| Prisma query throws | Return `500 { success: false, message }` | Toast error + show retry button |
| API unreachable | — | Toast error + show retry button |
| Empty data (no students, no grades) | Return zeros/empty arrays | Charts show empty state message |
| Null GPA values | Counted in `low` band | Reflected in pie chart |

---

## Testing Strategy

### Unit Tests
- Test the `getAnalytics` controller with a mocked Prisma client for specific scenarios: all zeros, mixed data, null GPAs, no letter grades.
- Test each chart component renders without crashing given valid and empty props.
- Test the retry button appears when `error` state is set.

### Property-Based Testing

The project uses **Vitest** + **fast-check** (already installed as a dev dependency).

Each property-based test MUST be tagged with:
`// Feature: admin-analytics-dashboard, Property {N}: {property text}`

Each test runs a minimum of **100 iterations**.

| Property | Test approach |
|---|---|
| Property 1 (GPA invariant) | Generate arrays of students with random/null GPAs; mock Prisma; assert band sums |
| Property 2 (sorted enrollment) | Generate random program enrollment arrays; assert output is non-increasing |
| Property 3 (pass/fail completeness) | Generate random letter grade arrays; assert pass+fail = total |
| Property 4 (bar count) | Generate random enrollment arrays; render component; assert bar count |
| Property 5 (pie segments) | Generate random GPA distributions; render component; assert 3 segments with correct colors |
