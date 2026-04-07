const express = require('express');
const router = express.Router();
const { prisma, authenticate } = require('../middleware/auth');

// GET /api/packing/event/:eventId — get packing list
router.get('/event/:eventId', authenticate, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    let items = await prisma.eventPackingItem.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' }
    });

    // If no packing list exists, auto-generate from event hardware
    if (items.length === 0) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { hardware: { include: { item: { include: { type: true } } } } }
      });

      if (event && event.hardware.length > 0) {
        const packingData = event.hardware.map((eh, i) => ({
          eventId,
          itemName: eh.item.name,
          itemType: eh.item.type.name,
          quantity: eh.quantity,
          sortOrder: i
        }));

        // Add standard items every event needs
        packingData.push(
          { eventId, itemName: 'Extension cords & power strips', itemType: 'General', quantity: 1, sortOrder: packingData.length },
          { eventId, itemName: 'Cable ties & velcro straps', itemType: 'General', quantity: 1, sortOrder: packingData.length + 1 },
          { eventId, itemName: 'Cleaning wipes (headset lenses)', itemType: 'General', quantity: 1, sortOrder: packingData.length + 2 },
          { eventId, itemName: 'Spare batteries', itemType: 'General', quantity: 1, sortOrder: packingData.length + 3 }
        );

        await prisma.eventPackingItem.createMany({ data: packingData });
        items = await prisma.eventPackingItem.findMany({ where: { eventId }, orderBy: { sortOrder: 'asc' } });
      }
    }

    const stats = {
      total: items.length,
      packed: items.filter(i => i.packed).length,
      unpacked: items.filter(i => i.unpacked).length
    };

    res.json({ items, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packing/event/:eventId — add custom packing item
router.post('/event/:eventId', authenticate, async (req, res) => {
  try {
    const item = await prisma.eventPackingItem.create({
      data: { ...req.body, eventId: parseInt(req.params.eventId) }
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/packing/:id — toggle packed/unpacked
router.put('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.eventPackingItem.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packing/event/:eventId/regenerate — regenerate from hardware
router.post('/event/:eventId/regenerate', authenticate, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    await prisma.eventPackingItem.deleteMany({ where: { eventId } });

    // Re-fetch to trigger auto-generation on next GET
    res.json({ message: 'Packing list regenerated. Fetch again to see new list.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
