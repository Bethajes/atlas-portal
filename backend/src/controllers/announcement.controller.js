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
        Enrollment: {
          where: { status: 'ENROLLED' },
          select: { courseId: true },
        },
      },
    });

    const courseIds = student?.Enrollment.map(e => e.courseId) || [];

    // Get global announcements and course-specific announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { courseId: { in: courseIds } },
        ],
      },
      include: {
        User: {
          select: { name: true, role: true },
        },
        Course: {
          select: { code: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
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
        User: { select: { name: true } },
        Course: { select: { code: true, title: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating announcement',
    });
  }
};

module.exports = {
  getStudentAnnouncements,
  createAnnouncement,
};