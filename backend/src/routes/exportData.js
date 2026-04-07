const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize } = require('../middleware/auth');

// GET /api/export/events
router.get('/events', authenticate, authorize('events.view'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from) where.startTime = { gte: new Date(from) };
    if (to) where.endTime = { ...(where.endTime || {}), lte: new Date(to) };

    const events = await prisma.event.findMany({
      where,
      include: { client: true, experience: true, operator: { select: { name: true } }, costs: true }
    });

    const csv = generateCSV(events.map(e => ({
      ID: e.id,
      Client: e.client.companyName,
      Experience: e.experience.name,
      Operator: e.operator?.name || '',
      StartTime: e.startTime.toISOString(),
      EndTime: e.endTime.toISOString(),
      Status: e.status,
      Participants: e.participants || '',
      Revenue: e.costs?.revenue || '',
      TotalCost: e.costs?.totalCost || '',
      Margin: e.costs?.marginPct ? `${e.costs.marginPct.toFixed(1)}%` : ''
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=events.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/clients
router.get('/clients', authenticate, authorize('clients.view'), async (req, res) => {
  try {
    const clients = await prisma.client.findMany({ include: { _count: { select: { events: true, deals: true } } } });

    const csv = generateCSV(clients.map(c => ({
      ID: c.id,
      Company: c.companyName,
      Contact: c.contactName,
      Email: c.email,
      Phone: c.phone || '',
      Industry: c.industry || '',
      TotalEvents: c._count.events,
      TotalDeals: c._count.deals,
      CreatedAt: c.createdAt.toISOString()
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/deals
router.get('/deals', authenticate, authorize('deals.view'), async (req, res) => {
  try {
    const deals = await prisma.deal.findMany({ include: { client: true } });

    const csv = generateCSV(deals.map(d => ({
      ID: d.id,
      Title: d.title,
      Client: d.client.companyName,
      Stage: d.stage,
      Price: d.price || '',
      Discount: d.discount || '',
      Stage: d.stage,
      FollowUpDate: d.followUpDate?.toISOString() || '',
      CreatedAt: d.createdAt.toISOString()
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=deals.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/hardware
router.get('/hardware', authenticate, authorize('hardware.view'), async (req, res) => {
  try {
    const items = await prisma.hardwareItem.findMany({ include: { type: true } });

    const csv = generateCSV(items.map(i => ({
      ID: i.id,
      Type: i.type.name,
      Name: i.name,
      Model: i.model || '',
      Serial: i.serialNumber || '',
      Status: i.status,
      Location: i.location || '',
      DailyRate: i.dailyRate || i.type.dailyCost || '',
      PurchasePrice: i.purchasePrice || '',
      LastMaintenance: i.lastMaintenanceAt?.toISOString() || ''
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=hardware.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generateCSV(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(','));
  }
  return lines.join('\n');
}

module.exports = router;
