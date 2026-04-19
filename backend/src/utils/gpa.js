/**
 * Grade point map — standard 4.0 scale
 */
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0, 'I': null, 'W': null,
};

function letterToPoints(letter) {
  if (!letter) return null;
  return GRADE_POINTS[letter.toUpperCase()] ?? null;
}

/**
 * Calculate weighted GPA from an array of { letterGrade, credits } objects.
 */
function calculateGPA(enrollments) {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const e of enrollments) {
    const points = letterToPoints(e.letterGrade);
    const credits = Number(e.credits) || 0;
    if (points !== null && credits > 0) {
      totalPoints += points * credits;
      totalCredits += credits;
    }
  }
  if (totalCredits === 0) return 0;
  return parseFloat((totalPoints / totalCredits).toFixed(2));
}

/**
 * Calculate SGPA (current semester only) and CGPA (all completed).
 * Returns { sgpa, cgpa, semesterCredits, totalCredits }
 */
async function calculateStudentGPAs(prisma, studentId, activeSemesterId) {
  const allEnrollments = await prisma.sectionEnrollment.findMany({
    where: { studentId },
    include: {
      section: {
        include: {
          course: { select: { credits: true } },
        },
      },
    },
  });

  const semesterEnrollments = allEnrollments.filter(
    e => e.section?.semesterId === activeSemesterId
  );

  const sgpa = calculateGPA(semesterEnrollments.map(e => ({
    letterGrade: e.letterGrade,
    credits: e.section?.course?.credits ?? 0,
  })));

  const cgpa = calculateGPA(allEnrollments.map(e => ({
    letterGrade: e.letterGrade,
    credits: e.section?.course?.credits ?? 0,
  })));

  const semesterCredits = semesterEnrollments.reduce((s, e) => s + (e.section?.course?.credits ?? 0), 0);
  const totalCredits = allEnrollments
    .filter(e => e.status === 'COMPLETED')
    .reduce((s, e) => s + (e.section?.course?.credits ?? 0), 0);

  return { sgpa, cgpa, semesterCredits, totalCredits };
}

/**
 * Recalculate and persist CGPA for a student.
 */
async function recalculateStudentGPA(prisma, studentId) {
  const enrollments = await prisma.sectionEnrollment.findMany({
    where: { studentId, status: { in: ['COMPLETED', 'ENROLLED'] } },
    include: { section: { include: { course: { select: { credits: true } } } } },
  });
  const gpa = calculateGPA(enrollments.map(e => ({
    letterGrade: e.letterGrade,
    credits: e.section?.course?.credits ?? 0,
  })));
  await prisma.student.update({ where: { id: studentId }, data: { cumulativeGPA: gpa } });
  return gpa;
}

module.exports = { letterToPoints, calculateGPA, calculateStudentGPAs, recalculateStudentGPA, GRADE_POINTS };
