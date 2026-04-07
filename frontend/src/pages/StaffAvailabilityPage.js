import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../hooks/useI18n';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

export default function StaffAvailabilityPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.filter(u => u.isActive)));
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const slots = selectedUser.availability || [];
      setAvailability(DAYS.map((_, dayIdx) => {
        const slot = slots.find(s => s.dayOfWeek === dayIdx);
        return { dayOfWeek: dayIdx, startTime: slot?.startTime || '', endTime: slot?.endTime || '', isActive: slot?.isActive ?? false };
      }));
    }
  }, [selectedUser]);

  const toggleDay = (dayIdx) => {
    setAvailability(prev => prev.map(a => a.dayOfWeek === dayIdx ? { ...a, isActive: !a.isActive } : a));
  };

  const updateTime = (dayIdx, field, value) => {
    setAvailability(prev => prev.map(a => a.dayOfWeek === dayIdx ? { ...a, [field]: value } : a));
  };

  const save = async () => {
    try {
      const active = availability.filter(a => a.isActive && a.startTime && a.endTime);
      await api.put(`/users/${selectedUser.id}`, { availability: active });
      toast.success('Availability saved');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('availability')}</h1>

      {/* Staff selector */}
      <div className="flex flex-wrap gap-2">
        {users.map(user => (
          <button key={user.id} onClick={() => setSelectedUser(user)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${selectedUser?.id === user.id ? 'btn-pg-primary' : 'btn-pg-outline'}`}>
            <div className="w-6 h-6 rounded-full bg-pg-gradient flex items-center justify-center">
              <span className="text-[10px] font-bold text-black">{user.name?.[0]}</span>
            </div>
            {user.name}
          </button>
        ))}
      </div>

      {selectedUser && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-inter font-bold text-lg">{selectedUser.name} — Weekly Schedule</h3>
            <button onClick={save} className="btn-pg-primary">{t('save')}</button>
          </div>

          <div className="space-y-2">
            {DAYS.map((day, idx) => {
              const slot = availability.find(a => a.dayOfWeek === idx) || { isActive: false, startTime: '', endTime: '' };
              return (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${slot.isActive ? 'bg-pg-purple/5 border border-pg-purple/20' : 'bg-pg-dark2/30 border border-pg-border/30'}`}>
                  <button onClick={() => toggleDay(idx)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${slot.isActive ? 'bg-pg-purple text-white' : 'bg-pg-dark border border-pg-border text-gray-500'}`}>
                    {slot.isActive ? '✓' : ''}
                  </button>
                  <span className={`w-24 text-sm font-medium ${slot.isActive ? 'text-white' : 'text-gray-500'}`}>{day}</span>
                  {slot.isActive && (
                    <div className="flex items-center gap-2">
                      <input type="time" value={slot.startTime} onChange={e => updateTime(idx, 'startTime', e.target.value)}
                        className="input-dark w-32 text-sm py-1" />
                      <span className="text-gray-500 text-sm">to</span>
                      <input type="time" value={slot.endTime} onChange={e => updateTime(idx, 'endTime', e.target.value)}
                        className="input-dark w-32 text-sm py-1" />
                    </div>
                  )}
                  {!slot.isActive && <span className="text-xs text-gray-600">Day off</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {!selectedUser && (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-gray-500">Select a staff member to view/edit their availability</p>
        </div>
      )}
    </div>
  );
}
