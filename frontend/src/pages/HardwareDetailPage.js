import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineAdjustments } from 'react-icons/hi';
import api from '../utils/api';
import StatusBadge from '../components/layout/StatusBadge';

const statusColors = { available: '#10b981', in_use: '#a855f7', maintenance: '#f59e0b', retired: '#6b7280' };

export default function HardwareDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => { api.get(`/hardware/${id}`).then(r => setItem(r.data)); }, [id]);

  if (!item) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hardware" className="p-2 text-gray-400 hover:text-pg-purple"><HiOutlineArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="font-inter font-bold text-2xl text-white">{item.name}</h1>
          <p className="text-sm text-gray-400">{item.type.name} {item.model && `• ${item.model}`}</p>
        </div>
        <StatusBadge status={item.status} color={statusColors[item.status]} pulse={item.status === 'in_use'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-inter font-bold text-lg">Details</h3>
          <Detail label="Serial" value={item.serialNumber || 'N/A'} />
          <Detail label="Location" value={item.location || 'N/A'} />
          <Detail label="Daily Rate" value={`€${item.dailyRate || item.type.dailyCost || 0}`} />
          <Detail label="Purchase Price" value={item.purchasePrice ? `€${item.purchasePrice}` : 'N/A'} />
          <Detail label="Quantity" value={item.quantity} />
          <Detail label="Last Maintenance" value={item.lastMaintenanceAt ? new Date(item.lastMaintenanceAt).toLocaleDateString() : 'Never'} />
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2"><HiOutlineAdjustments className="text-neon-orange" /> Maintenance Log</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {item.maintenanceLogs?.map(log => (
              <div key={log.id} className="p-2 rounded-lg bg-pg-dark2/30 border border-pg-border/30">
                <p className="text-sm font-medium">{log.issue}</p>
                {log.resolution && <p className="text-xs text-gray-400 mt-1">Resolution: {log.resolution}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={log.status} color={log.status === 'resolved' ? '#10b981' : log.status === 'in_progress' ? '#f59e0b' : '#ef4444'} />
                  <span className="text-[10px] text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                  {log.resolvedBy && <span className="text-[10px] text-gray-500">by {log.resolvedBy.name}</span>}
                </div>
              </div>
            ))}
            {(!item.maintenanceLogs || item.maintenanceLogs.length === 0) && <p className="text-gray-500 text-sm text-center py-4">No maintenance records</p>}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3">Usage History</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {item.eventHardware?.map(eh => (
              <Link key={eh.id} to={`/events/${eh.event.id}`} className="block p-2 rounded-lg hover:bg-pg-dark2/30 transition-colors">
                <p className="text-sm font-medium">{eh.event.client?.companyName}</p>
                <p className="text-xs text-gray-400">{eh.event.experience?.name}</p>
                <p className="text-[10px] text-gray-500">{new Date(eh.event.startTime).toLocaleDateString()}</p>
              </Link>
            ))}
            {(!item.eventHardware || item.eventHardware.length === 0) && <p className="text-gray-500 text-sm text-center py-4">No usage history</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}
