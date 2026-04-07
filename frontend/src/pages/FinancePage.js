import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineCurrencyDollar, HiOutlineCalendar } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../hooks/useI18n';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const chartColors = {
  purple: '#a855f7',
  yellow: '#fbbf24',
  green: '#22c55e',
  red: '#ef4444',
  purpleAlpha: 'rgba(168, 85, 247, 0.15)',
  yellowAlpha: 'rgba(251, 191, 36, 0.15)',
  greenAlpha: 'rgba(34, 197, 94, 0.15)',
  redAlpha: 'rgba(239, 68, 68, 0.15)',
};

const chartScaleDefaults = {
  x: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
  y: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8' } },
};

const chartLegendDefaults = { labels: { color: '#94a3b8', font: { size: 11 } } };

export default function FinancePage() {
  const { t, formatMoney } = useI18n();
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
      setPnl(pnlRes.data);
      setRevenueChart(revRes.data);
      setExpProfitability(expRes.data);
      setClientProfitability(clRes.data);
    }).catch(() => {
      toast.error(t('failed_to_load_finance_data'));
    }).finally(() => setLoading(false));
  }, [year, month]);

  // Revenue vs Cost line chart data
  const revenueChartData = {
    labels: revenueChart.map(r => r.month),
    datasets: [
      {
        label: t('revenue'),
        data: revenueChart.map(r => r.revenue),
        borderColor: chartColors.purple,
        backgroundColor: chartColors.purpleAlpha,
        tension: 0.4,
        fill: true,
      },
      {
        label: t('cost'),
        data: revenueChart.map(r => r.cost),
        borderColor: chartColors.red,
        backgroundColor: chartColors.redAlpha,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Cost breakdown donut data
  const costBreakdownData = pnl ? {
    labels: [
      t('experience_cost'),
      t('personnel_cost'),
      t('transport'),
      t('food'),
      t('hotel'),
      t('other'),
    ],
    datasets: [{
      data: [
        pnl.experienceCost || 0,
        pnl.personnelCost || 0,
        pnl.transportCost || 0,
        pnl.foodCost || 0,
        pnl.hotelCost || 0,
        pnl.otherCost || 0,
      ],
      backgroundColor: [
        chartColors.purple,
        chartColors.yellow,
        chartColors.green,
        chartColors.red,
        '#6366f1',
        '#94a3b8',
      ],
      borderWidth: 0,
    }],
  } : null;

  // Experience profitability bar chart data
  const expChartData = {
    labels: expProfitability.map(e => e.name),
    datasets: [{
      label: t('avg_margin'),
      data: expProfitability.map(e => e.avgMargin),
      backgroundColor: expProfitability.map(e =>
        e.avgMargin >= 30 ? chartColors.greenAlpha.replace('0.15', '0.6') : chartColors.redAlpha.replace('0.15', '0.6')
      ),
      borderColor: expProfitability.map(e =>
        e.avgMargin >= 30 ? chartColors.green : chartColors.red
      ),
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      {/* Header with month/year selector */}
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('revenue_and_pnl')}</h1>
        <div className="flex gap-2 items-center">
          <HiOutlineCalendar className="w-4 h-4 text-gray-500" />
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-dark w-auto text-sm">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {pnl && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI
            label={t('total_revenue')}
            value={formatMoney(pnl.totalRevenue)}
            icon={HiOutlineTrendingUp}
            color="pg-purple"
          />
          <KPI
            label={t('total_costs')}
            value={formatMoney(pnl.totalCost)}
            icon={HiOutlineTrendingDown}
            color="pg-yellow"
          />
          <KPI
            label={t('net_margin')}
            value={`${(pnl.netMargin || 0).toFixed(1)}%`}
            icon={HiOutlineCurrencyDollar}
            color={pnl.netMargin >= 30 ? 'neon-green' : 'neon-red'}
          />
          <KPI
            label={t('event_count')}
            value={pnl.eventCount || 0}
            icon={HiOutlineCalendar}
            color="pg-purple"
          />
        </div>
      )}

      {/* Revenue vs Cost Line Chart + Cost Breakdown Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('revenue_vs_cost')} (12 {t('months')})</h3>
          <div className="h-64">
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: chartScaleDefaults,
                plugins: { legend: chartLegendDefaults },
              }}
            />
          </div>
        </div>

        {costBreakdownData && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-4">{t('cost_breakdown')}</h3>
            <div className="h-52">
              <Doughnut
                data={costBreakdownData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#94a3b8', font: { size: 10 }, padding: 8 },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Experience Profitability + Client Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Profitability Bar Chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('experience_profitability')}</h3>
          <div className="h-52">
            {expProfitability.length > 0 ? (
              <Bar
                data={expChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: {
                    x: {
                      grid: { color: '#1e1e3a' },
                      ticks: { color: '#94a3b8', callback: v => `${v}%` },
                    },
                    y: {
                      grid: { display: false },
                      ticks: { color: '#94a3b8', font: { size: 11 } },
                    },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">{t('no_data')}</p>
            )}
          </div>
        </div>

        {/* Client Profitability List */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('client_profitability')}</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clientProfitability.map((cl, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-pg-dark2/30 hover:bg-pg-dark2/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-inter font-medium">{cl.name}</p>
                  <p className="text-xs text-gray-500">{cl.count} {t('events')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-pg-purple font-mono">{formatMoney(cl.totalRevenue)}</p>
                  <p className={`text-xs ${cl.avgMargin >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>
                    {(cl.avgMargin || 0).toFixed(1)}% {t('margin')}
                  </p>
                </div>
              </motion.div>
            ))}
            {clientProfitability.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">{t('no_data')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
