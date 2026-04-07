const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/logistics/event/:eventId
router.get('/event/:eventId', authenticate, async (req, res) => {
  try {
    const costs = await prisma.eventLogisticsCost.findMany({
      where: { eventId: parseInt(req.params.eventId) },
      orderBy: { createdAt: 'desc' }
    });
    const totals = {
      transport: 0, food: 0, hotel: 0, other: 0, total: 0
    };
    for (const c of costs) {
      totals[c.category] = (totals[c.category] || 0) + c.amount;
      totals.total += c.amount;
    }
    res.json({ items: costs, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logistics/event/:eventId
router.post('/event/:eventId', authenticate, authorize('logistics.create'), async (req, res) => {
  try {
    const cost = await prisma.eventLogisticsCost.create({
      data: { ...req.body, eventId: parseInt(req.params.eventId) }
    });
    await logActivity(req.user.id, 'created', 'logistics_cost', cost.id, { eventId: req.params.eventId, category: req.body.category }, req.ip);
    res.status(201).json(cost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/logistics/:id
router.put('/:id', authenticate, authorize('logistics.update'), async (req, res) => {
  try {
    const cost = await prisma.eventLogisticsCost.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(cost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logistics/:id
router.delete('/:id', authenticate, authorize('logistics.delete'), async (req, res) => {
  try {
    await prisma.eventLogisticsCost.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Logistics cost deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logistics/summary — aggregate by category/month
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const costs = await prisma.eventLogisticsCost.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { event: { select: { id: true, client: { select: { companyName: true } } } } }
    });

    const byCategory = { transport: 0, food: 0, hotel: 0, other: 0 };
    let total = 0;
    for (const c of costs) {
      byCategory[c.category] = (byCategory[c.category] || 0) + c.amount;
      total += c.amount;
    }

    res.json({ byCategory, total, itemCount: costs.length, items: costs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
