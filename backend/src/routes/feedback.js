const express = require('express');
const router = express.Router();
const { prisma, authenticate, logActivity } = require('../middleware/auth');
const { getSurveyPageHTML } = require('../services/emailService');

// GET /api/feedback/survey/:eventId — public survey page (no auth needed, accessed from email)
router.get('/survey/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { client: true, experience: true }
    });
    if (!event) return res.status(404).send('<h1>Event not found</h1>');

    const existing = await prisma.eventFeedback.findUnique({ where: { eventId } });
    res.send(getSurveyPageHTML(event, !!existing));
  } catch (err) {
    res.status(500).send('<h1>Error loading survey</h1>');
  }
});

// POST /api/feedback/event/:eventId — accepts both authenticated and public (from survey page)
router.post('/event/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const feedback = await prisma.eventFeedback.upsert({
      where: { eventId },
      update: { rating: req.body.rating, comment: req.body.comment },
      create: { eventId, clientId: event.clientId, rating: req.body.rating, comment: req.body.comment }
    });

    // Update client satisfaction average
    const allFeedback = await prisma.eventFeedback.findMany({ where: { clientId: event.clientId } });
    const avg = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;
    await prisma.client.update({ where: { id: event.clientId }, data: { satisfactionAvg: avg } });

    // Update client loyalty tier
    const eventCount = await prisma.event.count({ where: { clientId: event.clientId, status: 'completed' } });
    let loyaltyTier = 'new';
    if (eventCount >= 5) loyaltyTier = 'vip';
    else if (eventCount >= 2) loyaltyTier = 'returning';
    await prisma.client.update({ where: { id: event.clientId }, data: { loyaltyTier } });

    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/event/:eventId (authenticated)
router.get('/event/:eventId', authenticate, async (req, res) => {
  try {
    const feedback = await prisma.eventFeedback.findUnique({
      where: { eventId: parseInt(req.params.eventId) },
      include: { client: { select: { companyName: true } } }
    });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/feedback/client/:clientId — all feedback for a client
router.get('/client/:clientId', authenticate, async (req, res) => {
  try {
    const feedback = await prisma.eventFeedback.findMany({
      where: { clientId: parseInt(req.params.clientId) },
      include: { event: { select: { id: true, startTime: true, experience: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
