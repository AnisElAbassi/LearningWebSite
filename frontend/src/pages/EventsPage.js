import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineCalendar, HiOutlineExclamation, HiOutlinePencil } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';

const statusColors = { draft: '#6b7280', confirmed: '#a855f7', in_progress: '#fbbf24', completed: '#22c55e', cancelled: '#ef4444' };

export default function EventsPage() {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(searchParams.get('create') === '1');
  const [editEvent, setEditEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await api.get('/events', { params: { status: filterStatus || undefined } });
    setEvents(data.events || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [filterStatus]);

  const openEdit = (event) => {
    setEditEvent(event);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditEvent(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Events</h1>
        <button onClick={openCreate} className="btn-pg-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Create Event
        </button>
      </div>

      <div className="flex gap-2">
        {['', 'draft', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? 'btn-pg-primary' : 'btn-pg-outline'}`}>
            {s ? s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-x-auto">
        <table className="table-dark">
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Client</th>
              <th>Experience</th>
              <th>Operator</th>
              <th>Participants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <motion.tr key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <td>
                  <Link to={`/events/${event.id}`} className="hover:text-pg-purple transition-colors">
                    <p className="font-medium text-sm">{new Date(event.startTime).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </Link>
                </td>
                <td><Link to={`/clients/${event.client?.id}`} className="text-sm hover:text-pg-purple">{event.client?.companyName}</Link></td>
                <td className="text-sm text-gray-300">{event.experience?.name}</td>
                <td className="text-sm text-gray-400">{event.operator?.name || '—'}</td>
                <td className="text-sm text-gray-400">{event.participants || '—'}</td>
                <td><StatusBadge status={event.status} color={statusColors[event.status]} pulse={event.status === 'in_progress'} /></td>
                <td>
                  <button
                    onClick={() => openEdit(event)}
                    className="p-1.5 text-gray-400 hover:text-pg-purple rounded-lg hover:bg-pg-dark2 transition-all"
                    title="Edit event"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && !loading && <p className="text-gray-500 text-sm text-center py-8">No events found</p>}
      </div>

      <EventModal
        show={showModal}
        onClose={() => { setShowModal(false); setEditEvent(null); }}
        onSaved={fetchEvents}
        defaultDate={searchParams.get('date')}
        event={editEvent}
      />
    </div>
  );
}

function EventModal({ show, onClose, onSaved, defaultDate, event }) {
  const isEdit = !!event;
  const [form, setForm] = useState({ clientId: '', experienceId: '', startTime: '', endTime: '', operatorId: '', participants: '', notes: '', status: 'draft' });
  const [clients, setClients] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [operators, setOperators] = useState([]);
  const [availableHardware, setAvailableHardware] = useState([]);
  const [selectedHardware, setSelectedHardware] = useState([]);
  const [conflicts, setConflicts] = useState(null);

  useEffect(() => {
    if (show) {
      Promise.all([
        api.get('/clients'),
        api.get('/experiences'),
        api.get('/users')
      ]).then(([c, e, u]) => {
        setClients(c.data.clients || []);
        setExperiences(e.data);
        setOperators(u.data.filter(user => user.isActive));
      });

      if (event) {
        // Populate form with existing event data for editing
        const fmt = (d) => {
          const dt = new Date(d);
          return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
        };
        setForm({
          clientId: String(event.clientId),
          experienceId: String(event.experienceId),
          startTime: fmt(event.startTime),
          endTime: fmt(event.endTime),
          operatorId: event.operatorId ? String(event.operatorId) : '',
          participants: event.participants ? String(event.participants) : '',
          notes: event.notes || '',
          status: event.status
        });
        setSelectedHardware(event.hardware?.map(h => h.itemId || h.item?.id) || []);
      } else {
        setForm({ clientId: '', experienceId: '', startTime: '', endTime: '', operatorId: '', participants: '', notes: '', status: 'draft' });
        setSelectedHardware([]);
        if (defaultDate) {
          setForm(f => ({ ...f, startTime: `${defaultDate}T10:00`, endTime: `${defaultDate}T11:00` }));
        }
      }
      setConflicts(null);
    }
  }, [show, event, defaultDate]);

  // Check hardware availability when times change
  useEffect(() => {
    if (form.startTime && form.endTime) {
      api.get('/hardware/available', { params: { startTime: form.startTime, endTime: form.endTime } })
        .then(r => setAvailableHardware(r.data));
    }
  }, [form.startTime, form.endTime]);

  const checkConflicts = async () => {
    if (!form.startTime || !form.endTime) return;
    const { data } = await api.post('/events/check-conflicts', {
      hardwareIds: selectedHardware,
      operatorId: form.operatorId ? parseInt(form.operatorId) : null,
      startTime: form.startTime,
      endTime: form.endTime,
      excludeEventId: event?.id
    });
    setConflicts(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      clientId: parseInt(form.clientId),
      experienceId: parseInt(form.experienceId),
      operatorId: form.operatorId ? parseInt(form.operatorId) : null,
      participants: form.participants ? parseInt(form.participants) : null,
      hardware: selectedHardware.map(id => ({ itemId: id, quantity: 1 }))
    };

    try {
      if (isEdit) {
        await api.put(`/events/${event.id}`, payload);
        toast.success('Event updated');
      } else {
        await api.post('/events', payload);
        toast.success('Event created');
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Conflict detected! ' + (err.response.data.error || ''));
        setConflicts(err.response.data);
      } else {
        toast.error(err.response?.data?.error || 'Failed');
      }
    }
  };

  const toggleHardware = (id) => {
    setSelectedHardware(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={isEdit ? 'Edit Event' : 'Create Event'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {conflicts && (conflicts.hardwareConflicts?.length > 0 || conflicts.operatorConflict) && (
          <div className="p-3 bg-neon-red/10 border border-neon-red/30 rounded-lg">
            <p className="text-sm text-neon-red font-medium flex items-center gap-1"><HiOutlineExclamation /> Conflicts Detected</p>
            {conflicts.hardwareConflicts?.map((c, i) => (
              <p key={i} className="text-xs text-gray-400 mt-1">{c.item?.name} is booked for event #{c.event?.id}</p>
            ))}
            {conflicts.operatorConflict && <p className="text-xs text-gray-400 mt-1">Operator has another event at this time</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Client *</label>
            <select className="input-dark" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Experience *</label>
            <select className="input-dark" value={form.experienceId} onChange={e => setForm({ ...form, experienceId: e.target.value })} required>
              <option value="">Select experience</option>
              {experiences.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name} ({e.durationMin}min)</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Start Time *</label>
            <input type="datetime-local" className="input-dark" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
          </div>
          <div>
            <label className="label-text">End Time *</label>
            <input type="datetime-local" className="input-dark" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
          </div>
          <div>
            <label className="label-text">Operator</label>
            <select className="input-dark" value={form.operatorId} onChange={e => setForm({ ...form, operatorId: e.target.value })}>
              <option value="">Select operator</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Participants</label>
            <input type="number" className="input-dark" value={form.participants} onChange={e => setForm({ ...form, participants: e.target.value })} min={1} />
          </div>
          {isEdit && (
            <div>
              <label className="label-text">Status</label>
              <select className="input-dark" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {/* Hardware Selection */}
        {form.startTime && form.endTime && (
          <div>
            <label className="label-text">Available Hardware ({availableHardware.length} items)</label>
            <div className="max-h-40 overflow-y-auto bg-pg-dark rounded-lg p-2 space-y-1">
              {availableHardware.map(hw => (
                <label key={hw.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-pg-dark2/30 cursor-pointer">
                  <input type="checkbox" checked={selectedHardware.includes(hw.id)} onChange={() => toggleHardware(hw.id)} className="accent-pg-purple" />
                  <span className="text-sm">{hw.name}</span>
                  <span className="text-xs text-gray-500">({hw.type.name})</span>
                </label>
              ))}
              {availableHardware.length === 0 && <p className="text-gray-500 text-xs text-center py-2">Select times to see available hardware</p>}
            </div>
          </div>
        )}

        <div>
          <label className="label-text">Notes</label>
          <textarea className="input-dark" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex justify-between pt-4">
          <button type="button" onClick={checkConflicts} className="btn-pg-outline">Check Conflicts</button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-pg-ghost">Cancel</button>
            <button type="submit" className="btn-pg-primary">{isEdit ? 'Update Event' : 'Create Event'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
