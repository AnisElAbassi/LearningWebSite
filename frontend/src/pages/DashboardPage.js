import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { HiOutlineCalendar, HiOutlineCurrencyDollar, HiOutlineUserGroup, HiOutlineCube, HiOutlineExclamation, HiOutlineTrendingUp } from 'react-icons/hi';
import api from '../utils/api';
import StatusBadge from '../components/layout/StatusBadge';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const statusColors = { draft: '#6b7280', confirmed: '#a855f7', in_progress: '#fbbf24', completed: '#10b981', cancelled: '#ef4444' };

export default function DashboardPage() {
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
      backgroundColor: data.hardwareStats.map(s => {
        const c = { available: '#10b981', in_use: '#a855f7', maintenance: '#f59e0b', retired: '#6b7280' };
        return c[s.status] || '#6b7280';
      }),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-inter font-bold text-2xl pg-text-gradient">Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={HiOutlineCalendar} label="Today's Events" value={data.todayEvents.length} color="cyan" link="/events" />
        <KPICard icon={HiOutlineCurrencyDollar} label="Revenue (Month)" value={`€${(data.revenue.thisMonth || 0).toLocaleString()}`} color="purple" subtext={`${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}% vs last month`} />
        <KPICard icon={HiOutlineUserGroup} label="Total Clients" value={data.totalClients} color="magenta" link="/clients" />
        <KPICard icon={HiOutlineCube} label="Active Deals" value={data.activeDeals} color="cyan" link="/deals" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Events */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
            <HiOutlineCalendar className="text-pg-purple" /> Today's Events
          </h3>
          {data.todayEvents.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No events scheduled today</p>
          ) : (
            <div className="space-y-3">
              {data.todayEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
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

        {/* Hardware Status */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
            <HiOutlineCube className="text-pg-purple" /> Hardware Status
          </h3>
          <div className="h-48">
            <Pie data={hardwareChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } } }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Experiences */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
            <HiOutlineTrendingUp className="text-pg-purple" /> Most Popular Experiences
          </h3>
          <div className="h-48">
            <Bar data={expChartData} options={{
              responsive: true, maintainAspectRatio: false, indexAxis: 'y',
              scales: { x: { grid: { color: '#1e1e3a' }, ticks: { color: '#94a3b8' } }, y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } } },
              plugins: { legend: { display: false } }
            }} />
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
            <HiOutlineExclamation className="text-pg-yellow" /> Alerts
          </h3>
          <div className="space-y-2">
            {data.maintenanceAlerts.map(a => (
              <div key={a.id} className="p-2 rounded-lg bg-neon-orange/5 border border-neon-orange/20 text-xs">
                <p className="font-medium text-neon-orange">{a.item.name} - Maintenance</p>
                <p className="text-gray-400 mt-0.5">{a.issue}</p>
              </div>
            ))}
            {data.overdueInvoices.map(d => (
              <div key={d.id} className="p-2 rounded-lg bg-neon-red/5 border border-neon-red/20 text-xs">
                <p className="font-medium text-neon-red">Overdue Invoice</p>
                <p className="text-gray-400 mt-0.5">{d.client.companyName}</p>
              </div>
            ))}
            {data.maintenanceAlerts.length === 0 && data.overdueInvoices.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No active alerts</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">Upcoming (Next 7 Days)</h3>
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
            {data.upcomingEvents.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No upcoming events</p>}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-4">Recent Activity</h3>
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

function KPICard({ icon: Icon, label, value, color, link, subtext }) {
  const colors = { cyan: 'pg-purple', purple: 'pg-purple', magenta: 'pg-yellow' };
  const borderClass = { cyan: 'glow-border-purple', purple: 'glow-border-purple', magenta: 'glow-border-yellow' };
  const Wrapper = link ? Link : 'div';

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 400 }}>
      <Wrapper to={link} className={`glass-card rounded-xl p-5 ${borderClass[color]} block`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-inter font-bold mt-1 text-${colors[color]}`}>{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
          </div>
          <Icon className={`w-8 h-8 text-${colors[color]} opacity-50`} />
        </div>
      </Wrapper>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-pg-card rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-pg-card rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-64 bg-pg-card rounded-xl" />
        <div className="h-64 bg-pg-card rounded-xl" />
      </div>
    </div>
  );
}
