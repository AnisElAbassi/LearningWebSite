import React, { useState, useEffect } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../../../hooks/useI18n';

const CATEGORIES = [
  { value: 'transport', label: 'Transport', icon: '🚛' },
  { value: 'food', label: 'Food / Meals', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function PrepStep({ event, onRefresh }) {
  const { formatMoney } = useI18n();
  const [packingItems, setPackingItems] = useState([]);
  const [costForm, setCostForm] = useState({ category: 'transport', description: '', amount: '' });

  useEffect(() => {
    api.get(`/packing/event/${event.id}`).then(r => setPackingItems(r.data)).catch(() => {});
  }, [event.id]);

  const togglePacked = async (itemId, packed) => {
    try {
      await api.put(`/packing/${itemId}`, { packed: !packed });
      setPackingItems(prev => prev.map(p => p.id === itemId ? { ...p, packed: !packed } : p));
    } catch { toast.error('Failed'); }
  };

  const regeneratePacking = async () => {
    try {
      await api.post(`/packing/event/${event.id}/regenerate`);
      const r = await api.get(`/packing/event/${event.id}`);
      setPackingItems(r.data);
      toast.success('Packing list regenerated');
    } catch { toast.error('Failed'); }
  };

  const addLogisticsCost = async () => {
    if (!costForm.amount) return;
    try {
      await api.post(`/logistics/event/${event.id}`, { category: costForm.category, description: costForm.description, amount: parseFloat(costForm.amount) });
      toast.success('Cost added');
      setCostForm({ category: 'transport', description: '', amount: '' });
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const packedCount = packingItems.filter(p => p.packed).length;

  return (
    <div className="space-y-4">
      <h3 className="font-inter font-bold text-lg">Event Preparation</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Packing List */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm">Packing List ({packedCount}/{packingItems.length})</h4>
            <button onClick={regeneratePacking} className="btn-pg-outline text-xs">Regenerate</button>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {packingItems.map(item => (
              <label key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-pg-dark2/30 cursor-pointer text-sm">
                <input type="checkbox" checked={item.packed} onChange={() => togglePacked(item.id, item.packed)} className="accent-pg-purple" />
                <span className={item.packed ? 'line-through text-gray-500' : 'text-gray-300'}>{item.itemName}</span>
                <span className="text-xs text-gray-600 ml-auto">{item.itemType} ×{item.quantity}</span>
              </label>
            ))}
            {packingItems.length === 0 && <p className="text-gray-500 text-xs text-center py-4">No packing items. Click "Regenerate" to create from assigned hardware.</p>}
          </div>
        </div>

        {/* Logistics Costs */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Logistics Costs</h4>
          {/* Existing costs */}
          <div className="space-y-1 mb-3">
            {(event.logisticsCosts || []).map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm p-1.5 rounded bg-pg-dark2/30">
                <span className="text-gray-300 capitalize">{c.category}: {c.description || ''}</span>
                <span className="font-mono text-pg-purple">{formatMoney(c.amount)}</span>
              </div>
            ))}
            {(event.logisticsCosts || []).length === 0 && <p className="text-xs text-gray-500 text-center py-2">No costs yet</p>}
          </div>
          {/* Add cost */}
          <div className="space-y-2 pt-3 border-t border-pg-border">
            <div className="grid grid-cols-2 gap-2">
              <select className="input-dark text-sm" value={costForm.category} onChange={e => setCostForm({ ...costForm, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
              <input type="number" step="0.01" className="input-dark text-sm" placeholder="Amount" value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <input className="input-dark text-sm flex-1" placeholder="Description (optional)" value={costForm.description} onChange={e => setCostForm({ ...costForm, description: e.target.value })} />
              <button onClick={addLogisticsCost} className="btn-pg-outline text-xs"><HiOutlinePlus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
