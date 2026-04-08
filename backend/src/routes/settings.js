const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticate, async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const settings = {};
    for (const c of configs) {
      if (c.type === 'number') settings[c.key] = parseFloat(c.value);
      else if (c.type === 'boolean') settings[c.key] = c.value === 'true';
      else if (c.type === 'json') settings[c.key] = JSON.parse(c.value);
      else settings[c.key] = c.value;
    }
    res.json(settings);
  } catch (err) {
    handleError(res, err, 'settings');
  }
});

// PUT /api/settings
router.put('/', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, val] of Object.entries(updates)) {
      const value = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const type = typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : typeof val === 'object' ? 'json' : 'string';
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value, type },
        create: { key, value, type }
      });
    }
    await logActivity(req.user.id, 'updated', 'settings', null, updates, req.ip);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    handleError(res, err, 'settings');
  }
});

// GET /api/settings/blackout-dates
router.get('/blackout-dates', authenticate, async (req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'blackout_dates' } });
    res.json(config ? JSON.parse(config.value) : []);
  } catch (err) {
    handleError(res, err, 'settings');
  }
});

// PUT /api/settings/blackout-dates
router.put('/blackout-dates', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    await prisma.systemConfig.upsert({
      where: { key: 'blackout_dates' },
      update: { value: JSON.stringify(req.body.dates), type: 'json' },
      create: { key: 'blackout_dates', value: JSON.stringify(req.body.dates), type: 'json' }
    });
    res.json({ message: 'Blackout dates updated' });
  } catch (err) {
    handleError(res, err, 'settings');
  }
});

module.exports = router;
