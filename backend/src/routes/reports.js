const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize } = require('../middleware/auth');

// GET /api/reports/monthly — monthly business report
router.get('/monthly', authenticate, authorize('reports.view'), async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    // Events
    const events = await prisma.event.findMany({
      where: { startTime: { gte: startDate, lte: endDate }, status: { notIn: ['cancelled'] } },
      include: { client: { select: { companyName: true } }, experience: { select: { name: true } }, costs: true, staff: true }
    });

    // Costs
    const costs = events.filter(e => e.costs).map(e => e.costs);
    const totalRevenue = costs.reduce((sum, c) => sum + c.revenue, 0);
    const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
    const experienceCost = costs.reduce((sum, c) => sum + c.experienceCost, 0);
    const personnelCost = costs.reduce((sum, c) => sum + c.personnelCost, 0);
    const logisticsTotal = costs.reduce((sum, c) => sum + c.logisticsTotal, 0);

    // Logistics breakdown
    const logistics = await prisma.eventLogisticsCost.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } }
    });
    const logisticsBreakdown = { transport: 0, food: 0, hotel: 0, other: 0 };
    logistics.forEach(l => { logisticsBreakdown[l.category] = (logisticsBreakdown[l.category] || 0) + l.amount; });

    // Top clients by revenue
    const clientRevenue = {};
    events.forEach(e => {
      const name = e.client.companyName;
      if (!clientRevenue[name]) clientRevenue[name] = { name, revenue: 0, events: 0 };
      clientRevenue[name].revenue += e.costs?.revenue || 0;
      clientRevenue[name].events++;
    });
    const topClients = Object.values(clientRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Top experiences by bookings
    const expBookings = {};
    events.forEach(e => {
      const name = e.experience.name;
      if (!expBookings[name]) expBookings[name] = { name, count: 0, revenue: 0 };
      expBookings[name].count++;
      expBookings[name].revenue += e.costs?.revenue || 0;
    });
    const topExperiences = Object.values(expBookings).sort((a, b) => b.count - a.count).slice(0, 5);

    // Staff hours
    const staffHours = {};
    events.forEach(e => {
      e.staff.forEach(s => {
        if (!staffHours[s.userId]) staffHours[s.userId] = { hours: 0, cost: 0 };
        staffHours[s.userId].hours += s.hoursWorked;
        staffHours[s.userId].cost += s.totalCost;
      });
    });

    // Hardware utilization
    const totalHardware = await prisma.hardwareItem.count({ where: { status: { not: 'retired' } } });
    const usedHardwareIds = await prisma.eventHardware.findMany({
      where: { event: { startTime: { gte: startDate, lte: endDate }, status: { notIn: ['cancelled'] } } },
      select: { itemId: true },
      distinct: ['itemId']
    });
    const utilizationRate = totalHardware > 0 ? (usedHardwareIds.length / totalHardware) * 100 : 0;

    // Invoices
    const invoices = await prisma.invoice.findMany({
      where: { issueDate: { gte: startDate, lte: endDate } }
    });
    const invoicesPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
    const invoicesOutstanding = invoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status)).reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

    // Feedback
    const feedback = await prisma.eventFeedback.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } }
    });
    const avgSatisfaction = feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : null;

    res.json({
      period: { year: y, month: m, label: new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) },
      events: { total: events.length, completed: events.filter(e => e.status === 'completed').length },
      financial: { totalRevenue, totalCost, netMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0, experienceCost, personnelCost, logisticsTotal, logisticsBreakdown },
      invoices: { total: invoices.length, paid: invoicesPaid, outstanding: invoicesOutstanding },
      topClients,
      topExperiences,
      totalStaffHours: Object.values(staffHours).reduce((sum, s) => sum + s.hours, 0),
      totalStaffCost: Object.values(staffHours).reduce((sum, s) => sum + s.cost, 0),
      hardwareUtilization: utilizationRate,
      avgSatisfaction,
      feedbackCount: feedback.length
    });
  } catch (err) {
    handleError(res, err, 'reports');
  }
});

// GET /api/reports/event/:eventId — post-event report data
router.get('/event/:eventId', authenticate, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.eventId) },
      include: {
        client: true,
        experience: true,
        operator: { select: { name: true } },
        hardware: { include: { item: { include: { type: true } } } },
        staff: { include: { user: { select: { name: true } } } },
        costs: true,
        photos: true,
        feedback: true,
        logisticsCosts: true,
        checklist: true,
        packingItems: true
      }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    handleError(res, err, 'reports');
  }
});

// GET /api/reports/client/:clientId — client summary report
router.get('/client/:clientId', authenticate, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { customFields: { include: { field: true } } }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const events = await prisma.event.findMany({
      where: { clientId },
      include: { experience: { select: { name: true } }, costs: true },
      orderBy: { startTime: 'desc' }
    });

    const feedback = await prisma.eventFeedback.findMany({
      where: { clientId },
      include: { event: { select: { startTime: true, experience: { select: { name: true } } } } }
    });

    const invoices = await prisma.invoice.findMany({
      where: { clientId },
      include: { payments: true }
    });

    const totalRevenue = events.filter(e => e.costs).reduce((sum, e) => sum + (e.costs?.revenue || 0), 0);
    const totalCost = events.filter(e => e.costs).reduce((sum, e) => sum + (e.costs?.totalCost || 0), 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);

    res.json({
      client,
      stats: {
        totalEvents: events.length,
        completedEvents: events.filter(e => e.status === 'completed').length,
        totalRevenue,
        totalCost,
        avgMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0,
        totalInvoiced,
        totalPaid,
        outstanding: totalInvoiced - totalPaid,
        avgSatisfaction: client.satisfactionAvg,
        firstEvent: events.length > 0 ? events[events.length - 1].startTime : null,
        lastEvent: events.length > 0 ? events[0].startTime : null
      },
      events,
      feedback,
      invoices
    });
  } catch (err) {
    handleError(res, err, 'reports');
  }
});

module.exports = router;
