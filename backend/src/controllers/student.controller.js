const prisma = require('../services/prisma');
const { calculateGPA, calculateStudentGPAs } = require('../utils/gpa');
const { getRegistrationState, canStudentAttemptRegistration } = require('../utils/registrationWindow');
const { checkGraduationEligibility } = require('../services/lifecycle.service');

/**
 * @desc    Get current student's full profile
 * @route   GET /api/student/profile
 * @access  Private (Student only)
 */
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            institutionalEmail: true,
            recoveryEmail: true,
            role: true,
            emailVerified: true,
            createdAt: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
            degreeLevel: true,
            durationYears: true,
            totalCredits: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        enrollment: {
          where: { status: 'ENROLLED' },
          include: {
            course: {
              select: {
                id: true,
                code: true,
                title: true,
                credits: true,
              },
            },
            academicSemester: {
              select: {
                id: true,
                name: true,
                type: true,
                year: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Calculate academic summary
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'COMPLETED',
      },
      include: {
        course: { select: { credits: true } },
      },
    });

    const totalCreditsEarned = completedEnrollments.reduce((sum, e) => sum + e.course.credits, 0);
    
    // Calculate GPA
    const grades = await prisma.grade.findMany({
      where: {
        studentId: student.userId,
        type: 'FINAL',
      },
    });

    let gpa = 0;
    if (grades.length > 0) {
      const totalPoints = grades.reduce((sum, g) => sum + (g.gradePoint || 0), 0);
      gpa = totalPoints / grades.length;
    }

    res.status(200).json({
      success: true,
      data: {
        ...student,
        academicSummary: {
          totalCreditsEarned,
          cumulativeGPA: parseFloat(gpa.toFixed(2)),
          currentCourses: student.enrollment.length,
          completedCourses: completedEnrollments.length,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
    });
  }
};

/**
 * @desc    Get student profile (compact)
 * @route   GET /api/student/me
 * @access  Private (Student only)
 */
const getStudentMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        admissionApplication: { select: { documents: true } },
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
        user: {
          select: {
            name: true,
            institutionalEmail: true,
            profileImage: true,
            isFirstLogin: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const admissionPhoto = student.admissionApplication?.documents?.photoUrl || null;
    const fullName = student.user?.name || [student.firstName, student.fatherName].filter(Boolean).join(' ');
    res.status(200).json({
      success: true,
      data: {
        id: student.id,
        firstName: student.firstName || fullName?.split(' ')[0] || '',
        fatherName: student.fatherName || fullName?.split(' ').slice(1).join(' ') || '',
        fullName: fullName || '',
        email: student.email || student.user?.institutionalEmail || '',
        institutionalEmail: student.user?.institutionalEmail || '',
        photoUrl: student.photoUrl || student.user?.profileImage || admissionPhoto,
        profileImage: student.photoUrl || student.user?.profileImage || admissionPhoto,
        profileCompleted: student.profileCompleted,
        registrationStatus: student.registrationStatus,
        status: student.status,
        department: student.department || null,
        program: student.program || null,
      },
    });
  } catch (error) {
    console.error('Get student me error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching student profile' });
  }
};

/**
 * @desc    Update student profile basics and photo
 * @route   PUT /api/student/me
 * @access  Private (Student only)
 */
const updateStudentMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, fatherName } = req.body;
    const uploadedPhotoUrl = req.file ? `/uploads/students/${req.file.filename}` : null;
    console.log('📥 PUT /api/student/me body:', req.body);
    console.log('📎 PUT /api/student/me file:', req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : null);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token: user id is missing' });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const nextFirstName = (firstName ?? student.firstName ?? student.user?.name?.split(' ')[0] ?? '').trim();
    const nextFatherName = (fatherName ?? student.fatherName ?? student.user?.name?.split(' ').slice(1).join(' ') ?? '').trim();
    const nextPhotoUrl = uploadedPhotoUrl || student.photoUrl || student.user?.profileImage || null;
    const fullName = [nextFirstName, nextFatherName].filter(Boolean).join(' ') || student.user.name;
    const profileCompleted = Boolean(nextFirstName && nextFatherName && student.programId && student.departmentId && nextPhotoUrl);
    const userUpdateData = {
      name: fullName,
      ...(uploadedPhotoUrl && { profileImage: uploadedPhotoUrl }),
    };
    const studentUpdateData = {
      firstName: nextFirstName || null,
      fatherName: nextFatherName || null,
      profileCompleted,
      ...(uploadedPhotoUrl && { photoUrl: uploadedPhotoUrl }),
    };
    console.log('🧩 Student profile user Prisma input:', userUpdateData);
    console.log('🧩 Student profile student Prisma input:', studentUpdateData);

    const [updatedUser, updatedStudent] = await prisma.$transaction([
      prisma.user.update({
        where: { id: student.userId },
        data: userUpdateData,
        select: {
          name: true,
          institutionalEmail: true,
          profileImage: true,
        },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: studentUpdateData,
        include: {
          department: { select: { id: true, name: true, code: true } },
          program: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedStudent.id,
        firstName: updatedStudent.firstName || '',
        fatherName: updatedStudent.fatherName || '',
        fullName: updatedUser.name,
        email: updatedStudent.email || updatedUser.institutionalEmail,
        institutionalEmail: updatedUser.institutionalEmail,
        photoUrl: updatedStudent.photoUrl || updatedUser.profileImage || null,
        profileCompleted: updatedStudent.profileCompleted,
        department: updatedStudent.department || null,
        program: updatedStudent.program || null,
      },
    });
  } catch (error) {
    console.error('Update student me error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating profile', error: error.message });
  }
};

/**
 * @desc    Get current student's courses
 * @route   GET /api/student/courses
 * @access  Private (Student only)
 */
const getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: { in: ['ENROLLED', 'COMPLETED'] },
      },
      include: {
        course: {
          include: {
            instructor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        academicSemester: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Separate current and past courses
    const currentCourses = enrollments.filter(e => e.status === 'ENROLLED');
    const pastCourses = enrollments.filter(e => e.status === 'COMPLETED');

    res.status(200).json({
      success: true,
      data: {
        current: currentCourses,
        past: pastCourses,
      },
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses',
    });
  }
};

/**
 * @desc    Get current student's grades
 * @route   GET /api/student/grades
 * @access  Private (Student only)
 */
const getMyGrades = async (req, res) => {
  try {
    const userId = req.user.id;

    const grades = await prisma.grade.findMany({
      where: { studentId: userId },
      include: {
        course: {
          select: {
            code: true,
            title: true,
            credits: true,
          },
        },
        assignment: {
          select: {
            title: true,
            totalPoints: true,
          },
        },
        academicSemester: {
          select: {
            name: true,
            type: true,
            year: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    // Group by semester
    const bySemester = {};
    grades.forEach(grade => {
      const semesterKey = grade.academicSemester?.name || 'Unknown';
      if (!bySemester[semesterKey]) {
        bySemester[semesterKey] = [];
      }
      bySemester[semesterKey].push(grade);
    });

    // Calculate GPA
    const finalGrades = grades.filter(g => g.type === 'FINAL');
    let gpa = 0;
    if (finalGrades.length > 0) {
      const totalPoints = finalGrades.reduce((sum, g) => sum + (g.gradePoint || 0), 0);
      gpa = totalPoints / finalGrades.length;
    }

    res.status(200).json({
      success: true,
      data: {
        grades,
        bySemester,
        summary: {
          totalCourses: finalGrades.length,
          cumulativeGPA: parseFloat(gpa.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching grades',
    });
  }
};

/**
 * @desc    Get student's section-based academic record with live GPA
 * @route   GET /api/student/academic-record
 * @access  Private (Student only)
 */
const getMyAcademicRecord = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true, cumulativeGPA: true, totalCredits: true, status: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const activeSemester = await prisma.academicSemester.findFirst({ where: { isActive: true } });

    const enrollments = await prisma.sectionEnrollment.findMany({
      where: { studentId: student.id },
      include: {
        section: {
          include: {
            course: { select: { id: true, code: true, title: true, credits: true } },
            instructor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Compute live GPA from current enrollments
    const gpaData = enrollments.map(e => ({
      letterGrade: e.letterGrade,
      credits: e.section?.course?.credits ?? 0,
    }));
    const liveGPA = calculateGPA(gpaData);

    // SGPA: current semester only
    const { sgpa, cgpa, semesterCredits } = await calculateStudentGPAs(
      prisma, student.id, activeSemester?.id
    );

    const courses = enrollments.map(e => ({
      enrollmentId: e.id,
      sectionId: e.sectionId,
      courseId: e.section?.course?.id,
      courseCode: e.section?.course?.code,
      courseTitle: e.section?.course?.title,
      credits: e.section?.course?.credits,
      sectionName: e.section?.name,
      instructor: e.section?.instructor?.user?.name ?? 'TBA',
      grade: e.letterGrade ?? null,
      numericGrade: e.grade ?? null,
      status: e.status,
      enrolledAt: e.enrolledAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        courses,
        gpa: cgpa,
        sgpa,
        cgpa,
        semesterCredits,
        storedGPA: student.cumulativeGPA,
        totalCredits: student.totalCredits,
        activeSemester: activeSemester ? { id: activeSemester.id, name: activeSemester.name } : null,
        completedCourses: enrollments.filter(e => e.status === 'COMPLETED').length,
        activeCourses: enrollments.filter(e => e.status === 'ENROLLED').length,
      },
    });
  } catch (error) {
    console.error('Get academic record error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching academic record' });
  }
};

/**
 * @desc    Get student's full lifecycle/academic status
 * @route   GET /api/student/lifecycle
 * @access  Private (Student only)
 */
const getMyLifecycle = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        program: { select: { name: true, code: true, totalCredits: true, durationYears: true, minGPA: true } },
        department: { select: { name: true, code: true } },
        academicSemester: { select: { name: true, type: true, year: true } },
      },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Completed credits
    const completedEnrollments = await prisma.sectionEnrollment.findMany({
      where: { studentId: student.id, status: 'COMPLETED' },
      include: { section: { include: { course: { select: { credits: true } } } } },
    });
    const completedCredits = completedEnrollments.reduce((s, e) => s + (e.section?.course?.credits ?? 0), 0);
    const requiredCredits  = student.program?.totalCredits ?? 128;
    const progressPct      = Math.min(100, Math.round((completedCredits / requiredCredits) * 100));

    // Active semester
    const activeSemester = await prisma.academicSemester.findFirst({ where: { isActive: true } });
    const registration = getRegistrationState(activeSemester);
    const eligibility = canStudentAttemptRegistration(student);
    const windowOpen = registration.state === 'OPEN';

    const activeSemesterId = activeSemester?.id ?? null;
    const { sgpa, cgpa: liveCgpa } = await calculateStudentGPAs(prisma, student.id, activeSemesterId);
    const cgpa = liveCgpa ?? student.cumulativeGPA ?? 0;

    let graduationPreview = null;
    try {
      graduationPreview = await checkGraduationEligibility(student.id);
    } catch (_) {
      graduationPreview = { eligible: false, reason: 'Unable to evaluate' };
    }

    const LEVEL_LABELS = {
      APPLICANT: 'Applicant', ADMITTED: 'Admitted',
      FRESHMAN: 'Freshman (Year 1)', SOPHOMORE: 'Sophomore (Year 2)',
      JUNIOR: 'Junior (Year 3)', SENIOR: 'Senior (Year 4)',
      GRADUATED: 'Graduated',
    };

    const isGraduated = student.status === 'GRADUATED' || student.academicLevel === 'GRADUATED';
    const canRegister = !isGraduated && eligibility.ok && windowOpen;

    res.status(200).json({
      success: true,
      data: {
        studentId: student.studentId,
        status: student.status,
        academicLevel: student.academicLevel ?? 'FRESHMAN',
        academicLevelLabel: LEVEL_LABELS[student.academicLevel ?? 'FRESHMAN'],
        currentYear: student.currentYear,
        currentSemester: student.currentSemester,
        activeSemester: activeSemester
          ? {
              id: activeSemester.id,
              name: activeSemester.name,
              startDate: activeSemester.startDate,
              endDate: activeSemester.endDate,
              registrationStart: activeSemester.registrationStart,
              registrationEnd: activeSemester.registrationEnd,
            }
          : null,
        registration,
        registrationEligibility: eligibility,
        sgpa,
        cgpa,
        completedCredits,
        requiredCredits,
        progressPct,
        program: student.program,
        department: student.department,
        isGraduated,
        graduatedAt: student.graduatedAt,
        canRegister,
        graduationPreview: {
          eligible: graduationPreview.eligible,
          reason: graduationPreview.reason,
          missingRequiredCount: graduationPreview.missingRequiredCount ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('Get lifecycle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc Official academic transcript (graduates only)
 * @route GET /api/student/transcript
 */
const getMyTranscript = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, institutionalEmail: true } },
        program: { select: { name: true, code: true, degreeLevel: true, totalCredits: true } },
        department: { select: { name: true, code: true } },
      },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const graduated = student.status === 'GRADUATED' || student.academicLevel === 'GRADUATED';
    if (!graduated) {
      return res.status(403).json({
        success: false,
        message: 'Official transcript is issued after graduation. Use Academic Record for in-progress study.',
      });
    }

    const sectionRows = await prisma.sectionEnrollment.findMany({
      where: { studentId: student.id, status: 'COMPLETED' },
      include: {
        section: {
          include: { course: { select: { id: true, code: true, title: true, credits: true } } },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    });

    const legacyRows = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'COMPLETED' },
      include: {
        course: { select: { id: true, code: true, title: true, credits: true } },
        academicSemester: { select: { id: true, name: true, year: true, type: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    const semIds = [...new Set(sectionRows.map((r) => r.section?.semesterId).filter(Boolean))];
    const semesters = await prisma.academicSemester.findMany({ where: { id: { in: semIds } } });
    const semById = Object.fromEntries(semesters.map((s) => [s.id, s]));

    const seen = new Set();
    const lines = [];

    for (const r of sectionRows) {
      const courseId = r.section?.course?.id;
      const semId = r.section?.semesterId;
      const key = `${courseId}-${semId || 'x'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sem = semId ? semById[semId] : null;
      lines.push({
        term: sem?.name || 'Term',
        year: sem?.year,
        code: r.section?.course?.code,
        title: r.section?.course?.title,
        credits: r.section?.course?.credits,
        grade: r.letterGrade,
      });
    }

    for (const r of legacyRows) {
      const key = `${r.courseId}-${r.semesterId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({
        term: r.academicSemester?.name || 'Term',
        year: r.academicSemester?.year,
        code: r.course?.code,
        title: r.course?.title,
        credits: r.course?.credits,
        grade: r.letterGrade,
      });
    }

    const byTerm = {};
    for (const L of lines) {
      const k = `${L.term} ${L.year ?? ''}`.trim();
      if (!byTerm[k]) byTerm[k] = { label: k, courses: [] };
      byTerm[k].courses.push(L);
    }

    res.status(200).json({
      success: true,
      data: {
        institution: 'New Generation University College',
        student: {
          name: student.user?.name,
          studentId: student.studentId,
          email: student.user?.institutionalEmail,
        },
        degree: {
          program: student.program?.name,
          code: student.program?.code,
          department: student.department?.name,
          degreeLevel: student.program?.degreeLevel,
        },
        graduatedAt: student.graduatedAt,
        cgpa: student.cumulativeGPA ?? 0,
        totalCreditsEarned: student.totalCredits ?? 0,
        terms: Object.values(byTerm),
      },
    });
  } catch (error) {
    console.error('Transcript error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getStudentMe,
  updateStudentMe,
  getMyProfile,
  getMyCourses,
  getMyGrades,
  getMyAcademicRecord,
  getMyLifecycle,
  getMyTranscript,
};