const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate } = require('../middleware/auth');

// GET /api/calendar - Events for calendar view
router.get('/', authenticate, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });

    const events = await prisma.event.findMany({
      where: {
        startTime: { gte: new Date(start) },
        endTime: { lte: new Date(end) },
        status: { not: 'cancelled' }
      },
      include: {
        client: { select: { companyName: true } },
        experience: { select: { name: true } },
        operator: { select: { name: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    // Transform to FullCalendar format
    const calendarEvents = events.map(e => ({
      id: e.id,
      title: `${e.client.companyName} - ${e.experience.name}`,
      start: e.startTime,
      end: e.endTime,
      backgroundColor: getStatusColor(e.status),
      borderColor: getStatusColor(e.status),
      extendedProps: {
        status: e.status,
        clientName: e.client.companyName,
        experienceName: e.experience.name,
        operatorName: e.operator?.name,
        participants: e.participants
      }
    }));

    res.json(calendarEvents);
  } catch (err) {
    handleError(res, err, 'calendar');
  }
});

// GET /api/calendar/staff/:userId - Staff schedule
router.get('/staff/:userId', authenticate, async (req, res) => {
  try {
    const { start, end } = req.query;
    const userId = parseInt(req.params.userId);

    const events = await prisma.event.findMany({
      where: {
        OR: [
          { operatorId: userId },
          { staff: { some: { userId } } }
        ],
        startTime: { gte: new Date(start) },
        endTime: { lte: new Date(end) },
        status: { not: 'cancelled' }
      },
      include: {
        client: { select: { companyName: true } },
        experience: { select: { name: true } }
      }
    });

    res.json(events.map(e => ({
      id: e.id,
      title: `${e.client.companyName} - ${e.experience.name}`,
      start: e.startTime,
      end: e.endTime,
      backgroundColor: '#7b2ff7',
      borderColor: '#7b2ff7'
    })));
  } catch (err) {
    handleError(res, err, 'calendar');
  }
});

// GET /api/calendar/smart-slots - AI-powered optimal time suggestions
router.get('/smart-slots', authenticate, async (req, res) => {
  try {
    const { date, experienceId, duration = 60 } = req.query;
    const targetDate = new Date(date);
    const dayStart = new Date(targetDate.setHours(9, 0, 0, 0));
    const dayEnd = new Date(targetDate.setHours(21, 0, 0, 0));

    // Get all events for that day
    const events = await prisma.event.findMany({
      where: {
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd },
        status: { notIn: ['cancelled'] }
      },
      orderBy: { startTime: 'asc' }
    });

    // Find gaps
    const slots = [];
    let cursor = new Date(dayStart);
    const durationMs = parseInt(duration) * 60 * 1000;
    const bufferMs = 15 * 60 * 1000;

    for (const event of events) {
      const gap = event.startTime.getTime() - cursor.getTime();
      if (gap >= durationMs + bufferMs) {
        slots.push({ start: new Date(cursor), end: new Date(cursor.getTime() + durationMs) });
      }
      cursor = new Date(event.endTime.getTime() + bufferMs);
    }

    // Check remaining time after last event
    if (dayEnd.getTime() - cursor.getTime() >= durationMs) {
      slots.push({ start: new Date(cursor), end: new Date(cursor.getTime() + durationMs) });
    }

    res.json(slots);
  } catch (err) {
    handleError(res, err, 'calendar');
  }
});

function getStatusColor(status) {
  const colors = {
    draft: '#6b7280',
    confirmed: '#a855f7',
    in_progress: '#fbbf24',
    completed: '#22c55e',
    cancelled: '#ef4444'
  };
  return colors[status] || '#6b7280';
}

module.exports = router;
