import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineMail, HiOutlinePhone, HiOutlineStar, HiOutlinePlus } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';
import { useI18n } from '../hooks/useI18n';

const statusColors = { draft: '#6b7280', confirmed: '#a855f7', in_progress: '#fbbf24', completed: '#22c55e', cancelled: '#ef4444' };
const stageColors = { prospect: '#6b7280', proposal_sent: '#f59e0b', negotiating: '#a855f7', confirmed: '#fbbf24', completed: '#22c55e', lost: '#ef4444' };
const invoiceColors = { draft: '#6b7280', sent: '#f59e0b', paid: '#22c55e', partial: '#a855f7', overdue: '#ef4444' };
const TABS = ['overview', 'events', 'deals', 'invoices', 'costs', 'feedback', 'notes'];

export default function ClientDetailPage() {
  const { id } = useParams();
  const { t, formatMoney } = useI18n();
  const [client, setClient] = useState(null);
  const [report, setReport] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/reports/client/${id}`).catch(() => ({ data: null })),
      api.get(`/feedback/client/${id}`).catch(() => ({ data: [] })),
      api.get(`/clients/${id}/interactions`).catch(() => ({ data: [] })),
      api.get(`/invoices`, { params: { clientId: id } }).catch(() => ({ data: [] }))
    ]).then(([cRes, rRes, fRes, iRes, invRes]) => {
      setClient(cRes.data);
      setReport(rRes.data);
      setFeedback(fRes.data);
      setInteractions(iRes.data);
      setInvoices(invRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-pg-card rounded w-48 mb-4" /><div className="h-64 bg-pg-card rounded-xl" /></div>;
  if (!client) return <p className="text-gray-500">Client not found</p>;

  const stats = report?.stats || {};
  const loyaltyColors = { new: '#6b7280', returning: '#a855f7', vip: '#fbbf24' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/clients" className="p-2 text-gray-400 hover:text-pg-purple"><HiOutlineArrowLeft className="w-5 h-5" /></Link>
          <div className="w-12 h-12 rounded-full bg-pg-gradient flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-black text-lg">{client.companyName[0]}</span>
          </div>
          <div>
            <h1 className="font-inter font-bold text-xl text-white">{client.companyName}</h1>
            <p className="text-sm text-gray-400">{client.contactName} {client.industry && `· ${client.industry}`}</p>
          </div>
          <StatusBadge status={client.loyaltyTier || 'new'} color={loyaltyColors[client.loyaltyTier] || '#6b7280'} />
        </div>
        <div className="flex items-center gap-4 text-right">
          {stats.avgSatisfaction != null && (
            <div className="flex items-center gap-1">
              <HiOutlineStar className="w-5 h-5 text-pg-yellow" />
              <span className="text-lg font-bold text-pg-yellow">{stats.avgSatisfaction.toFixed(1)}</span>
              <span className="text-xs text-gray-500">/5</span>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">{stats.totalEvents || 0} events</p>
            <p className="text-sm font-bold text-pg-purple">{formatMoney(stats.totalRevenue || 0)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-pg-border pb-0">
        {TABS.map(tabName => (
          <button key={tabName} onClick={() => setTab(tabName)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              tab === tabName ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'
            }`}>
            {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-inter font-bold text-lg">{t('contact_info')}</h3>
            {client.email && <p className="flex items-center gap-2 text-sm text-gray-300"><HiOutlineMail className="text-pg-purple" />{client.email}</p>}
            {client.phone && <p className="flex items-center gap-2 text-sm text-gray-300"><HiOutlinePhone className="text-pg-purple" />{client.phone}</p>}
            {client.billingAddress && <p className="text-sm text-gray-400 mt-2">{client.billingAddress}</p>}
            {client.notes && <div className="pt-3 border-t border-pg-border"><p className="text-sm text-gray-400">{client.notes}</p></div>}
            {client.customFields?.length > 0 && (
              <div className="pt-3 border-t border-pg-border space-y-1">
                {client.customFields.map(cf => (
                  <div key={cf.id} className="text-sm"><span className="text-gray-500">{cf.field.label}:</span> <span className="text-gray-300">{cf.value}</span></div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-3">Financial Summary</h3>
            <div className="space-y-2">
              <DetailRow label="Total Revenue" value={formatMoney(stats.totalRevenue || 0)} />
              <DetailRow label="Total Cost" value={formatMoney(stats.totalCost || 0)} />
              <DetailRow label="Avg Margin" value={`${(stats.avgMargin || 0).toFixed(1)}%`} className={stats.avgMargin >= 30 ? 'text-neon-green' : 'text-neon-red'} />
              <DetailRow label="Invoiced" value={formatMoney(stats.totalInvoiced || 0)} />
              <DetailRow label="Paid" value={formatMoney(stats.totalPaid || 0)} />
              <DetailRow label="Outstanding" value={formatMoney(stats.outstanding || 0)} className={stats.outstanding > 0 ? 'text-neon-red' : 'text-neon-green'} />
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-3">Timeline</h3>
            <div className="space-y-2">
              <DetailRow label="First Event" value={stats.firstEvent ? new Date(stats.firstEvent).toLocaleDateString() : 'None'} />
              <DetailRow label="Last Event" value={stats.lastEvent ? new Date(stats.lastEvent).toLocaleDateString() : 'None'} />
              <DetailRow label="Total Events" value={String(stats.totalEvents || 0)} />
              <DetailRow label="Completed" value={String(stats.completedEvents || 0)} />
              <DetailRow label="Loyalty Tier" value={(client.loyaltyTier || 'new').toUpperCase()} />
              <DetailRow label="Member Since" value={new Date(client.createdAt).toLocaleDateString()} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Events */}
      {tab === 'events' && (
        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="table-dark">
            <thead><tr><th>Date</th><th>Experience</th><th>Participants</th><th>Status</th><th>Revenue</th></tr></thead>
            <tbody>
              {(report?.events || []).map(e => (
                <tr key={e.id}>
                  <td><Link to={`/events/${e.id}`} className="hover:text-pg-purple">{new Date(e.startTime).toLocaleDateString()}</Link></td>
                  <td>{e.experience?.name}</td>
                  <td>{e.participants || '—'}</td>
                  <td><StatusBadge status={e.status} color={statusColors[e.status]} /></td>
                  <td className="text-pg-purple">{e.costs ? formatMoney(e.costs.revenue) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!report?.events || report.events.length === 0) && <p className="text-gray-500 text-sm text-center py-8">No events</p>}
        </div>
      )}

      {/* Tab: Deals */}
      {tab === 'deals' && (
        <div className="space-y-3">
          {client.deals?.map(d => (
            <Link key={d.id} to={`/deals/${d.id}`} className="glass-card-hover rounded-xl p-4 flex items-center justify-between block">
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={d.stage} color={stageColors[d.stage]} />
                <span className="text-pg-purple font-bold">{formatMoney(d.price || 0)}</span>
              </div>
            </Link>
          ))}
          {(!client.deals || client.deals.length === 0) && <p className="text-gray-500 text-center py-8">No deals</p>}
        </div>
      )}

      {/* Tab: Invoices */}
      {tab === 'invoices' && (
        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="table-dark">
            <thead><tr><th>Invoice #</th><th>Status</th><th>Date</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td><Link to={`/invoices/${inv.id}`} className="hover:text-pg-purple font-mono">{inv.invoiceNumber}</Link></td>
                  <td><StatusBadge status={inv.status} color={invoiceColors[inv.status]} /></td>
                  <td className="text-gray-400">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td>{formatMoney(inv.totalAmount)}</td>
                  <td className="text-neon-green">{formatMoney(inv.paidAmount)}</td>
                  <td className={inv.totalAmount - inv.paidAmount > 0 ? 'text-neon-red' : 'text-neon-green'}>{formatMoney(inv.totalAmount - inv.paidAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No invoices</p>}
        </div>
      )}

      {/* Tab: Costs */}
      {tab === 'costs' && (
        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="table-dark">
            <thead><tr><th>Event</th><th>Date</th><th>Experience</th><th>Personnel</th><th>Logistics</th><th>Total</th><th>Revenue</th><th>Margin</th></tr></thead>
            <tbody>
              {(report?.events || []).filter(e => e.costs).map(e => (
                <tr key={e.id}>
                  <td><Link to={`/events/${e.id}`} className="hover:text-pg-purple">#{e.id}</Link></td>
                  <td className="text-gray-400">{new Date(e.startTime).toLocaleDateString()}</td>
                  <td>{formatMoney(e.costs.experienceCost)}</td>
                  <td>{formatMoney(e.costs.personnelCost)}</td>
                  <td>{formatMoney(e.costs.logisticsTotal)}</td>
                  <td className="font-medium">{formatMoney(e.costs.totalCost)}</td>
                  <td className="text-pg-purple">{formatMoney(e.costs.revenue)}</td>
                  <td className={e.costs.marginPct >= 30 ? 'text-neon-green' : 'text-neon-red'}>{e.costs.marginPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(report?.events || []).filter(e => e.costs).length === 0 && <p className="text-gray-500 text-sm text-center py-8">No cost data yet</p>}
        </div>
      )}

      {/* Tab: Feedback */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          {feedback.map(f => (
            <div key={f.id} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between">
                <Link to={`/events/${f.eventId}`} className="text-sm hover:text-pg-purple">{f.event?.experience?.name} — {f.event?.startTime ? new Date(f.event.startTime).toLocaleDateString() : ''}</Link>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <HiOutlineStar key={star} className={`w-4 h-4 ${star <= f.rating ? 'text-pg-yellow' : 'text-gray-600'}`} style={star <= f.rating ? { fill: '#fbbf24' } : {}} />
                  ))}
                </div>
              </div>
              {f.comment && <p className="text-sm text-gray-400 mt-2">{f.comment}</p>}
            </div>
          ))}
          {feedback.length === 0 && <p className="text-gray-500 text-center py-8">No feedback yet</p>}
        </div>
      )}

      {/* Tab: Notes */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <button onClick={() => setShowNoteModal(true)} className="btn-pg-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Add Note
          </button>
          <div className="space-y-3">
            {interactions.map(i => (
              <div key={i.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={i.type} color={i.type === 'call' ? '#a855f7' : i.type === 'email' ? '#fbbf24' : i.type === 'meeting' ? '#22c55e' : '#6b7280'} />
                  <span className="text-sm font-medium">{i.subject}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{new Date(i.createdAt).toLocaleString()}</span>
                </div>
                {i.details && <p className="text-sm text-gray-400">{i.details}</p>}
              </div>
            ))}
            {interactions.length === 0 && <p className="text-gray-500 text-center py-4">No interaction notes yet</p>}
          </div>
          <NoteModal show={showNoteModal} onClose={() => setShowNoteModal(false)} clientId={client.id} onSaved={() => {
            api.get(`/clients/${id}/interactions`).then(r => setInteractions(r.data));
          }} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, className }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={className || 'text-gray-200'}>{value}</span>
    </div>
  );
}

function NoteModal({ show, onClose, clientId, onSaved }) {
  const [form, setForm] = useState({ type: 'note', subject: '', details: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post(`/clients/${clientId}/interactions`, form);
    toast.success('Note added');
    setForm({ type: 'note', subject: '', details: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal isOpen={show} onClose={onClose} title="Add Interaction" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text">Type</label>
          <select className="input-dark" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="note">Note</option>
            <option value="call">Phone Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
          </select>
        </div>
        <div>
          <label className="label-text">Subject *</label>
          <input className="input-dark" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
        </div>
        <div>
          <label className="label-text">Details</label>
          <textarea className="input-dark" rows={3} value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-pg-ghost">Cancel</button>
          <button type="submit" className="btn-pg-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
