const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/users
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true, staffRates: true, availability: true },
      orderBy: { name: 'asc' }
    });
    res.json(users.map(({ passwordHash, twoFactorSecret, ...u }) => u));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { role: true, staffRates: true, availability: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, twoFactorSecret, ...userData } = user;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', authenticate, authorize('users.create'), async (req, res) => {
  try {
    const { name, email, password, roleId, phone, staffRates, availability } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name, email, passwordHash, roleId, phone,
        staffRates: staffRates ? { create: staffRates } : undefined,
        availability: availability ? { create: availability } : undefined
      },
      include: { role: true, staffRates: true, availability: true }
    });
    await logActivity(req.user.id, 'created', 'user', user.id, { name }, req.ip);
    const { passwordHash: _, twoFactorSecret, ...userData } = user;
    res.status(201).json(userData);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('users.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, roleId, phone, isActive, password, staffRates, availability } = req.body;
    const data = { name, email, roleId, phone, isActive };
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({ where: { id }, data, include: { role: true } });

    if (staffRates) {
      await prisma.staffRate.deleteMany({ where: { userId: id } });
      await prisma.staffRate.createMany({ data: staffRates.map(r => ({ ...r, userId: id })) });
    }
    if (availability) {
      await prisma.staffAvailability.deleteMany({ where: { userId: id } });
      await prisma.staffAvailability.createMany({ data: availability.map(a => ({ ...a, userId: id })) });
    }

    await logActivity(req.user.id, 'updated', 'user', id, { name }, req.ip);
    const { passwordHash, twoFactorSecret, ...userData } = user;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('users.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await logActivity(req.user.id, 'deactivated', 'user', id, null, req.ip);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
