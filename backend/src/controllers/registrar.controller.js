const prisma = require('../services/prisma');
const { sendNotification } = require('../services/notification.service');
const logAction = require('../utils/audit');
const crypto = require('crypto');
const { hashPassword } = require('../utils/hash');
const { getGeneralStudiesDepartment } = require('./adminAcademic.controller');
const { progressStudent, graduateStudent, checkGraduationEligibility, bulkProgressStudents } = require('../services/lifecycle.service');
const { getRegistrationState } = require('../utils/registrationWindow');

const normalizeNamePart = (value = '') =>
  value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');

const generateInstitutionalEmail = async (firstName, fatherName) => {
  const first = normalizeNamePart(firstName) || 'student';
  const father = normalizeNamePart(fatherName) || 'atlas';
  const base = `${first}.${father}`;
  let institutionalEmail = `${base}@ngu.edu.et`;
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { institutionalEmail } })) {
    institutionalEmail = `${base}${suffix}@ngu.edu.et`;
    suffix += 1;
  }

  return institutionalEmail;
};

const generateTemporaryPassword = () => {
  // Keep a balanced mix to avoid weak auto-generated credentials.
  return `${crypto.randomBytes(4).toString('hex')}A1!`;
};

const generateStudentId = async (dbClient, departmentCode = 'GEN') => {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const code = String(departmentCode).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'GEN';
  const prefix = `${code}-${yearSuffix}-`;
  const currentYearCount = await dbClient.student.count({
    where: {
      studentId: { startsWith: prefix },
    },
  });

  return `${prefix}${String(currentYearCount + 1).padStart(4, '0')}`;
};

// ========== SEMESTER MANAGEMENT ==========

/**
 * @desc    Open registration for a semester
 * @route   POST /api/registrar/semesters/:id/open-registration
 * @access  Private (Registrar, Admin)
 */
const openSemesterRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate other semesters
    await prisma.academicSemester.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate this semester
    const semester = await prisma.academicSemester.update({
      where: { id },
      data: { isActive: true },
    });

    res.status(200).json({
      success: true,
      message: `Registration opened for ${semester.name}`,
      data: semester,
    });
  } catch (error) {
    console.error('Open registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while opening registration',
    });
  }
};

// ========== FEE MANAGEMENT ==========

/**
 * @desc    Create fee structure for a program/semester
 * @route   POST /api/registrar/fee-structures
 * @access  Private (Registrar, Admin)
 */
