const prisma = require('../services/prisma');
const crypto = require('crypto');

// ─── CREATE ASSIGNMENT ───────────────────────────────────────
const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, totalPoints, weight, courseId } = req.body;

    if (!title || !description || !dueDate || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'title, description, dueDate and courseId are required',
      });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        id: crypto.randomUUID(),
        title,
        description,
        dueDate: new Date(dueDate),
        totalPoints: totalPoints || 100,
        weight: weight || 1.0,
        courseId,
        authorId: req.user.id,
        updatedAt: new Date(),
      },
      include: {
        Course: { select: { code: true, title: true } },
      },
    });

    return res.status(201).json({ success: true, assignment });
  } catch (error) {
    console.error('Create assignment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ASSIGNMENTS FOR A COURSE ────────────────────────────
const getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      include: {
        _count: { select: { Submission: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const formatted = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      totalPoints: a.totalPoints,
      weight: a.weight,
      submissions: a._count.Submission,
      isOverdue: new Date(a.dueDate) < now,
    }));

    return res.status(200).json({ success: true, assignments: formatted });
  } catch (error) {
    console.error('Get assignments error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY ASSIGNMENTS (student — all courses) ───────────────
const getMyAssignments = async (req, res) => {
  try {
    // First get the student record
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
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
        status: { in: ['ENROLLED', 'IN_PROGRESS'] },
      },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    const assignments = await prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        Course: { select: { code: true, title: true } },
        Submission: {
          where: { studentId: req.user.id },
          select: {
            id: true,
            submittedAt: true,
            grade: true,
            feedback: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const formatted = assignments.map((a) => {
      const submission = a.Submission[0] || null;
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        totalPoints: a.totalPoints,
        courseCode: a.Course.code,
        courseTitle: a.Course.title,
        isOverdue: new Date(a.dueDate) < now && !submission,
        submitted: !!submission,
        submittedAt: submission?.submittedAt ?? null,
        grade: submission?.grade ?? null,
        feedback: submission?.feedback ?? null,
      };
    });

    // Split into pending and submitted
    const pending = formatted.filter((a) => !a.submitted);
    const submitted = formatted.filter((a) => a.submitted);

    return res.status(200).json({ success: true, pending, submitted });
  } catch (error) {
    console.error('Get my assignments error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SUBMIT ASSIGNMENT ───────────────────────────────────────
const submitAssignment = async (req, res) => {
  try {
    const { assignmentId, content, fileUrl } = req.body;

    if (!assignmentId || (!content && !fileUrl)) {
      return res.status(400).json({
        success: false,
        message: 'assignmentId and either content or fileUrl are required',
      });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const existing = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: req.user.id,
        },
      },
    });

    if (existing) {
      // Update existing submission
      const updated = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          content: content || existing.content,
          fileUrl: fileUrl || existing.fileUrl,
          submittedAt: new Date(),
        },
      });
      return res.status(200).json({
        success: true,
        message: 'Submission updated',
        submission: updated,
      });
    }

    const submission = await prisma.submission.create({
      data: {
        id: crypto.randomUUID(),
        assignmentId,
        studentId: req.user.id,
        content: content || null,
        fileUrl: fileUrl || null,
        submittedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      submission,
    });
  } catch (error) {
    console.error('Submit assignment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SUBMISSIONS FOR ASSIGNMENT (instructor) ──────────────
const getSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        User: { select: { name: true, institutionalEmail: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { title: true, totalPoints: true, dueDate: true },
    });

    const formatted = submissions.map((s) => ({
      id: s.id,
      studentName: s.User.name,
      studentEmail: s.User.institutionalEmail,
      content: s.content,
      fileUrl: s.fileUrl,
      submittedAt: s.submittedAt,
      isLate: new Date(s.submittedAt) > new Date(assignment.dueDate),
      grade: s.grade,
      feedback: s.feedback,
      graded: s.grade !== null,
    }));

    return res.status(200).json({
      success: true,
      assignment,
      submissions: formatted,
    });
  } catch (error) {
    console.error('Get submissions error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GRADE SUBMISSION ────────────────────────────────────────
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    if (grade === undefined) {
      return res.status(400).json({ success: false, message: 'grade is required' });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { Assignment: { select: { totalPoints: true } } },
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (grade < 0 || grade > submission.Assignment.totalPoints) {
      return res.status(400).json({
        success: false,
        message: `Grade must be between 0 and ${submission.Assignment.totalPoints}`,
      });
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: feedback || null,
        gradedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Submission graded',
      submission: updated,
    });
  } catch (error) {
    console.error('Grade submission error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAssignment,
  getCourseAssignments,
  getMyAssignments,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
};