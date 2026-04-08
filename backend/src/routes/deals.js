const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/deals
router.get('/', authenticate, async (req, res) => {
  try {
    const { stage, clientId, search } = req.query;
    const where = {};
    if (stage) where.stage = stage;
    if (clientId) where.clientId = parseInt(clientId);
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const deals = await prisma.deal.findMany({
      where,
      include: { client: true, events: { select: { id: true, startTime: true, status: true } }, lineItems: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(deals);
  } catch (err) {
    handleError(res, err, 'deals');
  }
});

// GET /api/deals/pipeline
router.get('/pipeline', authenticate, async (req, res) => {
  try {
    const stages = await prisma.lookupValue.findMany({
      where: { category: { slug: 'deal_stage' } },
      orderBy: { sortOrder: 'asc' }
    });

    const pipeline = await Promise.all(stages.map(async (stage) => {
      const deals = await prisma.deal.findMany({
        where: { stage: stage.value },
        include: { client: true },
        orderBy: { updatedAt: 'desc' }
      });
      return { stage: stage.value, label: stage.label, color: stage.color, deals, totalValue: deals.reduce((sum, d) => sum + (d.price || 0), 0) };
    }));
    res.json(pipeline);
  } catch (err) {
    handleError(res, err, 'deals');
  }
});

// GET /api/deals/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { client: true, events: { include: { experience: true } }, lineItems: true, documents: true }
    });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (err) {
    handleError(res, err, 'deals');
  }
});

// POST /api/deals
router.post('/', authenticate, authorize('deals.create'), async (req, res) => {
  try {
    const { lineItems, ...data } = req.body;
    const deal = await prisma.deal.create({
      data: { ...data, lineItems: lineItems ? { create: lineItems } : undefined },
      include: { client: true, lineItems: true }
    });
    await logActivity(req.user.id, 'created', 'deal', deal.id, { title: data.title, clientId: data.clientId }, req.ip);
    res.status(201).json(deal);
  } catch (err) {
    handleError(res, err, 'deals');
  }
});

// PUT /api/deals/:id
router.put('/:id', authenticate, authorize('deals.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { lineItems, ...data } = req.body;
    if (data.stage === 'completed') data.closedAt = new Date();
    if (data.stage === 'lost') data.closedAt = new Date();

    await prisma.deal.update({ where: { id }, data });

    if (lineItems) {
      await prisma.dealLineItem.deleteMany({ where: { dealId: id } });
      if (lineItems.length > 0) {
        await prisma.dealLineItem.createMany({ data: lineItems.map(l => ({ ...l, dealId: id })) });
      }
    }

    await logActivity(req.user.id, 'updated', 'deal', id, data, req.ip);
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { client: true, lineItems: true, documents: true }
    });
    res.json(deal);
  } catch (err) {
    handleError(res, err, 'deals');
  }
});

// POST /api/deals/:id/documents
router.post('/:id/documents', authenticate, authorize('deals.update'), async (req, res) => {
  try {
    const doc = await prisma.dealDocument.create({
      data: { ...req.body, dealId: parseInt(req.params.id) }
    });
    res.status(201).json(doc);
  } catch (err) {
    handleError(res, err, 'deals');
  }
});

// DELETE /api/deals/:id
router.delete('/:id', authenticate, authorize('deals.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.deal.delete({ where: { id } });
    await logActivity(req.user.id, 'deleted', 'deal', id, null, req.ip);
    res.json({ message: 'Deal deleted' });
  } catch (err) {
    handleError(res, err, 'deals');
  }
});

module.exports = router;
