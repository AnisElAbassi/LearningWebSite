import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { HiOutlineCalendar, HiOutlineCurrencyDollar, HiOutlineUserGroup, HiOutlineCube, HiOutlineExclamation, HiOutlineTrendingUp, HiOutlinePlus, HiOutlineDocumentDuplicate, HiOutlineUsers } from 'react-icons/hi';
import api from '../utils/api';
import StatusBadge from '../components/layout/StatusBadge';
import { useI18n } from '../hooks/useI18n';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const statusColors = { draft: '#6b7280', confirmed: '#a855f7', in_progress: '#fbbf24', completed: '#10b981', cancelled: '#ef4444' };

export default function DashboardPage() {
  const { t, formatMoney } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-gray-500">Failed to load dashboard</p>;

  const hardwareChartData = {
    labels: data.hardwareStats.map(s => s.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
    datasets: [{
      data: data.hardwareStats.map(s => s.count),
      backgroundColor: data.hardwareStats.map(s => ({ available: '#10b981', in_use: '#a855f7', maintenance: '#f59e0b', retired: '#6b7280' }[s.status] || '#6b7280')),
      borderWidth: 0,
    }]
  };

  const expChartData = {
    labels: data.popularExperiences.map(e => e.name),
    datasets: [{
      label: 'Bookings',
      data: data.popularExperiences.map(e => e.count),
      backgroundColor: 'rgba(168, 85, 247, 0.3)',
      borderColor: '#a855f7',
      borderWidth: 1,
      borderRadius: 6,
    }]
  };

  const revenueGrowth = data.revenue.lastMonth > 0
    ? (((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth) * 100).toFixed(1)
    : 0;

  const margin = data.currentMargin || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('command_center')}</h1>
          <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard icon={HiOutlineCalendar} label={t('todays_events')} value={data.todayEvents.length} color="cyan" link="/events" />
        <KPICard icon={HiOutlineCurrencyDollar} label={t('revenue_month')} value={formatMoney(data.revenue.thisMonth || 0)} color="purple"
          subtext={`${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}% ${t('vs_last_month')}`}
          sparkline={data.revenueTrend} />
        <KPICard icon={HiOutlineUserGroup} label={t('total_clients')} value={data.totalClients} color="magenta" link="/clients" />
        <KPICard icon={HiOutlineCube} label={t('active_deals')} value={data.activeDeals} color="cyan" link="/deals" />
        <KPICard icon={HiOutlineTrendingUp} label={t('net_margin')} value={`${margin.toFixed(1)}%`}
          color={margin >= 30 ? 'green' : 'red'} />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link to="/events" className="btn-pg-outline flex items-center gap-2 text-sm"><HiOutlinePlus className="w-4 h-4" /> {t('new_event')}</Link>
        <Link to="/deals" className="btn-pg-outline flex items-center gap-2 text-sm"><HiOutlinePlus className="w-4 h-4" /> {t('new_deal')}</Link>
        <Link to="/invoices" className="btn-pg-outline flex items-center gap-2 text-sm"><HiOutlineDocumentDuplicate className="w-4 h-4" /> {t('invoices')}</Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Events */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
            <HiOutlineCalendar className="text-pg-purple" /> {t('todays_events')}
          </h3>
          {data.todayEvents.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">{t('no_events_today')}</p>
          ) : (
            <div className="space-y-3">
              {data.todayEvents.map((event, i) => (
                <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <Link to={`/events/${event.id}`} className="flex items-center justify-between p-3 rounded-lg bg-pg-dark2/30 hover:bg-pg-dark2/60 transition-colors border border-pg-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: statusColors[event.status] }} />
                      <div>
                        <p className="font-medium text-sm">{event.client.companyName}</p>
                        <p className="text-xs text-gray-400">{event.experience.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-300">{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <StatusBadge status={event.status} color={statusColors[event.status]} pulse={event.status === 'in_progress'} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Staff on Duty + Hardware Status */}
        <div className="space-y-6">
          {/* Staff on Duty */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2">
              <HiOutlineUsers className="text-pg-purple" /> {t('team')}
            </h3>
            {(data.staffToday || []).length > 0 ? (
              <div className="space-y-2">
                {data.staffToday.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-pg-dark2/30">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-gray-400">{s.client}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No staff assigned today</p>
            )}
          </div>

          {/* Hardware Status */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2">
              <HiOutlineCube className="text-pg-purple" /> {t('hardware_status')}
              <span className="text-xs text-gray-500 ml-auto">{data.hardwareUtilization || 0}% in use</span>
            </h3>
            <div className="h-40">
              <Pie data={hardwareChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } } }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Experiences */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
            <HiOutlineTrendingUp className="text-pg-purple" /> {t('popular_experiences')}
          </h3>
          <div className="h-48">
            <Bar data={expChartData} options={{
              responsive: true, maintainAspectRatio: false, indexAxis: 'y',
              scales: { x: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8' } }, y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } } },
              plugins: { legend: { display: false } }
            }} />
          </div>
        </div>

        {/* Alerts + Invoices Due */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
            <HiOutlineExclamation className="text-pg-yellow" /> {t('alerts')}
          </h3>
          <div className="space-y-2">
            {data.maintenanceAlerts.map(a => (
              <div key={a.id} className="p-2 rounded-lg bg-neon-orange/5 border border-neon-orange/20 text-xs">
                <p className="font-medium text-neon-orange">{a.item.name} - {t('maintenance')}</p>
                <p className="text-gray-400 mt-0.5">{a.issue}</p>
              </div>
            ))}
            {data.overdueInvoices.map(d => (
              <div key={d.id} className="p-2 rounded-lg bg-neon-red/5 border border-neon-red/20 text-xs">
                <p className="font-medium text-neon-red">Overdue Invoice</p>
                <p className="text-gray-400 mt-0.5">{d.client.companyName}</p>
              </div>
            ))}
            {(data.invoicesDueSoon || []).map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="block p-2 rounded-lg bg-pg-yellow/5 border border-pg-yellow/20 text-xs hover:bg-pg-yellow/10 transition-colors">
                <p className="font-medium text-pg-yellow">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                <p className="text-gray-400 mt-0.5">{inv.client.companyName} — {formatMoney(inv.totalAmount)}</p>
              </Link>
            ))}
            {data.maintenanceAlerts.length === 0 && data.overdueInvoices.length === 0 && (data.invoicesDueSoon || []).length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">{t('no_alerts')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('upcoming_7_days')}</h3>
          <div className="space-y-2">
            {data.upcomingEvents.map(e => (
              <Link key={e.id} to={`/events/${e.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-pg-dark2/30 transition-colors text-sm">
                <div>
                  <p className="font-medium">{e.client.companyName}</p>
                  <p className="text-xs text-gray-400">{e.experience.name}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(e.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </Link>
            ))}
            {data.upcomingEvents.length === 0 && <p className="text-gray-500 text-sm text-center py-4">{t('no_upcoming')}</p>}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">{t('recent_activity')}</h3>
          <div className="space-y-2">
            {data.recentActivity.map(a => (
              <div key={a.id} className="flex items-start gap-2 text-sm p-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pg-purple mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-300"><span className="font-medium text-white">{a.user?.name || 'System'}</span> {a.action} {a.entityType}</p>
                  <p className="text-[10px] text-gray-600">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, link, subtext, sparkline }) {
  const colorMap = { cyan: 'pg-purple', purple: 'pg-purple', magenta: 'pg-yellow', green: 'neon-green', red: 'neon-red' };
  const borderMap = { cyan: 'glow-border-purple', purple: 'glow-border-purple', magenta: 'glow-border-yellow', green: 'glow-border-purple', red: 'glow-border-purple' };
  const c = colorMap[color] || 'pg-purple';
  const Wrapper = link ? Link : 'div';

  // Mini sparkline data
  const sparkData = sparkline && sparkline.length > 0 ? {
    labels: sparkline.map((_, i) => i),
    datasets: [{
      data: sparkline,
      borderColor: '#a855f7',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
      fill: false,
    }]
  } : null;

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 400 }}>
      <Wrapper to={link} className={`glass-card rounded-xl p-5 ${borderMap[color]} block`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-inter font-bold mt-1 text-${c}`}>{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
          </div>
          {sparkData ? (
            <div className="w-16 h-8">
              <Line data={sparkData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, elements: { line: { borderWidth: 1.5 } } }} />
            </div>
          ) : (
            <Icon className={`w-8 h-8 text-${c} opacity-50`} />
          )}
        </div>
      </Wrapper>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-pg-card rounded w-48" />
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-pg-card rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-64 bg-pg-card rounded-xl" />
        <div className="h-64 bg-pg-card rounded-xl" />
      </div>
    </div>
  );
}
