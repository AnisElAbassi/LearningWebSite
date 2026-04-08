import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../hooks/useI18n';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function MarginAnalysisPage() {
  const { t, formatMoney } = useI18n();
  const [experiences, setExperiences] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/costs/profitability/experiences'),
      api.get('/costs/profitability/clients')
    ]).then(([expRes, clRes]) => {
      setExperiences(expRes.data || []);
      setClients(clRes.data || []);
    }).catch(() => {
      toast.error('Failed to load profitability data');
    }).finally(() => setLoading(false));
  }, []);

  const chartData = {
    labels: experiences.map(e => e.name),
    datasets: [{
      label: 'Margin %',
      data: experiences.map(e => e.avgMargin ?? e.margin ?? 0),
      backgroundColor: experiences.map(e => {
        const m = e.avgMargin ?? e.margin ?? 0;
        return m >= 30 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      }),
      borderRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        grid: { color: '#1e1e3a' },
        ticks: { color: '#94a3b8', callback: v => `${v}%` },
        min: 0,
        max: 100,
      },
      y: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter' } },
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `Margin: ${ctx.parsed.x.toFixed(1)}%`
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('marginAnalysis') || 'Margin Analysis'}</h1>

      {/* Experience Section */}
      <div className="space-y-4">
        <h2 className="font-inter font-bold text-lg text-white flex items-center gap-2">
          <HiOutlineTrendingUp className="w-5 h-5 text-pg-purple" />
          {t('byExperience') || 'By Experience'}
        </h2>

        {/* Chart */}
        {experiences.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <div style={{ height: Math.max(200, experiences.length * 40) }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Experience Table */}
        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>{t('experience') || 'Experience'}</th>
                <th>{t('totalRevenue') || 'Total Revenue'}</th>
                <th>{t('totalCost') || 'Total Cost'}</th>
                <th>{t('margin') || 'Margin %'}</th>
                <th>{t('events') || 'Events'}</th>
              </tr>
            </thead>
            <tbody>
              {experiences.map((exp, i) => {
                const margin = exp.avgMargin ?? exp.margin ?? 0;
                return (
                  <tr key={i}>
                    <td className="font-medium">{exp.name}</td>
                    <td className="text-pg-yellow font-mono text-sm">{formatMoney(exp.totalRevenue)}</td>
                    <td className="text-gray-300 font-mono text-sm">{formatMoney(exp.totalCost)}</td>
                    <td>
                      <span className={`font-inter font-bold text-sm ${margin >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-gray-500">{exp.count ?? exp.eventCount ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {experiences.length === 0 && !loading && (
            <p className="text-gray-500 text-sm text-center py-8">{t('noExperienceData') || 'No experience profitability data'}</p>
          )}
        </div>
      </div>

      {/* Client Section */}
      <div className="space-y-4">
        <h2 className="font-inter font-bold text-lg text-white flex items-center gap-2">
          <HiOutlineTrendingDown className="w-5 h-5 text-pg-yellow" />
          {t('byClient') || 'By Client'}
        </h2>

        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>{t('client') || 'Client'}</th>
                <th>{t('totalRevenue') || 'Total Revenue'}</th>
                <th>{t('totalCost') || 'Total Cost'}</th>
                <th>{t('margin') || 'Margin %'}</th>
                <th>{t('events') || 'Events'}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((cl, i) => {
                const margin = cl.avgMargin ?? cl.margin ?? 0;
                return (
                  <motion.tr key={i} whileHover={{ backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
                    <td className="font-medium">{cl.name}</td>
                    <td className="text-pg-yellow font-mono text-sm">{formatMoney(cl.totalRevenue)}</td>
                    <td className="text-gray-300 font-mono text-sm">{formatMoney(cl.totalCost)}</td>
                    <td>
                      <span className={`font-inter font-bold text-sm ${margin >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-gray-500">{cl.count ?? cl.eventCount ?? 0}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {clients.length === 0 && !loading && (
            <p className="text-gray-500 text-sm text-center py-8">{t('noClientData') || 'No client profitability data'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
