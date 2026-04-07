import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { HiOutlineDocumentDownload, HiOutlinePrinter } from 'react-icons/hi';
import api from '../utils/api';
import { useI18n } from '../hooks/useI18n';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function MonthlyReportPage() {
  const { t, formatMoney } = useI18n();
  const [report, setReport] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/monthly', { params: { year, month } })
      .then(r => { setReport(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-pg-card rounded w-48" /><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-pg-card rounded-xl" />)}</div></div>;
  if (!report) return <p className="text-gray-500">Failed to load report</p>;

  const costData = {
    labels: ['Experience (Depreciation)', 'Personnel', 'Transport', 'Food', 'Hotel', 'Other'],
    datasets: [{
      data: [report.financial.experienceCost, report.financial.personnelCost, report.financial.logisticsBreakdown.transport, report.financial.logisticsBreakdown.food, report.financial.logisticsBreakdown.hotel, report.financial.logisticsBreakdown.other],
      backgroundColor: ['#a855f7', '#fbbf24', '#3b82f6', '#f59e0b', '#22c55e', '#6b7280'],
      borderWidth: 0
    }]
  };

  const clientData = {
    labels: report.topClients.map(c => c.name),
    datasets: [{ label: 'Revenue', data: report.topClients.map(c => c.revenue), backgroundColor: 'rgba(168, 85, 247, 0.6)', borderRadius: 6 }]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Monthly Business Report</h1>
        <div className="flex gap-2 items-center no-print">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => window.print()} className="btn-pg-outline flex items-center gap-1"><HiOutlinePrinter className="w-4 h-4" /> Print</button>
        </div>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print-only" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #7c3aed' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px' }}>PixelGate — Monthly Report</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>{report.period.label}</p>
        </div>
      </div>

      <p className="text-gray-400 text-sm no-print">{report.period.label}</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Total Revenue" value={formatMoney(report.financial.totalRevenue)} color="pg-purple" />
        <KPI label="Total Costs" value={formatMoney(report.financial.totalCost)} color="neon-red" />
        <KPI label="Net Margin" value={`${report.financial.netMargin.toFixed(1)}%`} color={report.financial.netMargin >= 30 ? 'neon-green' : 'neon-red'} />
        <KPI label="Events" value={`${report.events.completed} / ${report.events.total}`} color="pg-yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">Cost Breakdown</h3>
          <div className="h-52"><Doughnut data={costData} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 } } } } }} /></div>
        </div>

        {/* Top Clients */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">Top Clients by Revenue</h3>
          {report.topClients.length > 0 ? (
            <div className="h-52"><Bar data={clientData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { grid: { color: '#252532' }, ticks: { color: '#9ca3af' } }, y: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } } }, plugins: { legend: { display: false } } }} /></div>
          ) : <p className="text-gray-500 text-center py-8">No client data this month</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Staff Hours" value={`${report.totalStaffHours.toFixed(0)}h`} sub={`Cost: ${formatMoney(report.totalStaffCost)}`} />
        <StatCard label="Hardware Utilization" value={`${report.hardwareUtilization.toFixed(0)}%`} sub="of total inventory used" />
        <StatCard label="Invoices" value={formatMoney(report.invoices.paid)} sub={`Outstanding: ${formatMoney(report.invoices.outstanding)}`} />
        <StatCard label="Avg Satisfaction" value={report.avgSatisfaction ? `${report.avgSatisfaction.toFixed(1)}/5` : 'N/A'} sub={`${report.feedbackCount} reviews`} />
      </div>

      {/* Top Experiences */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-inter font-bold text-lg mb-4">Top Experiences</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {report.topExperiences.map((exp, i) => (
            <div key={i} className="p-3 rounded-lg bg-pg-dark2/30 border border-pg-border/30 text-center">
              <p className="text-sm font-medium">{exp.name}</p>
              <p className="text-xl font-bold text-pg-purple mt-1">{exp.count}</p>
              <p className="text-[10px] text-gray-500">bookings</p>
              <p className="text-xs text-gray-400 mt-1">{formatMoney(exp.revenue)}</p>
            </div>
          ))}
          {report.topExperiences.length === 0 && <p className="text-gray-500 col-span-5 text-center py-4">No experience data</p>}
        </div>
      </div>
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

function StatCard({ label, value, sub }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-lg font-bold text-white mt-1">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
