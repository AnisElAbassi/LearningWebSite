const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma, authenticate, logActivity } = require('../middleware/auth');
const handleError = require('../utils/handleError');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `event-${req.params.eventId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// GET /api/photos/event/:eventId
router.get('/event/:eventId', authenticate, async (req, res) => {
  try {
    const photos = await prisma.eventPhoto.findMany({
      where: { eventId: parseInt(req.params.eventId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(photos);
  } catch (err) {
    handleError(res, err, 'photos');
  }
});

// POST /api/photos/event/:eventId — upload photo
router.post('/event/:eventId', authenticate, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const photo = await prisma.eventPhoto.create({
      data: {
        eventId: parseInt(req.params.eventId),
        url: `/uploads/${req.file.filename}`,
        type: req.body.type || 'post', // pre, post, damage, setup
        caption: req.body.caption || null
      }
    });
    await logActivity(req.user.id, 'uploaded', 'event_photo', photo.id, { eventId: req.params.eventId }, req.ip);
    res.status(201).json(photo);
  } catch (err) {
    handleError(res, err, 'photos');
  }
});

// DELETE /api/photos/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const photo = await prisma.eventPhoto.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    // Remove file from disk
    if (photo.url) {
      const filePath = path.join(__dirname, '../../', photo.url);
      fs.unlink(filePath, () => {}); // best-effort, don't fail if file missing
    }

    await prisma.eventPhoto.delete({ where: { id: photo.id } });
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    handleError(res, err, 'photos.delete');
  }
});

module.exports = router;
