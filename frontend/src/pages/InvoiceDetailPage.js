import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineCash, HiOutlineMail, HiOutlineCheckCircle, HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';
import { useI18n } from '../hooks/useI18n';

const statusColors = { draft: '#6b7280', sent: '#f59e0b', paid: '#22c55e', partial: '#a855f7', overdue: '#ef4444' };

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { t, formatMoney } = useI18n();
  const [invoice, setInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchInvoice = () => {
    api.get(`/invoices/${id}`).then(r => setInvoice(r.data)).catch(() => toast.error(t('failed_to_load_invoice')));
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const changeStatus = async (status) => {
    try {
      await api.put(`/invoices/${id}/status`, { status });
      toast.success(t('status_updated'));
      fetchInvoice();
    } catch (err) {
      toast.error(err.response?.data?.error || t('failed_to_update_status'));
    }
  };

  if (!invoice) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  const subtotal = (invoice.lineItems || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * (invoice.taxRate || 0) / 100;
  const total = invoice.total || (subtotal + taxAmount);
  const paidAmount = invoice.paidAmount || 0;
  const outstanding = total - paidAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/invoices" className="p-2 text-gray-400 hover:text-pg-purple">
          <HiOutlineArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-inter font-bold text-xl text-white">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-gray-400">{invoice.client?.companyName || invoice.clientName}</p>
        </div>
        <StatusBadge status={invoice.status} color={statusColors[invoice.status]} />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowEditModal(true)} className="btn-pg-outline flex items-center gap-2 text-sm">
          <HiOutlinePencil className="w-4 h-4" /> Edit Invoice
        </button>
        {invoice.status === 'draft' && (
          <button onClick={() => changeStatus('sent')} className="btn-pg-outline flex items-center gap-2 text-sm">
            <HiOutlineMail className="w-4 h-4" /> {t('mark_as_sent')}
          </button>
        )}
        {(invoice.status === 'sent' || invoice.status === 'partial' || invoice.status === 'overdue') && (
          <button onClick={() => changeStatus('paid')} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlineCheckCircle className="w-4 h-4" /> {t('mark_as_paid')}
          </button>
        )}
        {invoice.status !== 'paid' && (
          <button onClick={() => setShowPaymentModal(true)} className="btn-pg-outline flex items-center gap-2 text-sm">
            <HiOutlineCash className="w-4 h-4" /> {t('record_payment')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Info */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-inter font-bold text-lg">{t('invoice_details')}</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('status')}</span>
            <StatusBadge status={invoice.status} color={statusColors[invoice.status]} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('issue_date')}</span>
            <span>{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('due_date')}</span>
            <span>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('client')}</span>
            <span>{invoice.client?.companyName || invoice.clientName}</span>
          </div>
          {invoice.deal && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('deal')}</span>
              <Link to={`/deals/${invoice.deal.id}`} className="text-pg-purple hover:underline">{invoice.deal.title}</Link>
            </div>
          )}
          {invoice.notes && (
            <div className="pt-2 border-t border-pg-border">
              <p className="text-sm text-gray-400">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('line_items')}</h3>
          <table className="table-dark">
            <thead>
              <tr>
                <th>{t('description')}</th>
                <th className="text-right">{t('qty')}</th>
                <th className="text-right">{t('unit_price')}</th>
                <th className="text-right">{t('total')}</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lineItems || []).map((item, i) => (
                <motion.tr key={item.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td className="text-gray-300">{item.description}</td>
                  <td className="text-right text-gray-400">{item.quantity}</td>
                  <td className="text-right font-mono text-sm">{formatMoney(item.unitPrice)}</td>
                  <td className="text-right font-mono text-sm text-pg-purple">{formatMoney(item.quantity * item.unitPrice)}</td>
                </motion.tr>
              ))}
              {(!invoice.lineItems || invoice.lineItems.length === 0) && (
                <tr><td colSpan={4} className="text-center text-gray-500 py-4">{t('no_line_items')}</td></tr>
              )}
            </tbody>
          </table>

          {/* Total Breakdown */}
          <div className="mt-4 pt-4 border-t border-pg-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('subtotal')}</span>
              <span className="font-mono">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('tax')} ({invoice.taxRate || 0}%)</span>
              <span className="font-mono">{formatMoney(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>{t('total')}</span>
              <span className="text-pg-purple font-mono">{formatMoney(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neon-green">{t('paid')}</span>
              <span className="font-mono text-neon-green">{formatMoney(paidAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span className={outstanding > 0 ? 'text-neon-red' : 'text-neon-green'}>{t('outstanding')}</span>
              <span className={`font-mono ${outstanding > 0 ? 'text-neon-red' : 'text-neon-green'}`}>{formatMoney(outstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-inter font-bold text-lg mb-4">{t('payment_history')}</h3>
        {(invoice.payments || []).length > 0 ? (
          <table className="table-dark">
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('amount')}</th>
                <th>{t('method')}</th>
                <th>{t('reference')}</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.payments || []).map((payment, i) => (
                <motion.tr key={payment.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td className="text-gray-400 text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="text-neon-green font-mono text-sm">{formatMoney(payment.amount)}</td>
                  <td className="text-gray-400 text-sm">{payment.method || '-'}</td>
                  <td className="text-gray-500 text-sm font-mono">{payment.reference || '-'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">{t('no_payments_recorded')}</p>
        )}
      </div>

      <RecordPaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoiceId={invoice.id}
        outstanding={outstanding}
        onSaved={fetchInvoice}
      />

      <EditInvoiceModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        invoice={invoice}
        onSaved={fetchInvoice}
      />
    </div>
  );
}

function RecordPaymentModal({ show, onClose, invoiceId, outstanding, onSaved }) {
  const { t, formatMoney } = useI18n();
  const [form, setForm] = useState({
    amount: '',
    method: 'bank_transfer',
    reference: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/invoices/${invoiceId}/payments`, {
        amount: parseFloat(form.amount),
        method: form.method,
        reference: form.reference,
        date: form.date,
      });
      toast.success(t('payment_recorded'));
      setForm({ amount: '', method: 'bank_transfer', reference: '', date: new Date().toISOString().split('T')[0] });
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || t('failed_to_record_payment'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={t('record_payment')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-pg-dark2/50 border border-pg-border text-sm">
          <span className="text-gray-400">{t('outstanding')}: </span>
          <span className="font-mono text-pg-purple font-bold">{formatMoney(outstanding)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">{t('amount')} *</label>
            <input
              type="number"
              className="input-dark"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              step="0.01"
              min="0.01"
              max={outstanding}
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label-text">{t('date')} *</label>
            <input
              type="date"
              className="input-dark"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">{t('payment_method')}</label>
            <select className="input-dark" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
              <option value="bank_transfer">{t('bank_transfer')}</option>
              <option value="cash">{t('cash')}</option>
              <option value="check">{t('check')}</option>
              <option value="card">{t('card')}</option>
              <option value="other">{t('other')}</option>
            </select>
          </div>
          <div>
            <label className="label-text">{t('reference')}</label>
            <input
              className="input-dark"
              value={form.reference}
              onChange={e => setForm({ ...form, reference: e.target.value })}
              placeholder={t('payment_reference')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">{t('cancel')}</button>
          <button type="submit" disabled={submitting} className="btn-pg-primary text-sm disabled:opacity-50">
            {submitting ? t('saving') : t('record_payment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditInvoiceModal({ show, onClose, invoice, onSaved }) {
  const { t, formatMoney } = useI18n();
  const [lineItems, setLineItems] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show && invoice) {
      setLineItems((invoice.lineItems || []).map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, total: l.quantity * l.unitPrice })));
      setTaxRate(invoice.taxRate || 0);
      setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
      setNotes(invoice.notes || '');
    }
  }, [show, invoice]);

  const addLine = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);

  const updateLine = (idx, field, value) => {
    const items = [...lineItems];
    items[idx][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      items[idx].total = (items[idx].quantity || 0) * (items[idx].unitPrice || 0);
    }
    setLineItems(items);
  };

  const removeLine = (idx) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const subtotal = lineItems.reduce((sum, l) => sum + (l.total || 0), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/invoices/${invoice.id}`, {
        lineItems: lineItems.filter(l => l.description),
        taxRate,
        taxAmount,
        subtotal,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes: notes || null
      });
      toast.success('Invoice updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title="Edit Invoice" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text mb-0">Line Items</label>
            <button type="button" onClick={addLine} className="btn-pg-outline text-xs flex items-center gap-1">
              <HiOutlinePlus className="w-3 h-3" /> Add Line
            </button>
          </div>
          <div className="space-y-2">
            {lineItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="input-dark flex-1 text-sm" placeholder="Description" value={item.description}
                  onChange={e => updateLine(i, 'description', e.target.value)} />
                <input type="number" className="input-dark w-20 text-sm" placeholder="Qty" value={item.quantity}
                  onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 0)} min={1} />
                <input type="number" className="input-dark w-28 text-sm" placeholder="Price" value={item.unitPrice}
                  onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} step="0.01" />
                <span className="text-sm text-pg-purple font-mono w-24 text-right">{formatMoney(item.total)}</span>
                <button type="button" onClick={() => removeLine(i)} className="p-1 text-gray-500 hover:text-neon-red">
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tax & Due Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-text">Tax Rate (%)</label>
            <input type="number" className="input-dark" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} step="0.1" min="0" />
          </div>
          <div>
            <label className="label-text">Due Date</label>
            <input type="date" className="input-dark" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Notes</label>
            <input className="input-dark" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        {/* Totals Preview */}
        <div className="p-3 rounded-lg bg-pg-dark2/50 border border-pg-border space-y-1">
          <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="font-mono">{formatMoney(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Tax ({taxRate}%)</span><span className="font-mono">{formatMoney(taxAmount)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-pg-purple font-mono">{formatMoney(totalAmount)}</span></div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-pg-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
