import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineCurrencyDollar, HiOutlineCalendar, HiOutlinePlus, HiOutlineSortDescending } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import { useI18n } from '../hooks/useI18n';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const chartColors = { purple: '#a855f7', yellow: '#fbbf24', green: '#22c55e', red: '#ef4444', purpleAlpha: 'rgba(168,85,247,0.15)', redAlpha: 'rgba(239,68,68,0.15)' };
const chartScaleDefaults = { x: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8', font: { size: 10 } } }, y: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8' } } };

const CATEGORIES = [
  { value: 'transport', label: 'Transport', icon: '🚛' },
  { value: 'food', label: 'Food / Meals', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function FinancePage() {
  const { t, formatMoney } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');

  const TABS = [
    { id: 'overview', label: t('revenue_and_pnl') || 'Revenue & P&L' },
    { id: 'events', label: t('event_costs') || 'Event Costs' },
    { id: 'logistics', label: t('logistics_costs') || 'Logistics' },
  ];

  const changeTab = (id) => {
    setTab(id);
    if (id === 'overview') searchParams.delete('tab');
    else searchParams.set('tab', id);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('finance') || 'Finance'}</h1>

      <div className="flex gap-1 border-b border-pg-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => changeTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab t={t} formatMoney={formatMoney} />}
      {tab === 'events' && <EventCostsTab t={t} formatMoney={formatMoney} />}
      {tab === 'logistics' && <LogisticsTab t={t} formatMoney={formatMoney} />}
    </div>
  );
}

/* ─── OVERVIEW TAB (original FinancePage P&L) ─── */
function OverviewTab({ t, formatMoney }) {
  const [pnl, setPnl] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [expProfitability, setExpProfitability] = useState([]);
  const [clientProfitability, setClientProfitability] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/costs/pnl', { params: { year, month } }),
      api.get('/analytics/revenue-chart', { params: { months: 12 } }),
      api.get('/costs/profitability/experiences'),
      api.get('/costs/profitability/clients'),
    ]).then(([pnlRes, revRes, expRes, clRes]) => {
      setPnl(pnlRes.data); setRevenueChart(revRes.data); setExpProfitability(expRes.data); setClientProfitability(clRes.data);
    }).catch(() => toast.error(t('failed_to_load_finance_data') || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [year, month]);

  const revenueChartData = {
    labels: revenueChart.map(r => r.month),
    datasets: [
      { label: t('revenue'), data: revenueChart.map(r => r.revenue), borderColor: chartColors.purple, backgroundColor: chartColors.purpleAlpha, tension: 0.4, fill: true },
      { label: t('cost'), data: revenueChart.map(r => r.cost), borderColor: chartColors.red, backgroundColor: chartColors.redAlpha, tension: 0.4, fill: true },
    ],
  };

  const costBreakdownData = pnl ? {
    labels: [t('experience_cost'), t('personnel_cost'), t('transport'), t('food'), t('hotel'), t('other')],
    datasets: [{ data: [pnl.experienceCost || 0, pnl.personnelCost || 0, pnl.transportCost || 0, pnl.foodCost || 0, pnl.hotelCost || 0, pnl.otherCost || 0], backgroundColor: [chartColors.purple, chartColors.yellow, chartColors.green, chartColors.red, '#6366f1', '#94a3b8'], borderWidth: 0 }],
  } : null;

  const expChartData = {
    labels: expProfitability.map(e => e.name),
    datasets: [{ label: t('avg_margin'), data: expProfitability.map(e => e.avgMargin), backgroundColor: expProfitability.map(e => e.avgMargin >= 30 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)'), borderColor: expProfitability.map(e => e.avgMargin >= 30 ? chartColors.green : chartColors.red), borderWidth: 1, borderRadius: 6 }],
  };

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <>
      {/* Period selector */}
      <div className="flex gap-2 items-center justify-end">
        <HiOutlineCalendar className="w-4 h-4 text-gray-500" />
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-dark w-auto text-sm">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-dark w-auto text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      {pnl && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label={t('total_revenue')} value={formatMoney(pnl.totalRevenue)} icon={HiOutlineTrendingUp} color="pg-purple" />
          <KPI label={t('total_costs')} value={formatMoney(pnl.totalCost)} icon={HiOutlineTrendingDown} color="pg-yellow" />
          <KPI label={t('net_margin')} value={`${(pnl.netMargin || 0).toFixed(1)}%`} icon={HiOutlineCurrencyDollar} color={pnl.netMargin >= 30 ? 'neon-green' : 'neon-red'} />
          <KPI label={t('event_count')} value={pnl.eventCount || 0} icon={HiOutlineCalendar} color="pg-purple" />
        </div>
      )}

      {/* Revenue vs Cost + Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('revenue_vs_cost')} (12 {t('months')})</h3>
          <div className="h-64">
            <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false, scales: chartScaleDefaults, plugins: { legend: { labels: { color: '#94a3b8' } } } }} />
          </div>
        </div>
        {costBreakdownData && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-4">{t('cost_breakdown')}</h3>
            <div className="h-52">
              <Doughnut data={costBreakdownData} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, padding: 8 } } } }} />
            </div>
          </div>
        )}
      </div>

      {/* Experience + Client Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('experience_profitability')}</h3>
          <div className="h-52">
            {expProfitability.length > 0 ? (
              <Bar data={expChartData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8', callback: v => `${v}%` } }, y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } } }, plugins: { legend: { display: false } } }} />
            ) : <p className="text-gray-500 text-sm text-center py-8">{t('no_data')}</p>}
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('client_profitability')}</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clientProfitability.map((cl, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-pg-dark2/30 hover:bg-pg-dark2/50 transition-colors">
                <div>
                  <p className="text-sm font-inter font-medium">{cl.name}</p>
                  <p className="text-xs text-gray-500">{cl.count} {t('events')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-pg-purple font-mono">{formatMoney(cl.totalRevenue)}</p>
                  <p className={`text-xs ${cl.avgMargin >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>{(cl.avgMargin || 0).toFixed(1)}% {t('margin')}</p>
                </div>
              </motion.div>
            ))}
            {clientProfitability.length === 0 && <p className="text-gray-500 text-sm text-center py-4">{t('no_data')}</p>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── EVENT COSTS TAB ─── */
function EventCostsTab({ t, formatMoney }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    setLoading(true);
    api.get('/events').then(res => {
      const all = res.data?.events || res.data || [];
      setEvents(all.filter(e => e.costs));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sorted = [...events].sort((a, b) => {
    const ca = a.costs || {}, cb = b.costs || {};
    if (sortBy === 'date') return new Date(b.startTime) - new Date(a.startTime);
    if (sortBy === 'margin') return (cb.marginPct || 0) - (ca.marginPct || 0);
    if (sortBy === 'revenue') return (cb.revenue || 0) - (ca.revenue || 0);
    return 0;
  });

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <HiOutlineSortDescending className="w-4 h-4 text-gray-500" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-dark w-auto text-sm">
          <option value="date">{t('sort_by_date') || 'Sort by Date'}</option>
          <option value="margin">{t('sort_by_margin') || 'Sort by Margin'}</option>
          <option value="revenue">{t('sort_by_revenue') || 'Sort by Revenue'}</option>
        </select>
      </div>

      {/* Desktop */}
      <div className="hidden md:block glass-card rounded-xl overflow-x-auto">
        <table className="table-dark">
          <thead><tr><th>Date</th><th>{t('client')}</th><th>Experience</th><th>Personnel</th><th>{t('logistics')}</th><th>{t('total_cost')}</th><th>{t('revenue')}</th><th>{t('margin')}</th></tr></thead>
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
                  <td><span className={`font-bold text-sm ${c.marginPct >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>{c.marginPct.toFixed(1)}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No events with cost data.</p>}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {sorted.map(evt => {
          const c = evt.costs;
          return (
            <div key={evt.id} onClick={() => navigate(`/events/${evt.id}`)} className="glass-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{evt.client?.companyName}</p>
                  <p className="text-xs text-gray-500">{new Date(evt.startTime).toLocaleDateString()}</p>
                </div>
                <span className={`text-lg font-bold ${c.marginPct >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>{c.marginPct.toFixed(1)}%</span>
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
    </>
  );
}

/* ─── LOGISTICS TAB ─── */
function LogisticsTab({ t, formatMoney }) {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCost, setEditCost] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/logistics/summary', { params: { month, year } }),
      api.get('/events')
    ]).then(([summaryRes, eventsRes]) => {
      setSummary(summaryRes.data);
      setItems(summaryRes.data.items || []);
      setEvents(eventsRes.data?.events || eventsRes.data || []);
    }).catch(() => toast.error('Failed to load logistics data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const getCategoryTotal = (category) => {
    if (summary?.byCategory) return summary.byCategory[category] || 0;
    return items.filter(i => i.category === category).reduce((sum, i) => sum + (i.amount || 0), 0);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-dark w-auto text-sm">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-dark w-auto text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => setShowModal(true)} className="btn-pg-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-4 h-4" /> {t('addCost') || 'Add Cost'}
        </button>
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
      <div className="glass-card rounded-xl overflow-x-auto">
        <table className="table-dark">
          <thead><tr><th>{t('event') || 'Event'}</th><th>{t('category') || 'Category'}</th><th>{t('description') || 'Description'}</th><th>{t('amount') || 'Amount'}</th><th>{t('date') || 'Date'}</th><th>{t('actions') || 'Actions'}</th></tr></thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="font-medium">Event #{item.eventId}{item.event?.client?.companyName && <span className="text-gray-500 text-xs ml-1">({item.event.client.companyName})</span>}</td>
                <td><span className="text-sm text-gray-300 capitalize">{item.category}</span></td>
                <td className="text-gray-400 text-sm">{item.description || '—'}</td>
                <td className="text-pg-purple font-mono text-sm font-medium">{formatMoney(item.amount)}</td>
                <td className="text-gray-500 text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                <td className="flex gap-2">
                  <button onClick={() => { setEditCost(item); setShowModal(true); }} className="text-gray-400 hover:text-pg-purple text-xs">Edit</button>
                  <button onClick={async () => {
                    if (!window.confirm('Delete this cost?')) return;
                    try { await api.delete(`/logistics/${item.id}`); toast.success('Cost deleted'); fetchData(); }
                    catch { toast.error('Failed'); }
                  }} className="text-gray-400 hover:text-neon-red text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && <p className="text-gray-500 text-sm text-center py-8">{t('noLogisticsCosts') || 'No logistics costs for this period'}</p>}
      </div>

      <AddLogisticsCostModal show={showModal} onClose={() => { setShowModal(false); setEditCost(null); }} events={events} onSaved={fetchData} editCost={editCost} />
    </>
  );
}

/* ─── SHARED COMPONENTS ─── */
function KPI({ label, value, icon: Icon, color }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className={`glass-card rounded-xl p-4 border border-${color}/20`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-inter uppercase">{label}</p>
          <p className={`text-xl font-inter font-bold mt-1 text-${color}`}>{value}</p>
        </div>
        <Icon className={`w-6 h-6 text-${color} opacity-40`} />
      </div>
    </motion.div>
  );
}

function AddLogisticsCostModal({ show, onClose, events, onSaved, editCost }) {
  const { t } = useI18n();
  const isEdit = !!editCost;
  const [form, setForm] = useState({ eventId: '', category: 'transport', description: '', amount: '' });

  useEffect(() => {
    if (editCost) {
      setForm({ eventId: editCost.eventId || '', category: editCost.category || 'transport', description: editCost.description || '', amount: editCost.amount || '' });
    } else if (show) {
      setForm({ eventId: '', category: 'transport', description: '', amount: '' });
    }
  }, [show, editCost]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/logistics/${editCost.id}`, { category: form.category, description: form.description, amount: parseFloat(form.amount) });
        toast.success('Cost updated');
      } else {
        await api.post(`/logistics/event/${form.eventId}`, { category: form.category, description: form.description, amount: parseFloat(form.amount) });
        toast.success(t('costAdded') || 'Logistics cost added');
      }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={isEdit ? 'Edit Cost' : (t('addLogisticsCost') || 'Add Logistics Cost')} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <div>
            <label className="label-text">{t('event') || 'Event'} *</label>
            <select className="input-dark" value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })} required>
              <option value="">{t('selectEvent') || 'Select event...'}</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>#{ev.id} — {ev.client?.companyName || 'Event'} ({new Date(ev.startTime).toLocaleDateString()})</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label-text">{t('category') || 'Category'} *</label>
          <select className="input-dark" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
            {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
        </div>
        <div><label className="label-text">{t('description') || 'Description'}</label><input className="input-dark" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Round trip fuel cost" /></div>
        <div><label className="label-text">{t('amount') || 'Amount'} *</label><input type="number" step="0.01" min="0" className="input-dark" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">{t('cancel') || 'Cancel'}</button>
          <button type="submit" className="btn-pg-primary text-sm">{t('add') || 'Add'}</button>
        </div>
      </form>
    </Modal>
  );
}
