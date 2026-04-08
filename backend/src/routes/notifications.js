const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ notifications, unreadCount });
  } catch (err) {
    handleError(res, err, 'notifications');
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { read: true }
    });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    handleError(res, err, 'notifications');
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    handleError(res, err, 'notifications');
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    handleError(res, err, 'notifications');
  }
});

module.exports = router;
