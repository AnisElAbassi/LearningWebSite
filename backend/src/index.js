require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes — Core
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/experiences', require('./routes/experiences'));
app.use('/api/events', require('./routes/events'));
app.use('/api/calendar', require('./routes/calendar'));

// Routes — Hardware & Assets
app.use('/api/hardware-types', require('./routes/hardwareTypes'));
app.use('/api/hardware', require('./routes/hardware'));
app.use('/api/hardware-bundles', require('./routes/hardwareBundles'));
app.use('/api/assets', require('./routes/assetLifecycle'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/damage-reports', require('./routes/damageReports'));
app.use('/api/qr', require('./routes/qrCodes'));

// Routes — Finance
app.use('/api/deals', require('./routes/deals'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/costs', require('./routes/costs'));
app.use('/api/logistics', require('./routes/logistics'));

// Routes — Smart Features
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/packing', require('./routes/packingList'));
app.use('/api/reports', require('./routes/reports'));

// Routes — System
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/lookups', require('./routes/lookups'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/export', require('./routes/exportData'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Manual trigger for daily digest (also runs on schedule)
app.post('/api/email/daily-digest', require('./middleware/auth').authenticate, async (req, res) => {
  try {
    const { sendDailyDigest } = require('./services/emailService');
    await sendDailyDigest();
    res.json({ message: 'Daily digest sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily digest scheduler — runs every day at 8:00 AM
const { sendDailyDigest } = require('./services/emailService');
function scheduleDailyDigest() {
  const now = new Date();
  const next8am = new Date(now);
  next8am.setHours(8, 0, 0, 0);
  if (now >= next8am) next8am.setDate(next8am.getDate() + 1);
  const msUntil = next8am - now;
  setTimeout(() => {
    sendDailyDigest().catch(err => console.error('Daily digest error:', err));
    setInterval(() => {
      sendDailyDigest().catch(err => console.error('Daily digest error:', err));
    }, 24 * 60 * 60 * 1000);
  }, msUntil);
  console.log(`Daily digest scheduled for ${next8am.toLocaleString()}`);
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PixelGate OPS API running on port ${PORT}`);
  scheduleDailyDigest();
});
