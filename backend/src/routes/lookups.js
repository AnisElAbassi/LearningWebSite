const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/lookups - All categories with values
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await prisma.lookupCategory.findMany({
      include: { values: { orderBy: { sortOrder: 'asc' } } }
    });
    res.json(categories);
  } catch (err) {
    handleError(res, err, 'lookups');
  }
});

// GET /api/lookups/:slug
router.get('/:slug', authenticate, async (req, res) => {
  try {
    const category = await prisma.lookupCategory.findUnique({
      where: { slug: req.params.slug },
      include: { values: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } }
    });
    if (!category) return res.status(404).json({ error: 'Lookup category not found' });
    res.json(category);
  } catch (err) {
    handleError(res, err, 'lookups');
  }
});

// POST /api/lookups - Create category
router.post('/', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    const category = await prisma.lookupCategory.create({
      data: { slug: req.body.slug, label: req.body.label }
    });
    res.status(201).json(category);
  } catch (err) {
    handleError(res, err, 'lookups');
  }
});

// POST /api/lookups/:slug/values
router.post('/:slug/values', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    const category = await prisma.lookupCategory.findUnique({ where: { slug: req.params.slug } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const value = await prisma.lookupValue.create({
      data: { ...req.body, categoryId: category.id }
    });
    await logActivity(req.user.id, 'created', 'lookup_value', value.id, { slug: req.params.slug, value: req.body.value }, req.ip);
    res.status(201).json(value);
  } catch (err) {
    handleError(res, err, 'lookups');
  }
});

// PUT /api/lookups/values/:id
router.put('/values/:id', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    const value = await prisma.lookupValue.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(value);
  } catch (err) {
    handleError(res, err, 'lookups');
  }
});

// DELETE /api/lookups/values/:id
router.delete('/values/:id', authenticate, authorize('settings.manage'), async (req, res) => {
  try {
    await prisma.lookupValue.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false }
    });
    res.json({ message: 'Lookup value deactivated' });
  } catch (err) {
    handleError(res, err, 'lookups');
  }
});

module.exports = router;
