import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/layout/StatusBadge';

const stageColors = { prospect: '#6b7280', proposal_sent: '#f59e0b', negotiating: '#a855f7', confirmed: '#fbbf24', completed: '#10b981', lost: '#ef4444' };
const invoiceColors = { draft: '#6b7280', sent: '#f59e0b', paid: '#10b981', overdue: '#ef4444' };
const stages = ['prospect', 'proposal_sent', 'negotiating', 'confirmed', 'completed', 'lost'];

export default function DealDetailPage() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);

  const fetch = () => api.get(`/deals/${id}`).then(r => setDeal(r.data));
  useEffect(() => { fetch(); }, [id]);

  const changeStage = async (stage) => {
    await api.put(`/deals/${id}`, { stage });
    toast.success(`Stage updated to ${stage}`);
    fetch();
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
        <div className="text-right">
          <p className="text-2xl font-inter font-bold text-pg-purple">€{((deal.price || 0) - (deal.discount || 0)).toLocaleString()}</p>
          {deal.discount > 0 && <p className="text-xs text-gray-500">Discount: €{deal.discount}</p>}
        </div>
      </div>

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
    </div>
  );
}
