import React, { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function PlanningStep({ event, onRefresh }) {
  const [hardware, setHardware] = useState([]);
  const [users, setUsers] = useState([]);
  const [allHardware, setAllHardware] = useState([]);
  const [selectedHw, setSelectedHw] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [operatorId, setOperatorId] = useState(event.operatorId || '');

  useEffect(() => {
    Promise.allSettled([api.get('/hardware'), api.get('/users')]).then(([hwRes, uRes]) => {
      if (hwRes.status === 'fulfilled') setAllHardware(hwRes.value.data);
      if (uRes.status === 'fulfilled') setUsers(uRes.value.data);
    });
  }, []);

  const addHardware = async () => {
    if (!selectedHw) return;
    try {
      await api.put(`/events/${event.id}`, {
        hardware: [...event.hardware.map(h => ({ itemId: h.itemId, quantity: h.quantity })), { itemId: parseInt(selectedHw), quantity: 1 }]
      });
      toast.success('Hardware added');
      setSelectedHw('');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const removeHardware = async (itemId) => {
    try {
      await api.put(`/events/${event.id}`, {
        hardware: event.hardware.filter(h => h.itemId !== itemId).map(h => ({ itemId: h.itemId, quantity: h.quantity }))
      });
      toast.success('Hardware removed');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const addStaff = async () => {
    if (!selectedStaff) return;
    try {
      await api.put(`/events/${event.id}`, {
        staff: [...event.staff.map(s => ({ userId: s.userId, hoursWorked: s.hoursWorked, rateApplied: s.rateApplied, totalCost: s.totalCost })),
          { userId: parseInt(selectedStaff), hoursWorked: 0, rateApplied: 0, totalCost: 0 }]
      });
      toast.success('Staff added');
      setSelectedStaff('');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const saveOperator = async () => {
    try {
      await api.put(`/events/${event.id}`, { operatorId: operatorId ? parseInt(operatorId) : null });
      toast.success('Operator saved');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const assignedHwIds = event.hardware.map(h => h.itemId);
  const assignedStaffIds = event.staff.map(s => s.userId);

  return (
    <div className="space-y-4">
      <h3 className="font-inter font-bold text-lg">Assign Resources</h3>
      <p className="text-sm text-gray-400">Assign hardware, staff, and an operator for this event.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hardware */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Hardware ({event.hardware.length})</h4>
          <div className="space-y-2 mb-3">
            {event.hardware.map(h => (
              <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-pg-dark2/30 text-sm">
                <span>{h.item?.name} <span className="text-xs text-gray-500">({h.item?.type?.name})</span></span>
                <button onClick={() => removeHardware(h.itemId)} className="text-gray-500 hover:text-neon-red"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <select className="input-dark text-sm flex-1" value={selectedHw} onChange={e => setSelectedHw(e.target.value)}>
              <option value="">Add hardware...</option>
              {allHardware.filter(h => !assignedHwIds.includes(h.id) && h.status === 'available').map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <button onClick={addHardware} className="btn-pg-outline text-xs"><HiOutlinePlus className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Staff */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Staff ({event.staff.length})</h4>
          <div className="space-y-2 mb-3">
            {event.staff.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-pg-dark2/30 text-sm">
                <span>{s.user?.name}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <select className="input-dark text-sm flex-1" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
              <option value="">Add staff...</option>
              {users.filter(u => !assignedStaffIds.includes(u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role?.name})</option>
              ))}
            </select>
            <button onClick={addStaff} className="btn-pg-outline text-xs"><HiOutlinePlus className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Operator */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Operator</h4>
          <select className="input-dark mb-3" value={operatorId} onChange={e => setOperatorId(e.target.value)}>
            <option value="">Select operator...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button onClick={saveOperator} className="btn-pg-primary text-xs w-full">Save Operator</button>
        </div>
      </div>
    </div>
  );
}
