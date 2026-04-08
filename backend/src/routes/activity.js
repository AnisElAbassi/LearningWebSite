const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize } = require('../middleware/auth');

// GET /api/activity
router.get('/', authenticate, authorize('activity.view'), async (req, res) => {
  try {
    const { userId, entityType, action, page = 1, limit = 50 } = req.query;
    const where = {};
    if (userId) where.userId = parseInt(userId);
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.activityLog.count({ where })
    ]);
    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    handleError(res, err, 'activity');
  }
});

module.exports = router;
