const prisma = require('../services/prisma');
const { getNotifications, markAsRead, sendNotification } = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get current user's notifications
 * @route   GET /api/users/notifications
 * @access  Private
 */
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await getNotifications(req.user.id);
  res.status(200).json({
    success: true,
    data: notifications,
  });
});

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/users/notifications/:id/read
 * @access  Private
 */
const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await markAsRead(id);
  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
  });
});

/**
 * @desc    Send a notification (direct message) to a user
 * @route   POST /api/users/notifications
 * @access  Private (Instructor, Admin, Registrar)
 */
const sendUserNotification = asyncHandler(async (req, res) => {
  const { userId, title, message, type } = req.body || {};

  if (!userId || !title || !message) {
    return res.status(400).json({ success: false, message: 'userId, title, and message are required' });
  }

  if (req.user.role === 'INSTRUCTOR') {
    const allowed = await prisma.sectionEnrollment.findFirst({
      where: {
        section: { instructor: { userId: req.user.id } },
        student: { userId },
      },
      select: { id: true },
    });
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You can only message students in your sections' });
    }
  }

  const notif = await sendNotification(userId, title, message, type || 'INFO');
  return res.status(201).json({ success: true, data: notif });
});

module.exports = {
  getMyNotifications,
  markRead,
  sendUserNotification,
};
