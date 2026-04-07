import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineCube, HiOutlineFilter } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';

const statusColors = { available: '#10b981', in_use: '#a855f7', maintenance: '#f59e0b', retired: '#6b7280' };

export default function HardwarePage() {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    const [itemsRes, typesRes] = await Promise.all([
      api.get('/hardware', { params: { search: search || undefined, typeId: filterType || undefined, status: filterStatus || undefined } }),
      api.get('/hardware-types')
    ]);
    setItems(itemsRes.data);
    setTypes(typesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [search, filterType, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Hardware Inventory</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTypeModal(true)} className="btn-pg-outline flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> New Type
          </button>
          <button onClick={() => { setEditItem(null); setShowItemModal(true); }} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="input-dark pl-10" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-dark w-auto">
          <option value="">All Types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-dark w-auto">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Type Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {types.map(type => (
          <motion.div key={type.id} whileHover={{ scale: 1.03 }} className="glass-card rounded-lg p-3 text-center cursor-pointer"
            onClick={() => setFilterType(filterType === String(type.id) ? '' : String(type.id))}>
            <HiOutlineCube className={`w-6 h-6 mx-auto ${filterType === String(type.id) ? 'text-pg-purple' : 'text-gray-500'}`} />
            <p className="text-xs font-medium mt-1">{type.name}</p>
            <p className="text-lg font-inter font-bold text-pg-purple">{type._count?.items || 0}</p>
            <p className="text-[10px] text-gray-500">€{type.dailyCost}/day</p>
          </motion.div>
        ))}
      </div>

      {/* Items Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Serial / Qty</th>
              <th>Status</th>
              <th>Location</th>
              <th>Daily Rate</th>
              <th>Last Maintenance</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="cursor-pointer" onClick={() => { setEditItem(item); setShowItemModal(true); }}>
                <td className="font-medium">{item.name}</td>
                <td className="text-gray-400">{item.type.name}</td>
                <td className="text-gray-400 font-mono text-xs">{item.serialNumber || `×${item.quantity}`}</td>
                <td><StatusBadge status={item.status} color={statusColors[item.status]} pulse={item.status === 'in_use'} /></td>
                <td className="text-gray-400">{item.location || '—'}</td>
                <td className="text-pg-purple">€{item.dailyRate || item.type.dailyCost || 0}</td>
                <td className="text-gray-500 text-xs">{item.lastMaintenanceAt ? new Date(item.lastMaintenanceAt).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && <p className="text-gray-500 text-sm text-center py-8">No hardware items found</p>}
      </div>

      <HardwareItemModal show={showItemModal} onClose={() => setShowItemModal(false)} item={editItem} types={types} onSaved={fetchAll} />
      <HardwareTypeModal show={showTypeModal} onClose={() => setShowTypeModal(false)} onSaved={fetchAll} />
    </div>
  );
}

function HardwareItemModal({ show, onClose, item, types, onSaved }) {
  const [form, setForm] = useState({ name: '', typeId: '', model: '', serialNumber: '', status: 'available', location: '', purchasePrice: '', dailyRate: '', quantity: 1, notes: '' });

  useEffect(() => {
    if (item) setForm({ name: item.name, typeId: item.typeId, model: item.model || '', serialNumber: item.serialNumber || '', status: item.status, location: item.location || '', purchasePrice: item.purchasePrice || '', dailyRate: item.dailyRate || '', quantity: item.quantity, notes: item.notes || '' });
    else setForm({ name: '', typeId: types[0]?.id || '', model: '', serialNumber: '', status: 'available', location: '', purchasePrice: '', dailyRate: '', quantity: 1, notes: '' });
  }, [item, show, types]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, typeId: parseInt(form.typeId), purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null, dailyRate: form.dailyRate ? parseFloat(form.dailyRate) : null, quantity: parseInt(form.quantity) };
    if (!payload.serialNumber) delete payload.serialNumber;
    try {
      if (item) { await api.put(`/hardware/${item.id}`, payload); toast.success('Item updated'); }
      else { await api.post('/hardware', payload); toast.success('Item created'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={item ? 'Edit Hardware' : 'Add Hardware'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-text">Name *</label><input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label-text">Type *</label>
            <select className="input-dark" value={form.typeId} onChange={e => setForm({ ...form, typeId: e.target.value })} required>
              <option value="">Select type</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label className="label-text">Model</label><input className="input-dark" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
          <div><label className="label-text">Serial Number</label><input className="input-dark" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
          <div><label className="label-text">Status</label>
            <select className="input-dark" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div><label className="label-text">Location</label><input className="input-dark" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div><label className="label-text">Purchase Price (€)</label><input type="number" step="0.01" className="input-dark" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} /></div>
          <div><label className="label-text">Daily Rate (€)</label><input type="number" step="0.01" className="input-dark" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} /></div>
          <div><label className="label-text">Quantity</label><input type="number" className="input-dark" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} min={1} /></div>
        </div>
        <div><label className="label-text">Notes</label><textarea className="input-dark" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">{item ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

function HardwareTypeModal({ show, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', isSerialized: true, dailyCost: 0, icon: '', depreciationYears: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hardware-types', { ...form, dailyCost: parseFloat(form.dailyCost), depreciationYears: form.depreciationYears ? parseFloat(form.depreciationYears) : null });
      toast.success('Hardware type created');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title="New Hardware Type" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label-text">Type Name *</label><input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Haptic Vest" /></div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isSerialized} onChange={e => setForm({ ...form, isSerialized: e.target.checked })} className="accent-pg-purple" />
            <span className="text-sm text-gray-300">Serialized (individual tracking)</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-text">Daily Cost (€)</label><input type="number" step="0.01" className="input-dark" value={form.dailyCost} onChange={e => setForm({ ...form, dailyCost: e.target.value })} /></div>
          <div><label className="label-text">Depreciation (years)</label><input type="number" step="0.5" className="input-dark" value={form.depreciationYears} onChange={e => setForm({ ...form, depreciationYears: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">Create Type</button>
        </div>
      </form>
    </Modal>
  );
}
