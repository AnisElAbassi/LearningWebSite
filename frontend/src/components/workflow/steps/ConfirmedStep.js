import React, { useState } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function ConfirmedStep({ event, onRefresh }) {
  const [startTime, setStartTime] = useState(event.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '');
  const [endTime, setEndTime] = useState(event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '');
  const [venueAddress, setVenueAddress] = useState(event.venueAddress || '');
  const [participants, setParticipants] = useState(event.participants || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/events/${event.id}`, {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        venueAddress: venueAddress || null,
        participants: participants ? parseInt(participants) : null,
      });
      toast.success('Event details saved');
      onRefresh();
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-inter font-bold text-lg">Schedule the Event</h3>
      <p className="text-sm text-gray-400">Set the date, time, and location for this event.</p>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Start Date & Time *</label>
            <input type="datetime-local" className="input-dark" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="label-text">End Date & Time *</label>
            <input type="datetime-local" className="input-dark" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Venue Address</label>
            <input className="input-dark" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} placeholder="Client site address" />
          </div>
          <div>
            <label className="label-text">Participants</label>
            <input type="number" className="input-dark" value={participants} onChange={e => setParticipants(e.target.value)} min={1} />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="btn-pg-primary text-sm">{saving ? 'Saving...' : 'Save Details'}</button>
        </div>
      </div>
    </div>
  );
}
