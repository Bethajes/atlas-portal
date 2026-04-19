const crypto = require('crypto');
const prisma = require('../services/prisma');
const { logAudit } = require('../utils/audit');

const normalizeProgramType = (value) => {
  const type = String(value || 'DECLARED').toUpperCase();
  return type === 'UNDECLARED' ? 'UNDECLARED' : 'DECLARED';
};

const getGeneralStudiesDepartment = async () => {
  let department = await prisma.department.findFirst({
    where: {
      isDeleted: false,
      OR: [{ code: 'GEN' }, { name: { equals: 'General Studies', mode: 'insensitive' } }],
    },
  });

  if (!department) {
    department = await prisma.department.create({
      data: {
        id: crypto.randomUUID(),
        name: 'General Studies',
        code: 'GEN',
        description: 'Default department for undeclared programs',
        updatedAt: new Date(),
      },
    });
  }

  return department;
};

const createDepartment = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const code = String(req.body.code || '').trim().toUpperCase();
    const description = req.body.description?.trim() || null;
    const foundedYear = req.body.foundedYear ? Number(req.body.foundedYear) : null;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const existingByName = await prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, isDeleted: false },
    });
    if (existingByName) {
      return res.status(400).json({ success: false, message: 'Department name already exists' });
    }

    const finalCode = code || `${name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'DEP'}${Math.floor(Math.random() * 90 + 10)}`;
    const existingByCode = await prisma.department.findUnique({ where: { code: finalCode } });
    if (existingByCode && !existingByCode.isDeleted) {
      return res.status(400).json({ success: false, message: 'Department code already exists' });
    }

    const department = await prisma.department.create({
      data: {
        id: crypto.randomUUID(),
        name,
        code: finalCode,
        description,
        foundedYear,
        updatedAt: new Date(),
      },
    });

    await logAudit(req.user.id, 'CREATE', 'Department', department.name, { id: department.id });
    return res.status(201).json({ success: true, data: department });
  } catch (error) {
    console.error('Admin create department error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDepartments = async (_req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isDeleted: false },
      include: {
        programs: { where: { isDeleted: false }, select: { id: true } },
        _count: { select: { programs: true, students: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ success: true, data: departments });
  } catch (error) {
    console.error('Admin get departments error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDeletedDepartments = async (_req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isDeleted: true },
      orderBy: { updatedAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: departments });
  } catch (error) {
    console.error('Admin get deleted departments error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const restoreDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await prisma.department.update({
      where: { id },
      data: { isDeleted: false, updatedAt: new Date() },
    });
    await logAudit(req.user.id, 'UPDATE', 'Department', department.name, { id, restored: true });
    return res.status(200).json({ success: true, data: department });
  } catch (error) {
    console.error('Admin restore department error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body.name ? String(req.body.name).trim() : undefined;
    const code = req.body.code ? String(req.body.code).trim().toUpperCase() : undefined;
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : undefined;
    const foundedYear = req.body.foundedYear ? Number(req.body.foundedYear) : undefined;

    if (name) {
      const duplicate = await prisma.department.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
          isDeleted: false,
        },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Department name already exists' });
      }
    }

    if (code) {
      const codeDup = await prisma.department.findFirst({
        where: { id: { not: id }, code, isDeleted: false },
      });
      if (codeDup) {
        return res.status(400).json({ success: false, message: 'Department code already exists' });
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(foundedYear !== undefined && { foundedYear }),
        updatedAt: new Date(),
      },
    });

    await logAudit(req.user.id, 'UPDATE', 'Department', department.name, { id });
    return res.status(200).json({ success: true, data: department });
  } catch (error) {
    console.error('Admin update department error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const activePrograms = await prisma.program.count({
      where: { departmentId: id, isDeleted: false },
    });
    if (activePrograms > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with active programs',
      });
    }

    const [studentCount, instructorCount, courseCount] = await Promise.all([
      prisma.student.count({ where: { departmentId: id } }),
      prisma.instructor.count({ where: { departmentId: id } }),
      prisma.course.count({ where: { departmentId: id } }),
    ]);

    if (studentCount || instructorCount || courseCount) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with linked students, instructors, or courses',
      });
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    await prisma.department.update({
      where: { id },
      data: { isDeleted: true, updatedAt: new Date() },
    });
    await logAudit(req.user.id, 'DELETE', 'Department', existing?.name || id, { id });
    return res.status(200).json({ success: true, message: 'Department archived' });
  } catch (error) {
    console.error('Admin delete department error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createProgram = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    let code = String(req.body.code || '').trim().toUpperCase();
    const typeInput = String(req.body.type || '').toUpperCase();
    const type = normalizeProgramType(typeInput || 'DECLARED');
    const rawDepartmentId = req.body.departmentId || null;
    const durationYears = Number(req.body.durationYears ?? req.body.duration ?? 4);
    const totalCredits = Number(req.body.totalCredits ?? durationYears * 30);
    const degreeLevel = req.body.degreeLevel || 'BACHELOR';
    const description = req.body.description?.trim() || null;

    if (!name || !typeInput) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name and type' });
    }
    if (!['DECLARED', 'UNDECLARED'].includes(typeInput)) {
      return res.status(400).json({ success: false, error: 'Invalid type. Use DECLARED or UNDECLARED' });
    }
    if (Number.isNaN(durationYears) || durationYears <= 0) {
      return res.status(400).json({ success: false, error: 'duration must be a positive number' });
    }
    if (Number.isNaN(totalCredits) || totalCredits <= 0) {
      return res.status(400).json({ success: false, error: 'totalCredits must be a positive number' });
    }

    let departmentId = rawDepartmentId;
    if (type === 'DECLARED' && !departmentId) {
      return res.status(400).json({ success: false, error: 'Department required for declared program' });
    }
    if (type === 'UNDECLARED' && !departmentId) {
      const generalStudies = await getGeneralStudiesDepartment();
      departmentId = generalStudies.id;
    }

    if (code) {
      const dup = await prisma.program.findFirst({
        where: { code, isDeleted: false },
      });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Program code already exists' });
      }
    } else {
      code = `${name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'PRG'}${Math.floor(Math.random() * 90 + 10)}`;
      let tries = 0;
      while (tries < 8) {
        const exists = await prisma.program.findFirst({ where: { code, isDeleted: false } });
        if (!exists) break;
        code = `${name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'PRG'}${Math.floor(Math.random() * 900 + 100)}`;
        tries += 1;
      }
    }

    const program = await prisma.program.create({
      data: {
        id: crypto.randomUUID(),
        name,
        code,
        type,
        departmentId: departmentId || null,
        durationYears,
        totalCredits,
        degreeLevel,
        description,
        updatedAt: new Date(),
      },
      include: { department: { select: { id: true, name: true, code: true } } },
    });

    await logAudit(req.user.id, 'CREATE', 'Program', program.name, { id: program.id, code: program.code });
    return res.status(201).json({ success: true, data: program });
  } catch (error) {
    console.error('PROGRAM CREATE ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getPrograms = async (req, res) => {
  try {
    const { departmentId, type } = req.query;
    const where = {
      isDeleted: false,
      ...(departmentId ? { departmentId } : {}),
      ...(type ? { type: normalizeProgramType(type) } : {}),
    };

    const programs = await prisma.program.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { student: true, programCourse: true } },
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    });

    return res.status(200).json({ success: true, data: programs });
  } catch (error) {
    console.error('Admin get programs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDeletedPrograms = async (_req, res) => {
  try {
    const programs = await prisma.program.findMany({
      where: { isDeleted: true },
      include: { department: { select: { name: true, code: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: programs });
  } catch (error) {
    console.error('Admin get deleted programs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const restoreProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const program = await prisma.program.update({
      where: { id },
      data: { isDeleted: false, updatedAt: new Date() },
    });
    await logAudit(req.user.id, 'UPDATE', 'Program', program.name, { id, restored: true });
    return res.status(200).json({ success: true, data: program });
  } catch (error) {
    console.error('Admin restore program error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.program.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
    const code = req.body.code !== undefined ? String(req.body.code).trim().toUpperCase() : existing.code;
    const type = req.body.type !== undefined ? normalizeProgramType(req.body.type) : existing.type;
    let departmentId = req.body.departmentId !== undefined ? (req.body.departmentId || null) : existing.departmentId;

    if (code !== existing.code) {
      const dup = await prisma.program.findFirst({
        where: { code, isDeleted: false, id: { not: id } },
      });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Program code already exists' });
      }
    }

    if (!name) {
      return res.status(400).json({ success: false, message: 'Program name is required' });
    }
    if (type === 'DECLARED' && !departmentId) {
      return res.status(400).json({ success: false, message: 'Declared program requires a department' });
    }
    if (type === 'UNDECLARED' && !departmentId) {
      const generalStudies = await getGeneralStudiesDepartment();
      departmentId = generalStudies.id;
    }

    const program = await prisma.program.update({
      where: { id },
      data: {
        name,
        code,
        type,
        departmentId: departmentId || null,
        ...(req.body.durationYears !== undefined && { durationYears: Number(req.body.durationYears) }),
        ...(req.body.totalCredits !== undefined && { totalCredits: Number(req.body.totalCredits) }),
        ...(req.body.degreeLevel !== undefined && { degreeLevel: req.body.degreeLevel }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        updatedAt: new Date(),
      },
      include: { department: { select: { id: true, name: true, code: true } } },
    });

    await logAudit(req.user.id, 'UPDATE', 'Program', program.name, { id });
    return res.status(200).json({ success: true, data: program });
  } catch (error) {
    console.error('Admin update program error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const [studentCount, feeCount, programCourseCount, admissionsCount] = await Promise.all([
      prisma.student.count({ where: { programId: id } }),
      prisma.feeStructure.count({ where: { programId: id } }),
      prisma.programCourse.count({ where: { programId: id } }),
      prisma.admissionApplication.count({ where: { programId: id } }),
    ]);

    if (studentCount || feeCount || programCourseCount || admissionsCount) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete program with linked students, curriculum, admissions, or fees',
      });
    }

    const existing = await prisma.program.findUnique({ where: { id } });
    await prisma.program.update({
      where: { id },
      data: { isDeleted: true, updatedAt: new Date() },
    });
    await logAudit(req.user.id, 'DELETE', 'Program', existing?.name || id, { id });
    return res.status(200).json({ success: true, message: 'Program archived' });
  } catch (error) {
    console.error('Admin delete program error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
    const take = Math.min(100, Math.max(1, parseInt(req.query.take, 10) || 20));
    const [total, data] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { User: { select: { name: true, institutionalEmail: true } } },
      }),
    ]);
    return res.status(200).json({ success: true, data, total });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateStudentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { programId, departmentId } = req.body;
    const data = {};
    if (programId) {
      data.programId = programId;
      const prog = await prisma.program.findFirst({ where: { id: programId, isDeleted: false } });
      if (!prog) {
        return res.status(400).json({ success: false, message: 'Program not found' });
      }
      if (prog.departmentId) data.departmentId = prog.departmentId;
    }
    if (departmentId) data.departmentId = departmentId;

    const student = await prisma.student.update({
      where: { id },
      data,
      include: {
        user: { select: { name: true } },
        program: { select: { code: true } },
      },
    });
    await logAudit(req.user.id, 'UPDATE', 'Student', student.studentId, { id, ...data });
    return res.status(200).json({ success: true, data: student });
  } catch (error) {
    console.error('updateStudentAdmin error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteStudentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await prisma.enrollment.count({ where: { studentId: id } });
    if (counts > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove student with enrollments',
      });
    }
    const student = await prisma.student.findUnique({ where: { id }, select: { studentId: true } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    await prisma.student.delete({ where: { id } });
    await logAudit(req.user.id, 'DELETE', 'Student', student.studentId, { id });
    return res.status(200).json({ success: true, message: 'Student removed' });
  } catch (error) {
    console.error('deleteStudentAdmin error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDeletedDepartments,
  restoreDepartment,
  updateDepartment,
  deleteDepartment,
  createProgram,
  getPrograms,
  getDeletedPrograms,
  restoreProgram,
  updateProgram,
  deleteProgram,
  getAuditLogs,
  updateStudentAdmin,
  deleteStudentAdmin,
  getGeneralStudiesDepartment,
};
