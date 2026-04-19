const prisma = require('../services/prisma');
const { getNotifications, markAsRead } = require('../services/notification.service');
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

module.exports = {
  getMyNotifications,
  markRead,
};
