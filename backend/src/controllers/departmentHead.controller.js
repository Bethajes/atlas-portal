const prisma = require('../services/prisma');

// Get department info for the logged-in department head
const getMyDepartment = async (req, res) => {
  try {
    // First get the instructor
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
    });

    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    // Get the department they head
    const department = await prisma.department.findFirst({
      where: { headId: instructor.id },
      include: {
        programs: true,
        instructors: {
          include: { user: { select: { name: true, institutionalEmail: true } } }
        },
        courses: {
          include: { 
            _count: { select: { enrollment: true } },
            academicSemester: true,
          } 
        },
        students: { 
          include: { user: { select: { name: true } } } 
        },
      },
    });

    if (!department) {
      return res.status(403).json({ success: false, message: 'Not a department head' });
    }

    // Format response
    const formatted = {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      programs: department.programs,
      instructors: department.instructors,
      courses: department.courses,
      students: department.students,
    };

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get instructors in department
const getDepartmentInstructors = async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
    });

    if (!instructor) {
      return res.status(403).json({ success: false, message: 'Instructor profile not found' });
    }

    const department = await prisma.department.findFirst({
      where: { headId: instructor.id },
    });

    if (!department) {
      return res.status(403).json({ success: false, message: 'Not a department head' });
    }

    const instructors = await prisma.instructor.findMany({
      where: { departmentId: department.id },
      include: { user: { select: { name: true, institutionalEmail: true } } },
    });

    res.status(200).json({ success: true, data: instructors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get courses in department
const getDepartmentCourses = async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
    });

    if (!instructor) {
      return res.status(403).json({ success: false, message: 'Instructor profile not found' });
    }

    const department = await prisma.department.findFirst({
      where: { headId: instructor.id },
    });

    if (!department) {
      return res.status(403).json({ success: false, message: 'Not a department head' });
    }

    const courses = await prisma.course.findMany({
      where: { departmentId: department.id },
      include: { 
        academicSemester: true, 
        instructor: { include: { user: { select: { name: true } } } },
        _count: { select: { enrollment: true } },
      },
    });

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign instructor to course
const assignInstructorToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { instructorId } = req.body;

    const deptHead = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
    });

    if (!deptHead) {
      return res.status(403).json({ success: false, message: 'Instructor profile not found' });
    }

    const department = await prisma.department.findFirst({
      where: { headId: deptHead.id },
    });

    if (!department) {
      return res.status(403).json({ success: false, message: 'Not a department head' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (course.departmentId !== department.id) {
      return res.status(403).json({ success: false, message: 'Course not in your department' });
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { instructorId },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get unassigned courses
const getUnassignedCourses = async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
    });

    if (!instructor) {
      return res.status(403).json({ success: false, message: 'Instructor profile not found' });
    }

    const department = await prisma.department.findFirst({
      where: { headId: instructor.id },
    });

    if (!department) {
      return res.status(403).json({ success: false, message: 'Not a department head' });
    }

    const courses = await prisma.course.findMany({
      where: {
        departmentId: department.id,
        instructorId: null,
      },
      include: { academicSemester: true },
    });

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get instructor workload
const getInstructorWorkload = async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id },
    });

    if (!instructor) {
      return res.status(403).json({ success: false, message: 'Instructor profile not found' });
    }

    const department = await prisma.department.findFirst({
      where: { headId: instructor.id },
    });

    if (!department) {
      return res.status(403).json({ success: false, message: 'Not a department head' });
    }

    const courses = await prisma.course.findMany({
      where: { departmentId: department.id },
      include: {
        instructor: { include: { user: { select: { name: true } } } },
        _count: { select: { enrollment: true } },
      },
    });

    const workload = {};
    courses.forEach(course => {
      const instId = course.instructorId || 'unassigned';
      if (!workload[instId]) {
        workload[instId] = {
          instructor: instId === 'unassigned' ? 'Unassigned' : course.instructor?.user?.name || 'Unknown',
          courses: [],
          totalCredits: 0,
          totalStudents: 0,
        };
      }
      workload[instId].courses.push(course.code);
      workload[instId].totalCredits += course.credits;
      workload[instId].totalStudents += course._count.enrollment;
    });

    res.status(200).json({ success: true, data: Object.values(workload) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Promote to department head
const promoteToDepartmentHead = async (req, res) => {
  try {
    const { instructorId } = req.params;
    
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    await prisma.department.update({
      where: { id: instructor.departmentId },
      data: { headId: instructor.id },
    });

    res.status(200).json({ success: true, message: 'Promoted to department head' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyDepartment,
  getDepartmentInstructors,
  getDepartmentCourses,
  assignInstructorToCourse,
  getUnassignedCourses,
  getInstructorWorkload,
  promoteToDepartmentHead,
};
