import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineDocumentText, HiOutlineTrash } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';
import { useI18n } from '../hooks/useI18n';

const statusColors = { draft: '#6b7280', sent: '#f59e0b', paid: '#22c55e', partial: '#a855f7', overdue: '#ef4444' };
const statuses = ['all', 'draft', 'sent', 'paid', 'partial', 'overdue'];

export default function InvoicesPage() {
  const { t, formatMoney } = useI18n();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [deals, setDeals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [invRes, clRes, dlRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/clients'),
        api.get('/deals')
      ]);
      setInvoices(invRes.data.invoices || invRes.data || []);
      setClients(clRes.data.clients || clRes.data || []);
      setDeals(dlRes.data.deals || dlRes.data || []);
    } catch (err) {
      toast.error(t('failed_to_load_invoices') || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = invoices.filter(inv => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const clientName = (inv.client?.companyName || inv.clientName || '').toLowerCase();
      const invNumber = (inv.invoiceNumber || '').toLowerCase();
      if (!clientName.includes(q) && !invNumber.includes(q)) return false;
    }
    return true;
  });

  const counts = statuses.reduce((acc, s) => {
    acc[s] = s === 'all' ? invoices.length : invoices.filter(i => i.status === s).length;
    return acc;
  }, {});

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('invoices')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowDealModal(true)} className="btn-pg-outline flex items-center gap-2 text-sm">
            <HiOutlineDocumentText className="w-4 h-4" /> {t('from_deal')}
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> {t('new_invoice')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex gap-1 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all ${
                filter === s
                  ? 'bg-pg-purple text-white'
                  : 'bg-pg-dark2/50 text-gray-400 hover:text-white hover:bg-pg-dark2'
              }`}
            >
              {s === 'all' ? t('all') : t(s)} ({counts[s]})
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-dark pl-9 text-sm w-full"
            placeholder={t('search_client_or_invoice')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead>
            <tr>
              <th>{t('invoice')} #</th>
              <th>{t('client')}</th>
              <th>{t('status')}</th>
              <th>{t('issue_date')}</th>
              <th>{t('due_date')}</th>
              <th>{t('total')}</th>
              <th>{t('paid')}</th>
              <th>{t('outstanding')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, i) => (
              <motion.tr
                key={inv.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <td>
                  <Link to={`/invoices/${inv.id}`} className="font-medium hover:text-pg-purple font-mono text-sm">
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="text-gray-400">{inv.client?.companyName || inv.clientName}</td>
                <td><StatusBadge status={inv.status} color={statusColors[inv.status]} /></td>
                <td className="text-xs text-gray-500">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</td>
                <td className="text-xs text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</td>
                <td className="text-pg-purple font-mono text-sm">{formatMoney(inv.total)}</td>
                <td className="text-neon-green font-mono text-sm">{formatMoney(inv.paidAmount || 0)}</td>
                <td className="font-mono text-sm" style={{ color: (inv.total - (inv.paidAmount || 0)) > 0 ? '#ef4444' : '#22c55e' }}>
                  {formatMoney((inv.total || 0) - (inv.paidAmount || 0))}
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-8">
                  {t('no_invoices_found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <InvoiceCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        clients={clients}
        onSaved={fetchData}
      />

      <DealInvoiceModal
        show={showDealModal}
        onClose={() => setShowDealModal(false)}
        deals={deals}
        onSaved={fetchData}
      />
    </div>
  );
}

function InvoiceCreateModal({ show, onClose, clients, onSaved }) {
  const { t, formatMoney } = useI18n();
  const [form, setForm] = useState({
    clientId: '',
    dueDate: '',
    taxRate: 0,
    notes: '',
  });
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);

  const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);

  const updateLineItem = (index, field, value) => {
    const items = [...lineItems];
    items[index][field] = value;
    setLineItems(items);
  };

  const removeLineItem = (index) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * (parseFloat(form.taxRate) || 0) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invoices', {
        clientId: parseInt(form.clientId),
        dueDate: form.dueDate,
        taxRate: parseFloat(form.taxRate) || 0,
        notes: form.notes,
        lineItems: lineItems.filter(l => l.description).map(l => ({
          description: l.description,
          quantity: parseInt(l.quantity) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
        })),
      });
      toast.success(t('invoice_created'));
      setForm({ clientId: '', dueDate: '', taxRate: 0, notes: '' });
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || t('failed_to_create_invoice'));
    }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={t('new_invoice')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">{t('client')} *</label>
            <select className="input-dark" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">{t('select_client')}</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">{t('due_date')} *</label>
            <input type="date" className="input-dark" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text mb-0">{t('line_items')}</label>
            <button type="button" onClick={addLineItem} className="btn-pg-outline text-xs">+ {t('add_item')}</button>
          </div>
          <div className="space-y-2">
            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="input-dark col-span-5 text-sm"
                  placeholder={t('description')}
                  value={item.description}
                  onChange={e => updateLineItem(i, 'description', e.target.value)}
                />
                <input
                  type="number"
                  className="input-dark col-span-2 text-sm"
                  placeholder={t('qty')}
                  value={item.quantity}
                  onChange={e => updateLineItem(i, 'quantity', parseInt(e.target.value) || 0)}
                  min={1}
                />
                <input
                  type="number"
                  className="input-dark col-span-3 text-sm"
                  placeholder={t('unit_price')}
                  value={item.unitPrice}
                  onChange={e => updateLineItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                  step="0.01"
                />
                <div className="col-span-1 text-sm text-pg-purple font-mono">{formatMoney(item.quantity * item.unitPrice)}</div>
                <button type="button" onClick={() => removeLineItem(i)} className="col-span-1 text-gray-500 hover:text-neon-red">
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tax & Totals */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label-text">{t('tax_rate')} (%)</label>
            <input
              type="number"
              className="input-dark"
              value={form.taxRate}
              onChange={e => setForm({ ...form, taxRate: e.target.value })}
              step="0.1"
              min={0}
            />
          </div>
          <div className="col-span-2 flex items-end justify-end">
            <div className="text-right space-y-1">
              <p className="text-sm text-gray-400">{t('subtotal')}: <span className="font-mono text-white">{formatMoney(subtotal)}</span></p>
              <p className="text-sm text-gray-400">{t('tax')}: <span className="font-mono text-white">{formatMoney(taxAmount)}</span></p>
              <p className="text-lg font-inter font-bold text-pg-purple">{t('total')}: {formatMoney(total)}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="label-text">{t('notes')}</label>
          <textarea className="input-dark" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">{t('cancel')}</button>
          <button type="submit" className="btn-pg-primary text-sm">{t('create_invoice')}</button>
        </div>
      </form>
    </Modal>
  );
}

function DealInvoiceModal({ show, onClose, deals, onSaved }) {
  const { t } = useI18n();
  const [selectedDealId, setSelectedDealId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!selectedDealId) return;
    setSubmitting(true);
    try {
      await api.post('/invoices/from-deal', { dealId: parseInt(selectedDealId) });
      toast.success(t('invoice_generated_from_deal'));
      onSaved();
      onClose();
      setSelectedDealId('');
    } catch (err) {
      toast.error(err.response?.data?.error || t('failed_to_generate_invoice'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={t('generate_invoice_from_deal')} size="md">
      <div className="space-y-4">
        <div>
          <label className="label-text">{t('select_deal')}</label>
          <select className="input-dark" value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}>
            <option value="">{t('select_deal')}</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>{d.title} - {d.client?.companyName || ''}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">{t('cancel')}</button>
          <button
            onClick={handleGenerate}
            disabled={!selectedDealId || submitting}
            className="btn-pg-primary text-sm disabled:opacity-50"
          >
            {submitting ? t('generating') : t('generate_invoice')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
