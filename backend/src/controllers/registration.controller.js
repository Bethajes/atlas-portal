const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const crypto = require('crypto');
const { sendNotification } = require('../services/notification.service');
const {
  getRegistrationState,
  canStudentAttemptRegistration,
} = require('../utils/registrationWindow');

/**
 * @desc    Get curriculum courses for student's current year/semester
 * @route   GET /api/registration/available-courses
 * @access  Private (Student)
 */
const getAvailableCourses = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      program: { select: { id: true, name: true, code: true, durationYears: true, totalCredits: true } },
      department: { select: { name: true, code: true } },
    },
  });

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student profile not found' });
  }

  // Find the active semester (isActive=true) OR the nearest upcoming one
  let activeSemester = await prisma.academicSemester.findFirst({ where: { isActive: true } });
  if (!activeSemester) {
    // Fall back to the next upcoming semester by registrationStart
    activeSemester = await prisma.academicSemester.findFirst({
      where: { registrationStart: { gte: new Date() } },
      orderBy: { registrationStart: 'asc' },
    });
  }

  const regState = getRegistrationState(activeSemester);
  const eligibility = canStudentAttemptRegistration(student);
  const semType  = student.currentSemester;
  const semNumber = semType === 'FALL' ? 1 : 2;

  const programCourses = await prisma.programCourse.findMany({
    where: { programId: student.programId, year: student.currentYear, semester: semNumber },
    include: {
      course: {
        include: {
          instructor: { include: { user: { select: { name: true } } } },
          department: { select: { name: true, code: true } },
          sections: {
            where: activeSemester ? { semesterId: activeSemester.id } : {},
            include: {
              instructor: { include: { user: { select: { name: true } } } },
              _count: { select: { enrollments: true } },
            },
          },
        },
      },
    },
    orderBy: { course: { code: 'asc' } },
  });

  const existingEnrollments = await prisma.sectionEnrollment.findMany({
    where: { studentId: student.id, section: activeSemester ? { semesterId: activeSemester.id } : {} },
    select: { sectionId: true, section: { select: { courseId: true } } },
  });
  const enrolledCourseIds = new Set(existingEnrollments.map(e => e.section.courseId));

  const courses = programCourses.map(pc => ({
    programCourseId: pc.id,
    courseId: pc.course.id,
    code: pc.course.code,
    title: pc.course.title,
    description: pc.course.description,
    credits: pc.course.credits,
    isRequired: pc.isRequired,
    year: pc.year,
    semester: pc.semester,
    department: pc.course.department?.name,
    instructor: pc.course.instructor?.user?.name || pc.course.sections?.[0]?.instructor?.user?.name || 'TBA',
    sections: pc.course.sections.map(s => ({
      id: s.id, name: s.name,
      enrolledCount: s._count.enrollments,
      maxStudents: s.maxStudents,
      instructor: s.instructor?.user?.name || 'TBA',
    })),
    alreadyEnrolled: enrolledCourseIds.has(pc.course.id),
  }));

  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  const windowOpen = regState.state === 'OPEN';
  res.status(200).json({
    success: true,
    data: {
      student: {
        id: student.id,
        studentId: student.studentId,
        currentYear: student.currentYear,
        currentSemester: student.currentSemester,
        academicLevel: student.academicLevel,
        status: student.status,
        program: student.program,
        department: student.department,
      },
      semester: activeSemester,
      registration: regState,
      registrationEligibility: eligibility,
      registrationOpen: windowOpen && eligibility.ok,
      courses,
      totalCredits,
      semesterLabel: `Year ${student.currentYear} — Semester ${semNumber} (${semType})`,
    },
  });
});

/**
 * @desc    Get student's current registration draft
 * @route   GET /api/registration/my-draft
 * @access  Private (Student)
 */
const getMyDraft = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const activeSemester = await prisma.academicSemester.findFirst({
    where: { isActive: true },
  });

  if (!activeSemester) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No active semester registration',
    });
  }

  const draft = await prisma.semesterRegistration.findUnique({
    where: {
      studentId_semesterId: {
        studentId: student.id,
        semesterId: activeSemester.id,
      },
    },
    include: {
      registrationCourse: {
        include: { course: true },
      },
      invoice: true,
    },
  });

  res.status(200).json({
    success: true,
    data: draft,
  });
});

/**
 * @desc    Save or update a registration draft
 * @route   POST /api/registration/draft
 * @access  Private (Student)
 */
