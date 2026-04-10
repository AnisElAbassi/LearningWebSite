import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function PipelineCard({ event, color, index }) {
  const { completeness } = event;
  const progressPct = completeness ? Math.round((completeness.done / completeness.total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/events/${event.id}`}
        className="block glass-card-hover rounded-lg p-3 border-l-[3px]"
        style={{ borderLeftColor: color }}
      >
        <p className="font-medium text-sm text-white truncate">{event.client}</p>
        <p className="text-xs text-gray-400 truncate">{event.experience}</p>

        {event.startTime && (
          <p className="text-[10px] text-gray-500 mt-1">
            {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {event.endTime && new Date(event.startTime).toDateString() !== new Date(event.endTime).toDateString()
              ? ` — ${new Date(event.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
              : ''}
          </p>
        )}

        {event.price > 0 && (
          <p className="text-xs text-pg-purple font-mono mt-1">€{event.price.toLocaleString()}</p>
        )}

        {/* Progress bar */}
        {completeness && completeness.total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
              <span>{completeness.done}/{completeness.total} tasks</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1 rounded-full bg-pg-dark2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: progressPct === 100 ? '#10b981' : color }}
              />
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
