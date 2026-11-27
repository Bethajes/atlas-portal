// backend/src/controllers/course.controller.js
const prisma = require('../services/prisma');

// ─── CREATE COURSE ───────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const {
      code, title, description, credits,
      departmentId, instructorId, semesterId, maxStudents,
    } = req.body;

    if (!code || !title || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'code, title and departmentId are required',
      });
    }

    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Course code ${code} already exists`,
      });
    }

    const course = await prisma.course.create({
      data: {
        id: require('crypto').randomUUID(),
        code,
        title,
        description: description || null,
        credits: credits || 3,
        departmentId,
        instructorId: instructorId || null,
        semesterId: semesterId || null,
        maxStudents: maxStudents || 40,
        updatedAt: new Date(),
      },
      include: {
        department: { select: { name: true } },
        instructor: {
          include: { user: { select: { name: true } } },
        },
        academicSemester: { select: { name: true } },
      },
    });

    return res.status(201).json({ success: true, course });
  } catch (error) {
    console.error('Create course error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL COURSES ─────────────────────────────────────────
const getCourses = async (req, res) => {
  try {
    const { semesterId, departmentId, instructorId } = req.query;

    const where = {};
    if (semesterId) where.semesterId = semesterId;
    if (departmentId) where.departmentId = departmentId;
    if (instructorId) where.instructorId = instructorId;

    const courses = await prisma.course.findMany({
      where,
      include: {
        department: { select: { name: true, code: true } },
        instructor: {
          include: { user: { select: { name: true } } },
        },
        academicSemester: { select: { name: true, type: true, year: true } },
        _count: { select: { enrollment: true } },
      },
      orderBy: { code: 'asc' },
    });

    const formatted = courses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      credits: c.credits,
      maxStudents: c.maxStudents,
      currentEnrollment: c._count.enrollment,
      department: c.department?.name,
      instructor: c.instructor?.user?.name ?? 'Unassigned',
      semester: c.academicSemester?.name ?? 'Unscheduled',
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get courses error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SINGLE COURSE ───────────────────────────────────────
const getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: { select: { name: true } },
        instructor: {
          include: { user: { select: { name: true, institutionalEmail: true } } },
        },
        academicSemester: { select: { name: true } },
        enrollment: {
          where: { status: { in: ['ENROLLED', 'COMPLETED'] } },
          include: {
            student: {
              include: {
                user: { select: { name: true, institutionalEmail: true } },
              },
            },
          },
        },
        assignment: {
          select: { id: true, title: true, dueDate: true, totalPoints: true },
          orderBy: { dueDate: 'asc' },
        },
        material: {
          select: { id: true, title: true, fileUrl: true, fileType: true, uploadedAt: true },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error('Get course error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE COURSE ───────────────────────────────────────────
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, credits, instructorId, semesterId, maxStudents } = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: {
        title: title || undefined,
        description: description || undefined,
        credits: credits || undefined,
        instructorId: instructorId || undefined,
        semesterId: semesterId || undefined,
        maxStudents: maxStudents || undefined,
      },
    });

    return res.status(200).json({ success: true, course });
  } catch (error) {
    console.error('Update course error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ENROLL STUDENT ──────────────────────────────────────────
const enrollStudent = async (req, res) => {
  try {
    const { studentUserId, courseId, semesterId } = req.body;

    if (!studentUserId || !courseId || !semesterId) {
      return res.status(400).json({
        success: false,
        message: 'studentUserId, courseId and semesterId are required',
      });
    }

    const student = await prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (course.currentEnrollment >= course.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Course is full — maximum enrollment reached',
      });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId_semesterId: {
          studentId: student.id,
          courseId,
          semesterId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course',
      });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        id: require('crypto').randomUUID(),
        studentId: student.id,
        courseId,
        semesterId,
        status: 'ENROLLED',
      },
    });

    await prisma.course.update({
      where: { id: courseId },
      data: { currentEnrollment: { increment: 1 } },
    });

    return res.status(201).json({ success: true, enrollment });
  } catch (error) {
    console.error('Enroll student error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY COURSES (student) ────────────────────────────────
const getMyCourses = async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        student: { userId: req.user.id },
        status: { in: ['ENROLLED', 'IN_PROGRESS'] },
      },
      include: {
        course: {
          include: {
            instructor: {
              include: {
                user: { select: { name: true } },
              },
            },
            academicSemester: { select: { name: true } },
            _count: {
              select: {
                assignment: true,
                material: true,
              },
            },
          },
        },
      },
    });

    const courses = enrollments.map((e) => ({
      enrollmentId: e.id,
      courseId: e.course.id,
      code: e.course.code,
      title: e.course.title,
      credits: e.course.credits,
      instructor: e.course.instructor?.user?.name ?? 'Unassigned',
      semester: e.course.academicSemester?.name ?? '—',
      assignments: e.course._count.assignment,
      materials: e.course._count.material,
      status: e.status,
    }));

    return res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error('Get my courses error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET INSTRUCTOR COURSES ──────────────────────────────────
// Instructors are assigned to courses via Section records.
// We gather unique courses from the instructor's sections.
const getInstructorCourses = async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
    });

    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor profile not found' });
    }

    // Fetch sections taught by this instructor, including course details
    const sections = await prisma.section.findMany({
      where: { instructorId: instructor.id },
      include: {
        course: {
          include: {
            academicSemester: { select: { name: true } },
            department: { select: { name: true } },
            _count: { select: { enrollment: true, assignment: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ course: { code: 'asc' } }, { name: 'asc' }],
    });

    // Deduplicate by courseId but keep section info
    const courseMap = new Map();
    for (const sec of sections) {
      const c = sec.course;
      if (!courseMap.has(c.id)) {
        courseMap.set(c.id, {
          id: c.id,
          code: c.code,
          title: c.title,
          credits: c.credits,
          department: c.department?.name,
          semester: c.academicSemester?.name ?? '—',
          assignments: c._count.assignment,
          enrolledCount: 0,
          sections: [],
        });
      }
      const entry = courseMap.get(c.id);
      entry.enrolledCount += sec._count.enrollments;
      entry.sections.push({
        id: sec.id,
        name: sec.name,
        sectionCode: sec.sectionCode,
        enrolledCount: sec._count.enrollments,
      });
    }

    const courses = Array.from(courseMap.values());
    return res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error('Get instructor courses error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  enrollStudent,
  getMyCourses,
  getInstructorCourses,
};