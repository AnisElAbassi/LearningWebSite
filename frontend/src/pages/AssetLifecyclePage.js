import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineCurrencyDollar, HiOutlineExclamation, HiOutlineFilter } from 'react-icons/hi';
import api from '../utils/api';
import { useI18n } from '../hooks/useI18n';

export default function AssetLifecyclePage() {
  const { t, formatMoney } = useI18n();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearEolOnly, setNearEolOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/assets/lifecycle'),
      api.get('/assets/lifecycle/summary')
    ]).then(([assetsRes, summaryRes]) => {
      setAssets(assetsRes.data);
      setSummary(summaryRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getBarColor = (pct) => {
    if (pct >= 80) return 'bg-neon-red';
    if (pct >= 60) return 'bg-pg-yellow';
    return 'bg-neon-green';
  };

  const filtered = nearEolOnly ? assets.filter(a => a.lifespanPct >= 80) : assets;

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-pg-card rounded w-48" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-pg-card rounded-xl" />)}</div>
      <div className="h-64 bg-pg-card rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('asset_lifecycle')}</h1>
        <button
          onClick={() => setNearEolOnly(!nearEolOnly)}
          className={`${nearEolOnly ? 'btn-pg-primary' : 'btn-pg-outline'} flex items-center gap-2`}
        >
          <HiOutlineFilter className="w-4 h-4" />
          {t('near_eol')}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label={t('purchase_value')} value={formatMoney(summary.totalPurchaseValue)} color="pg-purple" />
          <SummaryCard label={t('book_value')} value={formatMoney(summary.totalBookValue)} color="pg-yellow" />
          <SummaryCard label={t('depreciated')} value={formatMoney(summary.totalDepreciated)} color="neon-orange" />
          <SummaryCard label={t('near_eol')} value={summary.eolCount} color="neon-red" />
        </div>
      )}

      {/* Asset List */}
      {/* Desktop */}
      <div className="hidden md:block glass-card rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>Type</th>
              <th>{t('purchase_price')}</th>
              <th>{t('book_value')}</th>
              <th>{t('use_count')}</th>
              <th>{t('lifespan')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="cursor-pointer" onClick={() => navigate(`/hardware/${item.id}`)}>
                <td className="font-medium">{item.name}</td>
                <td className="text-gray-400">{item.type?.name || '—'}</td>
                <td className="text-pg-purple font-mono text-sm">{formatMoney(item.purchasePrice)}</td>
                <td className="text-gray-300 font-mono text-sm">{formatMoney(item.bookValue)}</td>
                <td className="text-gray-400 text-sm">{item.currentUseCount} / {item.expectedUses || '—'}</td>
                <td className="min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-pg-dark2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getBarColor(item.lifespanPct)}`}
                        style={{ width: `${Math.round(item.lifespanPct)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono w-10 text-right ${item.lifespanPct >= 80 ? 'text-neon-red' : item.lifespanPct >= 60 ? 'text-pg-yellow' : 'text-neon-green'}`}>
                      {Math.round(item.lifespanPct)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">
            {nearEolOnly ? 'No items near end of life' : 'No lifecycle data available'}
          </p>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map(item => (
          <div key={item.id} onClick={() => navigate(`/hardware/${item.id}`)}
            className="glass-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-gray-500">{item.type?.name}</p>
              </div>
              <span className={`text-sm font-bold ${item.lifespanPct >= 80 ? 'text-neon-red' : item.lifespanPct >= 60 ? 'text-pg-yellow' : 'text-neon-green'}`}>
                {Math.round(item.lifespanPct)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-pg-dark2 overflow-hidden mb-2">
              <div className={`h-full rounded-full ${getBarColor(item.lifespanPct)}`} style={{ width: `${Math.round(item.lifespanPct)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{item.currentUseCount} / {item.expectedUses} uses</span>
              <span>Book: {formatMoney(item.bookValue)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="glass-card rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-xl font-inter font-bold mt-1 text-${color}`}>{value}</p>
    </motion.div>
  );
}
