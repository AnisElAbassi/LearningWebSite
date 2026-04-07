import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTruck } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import { useI18n } from '../hooks/useI18n';

const CATEGORIES = [
  { value: 'transport', label: 'Transport', icon: '🚛' },
  { value: 'food', label: 'Food / Meals', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function LogisticsCostsPage() {
  const { t, formatMoney } = useI18n();
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/logistics/summary', { params: { month, year } }),
      api.get('/events')
    ]).then(([summaryRes, eventsRes]) => {
      const data = summaryRes.data;
      setSummary(data);
      setItems(data.items || []);
      setEvents(eventsRes.data?.events || eventsRes.data || []);
    }).catch(() => {
      toast.error('Failed to load logistics data');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const getCategoryTotal = (category) => {
    if (summary?.byCategory) return summary.byCategory[category] || 0;
    return items
      .filter(i => i.category === category)
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('logisticsCosts') || 'Logistics Costs'}</h1>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> {t('addCost') || 'Add Cost'}
          </button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIES.map(cat => (
          <motion.div key={cat.value} whileHover={{ scale: 1.02 }} className="glass-card rounded-xl p-4 border border-pg-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">{cat.label}</p>
                <p className="text-xl font-inter font-bold mt-1 text-pg-purple">{formatMoney(getCategoryTotal(cat.value))}</p>
              </div>
              <span className="text-2xl opacity-40">{cat.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Line Items Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead>
            <tr>
              <th>{t('event') || 'Event'}</th>
              <th>{t('category') || 'Category'}</th>
              <th>{t('description') || 'Description'}</th>
              <th>{t('amount') || 'Amount'}</th>
              <th>{t('date') || 'Date'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="font-medium">
                  Event #{item.eventId}
                  {item.event?.client?.companyName && (
                    <span className="text-gray-500 text-xs ml-1">({item.event.client.companyName})</span>
                  )}
                </td>
                <td>
                  <span className="text-sm text-gray-300 capitalize">{item.category}</span>
                </td>
                <td className="text-gray-400 text-sm">{item.description || '—'}</td>
                <td className="text-pg-purple font-mono text-sm font-medium">{formatMoney(item.amount)}</td>
                <td className="text-gray-500 text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && (
          <p className="text-gray-500 text-sm text-center py-8">{t('noLogisticsCosts') || 'No logistics costs for this period'}</p>
        )}
      </div>

      <AddLogisticsCostModal
        show={showModal}
        onClose={() => setShowModal(false)}
        events={events}
        onSaved={fetchData}
      />
    </div>
  );
}

function AddLogisticsCostModal({ show, onClose, events, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ eventId: '', category: 'transport', description: '', amount: '' });

  useEffect(() => {
    if (show) setForm({ eventId: '', category: 'transport', description: '', amount: '' });
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/logistics/event/${form.eventId}`, {
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
      });
      toast.success(t('costAdded') || 'Logistics cost added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add cost');
    }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={t('addLogisticsCost') || 'Add Logistics Cost'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text">{t('event') || 'Event'} *</label>
          <select
            className="input-dark"
            value={form.eventId}
            onChange={e => setForm({ ...form, eventId: e.target.value })}
            required
          >
            <option value="">{t('selectEvent') || 'Select event...'}</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                #{ev.id} — {ev.client?.companyName || 'Event'} ({new Date(ev.startTime).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-text">{t('category') || 'Category'} *</label>
          <select
            className="input-dark"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            required
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-text">{t('description') || 'Description'}</label>
          <input
            className="input-dark"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder={t('descriptionPlaceholder') || 'e.g. Round trip fuel cost'}
          />
        </div>
        <div>
          <label className="label-text">{t('amount') || 'Amount'} *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-dark"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">{t('cancel') || 'Cancel'}</button>
          <button type="submit" className="btn-pg-primary text-sm">{t('add') || 'Add'}</button>
        </div>
      </form>
    </Modal>
  );
}
