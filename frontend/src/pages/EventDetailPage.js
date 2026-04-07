import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineCheck, HiOutlineCurrencyDollar, HiOutlineCube, HiOutlineUserGroup } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/layout/StatusBadge';

const statusColors = { draft: '#6b7280', confirmed: '#a855f7', in_progress: '#fbbf24', completed: '#10b981', cancelled: '#ef4444' };
const statusFlow = ['draft', 'confirmed', 'in_progress', 'completed'];

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [costs, setCosts] = useState(null);

  const fetchEvent = () => api.get(`/events/${id}`).then(r => setEvent(r.data));
  const fetchCosts = () => api.get(`/costs/event/${id}`).then(r => setCosts(r.data)).catch(() => {});

  useEffect(() => { fetchEvent(); fetchCosts(); }, [id]);

  const changeStatus = async (status) => {
    await api.put(`/events/${id}/status`, { status });
    toast.success(`Status changed to ${status}`);
    fetchEvent();
  };

  const toggleChecklist = async (checkId, isCompleted) => {
    await api.put(`/events/${id}/checklist/${checkId}`, { isCompleted: !isCompleted });
    fetchEvent();
  };

  const calculateCosts = async () => {
    const { data } = await api.post(`/costs/calculate/${id}`);
    setCosts(data);
    toast.success('Costs calculated');
  };

  if (!event) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/events" className="p-2 text-gray-400 hover:text-pg-purple"><HiOutlineArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-inter font-bold text-xl text-white">Event #{event.id}</h1>
            <p className="text-sm text-gray-400">{event.client?.companyName} — {event.experience?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={event.status} color={statusColors[event.status]} pulse={event.status === 'in_progress'} />
          {event.status !== 'cancelled' && event.status !== 'completed' && (
            <div className="flex gap-1">
              {statusFlow.filter(s => s !== event.status).map(s => (
                <button key={s} onClick={() => changeStatus(s)} className="btn-pg-outline text-xs">
                  {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
              <button onClick={() => changeStatus('cancelled')} className="btn-pg-danger text-xs">Cancel</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Details */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-inter font-bold text-lg">Details</h3>
          <Detail label="Date" value={new Date(event.startTime).toLocaleDateString()} />
          <Detail label="Time" value={`${new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
          <Detail label="Experience" value={event.experience?.name} />
          <Detail label="Client" value={event.client?.companyName} link={`/clients/${event.clientId}`} />
          <Detail label="Operator" value={event.operator?.name || 'Unassigned'} />
          <Detail label="Participants" value={event.participants || 'N/A'} />
          <Detail label="Venue Address" value={event.venueAddress || 'N/A'} />
          {event.notes && <div className="pt-2 border-t border-pg-border"><p className="text-sm text-gray-400">{event.notes}</p></div>}
        </div>

        {/* Hardware */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2"><HiOutlineCube className="text-pg-purple" /> Hardware ({event.hardware?.length || 0})</h3>
          <div className="space-y-2">
            {event.hardware?.map(h => (
              <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-pg-dark2/30">
                <div>
                  <p className="text-sm font-medium">{h.item?.name}</p>
                  <p className="text-xs text-gray-400">{h.item?.type?.name} {h.item?.serialNumber && `• ${h.item.serialNumber}`}</p>
                </div>
                <span className="text-xs text-gray-500">×{h.quantity}</span>
              </div>
            ))}
            {(!event.hardware || event.hardware.length === 0) && <p className="text-gray-500 text-sm text-center py-4">No hardware assigned</p>}
          </div>
        </div>

        {/* Checklist */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2"><HiOutlineCheck className="text-neon-green" /> Checklist</h3>
          <div className="space-y-2">
            {event.checklist?.map(item => (
              <label key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-pg-dark2/30 cursor-pointer transition-colors">
                <input type="checkbox" checked={item.isCompleted} onChange={() => toggleChecklist(item.id, item.isCompleted)} className="accent-pg-purple" />
                <span className={`text-sm ${item.isCompleted ? 'line-through text-gray-600' : 'text-gray-300'}`}>{item.task}</span>
              </label>
            ))}
            {(!event.checklist || event.checklist.length === 0) && <p className="text-gray-500 text-sm text-center py-4">No checklist items</p>}
          </div>
        </div>
      </div>

      {/* Cost Card */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-inter font-bold text-lg flex items-center gap-2"><HiOutlineCurrencyDollar className="text-pg-purple" /> Cost Breakdown</h3>
          <button onClick={calculateCosts} className="btn-pg-outline text-xs">Calculate Costs</button>
        </div>
        {costs ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <CostItem label="Experience" value={costs.experienceCost} />
            <CostItem label="Personnel" value={costs.personnelCost} />
            <CostItem label="Transport" value={costs.transportCost} />
            <CostItem label="Food" value={costs.foodCost} />
            <CostItem label="Hotel" value={costs.hotelCost} />
            <CostItem label="Total Cost" value={costs.totalCost} color="pg-yellow" />
            <CostItem label="Revenue" value={costs.revenue} color="pg-purple" />
            <CostItem label="Margin" value={`${costs.marginPct.toFixed(1)}%`} color={costs.marginPct >= 30 ? 'neon-green' : 'neon-red'} isPercent />
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">Click "Calculate Costs" to generate cost breakdown</p>
        )}
      </div>

      {/* Staff */}
      {event.staff && event.staff.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2"><HiOutlineUserGroup className="text-pg-purple" /> Assigned Staff</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {event.staff.map(s => (
              <div key={s.id} className="p-3 rounded-lg bg-pg-dark2/30 border border-pg-border/30">
                <p className="font-medium text-sm">{s.user?.name}</p>
                <p className="text-xs text-gray-400">{s.hoursWorked}h × €{s.rateApplied} = €{s.totalCost}</p>
                {s.isOvertime && <span className="text-[10px] text-neon-orange">Overtime</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, link }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {link ? <Link to={link} className="text-pg-purple hover:underline">{value}</Link> : <span className="text-gray-200">{value}</span>}
    </div>
  );
}

function CostItem({ label, value, color = 'gray-300', isPercent }) {
  return (
    <div className="text-center p-3 rounded-lg bg-pg-dark2/30 border border-pg-border/30">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-lg font-inter font-bold text-${color}`}>
        {isPercent ? value : `€${typeof value === 'number' ? value.toFixed(0) : value}`}
      </p>
    </div>
  );
}