const saveDraft = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { courseIds } = req.body;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: { program: true },
  });

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student profile not found' });
  }

  const elig = canStudentAttemptRegistration(student);
  if (!elig.ok) {
    return res.status(403).json({ success: false, message: elig.reason });
  }

  const activeSemester = await prisma.academicSemester.findFirst({
    where: { isActive: true },
  });

  if (!activeSemester) {
    return res.status(400).json({ success: false, message: 'No active semester configured' });
  }

  const regState = getRegistrationState(activeSemester);
  if (regState.state !== 'OPEN') {
    return res.status(403).json({
      success: false,
      message: regState.state === 'UPCOMING' ? regState.message : 'Registration is closed for this semester.',
      registration: regState,
    });
  }

  // Calculate total credits
  const selectedCourses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
  });
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  // Use transaction to update/create draft and courses
  const registration = await prisma.$transaction(async (tx) => {
    // Check for existing registration
    const existing = await tx.semesterRegistration.findUnique({
      where: {
        studentId_semesterId: {
          studentId: student.id,
          semesterId: activeSemester.id,
        },
      },
    });

    if (existing && existing.status !== 'DRAFT') {
      throw new Error(`Cannot update registration with status: ${existing.status}`);
    }

    const reg = await tx.semesterRegistration.upsert({
      where: {
        studentId_semesterId: {
          studentId: student.id,
          semesterId: activeSemester.id,
        },
      },
      update: {
        totalCredits,
        updatedAt: new Date(),
      },
      create: {
        studentId: student.id,
        semesterId: activeSemester.id,
        academicYear: activeSemester.year.toString(),
        totalCredits,
        status: 'DRAFT',
      },
    });

    // Update selected courses
    await tx.registrationCourse.deleteMany({
      where: { registrationId: reg.id },
    });

    await tx.registrationCourse.createMany({
      data: courseIds.map((courseId) => ({
        registrationId: reg.id,
        courseId,
      })),
    });

    return reg;
  });

  res.status(200).json({
    success: true,
    registration,
  });
});

/**
 * @desc    Upload payment proof and submit registration
 * @route   POST /api/registration/:id/receipt
 * @access  Private (Student)
 */
const uploadReceiptAndSubmit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const registration = await prisma.semesterRegistration.findUnique({
    where: { id },
    include: { student: true },
  });

  if (!registration || registration.student.userId !== userId) {
    return res.status(404).json({ success: false, message: 'Registration not found' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a receipt file' });
  }

  const proofUrl = `/uploads/receipts/${req.file.filename}`;

  // Use transaction to create invoice and payment
  await prisma.$transaction(async (tx) => {
    // 1. Create Invoice if not exists
    let invoice = await tx.invoice.findFirst({
      where: {
        studentId: registration.studentId,
        semesterId: registration.semesterId,
      },
    });

    if (!invoice) {
      // Get fee structure
      const feeStructure = await tx.feeStructure.findFirst({
        where: {
          programId: registration.student.programId,
          semesterId: registration.semesterId,
        },
      });

      if (!feeStructure) {
        throw new Error('Fee structure not found for this program and semester');
      }

      invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          studentId: registration.studentId,
          semesterId: registration.semesterId,
          feeStructureId: feeStructure.id,
          totalAmount: feeStructure.totalFee,
          paidAmount: 0,
          dueAmount: feeStructure.totalFee,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
        },
      });
    }

    // 2. Create Payment Proof (store proof URL in notes since schema doesn't have proofUrl field)
    await tx.payment.create({
      data: {
        studentId: registration.studentId,
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        referenceNumber: `PROOF-${Date.now()}`,
        status: 'PENDING',
        notes: `proof:${proofUrl}`,
      },
    });

    // 3. Update Registration status
    await tx.semesterRegistration.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        invoiceId: invoice.id,
      },
    });

    // 4. Create Notification for Registrar
    // (This would normally be a notification model, but for now we'll just log it)
    await tx.auditLog.create({
      data: {
        userId,
        action: 'SUBMIT_REGISTRATION',
        resource: 'SemesterRegistration',
        details: { registrationId: id, proofUrl },
      },
    });
  });

  res.status(200).json({
    success: true,
    message: 'Registration submitted for approval',
  });
});

/**
 * @desc    Confirm registration — auto-enroll student in all curriculum courses for current year/semester
 * @route   POST /api/registration/confirm
 * @access  Private (Student)
 */
