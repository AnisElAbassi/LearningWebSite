const express = require('express');
const router = express.Router();
const { prisma, authenticate, authorize } = require('../middleware/auth');

// GET /api/assets/lifecycle — all items with depreciation data
router.get('/lifecycle', authenticate, async (req, res) => {
  try {
    const items = await prisma.hardwareItem.findMany({
      where: { status: { not: 'retired' } },
      include: { type: true },
      orderBy: { currentUseCount: 'desc' }
    });

    const enriched = items.map(item => {
      const expectedUses = item.expectedLifespanUses || item.type.expectedUses || 0;
      const lifespanPct = expectedUses > 0 ? (item.currentUseCount / expectedUses) * 100 : 0;
      return {
        ...item,
        expectedUses,
        lifespanPct: Math.min(lifespanPct, 100),
        depreciationPerUse: item.depreciationPerUse || (item.purchasePrice && expectedUses ? item.purchasePrice / expectedUses : 0),
        bookValue: item.bookValue ?? item.purchasePrice ?? 0
      };
    });

    // Sort by lifespan % descending (most used first)
    enriched.sort((a, b) => b.lifespanPct - a.lifespanPct);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assets/lifecycle/alerts — items past EOL threshold
router.get('/lifecycle/alerts', authenticate, async (req, res) => {
  try {
    const items = await prisma.hardwareItem.findMany({
      where: { status: { not: 'retired' }, eolReached: false },
      include: { type: true }
    });

    const alerts = items.filter(item => {
      const expectedUses = item.expectedLifespanUses || item.type.expectedUses || 0;
      const threshold = item.type.eolAlertThreshold || 0.8;
      return expectedUses > 0 && (item.currentUseCount / expectedUses) >= threshold;
    }).map(item => {
      const expectedUses = item.expectedLifespanUses || item.type.expectedUses || 0;
      return {
        ...item,
        expectedUses,
        lifespanPct: (item.currentUseCount / expectedUses) * 100,
        remainingUses: Math.max(0, expectedUses - item.currentUseCount)
      };
    });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assets/lifecycle/:itemId/history — depreciation log
router.get('/lifecycle/:itemId/history', authenticate, async (req, res) => {
  try {
    const logs = await prisma.assetDepreciationLog.findMany({
      where: { itemId: parseInt(req.params.itemId) },
      include: { event: { select: { id: true, startTime: true, client: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assets/lifecycle/summary — aggregate asset values
router.get('/lifecycle/summary', authenticate, async (req, res) => {
  try {
    const items = await prisma.hardwareItem.findMany({
      where: { status: { not: 'retired' }, purchasePrice: { not: null } }
    });

    const totalPurchaseValue = items.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
    const totalBookValue = items.reduce((sum, i) => sum + (i.bookValue ?? i.purchasePrice ?? 0), 0);
    const totalDepreciated = totalPurchaseValue - totalBookValue;
    const itemCount = items.length;
    const eolCount = items.filter(i => i.eolReached).length;

    res.json({ totalPurchaseValue, totalBookValue, totalDepreciated, itemCount, eolCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assets/lifecycle/:itemId/increment — manual use increment
router.post('/lifecycle/:itemId/increment', authenticate, authorize('assets.manage'), async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const item = await prisma.hardwareItem.findUnique({ where: { id: itemId }, include: { type: true } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const depPerUse = item.depreciationPerUse || (item.purchasePrice && (item.expectedLifespanUses || item.type.expectedUses)
      ? item.purchasePrice / (item.expectedLifespanUses || item.type.expectedUses) : 0);

    const newUseCount = item.currentUseCount + 1;
    const newBookValue = Math.max(0, (item.purchasePrice || 0) - (depPerUse * newUseCount));
    const expectedUses = item.expectedLifespanUses || item.type.expectedUses || 0;
    const eolReached = expectedUses > 0 && (newUseCount / expectedUses) >= (item.type.eolAlertThreshold || 0.8);

    await prisma.hardwareItem.update({
      where: { id: itemId },
      data: { currentUseCount: newUseCount, bookValue: newBookValue, depreciationPerUse: depPerUse, eolReached }
    });

    await prisma.assetDepreciationLog.create({
      data: { itemId, depreciationAmt: depPerUse, useCountAfter: newUseCount, bookValueAfter: newBookValue }
    });

    if (eolReached && !item.eolReached) {
      const admins = await prisma.user.findMany({ where: { role: { name: 'admin' } } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id, type: 'hardware_eol', title: 'Asset Near End of Life',
            message: `${item.name} has reached ${((newUseCount / expectedUses) * 100).toFixed(0)}% of its expected lifespan (${newUseCount}/${expectedUses} uses)`,
            actionUrl: `/hardware/${itemId}`
          }
        });
      }
    }

    res.json({ currentUseCount: newUseCount, bookValue: newBookValue, depreciationPerUse: depPerUse, eolReached });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
