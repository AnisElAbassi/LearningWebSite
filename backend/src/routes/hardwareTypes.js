const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/hardware-types
router.get('/', authenticate, async (req, res) => {
  try {
    const types = await prisma.hardwareType.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hardware-types
router.post('/', authenticate, authorize('hardware.create'), async (req, res) => {
  try {
    const type = await prisma.hardwareType.create({ data: req.body });
    await logActivity(req.user.id, 'created', 'hardware_type', type.id, { name: req.body.name }, req.ip);
    res.status(201).json(type);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hardware-types/:id
router.put('/:id', authenticate, authorize('hardware.update'), async (req, res) => {
  try {
    const type = await prisma.hardwareType.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    await logActivity(req.user.id, 'updated', 'hardware_type', type.id, { name: req.body.name }, req.ip);
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hardware-types/:id
router.delete('/:id', authenticate, authorize('hardware.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const itemCount = await prisma.hardwareItem.count({ where: { typeId: id } });
    if (itemCount > 0) return res.status(400).json({ error: 'Cannot delete type with existing items' });
    await prisma.hardwareType.delete({ where: { id } });
    await logActivity(req.user.id, 'deleted', 'hardware_type', id, null, req.ip);
    res.json({ message: 'Hardware type deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
