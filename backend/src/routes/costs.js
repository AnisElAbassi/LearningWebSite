const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize } = require('../middleware/auth');
const handleError = require('../utils/handleError');

// POST /api/costs/calculate/:eventId — full cost calculation with depreciation
router.post('/calculate/:eventId', authenticate, authorize('costs.manage'), async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        hardware: { include: { item: { include: { type: true } } } },
        staff: true,
        deal: true,
        logisticsCosts: true
      }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // 1. Experience Cost — depreciation per use of each hardware item
    let experienceCost = 0;
    for (const eh of event.hardware) {
      const item = eh.item;
      const expectedUses = item.expectedLifespanUses || item.type.expectedUses || 0;
      const depPerUse = item.depreciationPerUse || (item.purchasePrice && expectedUses ? item.purchasePrice / expectedUses : item.dailyRate || item.type.dailyCost || 0);
      experienceCost += depPerUse * eh.quantity;
    }

    // 2. Personnel Cost
    let personnelCost = 0;
    for (const staff of event.staff) {
      personnelCost += staff.totalCost;
    }

    // 3. Logistics Cost — from EventLogisticsCost records
    let transportCost = 0, foodCost = 0, hotelCost = 0, otherLogistics = 0;
    for (const lc of event.logisticsCosts) {
      switch (lc.category) {
        case 'transport': transportCost += lc.amount; break;
        case 'food': foodCost += lc.amount; break;
        case 'hotel': hotelCost += lc.amount; break;
        default: otherLogistics += lc.amount; break;
      }
    }
    const logisticsTotal = transportCost + foodCost + hotelCost + otherLogistics;

    // 4. Revenue from deal
    const revenue = event.deal ? (event.deal.price || 0) - (event.deal.discount || 0) : 0;

    // 5. Totals
    const totalCost = experienceCost + personnelCost + logisticsTotal;
    const marginAmount = revenue - totalCost;
    const marginPct = revenue > 0 ? (marginAmount / revenue) * 100 : 0;

    // Run all writes in a transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Upsert event cost
      const cost = await tx.eventCost.upsert({
        where: { eventId },
        update: {
          experienceCost, personnelCost, transportCost, foodCost, hotelCost, otherLogistics,
          logisticsTotal, totalCost, revenue, marginAmount, marginPct, calculatedAt: new Date()
        },
        create: {
          eventId, experienceCost, personnelCost, transportCost, foodCost, hotelCost, otherLogistics,
          logisticsTotal, totalCost, revenue, marginAmount, marginPct
        }
      });

      // Check margin alert
      const thresholdConfig = await tx.systemConfig.findUnique({ where: { key: 'margin_alert_threshold' } });
      const threshold = thresholdConfig ? parseFloat(thresholdConfig.value) : 30;
      const isLowMargin = revenue > 0 && marginPct < threshold;

      if (isLowMargin) {
        const admins = await tx.user.findMany({ where: { role: { name: 'admin' } } });
        for (const admin of admins) {
          await tx.notification.create({
            data: {
              userId: admin.id, type: 'margin_alert', title: 'Low Margin Alert',
              message: `Event #${eventId} margin is ${marginPct.toFixed(1)}% (below ${threshold}%)`,
              actionUrl: `/events/${eventId}`
            }
          });
        }
      }

      // If event is completed, increment hardware use counts and create depreciation logs
      if (event.status === 'review' || event.status === 'closed') {
        for (const eh of event.hardware) {
          const item = eh.item;
          const expectedUses = item.expectedLifespanUses || item.type.expectedUses || 0;
          const depPerUse = item.depreciationPerUse || (item.purchasePrice && expectedUses ? item.purchasePrice / expectedUses : 0);

          const existing = await tx.assetDepreciationLog.findFirst({
            where: { itemId: item.id, eventId }
          });
          if (!existing && depPerUse > 0) {
            const newUseCount = item.currentUseCount + eh.quantity;
            const newBookValue = Math.max(0, (item.purchasePrice || 0) - (depPerUse * newUseCount));
            const eolReached = expectedUses > 0 && (newUseCount / expectedUses) >= (item.type.eolAlertThreshold || 0.8);

            await tx.hardwareItem.update({
              where: { id: item.id },
              data: { currentUseCount: newUseCount, bookValue: newBookValue, depreciationPerUse: depPerUse, eolReached }
            });

            await tx.assetDepreciationLog.create({
              data: { itemId: item.id, eventId, depreciationAmt: depPerUse * eh.quantity, useCountAfter: newUseCount, bookValueAfter: newBookValue }
            });

            if (eolReached && !item.eolReached) {
              const admins = await tx.user.findMany({ where: { role: { name: 'admin' } } });
              for (const admin of admins) {
                await tx.notification.create({
                  data: {
                    userId: admin.id, type: 'hardware_eol', title: 'Asset Near End of Life',
                    message: `${item.name}: ${newUseCount}/${expectedUses} uses (${((newUseCount / expectedUses) * 100).toFixed(0)}%)`,
                    actionUrl: `/hardware/${item.id}`
                  }
                });
              }
            }
          }
        }
      }

      return { ...cost, isLowMargin, threshold };
    });

    res.json(result);
  } catch (err) {
    handleError(res, err, 'costs');
  }
});

