# Implementation Plan — Admin Analytics Dashboard

- [x] 1. Install recharts and create analytics controller
  - Run `npm install recharts` in the `frontend` directory
  - Create `backend/src/controllers/analytics.controller.js` with `getAnalytics` function
  - Implement all five parallel Prisma queries: totals (5x `count()`), GPA bands (3x `count()` with range filters), enrollment by program (`groupBy` + name lookup sorted descending), course popularity (`groupBy` top 10), pass/fail rate (`findMany` on non-null `letterGrade` + controller-side partition)
  - Handle null `cumulativeGPA` by including `{ OR: [{ cumulativeGPA: { lt: 2.0 } }, { cumulativeGPA: null }] }` in the low band query
  - Return `{ success: true, data: { totals, gpaDistribution, enrollmentByProgram, coursePopularity, passFailRate } }`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [x] 1.1 Write property test for GPA band invariant
  - **Property 1: GPA band invariant**
  - **Validates: Requirements 1.2, 1.3**
  - File: `backend/src/controllers/analytics.controller.test.js`
  - Use `fc.array(fc.record({ cumulativeGPA: fc.oneof(fc.float({ min: 0, max: 4 }), fc.constant(null)) }), { minLength: 0, maxLength: 50 })` as generator
  - Mock Prisma `student.count` to return counts matching the generated array's band distribution
  - Assert `high + medium + low === totalStudents` and null GPAs are counted in `low`

- [x] 1.2 Write property test for enrollment sort order
  - **Property 2: Enrollment by program is sorted descending**
  - **Validates: Requirements 1.4**
  - Use `fc.array(fc.record({ name: fc.string(), count: fc.integer({ min: 0, max: 500 }) }), { minLength: 1, maxLength: 20 })` as generator
  - Call the sort logic used in the controller and assert each element's count >= the next element's count

- [x] 1.3 Write property test for pass/fail completeness
  - **Property 3: Pass/fail completeness**
  - **Validates: Requirements 1.6, 1.7**
  - Use `fc.array(fc.constantFrom('A+','A','A-','B+','B','B-','C+','C','D+','D','F'), { minLength: 0, maxLength: 100 })` as generator
  - Call the pass/fail partition logic and assert `pass + fail === input.length`
  - Also assert that when input is empty, both are 0

- [x] 2. Register analytics route in admin router
  - In `backend/src/routes/admin.routes.js`, import `getAnalytics` from `analytics.controller.js`
  - Add `router.get('/analytics', getAnalytics)` (no extra role restriction — all ADMIN roles can view analytics)
  - _Requirements: 1.1, 1.9_

- [x] 3. Create analytics chart sub-components
  - Create directory `frontend/src/components/admin/analytics/`
  - Create `EnrollmentBarChart.jsx`: accepts `data` prop (array of `{ name, count }`); renders Recharts `ResponsiveContainer` + `BarChart` with `XAxis`, `YAxis`, `Tooltip`, `Bar`; shows `<EmptyState>` when data is empty
  - Create `GpaDistributionPieChart.jsx`: accepts `data` prop (`{ high, medium, low }`); renders Recharts `PieChart` with 3 `Cell` entries colored `#22c55e`, `#f59e0b`, `#ef4444`; includes `Legend` and `Tooltip`; shows `<EmptyState>` when all bands are 0
  - Create `CoursePopularityBarChart.jsx`: accepts `data` prop (array of `{ title, code, count }`); renders Recharts `BarChart` using `code` on X-axis; shows `<EmptyState>` when data is empty
  - Create `PassFailPieChart.jsx`: accepts `data` prop (`{ pass, fail }`); renders Recharts `PieChart` with 2 segments (green/red); shows `<EmptyState>` when both are 0
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 8.1, 8.2, 8.3_

- [x] 3.1 Write property test for EnrollmentBarChart bar count
  - **Property 4: Bar chart renders one bar per data entry**
  - **Validates: Requirements 3.1**
  - File: `frontend/src/components/admin/analytics/EnrollmentBarChart.property.test.jsx`
  - Use `fc.array(fc.record({ name: fc.string({ minLength: 1 }), count: fc.integer({ min: 0 }) }), { minLength: 1, maxLength: 15 })` as generator
  - Render `EnrollmentBarChart` with generated data; assert the rendered output contains the correct number of bar elements

- [x] 3.2 Write property test for GpaDistributionPieChart segments
  - **Property 5: GPA pie chart has exactly three segments**
  - **Validates: Requirements 4.1, 4.2**
  - File: `frontend/src/components/admin/analytics/GpaDistributionPieChart.property.test.jsx`
  - Use `fc.record({ high: fc.integer({ min: 0, max: 200 }), medium: fc.integer({ min: 0, max: 200 }), low: fc.integer({ min: 0, max: 200 }) })` as generator
  - Render `GpaDistributionPieChart` with generated data; assert 3 pie cells are rendered with the correct fill colors

- [x] 4. Create AnalyticsDashboard page
  - Create `frontend/src/pages/AnalyticsDashboard.jsx`
  - On mount, call `GET /admin/analytics` via the existing `api` axios instance
  - Manage `{ data, loading, error }` state
  - While loading: render `<StatCard loading={true}>` skeletons for all 5 summary cards and skeleton placeholders for charts
  - On error: call `toast.error(message)` and render a "Retry" button that re-triggers the fetch
  - On success: render 5 `<StatCard>` components (Total Students, Total Courses, Total Programs, Total Instructors, Total Enrollments) followed by a 2-column grid of the four chart components
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 7.4_

- [x] 5. Wire AnalyticsDashboard into AdminDashboard sidebar
  - In `frontend/src/pages/AdminDashboard.jsx`, import `AnalyticsDashboard`
  - Add `'analytics'` to the `TAB_LABELS` map with label `'Analytics'`
  - Add `'analytics'` to the `visibleTabs` base array (visible to all admin roles)
  - Add a `NavBtn` entry for the analytics tab using the `BarChart2` icon from `lucide-react`
  - Add a conditional render block: `{activeTab === 'analytics' && <AnalyticsDashboard />}`
  - _Requirements: 2.1, 2.2_

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
