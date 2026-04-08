const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/hardware
router.get('/', authenticate, async (req, res) => {
  try {
    const { typeId, status, search, location } = req.query;
    const where = {};
    if (typeId) where.typeId = parseInt(typeId);
    if (status) where.status = status;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.hardwareItem.findMany({
      where,
      include: { type: true, maintenanceLogs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (err) {
    handleError(res, err, 'hardware');
  }
});

// GET /api/hardware/available - Check availability for a date range
router.get('/available', authenticate, async (req, res) => {
  try {
    const { startTime, endTime, typeId } = req.query;
    if (!startTime || !endTime) return res.status(400).json({ error: 'startTime and endTime required' });

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Find hardware that is NOT booked during this time range
    const bookedItemIds = await prisma.eventHardware.findMany({
      where: {
        event: {
          status: { notIn: ['cancelled'] },
          OR: [
            { startTime: { lt: end }, endTime: { gt: start } }
          ]
        }
      },
      select: { itemId: true }
    });

    const bookedIds = bookedItemIds.map(b => b.itemId);

    const whereClause = {
      status: 'available',
      id: { notIn: bookedIds }
    };
    if (typeId) whereClause.typeId = parseInt(typeId);

    const available = await prisma.hardwareItem.findMany({
      where: whereClause,
      include: { type: true }
    });
    res.json(available);
  } catch (err) {
    handleError(res, err, 'hardware');
  }
});

// GET /api/hardware/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.hardwareItem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        type: true,
        maintenanceLogs: { include: { resolvedBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        eventHardware: { include: { event: { include: { client: true, experience: true } } }, orderBy: { event: { startTime: 'desc' } }, take: 20 }
      }
    });
    if (!item) return res.status(404).json({ error: 'Hardware item not found' });
    res.json(item);
  } catch (err) {
    handleError(res, err, 'hardware');
  }
});

// POST /api/hardware
router.post('/', authenticate, authorize('hardware.create'), async (req, res) => {
  try {
    const item = await prisma.hardwareItem.create({
      data: req.body,
      include: { type: true }
    });
    await logActivity(req.user.id, 'created', 'hardware', item.id, { name: req.body.name }, req.ip);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Serial number already exists' });
    handleError(res, err, 'hardware');
  }
});

// PUT /api/hardware/:id
router.put('/:id', authenticate, authorize('hardware.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.hardwareItem.update({
      where: { id },
      data: req.body,
      include: { type: true }
    });
    await logActivity(req.user.id, 'updated', 'hardware', id, { name: req.body.name }, req.ip);
    res.json(item);
  } catch (err) {
    handleError(res, err, 'hardware');
  }
});

// DELETE /api/hardware/:id
router.delete('/:id', authenticate, authorize('hardware.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.hardwareItem.update({ where: { id }, data: { status: 'retired' } });
    await logActivity(req.user.id, 'retired', 'hardware', id, null, req.ip);
    res.json({ message: 'Hardware item retired' });
  } catch (err) {
    handleError(res, err, 'hardware');
  }
});

module.exports = router;
