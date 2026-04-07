import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineFilter } from 'react-icons/hi';
import api from '../utils/api';

const actionColors = {
  created: '#10b981', updated: '#a855f7', deleted: '#ef4444', login: '#fbbf24',
  status_changed: '#f59e0b', maintenance_reported: '#ef4444', maintenance_resolved: '#10b981',
  archived: '#6b7280', cancelled: '#ef4444', deactivated: '#ef4444', password_changed: '#f59e0b'
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/activity', { params: { page, entityType: filterType || undefined, limit: 30 } })
      .then(r => { setLogs(r.data.logs); setTotal(r.data.total); setLoading(false); });
  }, [page, filterType]);

  const entityTypes = ['event', 'client', 'deal', 'hardware', 'experience', 'user', 'totem', 'settings', 'role', 'hardware_type', 'lookup_value'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Activity Log</h1>
        <span className="text-sm text-gray-500">{total} total entries</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setFilterType(''); setPage(1); }} className={`px-3 py-1 rounded-lg text-xs ${!filterType ? 'btn-pg-primary' : 'btn-pg-outline'}`}>All</button>
        {entityTypes.map(t => (
          <button key={t} onClick={() => { setFilterType(t); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs ${filterType === t ? 'btn-pg-primary' : 'btn-pg-outline'}`}>
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="space-y-0">
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-4 border-b border-pg-border/30 hover:bg-pg-dark2/20 transition-colors"
            >
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: actionColors[log.action] || '#6b7280' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{log.user?.name || 'System'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${actionColors[log.action] || '#6b7280'}15`, color: actionColors[log.action] || '#6b7280' }}>
                    {log.action}
                  </span>
                  <span className="text-xs text-gray-500">{log.entityType}{log.entityId ? ` #${log.entityId}` : ''}</span>
                </div>
                {log.details && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</p>
                )}
              </div>
              <span className="text-[10px] text-gray-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
            </motion.div>
          ))}
        </div>

        {logs.length === 0 && !loading && <p className="text-gray-500 text-sm text-center py-8">No activity logs found</p>}
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-pg-outline text-xs disabled:opacity-30">Previous</button>
          <span className="text-sm text-gray-400">Page {page} of {Math.ceil(total / 30)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 30)} className="btn-pg-outline text-xs disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
