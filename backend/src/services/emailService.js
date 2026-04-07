const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create transporter — configured from env or system config
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Try env first, then system config
  const host = process.env.SMTP_HOST || (await getConfig('smtp_host')) || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || (await getConfig('smtp_port')) || '587');
  const user = process.env.SMTP_USER || (await getConfig('smtp_user')) || '';
  const pass = process.env.SMTP_PASS || (await getConfig('smtp_pass')) || '';

  if (!user || !pass) {
    console.warn('Email not configured — SMTP_USER/SMTP_PASS missing');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return transporter;
}

async function getConfig(key) {
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  return config?.value || null;
}

// ─── SEND EMAIL (generic) ────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, from }) {
  const t = await getTransporter();
  if (!t) {
    console.warn(`Email not sent (no SMTP config): ${subject} → ${to}`);
    // Log it anyway
    await logEmail(to, subject, 'skipped', 'SMTP not configured');
    return false;
  }

  const senderName = await getConfig('company_name') || 'PixelGate';
  const senderEmail = from || process.env.SMTP_USER || (await getConfig('smtp_user'));

  try {
    await t.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      html
    });
    await logEmail(to, subject, 'sent');
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    await logEmail(to, subject, 'failed', err.message);
    return false;
  }
}

async function logEmail(to, subject, status, error = null) {
  try {
    await prisma.activityLog.create({
      data: {
        action: 'email_' + status,
        entityType: 'email',
        details: JSON.stringify({ to, subject, error }),
        timestamp: new Date()
      }
    });
  } catch (e) { /* silent */ }
}

// ─── THANK YOU + SURVEY EMAIL ────────────────────────────────────────────────

