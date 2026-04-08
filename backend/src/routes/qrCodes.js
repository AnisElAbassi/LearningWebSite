const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const QRCode = require('qrcode');
const { prisma, authenticate } = require('../middleware/auth');

// GET /api/qr/hardware/bulk — must be BEFORE /:id route
router.get('/hardware/bulk', authenticate, async (req, res) => {
  try {
    const { typeId, status } = req.query;
    const where = {};
    if (typeId) where.typeId = parseInt(typeId);
    if (status) where.status = status;
    else where.status = { not: 'retired' };

    const items = await prisma.hardwareItem.findMany({ where, include: { type: true }, orderBy: { name: 'asc' } });
    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';

    const results = await Promise.all(items.map(async (item) => {
      const url = `${baseUrl}/hardware/${item.id}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: { dark: '#a855f7', light: '#ffffff' }
      });
      return {
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        type: item.type.name,
        qrDataUrl
      };
    }));

    res.json(results);
  } catch (err) {
    handleError(res, err, 'qrCodes');
  }
});

// GET /api/qr/hardware/:id — single item QR code
router.get('/hardware/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.hardwareItem.findUnique({ where: { id }, include: { type: true } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const url = `${baseUrl}/hardware/${id}`;

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#a855f7', light: '#0a0a0f' }
    });

    res.json({
      id: item.id,
      name: item.name,
      serialNumber: item.serialNumber,
      type: item.type.name,
      url,
      qrDataUrl
    });
  } catch (err) {
    handleError(res, err, 'qrCodes');
  }
});

module.exports = router;
