import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineSortDescending } from 'react-icons/hi';
import api from '../utils/api';
import { useI18n } from '../hooks/useI18n';

export default function EventCostsPage() {
  const { t, formatMoney } = useI18n();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    setLoading(true);
    api.get('/events')
      .then(res => {
        // Only show events that have calculated costs
        const all = res.data?.events || res.data || [];
        const withCosts = all.filter(e => e.costs);
        setEvents(withCosts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...events].sort((a, b) => {
    const ca = a.costs || {};
    const cb = b.costs || {};
    if (sortBy === 'date') return new Date(b.startTime) - new Date(a.startTime);
    if (sortBy === 'margin') return (cb.marginPct || 0) - (ca.marginPct || 0);
    if (sortBy === 'revenue') return (cb.revenue || 0) - (ca.revenue || 0);
    return 0;
  });

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-pg-card rounded w-48 mb-4" /><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('event_costs')}</h1>
        <div className="flex items-center gap-2">
          <HiOutlineSortDescending className="w-4 h-4 text-gray-500" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-dark w-auto text-sm">
            <option value="date">Sort by Date</option>
            <option value="margin">Sort by Margin</option>
            <option value="revenue">Sort by Revenue</option>
          </select>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block glass-card rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead>
            <tr>
              <th>Date</th>
              <th>{t('client')}</th>
              <th>Experience</th>
              <th>Personnel</th>
              <th>{t('logistics')}</th>
              <th>{t('total_cost')}</th>
              <th>{t('revenue')}</th>
              <th>{t('margin')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(evt => {
              const c = evt.costs;
              return (
                <tr key={evt.id} className="cursor-pointer" onClick={() => navigate(`/events/${evt.id}`)}>
                  <td className="text-gray-400 text-sm">{new Date(evt.startTime).toLocaleDateString()}</td>
                  <td className="font-medium">{evt.client?.companyName || '—'}</td>
                  <td className="text-gray-300 font-mono text-sm">{formatMoney(c.experienceCost)}</td>
                  <td className="text-gray-300 font-mono text-sm">{formatMoney(c.personnelCost)}</td>
                  <td className="text-gray-300 font-mono text-sm">{formatMoney(c.logisticsTotal)}</td>
                  <td className="text-pg-purple font-mono text-sm font-medium">{formatMoney(c.totalCost)}</td>
                  <td className="text-pg-yellow font-mono text-sm">{formatMoney(c.revenue)}</td>
                  <td>
                    <span className={`font-bold text-sm ${c.marginPct >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {c.marginPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No events with cost data. Calculate costs on event detail pages first.</p>}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {sorted.map(evt => {
          const c = evt.costs;
          return (
            <div key={evt.id} onClick={() => navigate(`/events/${evt.id}`)}
              className="glass-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{evt.client?.companyName}</p>
                  <p className="text-xs text-gray-500">{new Date(evt.startTime).toLocaleDateString()}</p>
                </div>
                <span className={`text-lg font-bold ${c.marginPct >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {c.marginPct.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-gray-500">Cost</span><p className="font-mono text-gray-300">{formatMoney(c.totalCost)}</p></div>
                <div><span className="text-gray-500">Revenue</span><p className="font-mono text-pg-yellow">{formatMoney(c.revenue)}</p></div>
                <div><span className="text-gray-500">Logistics</span><p className="font-mono text-gray-300">{formatMoney(c.logisticsTotal)}</p></div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-gray-500 text-center py-8">No cost data yet</p>}
      </div>
    </div>
  );
}
