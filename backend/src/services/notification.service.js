const prisma = require('./prisma');

/**
 * @desc    Send notification to a user
 * @param   {string} userId - Target user ID
 * @param   {string} title - Notification title
 * @param   {string} message - Notification message
 * @param   {string} type - INFO, SUCCESS, WARNING, ERROR
 */
const sendNotification = async (userId, title, message, type = 'INFO') => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
    return notification;
  } catch (error) {
    console.error('Send notification error:', error);
  }
};

/**
 * @desc    Get user's notifications
 * @param   {string} userId 
 */
const getNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

/**
 * @desc    Mark notification as read
 * @param   {string} id 
 */
const markAsRead = async (id) => {
  return await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

module.exports = {
  sendNotification,
  getNotifications,
  markAsRead,
};
