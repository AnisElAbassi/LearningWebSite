import React, { useState } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../../../hooks/useI18n';

export default function ReviewStep({ event, onRefresh }) {
  const { formatMoney } = useI18n();
  const fb = Array.isArray(event.feedback) ? event.feedback[0] : event.feedback;
  const [rating, setRating] = useState(fb?.rating || 0);
  const [comment, setComment] = useState(fb?.comment || '');
  const [calculating, setCalculating] = useState(false);

  const submitFeedback = async () => {
    try {
      await api.post(`/feedback/event/${event.id}`, { rating, comment, clientId: event.clientId });
      toast.success('Feedback saved');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const calculateCosts = async () => {
    setCalculating(true);
    try {
      await api.post(`/costs/calculate/${event.id}`);
      toast.success('Costs calculated');
      onRefresh();
    } catch { toast.error('Failed to calculate costs'); }
    setCalculating(false);
  };

  const costs = event.costs;

  return (
    <div className="space-y-4">
      <h3 className="font-inter font-bold text-lg">Post-Event Review</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feedback */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Client Feedback</h4>
          {fb ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={`text-lg ${s <= fb.rating ? 'text-pg-yellow' : 'text-gray-600'}`}>★</span>
                ))}
                <span className="text-sm text-gray-400 ml-2">{fb.rating}/5</span>
              </div>
              {fb.comment && <p className="text-sm text-gray-300">{fb.comment}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className={`text-2xl transition-colors ${s <= rating ? 'text-pg-yellow' : 'text-gray-600 hover:text-gray-400'}`}>★</button>
                ))}
              </div>
              <textarea className="input-dark text-sm" rows={3} placeholder="Client feedback comments..." value={comment} onChange={e => setComment(e.target.value)} />
              <button onClick={submitFeedback} disabled={!rating} className="btn-pg-primary text-xs disabled:opacity-50">Save Feedback</button>
            </div>
          )}
        </div>

        {/* Cost Calculation */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3">Cost Summary</h4>
          {costs ? (
            <div className="space-y-2 text-sm">
              <Row label="Experience (depreciation)" value={formatMoney(costs.experienceCost)} />
              <Row label="Personnel" value={formatMoney(costs.personnelCost)} />
              <Row label="Transport" value={formatMoney(costs.transportCost)} />
              <Row label="Food & Meals" value={formatMoney(costs.foodCost)} />
              <Row label="Hotel" value={formatMoney(costs.hotelCost)} />
              <div className="border-t border-pg-border pt-2 flex justify-between font-bold">
                <span>Total Cost</span>
                <span className="text-pg-yellow font-mono">{formatMoney(costs.totalCost)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Revenue</span>
                <span className="text-pg-purple font-mono">{formatMoney(costs.revenue)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Margin</span>
                <span className={`font-mono ${costs.marginPct >= 30 ? 'text-neon-green' : 'text-neon-red'}`}>{costs.marginPct?.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-3">Costs not yet calculated</p>
              <button onClick={calculateCosts} disabled={calculating} className="btn-pg-primary text-sm disabled:opacity-50">
                {calculating ? 'Calculating...' : 'Calculate Costs'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono text-gray-300">{value}</span>
    </div>
  );
}
