import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineCube, HiOutlineFilter, HiOutlinePrinter, HiOutlineRefresh } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';
import { useI18n } from '../hooks/useI18n';

const statusColors = { available: '#10b981', in_use: '#a855f7', maintenance: '#f59e0b', retired: '#6b7280' };

export default function HardwarePage() {
  const { t, formatMoney } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'inventory');

  const TABS = [
    { id: 'inventory', label: t('inventory') || 'Inventory' },
    { id: 'lifecycle', label: t('asset_lifecycle') || 'Lifecycle' },
    { id: 'qr', label: t('qr_labels') || 'QR Labels' },
  ];

  const changeTab = (id) => {
    setTab(id);
    if (id === 'inventory') searchParams.delete('tab');
    else searchParams.set('tab', id);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('hardware') || 'Hardware'}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-pg-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => changeTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && <InventoryTab />}
      {tab === 'lifecycle' && <LifecycleTab formatMoney={formatMoney} t={t} />}
      {tab === 'qr' && <QRLabelsTab t={t} />}
    </div>
  );
}

/* ─── INVENTORY TAB ─── */
function InventoryTab() {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editType, setEditType] = useState(null);

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
    <>
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
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
        <div className="flex gap-2">
          <button onClick={() => { setEditType(null); setShowTypeModal(true); }} className="btn-pg-outline flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> New Type
          </button>
          <button onClick={() => { setEditItem(null); setShowItemModal(true); }} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Type Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {types.map(type => (
          <motion.div key={type.id} whileHover={{ scale: 1.03 }} className="glass-card rounded-lg p-3 text-center cursor-pointer relative group"
            onClick={() => setFilterType(filterType === String(type.id) ? '' : String(type.id))}>
            <button onClick={(e) => { e.stopPropagation(); setEditType(type); setShowTypeModal(true); }}
              className="absolute top-1 right-1 text-gray-600 hover:text-pg-purple opacity-0 group-hover:opacity-100 transition-opacity p-1">
              <HiOutlinePlus className="w-3 h-3 rotate-45" />
            </button>
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
            <tr><th>Name</th><th>Type</th><th>Serial / Qty</th><th>Status</th><th>Location</th><th>Daily Rate</th><th>Last Maintenance</th></tr>
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
      <HardwareTypeModal show={showTypeModal} onClose={() => { setShowTypeModal(false); setEditType(null); }} onSaved={fetchAll} editType={editType} />
    </>
  );
}

/* ─── LIFECYCLE TAB ─── */
function LifecycleTab({ formatMoney, t }) {
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearEolOnly, setNearEolOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/assets/lifecycle'), api.get('/assets/lifecycle/summary')])
      .then(([a, s]) => { setAssets(a.data); setSummary(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getBarColor = (pct) => pct >= 80 ? 'bg-neon-red' : pct >= 60 ? 'bg-pg-yellow' : 'bg-neon-green';
  const filtered = nearEolOnly ? assets.filter(a => a.lifespanPct >= 80) : assets;

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-pg-card rounded-xl" /></div>;

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setNearEolOnly(!nearEolOnly)}
          className={`${nearEolOnly ? 'btn-pg-primary' : 'btn-pg-outline'} flex items-center gap-2 text-sm`}>
          <HiOutlineFilter className="w-4 h-4" /> {t('near_eol') || 'Near EOL'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('purchase_value') || 'Purchase Value', value: formatMoney(summary.totalPurchaseValue), color: 'pg-purple' },
            { label: t('book_value') || 'Book Value', value: formatMoney(summary.totalBookValue), color: 'pg-yellow' },
            { label: t('depreciated') || 'Depreciated', value: formatMoney(summary.totalDepreciated), color: 'neon-orange' },
            { label: t('near_eol') || 'Near EOL', value: summary.eolCount, color: 'neon-red' },
          ].map((card, i) => (
            <div key={i} className="glass-card rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase">{card.label}</p>
              <p className={`text-xl font-inter font-bold mt-1 text-${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead><tr><th>{t('name')}</th><th>Type</th><th>{t('purchase_price')}</th><th>{t('book_value')}</th><th>{t('use_count')}</th><th>{t('lifespan')}</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="cursor-pointer" onClick={() => window.location.href = `/hardware/${item.id}`}>
                <td className="font-medium">{item.name}</td>
                <td className="text-gray-400">{item.type?.name || '—'}</td>
                <td className="text-pg-purple font-mono text-sm">{formatMoney(item.purchasePrice)}</td>
                <td className="text-gray-300 font-mono text-sm">{formatMoney(item.bookValue)}</td>
                <td className="text-gray-400 text-sm">{item.currentUseCount} / {item.expectedUses || '—'}</td>
                <td className="min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-pg-dark2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${getBarColor(item.lifespanPct)}`} style={{ width: `${Math.round(item.lifespanPct)}%` }} />
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
        {filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">{nearEolOnly ? 'No items near end of life' : 'No lifecycle data available'}</p>}
      </div>
    </>
  );
}

/* ─── QR LABELS TAB ─── */
function QRLabelsTab({ t }) {
  const [labels, setLabels] = useState([]);
  const [types, setTypes] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/hardware-types').then(r => setTypes(r.data)); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {};
    if (filterType) params.typeId = filterType;
    api.get('/qr/hardware/bulk', { params })
      .then(r => { if (!cancelled) { setLabels(r.data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filterType]);

  const printSingle = (label) => {
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    printWindow.document.write(`<html><head><title>QR — ${label.name}</title>
      <style>body{font-family:Inter,sans-serif;text-align:center;padding:20px}img{width:250px;height:250px}h2{margin:10px 0 4px;font-size:16px}p{margin:2px 0;color:#666;font-size:12px}.serial{font-family:monospace;font-size:11px;color:#999}</style>
      </head><body><img src="${label.qrDataUrl}" /><h2>${label.name}</h2><p>${label.type}</p>${label.serialNumber ? `<p class="serial">${label.serialNumber}</p>` : ''}
      <script>window.onload=function(){window.print();window.close()}</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{labels.length} labels</p>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-dark w-auto text-sm">
            <option value="">All Types</option>
            {types.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
          </select>
          <button onClick={() => window.print()} className="btn-pg-primary flex items-center gap-1 text-sm">
            <HiOutlinePrinter className="w-4 h-4" /> Print All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-pg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {labels.map(label => (
            <div key={label.id} onClick={() => printSingle(label)} className="glass-card-hover rounded-xl p-3 text-center cursor-pointer group">
              <div className="relative">
                <img src={label.qrDataUrl} alt={label.name} className="w-full aspect-square rounded-lg mb-2" />
                <div className="absolute inset-0 bg-pg-purple/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <HiOutlinePrinter className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium truncate">{label.name}</p>
              <p className="text-[10px] text-gray-500">{label.type}</p>
              {label.serialNumber && <p className="text-[10px] text-gray-600 font-mono">{label.serialNumber}</p>}
            </div>
          ))}
        </div>
      )}
      {!loading && labels.length === 0 && <div className="glass-card rounded-xl p-12 text-center"><p className="text-gray-500">No hardware items found.</p></div>}
    </>
  );
}

/* ─── MODALS ─── */
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
              <option value="available">Available</option><option value="in_use">In Use</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option>
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

function HardwareTypeModal({ show, onClose, onSaved, editType }) {
  const isEdit = !!editType;
  const [form, setForm] = useState({ name: '', isSerialized: true, dailyCost: 0, icon: '', depreciationYears: '' });

  useEffect(() => {
    if (editType) setForm({ name: editType.name || '', isSerialized: editType.isSerialized ?? true, dailyCost: editType.dailyCost || 0, icon: editType.icon || '', depreciationYears: editType.depreciationYears || '' });
    else setForm({ name: '', isSerialized: true, dailyCost: 0, icon: '', depreciationYears: '' });
  }, [editType, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, dailyCost: parseFloat(form.dailyCost), depreciationYears: form.depreciationYears ? parseFloat(form.depreciationYears) : null };
      if (isEdit) {
        await api.put(`/hardware-types/${editType.id}`, payload);
        toast.success('Hardware type updated');
      } else {
        await api.post('/hardware-types', payload);
        toast.success('Hardware type created');
      }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={isEdit ? 'Edit Hardware Type' : 'New Hardware Type'} size="sm">
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
