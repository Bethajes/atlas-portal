const prisma = require('../services/prisma');
const crypto = require('crypto');
const { recalculateStudentGPA, GRADE_POINTS } = require('../utils/gpa');

// ─── CREATE SECTION ──────────────────────────────────────────
const createSection = async (req, res) => {
  try {
    const { courseId, name, instructorId, semesterId, maxStudents } = req.body;

    if (!courseId || !name) {
      return res.status(400).json({ success: false, message: 'courseId and name are required' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({ where: { id: instructorId } });
      if (!instructor) return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    const existing = await prisma.section.findFirst({
      where: { courseId, name, semesterId: semesterId || null },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: `Section "${name}" already exists for this course` });
    }

    const section = await prisma.section.create({
      data: {
        id: crypto.randomUUID(),
        courseId,
        name,
        instructorId: instructorId || null,
        semesterId: semesterId || null,
        maxStudents: maxStudents || 40,
        updatedAt: new Date(),
      },
      include: {
        course: { select: { code: true, title: true } },
        instructor: { include: { user: { select: { name: true } } } },
      },
    });

    return res.status(201).json({ success: true, data: section });
  } catch (error) {
    console.error('Create section error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SECTIONS (by course or all) ─────────────────────────
const getSections = async (req, res) => {
  try {
    const { courseId, semesterId, instructorId } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;
    if (semesterId) where.semesterId = semesterId;
    if (instructorId) where.instructorId = instructorId;

    const sections = await prisma.section.findMany({
      where,
      include: {
        course: { select: { id: true, code: true, title: true, credits: true } },
        instructor: { include: { user: { select: { name: true } } } },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ course: { code: 'asc' } }, { name: 'asc' }],
    });

    const data = sections.map((s) => ({
      id: s.id,
      name: s.name,
      courseId: s.courseId,
      courseCode: s.course.code,
      courseTitle: s.course.title,
      credits: s.course.credits,
      instructor: s.instructor?.user?.name ?? 'Unassigned',
      instructorId: s.instructorId,
      semesterId: s.semesterId,
      maxStudents: s.maxStudents,
      enrolledCount: s._count.enrollments,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get sections error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SINGLE SECTION WITH STUDENTS ────────────────────────
const getSection = async (req, res) => {
  try {
    const { id } = req.params;

    // Instructors can only view their own sections
    if (req.user.role === 'INSTRUCTOR') {
      const instructor = await prisma.instructor.findUnique({ where: { userId: req.user.id } });
      const section = await prisma.section.findFirst({ where: { id, instructorId: instructor?.id } });
      if (!section) return res.status(403).json({ success: false, message: 'Not authorized for this section' });
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, code: true, title: true, credits: true } },
        instructor: { include: { user: { select: { name: true, institutionalEmail: true } } } },
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, institutionalEmail: true } },
                department: { select: { id: true, name: true } },
                program: { select: { id: true, name: true } },
                studentPayments: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: { status: true, isPaid: true, amount: true, createdAt: true },
                },
              },
            },
          },
        },
      },
    });

    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    return res.status(200).json({ success: true, data: section });
  } catch (error) {
    console.error('Get section error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE SECTION ───────────────────────────────────────────
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { instructorId, maxStudents, name } = req.body;

    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({ where: { id: instructorId } });
      if (!instructor) return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    const section = await prisma.section.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(instructorId !== undefined && { instructorId: instructorId || null }),
        ...(maxStudents !== undefined && { maxStudents }),
        updatedAt: new Date(),
      },
      include: {
        course: { select: { code: true, title: true } },
        instructor: { include: { user: { select: { name: true } } } },
      },
    });

    return res.status(200).json({ success: true, data: section });
  } catch (error) {
    console.error('Update section error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE SECTION ───────────────────────────────────────────
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await prisma.sectionEnrollment.count({ where: { sectionId: id } });
    if (count > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete section with enrolled students' });
    }
    await prisma.section.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Section deleted' });
  } catch (error) {
    console.error('Delete section error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ENROLL STUDENT IN SECTION ────────────────────────────────
const enrollInSection = async (req, res) => {
  try {
    const { studentId, sectionId } = req.body;

    if (!studentId || !sectionId) {
      return res.status(400).json({ success: false, message: 'studentId and sectionId are required' });
    }

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    if (section._count.enrollments >= section.maxStudents) {
      return res.status(400).json({ success: false, message: 'Section is full' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const existing = await prisma.sectionEnrollment.findUnique({
      where: { studentId_sectionId: { studentId, sectionId } },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Student already enrolled in this section' });
    }

    const enrollment = await prisma.sectionEnrollment.create({
      data: {
        id: crypto.randomUUID(),
        studentId,
        sectionId,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        section: { include: { course: { select: { code: true, title: true } } } },
      },
    });

    return res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    console.error('Enroll in section error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ASSIGN GRADE IN SECTION ──────────────────────────────────
const assignGrade = async (req, res) => {
  try {
    const { sectionId, studentId } = req.params;
    const { grade, letterGrade } = req.body;

    // Validate letter grade
    const validGrades = Object.keys(GRADE_POINTS);
    if (letterGrade && !validGrades.includes(letterGrade.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid grade. Valid grades: ${validGrades.join(', ')}`,
      });
    }

    // Instructors can only grade their own sections
    if (req.user.role === 'INSTRUCTOR') {
      const instructor = await prisma.instructor.findUnique({ where: { userId: req.user.id } });
      const section = await prisma.section.findFirst({ where: { id: sectionId, instructorId: instructor?.id } });
      if (!section) return res.status(403).json({ success: false, message: 'Not authorized for this section' });
    }

    // Ensure student is enrolled in this section
    const existing = await prisma.sectionEnrollment.findUnique({
      where: { studentId_sectionId: { studentId, sectionId } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Student is not enrolled in this section' });
    }

    const normalizedLetter = letterGrade ? letterGrade.toUpperCase() : undefined;

    const enrollment = await prisma.sectionEnrollment.update({
      where: { studentId_sectionId: { studentId, sectionId } },
      data: {
        grade: grade !== undefined ? parseFloat(grade) : undefined,
        letterGrade: normalizedLetter,
        status: 'COMPLETED',
      },
    });

    // Recalculate and persist GPA
    const newGPA = await recalculateStudentGPA(prisma, studentId);

    return res.status(200).json({
      success: true,
      data: { ...enrollment, newGPA },
      message: `Grade ${normalizedLetter || grade} saved. GPA updated to ${newGPA}`,
    });
  } catch (error) {
    console.error('Assign grade error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY STUDENTS (instructor) ────────────────────────────
const getMyStudents = async (req, res) => {
  try {
    const enrollments = await prisma.sectionEnrollment.findMany({
      where: {
        section: {
          instructor: { userId: req.user.id },
        },
      },
      include: {
        section: {
          include: {
            course: { select: { id: true, code: true, title: true, credits: true } },
          },
        },
        student: {
          include: {
            user: { select: { id: true, name: true, institutionalEmail: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            studentPayments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { status: true, isPaid: true, amount: true, createdAt: true },
            },
          },
        },
      },
      orderBy: [{ section: { course: { code: 'asc' } } }, { section: { name: 'asc' } }, { student: { studentId: 'asc' } }],
    });

    const data = enrollments.map((e) => ({
      enrollmentId: e.id,
      sectionId: e.sectionId,
      sectionName: e.section?.name,
      courseId: e.section?.course?.id,
      courseCode: e.section?.course?.code,
      courseTitle: e.section?.course?.title,
      courseCredits: e.section?.course?.credits,
      status: e.status,
      grade: e.grade,
      letterGrade: e.letterGrade,
      enrolledAt: e.enrolledAt,
      student: {
        id: e.student?.id,
        userId: e.student?.userId,
        name: e.student?.user?.name,
        institutionalEmail: e.student?.user?.institutionalEmail,
        studentId: e.student?.studentId,
        cumulativeGPA: e.student?.cumulativeGPA,
        photoUrl: e.student?.photoUrl,
        department: e.student?.department,
        program: e.student?.program,
        latestPayment: e.student?.studentPayments?.[0] || null,
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get my students error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY SECTIONS (instructor) ────────────────────────────
const getMySections = async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({ where: { userId: req.user.id } });
    if (!instructor) return res.status(404).json({ success: false, message: 'Instructor profile not found' });

    const sections = await prisma.section.findMany({
      where: { instructorId: instructor.id },
      include: {
        course: { select: { id: true, code: true, title: true, credits: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ course: { code: 'asc' } }, { name: 'asc' }],
    });

    return res.status(200).json({ success: true, data: sections });
  } catch (error) {
    console.error('Get my sections error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY SECTION ENROLLMENTS (student) ────────────────────
const getMyEnrollments = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const enrollments = await prisma.sectionEnrollment.findMany({
      where: { studentId: student.id },
      include: {
        section: {
          include: {
            course: { select: { id: true, code: true, title: true, credits: true } },
            instructor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    console.error('Get my enrollments error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSection,
  getSections,
  getSection,
  updateSection,
  deleteSection,
  enrollInSection,
  assignGrade,
  getMyStudents,
  getMySections,
  getMyEnrollments,
};
