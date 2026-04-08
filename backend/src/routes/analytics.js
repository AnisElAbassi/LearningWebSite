const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate } = require('../middleware/auth');

// GET /api/analytics/dashboard - Main dashboard widgets
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      todayEvents,
      upcomingEvents,
      hardwareStats,
      monthRevenue,
      lastMonthRevenue,
      totalClients,
      activeDeals,
      overdueInvoices,
      maintenanceAlerts,
      popularExperiences,
      recentActivity,
      staffToday,
      hwInUse,
      hwTotal,
      invoicesDueSoon,
      revenueTrend
    ] = await Promise.all([
      // Today's events
      prisma.event.findMany({
        where: { startTime: { gte: todayStart, lt: todayEnd }, status: { not: 'cancelled' } },
        include: { client: { select: { companyName: true } }, experience: { select: { name: true } }, operator: { select: { name: true } } },
        orderBy: { startTime: 'asc' }
      }),
      // Upcoming 7 days
      prisma.event.findMany({
        where: { startTime: { gte: todayEnd, lt: weekEnd }, status: { not: 'cancelled' } },
        include: { client: { select: { companyName: true } }, experience: { select: { name: true } } },
        orderBy: { startTime: 'asc' },
        take: 10
      }),
      // Hardware availability snapshot
      prisma.hardwareItem.groupBy({
        by: ['status'],
        _count: true
      }),
      // This month's revenue
      prisma.eventCost.aggregate({
        where: { event: { startTime: { gte: monthStart }, status: { notIn: ['cancelled'] } } },
        _sum: { revenue: true, totalCost: true }
      }),
      // Last month's revenue
      prisma.eventCost.aggregate({
        where: { event: { startTime: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['cancelled'] } } },
        _sum: { revenue: true }
      }),
      // Total clients
      prisma.client.count(),
      // Active deals
      prisma.deal.count({ where: { stage: { notIn: ['completed', 'lost'] } } }),
      // Overdue invoices
      prisma.invoice.findMany({
        where: { status: 'overdue' },
        include: { client: { select: { companyName: true } } },
        take: 5
      }),
      // Maintenance alerts
      prisma.maintenanceLog.findMany({
        where: { status: { not: 'resolved' } },
        include: { item: { include: { type: true } } },
        take: 5
      }),
      // Most popular experiences (last 90 days)
      prisma.event.groupBy({
        by: ['experienceId'],
        where: { startTime: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }, status: { notIn: ['cancelled'] } },
        _count: true,
        orderBy: { _count: { experienceId: 'desc' } },
        take: 5
      }),
      // Recent activity
      prisma.activityLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),
      // Staff assigned to today's events
      prisma.eventStaff.findMany({
        where: { event: { startTime: { gte: todayStart, lt: todayEnd }, status: { not: 'cancelled' } } },
        include: { user: { select: { name: true } }, event: { select: { startTime: true, endTime: true, client: { select: { companyName: true } } } } }
      }),
      // Hardware utilization
      prisma.hardwareItem.count({ where: { status: 'in_use' } }),
      prisma.hardwareItem.count({ where: { status: { not: 'retired' } } }),
      // Invoices due within 7 days
      prisma.invoice.findMany({
        where: { dueDate: { gte: todayStart, lte: weekEnd }, status: { notIn: ['paid', 'cancelled'] } },
        include: { client: { select: { companyName: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),
      // Revenue trend (last 6 months for sparkline)
      (async () => {
        const trend = [];
        for (let i = 5; i >= 0; i--) {
          const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
          const r = await prisma.eventCost.aggregate({ where: { event: { startTime: { gte: s, lte: e }, status: { notIn: ['cancelled'] } } }, _sum: { revenue: true } });
          trend.push(r._sum.revenue || 0);
        }
        return trend;
      })()
    ]);

    // Enrich popular experiences with names
    const experienceIds = popularExperiences.map(p => p.experienceId);
    const experiences = await prisma.experience.findMany({ where: { id: { in: experienceIds } } });
    const expMap = Object.fromEntries(experiences.map(e => [e.id, e.name]));

    res.json({
      todayEvents,
      upcomingEvents,
      hardwareStats: hardwareStats.map(s => ({ status: s.status, count: s._count })),
      revenue: {
        thisMonth: monthRevenue._sum.revenue || 0,
        lastMonth: lastMonthRevenue._sum.revenue || 0,
        thisMonthCost: monthRevenue._sum.totalCost || 0
      },
      totalClients,
      activeDeals,
      overdueInvoices,
      maintenanceAlerts,
      popularExperiences: popularExperiences.map(p => ({
        experienceId: p.experienceId,
        name: expMap[p.experienceId] || 'Unknown',
        count: p._count
      })),
      recentActivity,
      currentMargin: monthRevenue._sum.revenue > 0
        ? ((monthRevenue._sum.revenue - (monthRevenue._sum.totalCost || 0)) / monthRevenue._sum.revenue * 100)
        : 0,
      staffToday: staffToday.map(s => ({ name: s.user.name, client: s.event.client.companyName, start: s.event.startTime, end: s.event.endTime })),
      hardwareUtilization: hwTotal > 0 ? Math.round((hwInUse / hwTotal) * 100) : 0,
      invoicesDueSoon,
      revenueTrend,
    });
  } catch (err) {
    handleError(res, err, 'analytics');
  }
});

