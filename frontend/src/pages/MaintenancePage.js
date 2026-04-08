import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineAdjustments, HiOutlineCheck } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';

const statusColors = { open: '#ef4444', in_progress: '#f59e0b', resolved: '#10b981' };

export default function MaintenancePage() {
  const [logs, setLogs] = useState([]);
  const [dueItems, setDueItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [hardware, setHardware] = useState([]);
  const [tab, setTab] = useState('logs');

  const fetchAll = async () => {
    const [logsRes, dueRes, hwRes] = await Promise.all([
      api.get('/maintenance', { params: { status: filter || undefined } }),
      api.get('/maintenance/due'),
      api.get('/hardware')
    ]);
    setLogs(logsRes.data);
    setDueItems(dueRes.data);
    setHardware(hwRes.data);
  };

  useEffect(() => { fetchAll(); }, [filter]);

  const resolve = async (id, resolution) => {
    await api.put(`/maintenance/${id}/resolve`, { resolution: resolution || 'Resolved' });
    toast.success('Issue resolved');
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Maintenance</h1>
        <button onClick={() => setShowModal(true)} className="btn-pg-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      <div className="flex gap-1 border-b border-pg-border">
        <button onClick={() => setTab('logs')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === 'logs' ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>Maintenance Logs</button>
        <button onClick={() => setTab('due')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === 'due' ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>Due for Maintenance ({dueItems.length})</button>
      </div>

      {tab === 'logs' ? (
        <>
          <div className="flex gap-2">
            {['', 'open', 'in_progress', 'resolved'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-lg text-xs ${filter === s ? 'btn-pg-primary' : 'btn-pg-outline'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {logs.map((log, i) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card rounded-xl p-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <HiOutlineAdjustments className={`w-5 h-5 mt-0.5 ${log.status === 'resolved' ? 'text-neon-green' : 'text-neon-orange'}`} />
                  <div>
                    <p className="font-medium">{log.item?.name} <span className="text-xs text-gray-500">({log.item?.type?.name})</span></p>
                    <p className="text-sm text-gray-400 mt-0.5">{log.issue}</p>
                    {log.resolution && <p className="text-xs text-neon-green mt-1">Fix: {log.resolution}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                      {log.resolvedBy && <span className="text-[10px] text-gray-500">by {log.resolvedBy.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={log.status} color={statusColors[log.status]} />
                  <button onClick={() => { setEditLog(log); setShowModal(true); }} className="text-gray-400 hover:text-pg-purple text-xs">Edit</button>
                  <button onClick={async () => {
                    if (!window.confirm('Delete this maintenance log?')) return;
                    try { await api.delete(`/maintenance/${log.id}`); toast.success('Log deleted'); fetchAll(); }
                    catch { toast.error('Failed'); }
                  }} className="text-gray-400 hover:text-neon-red text-xs">Delete</button>
                  {log.status !== 'resolved' && (
                    <button onClick={() => { const r = prompt('Resolution details:'); if (r) resolve(log.id, r); }} className="btn-pg-outline text-xs flex items-center gap-1">
                      <HiOutlineCheck className="w-3 h-3" /> Resolve
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="table-dark">
            <thead><tr><th>Item</th><th>Type</th><th>Location</th><th>Last Maintenance</th><th>Days Since</th></tr></thead>
            <tbody>
              {dueItems.map(item => {
                const daysSince = item.lastMaintenanceAt ? Math.floor((Date.now() - new Date(item.lastMaintenanceAt)) / (1000 * 60 * 60 * 24)) : 'Never';
                return (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td className="text-gray-400">{item.type?.name}</td>
                    <td className="text-gray-400">{item.location || '—'}</td>
                    <td className="text-xs text-gray-500">{item.lastMaintenanceAt ? new Date(item.lastMaintenanceAt).toLocaleDateString() : 'Never'}</td>
                    <td><span className={`text-sm font-medium ${daysSince === 'Never' || daysSince > 60 ? 'text-neon-red' : daysSince > 30 ? 'text-neon-orange' : 'text-gray-300'}`}>{daysSince} {typeof daysSince === 'number' ? 'days' : ''}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ReportIssueModal show={showModal} onClose={() => { setShowModal(false); setEditLog(null); }} hardware={hardware} onSaved={fetchAll} editLog={editLog} />
    </div>
  );
}

function ReportIssueModal({ show, onClose, hardware, onSaved, editLog }) {
  const isEdit = !!editLog;
  const [form, setForm] = useState({ itemId: '', issue: '' });

  useEffect(() => {
    if (editLog) setForm({ itemId: editLog.itemId || '', issue: editLog.issue || '' });
    else setForm({ itemId: '', issue: '' });
  }, [editLog, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/maintenance/${editLog.id}`, { issue: form.issue });
        toast.success('Log updated');
      } else {
        await api.post('/maintenance', { itemId: parseInt(form.itemId), issue: form.issue });
        toast.success('Issue reported');
      }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={isEdit ? 'Edit Maintenance Log' : 'Report Maintenance Issue'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label-text">Hardware Item *</label>
          <select className="input-dark" value={form.itemId} onChange={e => setForm({ ...form, itemId: e.target.value })} required>
            <option value="">Select item</option>
            {hardware.filter(h => h.status !== 'retired').map(h => <option key={h.id} value={h.id}>{h.name} ({h.type?.name})</option>)}
          </select>
        </div>
        <div><label className="label-text">Issue Description *</label>
          <textarea className="input-dark" rows={3} value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} required placeholder="Describe the issue..." />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">Report Issue</button>
        </div>
      </form>
    </Modal>
  );
}
