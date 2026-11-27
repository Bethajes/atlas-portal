const prisma = require('../services/prisma');

const getStudentDashboard = async (userId) => {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });

  const [
    enrolledCourses,
    pendingAssignments,
    finalGrades,
    recentAnnouncements,
  ] = await Promise.all([
    student
      ? prisma.enrollment.count({
          where: { studentId: student.id, status: 'ENROLLED' },
        })
      : Promise.resolve(0),
    prisma.submission.count({
      where: {
        studentId: userId,
        grade: null,
      },
    }),
    prisma.grade.findMany({
      where: {
        studentId: userId,
        type: 'FINAL',
      },
      select: { score: true },
    }),
    prisma.announcement.findMany({
      where: {
        OR: [
          { isGlobal: true },
          {
            course: {
              enrollment: {
                some: { student: { userId } },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
    }),
  ]);

  const averageGrade = finalGrades.length
    ? finalGrades.reduce((sum, grade) => sum + grade.score, 0) /
      finalGrades.length
    : 0;

  return {
    role: 'STUDENT',
    stats: {
      enrolledCourses,
      pendingAssignments,
      averageGrade: Number(averageGrade.toFixed(2)),
    },
    recentAnnouncements,
  };
};

const getInstructorDashboard = async (userId) => {
  const instructor = await prisma.instructor.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!instructor) {
    return {
      role: 'INSTRUCTOR',
      stats: {
        activeCourses: 0,
        totalStudents: 0,
        pendingGrading: 0,
      },
      courses: [],
    };
  }

  const instructorDbId = instructor.id;

  // Instructors are linked to courses via Section, not Course.instructorId
  const [sections, pendingGrading] = await Promise.all([
    prisma.section.findMany({
      where: { instructorId: instructorDbId },
      include: {
        course: { select: { id: true, code: true, title: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.submission.count({
      where: {
        grade: null,
        assignment: {
          course: {
            sections: { some: { instructorId: instructorDbId } },
          },
        },
      },
    }),
  ]);

  // Deduplicate courses taught via sections
  const courseMap = new Map();
  let totalStudents = 0;
  for (const sec of sections) {
    totalStudents += sec._count.enrollments;
    if (!courseMap.has(sec.course.id)) {
      courseMap.set(sec.course.id, {
        id: sec.course.id,
        code: sec.course.code,
        title: sec.course.title,
        studentsCount: 0,
      });
    }
    courseMap.get(sec.course.id).studentsCount += sec._count.enrollments;
  }

  const courses = Array.from(courseMap.values());

  return {
    role: 'INSTRUCTOR',
    stats: {
      activeCourses: courses.length,
      totalStudents,
      pendingGrading,
    },
    courses,
  };
};

const getAdminDashboard = async () => {
  const [
    totalUsers,
    students,
    instructors,
    registrars,
    activeCourses,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
    prisma.user.count({ where: { role: 'REGISTRAR' } }),
    prisma.course.count(),
  ]);

  return {
    role: 'ADMIN',
    stats: {
      totalUsers,
      students,
      instructors,
      registrars,
      activeCourses,
    },
  };
};

const getRegistrarDashboard = async () => {
  const [
    totalStudents,
    pendingRegistrations,
    pendingApplications,
    paymentsAgg,
    activeSemester,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.semesterRegistration.count({ where: { status: 'SUBMITTED' } }),
    prisma.admissionApplication.count({ where: { status: 'SUBMITTED' } }),
    prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    }),
    prisma.academicSemester.findFirst({ where: { isActive: true } }),
  ]);

  return {
    role: 'REGISTRAR',
    stats: {
      totalStudents,
      pendingRegistrations,
      pendingApplications,
      paymentsThisMonth: paymentsAgg._sum.amount || 0,
      activeSemester: activeSemester?.name || 'No active semester',
    },
  };
};

const getMyDashboard = async (req, res) => {
  try {
    let data;
    if (req.user.role === 'STUDENT') {
      data = await getStudentDashboard(req.user.id);
    } else if (req.user.role === 'INSTRUCTOR') {
      data = await getInstructorDashboard(req.user.id);
    } else if (req.user.role === 'REGISTRAR') {
      data = await getRegistrarDashboard();
    } else {
      data = await getAdminDashboard();
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading dashboard',
    });
  }
};

module.exports = {
  getMyDashboard,
};
