const prisma = require('../services/prisma');

/**
 * @desc    Get announcements for current student
 * @route   GET /api/announcements
 * @access  Private (Student)
 */
const getStudentAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get student's courses
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        enrollment: {
          where: { status: 'ENROLLED' },
          select: { courseId: true },
        },
        sectionEnrollments: {
          where: { status: 'ENROLLED' },
          select: { section: { select: { courseId: true } } },
        },
      },
    });

    const legacyCourseIds = student?.enrollment.map((e) => e.courseId) || [];
    const sectionCourseIds = student?.sectionEnrollments.map((e) => e.section.courseId) || [];
    const courseIds = Array.from(new Set([...legacyCourseIds, ...sectionCourseIds]));

    // Get global announcements and course-specific announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { courseId: { in: courseIds } },
        ],
      },
      include: {
        user: {
          select: { name: true, role: true },
        },
        course: {
          select: { code: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const data = announcements.map((a) => ({ ...a, User: a.user, Course: a.course }));

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching announcements',
    });
  }
};

/**
 * @desc    Create an announcement
 * @route   POST /api/announcements
 * @access  Private (Instructor, Admin, Registrar)
 */
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, courseId, isGlobal, targetRole } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        id: require('crypto').randomUUID(),
        title,
        content,
        courseId: courseId || null,
        isGlobal: isGlobal || false,
        targetRole: targetRole || null,
        authorId: req.user.id,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { name: true } },
        course: { select: { code: true, title: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: { ...announcement, User: announcement.user, Course: announcement.course },
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating announcement',
    });
  }
};

/**
 * @desc    Get announcements relevant to current instructor
 * @route   GET /api/announcements/instructor
 * @access  Private (Instructor)
 */
const getInstructorAnnouncements = async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({ where: { userId: req.user.id } });
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor profile not found' });
    }

    const sections = await prisma.section.findMany({
      where: { instructorId: instructor.id },
      select: { courseId: true },
    });
    const courseIds = Array.from(new Set(sections.map((s) => s.courseId)));

    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { authorId: req.user.id },
          ...(courseIds.length ? [{ courseId: { in: courseIds } }] : []),
        ],
      },
      include: {
        user: { select: { name: true, role: true } },
        course: { select: { code: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const data = announcements.map((a) => ({ ...a, User: a.user, Course: a.course }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Get instructor announcements error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching announcements' });
  }
};

module.exports = {
  getStudentAnnouncements,
  getInstructorAnnouncements,
  createAnnouncement,
};