// GET /api/costs/event/:eventId
router.get('/event/:eventId', authenticate, async (req, res) => {
  try {
    const cost = await prisma.eventCost.findUnique({
      where: { eventId: parseInt(req.params.eventId) },
      include: { event: { include: { client: true, experience: true } } }
    });
    if (!cost) return res.status(404).json({ error: 'Cost data not found. Calculate costs first.' });
    res.json(cost);
  } catch (err) {
    handleError(res, err, 'costs');
  }
});

// GET /api/costs/pnl — Monthly P&L with new cost tiers
router.get('/pnl', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const costs = await prisma.eventCost.findMany({
      where: { event: { startTime: { gte: startDate, lte: endDate }, status: { notIn: ['cancelled'] } } },
      include: { event: { include: { experience: true, client: true } } }
    });

    const summary = {
      totalRevenue: costs.reduce((sum, c) => sum + c.revenue, 0),
      totalCost: costs.reduce((sum, c) => sum + c.totalCost, 0),
      experienceCost: costs.reduce((sum, c) => sum + c.experienceCost, 0),
      personnelCost: costs.reduce((sum, c) => sum + c.personnelCost, 0),
      logisticsTotal: costs.reduce((sum, c) => sum + c.logisticsTotal, 0),
      logisticsBreakdown: {
        transport: costs.reduce((sum, c) => sum + c.transportCost, 0),
        food: costs.reduce((sum, c) => sum + c.foodCost, 0),
        hotel: costs.reduce((sum, c) => sum + c.hotelCost, 0),
        other: costs.reduce((sum, c) => sum + c.otherLogistics, 0),
      },
      netMargin: 0,
      eventCount: costs.length,
      events: costs
    };
    summary.netMargin = summary.totalRevenue > 0 ? ((summary.totalRevenue - summary.totalCost) / summary.totalRevenue * 100) : 0;

    res.json(summary);
  } catch (err) {
    handleError(res, err, 'costs');
  }
});

// GET /api/costs/profitability/experiences
router.get('/profitability/experiences', authenticate, async (req, res) => {
  try {
    const costs = await prisma.eventCost.findMany({
      include: { event: { include: { experience: true } } }
    });
    const byExperience = {};
    for (const c of costs) {
      const name = c.event.experience.name;
      if (!byExperience[name]) byExperience[name] = { name, totalRevenue: 0, totalCost: 0, count: 0 };
      byExperience[name].totalRevenue += c.revenue;
      byExperience[name].totalCost += c.totalCost;
      byExperience[name].count++;
    }
    const result = Object.values(byExperience).map(e => ({
      ...e, avgMargin: e.totalRevenue > 0 ? ((e.totalRevenue - e.totalCost) / e.totalRevenue * 100) : 0
    })).sort((a, b) => b.avgMargin - a.avgMargin);
    res.json(result);
  } catch (err) {
    handleError(res, err, 'costs');
  }
});

// GET /api/costs/profitability/clients
router.get('/profitability/clients', authenticate, async (req, res) => {
  try {
    const costs = await prisma.eventCost.findMany({
      include: { event: { include: { client: true } } }
    });
    const byClient = {};
    for (const c of costs) {
      const name = c.event.client.companyName;
      if (!byClient[name]) byClient[name] = { name, totalRevenue: 0, totalCost: 0, count: 0 };
      byClient[name].totalRevenue += c.revenue;
      byClient[name].totalCost += c.totalCost;
      byClient[name].count++;
    }
    const result = Object.values(byClient).map(cl => ({
      ...cl, avgMargin: cl.totalRevenue > 0 ? ((cl.totalRevenue - cl.totalCost) / cl.totalRevenue * 100) : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    res.json(result);
  } catch (err) {
    handleError(res, err, 'costs');
  }
});

module.exports = router;
