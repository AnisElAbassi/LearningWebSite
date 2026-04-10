import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencil, HiOutlinePlus } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';

const stageColors = { prospect: '#6b7280', proposal_sent: '#f59e0b', negotiating: '#a855f7', confirmed: '#fbbf24', completed: '#10b981', lost: '#ef4444' };
const stages = ['prospect', 'proposal_sent', 'negotiating', 'confirmed', 'completed', 'lost'];

export default function DealDetailPage() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetch = () => api.get(`/deals/${id}`).then(r => setDeal(r.data));
  useEffect(() => { fetch(); }, [id]);

  const changeStage = async (stage) => {
    await api.put(`/deals/${id}`, { stage });
    toast.success(`Stage updated to ${stage}`);
    fetch();
  };

  const createEvent = async () => {
    try {
      const res = await api.post(`/events/from-deal/${id}`);
      toast.success('Event created!');
      window.location.href = `/events/${res.data.id}`;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event');
    }
  };


  if (!deal) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/deals" className="p-2 text-gray-400 hover:text-pg-purple"><HiOutlineArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="font-inter font-bold text-xl text-white">{deal.title}</h1>
          <p className="text-sm text-gray-400">{deal.client?.companyName}</p>
        </div>
        <button onClick={() => setShowEditModal(true)} className="btn-pg-outline flex items-center gap-2 text-sm">
          <HiOutlinePencil className="w-4 h-4" /> Edit Deal
        </button>
        <div className="text-right">
          <p className="text-2xl font-inter font-bold text-pg-purple">€{((deal.price || 0) - (deal.discount || 0)).toLocaleString()}</p>
          {deal.discount > 0 && <p className="text-xs text-gray-500">Discount: €{deal.discount}</p>}
        </div>
      </div>

      {/* Create Event CTA */}
      {deal.stage === 'confirmed' && (
        <div className="glass-card rounded-xl p-5 border border-neon-green/30 bg-neon-green/5 flex items-center justify-between">
          <div>
            <p className="font-inter font-bold text-neon-green">Deal Confirmed!</p>
            <p className="text-sm text-gray-400">Ready to create an event for this client.</p>
          </div>
          <button onClick={createEvent} className="btn-pg-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Create Event
          </button>
        </div>
      )}

      {/* Stage Pipeline */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-inter font-bold text-sm text-gray-400 mb-3">Deal Stage</h3>
        <div className="flex items-center gap-1">
          {stages.map((s, i) => (
            <button key={s} onClick={() => changeStage(s)}
              className={`flex-1 py-2 text-xs font-medium rounded transition-all ${deal.stage === s ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
              style={deal.stage === s ? { backgroundColor: stageColors[s], boxShadow: `0 0 15px ${stageColors[s]}40` } : { backgroundColor: '#1e1e3a' }}>
              {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-inter font-bold text-lg">Deal Info</h3>
          <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Stage</span><StatusBadge status={deal.stage} color={stageColors[deal.stage]} /></div>
          <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Invoices</span>
            <Link to={`/invoices?clientId=${deal.clientId}`} className="text-pg-purple hover:underline text-xs">View Invoices</Link>
          </div>
          <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Created</span><span>{new Date(deal.createdAt).toLocaleDateString()}</span></div>
          {deal.followUpDate && <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Follow-up</span><span>{new Date(deal.followUpDate).toLocaleDateString()}</span></div>}
          {deal.notes && <div className="pt-2 border-t border-pg-border"><p className="text-sm text-gray-400">{deal.notes}</p></div>}
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3">Line Items</h3>
          {deal.lineItems?.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-pg-border/30 text-sm">
              <span className="text-gray-300">{item.description}</span>
              <span className="text-pg-purple font-mono">{item.quantity}× €{item.unitPrice} = €{item.total}</span>
            </div>
          ))}
          {(!deal.lineItems || deal.lineItems.length === 0) && <p className="text-gray-500 text-sm text-center py-4">No line items</p>}
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3">Linked Events</h3>
          {deal.events?.map(e => (
            <Link key={e.id} to={`/events/${e.id}`} className="block p-2 rounded-lg hover:bg-pg-dark2/30 transition-colors mb-1">
              <p className="text-sm font-medium">{e.experience?.name}</p>
              <p className="text-xs text-gray-500">{new Date(e.startTime).toLocaleDateString()}</p>
            </Link>
          ))}
          {(!deal.events || deal.events.length === 0) && <p className="text-gray-500 text-sm text-center py-4">No linked events</p>}
        </div>
      </div>

      <DealEditModal show={showEditModal} onClose={() => setShowEditModal(false)} deal={deal} onSaved={fetch} />
    </div>
  );
}

function DealEditModal({ show, onClose, deal, onSaved }) {
  const [form, setForm] = useState({ title: '', price: '', discount: '', notes: '', stage: '' });
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    if (deal && show) {
      setForm({ title: deal.title || '', price: deal.price || '', discount: deal.discount || 0, notes: deal.notes || '', stage: deal.stage || '' });
      setLineItems((deal.lineItems || []).map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, total: l.total || l.quantity * l.unitPrice })));
    }
  }, [deal, show]);

  const addLine = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const updateLine = (i, field, value) => {
    const items = [...lineItems];
    items[i][field] = value;
    if (field === 'quantity' || field === 'unitPrice') items[i].total = items[i].quantity * items[i].unitPrice;
    setLineItems(items);
    setForm(f => ({ ...f, price: items.reduce((sum, it) => sum + it.total, 0) }));
  };
  const removeLine = (i) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/deals/${deal.id}`, {
        title: form.title,
        price: parseFloat(form.price) || 0,
        discount: parseFloat(form.discount) || 0,
        notes: form.notes,
        stage: form.stage,
        lineItems: lineItems.filter(l => l.description),
      });
      toast.success('Deal updated');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title="Edit Deal" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-text">Title *</label><input className="input-dark" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
          <div><label className="label-text">Stage</label>
            <select className="input-dark" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
              {stages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text mb-0">Line Items</label>
            <button type="button" onClick={addLine} className="btn-pg-outline text-xs">+ Add Item</button>
          </div>
          {lineItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2">
              <input className="input-dark col-span-5 text-sm" placeholder="Description" value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} />
              <input type="number" className="input-dark col-span-2 text-sm" placeholder="Qty" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 0)} min={1} />
              <input type="number" className="input-dark col-span-3 text-sm" placeholder="Unit €" value={item.unitPrice} onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} step="0.01" />
              <div className="col-span-1 flex items-center text-sm text-pg-purple font-mono">€{item.total?.toFixed(0)}</div>
              <button type="button" onClick={() => removeLine(i)} className="col-span-1 text-gray-500 hover:text-neon-red text-xs">×</button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-text">Total Price (€)</label><input type="number" className="input-dark" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} step="0.01" /></div>
          <div><label className="label-text">Discount (€)</label><input type="number" className="input-dark" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} step="0.01" /></div>
          <div className="flex items-end"><div className="text-lg font-inter text-pg-purple">Net: €{((parseFloat(form.price) || 0) - (parseFloat(form.discount) || 0)).toFixed(0)}</div></div>
        </div>

        <div><label className="label-text">Notes</label><textarea className="input-dark" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-ghost text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}
