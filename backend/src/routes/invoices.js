const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, clientId, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = parseInt(clientId);
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { client: { select: { id: true, companyName: true } }, deal: { select: { id: true, title: true } }, payments: true, _count: { select: { lineItems: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

// GET /api/invoices/aging — overdue aging report
router.get('/aging', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['sent', 'partial', 'overdue'] } },
      include: { client: { select: { companyName: true } }, payments: true }
    });

    const aging = { current: [], days30: [], days60: [], days90: [] };
    for (const inv of invoices) {
      const daysPastDue = Math.max(0, Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)));
      const outstanding = inv.totalAmount - inv.paidAmount;
      const entry = { ...inv, daysPastDue, outstanding };
      if (daysPastDue === 0) aging.current.push(entry);
      else if (daysPastDue <= 30) aging.days30.push(entry);
      else if (daysPastDue <= 60) aging.days60.push(entry);
      else aging.days90.push(entry);
    }

    res.json(aging);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { client: true, deal: true, lineItems: true, payments: { orderBy: { paidAt: 'desc' } } }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

// POST /api/invoices
router.post('/', authenticate, authorize('invoices.create'), async (req, res) => {
  try {
    const { lineItems, ...data } = req.body;

    // Auto-generate invoice number
    if (!data.invoiceNumber) {
      const prefix = (await prisma.systemConfig.findUnique({ where: { key: 'invoice_prefix' } }))?.value || 'INV';
      const count = await prisma.invoice.count();
      data.invoiceNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate totals
    const subtotal = lineItems ? lineItems.reduce((sum, l) => sum + l.total, 0) : data.subtotal || 0;
    const taxRate = data.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        ...data,
        subtotal,
        taxAmount,
        totalAmount,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lineItems: lineItems ? { create: lineItems } : undefined
      },
      include: { client: true, lineItems: true }
    });
    await logActivity(req.user.id, 'created', 'invoice', invoice.id, { invoiceNumber: invoice.invoiceNumber }, req.ip);
    res.status(201).json(invoice);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

// POST /api/invoices/from-deal/:dealId — auto-generate from deal
router.post('/from-deal/:dealId', authenticate, authorize('invoices.create'), async (req, res) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: parseInt(req.params.dealId) },
      include: { client: true, lineItems: true }
    });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const prefix = (await prisma.systemConfig.findUnique({ where: { key: 'invoice_prefix' } }))?.value || 'INV';
    const count = await prisma.invoice.count();
    const invoiceNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const taxRateConfig = await prisma.systemConfig.findUnique({ where: { key: 'default_tax_rate' } });
    const taxRate = taxRateConfig ? parseFloat(taxRateConfig.value) : 0;

    const lineItems = deal.lineItems.length > 0
      ? deal.lineItems.map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, total: l.total }))
      : [{ description: deal.title, quantity: 1, unitPrice: (deal.price || 0) - (deal.discount || 0), total: (deal.price || 0) - (deal.discount || 0) }];

    const subtotal = lineItems.reduce((sum, l) => sum + l.total, 0);
    const taxAmount = subtotal * (taxRate / 100);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: deal.clientId,
        dealId: deal.id,
        status: 'draft',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal,
        taxRate,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        lineItems: { create: lineItems }
      },
      include: { client: true, lineItems: true }
    });
    await logActivity(req.user.id, 'created', 'invoice', invoice.id, { fromDealId: deal.id }, req.ip);
    res.status(201).json(invoice);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

// PUT /api/invoices/:id
router.put('/:id', authenticate, authorize('invoices.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { lineItems, ...data } = req.body;
    await prisma.invoice.update({ where: { id }, data });

    if (lineItems) {
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      if (lineItems.length > 0) {
        await prisma.invoiceLineItem.createMany({ data: lineItems.map(l => ({ ...l, invoiceId: id })) });
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lineItems: true, payments: true }
    });
    res.json(invoice);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

// PUT /api/invoices/:id/status
router.put('/:id/status', authenticate, authorize('invoices.update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const data = { status };
    if (status === 'paid') data.paidAt = new Date();
    const invoice = await prisma.invoice.update({ where: { id }, data });
    await logActivity(req.user.id, 'status_changed', 'invoice', id, { status }, req.ip);
    res.json(invoice);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

// POST /api/invoices/:id/payments — record a payment
router.post('/:id/payments', authenticate, authorize('invoices.update'), async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const payment = await prisma.invoicePayment.create({
      data: { ...req.body, invoiceId, paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date() }
    });

    // Update invoice paid amount and status
    const payments = await prisma.invoicePayment.findMany({ where: { invoiceId } });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

    let status = invoice.status;
    if (totalPaid >= invoice.totalAmount) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: totalPaid, status, paidAt: status === 'paid' ? new Date() : null }
    });

    await logActivity(req.user.id, 'payment_recorded', 'invoice', invoiceId, { amount: req.body.amount }, req.ip);
    res.status(201).json(payment);
  } catch (err) {
    handleError(res, err, 'invoices');
  }
});

module.exports = router;
