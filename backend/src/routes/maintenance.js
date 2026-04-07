const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/maintenance
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, itemId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (itemId) where.itemId = parseInt(itemId);

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        item: { include: { type: true } },
        resolvedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance
router.post('/', authenticate, authorize('hardware.update'), async (req, res) => {
  try {
    const { itemId, issue } = req.body;
    const log = await prisma.maintenanceLog.create({
      data: { itemId, issue },
      include: { item: { include: { type: true } } }
    });

    // Set hardware status to maintenance
    await prisma.hardwareItem.update({
      where: { id: itemId },
      data: { status: 'maintenance' }
    });

    await logActivity(req.user.id, 'maintenance_reported', 'hardware', itemId, { issue }, req.ip);
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maintenance/:id/resolve
router.put('/:id/resolve', authenticate, authorize('hardware.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { resolution } = req.body;

    const log = await prisma.maintenanceLog.update({
      where: { id },
      data: { status: 'resolved', resolution, resolvedById: req.user.id, resolvedAt: new Date() },
      include: { item: true }
    });

    // Set hardware back to available
    await prisma.hardwareItem.update({
      where: { id: log.itemId },
      data: { status: 'available', lastMaintenanceAt: new Date() }
    });

    await logActivity(req.user.id, 'maintenance_resolved', 'hardware', log.itemId, { resolution }, req.ip);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance/due - Items due for maintenance
router.get('/due', authenticate, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const items = await prisma.hardwareItem.findMany({
      where: {
        status: { not: 'retired' },
        OR: [
          { lastMaintenanceAt: null },
          { lastMaintenanceAt: { lt: thirtyDaysAgo } }
        ]
      },
      include: { type: true },
      orderBy: { lastMaintenanceAt: 'asc' }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
