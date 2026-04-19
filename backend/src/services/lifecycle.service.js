/**
 * Student Lifecycle & Academic Progression Service
 *
 * Handles:
 *  - Year-to-level mapping
 *  - Academic progression (year promotion)
 *  - Graduation eligibility check
 *  - Lifecycle state transitions
 */

const prisma = require('./prisma');
const { sendNotification } = require('./notification.service');

async function getCompletedCourseIds(studentId) {
  const [sectionRows, enrollmentRows] = await Promise.all([
    prisma.sectionEnrollment.findMany({
      where: { studentId, status: 'COMPLETED' },
      select: { section: { select: { courseId: true } } },
    }),
    prisma.enrollment.findMany({
      where: { studentId, status: 'COMPLETED' },
      select: { courseId: true },
    }),
  ]);
  const ids = new Set();
  for (const r of sectionRows) {
    if (r.section?.courseId) ids.add(r.section.courseId);
  }
  for (const r of enrollmentRows) ids.add(r.courseId);
  return ids;
}

// ─── Year → AcademicLevel mapping ────────────────────────────
const YEAR_TO_LEVEL = {
  0: 'ADMITTED',
  1: 'FRESHMAN',
  2: 'SOPHOMORE',
  3: 'JUNIOR',
  4: 'SENIOR',
};

function yearToLevel(year) {
  return YEAR_TO_LEVEL[year] ?? 'SENIOR';
}

// ─── Minimum credits required to progress ────────────────────
const MIN_CREDITS_TO_PROGRESS = {
  1: 24,  // Freshman → Sophomore
  2: 56,  // Sophomore → Junior
  3: 88,  // Junior → Senior
};

const MIN_GPA_TO_PROGRESS = 2.0;
const MIN_GPA_TO_GRADUATE = 2.0;

/**
 * Check if a student is eligible for graduation.
 * Returns { eligible, reason, completedCredits, requiredCredits, cgpa }
 */
async function checkGraduationEligibility(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { program: { select: { id: true, totalCredits: true, minGPA: true, durationYears: true } } },
  });
  if (!student) throw new Error('Student not found');

  const completedEnrollments = await prisma.sectionEnrollment.findMany({
    where: { studentId, status: 'COMPLETED' },
    include: { section: { include: { course: { select: { credits: true } } } } },
  });

  const completedCredits = completedEnrollments.reduce(
    (s, e) => s + (e.section?.course?.credits ?? 0), 0
  );
  const requiredCredits = student.program?.totalCredits ?? 128;
  const minGPA = student.program?.minGPA ?? MIN_GPA_TO_GRADUATE;
  const cgpa = student.cumulativeGPA ?? 0;

  const requiredProgramCourses = await prisma.programCourse.findMany({
    where: { programId: student.programId, isRequired: true },
    select: { courseId: true, course: { select: { code: true } } },
  });
  const completedCourseIds = await getCompletedCourseIds(studentId);
  const missingRequired = requiredProgramCourses.filter((pc) => !completedCourseIds.has(pc.courseId));

  if (missingRequired.length > 0) {
    return {
      eligible: false,
      reason: `${missingRequired.length} required course(s) not completed (e.g. ${missingRequired[0].course?.code || 'curriculum'})`,
      completedCredits,
      requiredCredits,
      cgpa,
      missingRequiredCount: missingRequired.length,
    };
  }

  if (completedCredits < requiredCredits) {
    return { eligible: false, reason: `Insufficient credits: ${completedCredits}/${requiredCredits}`, completedCredits, requiredCredits, cgpa };
  }
  if (cgpa < minGPA) {
    return { eligible: false, reason: `CGPA ${cgpa.toFixed(2)} below minimum ${minGPA.toFixed(2)}`, completedCredits, requiredCredits, cgpa };
  }
  return { eligible: true, reason: 'All requirements met', completedCredits, requiredCredits, cgpa };
}

/**
 * Graduate a student — sets status=GRADUATED, academicLevel=GRADUATED.
 */
