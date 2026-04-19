const prisma = require('../services/prisma');
const { hashPassword, comparePassword } = require('../utils/hash');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} = require('../utils/jwt');

const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/email.service');

/**
 * @desc    Register a new student
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, institutionalEmail, recoveryEmail, password, studentId, departmentId, programId } = req.body;
    const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    console.log('📝 REGISTER ATTEMPT:', { name, institutionalEmail, departmentId });

    // Validation
    if (!name || !institutionalEmail || !recoveryEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, institutionalEmail, recoveryEmail, password',
      });
    }

    const emailPattern = /^[a-zA-Z0-9._-]+@atlas\.edu\.et$/;
    if (!emailPattern.test(institutionalEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Institutional email must be in @atlas.edu.et format',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { institutionalEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this institutional email already exists',
      });
    }

    const hashedPassword = await hashPassword(password);

    // Resolve Department and Program
    let finalDepartmentId = departmentId;
    let finalProgramId = programId;

    if (!finalDepartmentId) {
      let dept = await prisma.department.findUnique({ where: { code: 'GEN' } });
      if (!dept) {
        dept = await prisma.department.create({
          data: {
            id: crypto.randomUUID(),
            name: 'General Studies',
            code: 'GEN',
            updatedAt: new Date(),
          },
        });
      }
      finalDepartmentId = dept.id;
    }

    if (!finalProgramId) {
      let prog = await prisma.program.findFirst({
        where: { departmentId: finalDepartmentId }
      });
      
      if (!prog) {
        prog = await prisma.program.findUnique({ where: { code: 'UND' } });
      }

      if (!prog) {
        prog = await prisma.program.create({
          data: {
            id: crypto.randomUUID(),
            name: 'Undeclared',
            code: 'UND',
            departmentId: finalDepartmentId,
            durationYears: 4,
            totalCredits: 120,
            updatedAt: new Date(),
          },
        });
      }
      finalProgramId = prog.id;
    }

    if (finalProgramId) {
      const selectedProgram = await prisma.program.findUnique({
        where: { id: finalProgramId },
        select: { type: true, departmentId: true },
      });
      if (!selectedProgram) {
        return res.status(404).json({ success: false, message: 'Selected program not found' });
      }
      if (selectedProgram.type === 'DECLARED' && !finalDepartmentId) {
        return res.status(400).json({ success: false, message: 'Declared program requires a department' });
      }
      finalDepartmentId = finalDepartmentId || selectedProgram.departmentId || finalDepartmentId;
    }

    const userId = crypto.randomUUID();
    const studentRecordId = crypto.randomUUID();
    const generatedStudentId = studentId || 
      `STU${new Date().getFullYear()}${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')}`;

    // Create user and student in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          name,
          institutionalEmail,
          recoveryEmail,
          password: hashedPassword,
          role: 'STUDENT',
          profileImage,
          updatedAt: new Date(),
        },
      });

      const student = await tx.student.create({
        data: {
          id: studentRecordId,
          userId: user.id,
          studentId: generatedStudentId,
          enrollmentYear: new Date().getFullYear(),
          currentYear: 1,
          currentSemester: 'FALL',
          programId: finalProgramId,
          departmentId: finalDepartmentId,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      return { user, student };
    });

    console.log('✅ STUDENT REGISTERED:', result.user.institutionalEmail, 'Student ID:', result.student.studentId);

    const accessToken = generateAccessToken(result.user.id, 'STUDENT', null);
    const refreshToken = generateRefreshToken(result.user.id);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: result.user.id,
        name: result.user.name,
        institutionalEmail: result.user.institutionalEmail,
        role: 'STUDENT',
        studentId: result.student.studentId,
        profileImage: result.user.profileImage
      },
    });
  } catch (error) {
    console.error('❌ REGISTER ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during registration',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { institutionalEmail, password } = req.body;

    console.log('🔑 LOGIN ATTEMPT:', institutionalEmail);

    if (!institutionalEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { institutionalEmail },
      });
    } catch (error) {
      // Fallback for older DB snapshots missing newer columns (e.g. isFirstLogin)
      if (error.code === 'P2022') {
        user = await prisma.user.findUnique({
          where: { institutionalEmail },
          select: {
            id: true,
            name: true,
            institutionalEmail: true,
            password: true,
            role: true,
            profileImage: true,
          },
        });
      } else {
        throw error;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const adminRole = user.adminRole ?? (user.role === 'ADMIN' ? 'SUPER_ADMIN' : null);
    const accessToken = generateAccessToken(user.id, user.role, adminRole);
    const refreshToken = generateRefreshToken(user.id);

    console.log('✅ LOGIN SUCCESS:', user.institutionalEmail);

    // Fetch studentId if the user is a student
    let studentId = null;
    if (user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { studentId: true },
      });
      studentId = student?.studentId || null;
    }

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      token: accessToken,
      expiresIn: 900,
      user: {
        id: user.id,
        name: user.name,
        institutionalEmail: user.institutionalEmail,
        role: user.role,
        adminRole: user.role === 'ADMIN' ? adminRole : null,
        profileImage: user.profileImage,
        isFirstLogin: typeof user.isFirstLogin === 'boolean' ? user.isFirstLogin : true,
        studentId,
      },
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        institutionalEmail: true,
        recoveryEmail: true,
        role: true,
        adminRole: true,
        profileImage: true,
        isFirstLogin: true,
        emailVerified: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            fatherName: true,
            email: true,
            profileCompleted: true,
            cumulativeGPA: true,
            totalCredits: true,
            status: true,
            currentYear: true,
            currentSemester: true,
            program: { select: { name: true, code: true } },
            department: { select: { name: true, code: true } },
          },
        },
        instructor: {
          select: {
            id: true,
            employeeId: true,
            title: true,
            department: { select: { name: true, code: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('❌ GET ME ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: tokenFromBody } = req.body;

    if (!tokenFromBody) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = verifyRefreshToken(tokenFromBody);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, adminRole: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const adminRole = user.adminRole ?? (user.role === 'ADMIN' ? 'SUPER_ADMIN' : null);
    const accessToken = generateAccessToken(user.id, user.role, adminRole);

    res.status(200).json({
      success: true,
      accessToken,
      token: accessToken,
      expiresIn: 900,
    });
  } catch (error) {
    console.error('❌ REFRESH TOKEN ERROR:', error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

/**
 * @desc    Forgot password - send reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { institutionalEmail } = req.body;

    if (!institutionalEmail) {
      return res.status(400).json({
        success: false,
        message: 'Institutional email is required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { institutionalEmail },
    });

    if (!user) {
      // Security: Don't reveal whether the email exists
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset link has been sent to your recovery email.',
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email (fail silently for security)
    try {
      await sendPasswordResetEmail(user.recoveryEmail, resetToken, user.name);
      console.log('✅ Password reset email sent to:', user.recoveryEmail);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists, a password reset link has been sent to your recovery email.',
    });
  } catch (error) {
    console.error('❌ FORGOT PASSWORD ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
        used: false,
      },
      include: { user: true },
    });

    if (!resetTokenRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: { password: hashedPassword, isFirstLogin: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { used: true },
      }),
    ]);

    console.log('✅ PASSWORD RESET SUCCESSFUL for:', resetTokenRecord.user.institutionalEmail);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('❌ RESET PASSWORD ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Change password (for first login or manual change)
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new passwords are required',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        isFirstLogin: false 
      },
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('❌ CHANGE PASSWORD ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
};