import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { HiOutlinePrinter, HiOutlineDownload, HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../hooks/useI18n';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

export default function ReportsPage() {
  const { t, formatMoney } = useI18n();
  const [report, setReport] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [clients, setClients] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0); // 0 = full year
  const [clientId, setClientId] = useState('');
  // Load filter options
  useEffect(() => {
    Promise.all([
      api.get('/clients'),
      api.get('/experiences')
    ]).then(([cRes, eRes]) => {
      setClients(cRes.data?.clients || cRes.data || []);
      setExperiences(eRes.data || []);
    });
  }, []);

  // Load report data when filters change
  useEffect(() => {
    setLoading(true);
    const params = { year };
    if (month > 0) params.month = month;

    Promise.all([
      api.get('/reports/monthly', { params: month > 0 ? { year, month } : { year, month: new Date().getMonth() + 1 } }),
      api.get('/analytics/revenue-chart', { params: { months: 12 } }),
      clientId ? api.get(`/reports/client/${clientId}`) : Promise.resolve(null),
      api.get('/costs/profitability/experiences'),
      api.get('/costs/profitability/clients'),
    ]).then(([reportRes, chartRes, clientRes, expRes, clRes]) => {
      setReport(clientRes ? { ...reportRes.data, clientReport: clientRes.data } : reportRes.data);
      setRevenueChart(chartRes.data || []);
      setExpProfitability(expRes.data || []);
      setClientProfitability(clRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [year, month, clientId]);

  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [expProfitability, setExpProfitability] = useState([]);
  const [clientProfitability, setClientProfitability] = useState([]);
  const TABS = ['overview', 'revenue', 'costs', 'clients', 'experiences', 'profitability'];

  if (loading && !report) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-pg-card rounded w-48" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-pg-card rounded-xl" />)}</div>
    </div>
  );

  const r = report || {};
  const fin = r.financial || {};

  // Charts
  const revenueLineData = {
    labels: revenueChart.map(d => d.month),
    datasets: [
      { label: 'Revenue', data: revenueChart.map(d => d.revenue), borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)', tension: 0.4, fill: true },
      { label: 'Cost', data: revenueChart.map(d => d.cost), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true },
      { label: 'Profit', data: revenueChart.map(d => d.profit), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true },
    ]
  };

  const costDonutData = fin.experienceCost != null ? {
    labels: ['Experience (Depreciation)', 'Personnel', 'Transport', 'Food', 'Hotel', 'Other'],
    datasets: [{
      data: [fin.experienceCost, fin.personnelCost, fin.logisticsBreakdown?.transport || 0, fin.logisticsBreakdown?.food || 0, fin.logisticsBreakdown?.hotel || 0, fin.logisticsBreakdown?.other || 0],
      backgroundColor: ['#a855f7', '#fbbf24', '#3b82f6', '#f59e0b', '#22c55e', '#6b7280'],
      borderWidth: 0,
    }]
  } : null;

  const topClientsData = (r.topClients || []).length > 0 ? {
    labels: r.topClients.map(c => c.name),
    datasets: [{ label: 'Revenue', data: r.topClients.map(c => c.revenue), backgroundColor: 'rgba(168,85,247,0.6)', borderRadius: 6 }]
  } : null;

  const topExpData = (r.topExperiences || []).length > 0 ? {
    labels: r.topExperiences.map(e => e.name),
    datasets: [{ label: 'Bookings', data: r.topExperiences.map(e => e.count), backgroundColor: 'rgba(251,191,36,0.6)', borderRadius: 6 }]
  } : null;

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    scales: { x: { grid: { color: '#252532' }, ticks: { color: '#9ca3af', font: { size: 10 } } }, y: { grid: { color: '#252532' }, ticks: { color: '#9ca3af' } } },
    plugins: { legend: { labels: { color: '#9ca3af' } } }
  };

  const barOpts = { ...chartOpts, indexAxis: 'y', plugins: { legend: { display: false } } };

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Reports</h1>
        <div className="flex flex-wrap gap-2 items-center no-print">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            <option value={0}>Full Year</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={clientId} onChange={e => setClientId(e.target.value)} className="input-dark w-auto text-sm">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
          <button onClick={() => window.print()} className="btn-pg-outline flex items-center gap-1">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
          <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:4000/api'}/export/events`} className="btn-pg-outline flex items-center gap-1">
            <HiOutlineDownload className="w-4 h-4" /> Export
          </a>
        </div>
      </div>

      {/* Period Label */}
      <p className="text-sm text-gray-500">
        {month > 0 ? new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : `Full Year ${year}`}
        {clientId ? ` — ${clients.find(c => String(c.id) === clientId)?.companyName || ''}` : ''}
      </p>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-pg-border">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${tab === t ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Client-specific report */}
      {clientId && r.clientReport && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3">Client: {r.clientReport.client?.companyName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniStat label="Events" value={r.clientReport.stats?.totalEvents || 0} />
            <MiniStat label="Revenue" value={formatMoney(r.clientReport.stats?.totalRevenue || 0)} color="pg-purple" />
            <MiniStat label="Cost" value={formatMoney(r.clientReport.stats?.totalCost || 0)} />
            <MiniStat label="Margin" value={`${(r.clientReport.stats?.avgMargin || 0).toFixed(1)}%`} color={r.clientReport.stats?.avgMargin >= 30 ? 'neon-green' : 'neon-red'} />
            <MiniStat label="Outstanding" value={formatMoney(r.clientReport.stats?.outstanding || 0)} color={r.clientReport.stats?.outstanding > 0 ? 'neon-red' : 'neon-green'} />
          </div>
        </div>
      )}

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total Revenue" value={formatMoney(fin.totalRevenue || 0)} color="pg-purple" />
            <KPI label="Total Costs" value={formatMoney(fin.totalCost || 0)} color="neon-red" />
            <KPI label="Net Margin" value={`${(fin.netMargin || 0).toFixed(1)}%`} color={(fin.netMargin || 0) >= 30 ? 'neon-green' : 'neon-red'} />
            <KPI label="Events" value={`${r.events?.completed || 0} / ${r.events?.total || 0}`} color="pg-yellow" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniStat label="Staff Hours" value={`${(r.totalStaffHours || 0).toFixed(0)}h`} sub={`Cost: ${formatMoney(r.totalStaffCost || 0)}`} />
            <MiniStat label="Hardware Utilization" value={`${(r.hardwareUtilization || 0).toFixed(0)}%`} />
            <MiniStat label="Invoices Paid" value={formatMoney(r.invoices?.paid || 0)} sub={`Outstanding: ${formatMoney(r.invoices?.outstanding || 0)}`} />
            <MiniStat label="Satisfaction" value={r.avgSatisfaction ? `${r.avgSatisfaction.toFixed(1)}/5` : 'N/A'} sub={`${r.feedbackCount || 0} reviews`} />
          </div>
        </div>
      )}

      {/* Tab: Revenue */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-4">Revenue vs Cost (12 Months)</h3>
            <div className="h-72"><Line data={revenueLineData} options={chartOpts} /></div>
          </div>
          {/* Monthly breakdown table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="table-dark">
              <thead><tr><th>Month</th><th>Revenue</th><th>Cost</th><th>Profit</th></tr></thead>
              <tbody>
                {revenueChart.map((d, i) => (
                  <tr key={i}>
                    <td className="font-medium">{d.month}</td>
                    <td className="text-pg-purple font-mono">{formatMoney(d.revenue)}</td>
                    <td className="text-neon-red font-mono">{formatMoney(d.cost)}</td>
                    <td className={`font-mono font-bold ${d.profit >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{formatMoney(d.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Costs */}
      {tab === 'costs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {costDonutData && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-inter font-bold text-lg mb-4">Cost Breakdown</h3>
              <div className="h-60"><Doughnut data={costDonutData} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 } } } } }} /></div>
            </div>
          )}
          <div className="lg:col-span-2 glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-4">Cost Details</h3>
            <div className="space-y-2">
              <CostRow label="Experience (Depreciation)" value={fin.experienceCost} total={fin.totalCost} color="#a855f7" formatMoney={formatMoney} />
              <CostRow label="Personnel" value={fin.personnelCost} total={fin.totalCost} color="#fbbf24" formatMoney={formatMoney} />
              <CostRow label="Transport" value={fin.logisticsBreakdown?.transport} total={fin.totalCost} color="#3b82f6" formatMoney={formatMoney} />
              <CostRow label="Food & Meals" value={fin.logisticsBreakdown?.food} total={fin.totalCost} color="#f59e0b" formatMoney={formatMoney} />
              <CostRow label="Hotel" value={fin.logisticsBreakdown?.hotel} total={fin.totalCost} color="#22c55e" formatMoney={formatMoney} />
              <CostRow label="Other" value={fin.logisticsBreakdown?.other} total={fin.totalCost} color="#6b7280" formatMoney={formatMoney} />
            </div>
            <div className="flex justify-between mt-4 pt-3 border-t border-pg-border font-bold">
              <span>Total</span>
              <span className="text-pg-purple font-mono">{formatMoney(fin.totalCost || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Clients */}
      {tab === 'clients' && (
        <div className="space-y-6">
          {topClientsData && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-inter font-bold text-lg mb-4">Top Clients by Revenue</h3>
              <div className="h-52"><Bar data={topClientsData} options={barOpts} /></div>
            </div>
          )}
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="table-dark">
              <thead><tr><th>Client</th><th>Events</th><th>Revenue</th></tr></thead>
              <tbody>
                {(r.topClients || []).map((c, i) => (
                  <tr key={i}>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-gray-400">{c.events}</td>
                    <td className="text-pg-purple font-mono">{formatMoney(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(r.topClients || []).length === 0 && <p className="text-gray-500 text-sm text-center py-8">No client data</p>}
          </div>
        </div>
      )}

      {/* Tab: Experiences */}
      {tab === 'experiences' && (
        <div className="space-y-6">
          {topExpData && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-inter font-bold text-lg mb-4">Top Experiences by Bookings</h3>
              <div className="h-52"><Bar data={topExpData} options={barOpts} /></div>
            </div>
          )}
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-4">Experience Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(r.topExperiences || []).map((exp, i) => (
                <div key={i} className="p-3 rounded-lg bg-pg-dark2/30 border border-pg-border/30 text-center">
                  <p className="font-medium">{exp.name}</p>
                  <p className="text-2xl font-bold text-pg-purple mt-1">{exp.count}</p>
                  <p className="text-[10px] text-gray-500">bookings</p>
                  <p className="text-sm text-gray-400 mt-1">{formatMoney(exp.revenue)}</p>
                </div>
              ))}
            </div>
            {(r.topExperiences || []).length === 0 && <p className="text-gray-500 text-center py-8">No data</p>}
          </div>
        </div>
      )}

      {/* Tab: Profitability (absorbed from MarginAnalysisPage) */}
      {tab === 'profitability' && (
        <div className="space-y-6">
          {/* By Experience */}
          <h2 className="font-inter font-bold text-lg text-white flex items-center gap-2">
            <HiOutlineTrendingUp className="w-5 h-5 text-pg-purple" /> By Experience
          </h2>
          {expProfitability.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <div style={{ height: Math.max(200, expProfitability.length * 40) }}>
                <Bar data={{
                  labels: expProfitability.map(e => e.name),
                  datasets: [{ label: 'Margin %', data: expProfitability.map(e => e.avgMargin ?? 0), backgroundColor: expProfitability.map(e => (e.avgMargin ?? 0) >= 30 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'), borderRadius: 6 }]
                }} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8', callback: v => `${v}%` }, min: 0, max: 100 }, y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } } }, plugins: { legend: { display: false } } }} />
              </div>
            </div>
          )}
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="table-dark">
              <thead><tr><th>Experience</th><th>Revenue</th><th>Cost</th><th>Margin</th><th>Events</th></tr></thead>
              <tbody>
                {expProfitability.map((exp, i) => (
                  <tr key={i}>
                    <td className="font-medium">{exp.name}</td>
                    <td className="text-pg-yellow font-mono text-sm">{formatMoney(exp.totalRevenue)}</td>
                    <td className="text-gray-300 font-mono text-sm">{formatMoney(exp.totalCost)}</td>
                    <td><span className={`font-bold text-sm ${(exp.avgMargin ?? 0) >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>{(exp.avgMargin ?? 0).toFixed(1)}%</span></td>
                    <td className="text-gray-500">{exp.count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expProfitability.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No experience profitability data</p>}
          </div>

          {/* By Client */}
          <h2 className="font-inter font-bold text-lg text-white flex items-center gap-2">
            <HiOutlineTrendingDown className="w-5 h-5 text-pg-yellow" /> By Client
          </h2>
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="table-dark">
              <thead><tr><th>Client</th><th>Revenue</th><th>Cost</th><th>Margin</th><th>Events</th></tr></thead>
              <tbody>
                {clientProfitability.map((cl, i) => (
                  <tr key={i}>
                    <td className="font-medium">{cl.name}</td>
                    <td className="text-pg-yellow font-mono text-sm">{formatMoney(cl.totalRevenue)}</td>
                    <td className="text-gray-300 font-mono text-sm">{formatMoney(cl.totalCost)}</td>
                    <td><span className={`font-bold text-sm ${(cl.avgMargin ?? 0) >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>{(cl.avgMargin ?? 0).toFixed(1)}%</span></td>
                    <td className="text-gray-500">{cl.count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientProfitability.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No client profitability data</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="glass-card rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-xl font-inter font-bold mt-1 text-${color}`}>{value}</p>
    </motion.div>
  );
}

function MiniStat({ label, value, sub, color }) {
  return (
    <div className="glass-card rounded-xl p-3">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color ? `text-${color}` : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
    </div>
  );
}

function CostRow({ label, value, total, color, formatMoney }) {
  const amt = value || 0;
  const pct = total > 0 ? (amt / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm text-gray-300 flex-1">{label}</span>
      <div className="w-32 h-2 rounded-full bg-pg-dark2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-mono text-gray-300 w-24 text-right">{formatMoney(amt)}</span>
      <span className="text-xs text-gray-500 w-12 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}
