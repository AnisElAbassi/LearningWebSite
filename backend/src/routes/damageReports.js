const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/damage-reports
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, severity, itemId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (itemId) where.itemId = parseInt(itemId);

    const reports = await prisma.damageReport.findMany({
      where,
      include: {
        item: { include: { type: true } },
        event: { select: { id: true, client: { select: { companyName: true } } } },
        reportedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/damage-reports — report damage (auto-creates maintenance log if severity >= major)
router.post('/', authenticate, async (req, res) => {
  try {
    const { itemId, eventId, description, severity, photoUrl } = req.body;

    const report = await prisma.damageReport.create({
      data: {
        itemId, eventId: eventId || null,
        reportedById: req.user.id,
        description, severity: severity || 'minor', photoUrl
      },
      include: { item: { include: { type: true } } }
    });

    // Auto-create maintenance log for major/critical damage
    if (severity === 'major' || severity === 'critical') {
      await prisma.maintenanceLog.create({
        data: {
          itemId,
          issue: `Damage reported: ${description}`,
          status: 'open',
          damageReportId: report.id
        }
      });

      // Set hardware status to maintenance
      await prisma.hardwareItem.update({
        where: { id: itemId },
        data: { status: 'maintenance' }
      });

      // Notify admins
      const admins = await prisma.user.findMany({ where: { role: { name: 'admin' } } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'damage_report',
            title: `${severity.toUpperCase()} Damage Reported`,
            message: `${report.item.name}: ${description}`,
            actionUrl: `/hardware/${itemId}`
          }
        });
      }
    }

    await logActivity(req.user.id, 'created', 'damage_report', report.id, { itemId, severity }, req.ip);
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/damage-reports/:id/resolve
router.put('/:id/resolve', authenticate, authorize('hardware.update'), async (req, res) => {
  try {
    const report = await prisma.damageReport.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'resolved', resolvedAt: new Date() }
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