const createFeeStructure = async (req, res) => {
  try {
    const {
      programId,
      semesterId,
      tuitionFee,
      registrationFee,
      libraryFee,
      labFee,
      activityFee,
      otherFees,
      academicYear,
    } = req.body;

    const totalFee = tuitionFee + (registrationFee || 500) + 
                     (libraryFee || 200) + (labFee || 300) + 
                     (activityFee || 150) + (otherFees || 0);

    const crypto = require('crypto');
    const feeStructure = await prisma.feeStructure.create({
      data: {
        id: crypto.randomUUID(),
        programId,
        semesterId,
        tuitionFee,
        registrationFee: registrationFee || 500,
        libraryFee: libraryFee || 200,
        labFee: labFee || 300,
        activityFee: activityFee || 150,
        otherFees: otherFees || 0,
        totalFee,
        academicYear,
        updatedAt: new Date(),
      },
      include: {
        program: { select: { name: true, code: true } },
        academicSemester: { select: { name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: feeStructure,
    });
  } catch (error) {
    console.error('Create fee structure error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Fee structure already exists for this program and semester',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating fee structure',
    });
  }
};

/**
 * @desc    Generate invoice for student registration
 * @route   POST /api/registrar/invoices/generate
 * @access  Private (Registrar, Admin)
 */
const generateInvoice = async (req, res) => {
  try {
    const { studentId, semesterId } = req.body;

    // Get student and program info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { program: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get fee structure
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        programId: student.programId,
        semesterId,
      },
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found for this program and semester',
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${student.studentId}-${Date.now().toString().slice(-6)}`;

    // Create invoice
    const crypto = require('crypto');
    const invoice = await prisma.invoice.create({
      data: {
        id: crypto.randomUUID(),
        invoiceNumber,
        studentId,
        semesterId,
        feeStructureId: feeStructure.id,
        totalAmount: feeStructure.totalFee,
        paidAmount: 0,
        dueAmount: feeStructure.totalFee,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
          },
        },
        academicSemester: true,
        feeStructure: true,
      },
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating invoice',
    });
  }
};

/**
 * @desc    Record payment
 * @route   POST /api/registrar/payments
 * @access  Private (Registrar, Admin)
 */
const recordPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionRef, notes } = req.body;

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        studentId: invoice.studentId,
        amount,
        paymentMethod: paymentMethod || 'CASH',
        referenceNumber: `REG-${Date.now()}`,
        receiptNumber,
        status: 'SUCCESSFUL',
        paymentDate: new Date(),
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
        notes,
        updatedAt: new Date(),
      },
    });

    // Update invoice
    const paidAmount = invoice.paidAmount + amount;
    const dueAmount = invoice.totalAmount - paidAmount;
    
    let status = 'PENDING';
    if (dueAmount <= 0) status = 'SUCCESSFUL';

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount,
        dueAmount,
        status,
      },
    });

    // Update student registration payment status if fully paid
    if (status === 'SUCCESSFUL') {
      await prisma.semesterRegistration.updateMany({
        where: {
          studentId: invoice.studentId,
          semesterId: invoice.semesterId,
        },
        data: { isPaid: true },
      });
    }

    res.status(201).json({
      success: true,
      data: payment,
      receiptNumber,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording payment',
    });
  }
};

/**
 * @desc    Verify student payment proof
 * @route   PUT /api/registrar/payments/:id/verify
 * @access  Private (Registrar, Admin)
 */
const verifyPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: status === 'APPROVED' ? 'SUCCESSFUL' : 'FAILED',
        verifiedAt: status === 'APPROVED' ? new Date() : null,
        verifiedBy: req.user.id,
        notes: notes || null,
        updatedAt: new Date(),
      },
      include: {
        invoice: true,
        student: { include: { user: { select: { name: true } } } },
      },
    });

    if (status === 'APPROVED') {
      // Update invoice
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: payment.amount,
          dueAmount: 0,
          status: 'SUCCESSFUL',
          updatedAt: new Date(),
        },
      });

      // Update registration
      await prisma.semesterRegistration.updateMany({
        where: {
          studentId: payment.studentId,
          semesterId: payment.invoice.semesterId,
        },
        data: { isPaid: true },
      });
    }

    res.status(200).json({
      success: true,
      message: `Payment ${status.toLowerCase()} successfully`,
      data: payment,
    });
  } catch (error) {
    console.error('Verify payment proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying payment proof',
    });
  }
};

// ========== STUDENT REGISTRATION MANAGEMENT ==========

/**
 * @desc    Get pending registrations for approval
 * @route   GET /api/registrar/registrations/pending
 * @access  Private (Registrar, Admin)
 */
const getPendingRegistrations = async (req, res) => {
  try {
    const registrations = await prisma.semesterRegistration.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        student: {
          include: {
            user: { select: { name: true, institutionalEmail: true } },
            program: { select: { name: true, code: true } },
          },
        },
        academicSemester: { select: { name: true } },
        registrationCourse: {
          include: {
            course: { select: { code: true, title: true, credits: true } },
          },
        },
        invoice: { select: { status: true, paidAmount: true, totalAmount: true } },
      },
      orderBy: { registrationDate: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    console.error('Get pending registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending registrations',
    });
  }
};

/**
 * @desc    Approve or reject registration
 * @route   PUT /api/registrar/registrations/:id/status
 * @access  Private (Registrar, Admin)
 */
const updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const registration = await prisma.semesterRegistration.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? req.user.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        registrationCourse: true,
        academicSemester: { select: { name: true } },
      },
    });

    if (status === 'APPROVED') {
      const crypto = require('crypto');
      for (const regCourse of registration.registrationCourse) {
        await prisma.enrollment.create({
          data: {
            id: crypto.randomUUID(),
            studentId: registration.studentId,
            courseId: regCourse.courseId,
            semesterId: registration.semesterId,
            status: 'ENROLLED',
          },
        });
      }
      for (const regCourse of registration.registrationCourse) {
        await prisma.course.update({
          where: { id: regCourse.courseId },
          data: { currentEnrollment: { increment: 1 } },
        });
      }
    }

    // Send notification to student
    await sendNotification(
      registration.student.userId,
      `Registration ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      status === 'APPROVED' 
        ? `Congratulations! Your registration for ${registration.academicSemester.name} has been approved.` 
        : `Your registration for ${registration.academicSemester.name} was rejected. Reason: ${rejectionReason || 'Not specified'}`,
      status === 'APPROVED' ? 'SUCCESS' : 'ERROR'
    );

    // Audit log
    await logAction(
      req.user.id,
      `${status}_REGISTRATION`,
      'SemesterRegistration',
      { registrationId: id, studentId: registration.studentId }
    );

    res.status(200).json({
      success: true,
      data: registration,
    });
  } catch (error) {
    console.error('Update registration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating registration status',
    });
  }
};

