const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/experiences
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, tag, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (tag) where.tags = { some: { tag: { name: tag } } };

    const experiences = await prisma.experience.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        variants: true,
        requiredHardware: { include: { hardwareType: true } },
        hardwareBundles: { include: { items: { include: { item: true } } } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(experiences);
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

// GET /api/experiences/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const experience = await prisma.experience.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        tags: { include: { tag: true } },
        variants: true,
        requiredHardware: { include: { hardwareType: true } },
        hardwareBundles: { include: { items: { include: { item: true } } } },
        events: { include: { client: true }, orderBy: { startTime: 'desc' }, take: 10 }
      }
    });
    if (!experience) return res.status(404).json({ error: 'Experience not found' });
    res.json(experience);
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

// POST /api/experiences
router.post('/', authenticate, authorize('experiences.create'), async (req, res) => {
  try {
    const { tags, variants, requiredHardware, ...data } = req.body;
    const experience = await prisma.experience.create({
      data: {
        ...data,
        tags: tags ? { create: tags.map(tagId => ({ tagId })) } : undefined,
        variants: variants ? { create: variants } : undefined,
        requiredHardware: requiredHardware ? { create: requiredHardware } : undefined
      },
      include: { tags: { include: { tag: true } }, variants: true, requiredHardware: { include: { hardwareType: true } } }
    });
    await logActivity(req.user.id, 'created', 'experience', experience.id, { name: data.name }, req.ip);
    res.status(201).json(experience);
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

// PUT /api/experiences/:id
router.put('/:id', authenticate, authorize('experiences.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tags, variants, requiredHardware, ...data } = req.body;

    const experience = await prisma.experience.update({ where: { id }, data });

    if (tags !== undefined) {
      await prisma.experienceTagMapping.deleteMany({ where: { experienceId: id } });
      if (tags.length > 0) {
        await prisma.experienceTagMapping.createMany({ data: tags.map(tagId => ({ experienceId: id, tagId })) });
      }
    }
    if (variants !== undefined) {
      await prisma.experienceVariant.deleteMany({ where: { experienceId: id } });
      if (variants.length > 0) {
        await prisma.experienceVariant.createMany({ data: variants.map(v => ({ ...v, experienceId: id })) });
      }
    }
    if (requiredHardware !== undefined) {
      await prisma.experienceHardwareReq.deleteMany({ where: { experienceId: id } });
      if (requiredHardware.length > 0) {
        await prisma.experienceHardwareReq.createMany({ data: requiredHardware.map(r => ({ ...r, experienceId: id })) });
      }
    }

    await logActivity(req.user.id, 'updated', 'experience', id, { name: data.name }, req.ip);
    const updated = await prisma.experience.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, variants: true, requiredHardware: { include: { hardwareType: true } } }
    });
    res.json(updated);
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

// DELETE /api/experiences/:id
router.delete('/:id', authenticate, authorize('experiences.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.experience.update({ where: { id }, data: { status: 'retired' } });
    await logActivity(req.user.id, 'archived', 'experience', id, null, req.ip);
    res.json({ message: 'Experience archived' });
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

// ─── TAGS ────────────────────────────────────────────────────────────────────

router.get('/tags/all', authenticate, async (req, res) => {
  try {
    const tags = await prisma.experienceTag.findMany({ orderBy: { name: 'asc' } });
    res.json(tags);
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

router.post('/tags', authenticate, authorize('experiences.create'), async (req, res) => {
  try {
    const tag = await prisma.experienceTag.create({ data: req.body });
    res.status(201).json(tag);
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

router.delete('/tags/:id', authenticate, authorize('experiences.delete'), async (req, res) => {
  try {
    await prisma.experienceTag.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    handleError(res, err, 'experiences');
  }
});

module.exports = router;
