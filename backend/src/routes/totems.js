const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/totems
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, location } = req.query;
    const where = {};
    if (status) where.status = status;
    if (location) where.location = { contains: location, mode: 'insensitive' };

    const totems = await prisma.totem.findMany({
      where,
      include: { currentExperience: true, reservations: { where: { endTime: { gte: new Date() } }, include: { event: { include: { client: true } } } } },
      orderBy: { name: 'asc' }
    });
    res.json(totems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/totems/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const totem = await prisma.totem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        currentExperience: true,
        reservations: { include: { event: { include: { client: true, experience: true } } }, orderBy: { startTime: 'desc' }, take: 20 },
        usageHistory: { orderBy: { timestamp: 'desc' }, take: 50 }
      }
    });
    if (!totem) return res.status(404).json({ error: 'Totem not found' });
    res.json(totem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/totems
router.post('/', authenticate, authorize('totems.create'), async (req, res) => {
  try {
    const totem = await prisma.totem.create({ data: req.body, include: { currentExperience: true } });
    await logActivity(req.user.id, 'created', 'totem', totem.id, { serialNumber: req.body.serialNumber }, req.ip);
    res.status(201).json(totem);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Serial number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/totems/:id
router.put('/:id', authenticate, authorize('totems.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const totem = await prisma.totem.update({ where: { id }, data: req.body, include: { currentExperience: true } });
    await logActivity(req.user.id, 'updated', 'totem', id, req.body, req.ip);
    res.json(totem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/totems/:id/status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const totem = await prisma.totem.update({ where: { id }, data: { status, lastPingAt: new Date() } });

    await prisma.totemUsageLog.create({
      data: { totemId: id, action: `status_${status}`, details: `Status changed to ${status}` }
    });

    res.json(totem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/totems/:id/content
router.put('/:id/content', authenticate, authorize('totems.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { currentExperienceId, mediaContent } = req.body;
    const totem = await prisma.totem.update({
      where: { id },
      data: { currentExperienceId, mediaContent: mediaContent ? JSON.stringify(mediaContent) : undefined },
      include: { currentExperience: true }
    });

    await prisma.totemUsageLog.create({
      data: { totemId: id, action: 'loaded', details: `Experience loaded: ${currentExperienceId}` }
    });

    res.json(totem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/totems/:id
router.delete('/:id', authenticate, authorize('totems.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.totem.delete({ where: { id } });
    await logActivity(req.user.id, 'deleted', 'totem', id, null, req.ip);
    res.json({ message: 'Totem deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