// ========== ADMISSIONS (NEW STUDENTS) ==========

/**
 * @desc    Submit admission application (full form)
 * @route   POST /api/registrar/admissions/apply
 * @access  Public
 */
const submitApplication = async (req, res) => {
  try {
    console.log('📥 POST /api/registrar/admissions/apply payload:', req.body);

    const {
      // Personal info
      firstName, lastName, fatherName, email, phone, dateOfBirth, gender, nationality, address,
      // Academic
      programId, intakeSemesterId, previousSchool, previousGrade,
      // Emergency contact
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      // Guardian
      guardianName,
      guardianPhone,
      guardianRelation,
      guardianAddress,
      // Additional
      religion,
      ethnicity,
      maritalStatus,
      personalStatement,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !dateOfBirth || !programId || !intakeSemesterId) {
      console.log('❌ Admission validation failed:', { firstName, lastName, email, phone, dateOfBirth, programId, intakeSemesterId });
      return res.status(400).json({
        success: false,
        message: 'Required fields: firstName, lastName, email, phone, dateOfBirth, programId, intakeSemesterId',
        missingFields: {
          firstName: !firstName,
          lastName: !lastName,
          email: !email,
          phone: !phone,
          dateOfBirth: !dateOfBirth,
          programId: !programId,
          intakeSemesterId: !intakeSemesterId,
        },
      });
    }

    const parsedDateOfBirth = new Date(dateOfBirth);
    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dateOfBirth. Expected ISO date format.',
      });
    }

    // Extract uploaded files
    const files = req.files || {};
    console.log('📎 Admission apply files:', {
      photo: files.photo?.[0]
        ? { filename: files.photo[0].filename, mimetype: files.photo[0].mimetype, size: files.photo[0].size }
        : null,
      transcript: files.transcript?.[0]
        ? { filename: files.transcript[0].filename, mimetype: files.transcript[0].mimetype, size: files.transcript[0].size }
        : null,
      idDocument: files.idDocument?.[0]
        ? { filename: files.idDocument[0].filename, mimetype: files.idDocument[0].mimetype, size: files.idDocument[0].size }
        : null,
    });
    const photoUrl = files.photo ? `/uploads/students/${files.photo[0].filename}` : null;
    const transcriptUrl = files.transcript ? `/uploads/admissions/${files.transcript[0].filename}` : null;
    const idDocumentUrl = files.idDocument ? `/uploads/admissions/${files.idDocument[0].filename}` : null;

    const year = new Date().getFullYear();
    const count = await prisma.admissionApplication.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const applicationNumber = `APP-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const documents = {
      photoUrl,
      transcriptUrl,
      idDocumentUrl,
      emergencyContact: {
        name: emergencyContactName || null,
        phone: emergencyContactPhone || null,
        relation: emergencyContactRelation || null,
      },
      guardian: {
        name: guardianName || null,
        phone: guardianPhone || null,
        relation: guardianRelation || null,
        address: guardianAddress || null,
      },
      personal: {
        fatherName: fatherName || null,
        religion: religion || null,
        ethnicity: ethnicity || null,
        maritalStatus: maritalStatus || 'SINGLE',
        personalStatement: personalStatement || null,
      },
    };

    const effectiveFatherName = fatherName || lastName;
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);
    const institutionalEmail = await generateInstitutionalEmail(firstName, effectiveFatherName);

    const { application, student, user } = await prisma.$transaction(async (tx) => {
      const createdApplication = await tx.admissionApplication.create({
        data: {
          id: crypto.randomUUID(),
          applicationNumber,
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth: parsedDateOfBirth,
          gender: gender || null,
          nationality: nationality || 'Ethiopian',
          address: address || null,
          programId,
          intakeSemesterId,
          previousSchool: previousSchool || null,
          previousGrade: previousGrade ? parseFloat(previousGrade) : null,
          documents,
          updatedAt: new Date(),
        },
        include: {
          program: {
            select: {
              name: true,
              code: true,
              departmentId: true,
              department: { select: { code: true } },
            },
          },
          academicSemester: { select: { name: true } },
        },
      });

      const createdUser = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          name: `${firstName} ${lastName}`,
          institutionalEmail,
          recoveryEmail: email,
          password: hashedPassword,
          role: 'STUDENT',
          profileImage: photoUrl || null,
          emailVerified: true,
          isFirstLogin: true,
          updatedAt: new Date(),
        },
      });

      const fallbackDepartment = !createdApplication.program.departmentId ? await getGeneralStudiesDepartment() : null;
      const resolvedDepartmentId = createdApplication.program.departmentId || fallbackDepartment.id;
      const studentId = await generateStudentId(tx, createdApplication.program?.department?.code || fallbackDepartment?.code || 'GEN');
      const studentCreateData = {
          id: crypto.randomUUID(),
          userId: createdUser.id,
          studentId,
          firstName,
          fatherName: effectiveFatherName,
          email: institutionalEmail,
          isFirstLogin: true,
          profileCompleted: Boolean(createdApplication.programId && resolvedDepartmentId && firstName && effectiveFatherName),
          enrollmentYear: new Date().getFullYear(),
          programId: createdApplication.programId,
          departmentId: resolvedDepartmentId,
          currentYear: 1,
          currentSemester: 'FALL',
          admissionId: createdApplication.id,
          updatedAt: new Date(),
      };
      console.log('🧩 Admission student Prisma input:', studentCreateData);
      const createdStudent = await tx.student.create({ data: studentCreateData });

      await tx.admissionApplication.update({
        where: { id: createdApplication.id },
        data: { status: 'ENROLLED' },
      });

      return { application: createdApplication, user: createdUser, student: createdStudent };
    });

    const usersToNotify = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'REGISTRAR', 'INSTRUCTOR'] } },
      select: { id: true },
    });
    await Promise.all(
      usersToNotify.map((u) =>
        sendNotification(
          u.id,
          'New Student Registered',
          `New student registered: ${firstName} ${lastName} (${student.studentId})`,
          'SUCCESS'
        )
      )
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted and account created successfully',
      data: {
        applicationNumber: application.applicationNumber,
        studentId: student.studentId,
        institutionalEmail: user.institutionalEmail,
        temporaryPassword: tempPassword,
        program: application.program.name,
        intake: application.academicSemester.name,
      },
    });
  } catch (error) {
    console.error('Submit application error:', error);
    const isValidationError = error.code === 'P2003' || error.code === 'P2002';
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? 'Invalid program or semester selection, or duplicate data detected' : 'Server error while submitting application',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get all applications (for registrar review)
 * @route   GET /api/registrar/admissions
 * @access  Private (Registrar, Admin)
 */
const getApplications = async (req, res) => {
  try {
    const { status, programId } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (programId) where.programId = programId;

    const applications = await prisma.admissionApplication.findMany({
      where,
      include: {
        program: { select: { name: true, code: true } },
        academicSemester: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching applications',
    });
  }
};

/**
 * @desc    Process application (accept/reject)
 * @route   PUT /api/registrar/admissions/:id/process
 * @access  Private (Registrar, Admin)
 */
const processApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const application = await prisma.admissionApplication.update({
      where: { id },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        notes,
      },
      include: {
        program: {
          select: {
            name: true,
            departmentId: true,
            department: { select: { code: true } },
          },
        },
      },
    });

    if (status === 'ACCEPTED') {
      const baseLocal = `${application.firstName.toLowerCase()}.${application.lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
      let institutionalEmail = `${baseLocal}@ngu.edu.et`;
      let suffix = 0;
      while (await prisma.user.findUnique({ where: { institutionalEmail } })) {
        suffix += 1;
        institutionalEmail = `${baseLocal}${suffix}@ngu.edu.et`;
      }

      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      const crypto = require('crypto');

      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: `${application.firstName} ${application.lastName}`,
          institutionalEmail,
          recoveryEmail: application.email,
          password: hashedPassword,
          role: 'STUDENT',
          profileImage: application.documents?.photoUrl || null,
          emailVerified: true,
          isFirstLogin: true,
          updatedAt: new Date(),
        },
      });

      const year = new Date().getFullYear().toString().slice(-2);
      const deptCode = (application.program?.department?.code || 'GEN').toUpperCase().slice(0, 3).padEnd(3, 'X');
      const count = await prisma.student.count();
      const studentId = `${deptCode}${year}${(count + 1).toString().padStart(4, '0')}`;

      const fallbackDepartment = !application.program.departmentId ? await getGeneralStudiesDepartment() : null;
      const resolvedDepartmentId = application.program.departmentId || fallbackDepartment.id;
      const studentCreateData = {
          id: crypto.randomUUID(),
          userId: user.id,
          studentId,
          firstName: application.firstName,
          fatherName: application.lastName,
          email: institutionalEmail,
          isFirstLogin: true,
          profileCompleted: Boolean(application.programId && resolvedDepartmentId && application.firstName && application.lastName),
          enrollmentYear: new Date().getFullYear(),
          programId: application.programId,
          departmentId: resolvedDepartmentId,
          currentYear: 1,
          currentSemester: 'FALL',
          admissionId: application.id,
          updatedAt: new Date(),
      };
      console.log('🧩 Process application student Prisma input:', studentCreateData);
      const student = await prisma.student.create({ data: studentCreateData });

      await prisma.admissionApplication.update({
        where: { id },
        data: { status: 'ENROLLED' },
      });

      return res.status(200).json({
        success: true,
        message: 'Application accepted and student account created',
        data: {
          applicationNumber: application.applicationNumber,
          studentId: student.studentId,
          institutionalEmail: user.institutionalEmail,
          temporaryPassword: tempPassword,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Application ${status.toLowerCase()}`,
    });
  } catch (error) {
    console.error('Process application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing application',
    });
  }
};

// ========== DASHBOARD STATS ==========

/**
 * @desc    Get all students (for registrar)
 * @route   GET /api/registrar/students
 * @access  Private (Registrar, Admin)
 */
/**
 * @desc    Get students who have not paid for the active semester
 * @route   GET /api/registrar/students/unpaid
 * @access  Private (Registrar, Admin)
 */
const getUnpaidStudents = async (req, res) => {
  try {
    const activeSemester = await prisma.academicSemester.findFirst({
      where: { isActive: true },
    });

    if (!activeSemester) {
      return res.status(200).json({ success: true, count: 0, data: [], message: 'No active semester found' });
    }

    // Unpaid students are those who have a registration for the active semester
    // but haven't marked it as paid, OR have an invoice that is not PAID/SUCCESSFUL.
    const unpaidStudents = await prisma.student.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            semesterRegistration: {
              some: {
                semesterId: activeSemester.id,
                isPaid: false,
              },
            },
          },
          {
            invoice: {
              some: {
                semesterId: activeSemester.id,
                status: { notIn: ['PAID', 'SUCCESSFUL'] },
              },
            },
          },
        ],
      },
      include: {
        user: { select: { name: true, institutionalEmail: true } },
        program: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
        semesterRegistration: {
          where: { semesterId: activeSemester.id },
          select: { status: true, isPaid: true, totalCredits: true },
        },
        invoice: {
          where: { semesterId: activeSemester.id },
          select: { invoiceNumber: true, totalAmount: true, dueAmount: true, status: true },
        },
        studentPayments: {
          where: { status: 'PENDING' },
          select: { reference: true, amount: true, createdAt: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: unpaidStudents.length,
      data: unpaidStudents,
      activeSemester: activeSemester.name,
    });
  } catch (error) {
    console.error('Get unpaid students error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const { search, status, programId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (programId) where.programId = programId;
    if (search) {
      where.OR = [
        { studentId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { institutionalEmail: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, institutionalEmail: true, createdAt: true } },
        program: { select: { name: true, code: true, degreeLevel: true } },
        department: { select: { name: true, code: true } },
        _count: { select: { enrollment: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get registrar dashboard statistics
 * @route   GET /api/registrar/dashboard/stats
 * @access  Private (Registrar, Admin)
 */
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      pendingRegistrations,
      pendingApplications,
      totalPaymentsThisSemester,
      activeSemester,
      unpaidStudentsCount,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.semesterRegistration.count({ where: { status: 'SUBMITTED' } }),
      prisma.admissionApplication.count({ where: { status: 'SUBMITTED' } }),
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
      prisma.academicSemester.findFirst({ where: { isActive: true } }),
      prisma.student.count({
        where: {
          status: 'ACTIVE',
          OR: [
            {
              semesterRegistration: {
                some: {
                  isPaid: false,
                },
              },
            },
            {
              invoice: {
                some: {
                  status: { notIn: ['PAID', 'SUCCESSFUL'] },
                },
              },
            },
          ],
        },
      }),
    ]);

    const studentsByProgram = await prisma.student.groupBy({
      by: ['programId'],
      _count: { id: true },
    });

    const programs = await prisma.program.findMany({
      where: { id: { in: studentsByProgram.map(s => s.programId) } },
      select: { id: true, name: true },
    });

    const programStats = studentsByProgram.map(s => ({
      program: programs.find(p => p.id === s.programId)?.name,
      count: s._count.id,
    }));

    const regState = activeSemester ? getRegistrationState(activeSemester) : null;

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        pendingRegistrations,
        pendingApplications,
        unpaidStudentsCount,
        paymentsThisMonth: totalPaymentsThisSemester._sum.amount || 0,
        activeSemester: activeSemester?.name || 'No active semester',
        registrationOpen: regState?.state === 'OPEN',
        registration: regState,
        activeSemesterId: activeSemester?.id || null,
        studentsByProgram: programStats,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard stats',
    });
  }
};

// ── Close semester registration ──────────────────────────────
const closeSemesterRegistration = async (req, res) => {
  try {
    await prisma.academicSemester.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    res.status(200).json({ success: true, message: 'Registration closed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Approve registration + auto-assign curriculum courses ────
const approveRegistrationWithCourses = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const action = req.body.status || 'APPROVED';

    const registration = await prisma.semesterRegistration.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
            program: true,
          },
        },
        academicSemester: { select: { id: true, name: true } },
      },
    });

    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

    if (action === 'APPROVED') {
      const student = registration.student;
      const semNumber = student.currentSemester === 'FALL' ? 1 : 2;

      // Get curriculum courses
      const programCourses = await prisma.programCourse.findMany({
        where: { programId: student.programId, year: student.currentYear, semester: semNumber },
        include: {
          course: {
            include: { sections: { where: { semesterId: registration.semesterId }, take: 1 } },
          },
        },
      });

      await prisma.$transaction(async (tx) => {
        // Update registration status
        await tx.semesterRegistration.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() },
        });

        // Clear old registration courses and re-add from curriculum
        await tx.registrationCourse.deleteMany({ where: { registrationId: id } });

        for (const pc of programCourses) {
          await tx.registrationCourse.upsert({
            where: { registrationId_courseId: { registrationId: id, courseId: pc.courseId } },
            update: {},
            create: { id: crypto.randomUUID(), registrationId: id, courseId: pc.courseId },
          });

          // Section enrollment
          const section = pc.course.sections?.[0];
          if (section) {
            const exists = await tx.sectionEnrollment.findUnique({
              where: { studentId_sectionId: { studentId: student.id, sectionId: section.id } },
            });
            if (!exists) {
              await tx.sectionEnrollment.create({
                data: { id: crypto.randomUUID(), studentId: student.id, sectionId: section.id, status: 'ENROLLED' },
              });
            }
          }

          // Legacy enrollment
          const legacyExists = await tx.enrollment.findUnique({
            where: { studentId_courseId_semesterId: { studentId: student.id, courseId: pc.courseId, semesterId: registration.semesterId } },
          });
          if (!legacyExists) {
            await tx.enrollment.create({
              data: { id: crypto.randomUUID(), studentId: student.id, courseId: pc.courseId, semesterId: registration.semesterId, status: 'ENROLLED' },
            });
            await tx.course.update({ where: { id: pc.courseId }, data: { currentEnrollment: { increment: 1 } } });
          }
        }
      });

      // Notify student
      await sendNotification(
        student.user.id,
        'Registration Approved',
        `Your registration for ${registration.academicSemester.name} has been approved. ${programCourses.length} courses have been assigned to your account.`,
        'SUCCESS'
      );
    } else {
      await prisma.semesterRegistration.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: rejectionReason || 'Not specified' },
      });
      await sendNotification(
        registration.student.user.id,
        'Registration Rejected',
        `Your registration for ${registration.academicSemester.name} was rejected. Reason: ${rejectionReason || 'Not specified'}`,
        'ERROR'
      );
    }

    await logAction(req.user.id, `${action}_REGISTRATION`, 'SemesterRegistration', { registrationId: id });

    res.status(200).json({ success: true, message: `Registration ${action.toLowerCase()}` });
  } catch (error) {
    console.error('Approve registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Student lifecycle endpoints ──────────────────────────────

const progressStudentHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await progressStudent(studentId, req.user.id);
    await logAction(req.user.id, 'PROGRESS_STUDENT', 'Student', { studentId, ...result });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const graduateStudentHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await graduateStudent(studentId, req.user.id);
    await logAction(req.user.id, 'GRADUATE_STUDENT', 'Student', { studentId });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const checkGraduationHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await checkGraduationEligibility(studentId);
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const bulkProgressHandler = async (req, res) => {
  try {
    const { programId, departmentId } = req.body;
    const filters = {};
    if (programId) filters.programId = programId;
    if (departmentId) filters.departmentId = departmentId;
    const results = await bulkProgressStudents(filters);
    const promoted = results.filter(r => r.promoted).length;
    await logAction(req.user.id, 'BULK_PROGRESS', 'Student', { promoted, total: results.length });
    res.status(200).json({ success: true, data: { results, promoted, total: results.length } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  openSemesterRegistration,
  closeSemesterRegistration,
  createFeeStructure,
  generateInvoice,
  recordPayment,
  verifyPaymentProof,
  getPendingRegistrations,
  updateRegistrationStatus,
  approveRegistrationWithCourses,
  submitApplication,
  getApplications,
  processApplication,
  getStudents,
  getUnpaidStudents,
  getDashboardStats,
  progressStudentHandler,
  graduateStudentHandler,
  checkGraduationHandler,
  bulkProgressHandler,
};