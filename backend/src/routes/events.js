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
  lineItems: true,
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

// GET /api/events/pipeline — must be before /:id
router.get('/pipeline', authenticate, async (req, res) => {
  try {
    const stages = ['quote', 'confirmed', 'planning', 'prep', 'active', 'review', 'closed'];
    const stageColors = { quote: '#6b7280', confirmed: '#3b82f6', planning: '#a855f7', prep: '#f59e0b', active: '#fbbf24', review: '#f97316', closed: '#10b981' };

    const events = await prisma.event.findMany({
      where: { status: { not: 'cancelled' } },
      include: {
        client: { select: { companyName: true } },
        experience: { select: { name: true } },
        deal: { select: { id: true, title: true, price: true } },
        lineItems: true,
        hardware: true, staff: true, packingItems: true, feedback: true, costs: true,
      },
      orderBy: { updatedAt: 'desc' }
    });

    const pipeline = stages.map(stage => ({
      stage, label: stage.charAt(0).toUpperCase() + stage.slice(1), color: stageColors[stage], count: 0, events: []
    }));

    for (const event of events) {
      const col = pipeline.find(p => p.stage === event.status);
      if (!col) continue;
      const completeness = getStageCompleteness(event);
      col.count++;
      col.events.push({
        id: event.id, client: event.client?.companyName, experience: event.experience?.name,
        price: event.price || event.deal?.price || 0,
        startTime: event.startTime, endTime: event.endTime,
        completeness, updatedAt: event.updatedAt, stageUpdatedAt: event.stageUpdatedAt,
      });
    }

    res.json(pipeline);
  } catch (err) {
    handleError(res, err, 'events.pipeline');
  }
});

// POST /api/events/from-deal/:dealId — must be before /:id
router.post('/from-deal/:dealId', authenticate, authorize('events.create'), async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: { client: true, lineItems: true } });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    let experienceId = req.body.experienceId;
    if (!experienceId) {
      const firstExp = await prisma.experience.findFirst({ where: { status: 'active' } });
      if (firstExp) experienceId = firstExp.id;
      else return res.status(400).json({ error: 'No active experiences available' });
    }

    const event = await prisma.event.create({
      data: {
        clientId: deal.clientId, dealId: deal.id, experienceId,
        status: 'planning', stageUpdatedAt: new Date(), stageUpdatedBy: req.user.id,
        notes: `Created from deal: ${deal.title}`,
      },
      include: eventIncludes
    });

    await prisma.deal.update({ where: { id: dealId }, data: { stage: 'completed', closedAt: new Date() } });

    const autoChecklist = await generateChecklist();
    if (autoChecklist.length > 0) {
      await prisma.eventChecklist.createMany({ data: autoChecklist.map((task, i) => ({ eventId: event.id, task, sortOrder: i })) });
    }

    await logActivity(req.user.id, 'created', 'event', event.id, { fromDeal: dealId }, req.ip);
    const full = await prisma.event.findUnique({ where: { id: event.id }, include: eventIncludes });
    res.status(201).json(full);
  } catch (err) {
    handleError(res, err, 'events.fromDeal');
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
    const { hardware, staff, checklist, lineItems, ...data } = req.body;
    if (data.startTime) data.startTime = new Date(data.startTime);
    if (data.endTime) data.endTime = new Date(data.endTime);
    if (data.price) data.price = parseFloat(data.price);
    if (data.discount) data.discount = parseFloat(data.discount);

    // Conflict detection for hardware (only if dates + hardware provided)
    if (hardware && hardware.length > 0 && data.startTime && data.endTime) {
      const conflicts = await checkHardwareConflicts(hardware.map(h => h.itemId), data.startTime, data.endTime);
      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Hardware conflict', conflicts });
      }
    }

    // Conflict detection for operator
    if (data.operatorId && data.startTime && data.endTime) {
      const operatorConflict = await checkStaffConflict(data.operatorId, data.startTime, data.endTime);
      if (operatorConflict) {
        return res.status(409).json({ error: 'Operator has a scheduling conflict', conflict: operatorConflict });
      }
    }

    data.stageUpdatedAt = new Date();
    data.stageUpdatedBy = req.user.id;

    const event = await prisma.event.create({
      data: {
        ...data,
        lineItems: lineItems ? { create: lineItems } : undefined,
        hardware: hardware ? { create: hardware } : undefined,
        staff: staff ? { create: staff } : undefined,
        checklist: checklist ? { create: checklist } : undefined
      },
      include: eventIncludes
    });

    // Auto-generate checklist
    if (!checklist) {
      const autoChecklist = await generateChecklist();
      if (autoChecklist.length > 0) {
        await prisma.eventChecklist.createMany({
          data: autoChecklist.map((task, i) => ({ eventId: event.id, task, sortOrder: i }))
        });
      }
    }

    await logActivity(req.user.id, 'created', 'event', event.id, { status: data.status || 'quote' }, req.ip);

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
    const { hardware, staff, checklist, lineItems, ...data } = req.body;
    if (data.startTime) data.startTime = new Date(data.startTime);
    if (data.endTime) data.endTime = new Date(data.endTime);
    if (data.price !== undefined) data.price = data.price ? parseFloat(data.price) : null;
    if (data.discount !== undefined) data.discount = data.discount ? parseFloat(data.discount) : 0;

    await prisma.event.update({ where: { id }, data });

    if (lineItems) {
      await prisma.eventLineItem.deleteMany({ where: { eventId: id } });
      if (lineItems.length > 0) {
        await prisma.eventLineItem.createMany({ data: lineItems.map(l => ({ ...l, eventId: id })) });
      }
    }
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

