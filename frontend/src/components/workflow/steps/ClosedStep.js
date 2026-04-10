import React from 'react';
import { HiOutlineCheckCircle } from 'react-icons/hi';
import { useI18n } from '../../../hooks/useI18n';

export default function ClosedStep({ event }) {
  const { formatMoney } = useI18n();
  const costs = event.costs;
  const deal = event.deal;

  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <HiOutlineCheckCircle className="w-16 h-16 text-neon-green mx-auto mb-3" />
        <h3 className="font-inter font-bold text-xl text-neon-green">Event Complete</h3>
        <p className="text-sm text-gray-400 mt-1">{event.client?.companyName} — {event.experience?.name}</p>
        {event.startTime && (
          <p className="text-xs text-gray-500 mt-1">{new Date(event.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* P&L Summary */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Financial Summary</h4>
          {costs ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Revenue</span><span className="font-mono text-pg-purple">{formatMoney(costs.revenue)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total Cost</span><span className="font-mono text-pg-yellow">{formatMoney(costs.totalCost)}</span></div>
              <div className="flex justify-between font-bold border-t border-pg-border pt-2">
                <span>Net Profit</span>
                <span className={`font-mono ${costs.marginAmount >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{formatMoney(costs.marginAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Margin</span>
                <span className={`font-bold ${costs.marginPct >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>{costs.marginPct?.toFixed(1)}%</span>
              </div>
            </div>
          ) : <p className="text-gray-500 text-sm">No cost data</p>}
        </div>

        {/* Event Details */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Event Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Client</span><span>{event.client?.companyName}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Experience</span><span>{event.experience?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Participants</span><span>{event.participants || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Hardware</span><span>{event.hardware?.length || 0} items</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Staff</span><span>{event.staff?.length || 0} people</span></div>
          </div>
        </div>

        {/* Feedback */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Client Feedback</h4>
          {event.feedback ? (
            <div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={`text-lg ${s <= event.feedback.rating ? 'text-pg-yellow' : 'text-gray-600'}`}>★</span>
                ))}
              </div>
              {event.feedback.comment && <p className="text-sm text-gray-300">{event.feedback.comment}</p>}
            </div>
          ) : <p className="text-gray-500 text-sm">No feedback collected</p>}
        </div>
      </div>
    </div>
  );
}
