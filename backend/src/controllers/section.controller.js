const prisma = require('../services/prisma');
const crypto = require('crypto');
const { recalculateStudentGPA, GRADE_POINTS } = require('../utils/gpa');

// ─── SCHEDULE CONFLICT DETECTION ──────────────────────────────
const checkScheduleConflicts = async (instructorId, schedules, excludeSectionId = null, semesterId = null) => {
  if (!instructorId || !schedules || schedules.length === 0) return [];

  const conflicts = [];

  for (const schedule of schedules) {
    const { dayOfWeek, startTime, endTime } = schedule;

    // Check instructor conflicts
    const instructorConflicts = await prisma.sectionSchedule.findMany({
      where: {
        section: {
          instructorId,
          semesterId: semesterId || undefined,
          id: excludeSectionId ? { not: excludeSectionId } : undefined,
        },
        dayOfWeek,
        OR: [
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          { startTime: { lt: endTime }, endTime: { gte: endTime } },
          { startTime: { gte: startTime }, endTime: { lte: endTime } },
        ],
      },
      include: {
        section: {
          include: {
            course: { select: { code: true, title: true } },
          },
        },
      },
    });

    if (instructorConflicts.length > 0) {
      conflicts.push({
        type: 'INSTRUCTOR_CONFLICT',
        schedule,
        conflictingSections: instructorConflicts.map(c => ({
          sectionCode: c.section.sectionCode,
          courseTitle: c.section.course.title,
          dayOfWeek: c.dayOfWeek,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      });
    }
  }

  return conflicts;
};

// ─── SMART STUDENT ASSIGNMENT ──────────────────────────────────
const smartAssignStudents = async (sectionId, criteria = {}) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: true, _count: { select: { enrollments: true } } },
  });

  if (!section) throw new Error('Section not found');

  const availableSlots = section.maxStudents - section._count.enrollments;
  if (availableSlots <= 0) return { assigned: [], message: 'Section is full' };

  // Build student query based on criteria
  const where = {
    enrollments: {
      none: {
        section: {
          courseId: section.courseId,
          semesterId: section.semesterId,
        },
      },
    },
  };

  if (criteria.departmentId) where.departmentId = criteria.departmentId;
  if (criteria.programId) where.programId = criteria.programId;
  if (criteria.minGPA) where.cumulativeGPA = { gte: criteria.minGPA };
  if (criteria.maxGPA) where.cumulativeGPA = { ...where.cumulativeGPA, lte: criteria.maxGPA };

  const students = await prisma.student.findMany({
    where,
    include: {
      user: { select: { name: true, institutionalEmail: true } },
      department: { select: { name: true } },
      program: { select: { name: true } },
    },
    orderBy: [
      { cumulativeGPA: 'desc' }, // Prioritize higher GPA
      { user: { name: 'asc' } },
    ],
    take: availableSlots,
  });

  // Assign students
  const assignments = [];
  for (const student of students) {
    const enrollment = await prisma.sectionEnrollment.create({
      data: {
        id: crypto.randomUUID(),
        studentId: student.id,
        sectionId,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
    });
    assignments.push(enrollment);
  }

  return {
    assigned: assignments,
    message: `Assigned ${assignments.length} students to section`,
  };
};