// PUT /api/events/:id/status — manual status override
router.put('/:id/status', authenticate, authorize('events.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const data = { status, stageUpdatedAt: new Date(), stageUpdatedBy: req.user.id };
    if (status === 'confirmed') data.confirmedAt = new Date();
    if (status === 'closed') data.closedAt = new Date();

    const event = await prisma.event.update({ where: { id }, data, include: eventIncludes });
    await logActivity(req.user.id, 'status_changed', 'event', id, { status }, req.ip);

    // Auto-send thank you email when event reaches review/closed
    if (status === 'review' || status === 'closed') {
      sendThankYouEmail(id).catch(err => console.error('Thank you email error:', err));
    }

    res.json(event);
  } catch (err) {
    handleError(res, err, 'events');
  }
});

// PUT /api/events/:id/advance — workflow stage advancement with validation
router.put('/:id/advance', authenticate, authorize('events.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const event = await prisma.event.findUnique({
      where: { id },
      include: { hardware: true, staff: true, packingItems: true, feedback: true, costs: true, lineItems: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const stageOrder = ['quote', 'confirmed', 'planning', 'prep', 'active', 'review', 'closed'];
    const currentIdx = stageOrder.indexOf(event.status);
    if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) {
      return res.status(400).json({ error: 'Cannot advance from this stage', canAdvance: false, missing: [] });
    }

    const nextStage = stageOrder[currentIdx + 1];
    const missing = [];

    // Validation per transition
    switch (event.status) {
      case 'quote':
        if (!event.clientId) missing.push('Select a client');
        if (!event.experienceId) missing.push('Select an experience');
        if (!event.price && event.lineItems.length === 0) missing.push('Set a price or add line items');
        break;
      case 'confirmed':
        if (!event.startTime) missing.push('Set event start date/time');
        if (!event.endTime) missing.push('Set event end date/time');
        break;
      case 'planning':
        if (event.hardware.length === 0) missing.push('Assign at least one hardware item');
        if (event.staff.length === 0) missing.push('Assign at least one staff member');
        if (!event.operatorId) missing.push('Assign an operator');
        break;
      case 'prep':
        // Packing check is optional - just a warning
        const unpackedCount = event.packingItems.filter(p => !p.packed).length;
        if (unpackedCount > 0) missing.push(`${unpackedCount} packing items not yet packed`);
        break;
      case 'active':
        // No strict requirements to move to review
        break;
      case 'review':
        if (!event.costs) missing.push('Calculate event costs');
        break;
    }

    // For prep stage, unpacked items are warnings, not blockers
    const isBlocked = event.status === 'prep' ? false : missing.length > 0;

    if (isBlocked) {
      return res.json({ canAdvance: false, missing, currentStage: event.status, nextStage });
    }

    // Advance the stage
    const data = { status: nextStage, stageUpdatedAt: new Date(), stageUpdatedBy: req.user.id };
    if (nextStage === 'confirmed') data.confirmedAt = new Date();
    if (nextStage === 'closed') data.closedAt = new Date();

    const updated = await prisma.event.update({ where: { id }, data, include: eventIncludes });
    await logActivity(req.user.id, 'stage_advanced', 'event', id, { from: event.status, to: nextStage }, req.ip);

    // Auto-send thank you email when reaching review
    if (nextStage === 'review') {
      sendThankYouEmail(id).catch(err => console.error('Thank you email error:', err));
    }

    res.json({ canAdvance: true, missing, event: updated });
  } catch (err) {
    handleError(res, err, 'events.advance');
  }
});

