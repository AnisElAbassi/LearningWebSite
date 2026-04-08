const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/hardware-bundles
router.get('/', authenticate, async (req, res) => {
  try {
    const bundles = await prisma.hardwareBundle.findMany({
      include: { experience: true, items: { include: { item: { include: { type: true } } } } },
      orderBy: { name: 'asc' }
    });
    res.json(bundles);
  } catch (err) {
    handleError(res, err, 'hardwareBundles');
  }
});

// POST /api/hardware-bundles
router.post('/', authenticate, authorize('hardware.create'), async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const bundle = await prisma.hardwareBundle.create({
      data: { ...data, items: { create: items } },
      include: { experience: true, items: { include: { item: { include: { type: true } } } } }
    });
    await logActivity(req.user.id, 'created', 'hardware_bundle', bundle.id, { name: data.name }, req.ip);
    res.status(201).json(bundle);
  } catch (err) {
    handleError(res, err, 'hardwareBundles');
  }
});

// PUT /api/hardware-bundles/:id
router.put('/:id', authenticate, authorize('hardware.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { items, ...data } = req.body;
    await prisma.hardwareBundle.update({ where: { id }, data });
    if (items) {
      await prisma.bundleItem.deleteMany({ where: { bundleId: id } });
      await prisma.bundleItem.createMany({ data: items.map(i => ({ ...i, bundleId: id })) });
    }
    const bundle = await prisma.hardwareBundle.findUnique({
      where: { id },
      include: { experience: true, items: { include: { item: { include: { type: true } } } } }
    });
    await logActivity(req.user.id, 'updated', 'hardware_bundle', id, { name: data.name }, req.ip);
    res.json(bundle);
  } catch (err) {
    handleError(res, err, 'hardwareBundles');
  }
});

// DELETE /api/hardware-bundles/:id
router.delete('/:id', authenticate, authorize('hardware.delete'), async (req, res) => {
  try {
    await prisma.hardwareBundle.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Bundle deleted' });
  } catch (err) {
    handleError(res, err, 'hardwareBundles');
  }
});

module.exports = router;
