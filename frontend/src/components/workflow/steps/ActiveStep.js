import React, { useState } from 'react';
import { HiOutlineCamera, HiOutlineClipboardCheck } from 'react-icons/hi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function ActiveStep({ event, onRefresh }) {
  const [uploading, setUploading] = useState(false);

  const toggleChecklist = async (checkId, isCompleted) => {
    try {
      await api.put(`/events/${event.id}/checklist/${checkId}`, { isCompleted: !isCompleted });
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('type', 'post');
    try {
      await api.post(`/photos/event/${event.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo uploaded');
      onRefresh();
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const startTime = event.startTime ? new Date(event.startTime) : null;
  const endTime = event.endTime ? new Date(event.endTime) : null;
  const now = new Date();
  const isLive = startTime && endTime && now >= startTime && now <= endTime;

  return (
    <div className="space-y-4">
      <h3 className="font-inter font-bold text-lg flex items-center gap-2">
        Event Day
        {isLive && <span className="text-xs px-2 py-0.5 bg-neon-green/10 text-neon-green rounded-full animate-pulse">LIVE</span>}
      </h3>

      {startTime && (
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-sm text-gray-400">
            {startTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-2xl font-inter font-bold text-pg-purple mt-1">
            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {endTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {event.venueAddress && <p className="text-xs text-gray-500 mt-1">{event.venueAddress}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checklist */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <HiOutlineClipboardCheck className="w-4 h-4 text-pg-purple" /> Checklist
          </h4>
          <div className="space-y-1">
            {(event.checklist || []).map(item => (
              <label key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-pg-dark2/30 cursor-pointer text-sm">
                <input type="checkbox" checked={item.isCompleted} onChange={() => toggleChecklist(item.id, item.isCompleted)} className="accent-pg-purple" />
                <span className={item.isCompleted ? 'line-through text-gray-500' : 'text-gray-300'}>{item.task}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <HiOutlineCamera className="w-4 h-4 text-pg-purple" /> Photos
          </h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(event.photos || []).map(p => (
              <img key={p.id} src={p.url} alt={p.caption || ''} className="w-full aspect-square object-cover rounded-lg" />
            ))}
          </div>
          <label className="btn-pg-outline text-xs cursor-pointer inline-flex items-center gap-1">
            <HiOutlineCamera className="w-3.5 h-3.5" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
            <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
