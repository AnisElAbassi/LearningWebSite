import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineCurrencyDollar } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';

const stageColors = { prospect: '#6b7280', proposal_sent: '#f59e0b', negotiating: '#a855f7', confirmed: '#fbbf24', completed: '#10b981', lost: '#ef4444' };

export default function DealsPage() {
  const [pipeline, setPipeline] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [view, setView] = useState('pipeline');

  const fetchPipeline = async () => {
    const [pRes, cRes, eRes] = await Promise.all([
      api.get('/deals/pipeline'),
      api.get('/clients'),
      api.get('/experiences')
    ]);
    setPipeline(pRes.data);
    setClients(cRes.data.clients || []);
    setExperiences(eRes.data);
  };

  useEffect(() => { fetchPipeline(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Deals Pipeline</h1>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'pipeline' ? 'list' : 'pipeline')} className="btn-pg-outline text-sm">
            {view === 'pipeline' ? 'List View' : 'Pipeline View'}
          </button>
          <button onClick={() => setShowModal(true)} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> New Deal
          </button>
        </div>
      </div>

      {view === 'pipeline' ? (
        <div className="w-full overflow-x-scroll pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="inline-flex gap-4 min-w-full">
          {pipeline.map(stage => (
            <div key={stage.stage} className="w-60 md:w-72 flex-none">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="font-inter font-bold text-sm">{stage.label}</h3>
                  <span className="text-xs text-gray-500">({stage.deals.length})</span>
                </div>
                <span className="text-xs text-pg-purple font-mono">€{(stage.totalValue || 0).toLocaleString()}</span>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {stage.deals.map((deal, i) => (
                  <motion.div key={deal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/deals/${deal.id}`} className="glass-card-hover rounded-lg p-3 block">
                      <h4 className="font-medium text-sm">{deal.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{deal.client?.companyName}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-inter text-pg-purple">€{(deal.price || 0).toLocaleString()}</span>
                        <StatusBadge status={deal.stage} color={deal.stage === 'paid' ? '#10b981' : deal.stage === 'overdue' ? '#ef4444' : '#6b7280'} />
                      </div>
                    </Link>
                  </motion.div>
                ))}
                {stage.deals.length === 0 && (
                  <div className="p-4 border border-dashed border-pg-border rounded-lg text-center">
                    <p className="text-xs text-gray-600">No deals</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="table-dark">
            <thead><tr><th>Deal</th><th>Client</th><th>Stage</th><th>Value</th><th>Created</th></tr></thead>
            <tbody>
              {pipeline.flatMap(s => s.deals).map(deal => (
                <tr key={deal.id}>
                  <td><Link to={`/deals/${deal.id}`} className="font-medium hover:text-pg-purple">{deal.title}</Link></td>
                  <td className="text-gray-400">{deal.client?.companyName}</td>
                  <td><StatusBadge status={deal.stage} color={stageColors[deal.stage]} /></td>
                  <td className="text-pg-purple font-mono">€{(deal.price || 0).toLocaleString()}</td>
                  <td className="text-xs text-gray-500">{new Date(deal.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DealCreateModal show={showModal} onClose={() => setShowModal(false)} clients={clients} experiences={experiences} onSaved={fetchPipeline} />
    </div>
  );
}

function DealCreateModal({ show, onClose, clients, experiences, onSaved }) {
  const [form, setForm] = useState({ clientId: '', title: '', stage: 'prospect', price: '', discount: 0, notes: '' });
  const [lineItems, setLineItems] = useState([]);

  const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const updateLineItem = (index, field, value) => {
    const items = [...lineItems];
    items[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].total = items[index].quantity * items[index].unitPrice;
    }
    setLineItems(items);
    setForm(f => ({ ...f, price: items.reduce((sum, i) => sum + i.total, 0) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/deals', {
        ...form,
        clientId: parseInt(form.clientId),
        price: parseFloat(form.price) || 0,
        discount: parseFloat(form.discount) || 0,
        lineItems: lineItems.filter(l => l.description)
      });
      toast.success('Deal created');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title="New Deal" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-text">Client *</label>
            <select className="input-dark" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div><label className="label-text">Deal Title *</label>
            <input className="input-dark" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Q1 Team Building Package" />
          </div>
          <div><label className="label-text">Stage</label>
            <select className="input-dark" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
              {Object.entries(stageColors).map(([k]) => <option key={k} value={k}>{k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </div>
        </div>

        {/* Line Items / Package Builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text mb-0">Package Items</label>
            <button type="button" onClick={addLineItem} className="btn-pg-outline text-xs">+ Add Item</button>
          </div>
          {lineItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2">
              <input className="input-dark col-span-5 text-sm" placeholder="Description" value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} />
              <input type="number" className="input-dark col-span-2 text-sm" placeholder="Qty" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseInt(e.target.value) || 0)} min={1} />
              <input type="number" className="input-dark col-span-3 text-sm" placeholder="Unit €" value={item.unitPrice} onChange={e => updateLineItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} step="0.01" />
              <div className="col-span-2 flex items-center text-sm text-pg-purple font-mono">€{item.total.toFixed(0)}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-text">Total Price (€)</label>
            <input type="number" className="input-dark" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} step="0.01" />
          </div>
          <div><label className="label-text">Discount (€)</label>
            <input type="number" className="input-dark" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} step="0.01" />
          </div>
          <div className="flex items-end">
            <div className="text-lg font-inter text-pg-purple">Net: €{((parseFloat(form.price) || 0) - (parseFloat(form.discount) || 0)).toFixed(0)}</div>
          </div>
        </div>

        <div><label className="label-text">Notes</label><textarea className="input-dark" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">Create Deal</button>
        </div>
      </form>
    </Modal>
  );
}