async function sendThankYouEmail(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      client: true,
      experience: true,
      operator: { select: { name: true } }
    }
  });
  if (!event || !event.client?.email) return false;

  const companyName = await getConfig('company_name') || 'PixelGate';
  const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const surveyUrl = `${baseUrl.replace(':3000', ':4000')}/api/feedback/survey/${eventId}`;

  // Check if experience has an external survey link
  const externalSurvey = await getConfig(`survey_link_${event.experienceId}`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; padding:0; background:#0a0a0f; font-family:Inter,Arial,sans-serif;">
      <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
        <!-- Header -->
        <div style="text-align:center; margin-bottom:30px;">
          <div style="display:inline-block; width:50px; height:50px; border-radius:12px; background:linear-gradient(135deg,#a855f7,#fbbf24); line-height:50px; font-size:24px; font-weight:900; color:#000;">P</div>
          <h1 style="color:#fff; font-size:24px; margin:15px 0 5px; font-weight:800;">${companyName}</h1>
          <p style="color:#9ca3af; font-size:13px; margin:0;">Thank You for Your Experience!</p>
        </div>

        <!-- Content -->
        <div style="background:#1c1c26; border:1px solid #252532; border-radius:16px; padding:30px; margin-bottom:20px;">
          <p style="color:#e5e7eb; font-size:15px; line-height:1.6; margin:0 0 15px;">
            Dear ${event.client.contactName},
          </p>
          <p style="color:#e5e7eb; font-size:15px; line-height:1.6; margin:0 0 15px;">
            Thank you for choosing <strong style="color:#a855f7;">${companyName}</strong> for your team building event!
            We hope your team had an amazing time with <strong style="color:#fbbf24;">${event.experience.name}</strong>.
          </p>

          <!-- Event Summary -->
          <div style="background:#13131a; border-radius:12px; padding:15px; margin:20px 0;">
            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="color:#9ca3af; padding:4px 0; font-size:13px;">Experience</td><td style="color:#fff; padding:4px 0; font-size:13px; text-align:right;">${event.experience.name}</td></tr>
              <tr><td style="color:#9ca3af; padding:4px 0; font-size:13px;">Date</td><td style="color:#fff; padding:4px 0; font-size:13px; text-align:right;">${new Date(event.startTime).toLocaleDateString()}</td></tr>
              <tr><td style="color:#9ca3af; padding:4px 0; font-size:13px;">Participants</td><td style="color:#fff; padding:4px 0; font-size:13px; text-align:right;">${event.participants || 'N/A'}</td></tr>
              ${event.operator ? `<tr><td style="color:#9ca3af; padding:4px 0; font-size:13px;">Your Operator</td><td style="color:#fff; padding:4px 0; font-size:13px; text-align:right;">${event.operator.name}</td></tr>` : ''}
            </table>
          </div>

          <p style="color:#e5e7eb; font-size:15px; line-height:1.6; margin:0 0 20px;">
            We'd love to hear your feedback! It only takes 30 seconds:
          </p>

          <!-- Survey Button -->
          <div style="text-align:center; margin:25px 0;">
            <a href="${surveyUrl}" style="display:inline-block; padding:14px 36px; background:linear-gradient(135deg,#a855f7,#fbbf24); color:#000; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px;">
              Rate Your Experience
            </a>
          </div>

          ${externalSurvey ? `
          <p style="color:#9ca3af; font-size:12px; text-align:center; margin:10px 0 0;">
            Or fill out our <a href="${externalSurvey}" style="color:#a855f7;">detailed survey here</a>
          </p>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="text-align:center;">
          <p style="color:#6b7280; font-size:11px; margin:0;">
            ${companyName} — Step inside. Play together. Live the game.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: event.client.email,
    subject: `Thank you for your VR experience — ${event.experience.name}! ⭐`,
    html
  });
}

// ─── DAILY DIGEST EMAIL (internal) ──────────────────────────────────────────

async function sendDailyDigest() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59);
  tomorrow.setHours(0, 0, 0);

  // Gather data
  const [upcomingEvents, overdueInvoices, eolAlerts, openMaintenance] = await Promise.all([
    prisma.event.findMany({
      where: { startTime: { gte: tomorrow, lte: tomorrowEnd }, status: { notIn: ['cancelled', 'completed'] } },
      include: { client: { select: { companyName: true } }, experience: { select: { name: true } }, operator: { select: { name: true } } }
    }),
    prisma.invoice.findMany({
      where: { status: { in: ['sent', 'partial'] }, dueDate: { lt: now } },
      include: { client: { select: { companyName: true } } }
    }),
    prisma.hardwareItem.findMany({
      where: { eolReached: true, status: { not: 'retired' } },
      include: { type: true }
    }),
    prisma.maintenanceLog.findMany({
      where: { status: { not: 'resolved' } },
      include: { item: { include: { type: true } } }
    })
  ]);

  // Skip if nothing to report
  if (upcomingEvents.length === 0 && overdueInvoices.length === 0 && eolAlerts.length === 0 && openMaintenance.length === 0) {
    return;
  }

  const companyName = await getConfig('company_name') || 'PixelGate';
  const currencySymbol = await getConfig('currency_symbol') || '€';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; padding:0; background:#0a0a0f; font-family:Inter,Arial,sans-serif;">
      <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
        <div style="text-align:center; margin-bottom:30px;">
          <h1 style="color:#fff; font-size:20px; margin:0; font-weight:800;">${companyName} — Daily Digest</h1>
          <p style="color:#9ca3af; font-size:12px; margin:5px 0 0;">${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        ${upcomingEvents.length > 0 ? `
        <div style="background:#1c1c26; border:1px solid #252532; border-radius:12px; padding:20px; margin-bottom:15px;">
          <h2 style="color:#a855f7; font-size:14px; margin:0 0 12px; text-transform:uppercase; letter-spacing:1px;">📅 Tomorrow's Events (${upcomingEvents.length})</h2>
          ${upcomingEvents.map(e => `
            <div style="padding:8px 0; border-bottom:1px solid #252532;">
              <strong style="color:#fff; font-size:13px;">${e.client.companyName}</strong>
              <span style="color:#9ca3af; font-size:12px;"> — ${e.experience.name}</span><br/>
              <span style="color:#6b7280; font-size:11px;">${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${e.operator ? `• Operator: ${e.operator.name}` : ''}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${overdueInvoices.length > 0 ? `
        <div style="background:#1c1c26; border:1px solid #252532; border-radius:12px; padding:20px; margin-bottom:15px;">
          <h2 style="color:#ef4444; font-size:14px; margin:0 0 12px; text-transform:uppercase; letter-spacing:1px;">💰 Overdue Invoices (${overdueInvoices.length})</h2>
          ${overdueInvoices.map(inv => {
            const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
            return `
            <div style="padding:8px 0; border-bottom:1px solid #252532;">
              <strong style="color:#fff; font-size:13px;">${inv.invoiceNumber}</strong>
              <span style="color:#9ca3af; font-size:12px;"> — ${inv.client.companyName}</span><br/>
              <span style="color:#ef4444; font-size:11px;">${currencySymbol}${(inv.totalAmount - inv.paidAmount).toFixed(0)} outstanding • ${daysOverdue} days overdue</span>
            </div>
          `}).join('')}
        </div>
        ` : ''}

        ${eolAlerts.length > 0 ? `
        <div style="background:#1c1c26; border:1px solid #252532; border-radius:12px; padding:20px; margin-bottom:15px;">
          <h2 style="color:#f59e0b; font-size:14px; margin:0 0 12px; text-transform:uppercase; letter-spacing:1px;">⚠️ Hardware Near End of Life (${eolAlerts.length})</h2>
          ${eolAlerts.map(item => {
            const expectedUses = item.expectedLifespanUses || item.type.expectedUses || 0;
            const pct = expectedUses > 0 ? Math.round((item.currentUseCount / expectedUses) * 100) : 0;
            return `
            <div style="padding:8px 0; border-bottom:1px solid #252532;">
              <strong style="color:#fff; font-size:13px;">${item.name}</strong>
              <span style="color:#9ca3af; font-size:12px;"> — ${item.type.name}</span><br/>
              <span style="color:#f59e0b; font-size:11px;">${item.currentUseCount}/${expectedUses} uses (${pct}%)</span>
            </div>
          `}).join('')}
        </div>
        ` : ''}

        ${openMaintenance.length > 0 ? `
        <div style="background:#1c1c26; border:1px solid #252532; border-radius:12px; padding:20px; margin-bottom:15px;">
          <h2 style="color:#f59e0b; font-size:14px; margin:0 0 12px; text-transform:uppercase; letter-spacing:1px;">🔧 Open Maintenance (${openMaintenance.length})</h2>
          ${openMaintenance.map(m => `
            <div style="padding:8px 0; border-bottom:1px solid #252532;">
              <strong style="color:#fff; font-size:13px;">${m.item.name}</strong><br/>
              <span style="color:#9ca3af; font-size:12px;">${m.issue}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div style="text-align:center; margin-top:20px;">
          <p style="color:#6b7280; font-size:11px;">${companyName} Operations Dashboard</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send to all admins and operations managers
  const recipients = await prisma.user.findMany({
    where: { isActive: true, role: { name: { in: ['admin', 'operations'] } } }
  });

  for (const user of recipients) {
    await sendEmail({
      to: user.email,
      subject: `${companyName} Daily Digest — ${now.toLocaleDateString()}`,
      html
    });
  }

  console.log(`Daily digest sent to ${recipients.length} recipients`);
}

// ─── SURVEY PAGE (served as HTML) ───────────────────────────────────────────

function getSurveyPageHTML(event, alreadySubmitted = false) {
  const companyName = 'PixelGate';

  if (alreadySubmitted) {
    return `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thank You!</title></head>
      <body style="margin:0;padding:40px 20px;background:#0a0a0f;font-family:Inter,Arial,sans-serif;color:#e5e7eb;text-align:center;">
        <h1 style="color:#a855f7;">Thank you!</h1>
        <p style="color:#9ca3af;">Your feedback has already been recorded. We appreciate it!</p>
      </body></html>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Rate Your Experience — ${companyName}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0a0a0f; font-family:Inter,Arial,sans-serif; color:#e5e7eb; padding:20px; min-height:100vh; display:flex; align-items:center; justify-content:center; }
        .card { background:#1c1c26; border:1px solid #252532; border-radius:16px; padding:30px; max-width:480px; width:100%; }
        h1 { font-size:22px; font-weight:800; text-align:center; margin-bottom:5px; }
        .sub { color:#9ca3af; font-size:13px; text-align:center; margin-bottom:25px; }
        .stars { display:flex; justify-content:center; gap:8px; margin:20px 0; }
        .star { width:48px; height:48px; cursor:pointer; font-size:36px; opacity:0.3; transition:all 0.2s; }
        .star:hover, .star.active { opacity:1; transform:scale(1.15); }
        textarea { width:100%; background:#13131a; border:1px solid #252532; border-radius:10px; padding:12px; color:#e5e7eb; font-size:14px; resize:vertical; min-height:80px; margin:15px 0; }
        textarea:focus { outline:none; border-color:#a855f7; }
        .btn { display:block; width:100%; padding:14px; background:linear-gradient(135deg,#a855f7,#fbbf24); color:#000; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; }
        .btn:hover { filter:brightness(1.1); }
        .btn:disabled { opacity:0.5; cursor:not-allowed; }
        .thanks { text-align:center; padding:40px 0; }
        .thanks h2 { color:#a855f7; font-size:24px; margin-bottom:10px; }
      </style>
    </head>
    <body>
      <div class="card" id="form-card">
        <h1 style="background:linear-gradient(135deg,#a855f7,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${companyName}</h1>
        <p class="sub">How was your <strong style="color:#fbbf24;">${event.experience.name}</strong> experience?</p>

        <div class="stars" id="stars">
          ${[1,2,3,4,5].map(n => `<span class="star" data-rating="${n}" onclick="setRating(${n})">⭐</span>`).join('')}
        </div>

        <p style="text-align:center;color:#9ca3af;font-size:12px;" id="rating-label">Tap a star to rate</p>

        <textarea id="comment" placeholder="Tell us more about your experience (optional)..."></textarea>

        <button class="btn" id="submit-btn" onclick="submitFeedback()" disabled>Submit Feedback</button>
      </div>

      <div class="thanks" id="thanks-card" style="display:none;">
        <h2>Thank you! 🎉</h2>
        <p style="color:#9ca3af;">Your feedback helps us improve. See you next time!</p>
      </div>

      <script>
        let selectedRating = 0;
        const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'];

        function setRating(r) {
          selectedRating = r;
          document.querySelectorAll('.star').forEach((s, i) => {
            s.classList.toggle('active', i < r);
          });
          document.getElementById('rating-label').textContent = labels[r];
          document.getElementById('submit-btn').disabled = false;
        }

        async function submitFeedback() {
          const btn = document.getElementById('submit-btn');
          btn.disabled = true;
          btn.textContent = 'Submitting...';

          try {
            const resp = await fetch('/api/feedback/event/${event.id}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rating: selectedRating, comment: document.getElementById('comment').value })
            });

            document.getElementById('form-card').style.display = 'none';
            document.getElementById('thanks-card').style.display = 'block';
          } catch (e) {
            btn.textContent = 'Error — Try Again';
            btn.disabled = false;
          }
        }
      </script>
    </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  sendThankYouEmail,
  sendDailyDigest,
  getSurveyPageHTML
};