// (pipeline and from-deal routes moved above /:id to avoid route matching issues)

function getStageCompleteness(event) {
  switch (event.status) {
    case 'quote': {
      const cl = !!event.clientId;
      const exp = !!event.experienceId;
      const pr = !!(event.price || (event.lineItems && event.lineItems.length > 0));
      return { done: (cl ? 1 : 0) + (exp ? 1 : 0) + (pr ? 1 : 0), total: 3, items: [{ label: 'Client', done: cl }, { label: 'Experience', done: exp }, { label: 'Price', done: pr }] };
    }
    case 'confirmed': return { done: (event.startTime ? 1 : 0) + (event.endTime ? 1 : 0), total: 2, items: [{ label: 'Start date', done: !!event.startTime }, { label: 'End date', done: !!event.endTime }] };
    case 'planning': {
      const hw = event.hardware.length > 0;
      const st = event.staff.length > 0;
      const op = !!event.operatorId;
      return { done: (hw ? 1 : 0) + (st ? 1 : 0) + (op ? 1 : 0), total: 3, items: [{ label: 'Hardware', done: hw }, { label: 'Staff', done: st }, { label: 'Operator', done: op }] };
    }
    case 'prep': {
      const packed = event.packingItems.filter(p => p.packed).length;
      const total = event.packingItems.length || 1;
      return { done: packed, total, items: [{ label: `Packed ${packed}/${event.packingItems.length}`, done: packed === event.packingItems.length }] };
    }
    case 'active': return { done: 1, total: 1, items: [{ label: 'Event running', done: true }] };
    case 'review': {
      const hasFb = Array.isArray(event.feedback) ? event.feedback.length > 0 : !!event.feedback;
      const costs = event.costs ? 1 : 0;
      return { done: (hasFb ? 1 : 0) + costs, total: 2, items: [{ label: 'Feedback', done: hasFb }, { label: 'Costs calculated', done: !!event.costs }] };
    }
    case 'closed': return { done: 1, total: 1, items: [{ label: 'Complete', done: true }] };
    default: return { done: 0, total: 1, items: [] };
  }
}

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
      status: { notIn: ['cancelled', 'closed'] },
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
    status: { notIn: ['cancelled', 'closed'] },
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

async function generateChecklist() {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'default_checklist' } });
  if (config) {
    try { return JSON.parse(config.value); } catch { }
  }
  // Fallback if config not set
  return ['Test equipment', 'Set up play area', 'Brief participants', 'Post-session check'];
}

module.exports = router;