const confirmRegistration = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: { program: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const elig = canStudentAttemptRegistration(student);
  if (!elig.ok) {
    return res.status(403).json({ success: false, message: elig.reason });
  }

  const activeSemester = await prisma.academicSemester.findFirst({ where: { isActive: true } });
  if (!activeSemester) {
    return res.status(400).json({ success: false, message: 'No active semester configured' });
  }

  const regState = getRegistrationState(activeSemester);
  if (regState.state !== 'OPEN') {
    return res.status(403).json({
      success: false,
      message: regState.state === 'UPCOMING' ? regState.message : 'Registration is closed for this semester.',
      registration: regState,
    });
  }

  const semNumber = student.currentSemester === 'FALL' ? 1 : 2;

  // Get curriculum courses
  const programCourses = await prisma.programCourse.findMany({
    where: { programId: student.programId, year: student.currentYear, semester: semNumber },
    include: {
      course: {
        include: {
          sections: { where: { semesterId: activeSemester.id }, take: 1 },
        },
      },
    },
  });

  if (programCourses.length === 0) {
    return res.status(400).json({ success: false, message: 'No curriculum courses found for your current year and semester' });
  }

  const totalCredits = programCourses.reduce((s, pc) => s + pc.course.credits, 0);

  const result = await prisma.$transaction(async (tx) => {
    // Upsert SemesterRegistration
    const existing = await tx.semesterRegistration.findUnique({
      where: { studentId_semesterId: { studentId: student.id, semesterId: activeSemester.id } },
    });
    if (existing && existing.status !== 'DRAFT') {
      throw new Error(`Registration already ${existing.status.toLowerCase()}`);
    }

    const reg = await tx.semesterRegistration.upsert({
      where: { studentId_semesterId: { studentId: student.id, semesterId: activeSemester.id } },
      update: { totalCredits, status: 'SUBMITTED', updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        studentId: student.id,
        semesterId: activeSemester.id,
        academicYear: activeSemester.year.toString(),
        totalCredits,
        status: 'SUBMITTED',
      },
    });

    // Clear old registration courses
    await tx.registrationCourse.deleteMany({ where: { registrationId: reg.id } });

    // Add all curriculum courses
    for (const pc of programCourses) {
      await tx.registrationCourse.create({
        data: {
          id: crypto.randomUUID(),
          registrationId: reg.id,
          courseId: pc.courseId,
        },
      });

      // Also enroll in the first available section
      const section = pc.course.sections?.[0];
      if (section) {
        const alreadyEnrolled = await tx.sectionEnrollment.findUnique({
          where: { studentId_sectionId: { studentId: student.id, sectionId: section.id } },
        });
        if (!alreadyEnrolled) {
          await tx.sectionEnrollment.create({
            data: {
              id: crypto.randomUUID(),
              studentId: student.id,
              sectionId: section.id,
              status: 'ENROLLED',
            },
          });
        }
      }

      // Legacy enrollment
      const alreadyLegacy = await tx.enrollment.findUnique({
        where: { studentId_courseId_semesterId: { studentId: student.id, courseId: pc.courseId, semesterId: activeSemester.id } },
      });
      if (!alreadyLegacy) {
        await tx.enrollment.create({
          data: {
            id: crypto.randomUUID(),
            studentId: student.id,
            courseId: pc.courseId,
            semesterId: activeSemester.id,
            status: 'ENROLLED',
          },
        });
        await tx.course.update({
          where: { id: pc.courseId },
          data: { currentEnrollment: { increment: 1 } },
        });
      }
    }

    return reg;
  });

  res.status(200).json({
    success: true,
    message: `Successfully registered for ${programCourses.length} courses (${totalCredits} credits)`,
    data: result,
  });
});

/**
 * @desc    Send registration notifications to all students (registrar action)
 * @route   POST /api/registration/notify
 * @access  Private (Registrar, Admin)
 */
const sendRegistrationNotifications = asyncHandler(async (req, res) => {
  const { type } = req.body; // 'OPEN' | 'CLOSING_SOON' | 'UPCOMING'

  const activeSemester = await prisma.academicSemester.findFirst({ where: { isActive: true } });
  if (!activeSemester) {
    return res.status(400).json({ success: false, message: 'No active semester' });
  }

  const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });

  const messages = {
    OPEN:         { title: 'Registration Now Open', msg: `Registration for ${activeSemester.name} is now open. Log in to register for your courses.`, notifType: 'SUCCESS' },
    CLOSING_SOON: { title: 'Registration Closing Soon', msg: `Registration for ${activeSemester.name} closes in 2 days. Complete your registration now.`, notifType: 'WARNING' },
    UPCOMING:     { title: 'Registration Opening Soon', msg: `Registration for ${activeSemester.name} opens in 7 days. Prepare your course selections.`, notifType: 'INFO' },
  };

  const m = messages[type];
  if (!m) return res.status(400).json({ success: false, message: 'Invalid notification type' });

  await Promise.all(students.map(s => sendNotification(s.id, m.title, m.msg, m.notifType)));

  res.status(200).json({ success: true, message: `Sent ${type} notification to ${students.length} students` });
});

module.exports = {
  getAvailableCourses,
  getMyDraft,
  saveDraft,
  uploadReceiptAndSubmit,
  confirmRegistration,
  sendRegistrationNotifications,
};
