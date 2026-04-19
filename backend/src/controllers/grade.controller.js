const prisma = require('../services/prisma');
const crypto = require('crypto');

const getGradePoint = (score) => {
  if (score >= 90) return { gradePoint: 4.0, letterGrade: 'A+' };
  if (score >= 85) return { gradePoint: 4.0, letterGrade: 'A' };
  if (score >= 80) return { gradePoint: 3.75, letterGrade: 'A-' };
  if (score >= 75) return { gradePoint: 3.5, letterGrade: 'B+' };
  if (score >= 70) return { gradePoint: 3.0, letterGrade: 'B' };
  if (score >= 65) return { gradePoint: 2.75, letterGrade: 'B-' };
  if (score >= 60) return { gradePoint: 2.5, letterGrade: 'C+' };
  if (score >= 55) return { gradePoint: 2.0, letterGrade: 'C' };
  if (score >= 50) return { gradePoint: 1.75, letterGrade: 'C-' };
  if (score >= 45) return { gradePoint: 1.5, letterGrade: 'D' };
  return { gradePoint: 0.0, letterGrade: 'F' };
};

const getMyGrades = async (req, res) => {
  try {
    const studentUserId = req.user.id;

    // Get student first
    const student = await prisma.student.findUnique({
      where: { userId: studentUserId },
      select: { id: true, cumulativeGPA: true, totalCredits: true, status: true },
    });

    if (!student) {
      return res.status(200).json({
        success: true,
        cgpa: 0.0,
        totalCredits: 0,
        academicStatus: 'ACTIVE',
        semesters: [],
      });
    }

    // Use lowercase relations
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        course: {
          select: { code: true, title: true, credits: true },
        },
        academicSemester: {
          select: { name: true, type: true, year: true },
        },
      },
      orderBy: [
        { academicSemester: { year: 'desc' } },
        { academicSemester: { type: 'asc' } },
      ],
    });

    // Group by semester
    const bySemester = {};
    for (const e of enrollments) {
      const key = e.academicSemester?.name || 'Unknown Semester';
      if (!bySemester[key]) {
        bySemester[key] = {
          semesterName: key,
          year: e.academicSemester?.year,
          type: e.academicSemester?.type,
          courses: [],
          semesterGPA: null,
        };
      }
      
      const gradeInfo = e.grade ? getGradePoint(e.grade) : { gradePoint: null, letterGrade: null };
      
      bySemester[key].courses.push({
        code: e.course.code,
        title: e.course.title,
        credits: e.course.credits,
        score: e.grade,
        letterGrade: e.letterGrade || gradeInfo.letterGrade,
        gradePoint: gradeInfo.gradePoint,
        status: e.status,
      });
    }

    // Calculate semester GPA
    for (const key of Object.keys(bySemester)) {
      const sem = bySemester[key];
      const graded = sem.courses.filter(
        (c) => c.score !== null && c.status === 'COMPLETED'
      );
      if (graded.length > 0) {
        const totalPoints = graded.reduce(
          (sum, c) => sum + (c.gradePoint || 0) * c.credits, 0
        );
        const totalCredits = graded.reduce((sum, c) => sum + c.credits, 0);
        sem.semesterGPA = totalCredits > 0
          ? Math.round((totalPoints / totalCredits) * 100) / 100
          : 0;
        sem.semesterCredits = totalCredits;
      }
    }

    return res.status(200).json({
      success: true,
      cgpa: student.cumulativeGPA ?? 0.0,
      totalCredits: student.totalCredits ?? 0,
      academicStatus: student.status ?? 'ACTIVE',
      semesters: Object.values(bySemester),
    });
  } catch (error) {
    console.error('Get grades error:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Error: ' + error.message 
    });
  }
};

const enterFinalGrade = async (req, res) => {
  try {
    const { studentUserId, courseId, semesterId, score } = req.body;

    if (!studentUserId || !courseId || !semesterId || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'studentUserId, courseId, semesterId and score are required',
      });
    }

    // Get student
    const student = await prisma.student.findUnique({
      where: { userId: studentUserId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const { gradePoint, letterGrade } = getGradePoint(score);

    // Update enrollment
    const enrollment = await prisma.enrollment.updateMany({
      where: {
        studentId: student.id,
        courseId,
        semesterId,
      },
      data: {
        grade: score,
        letterGrade,
        status: score >= 50 ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
      },
    });

    if (enrollment.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Create grade record
    await prisma.grade.create({
      data: {
        id: crypto.randomUUID(),
        studentId: studentUserId,
        courseId,
        semesterId,
        score,
        maxScore: 100,
        gradePoint,
        letterGrade,
        type: 'FINAL',
        gradedBy: req.user.id,
        gradedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Grade entered successfully',
    });
  } catch (error) {
    console.error('Enter grade error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getCourseGrades = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          include: {
            user: { select: { name: true, institutionalEmail: true } },
          },
        },
        course: { select: { title: true, credits: true } },
      },
    });

    const grades = enrollments.map((e) => ({
      studentId: e.student?.studentId,
      name: e.student?.user?.name,
      email: e.student?.user?.institutionalEmail,
      score: e.grade,
      letterGrade: e.letterGrade,
      status: e.status,
    }));

    return res.status(200).json({ success: true, courseId, grades });
  } catch (error) {
    console.error('Get course grades error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { enterFinalGrade, getMyGrades, getCourseGrades };