async function graduateStudent(studentId, performedBy) {
  const check = await checkGraduationEligibility(studentId);
  if (!check.eligible) throw new Error(check.reason);

  const student = await prisma.student.update({
    where: { id: studentId },
    data: { status: 'GRADUATED', academicLevel: 'GRADUATED', graduatedAt: new Date() },
    include: { user: { select: { id: true, name: true } } },
  });

  await sendNotification(
    student.user.id,
    'Congratulations — You Have Graduated!',
    `You have successfully completed all requirements for your degree. Your CGPA is ${check.cgpa.toFixed(2)}.`,
    'SUCCESS'
  );

  return { student, ...check };
}

/**
 * Evaluate and promote a student to the next academic year/level.
 * Returns { promoted, reason, newYear, newLevel }
 */
async function progressStudent(studentId, performedBy) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { program: { select: { durationYears: true, totalCredits: true, minGPA: true } } },
  });
  if (!student) throw new Error('Student not found');

  if (student.status === 'GRADUATED') {
    return { promoted: false, reason: 'Student has already graduated' };
  }
  if (['SUSPENDED', 'WITHDRAWN', 'DROPPED'].includes(student.status)) {
    return { promoted: false, reason: `Cannot progress student with status: ${student.status}` };
  }

  const maxYear = student.program?.durationYears ?? 4;
  if (student.currentYear >= maxYear) {
    // Check graduation instead
    const gradCheck = await checkGraduationEligibility(studentId);
    if (gradCheck.eligible) {
      await graduateStudent(studentId, performedBy);
      return { promoted: true, graduated: true, reason: 'Student graduated', newYear: student.currentYear, newLevel: 'GRADUATED' };
    }
    return { promoted: false, reason: `Student is in final year. ${gradCheck.reason}` };
  }

  const minCredits = MIN_CREDITS_TO_PROGRESS[student.currentYear] ?? 24;
  const cgpa = student.cumulativeGPA ?? 0;

  // Count completed credits
  const completedEnrollments = await prisma.sectionEnrollment.findMany({
    where: { studentId, status: 'COMPLETED' },
    include: { section: { include: { course: { select: { credits: true } } } } },
  });
  const completedCredits = completedEnrollments.reduce(
    (s, e) => s + (e.section?.course?.credits ?? 0), 0
  );

  if (completedCredits < minCredits) {
    // Put on probation if GPA is also low
    if (cgpa < MIN_GPA_TO_PROGRESS) {
      await prisma.student.update({ where: { id: studentId }, data: { status: 'PROBATION' } });
    }
    return { promoted: false, reason: `Insufficient credits: ${completedCredits}/${minCredits}`, completedCredits, minCredits, cgpa };
  }

  if (cgpa < MIN_GPA_TO_PROGRESS) {
    await prisma.student.update({ where: { id: studentId }, data: { status: 'PROBATION' } });
    return { promoted: false, reason: `CGPA ${cgpa.toFixed(2)} below minimum ${MIN_GPA_TO_PROGRESS}`, completedCredits, minCredits, cgpa };
  }

  const newYear  = student.currentYear + 1;
  const newLevel = yearToLevel(newYear);

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      currentYear: newYear,
      academicLevel: newLevel,
      status: 'ACTIVE',
      currentSemester: 'FALL',
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await sendNotification(
    updated.user.id,
    `Academic Promotion — ${newLevel}`,
    `Congratulations! You have been promoted to Year ${newYear} (${newLevel}). Your CGPA is ${cgpa.toFixed(2)}.`,
    'SUCCESS'
  );

  return { promoted: true, reason: 'Promotion successful', newYear, newLevel, completedCredits, cgpa };
}

/**
 * Bulk progress all eligible students in a program/department.
 */
async function bulkProgressStudents(filters = {}) {
  const where = { status: { in: ['ACTIVE', 'PROBATION'] }, ...filters };
  const students = await prisma.student.findMany({ where, select: { id: true } });

  const results = [];
  for (const s of students) {
    try {
      const result = await progressStudent(s.id, 'SYSTEM');
      results.push({ studentId: s.id, ...result });
    } catch (e) {
      results.push({ studentId: s.id, promoted: false, reason: e.message });
    }
  }
  return results;
}

module.exports = {
  yearToLevel,
  checkGraduationEligibility,
  graduateStudent,
  progressStudent,
  bulkProgressStudents,
  getCompletedCourseIds,
  YEAR_TO_LEVEL,
  MIN_CREDITS_TO_PROGRESS,
};
