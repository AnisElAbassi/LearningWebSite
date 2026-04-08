const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');
const { sendThankYouEmail } = require('../services/emailService');

const eventIncludes = {
  client: true,
  experience: true,
  operator: { select: { id: true, name: true, email: true } },
  deal: true,
  hardware: { include: { item: { include: { type: true } } } },
  staff: { include: { user: { select: { id: true, name: true } } } },
  costs: true,
  checklist: { orderBy: { sortOrder: 'asc' } },
  logisticsCosts: true,
  photos: true,
  feedback: true,
  packingItems: { orderBy: { sortOrder: 'asc' } }
};

// GET /api/events
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, clientId, experienceId, operatorId, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = parseInt(clientId);
    if (experienceId) where.experienceId = parseInt(experienceId);
    if (operatorId) where.operatorId = parseInt(operatorId);
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: eventIncludes,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.event.count({ where })
    ]);
    res.json({ events, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// GET /api/events/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { ...eventIncludes, waitlist: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// POST /api/events
router.post('/', authenticate, authorize('events.create'), async (req, res) => {
  try {
    const { hardware, staff, checklist, ...data } = req.body;
    data.startTime = new Date(data.startTime);
    data.endTime = new Date(data.endTime);

    // Conflict detection for hardware
    if (hardware && hardware.length > 0) {
      const conflicts = await checkHardwareConflicts(hardware.map(h => h.itemId), data.startTime, data.endTime);
      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Hardware conflict', conflicts });
      }
    }

    // Conflict detection for operator
    if (data.operatorId) {
      const operatorConflict = await checkStaffConflict(data.operatorId, data.startTime, data.endTime);
      if (operatorConflict) {
        return res.status(409).json({ error: 'Operator has a scheduling conflict', conflict: operatorConflict });
      }
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        hardware: hardware ? { create: hardware } : undefined,
        staff: staff ? { create: staff } : undefined,
        checklist: checklist ? { create: checklist } : undefined
      },
      include: eventIncludes
    });

    // Auto-generate checklist if not provided
    if (!checklist) {
      const autoChecklist = generateChecklist(event);
      if (autoChecklist.length > 0) {
        await prisma.eventChecklist.createMany({
          data: autoChecklist.map((task, i) => ({ eventId: event.id, task, sortOrder: i }))
        });
      }
    }

    await logActivity(req.user.id, 'created', 'event', event.id, { clientId: data.clientId }, req.ip);

    const full = await prisma.event.findUnique({ where: { id: event.id }, include: eventIncludes });
    res.status(201).json(full);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// PUT /api/events/:id
router.put('/:id', authenticate, authorize('events.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { hardware, staff, checklist, ...data } = req.body;
    if (data.startTime) data.startTime = new Date(data.startTime);
    if (data.endTime) data.endTime = new Date(data.endTime);

    await prisma.event.update({ where: { id }, data });

    if (hardware) {
      await prisma.eventHardware.deleteMany({ where: { eventId: id } });
      if (hardware.length > 0) {
        await prisma.eventHardware.createMany({ data: hardware.map(h => ({ ...h, eventId: id })) });
      }
    }
    if (staff) {
      await prisma.eventStaff.deleteMany({ where: { eventId: id } });
      if (staff.length > 0) {
        await prisma.eventStaff.createMany({ data: staff.map(s => ({ ...s, eventId: id })) });
      }
    }

    await logActivity(req.user.id, 'updated', 'event', id, data, req.ip);
    const full = await prisma.event.findUnique({ where: { id }, include: eventIncludes });
    res.json(full);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// PUT /api/events/:id/status
router.put('/:id/status', authenticate, authorize('events.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const event = await prisma.event.update({ where: { id }, data: { status }, include: eventIncludes });
    await logActivity(req.user.id, 'status_changed', 'event', id, { status }, req.ip);

    // Auto-send thank you email when event is completed
    if (status === 'completed') {
      sendThankYouEmail(id).catch(err => console.error('Thank you email error:', err));
    }

    res.json(event);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// PUT /api/events/:id/checklist/:checkId
router.put('/:id/checklist/:checkId', authenticate, async (req, res) => {
  try {
    const item = await prisma.eventChecklist.update({
      where: { id: parseInt(req.params.checkId) },
      data: { isCompleted: req.body.isCompleted }
    });
    res.json(item);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// POST /api/events/:id/waitlist
router.post('/:id/waitlist', authenticate, async (req, res) => {
  try {
    const entry = await prisma.waitlistEntry.create({
      data: { ...req.body, eventId: parseInt(req.params.id) }
    });
    res.status(201).json(entry);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, authorize('events.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.event.update({ where: { id }, data: { status: 'cancelled' } });
    await logActivity(req.user.id, 'cancelled', 'event', id, null, req.ip);
    res.json({ message: 'Event cancelled' });
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// ─── CONFLICT DETECTION HELPERS ──────────────────────────────────────────────

async function checkHardwareConflicts(itemIds, startTime, endTime, excludeEventId) {
  const where = {
    itemId: { in: itemIds },
    event: {
      status: { notIn: ['cancelled', 'completed'] },
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    }
  };
  if (excludeEventId) where.event.id = { not: excludeEventId };

  const conflicts = await prisma.eventHardware.findMany({
    where,
    include: { item: true, event: { select: { id: true, startTime: true, endTime: true, client: { select: { companyName: true } } } } }
  });
  return conflicts;
}

async function checkStaffConflict(userId, startTime, endTime, excludeEventId) {
  const where = {
    operatorId: userId,
    status: { notIn: ['cancelled', 'completed'] },
    startTime: { lt: endTime },
    endTime: { gt: startTime }
  };
  if (excludeEventId) where.id = { not: excludeEventId };

  return prisma.event.findFirst({ where, select: { id: true, startTime: true, endTime: true } });
}

// POST /api/events/check-conflicts
router.post('/check-conflicts', authenticate, async (req, res) => {
  try {
    const { hardwareIds, operatorId, startTime, endTime, excludeEventId } = req.body;
    const result = { hardwareConflicts: [], operatorConflict: null };

    if (hardwareIds?.length > 0) {
      result.hardwareConflicts = await checkHardwareConflicts(hardwareIds, new Date(startTime), new Date(endTime), excludeEventId);
    }
    if (operatorId) {
      result.operatorConflict = await checkStaffConflict(operatorId, new Date(startTime), new Date(endTime), excludeEventId);
    }
    res.json(result);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

function generateChecklist(event) {
  return [
    'Verify hardware bundle is prepared and charged',
    'Test all VR headsets before session',
    'Set up play area and safety boundaries',
    'Load experience on all devices',
    'Prepare welcome materials for client',
    'Brief participants on safety procedures',
    'Run post-session equipment check',
    'Collect client feedback'
  ];
}

module.exports = router;
