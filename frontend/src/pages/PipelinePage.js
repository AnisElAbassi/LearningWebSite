import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineCalendar, HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineExclamation, HiOutlinePlus } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PipelineBoard from '../components/pipeline/PipelineBoard';
import { useI18n } from '../hooks/useI18n';

export default function PipelinePage() {
  const { t, formatMoney } = useI18n();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    Promise.allSettled([
      api.get('/events/pipeline'),
      api.get('/analytics/dashboard')
    ]).then(([pipeRes, dashRes]) => {
      if (pipeRes.status === 'fulfilled') setPipeline(pipeRes.value.data);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const createEvent = async () => {
    try {
      const res = await api.post('/events', { status: 'quote' });
      navigate(`/events/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event');
    }
  };

  const d = dashboard || {};
  const activeCount = pipeline.filter(s => !['closed', 'cancelled'].includes(s.stage)).reduce((sum, s) => sum + s.count, 0);
  const margin = d.currentMargin || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('pipeline') || 'Pipeline'}</h1>
          <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={createEvent} className="btn-pg-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-4 h-4" /> {t('new_event')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={HiOutlineCalendar} label={t('todays_events')} value={d.todayEvents?.length || 0} color="pg-purple" />
        <KPI icon={HiOutlineCurrencyDollar} label={t('revenue_month')} value={formatMoney(d.revenue?.thisMonth || 0)} color="pg-purple" />
        <KPI icon={HiOutlineTrendingUp} label={t('net_margin')} value={`${margin.toFixed(1)}%`} color={margin >= 30 ? 'neon-green' : 'neon-red'} />
        <KPI icon={HiOutlineExclamation} label="Active Events" value={activeCount} color="pg-yellow" />
      </div>

      {/* Pipeline Board */}
      <PipelineBoard pipeline={pipeline} loading={loading} />

      {/* Bottom: Today's Events + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Events */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2">
            <HiOutlineCalendar className="text-pg-purple" /> {t('todays_events')}
          </h3>
          {(d.todayEvents || []).length > 0 ? (
            <div className="space-y-2">
              {d.todayEvents.map(e => (
                <Link key={e.id} to={`/events/${e.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-pg-dark2/30 transition-colors text-sm">
                  <div>
                    <p className="font-medium">{e.client?.companyName}</p>
                    <p className="text-xs text-gray-400">{e.experience?.name}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {e.startTime && new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">{t('no_events_today')}</p>
          )}
        </div>

        {/* Alerts */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-inter font-bold text-lg mb-3 flex items-center gap-2">
            <HiOutlineExclamation className="text-pg-yellow" /> {t('alerts')}
          </h3>
          <div className="space-y-2">
            {(d.maintenanceAlerts || []).map(a => (
              <div key={a.id} className="p-2 rounded-lg bg-neon-orange/5 border border-neon-orange/20 text-xs">
                <p className="font-medium text-neon-orange">{a.item?.name} — Maintenance</p>
                <p className="text-gray-400 mt-0.5">{a.issue}</p>
              </div>
            ))}
            {(d.invoicesDueSoon || []).map(inv => (
              <div key={inv.id} className="p-2 rounded-lg bg-pg-yellow/5 border border-pg-yellow/20 text-xs">
                <p className="font-medium text-pg-yellow">Invoice due {new Date(inv.dueDate).toLocaleDateString()}</p>
                <p className="text-gray-400 mt-0.5">{inv.client?.companyName}</p>
              </div>
            ))}
            {(d.maintenanceAlerts || []).length === 0 && (d.invoicesDueSoon || []).length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">{t('no_alerts')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-xl font-inter font-bold mt-1 text-${color}`}>{value}</p>
        </div>
        <Icon className={`w-7 h-7 text-${color} opacity-40`} />
      </div>
    </motion.div>
  );
}