// GET /api/analytics/revenue-chart
router.get('/revenue-chart', authenticate, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = [];
    const now = new Date();

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const result = await prisma.eventCost.aggregate({
        where: { event: { startTime: { gte: start, lte: end }, status: { notIn: ['cancelled'] } } },
        _sum: { revenue: true, totalCost: true }
      });

      data.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: result._sum.revenue || 0,
        cost: result._sum.totalCost || 0,
        profit: (result._sum.revenue || 0) - (result._sum.totalCost || 0)
      });
    }

    res.json(data);
  } catch (err) {
    handleError(res, err, 'analytics');
  }
});

// GET /api/analytics/experience-recommender
router.get('/experience-recommender', authenticate, async (req, res) => {
  try {
    const { industry, groupSize, duration } = req.query;
    const where = { status: 'active' };
    if (groupSize) {
      where.minPlayers = { lte: parseInt(groupSize) };
      where.maxPlayers = { gte: parseInt(groupSize) };
    }
    if (duration) where.durationMin = { lte: parseInt(duration) };

    let experiences = await prisma.experience.findMany({
      where,
      include: { tags: { include: { tag: true } }, _count: { select: { events: true } } },
      orderBy: { events: { _count: 'desc' } }
    });

    // Simple scoring: more events = more popular = higher recommendation
    experiences = experiences.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      minPlayers: e.minPlayers,
      maxPlayers: e.maxPlayers,
      durationMin: e.durationMin,
      difficulty: e.difficulty,
      tags: e.tags.map(t => t.tag.name),
      popularity: e._count.events,
      score: e._count.events * 10 + (e.difficulty <= 3 ? 5 : 0) // Simple recommendation score
    })).sort((a, b) => b.score - a.score);

    res.json(experiences.slice(0, 5));
  } catch (err) {
    handleError(res, err, 'analytics');
  }
});

// GET /api/analytics/deal-funnel — deals grouped by stage
router.get('/deal-funnel', authenticate, async (req, res) => {
  try {
    const stages = ['prospect', 'proposal_sent', 'negotiating', 'confirmed', 'completed', 'lost'];
    const counts = await prisma.deal.groupBy({ by: ['stage'], _count: true, _sum: { price: true } });
    const result = stages.map(stage => {
      const match = counts.find(c => c.stage === stage);
      return {
        stage,
        label: stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: match?._count || 0,
        value: match?._sum?.price || 0,
      };
    });
    res.json(result);
  } catch (err) {
    handleError(res, err, 'analytics');
  }
});

// GET /api/analytics/margin-trend — monthly margin % over time
router.get('/margin-trend', authenticate, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = [];
    const now = new Date();

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const result = await prisma.eventCost.aggregate({
        where: { event: { startTime: { gte: start, lte: end }, status: { notIn: ['cancelled'] } } },
        _sum: { revenue: true, totalCost: true },
        _count: true,
      });
      const rev = result._sum.revenue || 0;
      const cost = result._sum.totalCost || 0;
      data.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        margin: rev > 0 ? ((rev - cost) / rev * 100) : 0,
        events: result._count,
      });
    }

    res.json(data);
  } catch (err) {
    handleError(res, err, 'analytics');
  }
});

module.exports = router;
