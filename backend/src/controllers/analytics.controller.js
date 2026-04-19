const prisma = require('../services/prisma');

// Letter grades considered passing (C and above)
const PASS_GRADES = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C']);

/**
 * Compute GPA band counts from an array of student objects.
 * Each student has a nullable `cumulativeGPA` field.
 * Exported for unit/property testing.
 */
function computeGpaBands(students) {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const s of students) {
    const gpa = s.cumulativeGPA;
    if (gpa == null || gpa < 2.0) low += 1;
    else if (gpa < 3.5) medium += 1;
    else high += 1;
  }
  return { high, medium, low };
}

/**
 * Sort an array of { name, count } objects by count descending.
 * Exported for unit/property testing.
 */
function sortByCountDesc(arr) {
  return [...arr].sort((a, b) => b.count - a.count);
}

/**
 * Partition an array of letter grade strings into pass/fail counts.
 * Exported for unit/property testing.
 */
function partitionPassFail(grades) {
  let pass = 0;
  let fail = 0;
  for (const g of grades) {
    if (PASS_GRADES.has(g)) pass += 1;
    else fail += 1;
  }
  return { pass, fail };
}

const getAnalytics = async (_req, res) => {
  try {
    // ── 1. Totals ──────────────────────────────────────────
    const [
      totalStudents,
      totalInstructors,
      totalPrograms,
      totalCourses,
      totalEnrollments,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.instructor.count(),
      prisma.program.count({ where: { isDeleted: false } }),
      prisma.course.count(),
      prisma.enrollment.count(),
    ]);

    // ── 2. GPA Distribution ────────────────────────────────
    const [gpaHigh, gpaMedium, gpaLow] = await Promise.all([
      prisma.student.count({ where: { cumulativeGPA: { gte: 3.5 } } }),
      prisma.student.count({ where: { cumulativeGPA: { gte: 2.0, lt: 3.5 } } }),
      prisma.student.count({
        where: { OR: [{ cumulativeGPA: { lt: 2.0 } }, { cumulativeGPA: null }] },
      }),
    ]);

    // ── 3. Enrollment by Program ───────────────────────────
    const enrollmentGroups = await prisma.student.groupBy({
      by: ['programId'],
      _count: { programId: true },
    });

    const programIds = enrollmentGroups.map((g) => g.programId).filter(Boolean);
    const programs = await prisma.program.findMany({
      where: { id: { in: programIds }, isDeleted: false },
      select: { id: true, name: true },
    });
    const programMap = Object.fromEntries(programs.map((p) => [p.id, p.name]));

    const enrollmentByProgram = sortByCountDesc(
      enrollmentGroups
        .filter((g) => programMap[g.programId])
        .map((g) => ({ name: programMap[g.programId], count: g._count.programId }))
    );

    // ── 4. Course Popularity (top 10) ──────────────────────
    const courseGroups = await prisma.enrollment.groupBy({
      by: ['courseId'],
      _count: { courseId: true },
      orderBy: { _count: { courseId: 'desc' } },
      take: 10,
    });

    const courseIds = courseGroups.map((g) => g.courseId);
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, code: true },
    });
    const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));

    const coursePopularity = courseGroups
      .filter((g) => courseMap[g.courseId])
      .map((g) => ({
        title: courseMap[g.courseId].title,
        code: courseMap[g.courseId].code,
        count: g._count.courseId,
      }));

    // ── 5. Pass / Fail Rate ────────────────────────────────
    const gradedEnrollments = await prisma.enrollment.findMany({
      where: { letterGrade: { not: null } },
      select: { letterGrade: true },
    });
    const passFailRate = partitionPassFail(
      gradedEnrollments.map((e) => e.letterGrade)
    );

    return res.status(200).json({
      success: true,
      data: {
        totals: { totalStudents, totalInstructors, totalPrograms, totalCourses, totalEnrollments },
        gpaDistribution: { high: gpaHigh, medium: gpaMedium, low: gpaLow },
        enrollmentByProgram,
        coursePopularity,
        passFailRate,
      },
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAnalytics, sortByCountDesc, partitionPassFail, computeGpaBands };
