const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/clients
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, industry, page = 1, limit = 50 } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (industry) where.industry = industry;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: { deals: true, events: { include: { experience: true } }, customFields: { include: { field: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.client.count({ where })
    ]);
    res.json({ clients, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

// GET /api/clients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        deals: { orderBy: { createdAt: 'desc' } },
        events: { include: { experience: true }, orderBy: { startTime: 'desc' } },
        customFields: { include: { field: true } }
      }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

// POST /api/clients
router.post('/', authenticate, authorize('clients.create'), async (req, res) => {
  try {
    const { customFields, ...data } = req.body;
    if (data.tags && Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags);
    const client = await prisma.client.create({
      data: {
        ...data,
        customFields: customFields ? {
          create: customFields.map(cf => ({ fieldId: cf.fieldId, value: cf.value }))
        } : undefined
      },
      include: { customFields: { include: { field: true } } }
    });
    await logActivity(req.user.id, 'created', 'client', client.id, { companyName: data.companyName }, req.ip);
    res.status(201).json(client);
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

// PUT /api/clients/:id
router.put('/:id', authenticate, authorize('clients.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { customFields, ...data } = req.body;
    if (data.tags && Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags);
    const client = await prisma.client.update({ where: { id }, data });

    if (customFields) {
      for (const cf of customFields) {
        await prisma.clientCustomFieldValue.upsert({
          where: { clientId_fieldId: { clientId: id, fieldId: cf.fieldId } },
          update: { value: cf.value },
          create: { clientId: id, fieldId: cf.fieldId, value: cf.value }
        });
      }
    }

    await logActivity(req.user.id, 'updated', 'client', id, { companyName: data.companyName }, req.ip);
    const updated = await prisma.client.findUnique({
      where: { id },
      include: { customFields: { include: { field: true } }, deals: true, events: { include: { experience: true } } }
    });
    res.json(updated);
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, authorize('clients.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.client.delete({ where: { id } });
    await logActivity(req.user.id, 'deleted', 'client', id, null, req.ip);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

// GET /api/clients/custom-fields/all
router.get('/custom-fields/all', authenticate, async (req, res) => {
  try {
    const fields = await prisma.clientCustomField.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json(fields);
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

// POST /api/clients/custom-fields
router.post('/custom-fields', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    const field = await prisma.clientCustomField.create({ data: req.body });
    res.status(201).json(field);
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

// PUT /api/clients/custom-fields/:id
router.put('/custom-fields/:id', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    const field = await prisma.clientCustomField.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(field);
  } catch (err) {
    handleError(res, err, 'clients.customFields.update');
  }
});

// DELETE /api/clients/custom-fields/:id
router.delete('/custom-fields/:id', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    await prisma.clientCustomField.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Custom field deleted' });
  } catch (err) {
    handleError(res, err, 'clients.customFields.delete');
  }
});

// ─── CLIENT INTERACTIONS (Notes/Calls/Emails Log) ────────────────────────────

router.get('/:id/interactions', authenticate, async (req, res) => {
  try {
    const interactions = await prisma.clientInteraction.findMany({
      where: { clientId: parseInt(req.params.id) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(interactions);
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

router.post('/:id/interactions', authenticate, async (req, res) => {
  try {
    const interaction = await prisma.clientInteraction.create({
      data: { ...req.body, clientId: parseInt(req.params.id) }
    });
    res.status(201).json(interaction);
  } catch (err) {
    handleError(res, err, 'clients');
  }
});

module.exports = router;
