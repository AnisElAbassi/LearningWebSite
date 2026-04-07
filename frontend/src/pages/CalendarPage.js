import React, { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [smartSlots, setSmartSlots] = useState([]);

  const fetchEvents = useCallback(async (info) => {
    try {
      const { data } = await api.get('/calendar', { params: { start: info.startStr, end: info.endStr } });
      setEvents(data);
    } catch (err) { /* silent */ }
  }, []);

  const handleDateClick = async (info) => {
    setSelectedDate(info.dateStr);
    try {
      const { data } = await api.get('/calendar/smart-slots', { params: { date: info.dateStr, duration: 60 } });
      setSmartSlots(data);
    } catch (err) { setSmartSlots([]); }
    setShowCreate(true);
  };

  const handleEventClick = (info) => {
    navigate(`/events/${info.event.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Calendar</h1>
        <button onClick={() => navigate('/events?create=1')} className="btn-pg-primary">
          New Event
        </button>
      </div>

      <div className="glass-card rounded-xl p-5">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          datesSet={fetchEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          editable={false}
          selectable={true}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={2}
          dayMaxEventRows={2}
          nowIndicator={true}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          eventContent={(arg) => {
            return (
              <div className="px-1 py-0.5 truncate text-[11px] leading-tight">
                <span className="font-semibold">{arg.timeText}</span>
                {' '}
                <span className="opacity-90">{arg.event.title}</span>
              </div>
            );
          }}
        />
      </div>

      {/* Smart Slots Panel */}
      <AnimatePresence>
        {showCreate && selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 w-80 glass-card rounded-xl glow-border-purple p-5 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-inter font-bold text-sm">Smart Slots — {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-neon-red text-sm">Close</button>
            </div>
            {smartSlots.length > 0 ? (
              <div className="space-y-2">
                {smartSlots.map((slot, i) => (
                  <button key={i} onClick={() => navigate(`/events?create=1&date=${selectedDate}&start=${new Date(slot.start).toISOString()}`)}
                    className="w-full text-left p-2 rounded-lg bg-pg-dark2/30 hover:bg-pg-dark2/60 border border-pg-border/30 transition-colors">
                    <p className="text-sm text-pg-purple">
                      {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-gray-500">Available slot</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No suggested slots available</p>
            )}
            <button onClick={() => navigate(`/events?create=1&date=${selectedDate}`)}
              className="btn-pg-primary w-full mt-3 text-sm">
              Create Event on This Date
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