// ─── CREATE SECTION ──────────────────────────────────────────
const createSection = async (req, res) => {
  try {
    const { courseId, name, instructorId, semesterId, departmentId, maxStudents, roomNumber, schedules } = req.body;

    if (!courseId || !name) {
      return res.status(400).json({ success: false, message: 'courseId and name are required' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({ where: { id: instructorId } });
      if (!instructor) return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    // Auto-generate section code
    const sectionCode = `${course.code}-${name}`;

    // Check for duplicate section code
    const existingCode = await prisma.section.findUnique({
      where: { sectionCode },
    });
    if (existingCode) {
      return res.status(400).json({ success: false, message: `Section code "${sectionCode}" already exists` });
    }

    const existing = await prisma.section.findFirst({
      where: { courseId, name, semesterId: semesterId || null },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: `Section "${name}" already exists for this course` });
    }

    // Validate schedules for conflicts if provided
    if (schedules && schedules.length > 0) {
      const conflicts = await checkScheduleConflicts(instructorId, schedules, null, semesterId);
      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Schedule conflicts detected',
          conflicts
        });
      }
    }

    const section = await prisma.section.create({
      data: {
        id: crypto.randomUUID(),
        courseId,
        name,
        sectionCode,
        instructorId: instructorId || null,
        semesterId: semesterId || null,
        departmentId: departmentId || null,
        maxStudents: maxStudents || 40,
        roomNumber: roomNumber || null,
        updatedAt: new Date(),
        schedules: schedules ? {
          create: schedules.map(s => ({
            id: crypto.randomUUID(),
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        } : undefined,
      },
      include: {
        course: { select: { code: true, title: true } },
        instructor: { include: { user: { select: { name: true } } } },
        department: { select: { name: true } },
        schedules: true,
        _count: { select: { enrollments: true } },
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
    const { courseId, semesterId, instructorId, departmentId, search } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;
    if (semesterId) where.semesterId = semesterId;
    if (instructorId) where.instructorId = instructorId;
    if (departmentId) where.departmentId = departmentId;

    // Search functionality
    if (search) {
      where.OR = [
        { sectionCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { course: { code: { contains: search, mode: 'insensitive' } } },
        { course: { title: { contains: search, mode: 'insensitive' } } },
        { instructor: { user: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const sections = await prisma.section.findMany({
      where,
      include: {
        course: { select: { id: true, code: true, title: true, credits: true } },
        instructor: { include: { user: { select: { name: true } } } },
        department: { select: { id: true, name: true } },
        schedules: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ course: { code: 'asc' } }, { name: 'asc' }],
    });

    const data = sections.map((s) => ({
      id: s.id,
      name: s.name,
      sectionCode: s.sectionCode,
      courseId: s.courseId,
      courseCode: s.course.code,
      courseTitle: s.course.title,
      credits: s.course.credits,
      instructor: s.instructor?.user?.name ?? 'Unassigned',
      instructorId: s.instructorId,
      department: s.department?.name ?? null,
      departmentId: s.departmentId,
      semesterId: s.semesterId,
      maxStudents: s.maxStudents,
      roomNumber: s.roomNumber,
      enrolledCount: s._count.enrollments,
      capacity: `${s._count.enrollments}/${s.maxStudents}`,
      utilization: Math.round((s._count.enrollments / s.maxStudents) * 100),
      schedules: s.schedules,
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

// ─── SMART ASSIGN STUDENTS ────────────────────────────────────
const smartAssign = async (req, res) => {
  try {
    const { id } = req.params;
    const { criteria } = req.body;

    const result = await smartAssignStudents(id, criteria || {});
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Smart assign error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── BULK ASSIGN STUDENTS ──────────────────────────────────────
const bulkAssignStudents = async (req, res) => {
  try {
    const { assignments } = req.body; // [{ studentId, sectionId }, ...]

    const results = [];
    for (const assignment of assignments) {
      try {
        const enrollment = await prisma.sectionEnrollment.create({
          data: {
            id: crypto.randomUUID(),
            studentId: assignment.studentId,
            sectionId: assignment.sectionId,
          },
          include: {
            student: { include: { user: { select: { name: true } } } },
            section: { include: { course: { select: { code: true } } } },
          },
        });
        results.push({ success: true, data: enrollment });
      } catch (error) {
        results.push({ success: false, error: error.message, assignment });
      }
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Bulk assign error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SECTION SUGGESTIONS FOR STUDENT ──────────────────────
const getSectionSuggestions = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;

    const section = await prisma.section.findUnique({
      where: { id },
      include: { course: true, department: true },
    });

    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { department: true, program: true },
    });

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Calculate match score based on department, program, etc.
    let score = 0;
    if (section.departmentId === student.departmentId) score += 30;
    if (section.course.departmentId === student.departmentId) score += 20;
    // Add more scoring logic as needed

    const suggestions = {
      sectionId: id,
      matchScore: score,
      reasons: [],
    };

    if (section.departmentId === student.departmentId) {
      suggestions.reasons.push('Same department');
    }

    return res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VALIDATE SECTION CONFIGURATION ───────────────────────────
const validateSection = async (req, res) => {
  try {
    const { instructorId, schedules, semesterId, excludeSectionId } = req.body;

    const conflicts = await checkScheduleConflicts(instructorId, schedules, excludeSectionId, semesterId);

    return res.status(200).json({
      success: true,
      data: {
        isValid: conflicts.length === 0,
        conflicts,
      },
    });
  } catch (error) {
    console.error('Validate section error:', error.message);
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
  smartAssign,
  bulkAssignStudents,
  getSectionSuggestions,
  validateSection,
};
