const prisma = require('../services/prisma');
const crypto = require('crypto');
const { getGeneralStudiesDepartment } = require('./adminAcademic.controller');

const makeProgramCodeBase = (departmentCode, programName) => {
  const dept = String(departmentCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'GEN';
  const prog = String(programName || 'PRG')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4) || 'PRG';
  return `${dept}-${prog}`;
};

const uniqueProgramCode = async (tx, departmentCode, programName) => {
  const base = makeProgramCodeBase(departmentCode, programName);
  let code = base;
  let suffix = 1;
  while (await tx.program.findUnique({ where: { code } })) {
    code = `${base}${suffix}`;
    suffix += 1;
  }
  return code;
};

// ========== DEPARTMENTS ==========
const createDepartment = async (req, res) => {
  try {
    const { name, code, description, foundedYear, headId, programs } = req.body;
    const departmentCode = String(code || '').toUpperCase();

    if (!Array.isArray(programs) || programs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one program is required when creating a department',
      });
    }

    const normalizedPrograms = programs
      .map((p) => ({
        name: String(p?.name || '').trim(),
        duration: Number(p?.duration) || 4,
      }))
      .filter((p) => p.name);

    if (normalizedPrograms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Program names are required',
      });
    }

    const seenNames = new Set();
    for (const p of normalizedPrograms) {
      const key = p.name.toLowerCase();
      if (seenNames.has(key)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate program name in request: ${p.name}`,
        });
      }
      seenNames.add(key);
    }

    const result = await prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          id: crypto.randomUUID(),
          name,
          code: departmentCode,
          description,
          foundedYear,
          headId,
          updatedAt: new Date(),
        },
      });

      const createdPrograms = [];
      for (const p of normalizedPrograms) {
        const generatedCode = await uniqueProgramCode(tx, departmentCode, p.name);
        const createdProgram = await tx.program.create({
          data: {
            id: crypto.randomUUID(),
            name: p.name,
            code: generatedCode,
            departmentId: department.id,
            durationYears: p.duration,
            totalCredits: p.duration * 30,
            updatedAt: new Date(),
          },
        });
        createdPrograms.push(createdProgram);
      }

      return { ...department, programs: createdPrograms };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Create department error:', error.message);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isDeleted: false },
      include: { programs: { where: { isDeleted: false } } },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    console.error('Get departments error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: {
        programs: true,
        instructors: { include: { user: true } },
        courses: true,
      },
    });
    if (!department) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    console.error('Get department error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== PROGRAMS ==========
const createProgram = async (req, res) => {
  try {
    const { name, code, departmentId, degreeLevel, durationYears, totalCredits, description } = req.body;
    const type = String(req.body.type || 'DECLARED').toUpperCase() === 'UNDECLARED' ? 'UNDECLARED' : 'DECLARED';
    let resolvedDepartmentId = departmentId || null;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Program name is required' });
    }
    if (type === 'DECLARED' && !resolvedDepartmentId) {
      return res.status(400).json({ success: false, message: 'Declared program requires a department' });
    }
    if (type === 'UNDECLARED' && !resolvedDepartmentId) {
      const generalStudies = await getGeneralStudiesDepartment();
      resolvedDepartmentId = generalStudies.id;
    }

    const program = await prisma.program.create({
      data: {
        id: crypto.randomUUID(),
        name,
        code: String(code || '').toUpperCase(),
        type,
        departmentId: resolvedDepartmentId,
        degreeLevel,
        durationYears,
        totalCredits,
        description,
        updatedAt: new Date(),
      },
    });
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    console.error('Create program error:', error.message);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Program already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPrograms = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = { isDeleted: false, ...(departmentId ? { departmentId } : {}) };
    const programs = await prisma.program.findMany({
      where,
      include: { department: { select: { name: true, code: true } } },
      orderBy: { name: 'asc' },
    });
    // Add manual counts
    const data = await Promise.all(programs.map(async (p) => {
      const studentCount = await prisma.student.count({ where: { programId: p.id } });
      const courseCount = await prisma.programCourse.count({ where: { programId: p.id } });
      return { ...p, studentCount, requiredCourseCount: courseCount };
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get programs error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProgramCurriculum = async (req, res) => {
  try {
    const courses = await prisma.programCourse.findMany({
      where: { programId: req.params.id },
      include: { course: true },
      orderBy: [{ year: 'asc' }, { semester: 'asc' }],
    });
    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    console.error('Get curriculum error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STUDENTS ==========
const createStudentProfile = async (req, res) => {
  try {
    const { userId, studentId, enrollmentYear, programId, departmentId, currentYear, currentSemester } = req.body;
    const existing = await prisma.student.findUnique({ where: { studentId } });
    if (existing) return res.status(400).json({ success: false, message: 'Student ID exists' });

    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: { id: true, type: true, departmentId: true },
    });
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    let resolvedDepartmentId = departmentId || program.departmentId || null;
    if (program.type === 'DECLARED' && !resolvedDepartmentId) {
      return res.status(400).json({ success: false, message: 'Declared program requires a department' });
    }
    if (program.type === 'UNDECLARED' && !resolvedDepartmentId) {
      const generalStudies = await getGeneralStudiesDepartment();
      resolvedDepartmentId = generalStudies.id;
    }

    const student = await prisma.student.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        studentId,
        enrollmentYear: enrollmentYear || new Date().getFullYear(),
        programId,
        departmentId: resolvedDepartmentId,
        currentYear: currentYear || 1,
        currentSemester: currentSemester || 'FALL',
        updatedAt: new Date(),
      },
      include: { user: true, program: true, department: true },
    });
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    console.error('Create student error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStudentProfile = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true, program: true, department: true, enrollment: { include: { course: true } } },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    console.error('Get student error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
const getStudents = async (req, res) => {
  try {
    const { departmentId, programId, year, status, search } = req.query;
    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (programId) where.programId = programId;
    if (year) where.currentYear = parseInt(year);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { studentId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true, institutionalEmail: true } },
        program: { select: { name: true, code: true } },
        department: { select: { name: true } },
        enrollment: { where: { status: 'ENROLLED' } },
      },
      orderBy: { studentId: 'asc' },
      take: 100,
    });

    const data = students.map(s => ({
      ...s,
      user: s.user,
      enrollmentCount: s.enrollment?.length || 0,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== INSTRUCTORS ==========
const createInstructorProfile = async (req, res) => {
  try {
    const { userId, employeeId, departmentId, title, specialization, highestDegree } = req.body;
    const existing = await prisma.instructor.findUnique({ where: { employeeId } });
    if (existing) return res.status(400).json({ success: false, message: 'Employee ID exists' });

    const instructor = await prisma.instructor.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        employeeId,
        departmentId,
        title,
        specialization,
        highestDegree,
        updatedAt: new Date(),
      },
      include: { user: true, department: true },
    });
    res.status(201).json({ success: true, data: instructor });
  } catch (error) {
    console.error('Create instructor error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};const getInstructors = async (req, res) => {
  try {
    const instructors = await prisma.instructor.findMany({
      include: {
        user: { select: { name: true, institutionalEmail: true } },
        department: { select: { name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });

    // Map to a cleaner structure
    const data = instructors.map(i => ({
      id: i.id,
      employeeId: i.employeeId,
      title: i.title,
      user: i.user,
      department: i.department,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getInstructorSchedule = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.params.id },
      include: { academicSemester: true, department: true },
    });
    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    console.error('Get schedule error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== SEMESTERS ==========
const createSemester = async (req, res) => {
  try {
    const { name, type, year, startDate, endDate, registrationStart, registrationEnd, dropDeadline, addDeadline } = req.body;

    if (registrationStart && registrationEnd && new Date(registrationStart) >= new Date(registrationEnd)) {
      return res.status(400).json({ success: false, message: 'registrationStart must be before registrationEnd' });
    }
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'startDate must be before endDate' });
    }

    const semester = await prisma.academicSemester.create({
      data: {
        id: crypto.randomUUID(),
        name,
        type,
        year: parseInt(year),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationStart: new Date(registrationStart),
        registrationEnd: new Date(registrationEnd),
        dropDeadline: new Date(dropDeadline),
        addDeadline: new Date(addDeadline),
        updatedAt: new Date(),
      },
    });
    res.status(201).json({ success: true, data: semester });
  } catch (error) {
    console.error('Create semester error:', error.message);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Semester already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveSemester = async (req, res) => {
  try {
    const semester = await prisma.academicSemester.findFirst({ where: { isActive: true } });
    res.status(200).json({ success: true, data: semester });
  } catch (error) {
    console.error('Get active semester error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSemesters = async (req, res) => {
  try {
    const semesters = await prisma.academicSemester.findMany({
      orderBy: { year: 'desc' },
    });
    res.status(200).json({ success: true, data: semesters });
  } catch (error) {
    console.error('Get semesters error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  createProgram,
  getPrograms,
  getProgramCurriculum,
  createStudentProfile,
  getStudentProfile,
  getStudents,
  createInstructorProfile,
  getInstructors,
  getInstructorSchedule,
  createSemester,
  getActiveSemester,
  getSemesters,
};